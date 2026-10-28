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

-- Parameter gamifikasi terkelola (form admin #9): satu baris, payload JSON.
CREATE TABLE IF NOT EXISTS app_settings (
  id         INTEGER     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  payload    JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Katalog modul Learning terkelola (#8): admin CRUD, user membaca yang aktif.
CREATE TABLE IF NOT EXISTS learning_modules (
  id              TEXT        PRIMARY KEY,
  title           TEXT        NOT NULL,
  category        TEXT        NOT NULL DEFAULT '',
  duration        TEXT        NOT NULL DEFAULT '',
  description     TEXT        NOT NULL DEFAULT '',
  resource_label  TEXT        NOT NULL DEFAULT '',
  resource_url    TEXT        NOT NULL DEFAULT '',
  sections        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  quiz            JSONB       NOT NULL DEFAULT '[]'::jsonb,
  active          BOOLEAN     NOT NULL DEFAULT TRUE,
  order_index     INTEGER     NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeks pencarian laporan/konten lintas-akun di dalam payload JSON.
CREATE INDEX IF NOT EXISTS tree_states_payload_idx
  ON tree_states USING GIN (payload);
