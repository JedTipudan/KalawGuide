import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { BusinessShell } from '../../components/web/BusinessShell';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { formatShortDate } from '../../utils/helpers';

interface NotifRow { id: string; type: string; title: string; body: string; is_read: number; created_at: string; }

const TYPE_ICONS: Record<string, string> = { booking: '📋', verification: '✅', listing: '🏪', general: '🔔' };

export default function WebBusinessNotificationsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<NotifRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const db = await getDatabase();
      setNotifs(await db.getAllAsync<NotifRow>(
        'SELECT id, type, title, body, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [user.id]
      ));
    } finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  function onRefresh() { setRefreshing(true); load(); }

  async function markRead(id: string) {
    const db = await getDatabase();
    await db.runAsync('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  }

  async function markAllRead() {
    if (!user) return;
    const db = await getDatabase();
    await db.runAsync('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [user.id]);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
  }

  const unreadCount = notifs.filter(n => !n.is_read).length;

  return (
    <BusinessShell activeLabel="Notifications">
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={s.pageHeader}>
          <View>
            <Text style={[s.pageTitle, { color: colors.text }]}>Notifications</Text>
            <Text style={[s.pageSub, { color: colors.muted }]}>Booking, verification, and listing updates.</Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={[s.markAllBtn, { borderColor: colors.border }]} onPress={markAllRead}>
              <Text style={[s.markAllText, { color: colors.primary }]}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : notifs.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🔔</Text>
            <Text style={[s.emptyText, { color: colors.muted }]}>No notifications yet.</Text>
          </View>
        ) : (
          <View style={s.list}>
            {notifs.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[s.card, { backgroundColor: item.is_read ? colors.surface : colors.primary + '10', borderColor: colors.border }]}
                onPress={() => markRead(item.id)}
                activeOpacity={0.8}
              >
                <Text style={s.notifIcon}>{TYPE_ICONS[item.type] ?? '🔔'}</Text>
                <View style={s.notifBody}>
                  <Text style={[s.notifTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[s.notifText, { color: colors.muted }]}>{item.body}</Text>
                  <Text style={[s.notifDate, { color: colors.muted }]}>{formatShortDate(item.created_at)}</Text>
                </View>
                {!item.is_read && <View style={[s.unreadDot, { backgroundColor: colors.primary }]} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </BusinessShell>
  );
}

const s = StyleSheet.create({
  content: { padding: 32, gap: 20, paddingBottom: 48 },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pageTitle: { fontSize: 24, fontWeight: '700' },
  pageSub: { fontSize: 14, marginTop: 4 },
  markAllBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  markAllText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15 },
  list: { gap: 10 },
  card: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, padding: 16, gap: 14, borderWidth: 1 },
  notifIcon: { fontSize: 24, marginTop: 2 },
  notifBody: { flex: 1, gap: 4 },
  notifTitle: { fontSize: 15, fontWeight: '600' },
  notifText: { fontSize: 14, lineHeight: 20 },
  notifDate: { fontSize: 12 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
