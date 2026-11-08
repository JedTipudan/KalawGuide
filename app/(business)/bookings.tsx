import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { now, formatShortDate } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';
import { BookingStatus } from '../../types';

interface BookingRow {
  id: string;
  tourist_id: string;
  service_id: string | null;
  requested_date: string | null;
  guest_count: number | null;
  notes: string | null;
  status: BookingStatus;
  created_at: string;
  service_name: string | null;
  tourist_name: string | null;
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: '#956112',
  approved: '#197151',
  rejected: '#AC3545',
  cancelled: '#57717A',
  completed: '#075C73',
};

const STATUS_ICONS: Record<BookingStatus, string> = {
  pending: '⏳',
  approved: '✅',
  rejected: '❌',
  cancelled: '🚫',
  completed: '🏁',
};

export default function BusinessBookingsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [bizId, setBizId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const biz = await db.getFirstAsync<{ id: string }>('SELECT id FROM businesses WHERE owner_id = ? LIMIT 1', [user.id]);
    if (!biz) return;
    setBizId(biz.id);

    let query = `
      SELECT br.id, br.tourist_id, br.service_id, br.requested_date, br.guest_count,
             br.notes, br.status, br.created_at,
             bs.name as service_name,
             u.display_name as tourist_name
      FROM booking_requests br
      LEFT JOIN business_services bs ON br.service_id = bs.id
      LEFT JOIN users u ON br.tourist_id = u.id
      WHERE br.business_id = ?
    `;
    const params: (string | number)[] = [biz.id];
    if (filter !== 'all') { query += ' AND br.status = ?'; params.push(filter); }
    query += ' ORDER BY br.created_at DESC';

    const rows = await db.getAllAsync<BookingRow>(query, params);
    setBookings(rows);
  }, [user, filter]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    const label = status === 'approved' ? 'Approve' : 'Reject';
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`${label} this booking?`)
      : await new Promise<boolean>(resolve =>
          Alert.alert(
            `${label} Booking`,
            `Are you sure you want to ${status} this booking?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: label, style: status === 'rejected' ? 'destructive' : 'default', onPress: () => resolve(true) },
            ]
          )
        );
    if (!confirmed) return;
    const db = await getDatabase();
    await db.runAsync('UPDATE booking_requests SET status=?, updated_at=? WHERE id=?', [status, now(), id]);
    await load();
  }

  const FILTERS: { label: string; value: BookingStatus | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: '⏳ Pending', value: 'pending' },
    { label: '✅ Approved', value: 'approved' },
    { label: '❌ Rejected', value: 'rejected' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Booking Requests</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, {
              backgroundColor: filter === f.value ? colors.primary : colors.surface,
              borderColor: filter === f.value ? colors.primary : colors.border,
            }]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterLabel, { color: filter === f.value ? colors.onPrimary : colors.text }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!bizId ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No business profile yet</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No bookings found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Booking requests from tourists will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusColor = STATUS_COLORS[item.status];
            return (
              <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
                <TouchableOpacity onPress={() => router.push({ pathname: '/(business)/booking-detail' as any, params: { id: item.id } })} activeOpacity={0.8}>
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.touristName, { color: colors.text }]}>
                      👤 {item.tourist_name ?? 'Tourist'}
                    </Text>
                    {item.service_name && (
                      <Text style={[styles.serviceName, { color: colors.muted }]}>🛎 {item.service_name}</Text>
                    )}
                    {item.requested_date && (
                      <Text style={[styles.date, { color: colors.muted }]}>📅 {formatShortDate(item.requested_date)}</Text>
                    )}
                    {item.guest_count ? (
                      <Text style={[styles.guests, { color: colors.muted }]}>👥 {item.guest_count} guest{item.guest_count !== 1 ? 's' : ''}</Text>
                    ) : null}
                    {item.notes ? (
                      <Text style={[styles.notes, { color: colors.muted }]} numberOfLines={2}>💬 {item.notes}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {STATUS_ICONS[item.status]} {item.status}
                    </Text>
                  </View>
                </View>
                </TouchableOpacity>

                {item.status === 'pending' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.success + '20', borderColor: colors.success }]}
                      onPress={() => updateStatus(item.id, 'approved')}
                    >
                      <Text style={[styles.actionText, { color: colors.success }]}>✅ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}
                      onPress={() => updateStatus(item.id, 'rejected')}
                    >
                      <Text style={[styles.actionText, { color: colors.danger }]}>❌ Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.base, paddingBottom: Spacing.sm },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.xl, borderWidth: 1.5 },
  filterLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },
  card: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  cardTop: { flexDirection: 'row', gap: Spacing.md },
  cardInfo: { flex: 1, gap: Spacing.xs },
  touristName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  serviceName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  date: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  guests: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  notes: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm, alignSelf: 'flex-start' },
  statusText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.semiBold, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: Spacing.md },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1 },
  actionText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  emptySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center', maxWidth: 280 },
});
