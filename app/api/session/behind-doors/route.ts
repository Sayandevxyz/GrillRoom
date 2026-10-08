import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query, mockDb, isNeonConfigured } from "@/lib/db";
import { getSession, getTurns } from "@/lib/engine/session";
import { getSessionClaims, toClaimSnippets } from "@/lib/engine/ledger";
import { createChatCompletion, DEFAULT_BIG_MODEL } from "@/lib/llm/groq";
import { parseLlmJson } from "@/lib/llm/json";
import { checkRateLimit, logServerError } from "@/lib/security";
import { FEATURE_BEHIND_DOORS } from "@/lib/features/flags";

const BehindDoorsSchema = z.object({
  sessionId: z.string().uuid(),
});

export const maxDuration = 60;

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

export async function POST(req: NextRequest) {
  try {
    if (!FEATURE_BEHIND_DOORS) {
      return NextResponse.json({ error: "Behind Closed Doors feature disabled" }, { status: 404 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const rateCheck = await checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = BehindDoorsSchema.safeParse(body);
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

    // 1. Return cached scene if already generated
    if (isNeonConfigured()) {
      const existing = await query<{ content_json: BehindDoorsSceneData }>(
        `SELECT content_json FROM behind_doors_scenes WHERE session_id = $1 LIMIT 1`,
        [sessionId]
      );
      if (existing && existing[0]) {
        return NextResponse.json(existing[0].content_json);
      }
    } else {
      const existing = mockDb.behind_doors.get(sessionId) as BehindDoorsSceneData | undefined;
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
      simulated_offer?: string;
    }> = [];

    if (isNeonConfigured()) {
      verdicts = await query(`SELECT investor_id, decision, reason, simulated_offer FROM verdicts WHERE session_id = $1`, [sessionId]);
    } else {
      const rawVerdicts = mockDb.verdicts.filter((v) => v.session_id === sessionId);
      verdicts = rawVerdicts.map((v) => ({
        investor_id: String(v.investor_id),
        decision: String(v.decision),
        reason: String(v.reason),
        simulated_offer: String(v.simulated_offer || ""),
      }));
    }

    const founderQuotes = turns
      .filter((t) => t.role === "founder")
      .map((t, idx) => `[Round ${idx + 1} Founder Quote]: "${t.text.slice(0, 160)}..."`)
      .join("\n");

    const claimSummary = toClaimSnippets(claims)
      .map((c) => `- Claim: "${c.claim_text}" | Status: ${c.status}`)
      .join("\n");

    const verdictSummary = verdicts
      .map((v) => `- ${v.investor_id}: Decision=${v.decision}, Offer=${v.simulated_offer || "None"}`)
      .join("\n");

    const systemPrompt = `You are an elite screenwriter and venture capital insider.
Write the immediate "Behind Closed Doors" deliberation between 5 venture partners right after a startup founder disconnects from their pitch.

PARTNERS:
1. Rohan (Numbers Shark) - CFO archetype, focused on unit economics, CAC, LTV, pricing realism.
2. Meera (Market Hawk) - Growth VC, demands bottom-up market sizing, distribution velocity, TAM defensibility.
3. Dr. Arjun (The Builder) - Deep-tech diligence, inspects what is actually built, technical moat, API dependencies.
4. Kavya (The Customer Voice) - Impact and user-first, seeks real customer proof, pain severity, user behavior.
5. Sam (The Founder Whisperer) - Seed angel, assesses founder grit, execution speed, rate of iteration, founder-market fit.

TONE & STYLE:
- Brutally candid, authentic partner meeting room chatter. They talk directly to each other, not to the founder.
- Directly reference specific numbers, assertions, or hesitations the founder showed during the session.
- Disagree with each other: e.g. Rohan attacks margins while Sam defends founder grit; Arjun questions technical depth while Kavya demands user quotes.

RETURN STRICT JSON ONLY:
{
  "scene_setting": "Brief 1-sentence stage direction of the partners unmuting after the founder drops off.",
  "dialogue": [
    {
      "speaker": "rohan" | "meera" | "arjun" | "kavya" | "sam",
      "speaker_name": "Rohan" | "Meera" | "Dr. Arjun" | "Kavya" | "Sam",
      "text": "1-3 sentences of raw partner banter referencing session facts",
      "tone": "skeptical" | "bullish" | "intrigued" | "dismissive" | "analytical"
    }
  ],
  "consensus": "Summary of the room's final private takeaway",
  "parting_quote": "A sharp, memorable one-liner from one partner summarizing the pitch"
}`;

    const userPrompt = `STARTUP PITCH:
${session.idea_text}

FOUNDER REPLIES DURING GRILLING:
${founderQuotes || "The founder gave brief answers without verified unit metrics."}

DUE DILIGENCE CLAIM LEDGER:
${claimSummary || "No claims recorded"}

PANEL DECISIONS:
${verdictSummary || "Deliberation underway"}

Write a 6 to 8 turn confidential partner deliberation dialogue now. Return strict JSON.`;

    let sceneContent: BehindDoorsSceneData | null = null;

    try {
      const rawLlm = await createChatCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          model: DEFAULT_BIG_MODEL,
          temperature: 0.4,
          reasoningEffort: "medium",
          maxTokens: 2048,
        }
      );

      sceneContent = parseLlmJson<BehindDoorsSceneData>(rawLlm);
    } catch (err) {
      console.warn("[Behind Closed Doors LLM Error] Using structured fallback:", err);
    }

    // Schema validation and robust fallback
    if (
      !sceneContent ||
      !sceneContent.dialogue ||
      !Array.isArray(sceneContent.dialogue) ||
      sceneContent.dialogue.length === 0
    ) {
      sceneContent = {
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

    // 3. Cache scene in database
    if (isNeonConfigured()) {
      await query(
        `INSERT INTO behind_doors_scenes (session_id, content_json)
         VALUES ($1, $2)
         ON CONFLICT (session_id) DO UPDATE SET content_json = EXCLUDED.content_json`,
        [sessionId, JSON.stringify(sceneContent)]
      );
    } else {
      mockDb.behind_doors.set(sessionId, sceneContent as unknown as Record<string, unknown>);
    }

    return NextResponse.json(sceneContent);
  } catch (err: unknown) {
    const errorId = logServerError(err, "Behind Closed Doors Error");
    return NextResponse.json(
      { error: "Failed to generate deliberation scene. Please try again.", errorId },
      { status: 500 }
    );
  }
}
