import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';
import { now, formatShortDate } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';
import { BookingStatus } from '../../types';

interface BookingRow {
  id: string; status: BookingStatus; requested_date: string | null;
  guest_count: number | null; created_at: string;
  tourist_name: string | null; business_name: string | null; service_name: string | null;
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: '#956112', approved: '#197151', rejected: '#AC3545',
  cancelled: '#57717A', completed: '#075C73',
};
const FILTERS: (BookingStatus | 'all')[] = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

export default function AdminBookingManagementScreen() {
  const { colors, isDark } = useTheme();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    const db = await getDatabase();
    const where = filter === 'all' ? '' : `WHERE br.status = '${filter}'`;
    const rows = await db.getAllAsync<BookingRow>(`
      SELECT br.id, br.status, br.requested_date, br.guest_count, br.created_at,
             u.display_name as tourist_name, b.name as business_name, bs.name as service_name
      FROM booking_requests br
      LEFT JOIN users u ON br.tourist_id = u.id
      LEFT JOIN businesses b ON br.business_id = b.id
      LEFT JOIN business_services bs ON br.service_id = bs.id
      ${where}
      ORDER BY br.created_at DESC
    `);
    setBookings(rows);
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function updateStatus(id: string, status: BookingStatus) {
    const db = await getDatabase();
    await db.runAsync("UPDATE booking_requests SET status=?, updated_at=? WHERE id=?", [status, now(), id]);
    await load();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.commandBar, { backgroundColor: colors.surface }]}>
        <Text style={[styles.commandBarTitle, { color: colors.primary }]}>☰ Control Center</Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Booking management</Text>
            <View style={styles.filters}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, { backgroundColor: filter === f ? colors.primary : colors.subtle, borderColor: filter === f ? colors.primary : colors.border }]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterText, { color: filter === f ? colors.onPrimary : colors.text }]}>
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, ...shadow }]}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>No bookings found.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status];
          return (
            <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={[styles.bizName, { color: colors.text }]} numberOfLines={1}>🏪 {item.business_name ?? '—'}</Text>
                  <Text style={[styles.meta, { color: colors.muted }]}>👤 {item.tourist_name ?? '—'}</Text>
                  {item.service_name && <Text style={[styles.meta, { color: colors.muted }]}>🛎 {item.service_name}</Text>}
                  {item.requested_date && <Text style={[styles.meta, { color: colors.muted }]}>📅 {formatShortDate(item.requested_date)}</Text>}
                  <Text style={[styles.meta, { color: colors.muted }]}>Submitted {formatShortDate(item.created_at)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sc + '20' }]}>
                  <Text style={[styles.statusText, { color: sc }]}>{item.status}</Text>
                </View>
              </View>
              {item.status === 'pending' && (
                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.approveBtn, { backgroundColor: '#197151' }]} onPress={() => updateStatus(item.id, 'approved')}>
                    <Text style={styles.actionText}>✓ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.rejectBtn, { borderColor: '#AC3545' }]} onPress={() => updateStatus(item.id, 'rejected')}>
                    <Text style={[styles.rejectText, { color: '#AC3545' }]}>✕ Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  commandBar: { paddingHorizontal: 16, paddingVertical: 16 },
  commandBarTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 18, fontWeight: '700' },
  list: { padding: 16, gap: Spacing.md, paddingBottom: 100 },
  listHeader: { gap: Spacing.md, marginBottom: Spacing.sm },
  pageTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: '700' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.xl, borderWidth: 1 },
  filterText: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  emptyCard: { borderRadius: Radius.md, padding: Spacing.xl, alignItems: 'center' },
  emptyText: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  card: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  cardTop: { flexDirection: 'row', gap: Spacing.md },
  cardInfo: { flex: 1, gap: Spacing.xs },
  bizName: { fontFamily: Typography.fontFamilyBody, fontSize: 15, fontWeight: '600' },
  meta: { fontFamily: Typography.fontFamilyBody, fontSize: 13 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm, alignSelf: 'flex-start' },
  statusText: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: Spacing.md },
  approveBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center' },
  actionText: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  rejectBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1.5 },
  rejectText: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: '600' },
});
