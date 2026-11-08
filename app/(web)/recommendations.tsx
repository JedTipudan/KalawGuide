import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { WebLayout } from '../../components/web/WebLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now, formatCurrency } from '../../utils/helpers';

interface RecommendationResult {
  id: string; name: string; category: string; address: string;
  description: string; coverImageUrl: string | null;
  score: number; matchedKeywords: string[];
  lowestPrice: number | null; priceUnit: string | null;
  facilities: string[]; isFavorite: boolean;
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

const EXAMPLES = [
  'peaceful beach resort with cottages and sunset views',
  'affordable accommodation near the beach',
  'adventure activities like surfing and kayaking',
  'family-friendly resort with swimming pool',
];

export default function WebRecommendationsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true); setSearched(true);
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
          if (queryHits && bizHits) { score += 3; matchedKeywords.push(group); }
          else if (bizHits) { score += 0.5; }
        }
        const queryWords = ql.split(/\s+/).filter(w => w.length > 3);
        for (const word of queryWords) {
          if (searchText.includes(word)) { score += 1; if (!matchedKeywords.includes(word)) matchedKeywords.push(word); }
        }
        if (score < 1) continue;
        const priceRow = await db.getFirstAsync<{ amount: number; unit: string }>(
          'SELECT amount, unit FROM listing_prices WHERE business_id = ? AND is_active = 1 ORDER BY amount ASC LIMIT 1', [biz.id]
        );
        const facilityRows = await db.getAllAsync<{ name: string }>(
          'SELECT name FROM listing_facilities WHERE business_id = ? LIMIT 5', [biz.id]
        );
        let isFavorite = false;
        if (user) {
          const fav = await db.getFirstAsync<{ id: string }>(
            "SELECT id FROM favorites WHERE user_id = ? AND entity_type = 'business' AND entity_id = ?", [user.id, biz.id]
          );
          isFavorite = !!fav;
        }
        scored.push({
          ...biz, coverImageUrl: biz.cover_image_url, score,
          matchedKeywords: [...new Set(matchedKeywords)],
          lowestPrice: priceRow?.amount ?? null, priceUnit: priceRow?.unit ?? null,
          facilities: facilityRows.map(f => f.name), isFavorite,
        });
      }
      scored.sort((a, b) => b.score - a.score);
      setResults(scored.slice(0, 6));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  async function toggleFavorite(item: RecommendationResult) {
    if (!user) { window.alert('Please sign in to save favorites.'); return; }
    const db = await getDatabase();
    if (item.isFavorite) {
      await db.runAsync("DELETE FROM favorites WHERE user_id = ? AND entity_type = 'business' AND entity_id = ?", [user.id, item.id]);
    } else {
      await db.runAsync('INSERT OR IGNORE INTO favorites (id, user_id, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?)',
        [generateId(), user.id, 'business', item.id, now()]);
    }
    setResults(prev => prev.map(r => r.id === item.id ? { ...r, isFavorite: !r.isFavorite } : r));
  }

  return (
    <WebLayout navVariant="tourist" scrollable>
      <View style={[s.workspace, { backgroundColor: colors.background }]}>
        <Text style={[s.pageTitle, { color: colors.text }]}>🌟 Find Your Ideal Place</Text>
        <Text style={[s.pageSub, { color: colors.muted }]}>
          Describe what you're looking for and we'll match it against verified businesses in Mati City.
        </Text>

        {/* Search */}
        <View style={[s.searchCard, { backgroundColor: colors.surface }]}>
          <TextInput
            style={[s.searchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. peaceful beach resort with cottages and sunset views"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            multiline
            numberOfLines={3}
          />
          <View style={s.searchRow}>
            <TouchableOpacity
              style={[s.searchBtn, { backgroundColor: query.trim() ? colors.primary : colors.border }]}
              onPress={() => search(query)}
              disabled={!query.trim() || loading}
            >
              <Text style={[s.searchBtnText, { color: query.trim() ? colors.onPrimary : colors.muted }]}>
                {loading ? 'Searching…' : '🔍 Find Matches'}
              </Text>
            </TouchableOpacity>
            <View style={s.examples}>
              {EXAMPLES.map((eq, i) => (
                <TouchableOpacity key={i}
                  style={[s.exampleChip, { backgroundColor: colors.subtle, borderColor: colors.border }]}
                  onPress={() => { setQuery(eq); search(eq); }}>
                  <Text style={[s.exampleText, { color: colors.text }]} numberOfLines={1}>{eq}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Loading */}
        {loading && (
          <View style={s.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[s.loadingText, { color: colors.muted }]}>Matching against verified businesses…</Text>
          </View>
        )}

        {/* No results */}
        {searched && !loading && results.length === 0 && (
          <View style={[s.noResults, { backgroundColor: colors.surface }]}>
            <Text style={s.noResultsIcon}>🔍</Text>
            <Text style={[s.noResultsTitle, { color: colors.text }]}>No close match found</Text>
            <Text style={[s.noResultsText, { color: colors.muted }]}>
              No verified businesses closely match your description. Try different keywords or browse all businesses.
            </Text>
          </View>
        )}

        {/* Results grid */}
        {results.length > 0 && (
          <View style={s.resultsSection}>
            <Text style={[s.resultsHeader, { color: colors.text }]}>{results.length} match{results.length !== 1 ? 'es' : ''} found</Text>
            <View style={s.grid}>
              {results.map((item, index) => (
                <View key={item.id} style={[s.card, { backgroundColor: colors.surface }]}>
                  <View style={s.cardImgWrap}>
                    {item.coverImageUrl ? (
                      <Image source={{ uri: item.coverImageUrl }} style={s.cardImg} resizeMode="cover" />
                    ) : (
                      <View style={[s.cardImgPlaceholder, { backgroundColor: colors.subtle }]}>
                        <Text style={s.cardImgIcon}>🏪</Text>
                      </View>
                    )}
                    <View style={[s.rankBadge, { backgroundColor: index === 0 ? colors.primary : colors.subtle }]}>
                      <Text style={[s.rankText, { color: index === 0 ? colors.onPrimary : colors.muted }]}>#{index + 1}</Text>
                    </View>
                  </View>
                  <View style={s.cardBody}>
                    <View style={s.cardNameRow}>
                      <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                      <TouchableOpacity onPress={() => toggleFavorite(item)}>
                        <Text style={{ fontSize: 20, color: item.isFavorite ? colors.danger : colors.muted }}>
                          {item.isFavorite ? '♥' : '♡'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[s.cardCategory, { color: colors.muted }]}>{item.category.replace('_', ' ')}</Text>
                    <Text style={[s.cardAddr, { color: colors.muted }]}>📍 {item.address}</Text>
                    {item.lowestPrice !== null
                      ? <Text style={[s.cardPrice, { color: colors.primary }]}>💰 From {formatCurrency(item.lowestPrice)} {item.priceUnit ?? ''}</Text>
                      : <Text style={[s.cardPrice, { color: colors.muted }]}>💰 Contact for rates</Text>
                    }
                    {item.facilities.length > 0 && (
                      <View style={s.facilityRow}>
                        {item.facilities.slice(0, 3).map(f => (
                          <View key={f} style={[s.facilityChip, { backgroundColor: colors.subtle }]}>
                            <Text style={[s.facilityText, { color: colors.text }]}>{f}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={[s.matchBanner, { backgroundColor: colors.success + '12', borderColor: colors.success + '30' }]}>
                      <Text style={[s.matchText, { color: colors.success }]}>
                        ✅ {item.matchedKeywords.slice(0, 3).join(', ')}
                      </Text>
                    </View>
                    <Text style={[s.cardDesc, { color: colors.muted }]} numberOfLines={2}>{item.description}</Text>
                    <View style={s.cardActions}>
                      <TouchableOpacity
                        style={[s.detailBtn, { backgroundColor: colors.primary }]}
                        onPress={() => router.push(`/(web)/businesses` as any)}
                      >
                        <Text style={[s.detailBtnText, { color: colors.onPrimary }]}>View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
            <Text style={[s.disclaimer, { color: colors.muted }]}>
              ⚠️ Prices and information are published by the establishments. Confirm directly before visiting.
            </Text>
          </View>
        )}
      </View>
    </WebLayout>
  );
}

const s = StyleSheet.create({
  workspace: { padding: 40, gap: 28 },
  pageTitle: { fontSize: 28, fontWeight: '700' },
  pageSub: { fontSize: 15, marginTop: -20 },
  searchCard: { borderRadius: 12, padding: 20, gap: 14 },
  searchInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  searchRow: { gap: 10 },
  searchBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, alignSelf: 'flex-start' },
  searchBtnText: { fontSize: 14, fontWeight: '600' },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exampleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, maxWidth: 260 },
  exampleText: { fontSize: 13 },
  loadingState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 14 },
  noResults: { borderRadius: 12, padding: 40, alignItems: 'center', gap: 12 },
  noResultsIcon: { fontSize: 40 },
  noResultsTitle: { fontSize: 18, fontWeight: '700' },
  noResultsText: { fontSize: 14, textAlign: 'center', maxWidth: 400 },
  resultsSection: { gap: 16 },
  resultsHeader: { fontSize: 18, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  card: { width: 320, borderRadius: 12, overflow: 'hidden' },
  cardImgWrap: { position: 'relative' },
  cardImg: { width: '100%', height: 180 },
  cardImgPlaceholder: { width: '100%', height: 180, alignItems: 'center', justifyContent: 'center' },
  cardImgIcon: { fontSize: 48 },
  rankBadge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rankText: { fontSize: 12, fontWeight: '700' },
  cardBody: { padding: 16, gap: 8 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 16, fontWeight: '700', flex: 1 },
  cardCategory: { fontSize: 13, textTransform: 'capitalize' },
  cardAddr: { fontSize: 13 },
  cardPrice: { fontSize: 14, fontWeight: '600' },
  facilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  facilityChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  facilityText: { fontSize: 12 },
  matchBanner: { padding: 8, borderRadius: 6, borderWidth: 1 },
  matchText: { fontSize: 13, fontWeight: '500' },
  cardDesc: { fontSize: 13, lineHeight: 19 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  detailBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  detailBtnText: { fontSize: 13, fontWeight: '600' },
  disclaimer: { fontSize: 13, lineHeight: 20 },
});
