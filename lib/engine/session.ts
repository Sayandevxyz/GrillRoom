import { query, mockDb, isNeonConfigured } from "../db";
import { evaluateAnswer, AnalystOutput } from "./analyst";
import {
  getSessionClaims,
  applyAnalystUpdates,
  updateClaimThread,
  toClaimSnippets,
} from "./ledger";
import {
  calculateConvictionDelta,
  clampConvictionScore,
  computeAverageScore,
  IntensityMode,
} from "./conviction";
import { planNextTurn, getFollowupCap, PlannerResult } from "./planner";
import { INVESTOR_PERSONAS } from "./personas";
import { getRubricSnippets } from "./rubrics";
import { buildInvestorPrompt } from "../llm/prompts";
import { createStreamingChatCompletion, DEFAULT_BIG_MODEL } from "../llm/groq";
import type OpenAI from "openai";

export interface SessionRecord {
  id: string;
  owner_token: string;
  created_at: string;
  idea_text: string;
  industry?: string;
  stage?: string;
  ask_amount?: string;
  intensity: IntensityMode;
  panel_ids: string[];
  status: "active" | "verdict" | "done";
  turn_count: number;
  parent_session_id?: string;
}

export interface TurnRecord {
  id: number;
  session_id: string;
  turn_no: number;
  round: "opening" | "deep_dive" | "kill_shot" | "verdict";
  role: "investor" | "founder" | "chair";
  speaker_id: string;
  text: string;
  question_type?: string;
  thread_id?: number;
}

export async function getSession(sessionId: string): Promise<SessionRecord | null> {
  if (isNeonConfigured()) {
    const rows = await query<SessionRecord>(`SELECT * FROM sessions WHERE id = $1`, [sessionId]);
    return rows[0] || null;
  }
  return (mockDb.sessions.get(sessionId) as unknown as SessionRecord) || null;
}

export async function getTurns(sessionId: string): Promise<TurnRecord[]> {
  if (isNeonConfigured()) {
    return await query<TurnRecord>(
      `SELECT * FROM turns WHERE session_id = $1 ORDER BY turn_no ASC`,
      [sessionId]
    );
  }
  return (mockDb.turns.filter(
    (t) => t.session_id === sessionId
  ) as unknown as TurnRecord[]);
}

export async function recordTurn(
  sessionId: string,
  turnNo: number,
  round: "opening" | "deep_dive" | "kill_shot" | "verdict",
  role: "investor" | "founder" | "chair",
  speakerId: string,
  text: string,
  questionType?: string,
  threadId?: number
): Promise<TurnRecord> {
  if (isNeonConfigured()) {
    const rows = await query<TurnRecord>(
      `INSERT INTO turns (session_id, turn_no, round, role, speaker_id, text, question_type, thread_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [sessionId, turnNo, round, role, speakerId, text, questionType || null, threadId || null]
    );
    return rows[0];
  }

  const record: TurnRecord = {
    id: mockDb.turns.length + 1,
    session_id: sessionId,
    turn_no: turnNo,
    round,
    role,
    speaker_id: speakerId,
    text,
    question_type: questionType,
    thread_id: threadId,
  };
  mockDb.turns.push(record as unknown as Record<string, unknown>);
  return record;
}

export async function getLatestConvictions(sessionId: string, panelIds: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const id of panelIds) {
    result[id] = 50; // default start
  }

  if (isNeonConfigured()) {
    const rows = await query<{ investor_id: string; score: number }>(
      `SELECT DISTINCT ON (investor_id) investor_id, score
       FROM convictions
       WHERE session_id = $1
       ORDER BY investor_id, turn_no DESC`,
      [sessionId]
    );
    for (const r of rows) {
      if (r.investor_id in result) {
        result[r.investor_id] = r.score;
      }
    }
  } else {
    const sessionConvictions = mockDb.convictions.filter((c) => String(c.session_id) === sessionId);
    for (const c of sessionConvictions) {
      const invId = String(c.investor_id);
      if (invId in result) {
        result[invId] = Number(c.score);
      }
    }
  }

  return result;
}

export async function recordConviction(
  sessionId: string,
  investorId: string,
  turnNo: number,
  score: number,
  delta: number,
  reason: string
): Promise<void> {
  if (isNeonConfigured()) {
    await query(
      `INSERT INTO convictions (session_id, investor_id, turn_no, score, delta, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, investorId, turnNo, score, delta, reason]
    );
    return;
  }

  mockDb.convictions.push({
    id: mockDb.convictions.length + 1,
    session_id: sessionId,
    investor_id: investorId,
    turn_no: turnNo,
    score,
    delta,
    reason,
  });
}

