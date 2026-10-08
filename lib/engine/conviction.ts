import {
  MIN_CONVICTION,
  MAX_CONVICTION,
  VERDICT_CONVICTION_THRESHOLD_IN,
  VERDICT_CONVICTION_THRESHOLD_CONDITIONAL,
} from "../constants";

export type IntensityMode = "friendly" | "tough" | "shark";
export type VerdictDecision = "In" | "Conditional" | "Out";

export interface ConvictionRecord {
  investorId: string;
  turnNo: number;
  score: number;
  delta: number;
  reason: string;
}

export interface AnswerScores {
  directness: number;
  specificity: number;
  evidence: number;
  logic: number;
  honesty: number;
}

export function computeAverageScore(scores: AnswerScores): number {
  const sum =
    scores.directness +
    scores.specificity +
    scores.evidence +
    scores.logic +
    scores.honesty;
  return sum / 5;
}

/**
 * Updates conviction scores based on analyst deltas and sanity-checks against average scores.
 */
export function calculateConvictionDelta(
  rawDelta: number,
  avgScore: number
): number {
  // Clamp delta to ±15
  let clamped = Math.max(-15, Math.min(15, Math.round(rawDelta)));

  // Sanity check against scores:
  // If avgScore >= 7: delta may not be negative
  if (avgScore >= 7 && clamped < 0) {
    clamped = 0;
  }
  // If avgScore <= 3: delta may not be positive
  if (avgScore <= 3 && clamped > 0) {
    clamped = 0;
  }

  return clamped;
}

/**
 * Clamps running conviction score strictly to 0..100
 * @param currentScore Current investor conviction (0-100)
 * @param delta Net delta to apply
 * @returns Clamped score within [MIN_CONVICTION, MAX_CONVICTION]
 */
export function clampConvictionScore(currentScore: number, delta: number): number {
  return Math.max(MIN_CONVICTION, Math.min(MAX_CONVICTION, currentScore + delta));
}

/**
 * Pure code verdict threshold evaluator.
 * Decisions are strictly computed deterministically in code, never by the LLM.
 *
 * @param finalScore Final investor conviction score (0-100)
 * @param intensity Mode intensity ("friendly" | "tough" | "shark")
 * @returns VerdictDecision ("In" | "Conditional" | "Out")
 */
export function getVerdictDecision(
  finalScore: number,
  intensity: IntensityMode = "tough"
): VerdictDecision {
  if (intensity === "friendly") {
    if (finalScore >= 60) return "In";
    if (finalScore >= 35) return "Conditional";
    return "Out";
  }

  if (intensity === "shark") {
    if (finalScore >= 72) return "In";
    if (finalScore >= 45) return "Conditional";
    return "Out";
  }

  // Default "tough"
  if (finalScore >= VERDICT_CONVICTION_THRESHOLD_IN) return "In";
  if (finalScore >= VERDICT_CONVICTION_THRESHOLD_CONDITIONAL) return "Conditional";
  return "Out";
}

/**
 * Computes simulated offer based on stated ask and final conviction
 */
export function generateSimulatedOffer(
  decision: VerdictDecision,
  convictionScore: number,
  statedAsk: string
): string {
  if (decision === "Out") {
    return "No offer (Passed)";
  }

  // Parse ask amount if possible
  const askClean = statedAsk ? statedAsk.trim() : "$500,000 for 10%";
  const match = askClean.match(/(\$?[\d,.]+[kKmMbB]?)/);
  const capital = match ? match[1] : "$500,000";

  if (decision === "In") {
    const equityPct = convictionScore >= 85 ? "7%" : "10%";
    return `${capital} for ${equityPct} equity (Simulated)`;
  }

  // Conditional
  const higherEquity = convictionScore >= 50 ? "15%" : "20%";
  return `${capital} for ${higherEquity} equity, subject to customer reference audit (Simulated)`;
}
