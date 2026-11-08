import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now, formatCurrency } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface RecommendationResult {
  id: string;
  name: string;
  category: string;
  address: string;
  description: string;
  coverImageUrl: string | null;
  score: number;
  matchedKeywords: string[];
  lowestPrice: number | null;
  priceUnit: string | null;
  facilities: string[];
  isFavorite: boolean;
}

const KEYWORD_WEIGHTS: Record<string, string[]> = {
  beach: ['beach', 'dahican', 'pujada', 'shore', 'coastal', 'ocean', 'sea', 'surf', 'swim', 'snorkel'],
  resort: ['resort', 'accommodation', 'stay', 'overnight', 'room', 'cottage', 'villa'],
  peaceful: ['peaceful', 'quiet', 'relaxing', 'serene', 'calm', 'tranquil', 'nature'],
  affordable: ['affordable', 'cheap', 'budget', 'low cost', 'inexpensive', 'value'],
  sunset: ['sunset', 'sunrise', 'view', 'scenic', 'panoramic', 'beautiful'],
  food: ['food', 'restaurant', 'eat', 'dining', 'seafood', 'local', 'cuisine'],
  adventure: ['adventure', 'activity', 'hiking', 'kayak', 'surf', 'zip', 'atv', 'extreme'],
  family: ['family', 'kids', 'children', 'group', 'picnic', 'pool'],
  romantic: ['romantic', 'couple', 'honeymoon', 'intimate', 'private'],
  waterfall: ['waterfall', 'falls', 'river', 'nature', 'trek', 'hike'],
};

const EXAMPLE_QUERIES = [
  'peaceful beach resort with cottages and sunset views',
  'affordable accommodation near the beach',
  'adventure activities like surfing and kayaking',
  'family-friendly resort with swimming pool',
  'romantic getaway with ocean view',
];

