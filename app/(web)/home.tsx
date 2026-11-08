import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { WebLayout } from '../../components/web/WebLayout';
import { KalawAssistanceFAB } from '../../components/assistant/KalawAssistanceFAB';
import { getDatabase } from '../../database/migrations/init';
import { Destination } from '../../types';
import { Typography, Spacing, Radius } from '../../constants/tokens';

export default function WebHomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [featured, setFeatured] = useState<Destination[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{
          id: string; name: string; description: string;
          location: string; cover_image_url: string | null;
          estimated_fee: number | null; fee_verified: number;
        }>('SELECT id, name, description, location, cover_image_url, estimated_fee, fee_verified FROM destinations WHERE is_featured = 1 AND is_active = 1 LIMIT 6');
        setFeatured(rows.map(r => ({
          id: r.id, name: r.name, description: r.description,
          location: r.location, coverImageUrl: r.cover_image_url ?? undefined,
          estimatedFee: r.estimated_fee ?? undefined,
          feeVerified: r.fee_verified === 1,
          categoryId: '', imageUrls: [], isFeatured: true, isActive: true,
          createdAt: '', updatedAt: '',
        })));
      } catch (e) { /* db not ready */ }
    })();
  }, []);

  const firstName = user?.displayName?.split(' ')[0] ?? 'Traveler';
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();

  return (
    <View style={{ flex: 1 }}>
      <WebLayout navVariant="tourist" scrollable={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Workspace */}
          <View style={[styles.workspace, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.pageHeader}>
              <View>
                <Text style={[styles.greeting, { color: colors.muted }]}>{greeting},</Text>
                <Text style={[styles.userName, { color: colors.text }]}>{firstName} 👋</Text>
              </View>
              <View style={[styles.locationBadge, { backgroundColor: colors.sand }]}>
                <Text style={[styles.locationText, { color: colors.text }]}>📍 Mati City, Davao Oriental</Text>
              </View>
            </View>

            {/* Quick actions */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
              <View style={styles.quickGrid}>
                {QUICK_ACTIONS.map(a => (
                  <TouchableOpacity
                    key={a.label}
                    style={[styles.quickCard, { backgroundColor: colors.surface }]}
                    onPress={() => router.push(a.route as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.quickIcon}>{a.icon}</Text>
                    <Text style={[styles.quickLabel, { color: colors.text }]}>{a.label}</Text>
                    <Text style={[styles.quickDesc, { color: colors.muted }]}>{a.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Featured destinations */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Destinations</Text>
                <TouchableOpacity onPress={() => router.push('/(web)/explore' as any)}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>View all →</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.destGrid}>
                {(featured.length > 0 ? featured : PLACEHOLDER_DESTS).map((d, i) => {
                  const item = d as { id?: string; name: string; location: string; estimatedFee?: number };
                  return (
                    <TouchableOpacity
                      key={item.id ?? i}
                      style={[styles.destCard, { backgroundColor: colors.surface }]}
                      onPress={() => item.id ? router.push(`/(web)/destination/${item.id}` as any) : undefined}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.destImg, { backgroundColor: colors.subtle }]}>
                        <Text style={styles.destImgIcon}>🏖</Text>
                      </View>
                      <View style={styles.destBody}>
                        <Text style={[styles.destName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.destLoc, { color: colors.muted }]} numberOfLines={1}>📍 {item.location}</Text>
                        {item.estimatedFee !== undefined
                          ? <Text style={[styles.destFee, { color: colors.primary }]}>₱{item.estimatedFee}</Text>
                          : <Text style={[styles.destFee, { color: colors.muted }]}>Free</Text>
                        }
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Emergency shortcut */}
            <TouchableOpacity
              style={[styles.emergencyBanner, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}
              onPress={() => router.push('/(web)/emergency' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.emergencyIcon}>🚨</Text>
              <View style={styles.emergencyText}>
                <Text style={[styles.emergencyTitle, { color: colors.danger }]}>Emergency Information</Text>
                <Text style={[styles.emergencySub, { color: colors.muted }]}>Local emergency contacts for Mati City</Text>
              </View>
              <Text style={[styles.emergencyArrow, { color: colors.danger }]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* KalawAssistance quick access */}
          <View style={[styles.assistSection, { backgroundColor: colors.subtle }]}>
            <View style={styles.assistInner}>
              <View style={styles.assistText}>
                <Text style={[styles.assistTitle, { color: colors.text }]}>KalawAssistance</Text>
                <Text style={[styles.assistDesc, { color: colors.muted }]}>
                  Your offline-first travel guide for Mati City. Ask about destinations, local tips, emergency info, and more.
                </Text>
              </View>
              <TouchableOpacity style={[styles.assistBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.assistBtnText, { color: colors.onPrimary }]}>Open Assistant ✦</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Account links */}
          <View style={[styles.accountSection, { backgroundColor: colors.background }]}>
            <View style={styles.accountLinks}>
              {ACCOUNT_LINKS.map(l => (
                <TouchableOpacity key={l.label} onPress={() => router.push(l.route as any)} style={[styles.accountLink, { backgroundColor: colors.surface }]}>
                  <Text style={styles.accountLinkIcon}>{l.icon}</Text>
                  <Text style={[styles.accountLinkLabel, { color: colors.text }]}>{l.label}</Text>
                  <Text style={[styles.accountLinkArrow, { color: colors.muted }]}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </WebLayout>
      <KalawAssistanceFAB />
    </View>
  );
}

const QUICK_ACTIONS = [
  { icon: '💰', label: 'Budget Planner', desc: 'Estimate trip costs', route: '/(web)/budget' },
  { icon: '📅', label: 'My Trips', desc: 'Day-by-day itineraries', route: '/(web)/trips' },
  { icon: '🧾', label: 'Expenses', desc: 'Track actual spending', route: '/(web)/expenses' },
  { icon: '🌟', label: 'Recommendations', desc: 'Find your ideal place', route: '/(web)/recommendations' },
  { icon: '🗺', label: 'Explore', desc: 'Discover destinations', route: '/(web)/explore' },
  { icon: '🏪', label: 'Businesses', desc: 'Local verified listings', route: '/(web)/businesses' },
];

const PLACEHOLDER_DESTS = [
  { name: 'Dahican Beach', location: 'Mati City' },
  { name: 'Pujada Bay', location: 'Mati City' },
  { name: 'Mount Hamiguitan', location: 'San Isidro' },
  { name: 'Aliwagwag Falls', location: 'Cateel' },
  { name: 'Subangan Museum', location: 'Mati City' },
  { name: 'Waniban Island', location: 'Mati City' },
];

const ACCOUNT_LINKS = [
  { icon: '👤', label: 'Profile & Settings', route: '/(web)/profile' },
  { icon: '🚨', label: 'Emergency Information', route: '/(web)/emergency' },
];

const styles = StyleSheet.create({
  workspace: { padding: 40, paddingBottom: 28, gap: Spacing.xl },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  userName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  locationBadge: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs, borderRadius: Radius.xl },
  locationText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },

  section: { gap: Spacing.base },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  seeAll: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.base },
  quickCard: { width: 200, padding: Spacing.lg, borderRadius: Radius.md, gap: Spacing.xs },
  quickIcon: { fontSize: 28 },
  quickLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  quickDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },

  destGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.base },
  destCard: { width: 220, borderRadius: Radius.md, overflow: 'hidden' },
  destImg: { height: 140, alignItems: 'center', justifyContent: 'center' },
  destImgIcon: { fontSize: 40 },
  destBody: { padding: Spacing.base, gap: Spacing.xs },
  destName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  destLoc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  destFee: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },

  emergencyBanner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderRadius: Radius.md, borderWidth: 1, gap: Spacing.md },
  emergencyIcon: { fontSize: 24 },
  emergencyText: { flex: 1, gap: Spacing.xs },
  emergencyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  emergencySub: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  emergencyArrow: { fontSize: 22, fontWeight: '600' },

  assistSection: { paddingVertical: Spacing.xl, paddingHorizontal: 40 },
  assistInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.xl },
  assistText: { flex: 1, gap: Spacing.xs },
  assistTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  assistDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: 22 },
  assistBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md },
  assistBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },

  accountSection: { paddingVertical: Spacing.xl, paddingHorizontal: 40, paddingBottom: 28 },
  accountLinks: { gap: Spacing.sm },
  accountLink: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderRadius: Radius.md, gap: Spacing.md },
  accountLinkIcon: { fontSize: 20, width: 28 },
  accountLinkLabel: { flex: 1, fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.medium },
  accountLinkArrow: { fontSize: 20 },
});
