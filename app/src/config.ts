import Constants from 'expo-constants';

// Where the Spread backend lives.
//
// Priority:
//   1. EXPO_PUBLIC_API_URL — set this for production / a real deployment.
//   2. The Expo dev-server host — when running in Expo Go on a phone, the
//      bundler host (e.g. 192.168.1.20:8081) is also the LAN IP of this
//      machine, so we point the API at that same host on port 4000.
//   3. localhost — web / simulator fallback.
const PORT = 4000;

function resolveApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const hostUri =
    Constants.expoConfig?.hostUri ??
    // expoGoConfig is present at runtime inside Expo Go but not typed
    (Constants as { expoGoConfig?: { hostUri?: string } }).expoGoConfig?.hostUri ??
    null;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:${PORT}`;
  }

  return `http://localhost:${PORT}`;
}

export const API_URL = resolveApiUrl();
