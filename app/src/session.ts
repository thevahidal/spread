import AsyncStorage from '@react-native-async-storage/async-storage';

// Persisted session token. Spread has no anonymous mode — without a token the
// app shows the login screen.
const KEY = 'spread.session';

export const loadStoredToken = () => AsyncStorage.getItem(KEY);
export const storeToken = (token: string) => AsyncStorage.setItem(KEY, token);
export const clearStoredToken = () => AsyncStorage.removeItem(KEY);
