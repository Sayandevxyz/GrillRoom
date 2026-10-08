export type InvestorMood =
  | "furious"
  | "skeptical"
  | "neutral"
  | "interested"
  | "impressed";

export interface ReactionOutput {
  mood: InvestorMood;
  emoji: string;
  label: string;
}

/**
 * Maps conviction delta to an executive reaction mood:
 * - delta <= -8: "furious" 😠
 * - -7 <= delta <= -3: "skeptical" 🤨
 * - -2 <= delta <= +2: "neutral" 😐
 * - +3 <= delta <= +7: "interested" 🙂
 * - delta >= +8: "impressed" 😮
 */
export function getReaction(delta: number | undefined | null): ReactionOutput | null {
  if (delta === undefined || delta === null || typeof delta !== "number" || isNaN(delta)) {
    return null;
  }

  if (delta <= -8) {
    return { mood: "furious", emoji: "😠", label: "Furious" };
  }
  if (delta <= -3) {
    return { mood: "skeptical", emoji: "🤨", label: "Skeptical" };
  }
  if (delta <= 2) {
    return { mood: "neutral", emoji: "😐", label: "Neutral" };
  }
  if (delta <= 7) {
    return { mood: "interested", emoji: "🙂", label: "Interested" };
  }
  return { mood: "impressed", emoji: "😮", label: "Impressed" };
}
