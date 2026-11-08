import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { getDatabase } from '../../database/migrations/init';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface Stats {
  tourists: number;
  businessOwners: number;
  pendingBusinesses: number;
  approvedBusinesses: number;
  destinations: number;
  pendingBookings: number;
}

export default function AdminDashboard() {
  const { colors, isDark } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ tourists: 0, businessOwners: 0, pendingBusinesses: 0, approvedBusinesses: 0, destinations: 0, pendingBookings: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      const tourists = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE role='tourist'");
      const owners = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE role='business_owner'");
      const pendingBiz = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM businesses WHERE verification_status='pending'");
      const approvedBiz = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM businesses WHERE verification_status='approved'");
      const dests = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM destinations WHERE is_active=1");
      const pendingBook = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM booking_requests WHERE status='pending'");
      setStats({
        tourists: tourists?.count ?? 0,
        businessOwners: owners?.count ?? 0,
        pendingBusinesses: pendingBiz?.count ?? 0,
        approvedBusinesses: approvedBiz?.count ?? 0,
        destinations: dests?.count ?? 0,
        pendingBookings: pendingBook?.count ?? 0,
      });
    } catch (e) {
      console.error('admin dashboard load error:', e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const STAT_CARDS = [
    { label: 'Tourists', value: stats.tourists, icon: '🧳', color: colors.primary },
    { label: 'Business Owners', value: stats.businessOwners, icon: '🏪', color: colors.accent },
    { label: 'Pending Verification', value: stats.pendingBusinesses, icon: '⏳', color: colors.warning },
    { label: 'Approved Businesses', value: stats.approvedBusinesses, icon: '✅', color: colors.success },
    { label: 'Destinations', value: stats.destinations, icon: '🗺', color: colors.primary },
    { label: 'Pending Bookings', value: stats.pendingBookings, icon: '📋', color: colors.warning },
  ];

  const QUICK_ACTIONS = [
    { icon: '⏳', label: 'Verify Businesses', desc: 'Review pending business submissions', route: '/(admin)/businesses' },
    { icon: '👥', label: 'Manage Users', desc: 'View and manage user accounts', route: '/(admin)/users' },
    { icon: '🗺', label: 'Manage Destinations', desc: 'Add and edit destination listings', route: '/(admin)/destinations' },
    { icon: '📂', label: 'Categories', desc: 'Manage destination categories', route: '/(admin)/categories' },
    { icon: '📋', label: 'Bookings', desc: 'View all platform bookings', route: '/(admin)/bookings' },
    { icon: '📊', label: 'Reports', desc: 'Analytics and platform metrics', route: '/(admin)/reports' },
    { icon: '📝', label: 'Activity Logs', desc: 'Platform-wide activity history', route: '/(admin)/activity-logs' },
    { icon: '⚙️', label: 'Settings', desc: 'Emergency contacts and config', route: '/(admin)/settings' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.appBar}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>Administrator</Text>
            <Text style={[styles.name, { color: colors.text }]}>KalawGuide Admin 🛡</Text>
          </View>
          <View style={[styles.adminBadge, { backgroundColor: colors.danger + '20' }]}>
            <Text style={[styles.adminBadgeText, { color: colors.danger }]}>ADMIN</Text>
          </View>
        </View>

        {stats.pendingBusinesses > 0 && (
          <TouchableOpacity
            style={[styles.alertBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}
            onPress={() => router.push('/(admin)/businesses' as any)}
          >
            <Text style={styles.alertIcon}>⏳</Text>
            <Text style={[styles.alertText, { color: colors.warning }]}>
              {stats.pendingBusinesses} business{stats.pendingBusinesses !== 1 ? 'es' : ''} awaiting verification
            </Text>
            <Text style={[styles.alertArrow, { color: colors.warning }]}>›</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Platform Overview</Text>
        <View style={styles.statsGrid}>
          {STAT_CARDS.map(stat => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface, ...shadow }]}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.actionsList}>
          {QUICK_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionCard, { backgroundColor: colors.surface, ...shadow }]}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <View style={styles.actionText}>
                <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
                <Text style={[styles.actionDesc, { color: colors.muted }]}>{action.desc}</Text>
              </View>
              <Text style={[styles.actionArrow, { color: colors.muted }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <KalawButton label="Sign Out" onPress={signOut} variant="ghost" fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  appBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  greeting: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  name: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  adminBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.sm },
  adminBadgeText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.bold, letterSpacing: 1 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, gap: Spacing.md },
  alertIcon: { fontSize: 20 },
  alertText: { flex: 1, fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  alertArrow: { fontSize: 20 },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  statCard: { width: '47%', borderRadius: Radius.md, padding: Spacing.base, alignItems: 'center', gap: Spacing.xs },
  statIcon: { fontSize: 24 },
  statValue: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h3, fontWeight: Typography.weight.bold },
  statLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, textAlign: 'center' },
  actionsList: { gap: Spacing.md },
  actionCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderRadius: Radius.md, gap: Spacing.md },
  actionIcon: { fontSize: 24, width: 36 },
  actionText: { flex: 1, gap: Spacing.xs },
  actionLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  actionDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  actionArrow: { fontSize: 20 },
});
