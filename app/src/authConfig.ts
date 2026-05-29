// OAuth client configuration. These are public client identifiers (safe to
// ship) — the secret half lives only on Google/Apple's side and the backend
// verifies the signed tokens. Provide them via an `.env` file (see README).
export const googleClientIds = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

export const googleConfigured = Object.values(googleClientIds).some(Boolean);

// Mirrors the backend's SPREAD_DEV_AUTH — shows a local "developer" login so
// the app is usable before real OAuth credentials exist.
export const devAuthEnabled = process.env.EXPO_PUBLIC_DEV_AUTH === '1';
