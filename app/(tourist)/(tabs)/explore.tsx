import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { KalawAssistanceFAB } from '../../../components/assistant/KalawAssistanceFAB';
import { getDatabase } from '../../../database/migrations/init';
import { Typography, Spacing } from '../../../constants/tokens';

interface DestinationRow {
  id: string; name: string; description: string;
  location: string; cover_image_url: string | null;
  estimated_fee: number | null; fee_verified: number;
  category_name: string; category_color: string;
}

export default function ExploreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [destinations, setDestinations] = useState<DestinationRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      let query = `
        SELECT d.id, d.name, d.description, d.location, d.cover_image_url,
               d.estimated_fee, d.fee_verified, c.name as category_name, c.color as category_color
        FROM destinations d
        LEFT JOIN destination_categories c ON d.category_id = c.id
        WHERE d.is_active = 1
      `;
      const params: string[] = [];
      if (search.trim()) {
        query += ' AND (d.name LIKE ? OR d.location LIKE ? OR d.description LIKE ?)';
        const s = `%${search.trim()}%`;
        params.push(s, s, s);
      }
      query += ' ORDER BY d.is_featured DESC, d.name ASC';
      const rows = await db.getAllAsync<DestinationRow>(query, params);
      setDestinations(rows);
    } catch (e) { /* silent */ } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Nav bar */}
      <View style={[styles.navBar, { backgroundColor: colors.surface }]}>
        <Text style={[styles.navTitle, { color: colors.primary }]}>Explore destinations</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>Explore destinations</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Discover Mati City and Davao Oriental, one experience at a time.
          </Text>

          {/* Search */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search destinations or locations"
              placeholderTextColor={colors.text}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Filter buttons */}
          <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.filterBtnText, { color: colors.text }]}>Category: All ▾</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.filterBtnText, { color: colors.text }]}>Location: Mati City ▾</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.filterBtnText, { color: colors.text }]}>List view / Map view</Text>
          </TouchableOpacity>

          {/* Section heading */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Explore the coast and beyond</Text>

          {/* Destination cards */}
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
          ) : destinations.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>No destinations found.</Text>
            </View>
          ) : (
            destinations.map(dest => (
              <TouchableOpacity
                key={dest.id}
                style={[styles.destCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push({ pathname: '/(tourist)/destination/[id]', params: { id: dest.id } } as any)}
                activeOpacity={0.85}
              >
                {dest.cover_image_url ? (
                  <Image source={{ uri: dest.cover_image_url }} style={styles.destImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.destImagePlaceholder, { backgroundColor: colors.subtle }]}>
                    <Text style={styles.destImageEmoji}>🏝</Text>
                  </View>
                )}
                <View style={styles.destInfo}>
                  <Text style={[styles.destRegion, { color: colors.accent }]}>MATI CITY · DAVAO ORIENTAL</Text>
                  <Text style={[styles.destName, { color: colors.text }]}>{dest.name}</Text>
                  <Text style={[styles.destDesc, { color: colors.muted }]} numberOfLines={1}>
                    {dest.description}
                  </Text>
                  <Text style={[styles.destFee, { color: colors.muted }]}>
                    Entrance fee: needs verification
                  </Text>
                  <Text style={[styles.destViewDetails, { color: colors.primary }]}>View Details  ↗</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          {/* Info card */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Travel with reliable information</Text>
            <Text style={[styles.infoBody, { color: colors.muted }]}>
              Entrance fees, permits, transport details, and local rules are shown only when verified. Check information freshness before traveling.
            </Text>
          </View>

          {/* Load more */}
          <TouchableOpacity
            style={[styles.loadMoreBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={loadData}
            activeOpacity={0.8}
          >
            <Text style={[styles.loadMoreText, { color: colors.text }]}>Load more destinations</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <KalawAssistanceFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  navTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 21, fontWeight: Typography.weight.bold },
  menuIcon: { fontFamily: Typography.fontFamilyBody, fontSize: 22 },
  scroll: { paddingBottom: 100 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 72, gap: 20 },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: 15, marginTop: -12 },
  searchBar: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 18,
  },
  searchInput: {
    fontFamily: Typography.fontFamilyBody, fontSize: 14,
    fontWeight: Typography.weight.semiBold, padding: 0,
  },
  filterBtn: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  filterBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  sectionHeading: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.bold },
  destCard: { borderRadius: 18, overflow: 'hidden', gap: 0 },
  destImage: { width: '100%', height: 200, borderRadius: 18 },
  destImagePlaceholder: {
    width: '100%', height: 200, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  destImageEmoji: { fontSize: 48 },
  destInfo: { paddingHorizontal: 18, paddingBottom: 20, paddingTop: 0, gap: 4 },
  destRegion: { fontFamily: Typography.fontFamilyBody, fontSize: 11, fontWeight: Typography.weight.bold },
  destName: { fontFamily: Typography.fontFamilyBody, fontSize: 21, fontWeight: Typography.weight.bold },
  destDesc: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  destFee: { fontFamily: Typography.fontFamilyBody, fontSize: 12 },
  destViewDetails: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.bold },
  infoCard: { borderRadius: 18, padding: 24, gap: 14 },
  infoTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 18, fontWeight: Typography.weight.bold },
  infoBody: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  loadMoreBtn: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    alignItems: 'center',
  },
  loadMoreText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  emptyCard: { borderRadius: 18, padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
});
