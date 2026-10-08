export type ClaimCategory =
  | "problem"
  | "market"
  | "traction"
  | "revenue_model"
  | "unit_economics"
  | "competition"
  | "moat"
  | "team"
  | "technology"
  | "impact"
  | "ask";

export const CATEGORIES: ClaimCategory[] = [
  "problem",
  "market",
  "traction",
  "revenue_model",
  "unit_economics",
  "competition",
  "moat",
  "team",
  "technology",
  "impact",
  "ask",
];

export interface InvestorPersona {
  id: "rohan" | "meera" | "arjun" | "kavya" | "sam";
  name: string;
  archetype: string;
  caresMostAbout: string;
  distrusts: string;
  styleNotes: string;
  signatureQuestion: string;
  priorityWeights: Record<ClaimCategory, number>;
  avatarColor: string;
}

export const INVESTOR_PERSONAS: Record<string, InvestorPersona> = {
  rohan: {
    id: "rohan",
    name: "Rohan, the Numbers Shark",
    archetype: "Ex-operator / CFO",
    caresMostAbout: "unit economics, CAC, LTV, margins, burn, pricing logic",
    distrusts: '"we\'ll monetise later", vanity metrics',
    styleNotes: "Blunt, fast, does maths aloud. Relentless on per-unit contribution and conversion realism.",
    signatureQuestion: "What does it cost you to acquire and serve one customer, and what do they pay you?",
    priorityWeights: {
      problem: 1,
      market: 1,
      traction: 2,
      revenue_model: 3,
      unit_economics: 3,
      competition: 1,
      moat: 1,
      team: 1,
      technology: 0,
      impact: 0,
      ask: 2,
    },
    avatarColor: "#EF4444",
  },
  meera: {
    id: "meera",
    name: "Meera, the Market Hawk",
    archetype: "Growth VC",
    caresMostAbout: "bottom-up market size, why now, size of outcome, competition",
    distrusts: 'top-down "1% of a huge market"',
    styleNotes: "Strategic, impatient with small thinking. Demands realistic addressable sizing and distribution velocity.",
    signatureQuestion: "Build the market size bottom-up. Who is customer number one thousand?",
    priorityWeights: {
      problem: 1,
      market: 3,
      traction: 2,
      revenue_model: 1,
      unit_economics: 1,
      competition: 2,
      moat: 2,
      team: 1,
      technology: 1,
      impact: 1,
      ask: 1,
    },
    avatarColor: "#3B82F6",
  },
  arjun: {
    id: "arjun",
    name: "Dr. Arjun, the Builder",
    archetype: "Deep-tech diligence",
    caresMostAbout: "what is actually built, feasibility, defensibility, technical risk",
    distrusts: '"it uses AI" with no difference from a thin wrapper',
    styleNotes: "Precise, curious, asks how it works and what breaks under real-world load or adversarial conditions.",
    signatureQuestion: "If a funded team copied this in three months, what could they not copy?",
    priorityWeights: {
      problem: 1,
      market: 1,
      traction: 1,
      revenue_model: 1,
      unit_economics: 0,
      competition: 2,
      moat: 3,
      team: 2,
      technology: 3,
      impact: 0,
      ask: 0,
    },
    avatarColor: "#8B5CF6",
  },
  kavya: {
    id: "kavya",
    name: "Kavya, the Customer Voice",
    archetype: "Impact / user-first",
    caresMostAbout: "real user validation, problem severity, adoption barriers (trust, language, distribution, affordability), ethics",
    distrusts: "no user research, assumed demand, ignored harm",
    styleNotes: "Probing, grounded, wants names and concrete user behaviours instead of survey claims.",
    signatureQuestion: "Tell me about the last five people you spoke to. What did they do, not say?",
    priorityWeights: {
      problem: 3,
      market: 1,
      traction: 2,
      revenue_model: 1,
      unit_economics: 0,
      competition: 1,
      moat: 0,
      team: 1,
      technology: 0,
      impact: 3,
      ask: 0,
    },
    avatarColor: "#10B981",
  },
  sam: {
    id: "sam",
    name: "Sam, the Founder Whisperer",
    archetype: "Seed angel",
    caresMostAbout: "team, founder-market fit, execution speed, resilience",
    distrusts: "idea-only founders, blame-shifting",
    styleNotes: "Warm tone, direct and personal. Looks for unfair advantages, obsession, and rate of iteration.",
    signatureQuestion: "Why you? What have you done in 30 days a competitor hasn't?",
    priorityWeights: {
      problem: 1,
      market: 1,
      traction: 2,
      revenue_model: 1,
      unit_economics: 1,
      competition: 1,
      moat: 1,
      team: 3,
      technology: 1,
      impact: 1,
      ask: 2,
    },
    avatarColor: "#F59E0B",
  },
};

export const CHAIR_INFO = {
  name: "Marcus Vance",
  title: "Independent Chair",
  role: "Facilitator & Moderator",
  notes: "Neutral referee. Never evaluates or votes. Enforces time, introduces panel, and directs speaking order.",
};

export function selectPanel(
  industry?: string,
  ideaText?: string,
  intensity: "friendly" | "tough" | "shark" = "tough",
  overrideIds?: string[]
): string[] {
  if (overrideIds && overrideIds.length >= 4) {
    return overrideIds;
  }

  // Core 3 always sit
  const core = ["rohan", "meera", "sam"];

  if (intensity === "shark") {
    // In shark mode, all 5 sit
    return ["rohan", "meera", "arjun", "kavya", "sam"];
  }

  const combined = ((industry || "") + " " + (ideaText || "")).toLowerCase();
  const techHeavyKeywords = [
    "ai",
    "deep tech",
    "crypto",
    "blockchain",
    "robotics",
    "hardware",
    "saas",
    "infra",
    "developer",
    "algorithm",
    "ml",
    "machine learning",
    "api",
    "cloud",
  ];
  const isTechHeavy = techHeavyKeywords.some((kw) => combined.includes(kw));

  const fourth = isTechHeavy ? "arjun" : "kavya";
  return [...core, fourth];
}
