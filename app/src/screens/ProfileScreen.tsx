import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AuthoredSentence, fetchAuthored, renameMe, User } from '../api';
import { colors, fonts } from '../theme';

type Props = {
  user: User;
  onRenamed: (user: User) => void;
  onSignOut: () => void;
  onClose: () => void;
};

// "Your wisdom": who you are, everything you've authored, and how far it has
// travelled. Also where you rename yourself or sign out.
export default function ProfileScreen({ user, onRenamed, onSignOut, onClose }: Props) {
  const [items, setItems] = useState<AuthoredSentence[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(user.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchAuthored()
      .then((data) => alive && setItems(data))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not load.'));
    return () => {
      alive = false;
    };
  }, []);

  async function saveName() {
    const next = draftName.trim();
    if (!next || next === user.name) {
      setEditing(false);
      setDraftName(user.name);
      return;
    }
    setSaving(true);
    try {
      onRenamed(await renameMe(next));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save name.');
    } finally {
      setSaving(false);
    }
  }

  const totalReach = items?.reduce((n, s) => n + s.reach, 0) ?? 0;
  const totalSpreads = items?.reduce((n, s) => n + s.spreads, 0) ?? 0;

  return (
    <View style={styles.fill}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your wisdom</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Feather name="x" size={26} color={colors.inkSoft} />
        </Pressable>
      </View>

      <FlatList
        data={items ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.summary}>
            {editing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.nameInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  autoFocus
                  maxLength={40}
                  onSubmitEditing={saveName}
                  returnKeyType="done"
                />
                <Pressable onPress={saveName} hitSlop={10} style={styles.saveBtn}>
                  {saving ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Feather name="check" size={18} color={colors.white} />
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.nameRow} onPress={() => setEditing(true)}>
                <Text style={styles.summaryName}>{user.name || 'Anonymous'}</Text>
                <Feather name="edit-2" size={16} color={colors.inkFaint} />
              </Pressable>
            )}
            {user.email ? <Text style={styles.email}>{user.email}</Text> : null}

            <View style={styles.statsRow}>
              <Stat
                value={items?.length ?? 0}
                label={(items?.length ?? 0) === 1 ? 'sentence' : 'sentences'}
              />
              <Stat value={totalReach} label="people reached" />
              <Stat value={totalSpreads} label="spreads" />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardText}>{item.text}</Text>
            <View style={styles.cardMeta}>
              <Meta icon="users" value={item.reach} label="reached" />
              <Meta icon="share-2" value={item.spreads} label="spread" />
            </View>
          </View>
        )}
        ListEmptyComponent={
          items === null && !error ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.empty}>{error}</Text>
            </View>
          ) : (
            <View style={styles.center}>
              <Feather name="feather" size={40} color={colors.inkFaint} />
              <Text style={styles.empty}>
                You haven't spread anything yet.{'\n'}Your words will appear here.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <Pressable style={styles.signOut} onPress={onSignOut}>
            <Feather name="log-out" size={16} color={colors.inkSoft} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        }
      />
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Meta({ icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <View style={styles.metaItem}>
      <Feather name={icon} size={14} color={colors.inkSoft} />
      <Text style={styles.metaText}>
        {value} {label}
      </Text>
    </View>
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
  center: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 },
  empty: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 24,
  },
  list: { padding: 20, paddingBottom: 48 },
  summary: { paddingVertical: 16, marginBottom: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryName: { fontFamily: fonts.serifBold, fontSize: 30, color: colors.ink },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameInput: {
    flex: 1,
    fontFamily: fonts.serifBold,
    fontSize: 28,
    color: colors.ink,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.accent,
    paddingVertical: 2,
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSoft, marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 28, marginTop: 20 },
  statValue: { fontFamily: fonts.sansSemi, fontSize: 24, color: colors.accent },
  statLabel: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  cardText: { fontFamily: fonts.serifMedium, fontSize: 20, lineHeight: 28, color: colors.ink },
  cardMeta: { flexDirection: 'row', gap: 18, marginTop: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.inkSoft },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
  },
  signOutText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.inkSoft },
});
