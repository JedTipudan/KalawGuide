import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getDatabase } from '../../../database/migrations/init';
import { generateId, now } from '../../../utils/helpers';
import { Typography } from '../../../constants/tokens';
import { LiveMap } from '../../../components/map/LiveMap';
import { useLiveLocation, distanceKm, formatDistance, directionsUrl } from '../../../features/map/useLiveLocation';

interface DestinationDetail {
  id: string; name: string; description: string; location: string;
  cover_image_url: string | null; estimated_fee: number | null;
  fee_verified: number; latitude: number | null; longitude: number | null;
  category_name: string; category_icon: string; category_color: string;
}

export default function DestinationDetailScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dest, setDest] = useState<DestinationDetail | null>(null);
  const [adding, setAdding] = useState(false);
  const [favId, setFavId] = useState<string | null>(null);
  const [favLoading, setFavLoading] = useState(false);
  const { coords, retry } = useLiveLocation(Platform.OS !== 'web');

  useEffect(() => {
    if (!id || Platform.OS === 'web') return;
    getDatabase().then(db => db.getFirstAsync<DestinationDetail>(`
      SELECT d.id, d.name, d.description, d.location, d.cover_image_url,
             d.estimated_fee, d.fee_verified, d.latitude, d.longitude,
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM destinations d
      LEFT JOIN destination_categories c ON d.category_id = c.id
      WHERE d.id = ?
    `, [id])).then(row => { if (row) setDest(row); });

    if (user) {
      getDatabase().then(db => db.getFirstAsync<{ id: string }>(
        `SELECT id FROM favorites WHERE user_id = ? AND entity_type = 'destination' AND entity_id = ?`,
        [user.id, id]
      )).then(row => setFavId(row?.id ?? null));
    }
  }, [id, user]);

  if (Platform.OS === 'web') return <Redirect href={`/(web)/destination/${id}` as any} />;

  async function toggleFavorite() {
    if (!user || !dest || favLoading) return;
    setFavLoading(true);
    try {
      const db = await getDatabase();
      if (favId) {
        await db.runAsync('DELETE FROM favorites WHERE id = ?', [favId]);
        setFavId(null);
      } else {
        const newId = generateId();
        const ts = now();
        await db.runAsync(
          `INSERT INTO favorites (id, user_id, entity_type, entity_id, created_at) VALUES (?, ?, 'destination', ?, ?)`,
          [newId, user.id, dest.id, ts]
        );
        setFavId(newId);
      }
    } catch { /* silent */ } finally { setFavLoading(false); }
  }

  async function addToMyTrips() {
    if (!user || !dest || adding) return;
    setAdding(true);
    try {
      const db = await getDatabase();
      const itinId = generateId();
      const start = new Date();
      const end = new Date(start); end.setDate(end.getDate() + 2);
      const ts = now();
      await db.runAsync(
        `INSERT INTO itineraries (id, user_id, title, start_date, end_date, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, 'local_only')`,
        [itinId, user.id, `Trip to ${dest.name}`, start.toISOString().split('T')[0], end.toISOString().split('T')[0], ts, ts]
      );
      await db.runAsync(
        `INSERT INTO itinerary_items (id, itinerary_id, day_number, time, title, description, destination_id, estimated_cost, sort_order, created_at, updated_at) VALUES (?, ?, 1, '09:00', ?, ?, ?, ?, 0, ?, ?)`,
        [generateId(), itinId, `Visit ${dest.name}`, dest.description, dest.id, dest.estimated_fee ?? 0, ts, ts]
      );
      router.replace('/(tourist)/(tabs)/trips' as any);
    } catch { /* silent */ } finally { setAdding(false); }
  }

  if (!dest) return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={[styles.backText, { color: colors.primary }]}>‹ Destination details</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  const feeText = dest.estimated_fee === null ? null
    : dest.estimated_fee === 0 ? 'Free'
    : `₱${dest.estimated_fee.toLocaleString()}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Nav bar */}
        <View style={[styles.navBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.navTitle, { color: colors.primary }]}>‹ Destination details</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleFavorite} disabled={favLoading} style={styles.favBtn}>
            <Text style={[styles.favIcon, { color: favId ? colors.danger : colors.muted }]}>
              {favId ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.destHeader}>
            <Text style={[styles.categoryLabel, { color: colors.accent }]}>
              {dest.category_name?.toUpperCase()}
            </Text>
            <Text style={[styles.destName, { color: colors.text }]}>{dest.name}</Text>
            <View style={styles.locationRow}>
              <Text style={[styles.locationText, { color: colors.muted }]}>
                📍 {dest.location} · {dest.category_name}
              </Text>
            </View>
          </View>

          {/* Hero image */}
          {dest.cover_image_url ? (
            <Image source={{ uri: dest.cover_image_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: colors.subtle }]}>
              <Text style={styles.heroEmoji}>🏝</Text>
            </View>
          )}

          {/* Thumbnail gallery */}
          <View style={styles.thumbRow}>
            {[dest.cover_image_url, null, null].map((url, i) => (
              <View key={i} style={[styles.thumb, { backgroundColor: colors.subtle }]}>
                {url ? <Image source={{ uri: url }} style={styles.thumbImage} resizeMode="cover" /> : null}
              </View>
            ))}
          </View>

          {/* Entrance fee card */}
          <View style={[styles.feeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.feeWarning, { color: colors.warning }]}>⚠ Estimated Entrance Fee</Text>
            <Text style={[styles.feeValue, { color: colors.text }]}>{feeText ?? 'Unknown'}</Text>
          </View>

          {/* About card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.cardBody, { color: colors.muted }]}>{dest.description}</Text>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Highlights and activities</Text>
              <Text style={[styles.sectionBody, { color: colors.muted }]}>
                Beach time · Coastal scenery · Surfing · Skimboarding · Photography{'\n'}
                Activity access and local conditions need confirmation.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Travel rules and safety</Text>
              <Text style={[styles.sectionBody, { color: colors.muted }]}>
                No verified destination-specific rules are available yet. Confirm current guidance with the relevant local authority.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Transportation information</Text>
              <Text style={[styles.sectionBody, { color: colors.muted }]}>
                Routes, fares, and schedules need verification. Plan transport directly with a local operator.
              </Text>
            </View>
          </View>

          {/* Location card */}
          {dest.latitude && dest.longitude && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.locationHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>📍 Location</Text>
              </View>
              <LiveMap
                style={styles.mapContainer}
                markers={[{ id: dest.id, name: dest.name, lat: dest.latitude, lng: dest.longitude }]}
                focusId={dest.id}
                user={coords}
                onRequestLocate={retry}
              />
              {coords && (
                <Text style={[styles.coordText, { color: colors.primary }]}>
                  🧭 {formatDistance(distanceKm(coords.lat, coords.lng, dest.latitude, dest.longitude))} (straight line)
                </Text>
              )}
              <TouchableOpacity
                onPress={() => Linking.openURL(directionsUrl(dest.latitude!, dest.longitude!))}
                style={[styles.directionsBtn, { backgroundColor: colors.primary }]}
                accessibilityRole="button"
              >
                <Text style={[styles.directionsText, { color: colors.onPrimary }]}>Get directions</Text>
              </TouchableOpacity>
              <View style={[styles.coordPill, { backgroundColor: colors.subtle }]}>
                <Text style={[styles.coordText, { color: colors.muted }]}>
                  📍 {dest.latitude.toFixed(4)}°N, {dest.longitude.toFixed(4)}°E
                </Text>
              </View>
            </View>
          )}

          {/* Plan your visit card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Make it part of your trip.</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: adding ? 0.7 : 1 }]}
              onPress={addToMyTrips}
              disabled={adding}
              activeOpacity={0.8}
            >
              <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
                {adding ? 'Adding…' : 'Save to My Trips'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push('/(tourist)/explore-for-trip' as any)}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Add to Itinerary</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={toggleFavorite}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                {favId ? 'Remove from Favorites' : 'Add to Favorites'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push('/(tourist)/budget' as any)}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Plan Budget</Text>
            </TouchableOpacity>
          </View>

          {/* Disclaimer */}
          <View style={[styles.disclaimer, { backgroundColor: colors.subtle }]}>
            <Text style={[styles.disclaimerText, { color: colors.muted }]}>
              ℹ Information shown is for reference. Always verify current conditions, fees, and access locally before visiting.
            </Text>
          </View>

          <Text style={[styles.assistantLink, { color: colors.accent }]}>
            ✦ KalawAssistance · Travel help, even offline
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 100 },
  backBtn: { padding: 16 },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: 17, fontWeight: Typography.weight.bold },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  navTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 17, fontWeight: Typography.weight.bold },
  favBtn: { padding: 4 },
  favIcon: { fontSize: 26 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 72, gap: 20 },
  destHeader: { gap: 6 },
  categoryLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 11, fontWeight: Typography.weight.bold },
  destName: { fontFamily: 'Manrope', fontSize: 28, fontWeight: '800' as any, lineHeight: 36 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  heroImage: { width: '100%', height: 220, borderRadius: 18 },
  heroPlaceholder: { width: '100%', height: 220, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 64 },
  thumbRow: { flexDirection: 'row', gap: 10 },
  thumb: { flex: 1, height: 76, borderRadius: 12, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  feeCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 4 },
  feeWarning: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: Typography.weight.semiBold },
  feeValue: { fontFamily: 'Manrope', fontSize: 22, fontWeight: Typography.weight.bold },
  card: { borderWidth: 1, borderRadius: 18, padding: 24, gap: 14 },
  cardTitle: { fontFamily: 'Manrope', fontSize: 20, fontWeight: Typography.weight.bold },
  cardBody: { fontFamily: Typography.fontFamilyBody, fontSize: 14, lineHeight: 22 },
  section: { gap: 6 },
  sectionTitle: { fontFamily: 'Manrope', fontSize: 17, fontWeight: Typography.weight.bold },
  sectionBody: { fontFamily: Typography.fontFamilyBody, fontSize: 14, lineHeight: 22 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapContainer: { height: 260, borderRadius: 12, overflow: 'hidden' },
  directionsBtn: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center' },
  directionsText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  coordPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 24, alignSelf: 'flex-start',
  },
  coordText: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: Typography.weight.semiBold },
  primaryBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  secondaryBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center' },
  secondaryBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  disclaimer: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  disclaimerText: { fontFamily: Typography.fontFamilyBody, fontSize: 12, lineHeight: 19 },
  assistantLink: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: Typography.weight.bold },
});
