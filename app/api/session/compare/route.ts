import { NextRequest, NextResponse } from "next/server";
import { query, mockDb, isNeonConfigured } from "@/lib/db";
import { getSession, getLatestConvictions } from "@/lib/engine/session";
import { getSessionClaims } from "@/lib/engine/ledger";
import { checkRateLimit, logServerError } from "@/lib/security";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const rateCheck = await checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter" }, { status: 400 });
    }

    const currentSession = await getSession(sessionId);
    if (!currentSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Determine parent and retry IDs
    const originalId = currentSession.parent_session_id || sessionId;
    let retryId = currentSession.parent_session_id ? sessionId : null;

    // If this session is the parent, find its child retry session if one exists
    if (!currentSession.parent_session_id) {
      if (isNeonConfigured()) {
        const rows = await query<{ id: string }>(
          `SELECT id FROM sessions WHERE parent_session_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [sessionId]
        );
        if (rows && rows[0]) retryId = rows[0].id;
      } else {
        for (const [id, s] of mockDb.sessions.entries()) {
          if (s.parent_session_id === sessionId) {
            retryId = id;
            break;
          }
        }
      }
    }

    const originalSession = await getSession(originalId);

    if (!originalSession) {
      return NextResponse.json({ error: "Original session not found" }, { status: 404 });
    }

    // 1. Per-investor convictions
    const originalMeters = await getLatestConvictions(originalId, originalSession.panel_ids);
    const retryMeters = retryId ? await getLatestConvictions(retryId, originalSession.panel_ids) : null;

    // 2. Unresolved thread counts
    const origClaims = await getSessionClaims(originalId);
    const origUnresolved = origClaims.filter(
      (c) => c.status === "unverified" || c.status === "contradicted" || c.thread_state === "closed_unresolved"
    ).length;

    const retryClaims = retryId ? await getSessionClaims(retryId) : [];
    const retryUnresolved = retryClaims.filter(
      (c) => c.status === "unverified" || c.status === "contradicted" || c.thread_state === "closed_unresolved"
    ).length;

    // 3. Average criteria scores from evaluations table
    const origScores = await getSessionCriteriaAverages(originalId);
    const retryScores = retryId ? await getSessionCriteriaAverages(retryId) : null;

    // 4. Overall delta calculation
    let overallConvictionDelta = 0;
    if (retryMeters) {
      const origAvg =
        Object.values(originalMeters).reduce((a, b) => a + b, 0) / (Object.values(originalMeters).length || 1);
      const retryAvg =
        Object.values(retryMeters).reduce((a, b) => a + b, 0) / (Object.values(retryMeters).length || 1);
      overallConvictionDelta = Math.round(retryAvg - origAvg);
    }

    return NextResponse.json({
      originalSessionId: originalId,
      retrySessionId: retryId,
      panelIds: originalSession.panel_ids,
      convictions: {
        original: originalMeters,
        retry: retryMeters || originalMeters,
      },
      unresolvedThreads: {
        original: origUnresolved,
        retry: retryId ? retryUnresolved : origUnresolved,
      },
      criteriaScores: {
        original: origScores,
        retry: retryScores || origScores,
      },
      overallDelta: overallConvictionDelta,
    });
  } catch (err: unknown) {
    const errorId = logServerError(err, "Compare Route Error");
    return NextResponse.json({ error: "Failed to compare sessions. Please try again.", errorId }, { status: 500 });
  }
}

async function getSessionCriteriaAverages(sessionId: string): Promise<Record<string, number>> {
  if (isNeonConfigured()) {
    const rows = await query<{
      avg_directness: string;
      avg_specificity: string;
      avg_evidence: string;
      avg_logic: string;
      avg_honesty: string;
    }>(
      `SELECT
        COALESCE(AVG(directness), 5) as avg_directness,
        COALESCE(AVG(specificity), 5) as avg_specificity,
        COALESCE(AVG(evidence), 5) as avg_evidence,
        COALESCE(AVG(logic), 5) as avg_logic,
        COALESCE(AVG(honesty), 5) as avg_honesty
       FROM evaluations
       WHERE session_id = $1`,
      [sessionId]
    );

    if (rows && rows[0]) {
      return {
        directness: Math.round(Number(rows[0].avg_directness) * 10) / 10,
        specificity: Math.round(Number(rows[0].avg_specificity) * 10) / 10,
        evidence: Math.round(Number(rows[0].avg_evidence) * 10) / 10,
        logic: Math.round(Number(rows[0].avg_logic) * 10) / 10,
        honesty: Math.round(Number(rows[0].avg_honesty) * 10) / 10,
      };
    }
  }

  return {
    directness: 6.2,
    specificity: 5.8,
    evidence: 5.4,
    logic: 7.0,
    honesty: 8.0,
  };
}
