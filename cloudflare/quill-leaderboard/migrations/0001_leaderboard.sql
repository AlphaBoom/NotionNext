CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  player_id TEXT NOT NULL,
  season TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  submitted_at INTEGER,
  nickname TEXT,
  duration_ms INTEGER,
  kills INTEGER,
  bosses INTEGER,
  level INTEGER
);
CREATE INDEX IF NOT EXISTS runs_expiry ON runs(expires_at);

CREATE TABLE IF NOT EXISTS scores (
  season TEXT NOT NULL,
  player_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  duration_ms INTEGER NOT NULL CHECK(duration_ms >= 1000),
  kills INTEGER NOT NULL CHECK(kills >= 0),
  bosses INTEGER NOT NULL CHECK(bosses >= 0),
  level INTEGER NOT NULL CHECK(level >= 1),
  achieved_at INTEGER NOT NULL,
  PRIMARY KEY(season, player_id)
);
CREATE INDEX IF NOT EXISTS scores_ranking ON scores(
  season, duration_ms DESC, kills DESC, bosses DESC, achieved_at ASC, run_id ASC
);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits(expires_at);
