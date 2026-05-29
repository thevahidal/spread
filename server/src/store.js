'use strict';

const crypto = require('node:crypto');
const db = require('./db');

const now = () => Date.now();
const newId = () => crypto.randomUUID();

// ---- Users ---------------------------------------------------------------

const PUBLIC_USER = 'id, name, email, provider, created_at';

// Find or create the user behind a verified provider identity. Returning users
// keep whatever display name they've since chosen; only their email is
// refreshed. New users start with the name the provider gave us.
function upsertProviderUser({ provider, sub, email, name }) {
  const existing = db
    .prepare('SELECT * FROM users WHERE provider = ? AND provider_sub = ?')
    .get(provider, sub);

  if (existing) {
    if (email && email !== existing.email) {
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, existing.id);
    }
    return db.prepare(`SELECT ${PUBLIC_USER} FROM users WHERE id = ?`).get(existing.id);
  }

  const id = newId();
  db.prepare(
    `INSERT INTO users (id, name, email, provider, provider_sub, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, (name || '').trim() || 'Anonymous', email || null, provider, sub, now());
  return db.prepare(`SELECT ${PUBLIC_USER} FROM users WHERE id = ?`).get(id);
}

function getUser(id) {
  return db.prepare(`SELECT ${PUBLIC_USER} FROM users WHERE id = ?`).get(id);
}

// Let a signed-in user change the name shown on their wisdom.
function renameUser(id, name) {
  const clean = (name || '').trim();
  if (!clean) {
    const err = new Error('name is required');
    err.status = 400;
    throw err;
  }
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(clean, id);
  return getUser(id);
}

// ---- Feed ----------------------------------------------------------------

// Return the next sentence to show `userId`: one they didn't write and haven't
// seen, ranked by how far it has already spread (with a little freshness).
// Showing it records an impression, which is what grows the author's reach.
function nextForUser(userId) {
  const row = db
    .prepare(
      `SELECT s.id, s.author_name, s.text, s.spreads, s.reach, s.created_at
         FROM sentences s
        WHERE s.author_id != ?
          AND NOT EXISTS (
            SELECT 1 FROM impressions i
             WHERE i.sentence_id = s.id AND i.user_id = ?
          )
        ORDER BY s.spreads DESC, s.created_at DESC
        LIMIT 1`
    )
    .get(userId, userId);

  if (!row) return null;

  // Record the impression and bump reach. Unique PK means a re-shown sentence
  // never double-counts, even under a race.
  const inserted = db
    .prepare(
      'INSERT OR IGNORE INTO impressions (sentence_id, user_id, created_at) VALUES (?, ?, ?)'
    )
    .run(row.id, userId, now());
  if (inserted.changes > 0) {
    db.prepare('UPDATE sentences SET reach = reach + 1 WHERE id = ?').run(row.id);
    row.reach += 1;
  }

  return { ...row, spread_by_me: false };
}

// ---- Sentences -----------------------------------------------------------

function createSentence({ authorId, text }) {
  const user = getUser(authorId);
  if (!user) {
    const err = new Error('unknown author');
    err.status = 400;
    throw err;
  }
  const clean = (text || '').trim();
  if (!clean) {
    const err = new Error('sentence is empty');
    err.status = 400;
    throw err;
  }
  if (clean.length > 280) {
    const err = new Error('sentence is too long (max 280 characters)');
    err.status = 400;
    throw err;
  }

  const id = newId();
  db.prepare(
    `INSERT INTO sentences (id, author_id, author_name, text, spreads, reach, created_at)
     VALUES (?, ?, ?, ?, 0, 0, ?)`
  ).run(id, authorId, user.name, clean, now());

  return db
    .prepare(
      'SELECT id, author_name, text, spreads, reach, created_at FROM sentences WHERE id = ?'
    )
    .get(id);
}

// Spread (like) a sentence. Idempotent per user. Returns the new counts and
// whether this call was the one that actually spread it.
function spread({ sentenceId, userId }) {
  const sentence = db.prepare('SELECT id FROM sentences WHERE id = ?').get(sentenceId);
  if (!sentence) {
    const err = new Error('unknown sentence');
    err.status = 404;
    throw err;
  }

  const inserted = db
    .prepare(
      'INSERT OR IGNORE INTO spreads (sentence_id, user_id, created_at) VALUES (?, ?, ?)'
    )
    .run(sentenceId, userId, now());

  if (inserted.changes > 0) {
    db.prepare('UPDATE sentences SET spreads = spreads + 1 WHERE id = ?').run(sentenceId);
  }

  const updated = db
    .prepare('SELECT id, spreads, reach FROM sentences WHERE id = ?')
    .get(sentenceId);
  return { ...updated, newly_spread: inserted.changes > 0 };
}

// ---- Profile -------------------------------------------------------------

// Everything the author wrote, newest first, with live reach + spread counts.
function authoredBy(userId) {
  return db
    .prepare(
      `SELECT id, text, spreads, reach, created_at
         FROM sentences
        WHERE author_id = ?
        ORDER BY created_at DESC`
    )
    .all(userId);
}

module.exports = {
  upsertProviderUser,
  getUser,
  renameUser,
  nextForUser,
  createSentence,
  spread,
  authoredBy,
};
