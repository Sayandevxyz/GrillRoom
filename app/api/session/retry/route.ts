import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { query, mockDb, isNeonConfigured } from "@/lib/db";
import { getSession, recordTurn, recordConviction } from "@/lib/engine/session";
import { addClaim } from "@/lib/engine/ledger";
import { INVESTOR_PERSONAS } from "@/lib/engine/personas";
import { checkRateLimit, logServerError } from "@/lib/security";
import { evaluateAnswer } from "@/lib/engine/analyst";

const RetrySchema = z.object({
  sessionId: z.string().uuid(),
  revisedPitch: z.string().min(50).max(6000),
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
    const parsed = RetrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { sessionId, revisedPitch } = parsed.data;
    const parentSession = await getSession(sessionId);
    if (!parentSession) {
      return NextResponse.json({ error: "Parent session not found" }, { status: 404 });
    }

    const ownerCookie = req.cookies.get("owner_token")?.value;
    if (!ownerCookie || ownerCookie !== parentSession.owner_token) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newSessionId = crypto.randomUUID();

    // 1. Create linked child session
    if (isNeonConfigured()) {
      await query(
        `INSERT INTO sessions (id, owner_token, idea_text, industry, stage, ask_amount, intensity, panel_ids, status, turn_count, parent_session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', 0, $9)`,
        [
          newSessionId,
          ownerCookie,
          revisedPitch,
          parentSession.industry,
          parentSession.stage,
          parentSession.ask_amount,
          parentSession.intensity,
          parentSession.panel_ids,
          sessionId,
        ]
      );
    } else {
      mockDb.sessions.set(newSessionId, {
        id: newSessionId,
        owner_token: ownerCookie,
        created_at: new Date().toISOString(),
        idea_text: revisedPitch,
        industry: parentSession.industry,
        stage: parentSession.stage,
        ask_amount: parentSession.ask_amount,
        intensity: parentSession.intensity,
        panel_ids: parentSession.panel_ids,
        status: "active",
        turn_count: 0,
        parent_session_id: sessionId,
      });
    }

    // 2. Initialize convictions at 50
    for (const pId of parentSession.panel_ids) {
      await recordConviction(newSessionId, pId, 0, 50, 0, "Retry session initialized");
    }

    // 3. Extract baseline claims from revised pitch
    try {
      const initialAnalysis = await evaluateAnswer(
        "Revised pitch deck submission",
        revisedPitch,
        [],
        parentSession.panel_ids
      );
      if (initialAnalysis.new_claims.length > 0) {
        for (const claim of initialAnalysis.new_claims) {
          await addClaim(newSessionId, claim.text, claim.category, claim.severity, 0);
        }
      } else {
        await addClaim(newSessionId, "Revised pitch core premise", "problem", 3, 0);
      }
    } catch {
      await addClaim(newSessionId, "Revised pitch core premise", "problem", 3, 0);
    }

    // 4. Record Chair intro and opening question
    const chairText = `Welcome back to the GrillRoom. You have revised your pitch and tightened your numbers. The panel is ready to test your revisions. Let us begin round one.`;
    await recordTurn(newSessionId, 0, "opening", "chair", "chair", chairText);

    const firstInvId = parentSession.panel_ids[0];
    const firstInv = INVESTOR_PERSONAS[firstInvId];
    await recordTurn(
      newSessionId,
      0,
      "opening",
      "investor",
      firstInvId,
      firstInv.signatureQuestion,
      "opening_signature"
    );

    return NextResponse.json({
      newSessionId,
      parentSessionId: sessionId,
      status: "active",
    });
  } catch (err: unknown) {
    const errorId = logServerError(err, "Retry Route Error");
    return NextResponse.json({ error: "Failed to create retry session. Please try again.", errorId }, { status: 500 });
  }
}
