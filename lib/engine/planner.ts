import { INVESTOR_PERSONAS, ClaimCategory } from "./personas";
import { ClaimRecord } from "./ledger";
import { AnalystOutput } from "./analyst";
import { computeAverageScore } from "./conviction";

export type QuestionType =
  | "number_challenge"
  | "contradiction_callout"
  | "dodge_return"
  | "vagueness_escalation"
  | "forced_calculation"
  | "stress_test"
  | "why_you_why_now"
  | "kill_question"
  | "clarifying";

export interface PlannerContext {
  intensity: "friendly" | "tough" | "shark";
  panelIds: string[];
  claims: ClaimRecord[];
  analystOutput: AnalystOutput;
  lastSpeakerId?: string;
  turnsSpoken: Record<string, number>;
  totalInvestorTurns: number;
  convictions: Record<string, number>;
  lastCrossTalkTurn?: number;
  currentTurnNo: number;
}

export interface PlannerResult {
  speakerId: string;
  questionType: QuestionType;
  targetClaim?: ClaimRecord;
  ladderLevel: number;
  isInterrupt: boolean;
  isCrossTalk: boolean;
  crossTalkTargetInvestor?: string;
  contradictionQuote?: string;
}

export function getFollowupCap(intensity: "friendly" | "tough" | "shark"): number {
  if (intensity === "friendly") return 1;
  if (intensity === "shark") return 3;
  return 2; // tough
}

/**
 * Pure, deterministic investor planner logic.
 *
 * Implements conversational steering rules:
 * 1. Interrupt Rule: Contradictions (severity >= 3) trigger an immediate category-specialist interrupt.
 * 2. Dodge Rule: Vague/evasive answers trigger a follow-up ladder escalation on the active thread.
 * 3. Fairness Rule: Enforces turn rotation so under-represented investors get question priority.
 * 4. Cross-Talk Rule: Inter-investor reactions when convictions diverge.
 *
 * @param ctx Current interrogation context, ledger claims, and analyst output
 * @returns PlannerResult specifying the chosen speaker, question type, and claim target
 */
