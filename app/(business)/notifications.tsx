import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { formatShortDate } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface NotifRow {
  id: string; type: string; title: string; body: string;
  is_read: number; created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  booking: '📋', verification: '✅', listing: '🏪', general: '🔔',
};

export default function OwnerNotificationsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<NotifRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const rows = await db.getAllAsync<NotifRow>(
      'SELECT id, type, title, body, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );
    setNotifs(rows);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function markRead(id: string) {
    const db = await getDatabase();
    await db.runAsync('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.utilBar, { backgroundColor: colors.surface }]}>
        <Text style={[styles.utilBarTitle, { color: colors.primary }]}>☰ Owner workspace</Text>
      </View>

      <FlatList
        data={notifs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Owner notifications</Text>
            <Text style={[styles.pageSubtitle, { color: '#57717A' }]}>
              Booking, verification, and listing updates for your business.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, ...shadow }]}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications yet</Text>
            <Text style={[styles.emptyBody, { color: '#57717A' }]}>
              Booking requests and verification updates will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.notifCard,
              { backgroundColor: item.is_read ? colors.surface : colors.primary + '10', ...shadow },
            ]}
            onPress={() => markRead(item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.notifIcon}>{TYPE_ICONS[item.type] ?? '🔔'}</Text>
            <View style={styles.notifBody}>
              <Text style={[styles.notifTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.notifText, { color: '#57717A' }]} numberOfLines={2}>{item.body}</Text>
              <Text style={[styles.notifDate, { color: colors.muted }]}>{formatShortDate(item.created_at)}</Text>
            </View>
            {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  utilBar: { paddingHorizontal: 20, paddingVertical: 18 },
  utilBarTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 16, fontWeight: '700' },
  list: { padding: 20, gap: Spacing.md, paddingBottom: 100 },
  listHeader: { gap: Spacing.sm, marginBottom: Spacing.md },
  pageTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: '700' },
  pageSubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: 15 },
  emptyCard: { borderRadius: 16, padding: 24, alignItems: 'center', gap: Spacing.md },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 18, fontWeight: '600' },
  emptyBody: { fontFamily: Typography.fontFamilyBody, fontSize: 14, textAlign: 'center' },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', borderRadius: Radius.md,
    padding: Spacing.base, gap: Spacing.md,
  },
  notifIcon: { fontSize: 24, marginTop: 2 },
  notifBody: { flex: 1, gap: Spacing.xs },
  notifTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 15, fontWeight: '600' },
  notifText: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  notifDate: { fontFamily: Typography.fontFamilyBody, fontSize: 12 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
