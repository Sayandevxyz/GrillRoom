import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as startRoute, GET as getSessionRoute } from "@/app/api/session/start/route";
import { POST as answerRoute } from "@/app/api/session/answer/route";
import { POST as verdictRoute } from "@/app/api/session/verdict/route";
import { POST as debriefRoute } from "@/app/api/session/debrief/route";
import { POST as retryRoute } from "@/app/api/session/retry/route";
import { GET as compareRoute } from "@/app/api/session/compare/route";
import { GET as radarRoute } from "@/app/api/session/radar/route";
import { POST as behindDoorsRoute } from "@/app/api/session/behind-doors/route";
import { POST as extractPdfRoute } from "@/app/api/extract-pdf/route";
import { GET as shareCardRoute } from "@/app/api/share-card/[sessionId]/route";
import { mockDb } from "@/lib/db";
import * as securityModule from "@/lib/security";
import * as flagsModule from "@/lib/features/flags";
import { getRequestIp, enforceRateLimit, parseAndValidateBody, handleApiError } from "@/lib/api/handler";
import { z } from "zod";

vi.mock("@/lib/llm/groq", () => ({
  createChatCompletion: vi.fn().mockResolvedValue(
    JSON.stringify({
      readiness_score: 72,
      recommendation: "Conditional",
      executive_summary: "Strong traction and enterprise validation.",
      verdicts: [{ investor_id: "rohan", decision: "In", reason: "Good numbers" }],
      category_scores: { unit_economics: 80, market: 75 },
      top_strengths: ["Strong CAC payback"],
      critical_vulnerabilities: ["Customer concentration"],
      recommended_revisions: ["Expand enterprise references"],
    })
  ),
  createStreamingChatCompletion: vi.fn().mockImplementation(async function* () {
    yield { choices: [{ delta: { content: "Sample question from panel?" } }] };
  }),
  DEFAULT_BIG_MODEL: "mock-big",
  DEFAULT_SMALL_MODEL: "mock-small",
}));

function createJsonRequest(url: string, body: Record<string, unknown>, cookie?: string): NextRequest {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function createGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "GET",
  });
}

