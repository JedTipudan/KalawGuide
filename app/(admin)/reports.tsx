import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface ReportStats {
  totalUsers: number; tourists: number; businessOwners: number;
  totalBusinesses: number; approvedBusinesses: number; pendingBusinesses: number;
  totalDestinations: number; featuredDestinations: number;
  totalBookings: number; pendingBookings: number; approvedBookings: number;
  totalExpenses: number; totalBudgetPlans: number;
}

export default function AdminReportsScreen() {
  const { colors, isDark } = useTheme();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
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
    });
  }, []);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const MODULES = stats ? [
    { title: 'Users', items: [
      { label: 'Total Users', value: stats.totalUsers, color: colors.primary },
      { label: 'Tourists', value: stats.tourists, color: colors.accent },
      { label: 'Business Owners', value: stats.businessOwners, color: colors.success },
    ]},
    { title: 'Businesses', items: [
      { label: 'Total Businesses', value: stats.totalBusinesses, color: colors.primary },
      { label: 'Approved', value: stats.approvedBusinesses, color: colors.success },
      { label: 'Pending Verification', value: stats.pendingBusinesses, color: colors.warning },
    ]},
    { title: 'Destinations', items: [
      { label: 'Total Destinations', value: stats.totalDestinations, color: colors.primary },
      { label: 'Featured', value: stats.featuredDestinations, color: colors.accent },
    ]},
    { title: 'Bookings', items: [
      { label: 'Total Bookings', value: stats.totalBookings, color: colors.primary },
      { label: 'Pending', value: stats.pendingBookings, color: colors.warning },
      { label: 'Approved', value: stats.approvedBookings, color: colors.success },
    ]},
    { title: 'Tourist Activity', items: [
      { label: 'Expense Records', value: stats.totalExpenses, color: colors.primary },
      { label: 'Budget Plans', value: stats.totalBudgetPlans, color: colors.accent },
    ]},
  ] : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.commandBar, { backgroundColor: colors.surface }]}>
        <Text style={[styles.commandBarTitle, { color: colors.primary }]}>☰ Control Center</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>Reports and analytics</Text>
        <Text style={[styles.pageSubtitle, { color: '#57717A' }]}>
          Metrics appear when live reporting data is connected.
        </Text>

        <View style={[styles.periodBar, { backgroundColor: colors.surface, borderColor: '#DDE7E7', ...shadow }]}>
          <Text style={[styles.periodText, { color: colors.text }]}>Reporting period ▾    /    All time</Text>
        </View>

        {MODULES.map(module => (
          <View key={module.title} style={styles.moduleSection}>
            <Text style={[styles.moduleTitle, { color: colors.text }]}>{module.title}</Text>
            <View style={styles.moduleGrid}>
              {module.items.map(item => (
                <View key={item.label} style={[styles.statCard, { backgroundColor: colors.surface, ...shadow }]}>
                  <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <Text style={[styles.footnote, { color: colors.muted }]}>
          Charts will use the selected period and include data freshness when available.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  commandBar: { paddingHorizontal: 16, paddingVertical: 16 },
  commandBarTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: Spacing.lg, paddingBottom: 100 },
  pageTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: '700' },
  pageSubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  periodBar: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: Radius.lg, borderWidth: 1 },
  periodText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: '600' },
  moduleSection: { gap: Spacing.md },
  moduleTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 16, fontWeight: '700' },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  statCard: { borderRadius: Radius.md, padding: Spacing.base, alignItems: 'center', gap: Spacing.xs, minWidth: '45%', flex: 1 },
  statValue: { fontFamily: Typography.fontFamilyBody, fontSize: 32, fontWeight: '700' },
  statLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 12, textAlign: 'center' },
  footnote: { fontFamily: Typography.fontFamilyBody, fontSize: 12, textAlign: 'center' },
});
