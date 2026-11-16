import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { KalawAssistanceFAB } from '../../../components/assistant/KalawAssistanceFAB';
import { getDatabase } from '../../../database/migrations/init';
import { Typography, Spacing } from '../../../constants/tokens';

interface DestRow {
  id: string; name: string; location: string;
  cover_image_url: string | null; estimated_fee: number | null; fee_verified: number;
}
interface ItinRow { id: string; title: string; start_date: string; end_date: string; }

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [featured, setFeatured] = useState<DestRow[]>([]);
  const [upcomingTrip, setUpcomingTrip] = useState<ItinRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<DestRow>(
        'SELECT id, name, location, cover_image_url, estimated_fee, fee_verified FROM destinations WHERE is_featured = 1 AND is_active = 1 LIMIT 2'
      );
      setFeatured(rows);
      if (user) {
        const trip = await db.getFirstAsync<ItinRow>(
          "SELECT id, title, start_date, end_date FROM itineraries WHERE user_id = ? AND start_date >= date('now') ORDER BY start_date ASC LIMIT 1",
          [user.id]
        );
        setUpcomingTrip(trip ?? null);
      }
    } catch (e) { /* silent */ }
  }

  useEffect(() => { load(); }, [user]);

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const firstName = user?.displayName?.split(' ')[0] ?? 'Traveler';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* App bar */}
        <View style={[styles.appBar, { backgroundColor: colors.surface }]}>
          <Text style={[styles.appBarTitle, { color: colors.primary }]}>≋ KalawGuide</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Greeting */}
          <Text style={[styles.greeting, { color: colors.text }]}>
            Where to next, {firstName}?
          </Text>

          {/* Search bar */}
          <TouchableOpacity
            style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(tourist)/(tabs)/explore' as any)}
            activeOpacity={0.8}
          >
            <Text style={[styles.searchPlaceholder, { color: colors.text }]}>
              Search places, food, or experiences
            </Text>
          </TouchableOpacity>

          {/* Live map entry */}
          <TouchableOpacity
            style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(tourist)/map' as any)}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={[styles.searchPlaceholder, { color: colors.primary }]}>
              🗺  Live map — see where you are
            </Text>
          </TouchableOpacity>

          {/* Category chips */}
          <View style={styles.categoryRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, { backgroundColor: colors.subtle }]}
                onPress={() => router.push('/(tourist)/(tabs)/explore' as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryChipText, { color: colors.primary }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hero banner */}
          <View style={[styles.heroBanner, { backgroundColor: colors.subtle }]}>
            <View style={styles.heroOverlay}>
              <Text style={[styles.heroText, { color: colors.surface }]}>
                A little further from ordinary.
              </Text>
            </View>
          </View>

          {/* Find your next */}
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Find your next favorite place</Text>

          {/* Destination cards row */}
          <View style={styles.destRow}>
            {featured.map(dest => (
              <TouchableOpacity
                key={dest.id}
                style={[styles.destCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push({ pathname: '/(tourist)/destination/[id]', params: { id: dest.id } } as any)}
                activeOpacity={0.85}
              >
                <View style={styles.destImageBox}>
                  {dest.cover_image_url ? (
                    <Image source={{ uri: dest.cover_image_url }} style={styles.destImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.destImagePlaceholder, { backgroundColor: colors.subtle }]}>
                      <Text style={styles.destImageEmoji}>🏝</Text>
                    </View>
                  )}
                </View>
                <View style={styles.destInfo}>
                  <Text style={[styles.destName, { color: colors.text }]} numberOfLines={1}>{dest.name}</Text>
                  <Text style={[styles.destLocation, { color: colors.primary }]}>
                    Mati City · Explore ↗
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Upcoming trip */}
          {upcomingTrip && (
            <TouchableOpacity
              style={[styles.tripCard, { backgroundColor: colors.subtle }]}
              onPress={() => router.push({ pathname: '/(tourist)/itinerary/[id]', params: { id: upcomingTrip.id } } as any)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tripTitle, { color: colors.text }]} numberOfLines={1}>
                {upcomingTrip.title}
              </Text>
              <Text style={[styles.tripMeta, { color: colors.muted }]}>
                {upcomingTrip.start_date} – {upcomingTrip.end_date} · Example trip
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <KalawAssistanceFAB />
    </SafeAreaView>
  );
}

const CATEGORIES = ['Beaches', 'Nature', 'Food'];

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 100 },
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  appBarTitle: {
    fontFamily: Typography.fontFamilyBody, fontSize: 22,
    fontWeight: Typography.weight.semiBold,
  },
  menuIcon: { fontFamily: Typography.fontFamilyBody, fontSize: 22 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 12 },
  greeting: {
    fontFamily: Typography.fontFamilyBody, fontSize: 28,
    fontWeight: Typography.weight.bold,
  },
  searchBar: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 18,
  },
  searchPlaceholder: {
    fontFamily: Typography.fontFamilyBody, fontSize: 14,
    fontWeight: Typography.weight.semiBold,
  },
  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
  },
  categoryChipText: {
    fontFamily: Typography.fontFamilyBody, fontSize: 12,
    fontWeight: Typography.weight.semiBold, textAlign: 'center',
  },
  heroBanner: {
    height: 130, borderRadius: 20, overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    padding: 16, backgroundColor: 'rgba(5,26,38,0.32)',
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  heroText: {
    fontFamily: Typography.fontFamilyBody, fontSize: 22,
    fontWeight: Typography.weight.semiBold,
  },
  sectionLabel: {
    fontFamily: Typography.fontFamilyBody, fontSize: 16,
    fontWeight: Typography.weight.regular,
  },
  destRow: { flexDirection: 'row', gap: 12 },
  destCard: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  destImageBox: { width: '100%', height: 80 },
  destImage: { width: '100%', height: '100%', borderRadius: 16 },
  destImagePlaceholder: {
    width: '100%', height: '100%', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  destImageEmoji: { fontSize: 28 },
  destInfo: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4, gap: 2 },
  destName: {
    fontFamily: Typography.fontFamilyBody, fontSize: 14,
    fontWeight: Typography.weight.regular,
  },
  destLocation: {
    fontFamily: Typography.fontFamilyBody, fontSize: 12,
    fontWeight: Typography.weight.semiBold,
  },
  tripCard: {
    borderRadius: 16, padding: 12, gap: 4,
  },
  tripTitle: {
    fontFamily: Typography.fontFamilyBody, fontSize: 14,
    fontWeight: Typography.weight.regular,
  },
  tripMeta: {
    fontFamily: Typography.fontFamilyBody, fontSize: 12,
    fontWeight: Typography.weight.semiBold,
  },
});