describe("API Routes Integration Tests", () => {
  beforeEach(() => {
    mockDb.sessions.clear();
    mockDb.turns = [];
    mockDb.claims = [];
    mockDb.convictions = [];
    mockDb.evaluations = [];
    mockDb.reports.clear();
    mockDb.verdicts = [];
    vi.restoreAllMocks();
  });

  describe("API Handler Utilities (lib/api/handler.ts)", () => {
    it("extracts IP from x-forwarded-for header or defaults to 127.0.0.1", () => {
      const reqWithHeader = new NextRequest("http://localhost:3000", {
        headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
      });
      expect(getRequestIp(reqWithHeader)).toBe("192.168.1.1");

      const reqWithoutHeader = new NextRequest("http://localhost:3000");
      expect(getRequestIp(reqWithoutHeader)).toBe("127.0.0.1");
    });

    it("enforces rate limit returning 429 when blocked and null when allowed", async () => {
      const req = new NextRequest("http://localhost:3000");
      vi.spyOn(securityModule, "checkRateLimit").mockResolvedValueOnce({ allowed: false, remaining: 0 });
      const blockedRes = await enforceRateLimit(req);
      expect(blockedRes?.status).toBe(429);

      vi.spyOn(securityModule, "checkRateLimit").mockResolvedValueOnce({ allowed: true, remaining: 29 });
      const allowedRes = await enforceRateLimit(req);
      expect(allowedRes).toBeNull();
    });

    it("parses and validates JSON body against zod schema", async () => {
      const schema = z.object({ name: z.string() });
      const validReq = new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "GrillRoom" }),
      });
      const validResult = await parseAndValidateBody(validReq, schema);
      expect(validResult.data?.name).toBe("GrillRoom");

      const invalidReq = new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: 123 }),
      });
      const invalidResult = await parseAndValidateBody(invalidReq, schema);
      expect(invalidResult.errorResponse?.status).toBe(400);
    });

    it("handles internal API error returning safe 500 with errorId", () => {
      const res = handleApiError(new Error("Crash"), "TestContext");
      expect(res.status).toBe(500);
    });
  });

  describe("GET /api/session/start", () => {
    it("returns 400 when sessionId query parameter is missing", async () => {
      const req = createGetRequest("/api/session/start");
      const res = await getSessionRoute(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 when session is not in database", async () => {
      const req = createGetRequest("/api/session/start?sessionId=00000000-0000-0000-0000-000000000000");
      const res = await getSessionRoute(req);
      expect(res.status).toBe(404);
    });

    it("returns session details and initial turns when session exists", async () => {
      const sessionId = "12345678-1234-1234-1234-123456789abc";
      mockDb.sessions.set(sessionId, {
        id: sessionId,
        owner_token: "tok",
        panel_ids: ["rohan"],
        turn_count: 0,
        status: "active",
        intensity: "tough",
      });
      const req = createGetRequest(`/api/session/start?sessionId=${sessionId}`);
      const res = await getSessionRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.session.id).toBe(sessionId);
    });
  });

  describe("POST /api/session/start", () => {
    it("returns 400 when idea pitch is too short (< 50 chars)", async () => {
      const req = createJsonRequest("/api/session/start", { idea: "Too short pitch" });
      const res = await startRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeTruthy();
      expect(json.stack).toBeUndefined();
    });

    it("creates session and sets owner_token cookie on valid pitch", async () => {
      const longPitch = "We are building an autonomous B2B platform that reduces supply chain compliance audit cycles by 90% using verified ledger logs.";
      const req = createJsonRequest("/api/session/start", {
        idea: longPitch,
        intensity: "tough",
      });
      const res = await startRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sessionId).toBeDefined();
      expect(json.panel.length).toBeGreaterThanOrEqual(4);
      expect(json.initialTurns).toHaveLength(2);
      expect(res.cookies.get("owner_token")?.value).toBeDefined();
    });
  });

  describe("POST /api/session/answer", () => {
    it("returns 400 on invalid input payload", async () => {
      const req = createJsonRequest("/api/session/answer", { sessionId: "invalid-uuid" });
      const res = await answerRoute(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 when session is not found", async () => {
      const req = createJsonRequest("/api/session/answer", {
        sessionId: "00000000-0000-0000-0000-000000000000",
        answer: "Our payback is 4 months.",
      });
      const res = await answerRoute(req);
      expect(res.status).toBe(404);
    });

    it("returns 403 when owner_token cookie is missing or mismatched", async () => {
      const sessionId = "11111111-1111-1111-1111-111111111111";
      mockDb.sessions.set(sessionId, {
        id: sessionId,
        owner_token: "secret-token",
        panel_ids: ["rohan", "meera", "arjun", "kavya", "sam"],
        turn_count: 0,
        status: "active",
      });

      const req = createJsonRequest(
        "/api/session/answer",
        { sessionId, answer: "Valid answer" },
        "owner_token=wrong-token"
      );
      const res = await answerRoute(req);
      expect(res.status).toBe(403);
    });

    it("streams answer response when valid session and owner_token provided", async () => {
      const sessionId = "99999999-9999-9999-9999-999999999999";
      mockDb.sessions.set(sessionId, {
        id: sessionId,
        owner_token: "valid-token",
        panel_ids: ["rohan", "meera", "arjun", "kavya", "sam"],
        turn_count: 1,
        status: "active",
        intensity: "tough",
      });

      const req = createJsonRequest(
        "/api/session/answer",
        { sessionId, answer: "Our CAC is $200 with 6 month payback." },
        "owner_token=valid-token"
      );
      const res = await answerRoute(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
    });
  });

  describe("POST /api/session/verdict", () => {
    it("returns 400 on invalid sessionId format", async () => {
      const req = createJsonRequest("/api/session/verdict", { sessionId: "not-a-uuid" });
      const res = await verdictRoute(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 when session does not exist", async () => {
      const req = createJsonRequest("/api/session/verdict", {
        sessionId: "00000000-0000-0000-0000-000000000000",
      });
      const res = await verdictRoute(req);
      expect(res.status).toBe(404);
    });

    it("generates deterministic verdicts on valid session", async () => {
      const sessionId = "22222222-2222-2222-2222-222222222222";
      mockDb.sessions.set(sessionId, {
        id: sessionId,
        owner_token: "auth-tok",
        panel_ids: ["rohan", "meera", "arjun", "kavya", "sam"],
        turn_count: 5,
        intensity: "tough",
        status: "active",
        ask_amount: "$500,000 for 10%",
      });

      const req = createJsonRequest("/api/session/verdict", { sessionId }, "owner_token=auth-tok");
      const res = await verdictRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.verdicts).toHaveLength(5);
      expect(data.status).toBe("verdict");
    });
  });

  describe("POST /api/session/debrief", () => {
    it("returns 400 on missing or invalid sessionId", async () => {
      const req = createJsonRequest("/api/session/debrief", { sessionId: "invalid" });
      const res = await debriefRoute(req);
      expect(res.status).toBe(400);
    });

    it("generates debrief report for valid session and matching owner_token", async () => {
      const sessionId = "44444444-4444-4444-4444-444444444444";
      mockDb.sessions.set(sessionId, {
        id: sessionId,
        owner_token: "auth-owner",
        idea_text: "Supply chain compliance ledger with zero error rate",
        industry: "B2B SaaS",
        stage: "Seed",
        ask_amount: "$1,000,000",
        intensity: "tough",
        panel_ids: ["rohan", "meera", "arjun", "kavya", "sam"],
        turn_count: 6,
        status: "verdict",
      });

      const req = createJsonRequest("/api/session/debrief", { sessionId }, "owner_token=auth-owner");
      const res = await debriefRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.readiness_score).toBeGreaterThan(0);
      expect(json.verdicts).toBeDefined();
    });
  });

  describe("POST /api/session/retry", () => {
    it("returns 400 on short revised pitch (< 50 chars)", async () => {
      const req = createJsonRequest("/api/session/retry", {
        sessionId: "33333333-3333-3333-3333-333333333333",
        revisedPitch: "Too short",
      });
      const res = await retryRoute(req);
      expect(res.status).toBe(400);
    });

    it("creates linked retry session when valid revised pitch provided", async () => {
      const parentId = "55555555-5555-5555-5555-555555555555";
      mockDb.sessions.set(parentId, {
        id: parentId,
        owner_token: "parent-token",
        idea_text: "Original pitch text",
        industry: "Enterprise",
        stage: "Series A",
        ask_amount: "$2M for 15%",
        intensity: "tough",
        panel_ids: ["rohan", "meera"],
        turn_count: 8,
        status: "debrief",
      });

      const revisedPitch = "Here is our updated enterprise traction: $1.2M ARR, 110% net retention, and fully audited enterprise reference customers.";
      const req = createJsonRequest("/api/session/retry", { sessionId: parentId, revisedPitch }, "owner_token=parent-token");
      const res = await retryRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.newSessionId).toBeDefined();
    });
  });

  describe("GET /api/session/compare", () => {
    it("returns 400 when sessionId query param is absent", async () => {
      const req = createGetRequest("/api/session/compare");
      const res = await compareRoute(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 when session is not found", async () => {
      const req = createGetRequest("/api/session/compare?sessionId=00000000-0000-0000-0000-000000000000");
      const res = await compareRoute(req);
      expect(res.status).toBe(404);
    });

    it("returns comparative metrics when session exists", async () => {
      const sessId = "66666666-6666-6666-6666-666666666666";
      mockDb.sessions.set(sessId, {
        id: sessId,
        owner_token: "tok",
        panel_ids: ["rohan", "meera"],
        turn_count: 4,
        status: "done",
      });

      const req = createGetRequest(`/api/session/compare?sessionId=${sessId}`);
      const res = await compareRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.originalSessionId).toBe(sessId);
    });
  });

  describe("GET /api/session/radar", () => {
    it("returns 400 when sessionId query parameter is missing", async () => {
      const req = createGetRequest("/api/session/radar");
      const res = await radarRoute(req);
      expect(res.status).toBe(400);
    });

    it("returns radar scores for valid sessionId", async () => {
      const sessId = "77777777-7777-7777-7777-777777777777";
      mockDb.sessions.set(sessId, {
        id: sessId,
        owner_token: "tok",
        panel_ids: ["rohan"],
        turn_count: 2,
        status: "active",
      });

      const req = createGetRequest(`/api/session/radar?sessionId=${sessId}`);
      const res = await radarRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.radar).toBeDefined();
    });
  });

  describe("POST /api/session/behind-doors", () => {
    it("returns 404 when behind-doors feature flag is disabled", async () => {
      vi.spyOn(flagsModule, "FEATURE_BEHIND_DOORS", "get").mockReturnValue(false);
      const req = createJsonRequest("/api/session/behind-doors", { sessionId: "00000000-0000-0000-0000-000000000000" });
      const res = await behindDoorsRoute(req);
      expect(res.status).toBe(404);
    });

    it("returns scene data when feature flag is active", async () => {
      vi.spyOn(flagsModule, "FEATURE_BEHIND_DOORS", "get").mockReturnValue(true);

      const sessId = "88888888-8888-8888-8888-888888888888";
      mockDb.sessions.set(sessId, {
        id: sessId,
        owner_token: "tok",
        panel_ids: ["rohan", "meera"],
        turn_count: 5,
        status: "verdict",
      });

      const req = createJsonRequest("/api/session/behind-doors", { sessionId: sessId }, "owner_token=tok");
      const res = await behindDoorsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.scene).toBeDefined();
    });
  });

  describe("GET /api/share-card/[sessionId]", () => {
    it("returns share card SVG response", async () => {
      vi.spyOn(flagsModule, "FEATURE_SHARE_CARD", "get").mockReturnValue(true);
      const sessId = "aaaa1111-bb22-cc33-dd44-eeee55556666";
      mockDb.sessions.set(sessId, {
        id: sessId,
        owner_token: "tok",
        panel_ids: ["rohan", "meera"],
        turn_count: 4,
        status: "verdict",
      });
      mockDb.reports.set(sessId, {
        readiness_score: 80,
        verdicts: [
          { investor_id: "rohan", decision: "In", reason: "Strong metrics", simulated_offer: "$500k for 10%" },
          { investor_id: "meera", decision: "Out", reason: "TAM concerns" },
        ],
      });
      mockDb.claims.push({
        id: 101,
        session_id: sessId,
        claim_text: "10 customers",
        status: "verified",
        category: "traction",
        source_turn: 1,
      });
      mockDb.turns.push({
        session_id: sessId,
        role: "founder",
        text: "We have 10 customers",
        turn_index: 1,
        created_at: new Date(),
      });

      const req = new NextRequest(`http://localhost:3000/api/share-card/${sessId}`);
      const res = await shareCardRoute(req, { params: Promise.resolve({ sessionId: sessId }) });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/^image\/(png|svg\+xml)/);
    });

    it("returns 400 when sessionId is invalid format", async () => {
      vi.spyOn(flagsModule, "FEATURE_SHARE_CARD", "get").mockReturnValue(true);
      const req = new NextRequest("http://localhost:3000/api/share-card/invalid-id");
      const res = await shareCardRoute(req, { params: Promise.resolve({ sessionId: "invalid-id" }) });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/extract-pdf", () => {
    it("returns 400 when no file is uploaded in formData", async () => {
      const formData = new FormData();
      const req = new NextRequest("http://localhost:3000/api/extract-pdf", {
        method: "POST",
        body: formData,
      });
      const res = await extractPdfRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("No file provided");
    });

    it("returns 400 when non-PDF file extension is uploaded", async () => {
      const formData = new FormData();
      const file = new File(["dummy text content"], "notes.txt", { type: "text/plain" });
      formData.append("file", file);
      const req = new NextRequest("http://localhost:3000/api/extract-pdf", {
        method: "POST",
        body: formData,
      });
      const res = await extractPdfRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Only PDF files");
    });

    it("returns 400 when magic bytes do not match %PDF-", async () => {
      const formData = new FormData();
      const fakePdf = new File(["NOT A REAL PDF HEADER"], "spoofed.pdf", { type: "application/pdf" });
      formData.append("file", fakePdf);
      const req = new NextRequest("http://localhost:3000/api/extract-pdf", {
        method: "POST",
        body: formData,
      });
      const res = await extractPdfRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("magic byte");
    });
  });
});
