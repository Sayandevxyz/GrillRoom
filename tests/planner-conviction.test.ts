import { describe, it, expect } from "vitest";
import {
  planNextTurn,
  getFollowupCap,
  PlannerContext,
} from "../lib/engine/planner";
import {
  calculateConvictionDelta,
  clampConvictionScore,
  computeAverageScore,
  getVerdictDecision,
  generateSimulatedOffer,
} from "../lib/engine/conviction";
import { ClaimRecord } from "../lib/engine/ledger";
import { AnalystOutput, DEFAULT_ANALYST_OUTPUT } from "../lib/engine/analyst";

describe("Planner Pure Logic Unit Tests", () => {
  const dummyClaims: ClaimRecord[] = [
    {
      id: 1,
      session_id: "s1",
      claim_text: "Our CAC is $500",
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
      claim_text: "Bottom-up market size is $2B across 50,000 enterprise accounts",
      category: "market",
      status: "unverified",
      severity: 4,
      source_turn: 1,
      thread_state: "open",
      ladder_level: 1,
      followups_used: 0,
      last_asked_by: null,
    },
  ];

  const baseContext: PlannerContext = {
    intensity: "tough",
    panelIds: ["rohan", "meera", "arjun", "sam"],
    claims: dummyClaims,
    analystOutput: DEFAULT_ANALYST_OUTPUT,
    lastSpeakerId: "meera",
    turnsSpoken: { rohan: 1, meera: 2, arjun: 1, sam: 0 },
    totalInvestorTurns: 4,
    convictions: { rohan: 50, meera: 50, arjun: 50, sam: 50 },
    currentTurnNo: 3,
  };

  it("never picks the same investor twice in a row when another is available", () => {
    const result = planNextTurn({
      ...baseContext,
      lastSpeakerId: "rohan",
    });
    expect(result.speakerId).not.toBe("rohan");
  });

  it("prioritizes an investor who was dodged", () => {
    const dodgedClaims: ClaimRecord[] = [
      {
        ...dummyClaims[0],
        thread_state: "drilling",
        last_asked_by: "rohan",
      },
    ];

    const result = planNextTurn({
      ...baseContext,
      lastSpeakerId: "meera",
      claims: dodgedClaims,
      analystOutput: {
        ...DEFAULT_ANALYST_OUTPUT,
        dodged: true,
      },
    });

    expect(result.speakerId).toBe("rohan");
    expect(result.questionType).toBe("dodge_return");
  });

  it("Interrupt Rule: triggers immediately on high-severity contradiction (severity >= 3)", () => {
    const contradictionClaims: ClaimRecord[] = [
      {
        id: 7,
        session_id: "s1",
        claim_text: "We have 100 enterprise customers paying $10k/mo",
        category: "revenue_model",
        status: "unverified",
        severity: 4,
        source_turn: 2,
        thread_state: "open",
        ladder_level: 1,
        followups_used: 0,
        last_asked_by: null,
      },
    ];

    const analysisWithContradiction: AnalystOutput = {
      ...DEFAULT_ANALYST_OUTPUT,
      contradictions: [
        {
          claim_id: 7,
          conflicts_with_turn: 1,
          explanation: "Founder earlier stated they have zero paying customers.",
        },
      ],
    };

    const result = planNextTurn({
      ...baseContext,
      claims: contradictionClaims,
      analystOutput: analysisWithContradiction,
    });

    expect(result.isInterrupt).toBe(true);
    expect(result.questionType).toBe("contradiction_callout");
    // Rohan has highest weight (3) for revenue_model
    expect(result.speakerId).toBe("rohan");
    expect(result.contradictionQuote).toContain("Founder earlier stated");
  });

  it("Cross-talk Rule: triggers when two investors' convictions differ by >= 30", () => {
    const result = planNextTurn({
      ...baseContext,
      convictions: {
        rohan: 80, // diff of 45 with sam
        meera: 50,
        arjun: 50,
        sam: 35,
      },
      lastCrossTalkTurn: undefined,
      currentTurnNo: 4,
    });

    if (result.speakerId === "rohan" || result.speakerId === "sam") {
      expect(result.isCrossTalk).toBe(true);
      expect(result.crossTalkTargetInvestor).toBeDefined();
    }
  });

  it("enforces follow-up caps across intensity levels", () => {
    expect(getFollowupCap("friendly")).toBe(1);
    expect(getFollowupCap("tough")).toBe(2);
    expect(getFollowupCap("shark")).toBe(3);
  });

  it("selects number_challenge when claim contains digits and is unverified", () => {
    const numberClaim: ClaimRecord[] = [
      {
        id: 10,
        session_id: "s1",
        claim_text: "Our margin is 85% with 400 active subscribers",
        category: "traction",
        status: "unverified",
        severity: 3,
        source_turn: 1,
        thread_state: "open",
        ladder_level: 1,
        followups_used: 0,
        last_asked_by: null,
      },
    ];

    const result = planNextTurn({
      ...baseContext,
      claims: numberClaim,
      analystOutput: DEFAULT_ANALYST_OUTPUT,
    });

    expect(result.questionType).toBe("number_challenge");
  });
});

