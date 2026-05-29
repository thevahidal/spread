'use strict';

const crypto = require('node:crypto');
const { createRemoteJWKSet, jwtVerify } = require('jose');
const db = require('./db');

// --- Provider config ------------------------------------------------------
//
// These are the audiences (client IDs) we accept tokens for. Set them via env;
// comma-separate when you have several (e.g. iOS + Android + Web Google IDs).
const GOOGLE_CLIENT_IDS = splitEnv(process.env.GOOGLE_CLIENT_IDS);
const APPLE_CLIENT_IDS = splitEnv(process.env.APPLE_CLIENT_IDS); // your bundle id / service id
const DEV_AUTH = process.env.SPREAD_DEV_AUTH === '1';

function splitEnv(v) {
  return (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Remote key sets are cached internally by jose, so we build them once.
const googleJWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const appleJWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

function authError(message) {
  const err = new Error(message);
  err.status = 401;
  return err;
}

// --- Token verification ----------------------------------------------------

// Verify a Google ID token and return a normalized identity.
async function verifyGoogle(idToken) {
  if (!idToken) throw authError('missing Google id token');
  if (GOOGLE_CLIENT_IDS.length === 0) {
    throw authError('Google sign-in is not configured (set GOOGLE_CLIENT_IDS)');
  }
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, googleJWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: GOOGLE_CLIENT_IDS,
    }));
  } catch {
    throw authError('invalid Google token');
  }
  return {
    provider: 'google',
    sub: payload.sub,
    email: payload.email,
    name: payload.name || (payload.email ? String(payload.email).split('@')[0] : 'Anonymous'),
  };
}

// Verify an Apple identity token. Apple only sends the name on first sign-in,
// so the client passes it alongside; the token itself is the source of truth
// for the stable user id.
async function verifyApple(identityToken, fullName) {
  if (!identityToken) throw authError('missing Apple identity token');
  if (APPLE_CLIENT_IDS.length === 0) {
    throw authError('Apple sign-in is not configured (set APPLE_CLIENT_IDS)');
  }
  let payload;
  try {
    ({ payload } = await jwtVerify(identityToken, appleJWKS, {
      issuer: 'https://appleid.apple.com',
      audience: APPLE_CLIENT_IDS,
    }));
  } catch {
    throw authError('invalid Apple token');
  }
  const fallback = payload.email ? String(payload.email).split('@')[0] : 'Anonymous';
  return {
    provider: 'apple',
    sub: payload.sub,
    email: payload.email,
    name: (fullName && fullName.trim()) || fallback,
  };
}

// A local-only login for development, so the app is runnable without real
// OAuth credentials. Disabled unless SPREAD_DEV_AUTH=1.
function verifyDev({ email, name }) {
  if (!DEV_AUTH) throw authError('dev auth is disabled');
  const clean = (email || '').trim().toLowerCase();
  if (!clean) throw authError('email is required');
  return {
    provider: 'dev',
    sub: clean,
    email: clean,
    name: (name && name.trim()) || clean.split('@')[0],
  };
}

// --- Sessions --------------------------------------------------------------

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    Date.now()
  );
  return token;
}

function userIdForToken(token) {
  if (!token) return null;
  const row = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token);
  return row ? row.user_id : null;
}

function destroySession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

module.exports = {
  verifyGoogle,
  verifyApple,
  verifyDev,
  createSession,
  userIdForToken,
  destroySession,
  DEV_AUTH,
};