export interface TurnExecutionResult {
  investorSpeechStream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk> | null;
  directSpeech?: string;
  meta: {
    speakerId: string;
    speakerName: string;
    questionType: string;
    ladderLevel: number;
    threadId?: number;
    isInterrupt: boolean;
    isCrossTalk: boolean;
    crossTalkTargetInvestor?: string;
    contradictionQuote?: string;
  };
  state: {
    turnCount: number;
    round: string;
    meters: Record<string, number>;
    shouldMoveToKillShot: boolean;
    analystScores: Record<string, number>;
    dodged: boolean;
    missing: string[];
    contradictions: Array<{ claim_id: number | string; conflicts_with_turn: number; explanation: string }>;
  };
  saveInvestorTurn: (speech: string) => Promise<TurnRecord>;
}

/**
 * Executes a full turn of interrogation.
 */
export async function executeInterrogationTurn(
  session: SessionRecord,
  founderAnswer: string
): Promise<TurnExecutionResult> {
  const currentTurnNo = session.turn_count + 1;
  const turns = await getTurns(session.id);
  const previousTurns = turns.filter((t) => t.role === "investor");
  const lastInvestorTurn = previousTurns[previousTurns.length - 1];

  // 1. Record founder turn
  await recordTurn(
    session.id,
    currentTurnNo,
    session.turn_count >= 10 ? "kill_shot" : "deep_dive",
    "founder",
    "founder",
    founderAnswer
  );

  // 2. Fetch current ledger
  const currentClaims = await getSessionClaims(session.id);
  const claimSnippets = toClaimSnippets(currentClaims);

  // 3. Analyst Call (20B, low effort)
  const analysis: AnalystOutput = await evaluateAnswer(
    lastInvestorTurn?.text || "Initial Pitch",
    founderAnswer,
    claimSnippets,
    session.panel_ids
  );

  // 4. Update ledger with analysis
  await applyAnalystUpdates(session.id, analysis, currentTurnNo);

  // 5. Update conviction scores in code
  const currentConvictions = await getLatestConvictions(session.id, session.panel_ids);
  const avgScore = computeAverageScore(analysis.scores);
  const updatedMeters: Record<string, number> = {};

  for (const id of session.panel_ids) {
    const rawDelta = analysis.conviction_deltas[id] || 0;
    const clampedDelta = calculateConvictionDelta(rawDelta, avgScore);
    const newScore = clampConvictionScore(currentConvictions[id] ?? 50, clampedDelta);
    updatedMeters[id] = newScore;

    await recordConviction(
      session.id,
      id,
      currentTurnNo,
      newScore,
      clampedDelta,
      analysis.reason || "Turn evaluation"
    );
  }

  // 6. Planner (pure code)
  const turnsSpoken: Record<string, number> = {};
  for (const id of session.panel_ids) turnsSpoken[id] = 0;
  for (const t of previousTurns) {
    if (t.speaker_id && t.speaker_id in turnsSpoken) {
      turnsSpoken[t.speaker_id]++;
    }
  }

  const refreshedClaims = await getSessionClaims(session.id);
  const plannerPlan: PlannerResult = planNextTurn({
    intensity: session.intensity,
    panelIds: session.panel_ids,
    claims: refreshedClaims,
    analystOutput: analysis,
    lastSpeakerId: lastInvestorTurn?.speaker_id,
    turnsSpoken,
    totalInvestorTurns: previousTurns.length,
    convictions: updatedMeters,
    currentTurnNo,
  });

  // Update target thread state and followups
  if (plannerPlan.targetClaim) {
    const followupCap = getFollowupCap(session.intensity);
    const nextFollowups = (plannerPlan.targetClaim.followups_used || 0) + 1;
    let nextState = plannerPlan.targetClaim.thread_state;

    if (nextFollowups >= followupCap) {
      nextState = "closed_unresolved";
    } else if (avgScore >= 7) {
      nextState = "closed_resolved";
    } else {
      nextState = "drilling";
    }

    await updateClaimThread(plannerPlan.targetClaim.id, {
      thread_state: nextState,
      ladder_level: plannerPlan.ladderLevel,
      followups_used: nextFollowups,
      last_asked_by: plannerPlan.speakerId,
    });
  }

  // 7. Retrieve Rubric Chunks
  const targetCategory = plannerPlan.targetClaim?.category || "general";
  const persona = INVESTOR_PERSONAS[plannerPlan.speakerId];
  const rubricSnippets = await getRubricSnippets(
    targetCategory,
    persona?.id,
    plannerPlan.targetClaim?.claim_text
  );

  // 8. Build Layered Investor Prompt
  const { systemPrompt, userPrompt } = buildInvestorPrompt({
    persona,
    intensity: session.intensity,
    pitchText: session.idea_text,
    relevantClaims: toClaimSnippets(refreshedClaims).slice(0, 6),
    targetClaim: plannerPlan.targetClaim
      ? {
          id: plannerPlan.targetClaim.id,
          claim_text: plannerPlan.targetClaim.claim_text,
          category: plannerPlan.targetClaim.category,
          status: plannerPlan.targetClaim.status,
          severity: plannerPlan.targetClaim.severity,
          ladder_level: plannerPlan.ladderLevel,
        }
      : undefined,
    previousQuestion: lastInvestorTurn?.text,
    previousFounderAnswer: founderAnswer,
    questionType: plannerPlan.questionType,
    ladderLevel: plannerPlan.ladderLevel,
    rubricChunks: rubricSnippets,
    crossTalkTargetInvestor: plannerPlan.crossTalkTargetInvestor,
    contradictionQuote: plannerPlan.contradictionQuote,
  });

  // 9. Investor Call (120B stream)
  let stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk> | null = null;
  let directSpeech: string | undefined = undefined;

  try {
    stream = await createStreamingChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        model: DEFAULT_BIG_MODEL,
        temperature: 0.7,
        reasoningEffort: "medium",
        maxTokens: 512,
      }
    );
  } catch (err) {
    console.warn("[Investor Stream Warning] Fallback to direct completion:", err);
    directSpeech = `${persona.signatureQuestion}`;
  }

  // Increment session turn count
  const newTurnCount = session.turn_count + 1;
  if (isNeonConfigured()) {
    await query(`UPDATE sessions SET turn_count = $1 WHERE id = $2`, [newTurnCount, session.id]);
  } else {
    session.turn_count = newTurnCount;
  }

  const maxTurns = Number(process.env.MAX_TURNS) || 14;
  const shouldMoveToKillShot = newTurnCount >= maxTurns;

  const saveInvestorTurn = async (speech: string) => {
    return await recordTurn(
      session.id,
      newTurnCount,
      shouldMoveToKillShot ? "kill_shot" : "deep_dive",
      "investor",
      plannerPlan.speakerId,
      speech,
      plannerPlan.questionType,
      plannerPlan.targetClaim?.id
    );
  };

  return {
    investorSpeechStream: stream,
    directSpeech,
    meta: {
      speakerId: plannerPlan.speakerId,
      speakerName: persona.name,
      questionType: plannerPlan.questionType,
      ladderLevel: plannerPlan.ladderLevel,
      threadId: plannerPlan.targetClaim?.id,
      isInterrupt: plannerPlan.isInterrupt,
      isCrossTalk: plannerPlan.isCrossTalk,
      crossTalkTargetInvestor: plannerPlan.crossTalkTargetInvestor,
      contradictionQuote: plannerPlan.contradictionQuote,
    },
    state: {
      turnCount: newTurnCount,
      round: shouldMoveToKillShot ? "kill_shot" : "deep_dive",
      meters: updatedMeters,
      shouldMoveToKillShot,
      analystScores: analysis.scores as unknown as Record<string, number>,
      dodged: analysis.dodged,
      missing: analysis.missing,
      contradictions: analysis.contradictions,
    },
    saveInvestorTurn,
  };
}
