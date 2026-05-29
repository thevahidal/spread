# Spread

> Open the app, read a sentence a stranger left behind, and pass your own
> wisdom on. When a sentence moves you, **spread** it — and it travels to more
> people.

Spread is a tiny, typography-first app. One sentence at a time, full screen.
No feeds to scroll, no profiles to curate — just words worth passing on.

```
                spread                    (you)

         “We suffer more often in
          imagination than in reality.”

                — Seneca

            ( ↗  Spread · 12 )
                  Next →

                                          ( ✎ )
```

## What it does

- **Sign in** — with Google (everywhere) or Apple (on iOS). You must be signed
  in to read or write wisdom.
- **Read** — every time you open the app it surfaces one sentence someone else
  wrote, ranked by how far it has already spread.
- **Spread** — like a sentence and it gets shown to more people (and the
  author's *reach* grows).
- **Write** — tap the pen to author your own sentence and send it out.
- **Your wisdom** — the person icon (top-right) opens a page of everything
  you've written and how many people each piece has reached and been spread by.

## Stack

| Part        | Tech                                                              |
|-------------|-------------------------------------------------------------------|
| `app/`      | Expo (React Native + TypeScript), Playfair Display + Inter fonts |
| `server/`   | Node + Express, `node:sqlite` (built in — no native build step)  |

The backend stores users, sentences, **impressions** (which grow *reach*) and
**spreads** (likes), and serves a per-user feed of unseen sentences.

## Signing in

**You must be signed in to read or write wisdom** — every wisdom endpoint
requires a session.

- **Google** — on every platform, via `expo-auth-session`.
- **Apple** — on iOS, via `expo-apple-authentication` (the button only shows on
  Apple devices).

How it works: the app gets a signed **ID token** from Google/Apple and posts it
to the backend. The backend verifies that token's signature against the
provider's public keys (`jose`), then issues its own opaque **session token**
that the app sends as `Authorization: Bearer …` on every request.

## Run it

You need **two terminals**: one for the API, one for the app.

### Fastest path (no OAuth setup): developer login

OAuth needs real credentials from the Google/Apple consoles. To try the app
*right now* without them, use the built-in developer login (sign in with just an
email — **never enable this in production**):

```bash
# Terminal 1 — backend
cd server && npm install && npm run seed && npm run dev   # dev auth ON, :4000

# Terminal 2 — app
cd app && npm install
EXPO_PUBLIC_DEV_AUTH=1 npm start    # press w (web), i (iOS sim), or scan the QR
```

A "Developer login" box appears on the sign-in screen — enter any email to get in.

### Real sign-in (Google / Apple)

1. **Google** — in the [Google Cloud Console](https://console.cloud.google.com/)
   create OAuth client IDs (iOS, Android, Web). Put the public client IDs in
   `app/.env` (`EXPO_PUBLIC_GOOGLE_*`) and the same IDs, comma-separated, in
   `server/.env` as `GOOGLE_CLIENT_IDS`.
2. **Apple** — enable "Sign in with Apple" for the app's bundle id
   (`com.spread.app` in `app.json`). Set `server/.env` →
   `APPLE_CLIENT_IDS=com.spread.app`. Apple sign-in requires a real iOS build
   (a dev/EAS build — it isn't available in the web preview).
3. Copy the example env files and fill them in:

   ```bash
   cp server/.env.example server/.env
   cp app/.env.example app/.env
   ```

4. Run `npm start` (server) and `npm start` (app) as usual.

The app auto-points at the backend: **localhost** on web/simulator, the **Expo
dev-server LAN host** on a physical phone, or `EXPO_PUBLIC_API_URL` if set.

## API

All `/api` routes except health and the `/api/auth/*` endpoints require
`Authorization: Bearer <session token>`.

| Method | Path                        | Auth | Purpose                              |
|--------|-----------------------------|:----:|--------------------------------------|
| POST   | `/api/auth/google`          |  —   | Exchange a Google ID token → session |
| POST   | `/api/auth/apple`           |  —   | Exchange an Apple identity token → session |
| POST   | `/api/auth/dev`             |  —   | Developer login (only if `SPREAD_DEV_AUTH=1`) |
| POST   | `/api/auth/logout`          |  ✓   | Destroy the current session          |
| GET    | `/api/me`                   |  ✓   | Current user                         |
| PATCH  | `/api/me`                   |  ✓   | Rename yourself                      |
| GET    | `/api/me/sentences`         |  ✓   | Your authored wisdom + stats         |
| GET    | `/api/feed`                 |  ✓   | Next unseen sentence (records reach) |
| POST   | `/api/sentences`            |  ✓   | Author a sentence                    |
| POST   | `/api/sentences/:id/spread` |  ✓   | Spread (like) a sentence             |
