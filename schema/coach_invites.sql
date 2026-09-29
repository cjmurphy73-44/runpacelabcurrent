-- schema/coach_invites.sql
-- Table definition for secure coach-athlete roster onboarding

CREATE TABLE IF NOT EXISTS coach_invites (
  id TEXT PRIMARY KEY,
  coach_id TEXT NOT NULL,
  athlete_email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coach_invites_token ON coach_invites(token);
CREATE INDEX IF NOT EXISTS idx_coach_invites_coach ON coach_invites(coach_id);
