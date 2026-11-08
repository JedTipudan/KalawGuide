import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';
import { formatShortDate } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface LogEntry {
  id: string; user_id: string; action: string; entity_type: string;
  entity_id: string; entity_name: string | null; details: string | null;
  created_at: string; user_email: string | null;
}

const ACTION_ICONS: Record<string, string> = {
  submitted_for_approval: '📤',
  approved: '✅',
  rejected: '❌',
  suspended: '⛔',
  price_added: '💰',
  listing_created: '🏪',
  listing_updated: '✏️',
  photo_uploaded: '📷',
  featured_changed: '⭐',
};

export default function AdminActivityLogsScreen() {
  const { colors, isDark } = useTheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<LogEntry>(`
      SELECT al.id, al.user_id, al.action, al.entity_type, al.entity_id,
             al.entity_name, al.details, al.created_at, u.email as user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC LIMIT 100
    `);
    setLogs(rows);
  }, []);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.commandBar, { backgroundColor: colors.surface }]}>
        <Text style={[styles.commandBarTitle, { color: colors.primary }]}>☰ Control Center</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Activity logs</Text>
            <Text style={[styles.pageSubtitle, { color: '#57717A' }]}>
              Platform-wide activity and system events.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, ...shadow }]}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No activity yet</Text>
            <Text style={[styles.emptyBody, { color: '#57717A' }]}>
              Platform events will appear here as users interact with the app.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.logCard, { backgroundColor: colors.surface, ...shadow }]}>
            <View style={[styles.logIconWrap, { backgroundColor: colors.subtle }]}>
              <Text style={styles.logIcon}>{ACTION_ICONS[item.action] ?? '📝'}</Text>
            </View>
            <View style={styles.logBody}>
              <Text style={[styles.logTitle, { color: colors.text }]}>
                {item.entity_name ?? item.entity_id} — {item.action.replace(/_/g, ' ')}
              </Text>
              <Text style={[styles.logText, { color: '#57717A' }]} numberOfLines={2}>
                {item.details ?? `${item.entity_type} · ${item.user_email ?? item.user_id}`}
              </Text>
              <Text style={[styles.logDate, { color: colors.muted }]}>{formatShortDate(item.created_at)}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  commandBar: { paddingHorizontal: 16, paddingVertical: 16 },
  commandBarTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 18, fontWeight: '700' },
  list: { padding: 16, gap: Spacing.md, paddingBottom: 100 },
  listHeader: { gap: Spacing.sm, marginBottom: Spacing.md },
  pageTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: '700' },
  pageSubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  emptyCard: { borderRadius: 16, padding: 24, alignItems: 'center', gap: Spacing.md },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 18, fontWeight: '600' },
  emptyBody: { fontFamily: Typography.fontFamilyBody, fontSize: 14, textAlign: 'center' },
  logCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  logIconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  logIcon: { fontSize: 20 },
  logBody: { flex: 1, gap: Spacing.xs },
  logTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: '600' },
  logText: { fontFamily: Typography.fontFamilyBody, fontSize: 13 },
  logDate: { fontFamily: Typography.fontFamilyBody, fontSize: 12 },
});
