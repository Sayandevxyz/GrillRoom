import { query, mockDb, isNeonConfigured } from "../db";
import { ClaimSnippet } from "../llm/prompts";
import { AnalystOutput } from "./analyst";
import { logger } from "../logger";

export interface ClaimRecord {
  id: number;
  session_id: string;
  claim_text: string;
  category: string;
  status: "unverified" | "evidenced" | "contradicted" | "conceded";
  severity: number;
  source_turn: number;
  thread_state: "open" | "drilling" | "closed_resolved" | "closed_unresolved";
  ladder_level: number;
  followups_used: number;
  last_asked_by: string | null;
}

export async function getSessionClaims(sessionId: string): Promise<ClaimRecord[]> {
  if (isNeonConfigured()) {
    try {
      const rows = await query<ClaimRecord>(
        `SELECT * FROM claims WHERE session_id = $1 ORDER BY id ASC`,
        [sessionId]
      );
      return rows;
    } catch (err) {
      logger.warn("Failed to fetch claims from Neon DB, falling back to mock", "getSessionClaims", { err: String(err) });
    }
  }

  // In-memory fallback
  return (mockDb.claims.filter(
    (c) => c.session_id === sessionId
  ) as unknown as ClaimRecord[]);
}

export async function addClaim(
  sessionId: string,
  claimText: string,
  category: string,
  severity: number = 3,
  sourceTurn: number = 0
): Promise<ClaimRecord> {
  if (isNeonConfigured()) {
    const rows = await query<ClaimRecord>(
      `INSERT INTO claims (session_id, claim_text, category, severity, source_turn)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sessionId, claimText, category, severity, sourceTurn]
    );
    if (rows && rows[0]) return rows[0];
  }

  // In-memory fallback
  const newRecord: ClaimRecord = {
    id: mockDb.claims.length + 1,
    session_id: sessionId,
    claim_text: claimText,
    category,
    status: "unverified",
    severity,
    source_turn: sourceTurn,
    thread_state: "open",
    ladder_level: 1,
    followups_used: 0,
    last_asked_by: null,
  };
  mockDb.claims.push(newRecord as unknown as Record<string, unknown>);
  return newRecord;
}

export async function updateClaimStatus(
  claimId: number | string,
  status: "unverified" | "evidenced" | "contradicted" | "conceded"
): Promise<void> {
  const numericId = Number(claimId);
  if (isNeonConfigured()) {
    await query(`UPDATE claims SET status = $1 WHERE id = $2`, [status, numericId]);
    return;
  }

  const found = mockDb.claims.find((c) => Number(c.id) === numericId);
  if (found) {
    found.status = status;
  }
}

export async function updateClaimThread(
  claimId: number | string,
  updates: {
    thread_state?: "open" | "drilling" | "closed_resolved" | "closed_unresolved";
    ladder_level?: number;
    followups_used?: number;
    last_asked_by?: string;
  }
): Promise<void> {
  const numericId = Number(claimId);
  if (isNeonConfigured()) {
    const setClauses: string[] = [];
    const params: (string | number)[] = [numericId];

    if (updates.thread_state !== undefined) {
      params.push(updates.thread_state);
      setClauses.push(`thread_state = $${params.length}`);
    }
    if (updates.ladder_level !== undefined) {
      params.push(updates.ladder_level);
      setClauses.push(`ladder_level = $${params.length}`);
    }
    if (updates.followups_used !== undefined) {
      params.push(updates.followups_used);
      setClauses.push(`followups_used = $${params.length}`);
    }
    if (updates.last_asked_by !== undefined) {
      params.push(updates.last_asked_by);
      setClauses.push(`last_asked_by = $${params.length}`);
    }

    if (setClauses.length > 0) {
      await query(`UPDATE claims SET ${setClauses.join(", ")} WHERE id = $1`, params);
    }
    return;
  }

  const found = mockDb.claims.find((c) => Number(c.id) === numericId);
  if (found) {
    if (updates.thread_state) found.thread_state = updates.thread_state;
    if (updates.ladder_level !== undefined) found.ladder_level = updates.ladder_level;
    if (updates.followups_used !== undefined) found.followups_used = updates.followups_used;
    if (updates.last_asked_by !== undefined) found.last_asked_by = updates.last_asked_by;
  }
}

/**
 * Applies structured analyst evaluation updates to the Due Diligence Ledger:
 * 1. Inserts newly surfaced claims extracted from founder answers.
 * 2. Updates statuses (unverified -> evidenced / contradicted / conceded).
 * 3. Flags and indexes severe contradictions.
 *
 * @param sessionId Target interrogation session UUID
 * @param analysis Structured analyst output from background evaluation
 * @param currentTurn Monotonically increasing exchange turn index
 */
export async function applyAnalystUpdates(
  sessionId: string,
  analysis: AnalystOutput,
  currentTurn: number
): Promise<void> {
  // 1. Insert newly extracted claims
  for (const newClaim of analysis.new_claims) {
    if (newClaim.text && newClaim.text.trim()) {
      await addClaim(
        sessionId,
        newClaim.text.trim(),
        newClaim.category || "general",
        newClaim.severity || 3,
        currentTurn
      );
    }
  }

  // 2. Apply status changes
  for (const sc of analysis.status_changes) {
    await updateClaimStatus(sc.claim_id, sc.status);
  }

  // 3. Mark contradictions if any
  for (const c of analysis.contradictions) {
    await updateClaimStatus(c.claim_id, "contradicted");
  }
}

export function toClaimSnippets(claims: ClaimRecord[]): ClaimSnippet[] {
  return claims.map((c) => ({
    id: c.id,
    claim_text: c.claim_text,
    category: c.category,
    status: c.status,
    severity: c.severity,
    ladder_level: c.ladder_level,
  }));
}
