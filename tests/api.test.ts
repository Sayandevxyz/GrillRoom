import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as startRoute } from "@/app/api/session/start/route";
import { POST as answerRoute } from "@/app/api/session/answer/route";
import { POST as verdictRoute } from "@/app/api/session/verdict/route";
import { POST as debriefRoute } from "@/app/api/session/debrief/route";
import { POST as retryRoute } from "@/app/api/session/retry/route";
import { GET as compareRoute } from "@/app/api/session/compare/route";
import { GET as radarRoute } from "@/app/api/session/radar/route";
import { POST as behindDoorsRoute } from "@/app/api/session/behind-doors/route";
import { POST as extractPdfRoute } from "@/app/api/extract-pdf/route";
import { mockDb } from "@/lib/db";
import * as securityModule from "@/lib/security";

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
      expect(json.initialTurns).toHaveLength(2); // Chair intro + first investor
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
  });

  describe("GET /api/session/radar", () => {
    it("returns 400 when sessionId query parameter is missing", async () => {
      const req = createGetRequest("/api/session/radar");
      const res = await radarRoute(req);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/session/behind-doors", () => {
    it("returns 404 when behind-doors feature flag is disabled", async () => {
      const req = createJsonRequest("/api/session/behind-doors", { sessionId: "00000000-0000-0000-0000-000000000000" });
      const res = await behindDoorsRoute(req);
      expect(res.status).toBe(404);
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

  describe("Rate Limiting & Information Leakage", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      vi.spyOn(securityModule, "checkRateLimit").mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
      });

      const req = createJsonRequest("/api/session/start", {
        idea: "Long valid idea pitch exceeding 50 characters to trigger rate limiter check.",
      });
      const res = await startRoute(req);
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.error).toContain("Rate limit");
    });

    it("never returns raw stack traces in error responses", async () => {
      const req = createJsonRequest("/api/session/start", { idea: "abc" });
      const res = await startRoute(req);
      const json = await res.json();
      expect(json.stack).toBeUndefined();
      expect(json.error).toBeDefined();
    });
  });
});
