CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  idea_text text NOT NULL,
  industry text,
  stage text,
  ask_amount text,
  intensity text NOT NULL DEFAULT 'tough',   -- friendly | tough | shark
  panel_ids text[] NOT NULL,
  status text NOT NULL DEFAULT 'active',     -- active | verdict | done
  turn_count int NOT NULL DEFAULT 0,
  parent_session_id uuid REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS panel_members (
  id text PRIMARY KEY,
  name text,
  archetype text,
  priority_weights jsonb,
  distrusts text,
  style_notes text,
  signature_question text
);

CREATE TABLE IF NOT EXISTS turns (
  id bigserial PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  turn_no int NOT NULL,
  round text NOT NULL,                       -- opening | deep_dive | kill_shot | verdict
  role text NOT NULL,                        -- investor | founder | chair
  speaker_id text,
  text text NOT NULL,
  question_type text,
  thread_id bigint,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS claims (
  id bigserial PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  claim_text text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'unverified', -- unverified | evidenced | contradicted | conceded
  severity int NOT NULL DEFAULT 3,           -- 1..5
  source_turn int NOT NULL,
  thread_state text NOT NULL DEFAULT 'open', -- open | drilling | closed_resolved | closed_unresolved
  ladder_level int NOT NULL DEFAULT 1,       -- 1 clarify, 2 evidence, 3 challenge, 4 stress
  followups_used int NOT NULL DEFAULT 0,
  last_asked_by text
);

CREATE TABLE IF NOT EXISTS evaluations (
  id bigserial PRIMARY KEY,
  turn_id bigint REFERENCES turns(id) ON DELETE CASCADE,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  directness int,
  specificity int,
  evidence int,
  logic int,
  honesty int,
  reason text,
  missing_items jsonb,
  dodged boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS convictions (
  id bigserial PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  investor_id text,
  turn_no int,
  score int,
  delta int,
  reason text
);

CREATE TABLE IF NOT EXISTS verdicts (
  id bigserial PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  investor_id text,
  decision text,
  reason text,
  condition text,
  simulated_offer text
);

CREATE TABLE IF NOT EXISTS reports (
  id bigserial PRIMARY KEY,
  session_id uuid UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  content_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id bigserial PRIMARY KEY,
  source text,
  category text,
  persona_tag text,
  text text NOT NULL,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);

CREATE INDEX IF NOT EXISTS knowledge_tsv_idx ON knowledge_chunks USING GIN (tsv);

-- Efficiency indexes on session_id foreign keys
CREATE INDEX IF NOT EXISTS idx_turns_session_id ON turns(session_id);
CREATE INDEX IF NOT EXISTS idx_claims_session_id ON claims(session_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_session_id ON evaluations(session_id);
CREATE INDEX IF NOT EXISTS idx_convictions_session_id ON convictions(session_id);
CREATE INDEX IF NOT EXISTS idx_verdicts_session_id ON verdicts(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_parent ON sessions(parent_session_id);

CREATE TABLE IF NOT EXISTS rate_limits (
  key text,
  window_start timestamptz,
  count int,
  PRIMARY KEY (key, window_start)
);
