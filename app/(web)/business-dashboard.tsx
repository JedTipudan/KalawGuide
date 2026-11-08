import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { BusinessShell } from '../../components/web/BusinessShell';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { BusinessVerificationStatus } from '../../types';

interface BusinessRow {
  id: string; name: string; category: string;
  verification_status: BusinessVerificationStatus; verification_note: string | null;
}
interface BookingCount { pending: number; approved: number; total: number; }

const STATUS_CONFIG: Record<BusinessVerificationStatus, { label: string; color: string }> = {
  not_submitted: { label: 'Not submitted', color: '#57717A' },
  pending: { label: 'Pending verification', color: '#956112' },
  approved: { label: 'Approved', color: '#197151' },
  rejected: { label: 'Rejected', color: '#AC3545' },
  suspended: { label: 'Suspended', color: '#AC3545' },
};

export default function WebBusinessDashboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [bookings, setBookings] = useState<BookingCount>({ pending: 0, approved: 0, total: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const db = await getDatabase();
      const biz = await db.getFirstAsync<BusinessRow>(
        'SELECT id, name, category, verification_status, verification_note FROM businesses WHERE owner_id = ? LIMIT 1',
        [user.id]
      );
      setBusiness(biz ?? null);
      if (biz) {
        const [pending, approved, total] = await Promise.all([
          db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM booking_requests WHERE business_id=? AND status='pending'", [biz.id]),
          db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM booking_requests WHERE business_id=? AND status='approved'", [biz.id]),
          db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM booking_requests WHERE business_id=?', [biz.id]),
        ]);
        setBookings({ pending: pending?.count ?? 0, approved: approved?.count ?? 0, total: total?.count ?? 0 });
      }
    } catch (e) { console.error(e); }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const statusCfg = business ? STATUS_CONFIG[business.verification_status] : STATUS_CONFIG.not_submitted;

  return (
    <BusinessShell activeLabel="Dashboard">
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={[s.pageTitle, { color: colors.text }]}>Your business, ready for what's next.</Text>
        <Text style={[s.pageSub, { color: colors.muted }]}>Manage your listing, prices, and requests from one place.</Text>

        {/* Verification banner */}
        {business && business.verification_status !== 'approved' && (
          <View style={[s.verifyBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
            <Text style={[s.verifyBannerTitle, { color: colors.warning }]}>🟡 Your business is awaiting approval</Text>
            <Text style={[s.verifyBannerSub, { color: colors.muted }]}>
              Prepare your profile while an administrator reviews your information. Your listing stays unpublished until approved.
            </Text>
            <TouchableOpacity style={[s.verifyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/(web)/business-profile' as any)}>
              <Text style={[s.verifyBtnText, { color: colors.text }]}>View verification status</Text>
            </TouchableOpacity>
          </View>
        )}

        {!business ? (
          <View style={[s.setupCard, { backgroundColor: colors.surface }]}>
            <Text style={[s.setupTitle, { color: colors.text }]}>Set Up Your Business</Text>
            <Text style={[s.setupSub, { color: colors.muted }]}>Create your business profile to start receiving bookings.</Text>
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/(web)/business-profile' as any)}>
              <Text style={[s.primaryBtnText, { color: colors.onPrimary }]}>Create Business Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Stats */}
            <View style={s.statsRow}>
              {[
                { label: 'Total requests', value: bookings.total },
                { label: 'Pending requests', value: bookings.pending },
                { label: 'Approved bookings', value: bookings.approved },
              ].map(stat => (
                <View key={stat.label} style={[s.statCard, { backgroundColor: colors.surface }]}>
                  <Text style={[s.statLabel, { color: colors.muted }]}>{stat.label}</Text>
                  <Text style={[s.statValue, { color: colors.primary }]}>{stat.value > 0 ? stat.value : '—'}</Text>
                </View>
              ))}
            </View>

            {/* Two col */}
            <View style={s.twoCol}>
              <View style={[s.checklistCard, { backgroundColor: colors.surface }]}>
                <Text style={[s.cardTitle, { color: colors.text }]}>Your profile checklist</Text>
                {[
                  { label: 'Business name added', done: true },
                  { label: 'Add contact details and hours', done: false },
                  { label: 'Add products and services', done: false },
                  { label: 'Publish current prices', done: false },
                  { label: 'Submit required documents', done: false },
                ].map(item => (
                  <Text key={item.label} style={[s.checklistItem, { color: colors.muted }]}>
                    {item.done ? '✓' : '○'} {item.label}
                  </Text>
                ))}
                <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/(web)/business-profile' as any)}>
                  <Text style={[s.primaryBtnText, { color: colors.onPrimary }]}>Complete my profile</Text>
                </TouchableOpacity>
              </View>

              <View style={[s.previewCard, { backgroundColor: colors.surface }]}>
                <View style={[s.previewImg, { backgroundColor: colors.subtle }]}>
                  <Text style={{ fontSize: 48 }}>🏪</Text>
                </View>
                <Text style={[s.previewName, { color: colors.text }]}>{business.name}</Text>
                <Text style={[s.previewStatus, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                <TouchableOpacity style={[s.outlineBtn, { borderColor: colors.border }]} onPress={() => router.push('/(web)/business-profile' as any)}>
                  <Text style={[s.outlineBtnText, { color: colors.text }]}>Edit listing</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[s.activityCard, { backgroundColor: colors.surface }]}>
              <Text style={[s.cardTitle, { color: colors.text }]}>Recent activity</Text>
              <Text style={[s.activitySub, { color: colors.muted }]}>
                Your listing changes and booking updates will appear here.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </BusinessShell>
  );
}

const s = StyleSheet.create({
  content: { padding: 24, gap: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: '700' },
  pageSub: { fontSize: 14, lineHeight: 20, marginTop: -16 },
  verifyBanner: { borderRadius: 12, padding: 24, gap: 10, borderWidth: 1 },
  verifyBannerTitle: { fontSize: 16, fontWeight: '700' },
  verifyBannerSub: { fontSize: 14, lineHeight: 20 },
  verifyBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, alignSelf: 'flex-start' as any },
  verifyBtnText: { fontSize: 14, fontWeight: '600' },
  setupCard: { borderRadius: 12, padding: 32, gap: 16, alignItems: 'center' },
  setupTitle: { fontSize: 24, fontWeight: '700' },
  setupSub: { fontSize: 14, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 24, gap: 8 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 32, fontWeight: '700' },
  twoCol: { flexDirection: 'row', gap: 16 },
  checklistCard: { flex: 1, borderRadius: 12, padding: 24, gap: 12 },
  cardTitle: { fontSize: 20, fontWeight: '700' },
  checklistItem: { fontSize: 14, lineHeight: 22 },
  previewCard: { flex: 1, borderRadius: 12, padding: 24, gap: 12, alignItems: 'center' },
  previewImg: { width: '100%' as any, height: 140, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontSize: 18, fontWeight: '700' },
  previewStatus: { fontSize: 13, textTransform: 'capitalize' },
  activityCard: { borderRadius: 12, padding: 24, gap: 10 },
  activitySub: { fontSize: 14, lineHeight: 20 },
  primaryBtn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  primaryBtnText: { fontSize: 14, fontWeight: '600' },
  outlineBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1 },
  outlineBtnText: { fontSize: 14, fontWeight: '600' },
});
