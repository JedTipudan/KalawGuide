import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AdminShell } from '../../components/web/AdminShell';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';

interface Stats {
  users: number; businesses: number; pendingVerifications: number;
  destinations: number; bookings: number;
}

export default function WebAdminDashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ users: 0, businesses: 0, pendingVerifications: 0, destinations: 0, bookings: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      const [users, biz, pending, dests, bookings] = await Promise.all([
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM users'),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM businesses'),
        db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM businesses WHERE verification_status='pending'"),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM destinations WHERE is_active=1'),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM booking_requests'),
      ]);
      setStats({
        users: users?.count ?? 0, businesses: biz?.count ?? 0,
        pendingVerifications: pending?.count ?? 0,
        destinations: dests?.count ?? 0, bookings: bookings?.count ?? 0,
      });
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const METRICS = [
    { label: 'Registered users', value: stats.users },
    { label: 'Registered businesses', value: stats.businesses },
    { label: 'Pending verifications', value: stats.pendingVerifications },
    { label: 'Destinations', value: stats.destinations },
    { label: 'Booking requests', value: stats.bookings },
    { label: 'Platform activity', value: 0 },
  ];

  return (
    <AdminShell activeLabel="Dashboard">
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={[s.breadcrumb, { color: colors.accent }]}>PLATFORM / ADMIN DASHBOARD</Text>
        <Text style={[s.pageTitle, { color: colors.text }]}>Platform overview</Text>
        <Text style={[s.pageSub, { color: colors.muted }]}>An organized view of platform health, review queues, and recent changes.</Text>

        <View style={s.metricsGrid}>
          {METRICS.map(m => (
            <View key={m.label} style={[s.metricCard, { backgroundColor: colors.surface }]}>
              <Text style={[s.metricLabel, { color: colors.muted }]}>{m.label}</Text>
              <Text style={[s.metricValue, { color: colors.primary }]}>{m.value > 0 ? m.value : '—'}</Text>
              <Text style={[s.metricSub, { color: colors.muted }]}>{m.value > 0 ? '' : 'Awaiting live data'}</Text>
            </View>
          ))}
        </View>

        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Your review workspace</Text>
          {[
            'Business verification · Review submitted documents',
            'Destination information · Check facts before publishing',
            'Emergency contacts · Maintain source and verification dates',
            'Media moderation · Review reported or submitted images',
          ].map(line => (
            <Text key={line} style={[s.cardLine, { color: colors.muted }]}>{line}</Text>
          ))}
          <TouchableOpacity
            style={[s.cardBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(web)/admin-businesses' as any)}
          >
            <Text style={[s.cardBtnText, { color: colors.onPrimary }]}>Open verification queue</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Activity will appear when connected</Text>
          <Text style={[s.cardLine, { color: colors.muted }]}>
            Registrations, approvals, destination edits, price updates, and account actions are recorded here.
          </Text>
        </View>
      </ScrollView>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  content: { padding: 32, gap: 24, paddingBottom: 48 },
  breadcrumb: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  pageTitle: { fontSize: 32, fontWeight: '700' },
  pageSub: { fontSize: 14, lineHeight: 20 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  metricCard: { width: 377, borderRadius: 12, padding: 24, gap: 8 },
  metricLabel: { fontSize: 12 },
  metricValue: { fontSize: 32, fontWeight: '700' },
  metricSub: { fontSize: 11 },
  card: { borderRadius: 12, padding: 24, gap: 12 },
  cardTitle: { fontSize: 22, fontWeight: '700' },
  cardLine: { fontSize: 14, lineHeight: 20 },
  cardBtn: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', marginTop: 4 },
  cardBtnText: { fontSize: 14, fontWeight: '600' },
});
