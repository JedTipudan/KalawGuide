import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { WebLayout } from '../../components/web/WebLayout';
import { KalawAssistanceFAB } from '../../components/assistant/KalawAssistanceFAB';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';
import { Destination } from '../../types';
import { Typography, Spacing, Radius } from '../../constants/tokens';

export default function WebExploreScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; category?: string; from?: string }>();
  const fromTrips = params.from === 'trips';

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [search, setSearch] = useState(params.q ?? '');
  const [activeCategory, setActiveCategory] = useState(params.category ?? 'All');
  const [addingId, setAddingId] = useState<string | null>(null);

  async function addToMyTrips(dest: { id: string; name: string; description?: string; estimatedFee?: number }) {
    if (!user || addingId) return;
    setAddingId(dest.id);
    try {
      const db = await getDatabase();
      const itinId = generateId();
      const start = new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + 2);
      const ts = now();
      await db.runAsync(
        `INSERT INTO itineraries (id, user_id, title, start_date, end_date, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'local_only')`,
        [itinId, user.id, `Trip to ${dest.name}`, start.toISOString().split('T')[0], end.toISOString().split('T')[0], ts, ts]
      );
      await db.runAsync(
        `INSERT INTO itinerary_items (id, itinerary_id, day_number, time, title, description, destination_id, estimated_cost, sort_order, created_at, updated_at)
         VALUES (?, ?, 1, '09:00', ?, ?, ?, ?, 0, ?, ?)`,
        [generateId(), itinId, `Visit ${dest.name}`, dest.description ?? '', dest.id, dest.estimatedFee ?? 0, ts, ts]
      );
      router.push('/(web)/trips' as any);
    } catch (e) {
      window.alert('Could not create trip.');
    } finally {
      setAddingId(null);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{
          id: string; name: string; description: string;
          location: string; cover_image_url: string | null;
          estimated_fee: number | null; fee_verified: number;
        }>('SELECT id, name, description, location, cover_image_url, estimated_fee, fee_verified FROM destinations WHERE is_active = 1 ORDER BY is_featured DESC, name ASC');
        setDestinations(rows.map(r => ({
          id: r.id, name: r.name, description: r.description,
          location: r.location, coverImageUrl: r.cover_image_url ?? undefined,
          estimatedFee: r.estimated_fee ?? undefined,
          feeVerified: r.fee_verified === 1,
          categoryId: '', imageUrls: [], isFeatured: false, isActive: true,
          createdAt: '', updatedAt: '',
        })));
      } catch (e) { /* db not ready */ }
    })();
  }, []);

  const filtered = destinations.filter(d => {
    const matchSearch = !search.trim() || d.name.toLowerCase().includes(search.toLowerCase()) || d.location.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <View style={{ flex: 1 }}>
      <WebLayout navVariant="tourist" scrollable={true}>
        <View style={[styles.workspace, { backgroundColor: colors.background }]}>
            <View style={styles.pageHeader}>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Explore Destinations</Text>
              <Text style={[styles.pageSub, { color: colors.muted }]}>Discover beaches, mountains, waterfalls, and cultural sites in Davao Oriental</Text>
            </View>

            <View style={styles.filterRow}>
              <TextInput
                style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Search destinations..."
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={setSearch}
              />
              <View style={styles.categories}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, { backgroundColor: activeCategory === c ? colors.primary : colors.surface, borderColor: colors.border }]}
                    onPress={() => setActiveCategory(c)}
                  >
                    <Text style={[styles.catChipText, { color: activeCategory === c ? colors.onPrimary : colors.text }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={[styles.resultCount, { color: colors.muted }]}>{filtered.length} destination{filtered.length !== 1 ? 's' : ''} found</Text>

            {fromTrips && (
              <View style={[styles.fromTripsBar, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
                <Text style={[styles.fromTripsText, { color: colors.primary }]}>📅 Select a destination to add to your trip</Text>
                <TouchableOpacity onPress={() => router.push('/(web)/trips' as any)}>
                  <Text style={[styles.fromTripsBack, { color: colors.muted }]}>← Back to My Trips</Text>
                </TouchableOpacity>
              </View>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 } as any}>
              {(filtered.length > 0 ? filtered : PLACEHOLDER_DESTS).map((d, i) => {
                const item = d as { id?: string; name: string; location: string; description?: string; estimatedFee?: number };
                return (
                  <div key={item.id ?? i} style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' } as any}>
                    {fromTrips ? (
                      <View>
                        <View style={[styles.destImg, { backgroundColor: colors.subtle }]}>
                          <Text style={styles.destImgIcon}>🏖</Text>
                        </View>
                        <View style={styles.destBody}>
                          <Text style={[styles.destName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                          <Text style={[styles.destLoc, { color: colors.muted }]} numberOfLines={1}>📍 {item.location}</Text>
                          <Text style={[styles.destDesc, { color: colors.muted }]} numberOfLines={2}>{item.description ?? 'A beautiful destination in Davao Oriental.'}</Text>
                          {item.estimatedFee !== undefined
                            ? <Text style={[styles.destFee, { color: colors.primary }]}>₱{item.estimatedFee}</Text>
                            : <Text style={[styles.destFee, { color: colors.muted }]}>Free</Text>}
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => item.id ? router.push(`/(web)/destination/${item.id}` as any) : undefined}
                        activeOpacity={0.85}
                      >
                        <View style={[styles.destImg, { backgroundColor: colors.subtle }]}>
                          <Text style={styles.destImgIcon}>🏖</Text>
                        </View>
                        <View style={styles.destBody}>
                          <Text style={[styles.destName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                          <Text style={[styles.destLoc, { color: colors.muted }]} numberOfLines={1}>📍 {item.location}</Text>
                          <Text style={[styles.destDesc, { color: colors.muted }]} numberOfLines={2}>{item.description ?? 'A beautiful destination in Davao Oriental.'}</Text>
                          {item.estimatedFee !== undefined
                            ? <Text style={[styles.destFee, { color: colors.primary }]}>₱{item.estimatedFee}</Text>
                            : <Text style={[styles.destFee, { color: colors.muted }]}>Free</Text>}
                        </View>
                      </TouchableOpacity>
                    )}
                    {fromTrips && item.id && (
                      <TouchableOpacity
                        style={[styles.addTripBtn, { backgroundColor: colors.primary, opacity: addingId === item.id ? 0.7 : 1 }]}
                        onPress={() => addToMyTrips(item as any)}
                        disabled={!!addingId}
                      >
                        <Text style={[styles.addTripBtnText, { color: colors.onPrimary }]}>
                          {addingId === item.id ? 'Adding...' : '+ Add to My Trips'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </div>
                );
              })}
            </div>
        </View>
      </WebLayout>
      <KalawAssistanceFAB />
    </View>
  );
}

const CATEGORIES = ['All', 'Beaches', 'Mountains', 'Waterfalls', 'Nature', 'Culture'];

const PLACEHOLDER_DESTS = [
  { name: 'Dahican Beach', location: 'Mati City', description: 'One of the longest white sand beaches in the Philippines.' },
  { name: 'Pujada Bay', location: 'Mati City', description: 'A protected bay with crystal clear waters.' },
  { name: 'Mount Hamiguitan', location: 'San Isidro', description: 'UNESCO World Heritage Site with pygmy forest.' },
  { name: 'Aliwagwag Falls', location: 'Cateel', description: 'One of the highest waterfalls in the Philippines.' },
  { name: 'Subangan Museum', location: 'Mati City', description: 'Cultural museum showcasing Davao Oriental heritage.' },
  { name: 'Waniban Island', location: 'Mati City', description: 'A pristine island with white sand and coral reefs.' },
];

const styles = StyleSheet.create({
  workspace: { padding: 40, gap: Spacing.xl },
  pageHeader: { gap: Spacing.xs },
  pageTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h3, fontWeight: Typography.weight.bold },
  pageSub: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg },
  filterRow: { gap: Spacing.md },
  searchInput: { height: 48, paddingHorizontal: Spacing.base, borderRadius: Radius.md, borderWidth: 1, fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, maxWidth: 480 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catChip: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1 },
  catChipText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  resultCount: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  destGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg },
  destCard: { width: 280, borderRadius: Radius.md, overflow: 'hidden' },
  destImg: { height: 160, alignItems: 'center', justifyContent: 'center' },
  destImgIcon: { fontSize: 48 },
  destBody: { padding: Spacing.base, gap: Spacing.xs },
  destName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  destLoc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  destDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: 20 },
  destFee: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  fromTripsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, borderRadius: Radius.md, borderWidth: 1 },
  fromTripsText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  fromTripsBack: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  addTripBtn: { margin: Spacing.base, marginTop: 0, padding: Spacing.sm, borderRadius: Radius.md, alignItems: 'center' },
  addTripBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
});
