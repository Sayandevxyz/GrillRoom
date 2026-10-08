import { z } from "zod";
import { createChatCompletion, DEFAULT_SMALL_MODEL } from "../llm/groq";
import { parseLlmJson } from "../llm/json";
import { buildAnalystPrompt, ClaimSnippet } from "../llm/prompts";

export const AnalystOutputSchema = z.object({
  scores: z.object({
    directness: z.number().int().min(0).max(10).default(5),
    specificity: z.number().int().min(0).max(10).default(5),
    evidence: z.number().int().min(0).max(10).default(5),
    logic: z.number().int().min(0).max(10).default(5),
    honesty: z.number().int().min(0).max(10).default(5),
  }),
  reason: z.string().default("Evaluation completed"),
  missing: z.array(z.string()).default([]),
  dodged: z.boolean().default(false),
  new_claims: z
    .array(
      z.object({
        text: z.string(),
        category: z.string().default("general"),
        severity: z.number().int().min(1).max(5).default(3),
      })
    )
    .default([]),
  status_changes: z
    .array(
      z.object({
        claim_id: z.union([z.number(), z.string()]),
        status: z.enum(["unverified", "evidenced", "contradicted", "conceded"]),
      })
    )
    .default([]),
  contradictions: z
    .array(
      z.object({
        claim_id: z.union([z.number(), z.string()]),
        conflicts_with_turn: z.number().default(0),
        explanation: z.string(),
      })
    )
    .default([]),
  conviction_deltas: z.record(z.string(), z.number()).default({}),
});

export type AnalystOutput = z.infer<typeof AnalystOutputSchema>;

export const DEFAULT_ANALYST_OUTPUT: AnalystOutput = {
  scores: {
    directness: 5,
    specificity: 5,
    evidence: 5,
    logic: 5,
    honesty: 5,
  },
  reason: "Standard evaluation applied (fallback safe mode)",
  missing: [],
  dodged: false,
  new_claims: [],
  status_changes: [],
  contradictions: [],
  conviction_deltas: {},
};

export async function evaluateAnswer(
  questionAsked: string,
  founderAnswer: string,
  currentLedger: ClaimSnippet[],
  panelIds: string[]
): Promise<AnalystOutput> {
  const { systemPrompt, userPrompt } = buildAnalystPrompt(
    questionAsked,
    founderAnswer,
    currentLedger,
    panelIds
  );

  try {
    const rawResponse = await createChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        model: DEFAULT_SMALL_MODEL,
        temperature: 0.2,
        reasoningEffort: "low",
        maxTokens: 1024,
      }
    );

    const parsedJson = parseLlmJson(rawResponse);
    if (!parsedJson) {
      console.warn("[Analyst Parse Warning] Failed to parse JSON from analyst response:", rawResponse);
      return DEFAULT_ANALYST_OUTPUT;
    }

    const validated = AnalystOutputSchema.safeParse(parsedJson);
    if (!validated.success) {
      console.warn("[Analyst Zod Warning] Analyst output schema validation failed:", validated.error);
      return DEFAULT_ANALYST_OUTPUT;
    }

    return validated.data;
  } catch (err) {
    console.warn("[Analyst Execution Warning] LLM call failed; using fallback analyst output:", err);
    return DEFAULT_ANALYST_OUTPUT;
  }
}
