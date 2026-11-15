CREATE TABLE IF NOT EXISTS plant_photo_corrections (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plant_species(id),
  scientific_name TEXT,
  user_id TEXT REFERENCES users(id),
  ip_hash TEXT,
  note TEXT NOT NULL,
  jpeg_base64 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  reviewer_id TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS plant_photo_corrections_status_created
  ON plant_photo_corrections (status, created_at DESC);
CREATE INDEX IF NOT EXISTS plant_photo_corrections_ip_created
  ON plant_photo_corrections (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS plant_photo_corrections_user_created
  ON plant_photo_corrections (user_id, created_at);
