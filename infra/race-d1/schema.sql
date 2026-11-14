-- RaceResult D1 candidate schema. Never apply to production without review.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS race_results (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL CHECK(length(owner_id)>0),
  race_identity TEXT NOT NULL,
  race_date TEXT NOT NULL,
  sport TEXT NOT NULL CHECK(sport='running'),
  distance_m INTEGER NOT NULL CHECK(distance_m>=1200),
  elapsed_seconds INTEGER NOT NULL CHECK(elapsed_seconds>=180),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, race_identity)
);
CREATE TABLE IF NOT EXISTS race_requests (
  owner_id TEXT NOT NULL,
  request_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  race_id TEXT REFERENCES race_results(id),
  PRIMARY KEY(owner_id, request_key)
);
CREATE TABLE IF NOT EXISTS race_audit (
  audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  race_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('created','corrected')),
  old_revision INTEGER,
  new_revision INTEGER NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER IF NOT EXISTS race_audit_create AFTER INSERT ON race_results
BEGIN
  INSERT INTO race_audit(owner_id,race_id,action,old_revision,new_revision)
  VALUES (NEW.owner_id,NEW.id,'created',NULL,NEW.revision);
END;
CREATE TRIGGER IF NOT EXISTS race_audit_correct AFTER UPDATE ON race_results
WHEN NEW.revision=OLD.revision+1 AND NEW.owner_id=OLD.owner_id
BEGIN
  INSERT INTO race_audit(owner_id,race_id,action,old_revision,new_revision)
  VALUES (NEW.owner_id,NEW.id,'corrected',OLD.revision,NEW.revision);
END;
CREATE TRIGGER IF NOT EXISTS race_reject_unsafe_update BEFORE UPDATE ON race_results
WHEN NEW.owner_id<>OLD.owner_id OR NEW.id<>OLD.id OR NEW.revision<>OLD.revision+1
BEGIN
  SELECT RAISE(ABORT,'unsafe_race_update');
END;
CREATE TRIGGER IF NOT EXISTS race_reject_delete BEFORE DELETE ON race_results
BEGIN
  SELECT RAISE(ABORT,'race_delete_forbidden');
END;