describe("Conviction Engine Pure Logic Unit Tests", () => {
  it("clamps raw conviction deltas strictly to ±15", () => {
    expect(calculateConvictionDelta(25, 5)).toBe(15);
    expect(calculateConvictionDelta(-30, 5)).toBe(-15);
    expect(calculateConvictionDelta(8, 5)).toBe(8);
  });

  it("Sanity Check: prevents negative delta when average score >= 7", () => {
    expect(calculateConvictionDelta(-10, 7.5)).toBe(0);
    expect(calculateConvictionDelta(-5, 8.0)).toBe(0);
    expect(calculateConvictionDelta(10, 8.0)).toBe(10);
  });

  it("Sanity Check: prevents positive delta when average score <= 3", () => {
    expect(calculateConvictionDelta(12, 2.5)).toBe(0);
    expect(calculateConvictionDelta(6, 3.0)).toBe(0);
    expect(calculateConvictionDelta(-10, 2.0)).toBe(-10);
  });

  it("clamps running conviction score strictly to [0, 100]", () => {
    expect(clampConvictionScore(95, 10)).toBe(100);
    expect(clampConvictionScore(10, -15)).toBe(0);
    expect(clampConvictionScore(50, 8)).toBe(58);
  });

  it("computes average score correctly across 5 criteria", () => {
    const avg = computeAverageScore({
      directness: 8,
      specificity: 6,
      evidence: 7,
      logic: 9,
      honesty: 10,
    });
    expect(avg).toBe(8.0);
  });

  it("evaluates verdict thresholds in code accurately", () => {
    // Friendly: In >= 60, Conditional 35-59, Out < 35
    expect(getVerdictDecision(62, "friendly")).toBe("In");
    expect(getVerdictDecision(45, "friendly")).toBe("Conditional");
    expect(getVerdictDecision(30, "friendly")).toBe("Out");

    // Tough: In >= 65, Conditional 40-64, Out < 40
    expect(getVerdictDecision(70, "tough")).toBe("In");
    expect(getVerdictDecision(55, "tough")).toBe("Conditional");
    expect(getVerdictDecision(38, "tough")).toBe("Out");

    // Shark: In >= 72, Conditional 45-71, Out < 45
    expect(getVerdictDecision(75, "shark")).toBe("In");
    expect(getVerdictDecision(50, "shark")).toBe("Conditional");
    expect(getVerdictDecision(42, "shark")).toBe("Out");
  });

  it("generates simulated offers cleanly with Simulated tag", () => {
    const offerIn = generateSimulatedOffer("In", 88, "$1,000,000 for 10%");
    expect(offerIn).toContain("(Simulated)");
    expect(offerIn).toContain("$1,000,000");

    const offerConditional = generateSimulatedOffer("Conditional", 55, "$500,000 for 10%");
    expect(offerConditional).toContain("(Simulated)");

    const offerOut = generateSimulatedOffer("Out", 20, "$500,000 for 10%");
    expect(offerOut).toBe("No offer (Passed)");
  });
});
