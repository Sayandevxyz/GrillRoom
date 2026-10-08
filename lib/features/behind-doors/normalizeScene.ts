export interface BehindDoorsDialogueTurn {
  speaker: string;
  speaker_name: string;
  text: string;
  tone: "skeptical" | "bullish" | "intrigued" | "dismissive" | "analytical";
}

export interface BehindDoorsSceneData {
  scene_setting: string;
  dialogue: BehindDoorsDialogueTurn[];
  consensus: string;
  parting_quote: string;
}

export function normalizeBehindDoorsScene(raw: unknown): BehindDoorsSceneData {
  if (
    raw &&
    typeof raw === "object" &&
    "dialogue" in raw &&
    Array.isArray((raw as BehindDoorsSceneData).dialogue) &&
    (raw as BehindDoorsSceneData).dialogue.length > 0
  ) {
    const data = raw as BehindDoorsSceneData;
    return {
      scene_setting: data.scene_setting || "The partners unmute after the founder drops off.",
      dialogue: data.dialogue.map((d) => ({
        speaker: d.speaker || "rohan",
        speaker_name: d.speaker_name || "Rohan",
        text: d.text || "",
        tone: d.tone || "analytical",
      })),
      consensus: data.consensus || "Deliberation concluded.",
      parting_quote: data.parting_quote || "Every number counts.",
    };
  }

  return {
    scene_setting: "The founder disconnects from the call. Rohan unmutes immediately with his spreadsheet open.",
    dialogue: [
      {
        speaker: "rohan",
        speaker_name: "Rohan",
        text: "Let's be completely real about the economics. Did anyone else notice how they hedged on customer acquisition payback?",
        tone: "skeptical",
      },
      {
        speaker: "meera",
        speaker_name: "Meera",
        text: "The top-down market sizing made me cringe. But if they actually target the acute wedge they hinted at, the bottom-up volume works.",
        tone: "intrigued",
      },
      {
        speaker: "arjun",
        speaker_name: "Dr. Arjun",
        text: "I pressed them on technical defensibility. Right now it's vulnerable to an incumbent copying the workflow in one sprint unless they lock down data gravity.",
        tone: "analytical",
      },
      {
        speaker: "kavya",
        speaker_name: "Kavya",
        text: "User pain is real though. The founder spoke to actual buyer friction—they just failed to bring receipts and customer quotes to the table.",
        tone: "intrigued",
      },
      {
        speaker: "sam",
        speaker_name: "Sam",
        text: "They took the punches and didn't collapse under pressure. Fix the unit proof points and tighten the narrative, and this is a venture-grade company.",
        tone: "bullish",
      },
    ],
    consensus: "The panel sees undeniable founder drive but demands verified customer proof points before issuing a term sheet.",
    parting_quote: "Sharp minds don't save broken spreadsheets. Fix the proof points, then come back.",
  };
}
