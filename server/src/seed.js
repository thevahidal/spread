'use strict';

// Populate the feed with a few seed sentences so the very first user who opens
// the app sees something. Safe to run multiple times — it only seeds once.
const store = require('./store');
const db = require('./db');

const SEED_AUTHOR = 'seed-author';

const seeds = [
  { name: 'Marcus', text: 'You have power over your mind — not outside events. Realize this, and you will find strength.' },
  { name: 'Lao Tzu', text: 'A journey of a thousand miles begins with a single step.' },
  { name: 'Anaïs', text: 'We do not see things as they are, we see them as we are.' },
  { name: 'Rumi', text: 'The wound is the place where the light enters you.' },
  { name: 'Unknown', text: 'Speak only if it improves upon the silence.' },
  { name: 'Seneca', text: 'We suffer more often in imagination than in reality.' },
  { name: 'Maya', text: 'People will forget what you said, but never how you made them feel.' },
];

const existing = db.prepare('SELECT COUNT(*) AS n FROM sentences').get();
if (existing.n > 0) {
  console.log(`Database already has ${existing.n} sentences — skipping seed.`);
  process.exit(0);
}

// The seed author is a plain row (no provider identity — it never logs in).
db.prepare(
  'INSERT OR IGNORE INTO users (id, name, created_at) VALUES (?, ?, ?)'
).run(SEED_AUTHOR, 'Spread', Date.now());

for (const s of seeds) {
  // Each seed sentence keeps its own attribution rather than the seed account's
  // name, so the feed reads like real authors.
  const created = store.createSentence({ authorId: SEED_AUTHOR, text: s.text });
  db.prepare('UPDATE sentences SET author_name = ? WHERE id = ?').run(s.name, created.id);
}

console.log(`Seeded ${seeds.length} sentences.`);
