import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { WebLayout } from '../../../components/web/WebLayout';
import { getDatabase } from '../../../database/migrations/init';
import { generateId, now } from '../../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../../constants/tokens';

interface DestinationDetail {
  id: string; name: string; description: string; location: string;
  cover_image_url: string | null; estimated_fee: number | null;
  fee_verified: number; latitude: number | null; longitude: number | null;
  category_name: string; category_color: string;
}

export default function WebDestinationDetailScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dest, setDest] = useState<DestinationDetail | null>(null);
  const [adding, setAdding] = useState(false);
  const shadow = isDark ? Shadows.dark.md : Shadows.light.md;

  async function addToMyTrips() {
    if (!user || !dest || adding) return;
    setAdding(true);
    try {
      const db = await getDatabase();
      const itinId = generateId();
      const start = new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + 2);
      const startIso = start.toISOString().split('T')[0];
      const endIso = end.toISOString().split('T')[0];
      const ts = now();
      await db.runAsync(
        `INSERT INTO itineraries (id, user_id, title, start_date, end_date, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'local_only')`,
        [itinId, user.id, `Trip to ${dest.name}`, startIso, endIso, ts, ts]
      );
      await db.runAsync(
        `INSERT INTO itinerary_items (id, itinerary_id, day_number, time, title, description, destination_id, estimated_cost, sort_order, created_at, updated_at)
         VALUES (?, ?, 1, '09:00', ?, ?, ?, ?, 0, ?, ?)`,
        [generateId(), itinId, `Visit ${dest.name}`, dest.description, dest.id, dest.estimated_fee ?? 0, ts, ts]
      );
      router.push(`/(web)/trips` as any);
    } catch (e) {
      window.alert('Could not create trip.');
    } finally {
      setAdding(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    getDatabase().then(db => db.getFirstAsync<DestinationDetail>(`
      SELECT d.id, d.name, d.description, d.location, d.cover_image_url,
             d.estimated_fee, d.fee_verified, d.latitude, d.longitude,
             c.name as category_name, c.color as category_color
      FROM destinations d
      LEFT JOIN destination_categories c ON d.category_id = c.id
      WHERE d.id = ?
    `, [id])).then(row => { if (row) setDest(row); });
  }, [id]);

  return (
    <WebLayout navVariant="tourist">
      <View style={styles.workspace}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(web)/explore' as any)} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>

        {!dest ? (
          <Text style={[styles.loading, { color: colors.muted }]}>Loading...</Text>
        ) : (
          <View style={styles.twoCol}>
            {/* Left: cover only */}
            <View style={styles.leftCol}>
              <View style={[styles.coverPlaceholder, { backgroundColor: colors.subtle }]}>
                <Text style={styles.coverIcon}>🏝</Text>
              </View>
            </View>

            {/* Right: meta + description + map + actions */}
            <View style={styles.rightCol}>
              <View style={[styles.metaCard, { backgroundColor: colors.surface, ...shadow }]}>
                <View style={[styles.categoryBadge, { backgroundColor: dest.category_color + '20' }]}>
                  <Text style={[styles.categoryText, { color: dest.category_color }]}>{dest.category_name}</Text>
                </View>
                <Text style={[styles.name, { color: colors.text }]}>{dest.name}</Text>
                <Text style={[styles.location, { color: colors.muted }]}>📍 {dest.location}</Text>

                {dest.estimated_fee !== null && (
                  <View style={[styles.feeCard, { backgroundColor: dest.fee_verified ? colors.success + '15' : colors.subtle, borderColor: dest.fee_verified ? colors.success + '40' : colors.border }]}>
                    <Text style={[styles.feeLabel, { color: dest.fee_verified ? colors.success : colors.muted }]}>
                      {dest.fee_verified ? '✅ Verified Entrance Fee' : '⚠️ Estimated Entrance Fee'}
                    </Text>
                    <Text style={[styles.feeValue, { color: dest.fee_verified ? colors.success : colors.text }]}>
                      {dest.estimated_fee === 0 ? 'Free' : `₱${dest.estimated_fee.toLocaleString()}`}
                    </Text>
                  </View>
                )}
              </View>

              <View style={[styles.descCard, { backgroundColor: colors.surface, ...shadow }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
                <Text style={[styles.description, { color: colors.text }]}>{dest.description}</Text>
              </View>

              {dest.latitude && dest.longitude && (
                <View style={[styles.mapCard, { backgroundColor: colors.surface, ...shadow }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
                  <View style={styles.mapIframeWrapper}>
                    <iframe
                      title="map"
                      height="300"
                      style={{ border: 0, borderRadius: 10, width: '100%', display: 'block' }}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${dest.longitude - 0.02}%2C${dest.latitude - 0.02}%2C${dest.longitude + 0.02}%2C${dest.latitude + 0.02}&layer=mapnik&marker=${dest.latitude}%2C${dest.longitude}`}
                      allowFullScreen
                    />
                  </View>
                  <View style={[styles.coordCard, { backgroundColor: colors.subtle }]}>
                    <Text style={[styles.coordLabel, { color: colors.muted }]}>Coordinates</Text>
                    <Text style={[styles.coordValue, { color: colors.text }]}>
                      {dest.latitude.toFixed(4)}°N, {dest.longitude.toFixed(4)}°E
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary, opacity: adding ? 0.7 : 1 }]}
                  onPress={addToMyTrips}
                  activeOpacity={0.8}
                  disabled={adding}
                >
                  <Text style={styles.actionIcon}>📅</Text>
                  <Text style={[styles.actionLabel, { color: colors.onPrimary }]}>
                    {adding ? 'Adding...' : 'Add to My Trips'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border }]}
                  onPress={() => router.push('/(web)/budget' as any)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionIcon}>💰</Text>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>Plan Budget</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.disclaimer, { backgroundColor: colors.subtle }]}>
                <Text style={[styles.disclaimerText, { color: colors.muted }]}>
                  ℹ️ Information shown is for reference. Always verify current conditions, fees, and access locally before visiting.
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  workspace: { maxWidth: 1200, alignSelf: 'center', width: '100%' as any, padding: 40, gap: Spacing.xl },
  backBtn: { alignSelf: 'flex-start' },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  loading: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  twoCol: { flexDirection: 'row', gap: Spacing.xl, alignItems: 'flex-start' },
  leftCol: { width: 320, gap: Spacing.lg },
  rightCol: { flex: 1, gap: Spacing.lg },
  coverPlaceholder: { width: '100%' as any, height: 320, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  coverIcon: { fontSize: 72 },
  metaCard: { borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.md },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.xl },
  categoryText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  name: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  location: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg },
  feeCard: { borderRadius: Radius.md, padding: Spacing.base, borderWidth: 1, gap: Spacing.xs },
  feeLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  feeValue: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  mapCard: { borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.md },
  mapIframeWrapper: { alignSelf: 'stretch' as any, borderRadius: 10, overflow: 'hidden' as any },
  coordCard: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.xs },
  coordLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  coordValue: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  descCard: { borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.md },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  description: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, lineHeight: 28 },
  actions: { flexDirection: 'row', gap: Spacing.md },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.base, borderRadius: Radius.lg, gap: Spacing.sm },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  disclaimer: { borderRadius: Radius.md, padding: Spacing.md },
  disclaimerText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: 22 },
});
