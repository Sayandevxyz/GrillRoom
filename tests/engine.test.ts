import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  planNextTurn,
  getFollowupCap,
  PlannerContext,
} from "@/lib/engine/planner";
import {
  calculateConvictionDelta,
  clampConvictionScore,
  computeAverageScore,
  getVerdictDecision,
  generateSimulatedOffer,
} from "@/lib/engine/conviction";
import {
  addClaim,
  updateClaimStatus,
  updateClaimThread,
  applyAnalystUpdates,
  toClaimSnippets,
  ClaimRecord,
} from "@/lib/engine/ledger";
import { mockDb } from "@/lib/db";
import { executeInterrogationTurn, SessionRecord } from "@/lib/engine/session";
import { AnalystOutput, DEFAULT_ANALYST_OUTPUT } from "@/lib/engine/analyst";
import { mapClaimStatus, humanizeCategory } from "@/lib/engine/status-mapping";

// Mock groq LLM calls so tests run offline
vi.mock("@/lib/llm/groq", () => ({
  createChatCompletion: vi.fn().mockResolvedValue(
    JSON.stringify({
      scores: { directness: 8, specificity: 8, evidence: 7, logic: 8, honesty: 9 },
      new_claims: [{ text: "Enterprise renewal rate is 95%", category: "unit_economics", severity: 4 }],
      status_changes: [{ claim_id: 1, status: "evidenced" }],
      contradictions: [],
      dodged: false,
      missing: [],
      conviction_deltas: { rohan: 3, meera: 2, arjun: 4, kavya: 2, sam: 3 },
      reason: "Solid retention metrics with specific data.",
    })
  ),
  createStreamingChatCompletion: vi.fn().mockImplementation(async function* () {
    yield { choices: [{ delta: { content: "What is your gross margin profile?" } }] };
  }),
  DEFAULT_BIG_MODEL: "dummy-model",
  DEFAULT_SMALL_MODEL: "dummy-model",
}));

