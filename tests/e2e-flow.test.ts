import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as startRoute } from "@/app/api/session/start/route";
import { POST as answerRoute } from "@/app/api/session/answer/route";
import { POST as verdictRoute } from "@/app/api/session/verdict/route";
import { POST as debriefRoute } from "@/app/api/session/debrief/route";
import { POST as retryRoute } from "@/app/api/session/retry/route";
import { GET as compareRoute } from "@/app/api/session/compare/route";
import { mockDb } from "@/lib/db";

vi.mock("@/lib/llm/groq", () => ({
  createChatCompletion: vi.fn().mockResolvedValue(
    JSON.stringify({
      readiness_score: 78,
      recommendation: "In",
      executive_summary: "Strong execution metrics.",
      verdicts: [
        { investor_id: "rohan", decision: "In", reason: "Margins verified", simulated_offer: "$500,000 for 10%" },
        { investor_id: "meera", decision: "In", reason: "Good market fit", simulated_offer: "$500,000 for 10%" },
      ],
      top_weaknesses: [],
      stronger_answers: [],
      contradictions: [],
      expected_questions: ["What is next cohort retention?"],
      evidence_plan: ["Sign 3 letters of intent"],
      tightened_pitch: "Enterprise compliance automated.",
    })
  ),
  createStreamingChatCompletion: vi.fn().mockImplementation(async function* () {
    yield { choices: [{ delta: { content: "How do you defend margins?" } }] };
  }),
  DEFAULT_BIG_MODEL: "mock-big",
  DEFAULT_SMALL_MODEL: "mock-small",
}));

describe("End-to-End Complete Simulation Flow", () => {
  beforeEach(() => {
    mockDb.sessions.clear();
    mockDb.turns = [];
    mockDb.claims = [];
    mockDb.convictions = [];
    mockDb.evaluations = [];
    mockDb.reports.clear();
    mockDb.verdicts = [];
  });

  it("drives full lifecycle: start -> answer x3 -> verdict -> debrief -> retry -> compare", async () => {
    // 1. Start Session
    const startReq = new NextRequest("http://localhost:3000/api/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea: "We automate supply chain environmental compliance audits for mid-market manufacturing enterprises, delivering 85% gross margins with verified payback of 4 months.",
        intensity: "tough",
      }),
    });
    const startRes = await startRoute(startReq);
    expect(startRes.status).toBe(200);
    const startData = await startRes.json();
    const sessionId = startData.sessionId;
    const ownerToken = startRes.cookies.get("owner_token")?.value;
    expect(sessionId).toBeDefined();
    expect(ownerToken).toBeDefined();

    // 2. Answer Turns (x3)
    for (let i = 1; i <= 3; i++) {
      const answerReq = new NextRequest("http://localhost:3000/api/session/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `owner_token=${ownerToken}`,
        },
        body: JSON.stringify({
          sessionId,
          answer: `Turn ${i}: Our customer acquisition cost is strictly $250 across Google Search with a 14-month retention cycle.`,
        }),
      });
      const answerRes = await answerRoute(answerReq);
      expect(answerRes.status).toBe(200);
      expect(answerRes.headers.get("content-type")).toContain("text/event-stream");
    }

    // 3. Generate Verdicts
    const verdictReq = new NextRequest("http://localhost:3000/api/session/verdict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `owner_token=${ownerToken}`,
      },
      body: JSON.stringify({ sessionId }),
    });
    const verdictRes = await verdictRoute(verdictReq);
    expect(verdictRes.status).toBe(200);
    const verdictData = await verdictRes.json();
    expect(verdictData.verdicts.length).toBeGreaterThan(0);

    // 4. Generate Debrief Report
    const debriefReq = new NextRequest("http://localhost:3000/api/session/debrief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `owner_token=${ownerToken}`,
      },
      body: JSON.stringify({ sessionId }),
    });
    const debriefRes = await debriefRoute(debriefReq);
    expect(debriefRes.status).toBe(200);
    const debriefData = await debriefRes.json();
    expect(debriefData.readiness_score).toBeGreaterThan(0);

    // 5. Retry Pitch
    const retryReq = new NextRequest("http://localhost:3000/api/session/retry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `owner_token=${ownerToken}`,
      },
      body: JSON.stringify({
        sessionId,
        revisedPitch: "Here is our revised enterprise traction memo: audited $1.4M ARR with verified 88% gross margins and 3 signed enterprise references.",
      }),
    });
    const retryRes = await retryRoute(retryReq);
    expect(retryRes.status).toBe(200);
    const retryData = await retryRes.json();
    const retrySessionId = retryData.newSessionId;
    expect(retrySessionId).toBeDefined();

    // 6. Compare Audit
    const compareReq = new NextRequest(`http://localhost:3000/api/session/compare?sessionId=${retrySessionId}`, {
      method: "GET",
    });
    const compareRes = await compareRoute(compareReq);
    expect(compareRes.status).toBe(200);
    const compareData = await compareRes.json();
    expect(compareData.originalSessionId).toBe(sessionId);
    expect(compareData.retrySessionId).toBe(retrySessionId);
  });
});
