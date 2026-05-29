# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the project

Two terminals are needed:

```bash
# Terminal 1 — backend (dev mode enables /api/auth/dev)
cd server && npm install && npm run seed && npm run dev   # listens on :4000

# Terminal 2 — app
cd app && npm install
EXPO_PUBLIC_DEV_AUTH=1 npm start    # press w (web), i (iOS sim), or scan QR
```

`npm run seed` is only needed once (or to reset the database). `npm run dev` sets `SPREAD_DEV_AUTH=1`, which enables developer login — never use it in production.

For real OAuth, copy the example env files and fill in credentials:
```bash
cp server/.env.example server/.env
cp app/.env.example app/.env
```

## Architecture

The repo has two independent packages: `server/` and `app/`.

**`server/`** — Node + Express API (CommonJS, no build step)
- `src/db.js` — opens a single `node:sqlite` `DatabaseSync` instance, creates the schema (users, sentences, impressions, spreads, sessions tables), and runs any needed column migrations on startup.
- `src/store.js` — all DB reads/writes. The feed algorithm (`nextForUser`) excludes sentences the user authored or has already seen, orders by `spreads DESC`, and records an impression atomically on each fetch.
- `src/auth.js` — verifies Google/Apple JWTs via `jose` (JWKS fetched remotely), issues opaque 32-byte hex session tokens stored in the `sessions` table, and provides `verifyDev` when `SPREAD_DEV_AUTH=1`.
- `src/index.js` — Express routes. Every authenticated route runs through the `requireAuth` middleware which looks up the `Authorization: Bearer` token in the sessions table and attaches `req.userId`.

**`app/`** — Expo (React Native + TypeScript)
- `App.tsx` — root component. Manages global auth state (`user`, `checking`). Rehydrates a stored session token via `AsyncStorage` on launch and validates it against `GET /api/me`. Compose and Profile screens are `Modal`s layered over the `FeedScreen`.
- `src/api.ts` — all HTTP calls. The session token lives as a module-level variable set by `setToken()`; `App.tsx` is responsible for persisting it to device storage.
- `src/config.ts` — resolves `API_URL`: explicit `EXPO_PUBLIC_API_URL` → Expo dev-server LAN host on port 4000 → `localhost:4000`.
- `src/authConfig.ts` — reads Google client IDs and `EXPO_PUBLIC_DEV_AUTH` from env.
- `src/screens/` — `LoginScreen`, `FeedScreen`, `ComposeScreen`, `ProfileScreen`.
- `src/theme.ts` — shared colors. Typography uses Playfair Display (wisdom text) and Inter (UI chrome).

**Auth flow**: The app obtains a signed ID token from Google/Apple, posts it to the backend, which verifies it against the provider's JWKS and returns a Spread session token. The app stores that token in `AsyncStorage` and sends it as `Authorization: Bearer` on every subsequent request.

**Expo version note**: Check the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any Expo-related code — APIs change between versions.
