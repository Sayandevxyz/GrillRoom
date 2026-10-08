import { query, isNeonConfigured, mockDb } from "@/lib/db";

export interface RadarScores {
  directness: number;
  specificity: number;
  evidence: number;
  logic: number;
  honesty: number;
}

export interface SessionRadarData {
  sessionId: string;
  current: RadarScores;
  previous?: RadarScores;
  parentSessionId?: string | null;
}

interface EvaluationRow {
  directness: number | null;
  specificity: number | null;
  evidence: number | null;
  logic: number | null;
  honesty: number | null;
}

interface SessionRow {
  id: string;
  parent_session_id: string | null;
}

function computeAverageScores(rows: EvaluationRow[]): RadarScores | null {
  if (!rows || rows.length === 0) {
    return null;
  }

  let totalDirectness = 0;
  let totalSpecificity = 0;
  let totalEvidence = 0;
  let totalLogic = 0;
  let totalHonesty = 0;
  let count = 0;

  for (const r of rows) {
    // Only count rows that have at least some scores
    if (
      r.directness !== null ||
      r.specificity !== null ||
      r.evidence !== null ||
      r.logic !== null ||
      r.honesty !== null
    ) {
      totalDirectness += Number(r.directness ?? 5);
      totalSpecificity += Number(r.specificity ?? 5);
      totalEvidence += Number(r.evidence ?? 5);
      totalLogic += Number(r.logic ?? 5);
      totalHonesty += Number(r.honesty ?? 5);
      count++;
    }
  }

  if (count === 0) return null;

  return {
    directness: Math.round((totalDirectness / count) * 10) / 10,
    specificity: Math.round((totalSpecificity / count) * 10) / 10,
    evidence: Math.round((totalEvidence / count) * 10) / 10,
    logic: Math.round((totalLogic / count) * 10) / 10,
    honesty: Math.round((totalHonesty / count) * 10) / 10,
  };
}

/**
 * Computes 5-axis pitch DNA radar averages from stored evaluations.
 * If the session is a retry (parent_session_id exists), also pulls
 * the previous attempt's evaluations for direct side-by-side comparison.
 */
export async function getSessionRadar(sessionId: string): Promise<SessionRadarData | null> {
  try {
    let parentSessionId: string | null = null;
    let currentRows: EvaluationRow[] = [];
    let previousRows: EvaluationRow[] = [];

    if (isNeonConfigured()) {
      // 1. Get session info to check for parent_session_id
      const sessionResult = await query<SessionRow>(
        `SELECT id, parent_session_id FROM sessions WHERE id = $1 LIMIT 1`,
        [sessionId]
      );
      if (sessionResult.length > 0) {
        parentSessionId = sessionResult[0].parent_session_id;
      }

      // 2. Get evaluations for current session
      currentRows = await query<EvaluationRow>(
        `SELECT directness, specificity, evidence, logic, honesty 
         FROM evaluations 
         WHERE session_id = $1`,
        [sessionId]
      );

      // 3. Get evaluations for parent session if retry exists
      if (parentSessionId) {
        previousRows = await query<EvaluationRow>(
          `SELECT directness, specificity, evidence, logic, honesty 
           FROM evaluations 
           WHERE session_id = $1`,
          [parentSessionId]
        );
      }
    } else {
      // In-memory mock fallback
      const session = mockDb.sessions.get(sessionId) as { parent_session_id?: string } | undefined;
      parentSessionId = session?.parent_session_id || null;

      currentRows = (mockDb.evaluations || [])
        .filter((e) => e.session_id === sessionId)
        .map((e) => ({
          directness: (e.directness as number) ?? null,
          specificity: (e.specificity as number) ?? null,
          evidence: (e.evidence as number) ?? null,
          logic: (e.logic as number) ?? null,
          honesty: (e.honesty as number) ?? null,
        }));

      if (parentSessionId) {
        previousRows = (mockDb.evaluations || [])
          .filter((e) => e.session_id === parentSessionId)
          .map((e) => ({
            directness: (e.directness as number) ?? null,
            specificity: (e.specificity as number) ?? null,
            evidence: (e.evidence as number) ?? null,
            logic: (e.logic as number) ?? null,
            honesty: (e.honesty as number) ?? null,
          }));
      }
    }

    const currentScores = computeAverageScores(currentRows);
    if (!currentScores) {
      return null;
    }

    const previousScores = previousRows.length > 0 ? computeAverageScores(previousRows) : null;

    return {
      sessionId,
      current: currentScores,
      previous: previousScores || undefined,
      parentSessionId,
    };
  } catch (err) {
    console.warn("[getSessionRadar Error]", err);
    return null;
  }
}
