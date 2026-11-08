import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { now, formatShortDate } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';
import { BookingStatus } from '../../types';

interface BookingRow {
  id: string; status: BookingStatus; requested_date: string | null;
  guest_count: number | null; notes: string | null; created_at: string;
  business_name: string | null; service_name: string | null; owner_note: string | null;
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: '#956112', approved: '#197151', rejected: '#AC3545',
  cancelled: '#57717A', completed: '#075C73',
};
const STATUS_ICONS: Record<BookingStatus, string> = {
  pending: '⏳', approved: '✅', rejected: '❌', cancelled: '🚫', completed: '🏁',
};

export default function BookingHistoryScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const rows = await db.getAllAsync<BookingRow>(`
      SELECT br.id, br.status, br.requested_date, br.guest_count, br.notes, br.created_at, br.owner_note,
             b.name as business_name, bs.name as service_name
      FROM booking_requests br
      LEFT JOIN businesses b ON br.business_id = b.id
      LEFT JOIN business_services bs ON br.service_id = bs.id
      WHERE br.tourist_id = ?
      ORDER BY br.created_at DESC
    `, [user.id]);
    setBookings(rows);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function cancelBooking(id: string) {
    if (Platform.OS === 'web') {
      if (!window.confirm('Cancel this booking request?')) return;
      const db = await getDatabase();
      await db.runAsync("UPDATE booking_requests SET status='cancelled', updated_at=? WHERE id=?", [now(), id]);
      await load();
    } else {
      Alert.alert('Cancel Booking', 'Cancel this booking request?', [
        { text: 'Keep', style: 'cancel' },
        { text: 'Cancel Booking', style: 'destructive', onPress: async () => {
          const db = await getDatabase();
          await db.runAsync("UPDATE booking_requests SET status='cancelled', updated_at=? WHERE id=?", [now(), id]);
          await load();
        }},
      ]);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>My Bookings</Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No bookings yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Browse local businesses and submit a booking request.
            </Text>
            <TouchableOpacity onPress={() => router.push(`${Platform.OS === 'web' ? '/(web)' : '/(tourist)'}/businesses` as any)}>
              <Text style={[styles.browseLink, { color: colors.primary }]}>Browse Businesses →</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status];
          return (
            <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={[styles.bizName, { color: colors.text }]} numberOfLines={1}>
                    🏪 {item.business_name ?? 'Business'}
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
                  <Text style={[styles.submitted, { color: colors.muted }]}>Submitted {formatShortDate(item.created_at)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {STATUS_ICONS[item.status]} {item.status}
                  </Text>
                </View>
              </View>

              {item.owner_note && (
                <View style={[styles.ownerNote, { backgroundColor: colors.subtle }]}>
                  <Text style={[styles.ownerNoteLabel, { color: colors.muted }]}>Business response:</Text>
                  <Text style={[styles.ownerNoteText, { color: colors.text }]}>{item.owner_note}</Text>
                </View>
              )}

              {item.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.danger }]}
                  onPress={() => cancelBooking(item.id)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.danger }]}>Cancel Request</Text>
                </TouchableOpacity>
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
  header: { padding: Spacing.base, gap: Spacing.sm },
  backBtn: { alignSelf: 'flex-start', padding: Spacing.xs },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },
  card: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  cardTop: { flexDirection: 'row', gap: Spacing.md },
  cardInfo: { flex: 1, gap: Spacing.xs },
  bizName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  serviceName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  date: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  guests: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  submitted: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm, alignSelf: 'flex-start' },
  statusText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.semiBold, textTransform: 'capitalize' },
  ownerNote: { borderRadius: Radius.sm, padding: Spacing.md, gap: Spacing.xs },
  ownerNoteLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium },
  ownerNoteText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  cancelBtn: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1 },
  cancelBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  emptySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center', maxWidth: 280 },
  browseLink: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
});
