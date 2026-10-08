import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query, mockDb, isNeonConfigured } from "@/lib/db";
import { getSession, getLatestConvictions } from "@/lib/engine/session";
import { getSessionClaims } from "@/lib/engine/ledger";
import { getVerdictDecision, generateSimulatedOffer } from "@/lib/engine/conviction";
import { INVESTOR_PERSONAS } from "@/lib/engine/personas";
import { checkRateLimit, logServerError } from "@/lib/security";

const VerdictSchema = z.object({
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
    const parsed = VerdictSchema.safeParse(body);
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
      return NextResponse.json({ error: "Forbidden: invalid owner token" }, { status: 403 });
    }

    // 1. Fetch latest convictions and claims
    const meters = await getLatestConvictions(sessionId, session.panel_ids);
    const claims = await getSessionClaims(sessionId);
    const unresolvedClaims = claims.filter(
      (c) => c.status === "unverified" || c.status === "contradicted" || c.thread_state === "closed_unresolved"
    );

    // 2. Generate verdicts in code
    const verdictsList: Array<Record<string, unknown>> = [];

    for (const invId of session.panel_ids) {
      const persona = INVESTOR_PERSONAS[invId];
      const score = meters[invId] ?? 50;
      const decision = getVerdictDecision(score, session.intensity);
      const simulatedOffer = generateSimulatedOffer(decision, score, session.ask_amount || "$500,000 for 10%");

      // Find relevant unresolved claim for this persona's weighted categories
      const weights = persona.priorityWeights as Record<string, number>;
      const topIssue = unresolvedClaims.find((c) => (weights[c.category] ?? 0) >= 2) || unresolvedClaims[0];

      let reason = "";
      let condition = "";

      if (decision === "In") {
        reason = `Conviction reached ${score}%. Demonstrated solid domain grip and clear problem validation.`;
        condition = "Subject to formal technical architecture diligence and customer reference calls.";
      } else if (decision === "Conditional") {
        reason = topIssue
          ? `Conviction at ${score}%. Still skeptical on claim #${topIssue.id}: "${topIssue.claim_text}".`
          : `Conviction at ${score}%. Need concrete evidence on go-to-market payback.`;
        condition = "Willing to invest if 3 referenceable paying customers are verified with sub-12mo CAC payback.";
      } else {
        reason = topIssue
          ? `Conviction passed at ${score}%. Failed to resolve fatal uncertainty on "${topIssue.claim_text}".`
          : `Conviction passed at ${score}%. Insufficient evidence of defensibility or unit economics.`;
        condition = "Would reconsider only after complete product-market fit reboot with observed customer retention.";
      }

      // Save verdict in DB
      if (isNeonConfigured()) {
        await query(
          `INSERT INTO verdicts (session_id, investor_id, decision, reason, condition, simulated_offer)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [sessionId, invId, decision, reason, condition, simulatedOffer]
        );
      } else {
        mockDb.verdicts.push({
          id: mockDb.verdicts.length + 1,
          session_id: sessionId,
          investor_id: invId,
          decision,
          reason,
          condition,
          simulated_offer: simulatedOffer,
        });
      }

      verdictsList.push({
        investor_id: invId,
        investor_name: persona.name,
        archetype: persona.archetype,
        avatarColor: persona.avatarColor,
        score,
        decision,
        reason,
        condition,
        simulated_offer: simulatedOffer,
      });
    }

    // 3. Update session status to verdict
    if (isNeonConfigured()) {
      await query(`UPDATE sessions SET status = 'verdict' WHERE id = $1`, [sessionId]);
    } else {
      session.status = "verdict";
    }

    return NextResponse.json({
      sessionId,
      status: "verdict",
      verdicts: verdictsList,
    });
  } catch (err: unknown) {
    const errorId = logServerError(err, "Verdict Route Error");
    return NextResponse.json({ error: "Failed to generate verdicts. Please try again.", errorId }, { status: 500 });
  }
}
