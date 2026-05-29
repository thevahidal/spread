import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fetchNext, Sentence, spreadSentence } from '../api';
import { colors, fonts } from '../theme';

type Props = {
  onOpenCompose: () => void;
  onOpenProfile: () => void;
};

// The heart of Spread: one stranger's sentence at a time. Read it, spread it,
// or move on to the next one.
export default function FeedScreen({ onOpenCompose, onOpenProfile }: Props) {
  const [sentence, setSentence] = useState<Sentence | null>(null);
  const [loading, setLoading] = useState(true);
  const [spreading, setSpreading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSentence(await fetchNext());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  async function handleSpread() {
    if (!sentence || sentence.spread_by_me || spreading) return;
    setSpreading(true);
    // Optimistically reflect the spread, then advance to the next sentence.
    setSentence({ ...sentence, spread_by_me: true, spreads: sentence.spreads + 1 });
    try {
      await spreadSentence(sentence.id);
    } catch {
      /* best-effort: the optimistic state still reads fine */
    }
    setTimeout(() => {
      setSpreading(false);
      loadNext();
    }, 280);
  }

  return (
    <View style={styles.fill}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>spread</Text>
        <Pressable onPress={onOpenProfile} hitSlop={12} style={styles.profileBtn}>
          <Feather name="user" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.stage}>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : error ? (
          <Centered>
            <Text style={styles.message}>{error}</Text>
            <Pressable onPress={loadNext} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </Centered>
        ) : !sentence ? (
          <Centered>
            <Feather name="wind" size={40} color={colors.inkFaint} />
            <Text style={styles.message}>
              You've read everything for now.{'\n'}Why not spread some wisdom of your own?
            </Text>
            <Pressable onPress={onOpenCompose} style={styles.retry}>
              <Text style={styles.retryText}>Write something</Text>
            </Pressable>
          </Centered>
        ) : (
          <>
            <Text
              style={[styles.sentence, sizeFor(sentence.text)]}
              adjustsFontSizeToFit
              numberOfLines={10}
            >
              “{sentence.text}”
            </Text>
            <Text style={styles.author}>— {sentence.author_name}</Text>
          </>
        )}
      </View>

      {sentence && !loading && !error ? (
        <View style={styles.actions}>
          <Pressable
            onPress={handleSpread}
            disabled={sentence.spread_by_me}
            style={[styles.spread, sentence.spread_by_me && styles.spreadDone]}
          >
            <Feather
              name="share-2"
              size={18}
              color={sentence.spread_by_me ? colors.white : colors.accent}
            />
            <Text
              style={[
                styles.spreadText,
                sentence.spread_by_me && styles.spreadTextDone,
              ]}
            >
              {sentence.spread_by_me ? 'Spread' : 'Spread'} · {sentence.spreads}
            </Text>
          </Pressable>

          <Pressable onPress={loadNext} hitSlop={10} style={styles.next}>
            <Text style={styles.nextText}>Next</Text>
            <Feather name="arrow-right" size={16} color={colors.inkSoft} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions} />
      )}

      <Pressable style={styles.fab} onPress={onOpenCompose}>
        <Feather name="edit-2" size={22} color={colors.white} />
      </Pressable>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

// Let short, punchy sentences fill the page while long ones stay readable.
function sizeFor(text: string) {
  if (text.length < 60) return { fontSize: 40, lineHeight: 52 };
  if (text.length < 140) return { fontSize: 32, lineHeight: 44 };
  return { fontSize: 26, lineHeight: 38 };
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  wordmark: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paperDeep,
  },
  stage: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentence: {
    fontFamily: fonts.serifMedium,
    color: colors.ink,
    textAlign: 'center',
  },
  author: {
    fontFamily: fonts.sansMedium,
    fontSize: 17,
    color: colors.inkSoft,
    marginTop: 28,
  },
  centered: { alignItems: 'center', gap: 18 },
  message: {
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 26,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: colors.accent,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.white },
  actions: {
    minHeight: 96,
    paddingHorizontal: 28,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  spread: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  spreadDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  spreadText: { fontFamily: fonts.sansSemi, fontSize: 16, color: colors.accent },
  spreadTextDone: { color: colors.white },
  next: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.inkSoft },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
