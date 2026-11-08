import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { WebLayout } from '../../components/web/WebLayout';
import { KalawAssistanceFAB } from '../../components/assistant/KalawAssistanceFAB';
import { getDatabase } from '../../database/migrations/init';
import { Destination } from '../../types';
import { Typography, Spacing, Radius } from '../../constants/tokens';

export default function WebExploreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [search, setSearch] = useState(params.q ?? '');
  const [activeCategory, setActiveCategory] = useState(params.category ?? 'All');

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
      <WebLayout navVariant="tourist" scrollable={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={[styles.workspace, { backgroundColor: colors.background }]}>
            <View style={styles.pageHeader}>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Explore Destinations</Text>
              <Text style={[styles.pageSub, { color: colors.muted }]}>Discover beaches, mountains, waterfalls, and cultural sites in Davao Oriental</Text>
            </View>

            {/* Search + filters */}
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

            <View style={styles.destGrid}>
              {(filtered.length > 0 ? filtered : PLACEHOLDER_DESTS).map((d, i) => {
                const item = d as { id?: string; name: string; location: string; description?: string; estimatedFee?: number };
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
                      <Text style={[styles.destDesc, { color: colors.muted }]} numberOfLines={2}>{item.description ?? 'A beautiful destination in Davao Oriental.'}</Text>
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
        </ScrollView>
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
});
