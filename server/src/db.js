'use strict';

const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

// One file-backed SQLite database. Node 26 ships node:sqlite, so there is no
// native module to compile — the server runs with a bare `node src/index.js`.
const DB_PATH = process.env.SPREAD_DB || path.join(__dirname, '..', 'spread.db');

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    email        TEXT,
    provider     TEXT,           -- 'google' | 'apple' | 'dev'
    provider_sub TEXT,           -- the provider's stable user id
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sentences (
    id          TEXT PRIMARY KEY,
    author_id   TEXT NOT NULL,
    author_name TEXT NOT NULL,
    text        TEXT NOT NULL,
    spreads     INTEGER NOT NULL DEFAULT 0,
    reach       INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL,
    FOREIGN KEY (author_id) REFERENCES users(id)
  );

  -- One row per (sentence, viewer): drives "reach" (distinct people reached)
  -- and stops a sentence being shown to the same person twice.
  CREATE TABLE IF NOT EXISTS impressions (
    sentence_id TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    PRIMARY KEY (sentence_id, user_id)
  );

  -- One row per (sentence, spreader): drives "spreads" (likes) and prevents
  -- double-spreading.
  CREATE TABLE IF NOT EXISTS spreads (
    sentence_id TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    PRIMARY KEY (sentence_id, user_id)
  );

  -- Opaque session tokens handed to logged-in clients (Bearer auth).
  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_sentences_author ON sentences(author_id);
  CREATE INDEX IF NOT EXISTS idx_sentences_rank ON sentences(spreads DESC, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);

// Migrate older databases (the pre-auth schema only had id/name/created_at).
const userCols = new Set(db.prepare('PRAGMA table_info(users)').all().map((c) => c.name));
for (const [col, ddl] of [
  ['email', 'ALTER TABLE users ADD COLUMN email TEXT'],
  ['provider', 'ALTER TABLE users ADD COLUMN provider TEXT'],
  ['provider_sub', 'ALTER TABLE users ADD COLUMN provider_sub TEXT'],
]) {
  if (!userCols.has(col)) db.exec(ddl);
}

// One provider identity maps to exactly one user.
db.exec(
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_sub)'
);

module.exports = db;
