import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TextInput, TouchableOpacity, ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { KalawCard } from '../../../components/cards/KalawCard';
import { placeImage } from '../../../utils/placeImages';
import { fromPriceLabel, LOWEST_PRICE_SQL } from '../../../utils/priceLabel';
import { KalawAssistanceFAB } from '../../../components/assistant/KalawAssistanceFAB';
import { getDatabase } from '../../../database/migrations/init';
import { Typography, Spacing, Radius } from '../../../constants/tokens';
import { Icon } from '../../../components/common/Icon';

interface BusinessRow {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  cover_image_url: string | null;
  verification_status: string;
  min_price: number | null;
  min_unit: string | null;
}

const CATEGORIES = [
  { id: null, label: 'All', icon: '🌐' },
  { id: 'accommodation', label: 'Stay', icon: '🏨' },
  { id: 'restaurant', label: 'Food', icon: '🍽' },
  { id: 'tour_operator', label: 'Tours', icon: '🗺' },
  { id: 'transport', label: 'Transport', icon: '🚌' },
  { id: 'activity', label: 'Activities', icon: '🏄' },
  { id: 'retail', label: 'Retail', icon: '🛍' },
];

export default function BusinessesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  // Phones get one column; wider screens (tablet, desktop browser) get a grid of smaller cards
  // instead of one card stretched across the whole page.
  const { width } = useWindowDimensions();
  const columns = width >= 1024 ? 3 : width >= 640 ? 2 : 1;

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      let query = `SELECT id, name, description, category, address, cover_image_url, verification_status, ${LOWEST_PRICE_SQL}
                   FROM businesses b WHERE verification_status = 'approved' AND is_active = 1`;
      const params: (string | number)[] = [];

      if (selectedCategory) {
        query += ' AND category = ?';
        params.push(selectedCategory);
      }
      if (search.trim()) {
        query += ' AND (name LIKE ? OR description LIKE ? OR address LIKE ?)';
        const s = `%${search.trim()}%`;
        params.push(s, s, s);
      }
      query += ' ORDER BY name ASC';

      const rows = await db.getAllAsync<BusinessRow>(query, params);
      setBusinesses(rows);
    } catch (e) {
      console.error('businesses load error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search]);

  useEffect(() => { load(); }, [load]);


  function renderCard(item: BusinessRow) {
    return (
      <KalawCard
        title={item.name}
        subtitle={`${CATEGORIES.find(c => c.id === item.category)?.icon ?? '🏪'} ${item.category.replace('_', ' ')} · ${item.address}`}
        image={placeImage(item.name, item.cover_image_url, item.category)}
        badge="Verified"
        badgeColor={colors.success + '30'}
        imageHeight={columns > 1 ? 150 : 140}
        fill={columns > 1}
        onPress={() => router.push({ pathname: Platform.OS === 'web' ? '/(web)/business/[id]' : '/(tourist)/business/[id]', params: { id: item.id } } as any)}
      >
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>{fromPriceLabel(item.min_price, item.min_unit)}</Text>
      </KalawCard>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Local Businesses</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Discover verified businesses in Mati City</Text>

        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search businesses..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={item => item.id ?? 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => {
            const active = selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[styles.chip, {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                }]}
                onPress={() => setSelectedCategory(item.id)}
              >
                <Text style={styles.chipIcon}>{item.icon}</Text>
                <Text style={[styles.chipLabel, { color: active ? colors.onPrimary : colors.text }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : businesses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏪</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No businesses found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            {search || selectedCategory
              ? 'Try a different search or category.'
              : 'Approved businesses will appear here once verified by an administrator.'}
          </Text>
        </View>
      ) : columns > 1 ? (
        <ScrollView contentContainerStyle={[styles.list, styles.grid]} showsVerticalScrollIndicator={false}>
          {businesses.map(item => (
            <View key={item.id} style={{ width: `${100 / columns}%` as any, padding: Spacing.sm }}>
              {renderCard(item)}
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => renderCard(item)}
        />
      )}
      {Platform.OS !== 'web' && <KalawAssistanceFAB />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.base, gap: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderRadius: Radius.lg, paddingHorizontal: Spacing.base, height: 48, gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  chips: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.xl, borderWidth: 1.5,
  },
  chipIcon: { fontSize: 14 },
  chipLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },
  // Wide screens: cards wrap into columns (each cell sets its own width and gutter).
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, paddingHorizontal: Spacing.sm },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  emptySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center', maxWidth: 280 },
});
