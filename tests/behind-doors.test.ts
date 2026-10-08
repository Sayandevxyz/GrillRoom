import { describe, it, expect } from "vitest";
import { normalizeBehindDoorsScene } from "@/lib/features/behind-doors/normalizeScene";

describe("normalizeBehindDoorsScene", () => {
  it("normalizes a valid raw LLM scene data correctly", () => {
    const raw = {
      scene_setting: "Partners lean in as call ends.",
      dialogue: [
        {
          speaker: "rohan",
          speaker_name: "Rohan",
          text: "Unit margins are underwater.",
          tone: "skeptical",
        },
        {
          speaker: "sam",
          speaker_name: "Sam",
          text: "Founder showed grit under cross-examination.",
          tone: "bullish",
        },
      ],
      consensus: "Require margin audit before drafting offer.",
      parting_quote: "Proof beats promises.",
    };

    const normalized = normalizeBehindDoorsScene(raw);
    expect(normalized.scene_setting).toBe("Partners lean in as call ends.");
    expect(normalized.dialogue).toHaveLength(2);
    expect(normalized.dialogue[0].speaker).toBe("rohan");
    expect(normalized.dialogue[1].tone).toBe("bullish");
    expect(normalized.consensus).toContain("margin audit");
    expect(normalized.parting_quote).toBe("Proof beats promises.");
  });

  it("applies robust fallback defaults when LLM output is null, malformed, or empty", () => {
    const nullFallback = normalizeBehindDoorsScene(null);
    expect(nullFallback.dialogue.length).toBeGreaterThanOrEqual(5);
    expect(nullFallback.scene_setting).toContain("Rohan");
    expect(nullFallback.consensus).toBeTruthy();
    expect(nullFallback.parting_quote).toBeTruthy();

    const emptyDialogueFallback = normalizeBehindDoorsScene({ dialogue: [] });
    expect(emptyDialogueFallback.dialogue.length).toBeGreaterThanOrEqual(5);
  });

  it("sanitizes missing fields in partial dialogue items", () => {
    const partial = {
      scene_setting: "Room chatter.",
      dialogue: [
        {
          speaker: "",
          text: "Interesting model.",
        },
      ],
    };

    const normalized = normalizeBehindDoorsScene(partial);
    expect(normalized.dialogue[0].speaker).toBe("rohan");
    expect(normalized.dialogue[0].speaker_name).toBe("Rohan");
    expect(normalized.dialogue[0].tone).toBe("analytical");
    expect(normalized.dialogue[0].text).toBe("Interesting model.");
  });
});
