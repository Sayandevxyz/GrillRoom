-- Migration: Behind Closed Doors partner deliberation scene
CREATE TABLE IF NOT EXISTS behind_doors_scenes (
  id bigserial PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  content_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_behind_doors_session UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_behind_doors_session ON behind_doors_scenes(session_id);
