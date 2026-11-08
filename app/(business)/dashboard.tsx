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
import { BusinessVerificationStatus } from '../../types';

interface BusinessRow {
  id: string;
  name: string;
  category: string;
  verification_status: BusinessVerificationStatus;
  verification_note: string | null;
}

interface ListingStats { total: number; published: number; pending: number; rejected: number; }

const STATUS_CONFIG: Record<BusinessVerificationStatus, { label: string; color: string; icon: string }> = {
  not_submitted: { label: 'Not Submitted', color: '#57717A', icon: '📝' },
  pending: { label: 'Pending Review', color: '#956112', icon: '⏳' },
  approved: { label: 'Approved', color: '#197151', icon: '✅' },
  rejected: { label: 'Rejected', color: '#AC3545', icon: '❌' },
  suspended: { label: 'Suspended', color: '#AC3545', icon: '⛔' },
};

export default function BusinessDashboard() {
  const { colors, isDark } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [stats, setStats] = useState<ListingStats>({ total: 0, published: 0, pending: 0, rejected: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const db = await getDatabase();
      const biz = await db.getFirstAsync<BusinessRow>(
        'SELECT id, name, category, verification_status, verification_note FROM businesses WHERE owner_id = ? LIMIT 1',
        [user.id]
      );
      setBusiness(biz ?? null);

      const total = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM businesses WHERE owner_id = ?', [user.id]);
      const published = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM businesses WHERE owner_id = ? AND verification_status = 'approved'", [user.id]);
      const pending = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM businesses WHERE owner_id = ? AND verification_status = 'pending'", [user.id]);
      const rejected = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM businesses WHERE owner_id = ? AND verification_status = 'rejected'", [user.id]);
      setStats({
        total: total?.count ?? 0,
        published: published?.count ?? 0,
        pending: pending?.count ?? 0,
        rejected: rejected?.count ?? 0,
      });
    } catch (e) {
      console.error('business dashboard load error:', e);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const firstName = user?.displayName?.split(' ')[0] ?? 'Owner';
  const statusCfg = business
    ? STATUS_CONFIG[business.verification_status]
    : STATUS_CONFIG.not_submitted;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.appBar}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>Business Portal</Text>
            <Text style={[styles.name, { color: colors.text }]}>Hello, {firstName} 👋</Text>
          </View>
          <TouchableOpacity
            style={[styles.avatar, { backgroundColor: colors.primary }]}
            onPress={signOut}
            accessibilityLabel="Sign out"
          >
            <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
              {firstName[0].toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* No business yet */}
        {!business ? (
          <View style={[styles.setupCard, { backgroundColor: colors.surface, ...shadow }]}>
            <Text style={styles.setupIcon}>🏪</Text>
            <Text style={[styles.setupTitle, { color: colors.text }]}>Set Up Your Business</Text>
            <Text style={[styles.setupBody, { color: colors.muted }]}>
              Create your business profile to start listing your establishment and reaching tourists in Mati City.
            </Text>
            <KalawButton
              label="Create Business Profile"
              onPress={() => router.push('/(business)/profile' as any)}
              fullWidth
              size="lg"
            />
          </View>
        ) : (
          <>
            {/* Business name + status */}
            <View style={[styles.bizCard, { backgroundColor: colors.surface, ...shadow }]}>
              <View style={styles.bizHeader}>
                <View style={styles.bizInfo}>
                  <Text style={[styles.bizName, { color: colors.text }]} numberOfLines={1}>
                    {business.name}
                  </Text>
                  <Text style={[styles.bizCategory, { color: colors.muted }]}>
                    {business.category.replace('_', ' ')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.editBtn, { borderColor: colors.border }]}
                  onPress={() => router.push('/(business)/profile' as any)}
                >
                  <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.statusRow, { backgroundColor: statusCfg.color + '15', borderColor: statusCfg.color + '40' }]}>
                <Text style={styles.statusIcon}>{statusCfg.icon}</Text>
                <View style={styles.statusText}>
                  <Text style={[styles.statusLabel, { color: statusCfg.color }]}>
                    {statusCfg.label}
                  </Text>
                  {business.verification_note ? (
                    <Text style={[styles.statusNote, { color: colors.muted }]}>
                      {business.verification_note}
                    </Text>
                  ) : null}
                </View>
              </View>

              {business.verification_status === 'not_submitted' && (
                <KalawButton
                  label="Submit for Verification"
                  onPress={() => router.push('/(business)/profile' as any)}
                  fullWidth
                />
              )}
            </View>

            {/* Listing stats */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Listings Overview</Text>
            <View style={styles.statsRow}>
              {[
                { label: 'Total', value: stats.total, color: colors.primary },
                { label: 'Published', value: stats.published, color: colors.success },
                { label: 'Pending', value: stats.pending, color: colors.warning },
                { label: 'Rejected', value: stats.rejected, color: colors.danger },
              ].map(stat => (
                <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface, ...shadow }]}>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Quick links */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Manage</Text>
            <View style={styles.quickLinks}>
              {[
                { icon: '📋', label: 'My Listings', route: '/(business)/listings' },
                { icon: '💰', label: 'Prices', route: '/(business)/prices' },
                { icon: '🏗', label: 'Facilities', route: '/(business)/facilities' },
                { icon: '📷', label: 'Photos', route: '/(business)/photos' },
                { icon: '🔔', label: 'Notifications', route: '/(business)/notifications' },
                { icon: '⚙️', label: 'Account Settings', route: '/(business)/account-settings' },
              ].map(item => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.quickLink, { backgroundColor: colors.surface, ...shadow }]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickLinkIcon}>{item.icon}</Text>
                  <Text style={[styles.quickLinkLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.quickLinkArrow, { color: colors.muted }]}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

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
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  setupCard: { borderRadius: Radius.md, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  setupIcon: { fontSize: 48 },
  setupTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold, textAlign: 'center' },
  setupBody: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center', lineHeight: Typography.size.body * Typography.lineHeight },
  bizCard: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  bizHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bizInfo: { flex: 1, gap: Spacing.xs },
  bizName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  bizCategory: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textTransform: 'capitalize' },
  editBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1 },
  editBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  statusRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, gap: Spacing.md },
  statusIcon: { fontSize: 20 },
  statusText: { flex: 1, gap: Spacing.xs },
  statusLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  statusNote: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', gap: Spacing.xs },
  statValue: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  statLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label },
  quickLinks: { gap: Spacing.sm },
  quickLink: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderRadius: Radius.md, gap: Spacing.md },
  quickLinkIcon: { fontSize: 22, width: 32 },
  quickLinkLabel: { flex: 1, fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg },
  quickLinkArrow: { fontSize: 20 },
});