export function planNextTurn(ctx: PlannerContext): PlannerResult {
  const cap = getFollowupCap(ctx.intensity);
  const avgScore = computeAverageScore(ctx.analystOutput.scores);

  // 1. Check for Interrupt Rule:
  // If latest analysis found a contradiction with severity >= 3,
  // the investor with the highest weight[category] for that claim speaks next regardless of score.
  if (ctx.analystOutput.contradictions && ctx.analystOutput.contradictions.length > 0) {
    for (const contradiction of ctx.analystOutput.contradictions) {
      const targetClaim = ctx.claims.find((c) => c.id === Number(contradiction.claim_id));
      const severity = targetClaim?.severity ?? 3;
      if (severity >= 3) {
        const category = (targetClaim?.category || "general") as ClaimCategory;

        // Find investor with highest weight for that category
        let bestInvestor = ctx.panelIds[0];
        let highestWeight = -1;

        for (const id of ctx.panelIds) {
          const persona = INVESTOR_PERSONAS[id];
          const weight = persona?.priorityWeights?.[category] ?? 0;
          if (weight > highestWeight) {
            highestWeight = weight;
            bestInvestor = id;
          }
        }

        return {
          speakerId: bestInvestor,
          questionType: "contradiction_callout",
          targetClaim,
          ladderLevel: targetClaim ? Math.min(4, targetClaim.ladder_level + 1) : 2,
          isInterrupt: true,
          isCrossTalk: false,
          contradictionQuote: contradiction.explanation || targetClaim?.claim_text,
        };
      }
    }
  }

  // 2. Filter active threads (open or drilling)
  const activeThreads = ctx.claims.filter(
    (c) => c.thread_state === "open" || c.thread_state === "drilling"
  );

  // 3. Compute relevance, dodge, fairness for each panelist
  const relevanceRaw: Record<string, number> = {};
  for (const id of ctx.panelIds) {
    const persona = INVESTOR_PERSONAS[id];
    let sum = 0;
    for (const t of activeThreads) {
      const cat = t.category as ClaimCategory;
      const weight = persona?.priorityWeights?.[cat] ?? 1;
      sum += t.severity * weight;
    }
    relevanceRaw[id] = sum;
  }

  const maxRelevance = Math.max(...Object.values(relevanceRaw), 1);

  const scores: Record<string, number> = {};
  const dodges: Record<string, number> = {};

  for (const id of ctx.panelIds) {
    const normRelevance = (relevanceRaw[id] || 0) / maxRelevance;

    // dodge_i = 1 if i's previous question was dodged
    const wasDodged =
      ctx.analystOutput.dodged &&
      activeThreads.some((t) => t.last_asked_by === id && t.thread_state === "drilling");
    dodges[id] = wasDodged ? 1 : 0;

    // fairness_i = 1 - (turnsSpokenBy_i / totalInvestorTurns) (0..1)
    const turnsSpokenBy_i = ctx.turnsSpoken[id] || 0;
    const fairness =
      ctx.totalInvestorTurns > 0
        ? Math.max(0, 1 - turnsSpokenBy_i / ctx.totalInvestorTurns)
        : 1;

    scores[id] = 0.5 * normRelevance + 0.3 * dodges[id] + 0.2 * fairness;
  }

  // Filter out last speaker unless dodge_i = 1
  let eligiblePanelists = ctx.panelIds.filter((id) => {
    if (id === ctx.lastSpeakerId && dodges[id] !== 1 && ctx.panelIds.length > 1) {
      return false;
    }
    return true;
  });

  if (eligiblePanelists.length === 0) {
    eligiblePanelists = ctx.panelIds;
  }

  // Sort by score descending
  eligiblePanelists.sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
  const chosenSpeakerId = eligiblePanelists[0];

  // 4. Cross-talk rule:
  // If two investors' convictions differ by >= 30 and cross-talk has not occurred in last 3 turns
  let isCrossTalk = false;
  let crossTalkTargetInvestor: string | undefined = undefined;

  const turnsSinceCrossTalk = ctx.lastCrossTalkTurn
    ? ctx.currentTurnNo - ctx.lastCrossTalkTurn
    : 999;

  if (turnsSinceCrossTalk >= 3) {
    const convictionValues = Object.entries(ctx.convictions).filter(([id]) =>
      ctx.panelIds.includes(id)
    );
    for (let i = 0; i < convictionValues.length; i++) {
      for (let j = i + 1; j < convictionValues.length; j++) {
        const [id1, score1] = convictionValues[i];
        const [id2, score2] = convictionValues[j];
        if (Math.abs(score1 - score2) >= 30) {
          if (chosenSpeakerId === id1) {
            isCrossTalk = true;
            crossTalkTargetInvestor = INVESTOR_PERSONAS[id2]?.name || id2;
          } else if (chosenSpeakerId === id2) {
            isCrossTalk = true;
            crossTalkTargetInvestor = INVESTOR_PERSONAS[id1]?.name || id1;
          }
          break;
        }
      }
      if (isCrossTalk) break;
    }
  }

  // 5. Target Thread selection for chosen speaker:
  // Highest severity * (1 + followups_used==0 ? 0.5 : 0) among open/drilling threads
  const persona = INVESTOR_PERSONAS[chosenSpeakerId];
  let targetClaim: ClaimRecord | undefined = undefined;
  let bestThreadScore = -1;

  for (const t of activeThreads) {
    const cat = t.category as ClaimCategory;
    const catWeight = persona?.priorityWeights?.[cat] ?? 1;
    if (catWeight > 0) {
      const bonus = t.followups_used === 0 ? 0.5 : 0;
      const threadScore = t.severity * (1 + bonus) * catWeight;
      if (threadScore > bestThreadScore) {
        bestThreadScore = threadScore;
        targetClaim = t;
      }
    }
  }

  if (!targetClaim && activeThreads.length > 0) {
    targetClaim = activeThreads[0];
  }

  // 6. Question type selection (choose first matching):
  let questionType: QuestionType = "clarifying";
  let targetLadderLevel = targetClaim ? targetClaim.ladder_level : 1;

  const specificityAndEvidenceAvg =
    (ctx.analystOutput.scores.specificity + ctx.analystOutput.scores.evidence) / 2;

  if (ctx.analystOutput.contradictions && ctx.analystOutput.contradictions.length > 0) {
    questionType = "contradiction_callout";
  } else if (ctx.analystOutput.dodged) {
    questionType = "dodge_return";
  } else if (
    specificityAndEvidenceAvg < 4 &&
    targetClaim &&
    targetClaim.followups_used < cap
  ) {
    questionType = "vagueness_escalation";
    targetLadderLevel = Math.min(4, (targetClaim.ladder_level || 1) + 1);
  } else if (
    targetClaim &&
    /\d+/.test(targetClaim.claim_text) &&
    targetClaim.status === "unverified"
  ) {
    questionType = "number_challenge";
  } else if (
    targetClaim &&
    (targetClaim.category === "unit_economics" || targetClaim.category === "revenue_model")
  ) {
    questionType = "forced_calculation";
  } else if (targetLadderLevel >= 3 && avgScore >= 7) {
    questionType = "stress_test";
  } else if (
    targetClaim &&
    (targetClaim.category === "team" || targetClaim.category === "ask")
  ) {
    questionType = "why_you_why_now";
  } else {
    questionType = "clarifying";
    targetLadderLevel = 1;
  }

  return {
    speakerId: chosenSpeakerId,
    questionType,
    targetClaim,
    ladderLevel: targetLadderLevel,
    isInterrupt: false,
    isCrossTalk,
    crossTalkTargetInvestor,
  };
}
