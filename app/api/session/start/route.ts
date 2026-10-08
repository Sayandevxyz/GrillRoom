import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { query, mockDb, isNeonConfigured } from "@/lib/db";
import { selectPanel, INVESTOR_PERSONAS, CHAIR_INFO } from "@/lib/engine/personas";
import { addClaim, getSessionClaims } from "@/lib/engine/ledger";
import { recordTurn, recordConviction } from "@/lib/engine/session";
import { checkRateLimit, logServerError } from "@/lib/security";
import { evaluateAnswer } from "@/lib/engine/analyst";

const StartSessionSchema = z.object({
  idea: z.string().min(50, "Idea must be at least 50 characters").max(6000),
  industry: z.string().optional().default("Technology"),
  stage: z.string().optional().default("Seed"),
  ask: z.string().optional().default("$500,000 for 10%"),
  intensity: z.enum(["friendly", "tough", "shark"]).default("tough"),
  panelOverride: z.array(z.string()).optional(),
  pdfText: z.string().optional(),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const rateCheck = await checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = StartSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { idea, industry, stage, ask, intensity, panelOverride, pdfText } = parsed.data;
    const combinedIdea = pdfText ? `${idea}\n\n[Extracted Deck Context]:\n${pdfText}`.slice(0, 6000) : idea;

    const panelIds = selectPanel(industry, combinedIdea, intensity, panelOverride);
    const ownerToken = crypto.randomBytes(32).toString("hex");
    const sessionId = crypto.randomUUID();

    // 1. Create Session
    if (isNeonConfigured()) {
      await query(
        `INSERT INTO sessions (id, owner_token, idea_text, industry, stage, ask_amount, intensity, panel_ids, status, turn_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', 0)`,
        [sessionId, ownerToken, combinedIdea, industry, stage, ask, intensity, panelIds]
      );
    } else {
      mockDb.sessions.set(sessionId, {
        id: sessionId,
        owner_token: ownerToken,
        created_at: new Date().toISOString(),
        idea_text: combinedIdea,
        industry,
        stage,
        ask_amount: ask,
        intensity,
        panel_ids: panelIds,
        status: "active",
        turn_count: 0,
      });
    }

    // 2. Initialize initial conviction at 50 for each panelist
    for (const pId of panelIds) {
      await recordConviction(sessionId, pId, 0, 50, 0, "Session initialized");
    }

    // 3. Extract baseline claims from pitch text via analyst
    try {
      const initialAnalysis = await evaluateAnswer(
        "Initial pitch deck submission",
        combinedIdea,
        [],
        panelIds
      );
      if (initialAnalysis.new_claims.length > 0) {
        for (const claim of initialAnalysis.new_claims) {
          await addClaim(sessionId, claim.text, claim.category, claim.severity, 0);
        }
      } else {
        // Fallback default claim if none extracted
        await addClaim(sessionId, "The startup solves an urgent market problem", "problem", 3, 0);
        await addClaim(sessionId, `The team seeks ${ask} in funding`, "ask", 3, 0);
      }
    } catch (err) {
      console.warn("[Pitch Claim Extraction Warning]", err);
      await addClaim(sessionId, "Core pitch premise", "problem", 3, 0);
    }

    // 4. Record Chair Introduction Turn
    const chairIntroText = `Welcome to the GrillRoom. I am Marcus Vance, Independent Chair. Before you sit five experienced investors. Every statement you make will be recorded in our Claim Ledger. When numbers are tested, answer directly. Founder, the floor is yours.`;
    await recordTurn(sessionId, 0, "opening", "chair", "chair", chairIntroText);

    // 5. First Investor Opening Question (from their signature question anchored in pitch)
    const firstInvestorId = panelIds[0];
    const firstInvestor = INVESTOR_PERSONAS[firstInvestorId];
    const firstQuestionText = firstInvestor.signatureQuestion;

    await recordTurn(
      sessionId,
      0,
      "opening",
      "investor",
      firstInvestorId,
      firstQuestionText,
      "opening_signature"
    );

    const initialClaims = await getSessionClaims(sessionId);

    // 6. Build response and set owner_token httpOnly cookie
    const response = NextResponse.json({
      sessionId,
      panel: panelIds.map((id) => INVESTOR_PERSONAS[id]),
      chair: CHAIR_INFO,
      intensity,
      initialTurns: [
        {
          role: "chair",
          speakerId: "chair",
          speakerName: CHAIR_INFO.name,
          text: chairIntroText,
          round: "opening",
        },
        {
          role: "investor",
          speakerId: firstInvestorId,
          speakerName: firstInvestor.name,
          text: firstQuestionText,
          round: "opening",
          questionType: "opening_signature",
        },
      ],
      initialClaims,
      initialMeters: Object.fromEntries(panelIds.map((id) => [id, 50])),
    });

    response.cookies.set("owner_token", ownerToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: unknown) {
    const errorId = logServerError(err, "Session Start Error");
    return NextResponse.json(
      { error: "Failed to initialize investment panel session. Please try again.", errorId },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const { getSession, getTurns, getLatestConvictions } = await import("@/lib/engine/session");
    const { getSessionClaims } = await import("@/lib/engine/ledger");

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const turns = await getTurns(sessionId);
    const claims = await getSessionClaims(sessionId);
    const meters = await getLatestConvictions(sessionId, session.panel_ids);

    return NextResponse.json({
      session,
      turns,
      claims,
      meters,
    });
  } catch (err: unknown) {
    const errorId = logServerError(err, "Session GET Error");
    return NextResponse.json({ error: "Failed to retrieve session data.", errorId }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const { getSession } = await import("@/lib/engine/session");
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const ownerCookie = req.cookies.get("owner_token")?.value;
    if (!ownerCookie || ownerCookie !== session.owner_token) {
      return NextResponse.json({ error: "Forbidden: invalid owner credentials" }, { status: 403 });
    }

    if (isNeonConfigured()) {
      await query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
    } else {
      mockDb.sessions.delete(sessionId);
    }

    return NextResponse.json({ deleted: true, sessionId });
  } catch (err: unknown) {
    const errorId = logServerError(err, "Session DELETE Error");
    return NextResponse.json({ error: "Failed to delete session.", errorId }, { status: 500 });
  }
}

