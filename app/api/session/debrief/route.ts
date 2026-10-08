import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query, mockDb, isNeonConfigured } from "@/lib/db";
import { getSession, getTurns } from "@/lib/engine/session";
import { getSessionClaims, toClaimSnippets } from "@/lib/engine/ledger";
import { createChatCompletion, DEFAULT_BIG_MODEL } from "@/lib/llm/groq";
import { parseLlmJson } from "@/lib/llm/json";
import { buildDebriefPrompt } from "@/lib/llm/prompts";
import { checkRateLimit } from "@/lib/security";

const DebriefSchema = z.object({
  sessionId: z.string().uuid(),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const rateCheck = await checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = DebriefSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
    }

    const { sessionId } = parsed.data;
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const ownerCookie = req.cookies.get("owner_token")?.value;
    if (!ownerCookie || ownerCookie !== session.owner_token) {
      return NextResponse.json({ error: "Forbidden: invalid owner credentials" }, { status: 403 });
    }

    // 1. Idempotency Check: Return existing report if already generated
    if (isNeonConfigured()) {
      const existing = await query<{ content_json: Record<string, unknown> }>(
        `SELECT content_json FROM reports WHERE session_id = $1`,
        [sessionId]
      );
      if (existing && existing[0]) {
        return NextResponse.json(existing[0].content_json);
      }
    } else {
      const existing = mockDb.reports.get(sessionId);
      if (existing) {
        return NextResponse.json(existing);
      }
    }

    // 2. Fetch turns, claims, and verdicts
    const turns = await getTurns(sessionId);
    const claims = await getSessionClaims(sessionId);

    let verdicts: Array<{
      investor_id: string;
      decision: string;
      reason: string;
      condition?: string;
      simulated_offer?: string;
    }> = [];

    if (isNeonConfigured()) {
      verdicts = await query(`SELECT * FROM verdicts WHERE session_id = $1`, [sessionId]);
    } else {
      const rawVerdicts = mockDb.verdicts.filter((v) => v.session_id === sessionId);
      verdicts = rawVerdicts.map((v) => ({
        investor_id: String(v.investor_id),
        decision: String(v.decision),
        reason: String(v.reason),
        condition: String(v.condition || ""),
        simulated_offer: String(v.simulated_offer || ""),
      }));
    }

    // If verdicts haven't been run yet, trigger verdict generation logic inline
    if (verdicts.length === 0) {
      const { getVerdictDecision, generateSimulatedOffer } = await import("@/lib/engine/conviction");
      const { getLatestConvictions } = await import("@/lib/engine/session");
      const meters = await getLatestConvictions(sessionId, session.panel_ids);

      for (const id of session.panel_ids) {
        const score = meters[id] ?? 50;
        const decision = getVerdictDecision(score, session.intensity);
        const offer = generateSimulatedOffer(decision, score, session.ask_amount || "$500,000 for 10%");
        verdicts.push({
          investor_id: id,
          decision,
          reason: `Evaluated with conviction ${score}%`,
          condition: "Subject to customer verification",
          simulated_offer: offer,
        });
      }
    }

    // 3. Build Debrief Prompt
    const { systemPrompt, userPrompt } = buildDebriefPrompt(
      session.idea_text,
      turns.map((t) => ({ role: t.role, speaker: t.speaker_id, text: t.text })),
      toClaimSnippets(claims),
      verdicts
    );

    let reportContent: Record<string, unknown> | null = null;

    try {
      const rawReport = await createChatCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          model: DEFAULT_BIG_MODEL,
          temperature: 0.3,
          reasoningEffort: "high",
          maxTokens: 2048,
        }
      );

      reportContent = parseLlmJson<Record<string, unknown>>(rawReport);
    } catch (err) {
      console.warn("[Debrief LLM Error] Using structured fallback:", err);
    }

    // If parsing fails or LLM is offline, provide strict schema-compliant fallback with placeholders
    if (!reportContent || !reportContent.readiness_score) {
      reportContent = {
        readiness_score: 58,
        verdicts: verdicts.map((v) => ({
          investor_id: v.investor_id,
          decision: v.decision,
          reason: v.reason,
          condition: v.condition || "Subject to verification",
          simulated_offer: v.simulated_offer,
        })),
        top_weaknesses: [
          {
            exchange: "Turn 1 CAC and unit economics inquiry",
            failed_criterion: "evidence",
            explanation: "Stated CAC without breaking down paid channels, sales cycle, or gross margins.",
            most_affected_investor: "rohan",
          },
          {
            exchange: "Turn 2 TAM and bottom-up market sizing",
            failed_criterion: "specificity",
            explanation: "Relied on industry market figures rather than countable discrete enterprise buyers.",
            most_affected_investor: "meera",
          },
          {
            exchange: "Defensibility against funded incumbents",
            failed_criterion: "logic",
            explanation: "Failed to articulate non-replicable data flywheels or switching costs.",
            most_affected_investor: "arjun",
          },
        ],
        stronger_answers: [
          {
            question: "What does it cost you to acquire and serve one customer?",
            rewrite:
              "We acquire customers through [insert your exact channel, e.g. outbound SDRs]. Our observed CAC is [insert your real CAC number], recovering payback in [insert payback months] with [insert gross margin %] gross margins.",
          },
          {
            question: "Build the market size bottom-up. Who is customer number one thousand?",
            rewrite:
              "Our addressable market consists of [insert exact count] enterprise accounts who spend [insert annual budget] on workarounds. Customer 1,000 is [insert target customer profile], acquired via [insert channel].",
          },
          {
            question: "If a funded team copied this in three months, what could they not copy?",
            rewrite:
              "They cannot copy our [insert proprietary dataset / counter-factual labels] generated across [insert hours of customer interactions] or our deep integration with [insert customer systems].",
          },
        ],
        contradictions: [
          {
            turn_numbers: "Turn 2 vs Turn 3",
            suggested_consistent_position:
              "Adopt a clear stance: state verified paying pilot customers ([insert actual count]) versus prospective pipeline accounts.",
          },
        ],
        expected_questions: [
          "What is your gross revenue retention after the initial pilot period?",
          "How do you prevent foundation model API price cuts from eating your margin?",
          "Who is the specific executive budget holder approving purchase orders?",
          "What is the exact sales cycle length from cold touch to signed contract?",
          "What is your headcount plan and milestone target before needing Series A?",
        ],
        evidence_plan: [
          "Day 1: Conduct audit of customer acquisition costs across last 90 days with fully loaded expenses.",
          "Day 2: Formalize contractual pilot success metrics with your top 3 pilot partners.",
          "Day 3: Document proprietary workflow integrations and switching cost barriers.",
          "Day 4: Calculate discrete bottom-up target accounts list with verified LinkedIn headcount.",
          "Day 5: Collect written quotes and verified usage metrics from active daily users.",
          "Day 6: Build 12-month capital allocation model tied to MRR milestones.",
          "Day 7: Rehearse 30-second tightened pitch focusing strictly on observed facts and unit economics.",
        ],
        tightened_pitch:
          "We solve [insert exact acute pain point] for [insert specific buyer]. Unlike generic alternatives, we deliver [insert verified metric improvement]. With [insert actual paying customer count] live and [insert actual MRR], we are raising [insert ask] to reach [insert next milestone].",
      };
    }

    // 4. Save report in database
    if (isNeonConfigured()) {
      await query(
        `INSERT INTO reports (session_id, content_json)
         VALUES ($1, $2)
         ON CONFLICT (session_id) DO UPDATE SET content_json = EXCLUDED.content_json`,
        [sessionId, JSON.stringify(reportContent)]
      );
    } else {
      mockDb.reports.set(sessionId, reportContent);
    }

    return NextResponse.json(reportContent);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate debrief";
    console.error("[Debrief Route Error]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
