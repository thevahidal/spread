import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

import { colors } from './src/theme';
import { clearStoredToken, loadStoredToken, storeToken } from './src/session';
import { createSentence, fetchMe, logout, setToken, User } from './src/api';
import LoginScreen from './src/screens/LoginScreen';
import FeedScreen from './src/screens/FeedScreen';
import ComposeScreen from './src/screens/ComposeScreen';
import ProfileScreen from './src/screens/ProfileScreen';

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // null = still checking for a stored session.
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Rehydrate a stored session on launch and confirm it's still valid.
  useEffect(() => {
    (async () => {
      const stored = await loadStoredToken();
      if (stored) {
        setToken(stored);
        try {
          setUser(await fetchMe());
        } catch {
          await clearStoredToken();
          setToken(null);
        }
      }
      setChecking(false);
    })();
  }, []);

  async function handleAuthed(token: string, signedIn: User) {
    await storeToken(token);
    setToken(token);
    setUser(signedIn);
  }

  async function handleSignOut() {
    try {
      await logout();
    } catch {
      /* best effort — clear locally regardless */
    }
    await clearStoredToken();
    setToken(null);
    setUser(null);
    setProfileOpen(false);
  }

  async function handleCompose(text: string) {
    await createSentence(text);
    setComposeOpen(false);
  }

  if (!fontsLoaded || checking) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.accent} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <StatusBar style="dark" />

        {!user ? (
          <LoginScreen onAuthed={handleAuthed} />
        ) : (
          <>
            <FeedScreen
              onOpenCompose={() => setComposeOpen(true)}
              onOpenProfile={() => setProfileOpen(true)}
            />

            <Modal
              visible={composeOpen}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setComposeOpen(false)}
            >
              <ComposeScreen
                authorName={user.name}
                onClose={() => setComposeOpen(false)}
                onSubmit={handleCompose}
              />
            </Modal>

            <Modal
              visible={profileOpen}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setProfileOpen(false)}
            >
              <ProfileScreen
                user={user}
                onRenamed={setUser}
                onSignOut={handleSignOut}
                onClose={() => setProfileOpen(false)}
              />
            </Modal>
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  splash: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
