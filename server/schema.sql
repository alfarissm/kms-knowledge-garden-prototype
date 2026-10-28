-- Skema backend demo kebunku (Neon, database kebunku_db).
-- Prinsip: server menyimpan akun + sesi + state mesin (payload JSON utuh),
-- laporan dan keputusan admin tetap melalui mesin gamification.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT        PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tree_states (
  user_id    INTEGER     PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  payload    JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeks pencarian laporan/konten lintas-akun di dalam payload JSON.
CREATE INDEX IF NOT EXISTS tree_states_payload_idx
  ON tree_states USING GIN (payload);
