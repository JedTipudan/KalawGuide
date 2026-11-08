import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { KalawCard } from '../../../components/cards/KalawCard';
import { KalawAssistanceFAB } from '../../../components/assistant/KalawAssistanceFAB';
import { getDatabase } from '../../../database/migrations/init';
import { Destination } from '../../../types';
import { Typography, Spacing, Radius } from '../../../constants/tokens';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [featured, setFeatured] = useState<Destination[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadFeatured() {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{
        id: string; name: string; description: string;
        location: string; cover_image_url: string | null;
        estimated_fee: number | null; fee_verified: number;
      }>(
        'SELECT id, name, description, location, cover_image_url, estimated_fee, fee_verified FROM destinations WHERE is_featured = 1 AND is_active = 1 LIMIT 4'
      );
      setFeatured(rows.map(r => ({
        id: r.id, name: r.name, description: r.description,
        location: r.location, coverImageUrl: r.cover_image_url ?? undefined,
        estimatedFee: r.estimated_fee ?? undefined,
        feeVerified: r.fee_verified === 1,
        categoryId: '', imageUrls: [], isFeatured: true, isActive: true,
        createdAt: '', updatedAt: '',
      })));
    } catch (e) {
      console.error('loadFeatured error:', e);
    }
  }

  useEffect(() => { loadFeatured(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadFeatured();
    setRefreshing(false);
  }

  const greeting = getGreeting();
  const firstName = user?.displayName?.split(' ')[0] ?? 'Traveler';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* App bar */}
        <View style={styles.appBar}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>{greeting}</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{firstName} 👋</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tourist)/profile')}
            style={[styles.avatar, { backgroundColor: colors.primary }]}
            accessibilityLabel="View profile"
          >
            <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Location badge */}
        <View style={[styles.locationBadge, { backgroundColor: colors.sand }]}>
          <Text style={[styles.locationText, { color: colors.text }]}>
            📍 Mati City, Davao Oriental
          </Text>
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {QUICK_ACTIONS.map(action => (
              <TouchableOpacity
                key={action.label}
                style={[styles.quickAction, { backgroundColor: colors.surface }]}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.quickActionIcon}>{action.icon}</Text>
                <Text style={[styles.quickActionLabel, { color: colors.text }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recommendation banner */}
        <TouchableOpacity
          style={[styles.recommendBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}
          onPress={() => router.push('/(tourist)/recommendations' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.recommendIcon}>🌟</Text>
          <View style={styles.recommendText}>
            <Text style={[styles.recommendTitle, { color: colors.primary }]}>Find Your Ideal Place</Text>
            <Text style={[styles.recommendSubtitle, { color: colors.muted }]}>
              Describe what you’re looking for and we’ll match it
            </Text>
          </View>
          <Text style={[styles.recommendArrow, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>

        {/* Featured destinations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Destinations</Text>
            <TouchableOpacity onPress={() => router.push('/(tourist)/(tabs)/explore' as any)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {featured.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>Loading destinations...</Text>
            </View>
          ) : (
            featured.map(dest => (
              <KalawCard
                key={dest.id}
                title={dest.name}
                subtitle={dest.location}
                imageUrl={dest.coverImageUrl}
                badge={dest.feeVerified ? `₱${dest.estimatedFee}` : dest.estimatedFee !== undefined ? 'Est. fee' : 'Free'}
                badgeColor={dest.feeVerified ? colors.success + '30' : colors.subtle}
                onPress={() => router.push({ pathname: '/(tourist)/destination/[id]', params: { id: dest.id } } as any)}
                style={styles.destinationCard}
              />
            ))
          )}
        </View>

        {/* Emergency info shortcut */}
        <TouchableOpacity
          style={[styles.emergencyBanner, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}
          onPress={() => router.push('/(tourist)/emergency')}
          activeOpacity={0.8}
        >
          <Text style={styles.emergencyIcon}>🚨</Text>
          <View style={styles.emergencyText}>
            <Text style={[styles.emergencyTitle, { color: colors.danger }]}>Emergency Information</Text>
            <Text style={[styles.emergencySubtitle, { color: colors.muted }]}>
              Local emergency contacts for Mati City
            </Text>
          </View>
          <Text style={[styles.emergencyArrow, { color: colors.danger }]}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      <KalawAssistanceFAB />
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

const QUICK_ACTIONS = [
  { icon: '💰', label: 'Budget', route: '/(tourist)/budget' },
  { icon: '📅', label: 'Trips', route: '/(tourist)/(tabs)/trips' },
  { icon: '🧾', label: 'Expenses', route: '/(tourist)/expenses' },
  { icon: '♡', label: 'Favorites', route: '/(tourist)/(tabs)/favorites' },
];

const RECOMMENDATION_BANNER_VISIBLE = true;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: 100 },
  appBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  greeting: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  userName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  locationBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.xl },
  locationText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  section: { gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  seeAll: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  quickActions: { flexDirection: 'row', gap: Spacing.md },
  quickAction: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.base, borderRadius: Radius.md, gap: Spacing.xs,
    minHeight: 72,
  },
  quickActionIcon: { fontSize: 24 },
  quickActionLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium, textAlign: 'center' },
  destinationCard: { marginBottom: 0 },
  emptyCard: { padding: Spacing.xl, borderRadius: Radius.md, alignItems: 'center' },
  emptyText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  emergencyBanner: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.base,
    borderRadius: Radius.md, borderWidth: 1, gap: Spacing.md,
  },
  emergencyIcon: { fontSize: 24 },
  emergencyText: { flex: 1, gap: Spacing.xs },
  emergencyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  emergencySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  emergencyArrow: { fontSize: 22, fontWeight: '600' },
  recommendBanner: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.base,
    borderRadius: Radius.md, borderWidth: 1, gap: Spacing.md,
  },
  recommendIcon: { fontSize: 24 },
  recommendText: { flex: 1, gap: Spacing.xs },
  recommendTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  recommendSubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  recommendArrow: { fontSize: 22, fontWeight: '600' },
});
