CREATE TABLE IF NOT EXISTS user_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  category TEXT NOT NULL CHECK(category IN ('suggestion','bug','content','other')),
  content TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  ip_hash TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS user_feedback_status_created_idx ON user_feedback(status,created_at DESC);
CREATE INDEX IF NOT EXISTS user_feedback_ip_created_idx ON user_feedback(ip_hash,created_at DESC);
