import { describe, it, expect } from "vitest";
import { BehindDoorsSceneData } from "@/app/api/session/behind-doors/route";

describe("Behind Closed Doors Scene Data", () => {
  it("structures partner dialogue with valid speakers and tones", () => {
    const sampleScene: BehindDoorsSceneData = {
      scene_setting: "The founder drops off. Partners unmute.",
      dialogue: [
        {
          speaker: "rohan",
          speaker_name: "Rohan",
          text: "The payback unit math was completely missing.",
          tone: "skeptical",
        },
        {
          speaker: "sam",
          speaker_name: "Sam",
          text: "Founder showed great poise under pressure though.",
          tone: "bullish",
        },
      ],
      consensus: "Require customer unit evidence before term sheet.",
      parting_quote: "Sharp minds don't save broken spreadsheets.",
    };

    expect(sampleScene.dialogue.length).toBe(2);
    expect(sampleScene.dialogue[0].speaker).toBe("rohan");
    expect(sampleScene.dialogue[1].tone).toBe("bullish");
    expect(sampleScene.consensus).toContain("unit evidence");
  });
});