export default function RecommendationsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const db = await getDatabase();
      const ql = q.toLowerCase();

      const businesses = await db.getAllAsync<{
        id: string; name: string; category: string; address: string;
        description: string; cover_image_url: string | null;
      }>("SELECT id, name, category, address, description, cover_image_url FROM businesses WHERE verification_status = 'approved' AND is_active = 1");

      const scored: RecommendationResult[] = [];

      for (const biz of businesses) {
        const searchText = `${biz.name} ${biz.description} ${biz.category} ${biz.address}`.toLowerCase();
        let score = 0;
        const matchedKeywords: string[] = [];

        for (const [group, keywords] of Object.entries(KEYWORD_WEIGHTS)) {
          const queryHits = keywords.some(k => ql.includes(k));
          const bizHits = keywords.some(k => searchText.includes(k));
          if (queryHits && bizHits) {
            score += 3;
            matchedKeywords.push(group);
          } else if (bizHits) {
            score += 0.5;
          }
        }

        const queryWords = ql.split(/\s+/).filter(w => w.length > 3);
        for (const word of queryWords) {
          if (searchText.includes(word)) { score += 1; if (!matchedKeywords.includes(word)) matchedKeywords.push(word); }
        }

        if (score < 1) continue;

        const priceRow = await db.getFirstAsync<{ amount: number; unit: string }>(
          'SELECT amount, unit FROM listing_prices WHERE business_id = ? AND is_active = 1 ORDER BY amount ASC LIMIT 1',
          [biz.id]
        );
        const facilityRows = await db.getAllAsync<{ name: string }>(
          'SELECT name FROM listing_facilities WHERE business_id = ? LIMIT 6', [biz.id]
        );

        let isFavorite = false;
        if (user) {
          const fav = await db.getFirstAsync<{ id: string }>(
            "SELECT id FROM favorites WHERE user_id = ? AND entity_type = 'business' AND entity_id = ?",
            [user.id, biz.id]
          );
          isFavorite = !!fav;
        }

        scored.push({
          ...biz,
          coverImageUrl: biz.cover_image_url,
          score,
          matchedKeywords: [...new Set(matchedKeywords)],
          lowestPrice: priceRow?.amount ?? null,
          priceUnit: priceRow?.unit ?? null,
          facilities: facilityRows.map(f => f.name),
          isFavorite,
        });
      }

      scored.sort((a, b) => b.score - a.score);
      setResults(scored.slice(0, 6));
    } catch (e) {
      console.error('recommendation search error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  async function toggleFavorite(item: RecommendationResult) {
    if (!user) { Alert.alert('Sign in required', 'Please sign in to save favorites.'); return; }
    const db = await getDatabase();
    if (item.isFavorite) {
      await db.runAsync(
        "DELETE FROM favorites WHERE user_id = ? AND entity_type = 'business' AND entity_id = ?",
        [user.id, item.id]
      );
    } else {
      await db.runAsync(
        'INSERT OR IGNORE INTO favorites (id, user_id, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?)',
        [generateId(), user.id, 'business', item.id, now()]
      );
    }
    setResults(prev => prev.map(r => r.id === item.id ? { ...r, isFavorite: !r.isFavorite } : r));
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Find Your Ideal Place</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Describe what you're looking for and we'll match it against verified businesses in Mati City.
        </Text>

        {/* Search input */}
        <View style={[styles.searchCard, { backgroundColor: colors.surface, ...shadow }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. peaceful beach resort with cottages and sunset views"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: query.trim() ? colors.primary : colors.border }]}
            onPress={() => search(query)}
            disabled={!query.trim() || loading}
          >
            <Text style={[styles.searchBtnText, { color: query.trim() ? colors.onPrimary : colors.muted }]}>
              {loading ? 'Searching…' : '🔍 Find Matches'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Example queries */}
        {!searched && (
          <View style={styles.examples}>
            <Text style={[styles.examplesLabel, { color: colors.muted }]}>Try an example:</Text>
            <View style={styles.exampleChips}>
              {EXAMPLE_QUERIES.map((eq, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.exampleChip, { backgroundColor: colors.subtle, borderColor: colors.border }]}
                  onPress={() => { setQuery(eq); search(eq); }}
                >
                  <Text style={[styles.exampleChipText, { color: colors.text }]} numberOfLines={2}>{eq}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Matching against verified businesses…</Text>
          </View>
        )}

        {/* No results */}
        {searched && !loading && results.length === 0 && (
          <View style={[styles.noResults, { backgroundColor: colors.surface, ...shadow }]}>
            <Text style={styles.noResultsIcon}>🔍</Text>
            <Text style={[styles.noResultsTitle, { color: colors.text }]}>No close match found</Text>
            <Text style={[styles.noResultsText, { color: colors.muted }]}>
              No verified businesses closely match your description. Try different keywords, or browse all businesses in the Businesses tab.
            </Text>
            <TouchableOpacity
              style={[styles.browseBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tourist)/(tabs)/businesses' as any)}
            >
              <Text style={[styles.browseBtnText, { color: colors.onPrimary }]}>Browse All Businesses</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results */}
        {results.length > 0 && (
          <View style={styles.results}>
            <Text style={[styles.resultsHeader, { color: colors.text }]}>
              {results.length} match{results.length !== 1 ? 'es' : ''} found
            </Text>
            {results.map((item, index) => (
              <View key={item.id} style={[styles.resultCard, { backgroundColor: colors.surface, ...shadow }]}>
                {/* Rank badge */}
                <View style={[styles.rankBadge, { backgroundColor: index === 0 ? colors.primary : colors.subtle }]}>
                  <Text style={[styles.rankText, { color: index === 0 ? colors.onPrimary : colors.muted }]}>
                    #{index + 1}
                  </Text>
                </View>

                {/* Cover image */}
                {item.coverImageUrl ? (
                  <Image source={{ uri: item.coverImageUrl }} style={styles.coverImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.coverPlaceholder, { backgroundColor: colors.subtle }]}>
                    <Text style={styles.coverIcon}>🏪</Text>
                  </View>
                )}

                <View style={styles.cardBody}>
                  {/* Name + favorite */}
                  <View style={styles.nameRow}>
                    <View style={styles.nameInfo}>
                      <Text style={[styles.bizName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.bizCategory, { color: colors.muted }]}>
                        {item.category.replace('_', ' ')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.favBtn, { backgroundColor: item.isFavorite ? colors.danger + '20' : colors.subtle }]}
                      onPress={() => toggleFavorite(item)}
                      accessibilityLabel={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Text style={{ fontSize: 20 }}>{item.isFavorite ? '♥' : '♡'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Location */}
                  <Text style={[styles.address, { color: colors.muted }]}>📍 {item.address}</Text>

                  {/* Price */}
                  {item.lowestPrice !== null ? (
                    <Text style={[styles.price, { color: colors.primary }]}>
                      💰 Starting from {formatCurrency(item.lowestPrice)} {item.priceUnit ?? ''}
                    </Text>
                  ) : (
                    <Text style={[styles.price, { color: colors.muted }]}>💰 Contact for rates</Text>
                  )}

                  {/* Facilities */}
                  {item.facilities.length > 0 && (
                    <View style={styles.facilityRow}>
                      {item.facilities.slice(0, 4).map(f => (
                        <View key={f} style={[styles.facilityChip, { backgroundColor: colors.subtle }]}>
                          <Text style={[styles.facilityText, { color: colors.text }]}>{f}</Text>
                        </View>
                      ))}
                      {item.facilities.length > 4 && (
                        <Text style={[styles.moreFacilities, { color: colors.muted }]}>+{item.facilities.length - 4} more</Text>
                      )}
                    </View>
                  )}

                  {/* Description */}
                  <Text style={[styles.description, { color: colors.muted }]} numberOfLines={3}>
                    {item.description}
                  </Text>

                  {/* Why matched */}
                  <View style={[styles.matchBanner, { backgroundColor: colors.success + '12', borderColor: colors.success + '30' }]}>
                    <Text style={[styles.matchLabel, { color: colors.success }]}>
                      ✅ Matches: {item.matchedKeywords.slice(0, 4).join(', ')}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.detailBtn, { backgroundColor: colors.primary }]}
                      onPress={() => router.push({ pathname: '/(tourist)/business/[id]', params: { id: item.id } } as any)}
                    >
                      <Text style={[styles.detailBtnText, { color: colors.onPrimary }]}>View Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.favOutlineBtn, { borderColor: item.isFavorite ? colors.danger : colors.border }]}
                      onPress={() => toggleFavorite(item)}
                    >
                      <Text style={[styles.favOutlineBtnText, { color: item.isFavorite ? colors.danger : colors.muted }]}>
                        {item.isFavorite ? '♥ Saved' : '♡ Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            <View style={[styles.disclaimer, { backgroundColor: colors.subtle }]}>
              <Text style={[styles.disclaimerText, { color: colors.muted }]}>
                ⚠️ Prices and information are published by the establishments. Confirm directly before visiting. Recommendations are based on keyword matching against verified listings only.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  backBtn: { alignSelf: 'flex-start' },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * Typography.lineHeight },
  searchCard: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  searchInput: {
    borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.md,
    fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body,
    minHeight: 80,
  },
  searchBtn: { paddingVertical: Spacing.md, borderRadius: Radius.lg, alignItems: 'center' },
  searchBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  examples: { gap: Spacing.md },
  examplesLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  exampleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  exampleChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1, maxWidth: 200 },
  exampleChipText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  loadingState: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  loadingText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  noResults: { borderRadius: Radius.md, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  noResultsIcon: { fontSize: 48 },
  noResultsTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  noResultsText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center', lineHeight: Typography.size.body * Typography.lineHeight },
  browseBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.lg, marginTop: Spacing.sm },
  browseBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  results: { gap: Spacing.lg },
  resultsHeader: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  resultCard: { borderRadius: Radius.md, overflow: 'hidden' },
  rankBadge: { position: 'absolute', top: Spacing.md, left: Spacing.md, zIndex: 1, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm },
  rankText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.bold },
  coverImage: { width: '100%', height: 180 },
  coverPlaceholder: { width: '100%', height: 180, alignItems: 'center', justifyContent: 'center' },
  coverIcon: { fontSize: 48 },
  cardBody: { padding: Spacing.base, gap: Spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  nameInfo: { flex: 1, gap: Spacing.xs },
  bizName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  bizCategory: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textTransform: 'capitalize' },
  favBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  address: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  price: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  facilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  facilityChip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm },
  facilityText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label },
  moreFacilities: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, alignSelf: 'center' },
  description: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * Typography.lineHeight },
  matchBanner: { padding: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1 },
  matchLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  actions: { flexDirection: 'row', gap: Spacing.md },
  detailBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.lg, alignItems: 'center' },
  detailBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  favOutlineBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5, alignItems: 'center' },
  favOutlineBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  disclaimer: { borderRadius: Radius.md, padding: Spacing.md },
  disclaimerText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * Typography.lineHeight },
});
