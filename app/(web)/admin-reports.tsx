import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { AdminShell } from '../../components/web/AdminShell';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';

interface ReportStats {
  totalUsers: number; tourists: number; businessOwners: number;
  totalBusinesses: number; approvedBusinesses: number; pendingBusinesses: number;
  totalDestinations: number; featuredDestinations: number;
  totalBookings: number; pendingBookings: number; approvedBookings: number;
  totalExpenses: number; totalBudgetPlans: number; totalItineraries: number;
}

export default function WebAdminReportsScreen() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      const q = async (sql: string) => (await db.getFirstAsync<{ count: number }>(sql))?.count ?? 0;
      setStats({
        totalUsers: await q("SELECT COUNT(*) as count FROM users"),
        tourists: await q("SELECT COUNT(*) as count FROM users WHERE role='tourist'"),
        businessOwners: await q("SELECT COUNT(*) as count FROM users WHERE role='business_owner'"),
        totalBusinesses: await q("SELECT COUNT(*) as count FROM businesses"),
        approvedBusinesses: await q("SELECT COUNT(*) as count FROM businesses WHERE verification_status='approved'"),
        pendingBusinesses: await q("SELECT COUNT(*) as count FROM businesses WHERE verification_status='pending'"),
        totalDestinations: await q("SELECT COUNT(*) as count FROM destinations"),
        featuredDestinations: await q("SELECT COUNT(*) as count FROM destinations WHERE is_featured=1"),
        totalBookings: await q("SELECT COUNT(*) as count FROM booking_requests"),
        pendingBookings: await q("SELECT COUNT(*) as count FROM booking_requests WHERE status='pending'"),
        approvedBookings: await q("SELECT COUNT(*) as count FROM booking_requests WHERE status='approved'"),
        totalExpenses: await q("SELECT COUNT(*) as count FROM expenses"),
        totalBudgetPlans: await q("SELECT COUNT(*) as count FROM budget_plans"),
        totalItineraries: await q("SELECT COUNT(*) as count FROM itineraries"),
      });
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const MODULES = stats ? [
    {
      title: 'Users', color: colors.primary,
      items: [
        { label: 'Total Users', value: stats.totalUsers },
        { label: 'Tourists', value: stats.tourists },
        { label: 'Business Owners', value: stats.businessOwners },
      ],
    },
    {
      title: 'Businesses', color: '#197151',
      items: [
        { label: 'Total Businesses', value: stats.totalBusinesses },
        { label: 'Approved', value: stats.approvedBusinesses },
        { label: 'Pending Verification', value: stats.pendingBusinesses },
      ],
    },
    {
      title: 'Destinations', color: '#075C73',
      items: [
        { label: 'Total Destinations', value: stats.totalDestinations },
        { label: 'Featured', value: stats.featuredDestinations },
      ],
    },
    {
      title: 'Bookings', color: '#956112',
      items: [
        { label: 'Total Bookings', value: stats.totalBookings },
        { label: 'Pending', value: stats.pendingBookings },
        { label: 'Approved', value: stats.approvedBookings },
      ],
    },
    {
      title: 'Tourist Activity', color: colors.accent,
      items: [
        { label: 'Expense Records', value: stats.totalExpenses },
        { label: 'Budget Plans', value: stats.totalBudgetPlans },
        { label: 'Itineraries', value: stats.totalItineraries },
      ],
    },
  ] : [];

  return (
    <AdminShell activeLabel="Reports & Analytics">
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={[s.pageTitle, { color: colors.text }]}>Reports & Analytics</Text>
        <Text style={[s.pageSub, { color: colors.muted }]}>Platform-wide statistics. Pull to refresh for latest counts.</Text>

        {!stats ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          MODULES.map(module => (
            <View key={module.title} style={s.module}>
              <Text style={[s.moduleTitle, { color: colors.text }]}>{module.title}</Text>
              <View style={s.moduleGrid}>
                {module.items.map(item => (
                  <View key={item.label} style={[s.statCard, { backgroundColor: colors.surface }]}>
                    <Text style={[s.statValue, { color: module.color }]}>{item.value}</Text>
                    <Text style={[s.statLabel, { color: colors.muted }]}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}

        <Text style={[s.footnote, { color: colors.muted }]}>
          All counts reflect the local SQLite database on this device.
        </Text>
      </ScrollView>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  content: { padding: 32, gap: 28, paddingBottom: 48 },
  pageTitle: { fontSize: 24, fontWeight: '700' },
  pageSub: { fontSize: 14, marginTop: -16 },
  module: { gap: 12 },
  moduleTitle: { fontSize: 16, fontWeight: '700' },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statCard: { borderRadius: 12, padding: 20, alignItems: 'center', gap: 6, minWidth: 160, flex: 1 },
  statValue: { fontSize: 36, fontWeight: '700' },
  statLabel: { fontSize: 12, textAlign: 'center' },
  footnote: { fontSize: 12, textAlign: 'center' },
});
