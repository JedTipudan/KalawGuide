import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { BusinessShell } from '../../components/web/BusinessShell';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { now, formatShortDate } from '../../utils/helpers';
import { BookingStatus } from '../../types';

interface BookingRow {
  id: string; status: BookingStatus; requested_date: string | null;
  guest_count: number | null; notes: string | null; created_at: string;
  service_name: string | null; tourist_name: string | null; tourist_email: string | null;
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: '#956112', approved: '#197151', rejected: '#AC3545',
  cancelled: '#57717A', completed: '#075C73',
};

const FILTERS: { label: string; value: BookingStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: '⏳ Pending', value: 'pending' },
  { label: '✅ Approved', value: 'approved' },
  { label: '❌ Rejected', value: 'rejected' },
  { label: '🚫 Cancelled', value: 'cancelled' },
];

export default function WebBusinessBookingsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [bizId, setBizId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const db = await getDatabase();
      const biz = await db.getFirstAsync<{ id: string }>('SELECT id FROM businesses WHERE owner_id = ? LIMIT 1', [user.id]);
      if (!biz) { setLoading(false); return; }
      setBizId(biz.id);
      let query = `
        SELECT br.id, br.status, br.requested_date, br.guest_count, br.notes, br.created_at,
               bs.name as service_name, u.display_name as tourist_name, u.email as tourist_email
        FROM booking_requests br
        LEFT JOIN business_services bs ON br.service_id = bs.id
        LEFT JOIN users u ON br.tourist_id = u.id
        WHERE br.business_id = ?
      `;
      const params: (string | number)[] = [biz.id];
      if (filter !== 'all') { query += ' AND br.status = ?'; params.push(filter); }
      query += ' ORDER BY br.created_at DESC';
      setBookings(await db.getAllAsync<BookingRow>(query, params));
    } finally { setLoading(false); setRefreshing(false); }
  }, [user, filter]);

  useEffect(() => { load(); }, [load]);
  function onRefresh() { setRefreshing(true); load(); }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    if (!window.confirm(`${status === 'approved' ? 'Approve' : 'Reject'} this booking?`)) return;
    const db = await getDatabase();
    await db.runAsync('UPDATE booking_requests SET status=?, updated_at=? WHERE id=?', [status, now(), id]);
    await load();
  }

  return (
    <BusinessShell activeLabel="Booking Requests">
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={[s.pageTitle, { color: colors.text }]}>Booking Requests</Text>
        <Text style={[s.pageSub, { color: colors.muted }]}>Review and respond to tourist booking requests.</Text>

        {/* Filters */}
        <View style={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.value}
              style={[s.chip, { backgroundColor: filter === f.value ? colors.primary : colors.surface, borderColor: filter === f.value ? colors.primary : colors.border }]}
              onPress={() => setFilter(f.value)}>
              <Text style={[s.chipText, { color: filter === f.value ? '#fff' : colors.text }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : !bizId ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={[s.emptyText, { color: colors.muted }]}>Create your business profile first.</Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={[s.emptyText, { color: colors.muted }]}>No bookings found for this filter.</Text>
          </View>
        ) : (
          <View style={[s.table, { borderColor: colors.border }]}>
            <View style={[s.tableHeader, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
              {['Tourist', 'Service', 'Date / Guests', 'Status', 'Actions'].map(h => (
                <Text key={h} style={[s.th, { color: colors.muted }, h === 'Tourist' && { flex: 2 }]}>{h}</Text>
              ))}
            </View>
            {bookings.map(item => {
              const sc = STATUS_COLORS[item.status];
              return (
                <View key={item.id} style={[s.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <View style={[s.cell, { flex: 2 }]}>
                    <Text style={[s.touristName, { color: colors.text }]}>{item.tourist_name ?? 'Tourist'}</Text>
                    <Text style={[s.touristEmail, { color: colors.muted }]}>{item.tourist_email ?? ''}</Text>
                    <Text style={[s.submittedDate, { color: colors.muted }]}>Submitted {formatShortDate(item.created_at)}</Text>
                  </View>
                  <Text style={[s.cell, s.cellText, { color: colors.text }]}>{item.service_name ?? '—'}</Text>
                  <View style={s.cell}>
                    {item.requested_date && <Text style={[s.cellText, { color: colors.text }]}>📅 {formatShortDate(item.requested_date)}</Text>}
                    {item.guest_count ? <Text style={[s.cellText, { color: colors.muted }]}>👥 {item.guest_count} guest{item.guest_count !== 1 ? 's' : ''}</Text> : null}
                    {item.notes ? <Text style={[s.cellText, { color: colors.muted }]} numberOfLines={1}>💬 {item.notes}</Text> : null}
                  </View>
                  <View style={s.cell}>
                    <View style={[s.badge, { backgroundColor: sc + '20' }]}>
                      <Text style={[s.badgeText, { color: sc }]}>{item.status}</Text>
                    </View>
                  </View>
                  <View style={[s.cell, s.actions]}>
                    {item.status === 'pending' && (
                      <>
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#19715120', borderColor: '#197151' }]} onPress={() => updateStatus(item.id, 'approved')}>
                          <Text style={[s.actionText, { color: '#197151' }]}>✅ Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#AC354520', borderColor: '#AC3545' }]} onPress={() => updateStatus(item.id, 'rejected')}>
                          <Text style={[s.actionText, { color: '#AC3545' }]}>❌ Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </BusinessShell>
  );
}

const s = StyleSheet.create({
  content: { padding: 32, gap: 20, paddingBottom: 48 },
  pageTitle: { fontSize: 24, fontWeight: '700' },
  pageSub: { fontSize: 14, marginTop: -12 },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15 },
  table: { borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  th: { flex: 1, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, alignItems: 'center' },
  cell: { flex: 1, paddingRight: 8, gap: 2 },
  cellText: { fontSize: 13 },
  touristName: { fontSize: 14, fontWeight: '600' },
  touristEmail: { fontSize: 12 },
  submittedDate: { fontSize: 11 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: '600' },
});
