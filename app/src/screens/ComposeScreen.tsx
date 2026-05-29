import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

const MAX = 280;

type Props = {
  authorName: string;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
};

// The compose sheet: write a sentence and send it out to spread. It's attributed
// to your account name (change that in your profile).
export default function ComposeScreen({ authorName, onClose, onSubmit }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !sending;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not spread that.');
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Feather name="x" size={26} color={colors.inkSoft} />
        </Pressable>
        <Text style={styles.headerTitle}>Spread your wisdom</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        <TextInput
          style={styles.input}
          placeholder="Write something worth passing on…"
          placeholderTextColor={colors.inkFaint}
          value={text}
          onChangeText={(t) => setText(t.slice(0, MAX))}
          multiline
          autoFocus
          textAlignVertical="top"
        />

        <View style={styles.nameRow}>
          <Text style={styles.dash}>—</Text>
          <Text style={styles.nameText}>{authorName}</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.counter}>
          {MAX - text.length}
        </Text>
        <Pressable
          style={[styles.send, !canSend && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!canSend}
        >
          {sending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.sendText}>Spread it</Text>
              <Feather name="send" size={16} color={colors.white} />
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  headerTitle: { fontFamily: fonts.sansSemi, fontSize: 16, color: colors.ink },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  input: {
    fontFamily: fonts.serifMedium,
    fontSize: 28,
    lineHeight: 38,
    color: colors.ink,
    minHeight: 160,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  dash: { fontFamily: fonts.sans, fontSize: 18, color: colors.inkSoft, marginRight: 6 },
  nameText: {
    fontFamily: fonts.sansMedium,
    fontSize: 18,
    color: colors.inkSoft,
    paddingVertical: 4,
  },
  error: { fontFamily: fonts.sans, fontSize: 14, color: colors.accent, marginTop: 16 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  counter: { fontFamily: fonts.sans, fontSize: 15, color: colors.inkFaint },
  send: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  sendDisabled: { backgroundColor: colors.inkFaint },
  sendText: { fontFamily: fonts.sansSemi, fontSize: 16, color: colors.white },
});
