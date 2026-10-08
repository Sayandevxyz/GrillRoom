import { ClaimCategory } from "./engine/personas";

export type IntensityMode = "friendly" | "tough" | "shark";
export type VerdictDecision = "In" | "Conditional" | "Out";
export type RoundType = "opening" | "deep_dive" | "kill_shot" | "verdict";
export type TurnRole = "investor" | "founder" | "chair";
export type ClaimStatus = "unverified" | "evidenced" | "contradicted" | "conceded";
export type ThreadState = "open" | "drilling" | "closed_resolved" | "closed_unresolved";

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
  round: RoundType;
  role: TurnRole;
  speaker_id: string;
  text: string;
  question_type?: string | null;
  thread_id?: number | null;
  created_at?: string;
}

export interface ClaimRecord {
  id: number;
  session_id: string;
  claim_text: string;
  category: ClaimCategory | string;
  status: ClaimStatus;
  severity: number;
  source_turn: number;
  thread_state: ThreadState;
  ladder_level: number;
  followups_used: number;
  last_asked_by: string | null;
}

export interface ConvictionRecord {
  id?: number;
  session_id: string;
  investor_id: string;
  turn_no: number;
  score: number;
  delta: number;
  reason: string;
}

export interface VerdictRecord {
  id?: number;
  session_id: string;
  investor_id: string;
  decision: VerdictDecision;
  reason: string;
  condition: string;
  simulated_offer: string;
}

export interface EvaluationRecord {
  id?: number;
  turn_id?: number;
  session_id: string;
  directness: number;
  specificity: number;
  evidence: number;
  logic: number;
  honesty: number;
  reason?: string;
  missing_items?: string[];
  dodged?: boolean;
}

export interface KnowledgeChunkRecord {
  id: number;
  source: string;
  category: string;
  persona_tag: string;
  text: string;
  tsv?: string;
}

export interface RateLimitRecord {
  key: string;
  window_start: string;
  count: number;
}
