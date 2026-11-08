import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';
import { now, formatShortDate } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';
import { BookingStatus } from '../../types';

interface BookingDetail {
  id: string; status: BookingStatus; requested_date: string | null;
  guest_count: number | null; notes: string | null; created_at: string;
  owner_note: string | null; tourist_name: string | null;
  tourist_email: string | null; service_name: string | null;
  service_price: number | null;
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: '#956112', approved: '#197151', rejected: '#AC3545',
  cancelled: '#57717A', completed: '#075C73',
};

export default function OwnerBookingDetailScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const shadow = isDark ? Shadows.dark.md : Shadows.light.md;

  useEffect(() => {
    if (!id) return;
    async function load() {
      const db = await getDatabase();
      const row = await db.getFirstAsync<BookingDetail>(`
        SELECT br.id, br.status, br.requested_date, br.guest_count, br.notes,
               br.created_at, br.owner_note,
               u.display_name as tourist_name, u.email as tourist_email,
               bs.name as service_name, bs.price as service_price
        FROM booking_requests br
        LEFT JOIN users u ON br.tourist_id = u.id
        LEFT JOIN business_services bs ON br.service_id = bs.id
        WHERE br.id = ?
      `, [id]);
      if (row) setBooking(row);
    }
    load();
  }, [id]);

  async function handleAction(action: 'approved' | 'rejected') {
    if (!booking) return;
    if (action === 'rejected') {
      Alert.alert('Reject Booking', 'Add a note for the tourist (optional):', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject', style: 'destructive',
          onPress: async () => {
            const db = await getDatabase();
            await db.runAsync(
              "UPDATE booking_requests SET status='rejected', updated_at=? WHERE id=?",
              [now(), booking.id]
            );
            router.back();
          },
        },
      ]);
    } else {
      const db = await getDatabase();
      await db.runAsync(
        "UPDATE booking_requests SET status='approved', updated_at=? WHERE id=?",
        [now(), booking.id]
      );
      router.back();
    }
  }

  if (!booking) return null;

  const statusColor = STATUS_COLORS[booking.status];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>Booking Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {booking.status.toUpperCase()}
          </Text>
        </View>

        {/* Details card */}
        <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Request Details</Text>

          {[
            { label: 'Tourist', value: booking.tourist_name ?? '—' },
            { label: 'Email', value: booking.tourist_email ?? '—' },
            { label: 'Service', value: booking.service_name ?? 'Not specified' },
            { label: 'Price', value: booking.service_price != null ? `₱${booking.service_price.toLocaleString()}` : '—' },
            { label: 'Requested Date', value: booking.requested_date ? formatShortDate(booking.requested_date) : 'Not specified' },
            { label: 'Guests', value: booking.guest_count != null ? String(booking.guest_count) : '—' },
            { label: 'Submitted', value: formatShortDate(booking.created_at) },
          ].map(row => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>{row.label}</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{row.value}</Text>
            </View>
          ))}

          {booking.notes ? (
            <View style={[styles.notesBlock, { backgroundColor: colors.subtle }]}>
              <Text style={[styles.notesLabel, { color: colors.muted }]}>Tourist notes</Text>
              <Text style={[styles.notesText, { color: colors.text }]}>{booking.notes}</Text>
            </View>
          ) : null}

          {booking.owner_note ? (
            <View style={[styles.notesBlock, { backgroundColor: colors.subtle }]}>
              <Text style={[styles.notesLabel, { color: colors.muted }]}>Your response</Text>
              <Text style={[styles.notesText, { color: colors.text }]}>{booking.owner_note}</Text>
            </View>
          ) : null}
        </View>

        {/* Actions — only for pending */}
        {booking.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.approveBtn, { backgroundColor: '#197151' }]}
              onPress={() => handleAction('approved')}
            >
              <Text style={styles.actionBtnText}>✓ Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, { borderColor: '#AC3545' }]}
              onPress={() => handleAction('rejected')}
            >
              <Text style={[styles.rejectBtnText, { color: '#AC3545' }]}>✕ Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: 20, paddingVertical: 16 },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: '500' },
  navTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 18, fontWeight: '700' },
  content: { padding: 20, gap: Spacing.lg, paddingBottom: 100 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.xl },
  statusText: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  card: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  cardTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 18, fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  detailLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  detailValue: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  notesBlock: { borderRadius: Radius.sm, padding: Spacing.md, gap: Spacing.xs },
  notesLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: '600' },
  notesText: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  actions: { flexDirection: 'row', gap: Spacing.md },
  approveBtn: { flex: 1, paddingVertical: 13, borderRadius: Radius.lg, alignItems: 'center' },
  actionBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  rejectBtn: { flex: 1, paddingVertical: 13, borderRadius: Radius.lg, alignItems: 'center', borderWidth: 1.5 },
  rejectBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: '600' },
});