describe("Engine Test Suite", () => {
  beforeEach(() => {
    mockDb.sessions.clear();
    mockDb.turns = [];
    mockDb.claims = [];
    mockDb.convictions = [];
    mockDb.evaluations = [];
    mockDb.reports.clear();
    mockDb.verdicts = [];
  });

  describe("Ledger Management", () => {
    it("adds a new claim with default status and values", async () => {
      const claim = await addClaim("sess-1", "We have 50 enterprise pilots", "traction", 4, 1);
      expect(claim.id).toBeDefined();
      expect(claim.claim_text).toBe("We have 50 enterprise pilots");
      expect(claim.category).toBe("traction");
      expect(claim.status).toBe("unverified");
      expect(claim.severity).toBe(4);
      expect(claim.thread_state).toBe("open");
    });

    it("updates claim status cleanly", async () => {
      const claim = await addClaim("sess-1", "CAC is $300", "unit_economics", 3, 1);
      await updateClaimStatus(claim.id, "evidenced");
      const found = mockDb.claims.find((c) => c.id === claim.id);
      expect(found?.status).toBe("evidenced");
    });

    it("updates claim thread state and ladder level", async () => {
      const claim = await addClaim("sess-1", "LTV is 4x CAC", "unit_economics", 4, 1);
      await updateClaimThread(claim.id, {
        thread_state: "drilling",
        ladder_level: 2,
        followups_used: 1,
        last_asked_by: "rohan",
      });
      const found = mockDb.claims.find((c) => c.id === claim.id);
      expect(found?.thread_state).toBe("drilling");
      expect(found?.ladder_level).toBe(2);
      expect(found?.followups_used).toBe(1);
      expect(found?.last_asked_by).toBe("rohan");
    });

    it("applies analyst evaluation updates correctly", async () => {
      const existing = await addClaim("sess-1", "Burn rate is 10k/mo", "unit_economics", 3, 1);
      const analysis: AnalystOutput = {
        scores: { directness: 7, specificity: 8, evidence: 6, logic: 7, honesty: 8 },
        new_claims: [{ text: "Gross margin is 82%", category: "unit_economics", severity: 4 }],
        status_changes: [{ claim_id: existing.id, status: "evidenced" }],
        contradictions: [],
        dodged: false,
        missing: [],
        conviction_deltas: { rohan: 2 },
        reason: "Valid numbers",
      };

      await applyAnalystUpdates("sess-1", analysis, 2);
      expect(mockDb.claims).toHaveLength(2);
      expect(mockDb.claims.some((c) => c.claim_text === "Gross margin is 82%")).toBe(true);
      const updatedExisting = mockDb.claims.find((c) => c.id === existing.id);
      expect(updatedExisting?.status).toBe("evidenced");
    });

    it("converts claims to lightweight prompt snippets", async () => {
      const claim = await addClaim("sess-1", "TAM is $10B", "market", 4, 1);
      const snippets = toClaimSnippets([claim]);
      expect(snippets[0]).toEqual({
        id: claim.id,
        claim_text: "TAM is $10B",
        category: "market",
        status: "unverified",
        severity: 4,
        ladder_level: 1,
      });
    });
  });

  describe("Planner Rules & Steering", () => {
    const dummyClaims: ClaimRecord[] = [
      {
        id: 1,
        session_id: "s1",
        claim_text: "CAC is $500",
        category: "unit_economics",
        status: "unverified",
        severity: 4,
        source_turn: 1,
        thread_state: "open",
        ladder_level: 1,
        followups_used: 0,
        last_asked_by: null,
      },
      {
        id: 2,
        session_id: "s1",
        claim_text: "TAM is $5B bottom-up",
        category: "market",
        status: "unverified",
        severity: 3,
        source_turn: 1,
        thread_state: "open",
        ladder_level: 1,
        followups_used: 0,
        last_asked_by: null,
      },
    ];

    const baseContext: PlannerContext = {
      intensity: "tough",
      panelIds: ["rohan", "meera", "arjun", "kavya", "sam"],
      claims: dummyClaims,
      analystOutput: DEFAULT_ANALYST_OUTPUT,
      lastSpeakerId: "meera",
      turnsSpoken: { rohan: 1, meera: 2, arjun: 1, kavya: 0, sam: 0 },
      totalInvestorTurns: 4,
      convictions: { rohan: 50, meera: 50, arjun: 50, kavya: 50, sam: 50 },
      currentTurnNo: 3,
    };

    it("enforces followup caps by intensity mode", () => {
      expect(getFollowupCap("friendly")).toBe(1);
      expect(getFollowupCap("tough")).toBe(2);
      expect(getFollowupCap("shark")).toBe(3);
    });

    it("Interrupt Rule: triggers category specialist on severe contradiction (severity >= 3)", () => {
      const ctx: PlannerContext = {
        ...baseContext,
        analystOutput: {
          ...DEFAULT_ANALYST_OUTPUT,
          contradictions: [
            { claim_id: 1, conflicts_with_turn: 0, explanation: "Stated CAC was $50 earlier" },
          ],
        },
      };

      const result = planNextTurn(ctx);
      expect(result.isInterrupt).toBe(true);
      expect(result.questionType).toBe("contradiction_callout");
      // Rohan is the unit_economics specialist
      expect(result.speakerId).toBe("rohan");
    });

    it("Dodge Rule: escalates question when founder answer is evasive", () => {
      const ctx: PlannerContext = {
        ...baseContext,
        lastSpeakerId: "rohan",
        analystOutput: {
          ...DEFAULT_ANALYST_OUTPUT,
          dodged: true,
          scores: { directness: 2, specificity: 3, evidence: 2, logic: 4, honesty: 4 },
        },
      };

      const result = planNextTurn(ctx);
      expect(["dodge_return", "vagueness_escalation", "forced_calculation"]).toContain(result.questionType);
    });

    it("Fairness Rule: prioritizes under-represented panelists who have not spoken yet", () => {
      const ctx: PlannerContext = {
        ...baseContext,
        lastSpeakerId: "meera",
        claims: [
          {
            id: 1,
            session_id: "s1",
            claim_text: "General company overview",
            category: "general",
            status: "unverified",
            severity: 3,
            source_turn: 1,
            thread_state: "open",
            ladder_level: 1,
            followups_used: 0,
            last_asked_by: null,
          },
        ],
        turnsSpoken: { rohan: 3, meera: 3, arjun: 3, kavya: 0, sam: 0 },
      };

      const result = planNextTurn(ctx);
      expect(["kavya", "sam"]).toContain(result.speakerId);
    });
  });

  describe("Conviction Mathematics & Bounds", () => {
    it("computes average answer score accurately", () => {
      const avg = computeAverageScore({
        directness: 8,
        specificity: 6,
        evidence: 4,
        logic: 10,
        honesty: 7,
      });
      expect(avg).toBe(7.0);
    });

    it("clamps conviction deltas within ±15 cap", () => {
      expect(calculateConvictionDelta(25, 8)).toBe(15);
      expect(calculateConvictionDelta(-30, 2)).toBe(-15);
      expect(calculateConvictionDelta(8, 6)).toBe(8);
    });

    it("sanity check: prevents negative delta when answer average score is >= 7", () => {
      expect(calculateConvictionDelta(-5, 8.5)).toBe(0);
    });

    it("sanity check: prevents positive delta when answer average score is <= 3", () => {
      expect(calculateConvictionDelta(6, 2.5)).toBe(0);
    });

    it("clamps running conviction strictly to 0..100 bounds", () => {
      expect(clampConvictionScore(95, 10)).toBe(100);
      expect(clampConvictionScore(5, -15)).toBe(0);
      expect(clampConvictionScore(50, 8)).toBe(58);
    });
  });

  describe("Deterministic Verdict Decision Thresholds", () => {
    it("evaluates tough mode thresholds exactly at 65 and 40", () => {
      expect(getVerdictDecision(65, "tough")).toBe("In");
      expect(getVerdictDecision(64, "tough")).toBe("Conditional");
      expect(getVerdictDecision(40, "tough")).toBe("Conditional");
      expect(getVerdictDecision(39, "tough")).toBe("Out");
    });

    it("evaluates friendly mode thresholds at 60 and 35", () => {
      expect(getVerdictDecision(60, "friendly")).toBe("In");
      expect(getVerdictDecision(59, "friendly")).toBe("Conditional");
      expect(getVerdictDecision(35, "friendly")).toBe("Conditional");
      expect(getVerdictDecision(34, "friendly")).toBe("Out");
    });

    it("evaluates shark mode thresholds at 72 and 45", () => {
      expect(getVerdictDecision(72, "shark")).toBe("In");
      expect(getVerdictDecision(71, "shark")).toBe("Conditional");
      expect(getVerdictDecision(45, "shark")).toBe("Conditional");
      expect(getVerdictDecision(44, "shark")).toBe("Out");
    });

    it("generates simulated offers consistent with decisions and conviction scores", () => {
      const inOffer = generateSimulatedOffer("In", 90, "$1,000,000 for 10%");
      expect(inOffer).toContain("$1,000,000");
      expect(inOffer).toContain("7% equity");

      const condOffer = generateSimulatedOffer("Conditional", 48, "$500,000 for 10%");
      expect(condOffer).toContain("20% equity");
      expect(condOffer).toContain("customer reference audit");

      const outOffer = generateSimulatedOffer("Out", 25, "$500,000 for 10%");
      expect(outOffer).toBe("No offer (Passed)");
    });
  });

  describe("Interrogation Session Orchestration", () => {
    it("executes an interrogation turn cleanly end-to-end", async () => {
      const session: SessionRecord = {
        id: "sess-test",
        owner_token: "token-test",
        created_at: new Date().toISOString(),
        idea_text: "AI automated supply chain audit software",
        intensity: "tough",
        panel_ids: ["rohan", "meera", "arjun", "kavya", "sam"],
        status: "active",
        turn_count: 1,
      };
      mockDb.sessions.set("sess-test", session as unknown as Record<string, unknown>);

      const result = await executeInterrogationTurn(session, "Our gross margin is 85% and payback is 4 months.");
      expect(result.state.turnCount).toBe(2);
      expect(result.meta.speakerId).toBeDefined();
      expect(result.state.meters).toBeDefined();
      expect(result.investorSpeechStream).toBeDefined();

      const savedTurn = await result.saveInvestorTurn("What is your enterprise churn rate?");
      expect(savedTurn.role).toBe("investor");
      expect(savedTurn.turn_no).toBe(2);
    });
  });

  describe("Status Mapping and UI Terminology", () => {
    it("maps claim status according to executive diligence rules", () => {
      expect(mapClaimStatus({ status: "contradicted" }).status).toBe("contradiction");
      expect(mapClaimStatus({ status: "evidenced", evidence_score: 9 }).status).toBe("verified");
      expect(mapClaimStatus({ status: "evidenced", evidence_score: 6 }).status).toBe("strong_claim");
      expect(mapClaimStatus({ status: "unverified", followups_used: 1 }).status).toBe("needs_evidence");
      expect(mapClaimStatus({ status: "unverified", followups_used: 0 }).status).toBe("unverified");
    });

    it("humanizes raw backend category strings into executive terminology", () => {
      expect(humanizeCategory("unit_economics")).toBe("Unit Economics");
      expect(humanizeCategory("traction")).toBe("Customer Traction");
      expect(humanizeCategory("moat")).toBe("Defensibility & Moat");
    });
  });
});
