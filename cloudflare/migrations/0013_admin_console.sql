CREATE TABLE IF NOT EXISTS web_admin_accounts (
  username TEXT PRIMARY KEY,
  password_salt TEXT NOT NULL,
  password_verifier TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS web_admin_sessions (
  token_hash TEXT PRIMARY KEY,
  username TEXT NOT NULL REFERENCES web_admin_accounts(username) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS web_admin_sessions_expiry ON web_admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS web_admin_attempts (
  ip_hash TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS web_admin_attempts_ip_time ON web_admin_attempts(ip_hash, attempted_at);

CREATE TABLE IF NOT EXISTS web_admin_audit (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL REFERENCES web_admin_accounts(username),
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catalog_photo_overrides (
  plant_id TEXT PRIMARY KEY REFERENCES plant_species(id),
  correction_id TEXT NOT NULL UNIQUE REFERENCES plant_photo_corrections(id),
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
