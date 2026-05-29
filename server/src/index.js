'use strict';

const express = require('express');
const cors = require('cors');
const store = require('./store');
const auth = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

// Wrap async/sync handlers so thrown errors become clean JSON responses.
const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message || 'server error' });
  }
};

// Require a valid session. On success, attaches req.userId.
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const userId = auth.userIdForToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'sign in to spread wisdom' });
  }
  req.userId = userId;
  req.sessionToken = token;
  next();
};

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, devAuth: auth.DEV_AUTH })
);

// --- Auth ------------------------------------------------------------------

// Turn a verified provider identity into a Spread user + session token.
function logIn(res, identity, status = 200) {
  const user = store.upsertProviderUser(identity);
  const token = auth.createSession(user.id);
  res.status(status).json({ token, user });
}

app.post(
  '/api/auth/google',
  wrap(async (req, res) => {
    const identity = await auth.verifyGoogle((req.body || {}).idToken);
    logIn(res, identity);
  })
);

app.post(
  '/api/auth/apple',
  wrap(async (req, res) => {
    const { identityToken, fullName } = req.body || {};
    const identity = await auth.verifyApple(identityToken, fullName);
    logIn(res, identity);
  })
);

// Local development login (only when SPREAD_DEV_AUTH=1).
app.post(
  '/api/auth/dev',
  wrap(async (req, res) => {
    const identity = auth.verifyDev(req.body || {});
    logIn(res, identity);
  })
);

app.post(
  '/api/auth/logout',
  requireAuth,
  wrap((req, res) => {
    auth.destroySession(req.sessionToken);
    res.json({ ok: true });
  })
);

// --- Me --------------------------------------------------------------------

app.get(
  '/api/me',
  requireAuth,
  wrap((req, res) => res.json(store.getUser(req.userId)))
);

app.patch(
  '/api/me',
  requireAuth,
  wrap((req, res) => res.json(store.renameUser(req.userId, (req.body || {}).name)))
);

app.get(
  '/api/me/sentences',
  requireAuth,
  wrap((req, res) => res.json({ sentences: store.authoredBy(req.userId) }))
);

// --- Wisdom (all require a session) ---------------------------------------

app.get(
  '/api/feed',
  requireAuth,
  wrap((req, res) => res.json({ sentence: store.nextForUser(req.userId) }))
);

app.post(
  '/api/sentences',
  requireAuth,
  wrap((req, res) => {
    res.status(201).json(store.createSentence({ authorId: req.userId, text: (req.body || {}).text }));
  })
);

app.post(
  '/api/sentences/:id/spread',
  requireAuth,
  wrap((req, res) => {
    res.json(store.spread({ sentenceId: req.params.id, userId: req.userId }));
  })
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Spread server listening on http://localhost:${PORT}`);
  if (auth.DEV_AUTH) console.log('⚠️  Dev auth is ON (POST /api/auth/dev).');
});
