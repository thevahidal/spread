import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';

import { authApple, authDev, authGoogle, User } from '../api';
import { devAuthEnabled, googleClientIds, googleConfigured } from '../authConfig';
import { colors, fonts } from '../theme';

// Required so the OAuth popup/redirect can hand control back to the app.
WebBrowser.maybeCompleteAuthSession();

type Props = { onAuthed: (token: string, user: User) => void };

// The front door. You must sign in here before any wisdom can be read or
// written.
export default function LoginScreen({ onAuthed }: Props) {
  const [busy, setBusy] = useState<null | 'google' | 'apple' | 'dev'>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [devEmail, setDevEmail] = useState('');

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleClientIds);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
    }
  }, []);

  // Run an auth call, surface failures, and hand the session up on success.
  async function run(kind: NonNullable<typeof busy>, fn: () => Promise<{ token: string; user: User }>) {
    setBusy(kind);
    setError(null);
    try {
      const { token, user } = await fn();
      onAuthed(token, user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
      setBusy(null);
    }
  }

  // Complete Google sign-in once the auth session returns an id token.
  useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) {
      run('google', () => authGoogle(response.params.id_token));
    } else if (response?.type === 'error') {
      setError('Google sign-in was cancelled or failed.');
      setBusy(null);
    }
  }, [response]);

  async function onApple() {
    setBusy('apple');
    setError(null);
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) throw new Error('Apple did not return a token.');
      const fullName = [cred.fullName?.givenName, cred.fullName?.familyName]
        .filter(Boolean)
        .join(' ');
      await run('apple', () => authApple(cred.identityToken!, fullName || undefined));
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setError(e instanceof Error ? e.message : 'Apple sign-in failed.');
      }
      setBusy(null);
    }
  }

  return (
    <View style={styles.fill}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>spread</Text>
        <Text style={styles.tagline}>
          Read a stranger's words.{'\n'}Pass your own wisdom on.
        </Text>
      </View>

      <View style={styles.actions}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.btn, styles.btnLight, (!googleConfigured || !request) && styles.btnDisabled]}
          disabled={!googleConfigured || !request || busy !== null}
          onPress={() => promptAsync()}
        >
          {busy === 'google' ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <>
              <Feather name="chrome" size={20} color={colors.ink} />
              <Text style={styles.btnLightText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        {Platform.OS === 'ios' && appleAvailable ? (
          <Pressable
            style={[styles.btn, styles.btnDark]}
            disabled={busy !== null}
            onPress={onApple}
          >
            {busy === 'apple' ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Feather name="command" size={20} color={colors.white} />
                <Text style={styles.btnDarkText}>Continue with Apple</Text>
              </>
            )}
          </Pressable>
        ) : null}

        {!googleConfigured ? (
          <Text style={styles.hint}>
            Set your Google client IDs in .env to enable sign-in (see README).
          </Text>
        ) : null}

        {devAuthEnabled ? (
          <View style={styles.devBox}>
            <Text style={styles.devLabel}>Developer login</Text>
            <View style={styles.devRow}>
              <TextInput
                style={styles.devInput}
                placeholder="you@example.com"
                placeholderTextColor={colors.inkFaint}
                autoCapitalize="none"
                keyboardType="email-address"
                value={devEmail}
                onChangeText={setDevEmail}
              />
              <Pressable
                style={[styles.devBtn, !devEmail.trim() && styles.btnDisabled]}
                disabled={!devEmail.trim() || busy !== null}
                onPress={() => run('dev', () => authDev(devEmail.trim()))}
              >
                {busy === 'dev' ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Feather name="arrow-right" size={18} color={colors.white} />
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        <Text style={styles.legal}>
          By continuing you agree to share words with strangers, kindly.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 28 },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18 },
  wordmark: { fontFamily: fonts.serifBold, fontSize: 44, color: colors.ink, letterSpacing: 0.5 },
  tagline: {
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    lineHeight: 32,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  actions: { paddingBottom: 36, gap: 14 },
  error: { fontFamily: fonts.sans, fontSize: 14, color: colors.accent, textAlign: 'center' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
  },
  btnLight: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  btnLightText: { fontFamily: fonts.sansSemi, fontSize: 17, color: colors.ink },
  btnDark: { backgroundColor: colors.ink },
  btnDarkText: { fontFamily: fonts.sansSemi, fontSize: 17, color: colors.white },
  btnDisabled: { opacity: 0.5 },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: 19,
  },
  devBox: {
    marginTop: 6,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.paperDeep,
    gap: 8,
  },
  devLabel: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.inkSoft, letterSpacing: 0.4 },
  devRow: { flexDirection: 'row', gap: 8 },
  devInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  devBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legal: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: 4,
  },
});
