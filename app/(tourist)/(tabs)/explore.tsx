import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TextInput, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { KalawCard } from '../../../components/cards/KalawCard';
import { KalawAssistanceFAB } from '../../../components/assistant/KalawAssistanceFAB';
import { getDatabase } from '../../../database/migrations/init';
import { Typography, Spacing, Radius } from '../../../constants/tokens';
import { Icon } from '../../../components/common/Icon';

const CATEGORY_EMOJI: Record<string, string> = {
  waves: '🏖', tree: '🌳', landmark: '🏛', mountain: '⛰️',
  utensils: '🍽', bed: '🏨', map: '🗺', star: '⭐',
};

interface DestinationRow {
  id: string; name: string; description: string;
  location: string; cover_image_url: string | null;
  estimated_fee: number | null; fee_verified: number;
  category_name: string; category_color: string;
}

interface CategoryRow { id: string; name: string; icon: string; color: string; }

export default function ExploreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [destinations, setDestinations] = useState<DestinationRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const cats = await db.getAllAsync<CategoryRow>('SELECT * FROM destination_categories ORDER BY name');
      setCategories(cats);

      let query = `
        SELECT d.id, d.name, d.description, d.location, d.cover_image_url,
               d.estimated_fee, d.fee_verified, c.name as category_name, c.color as category_color
        FROM destinations d
        LEFT JOIN destination_categories c ON d.category_id = c.id
        WHERE d.is_active = 1
      `;
      const params: (string | number)[] = [];

      if (selectedCategory) {
        query += ' AND d.category_id = ?';
        params.push(selectedCategory);
      }
      if (search.trim()) {
        query += ' AND (d.name LIKE ? OR d.location LIKE ? OR d.description LIKE ?)';
        const s = `%${search.trim()}%`;
        params.push(s, s, s);
      }
      query += ' ORDER BY d.is_featured DESC, d.name ASC';

      const rows = await db.getAllAsync<DestinationRow>(query, params);
      setDestinations(rows);
    } catch (e) {
      console.error('loadData error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Explore</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Discover Mati City & Davao Oriental</Text>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search destinations..."
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

        {/* Category filter */}
        <FlatList
          horizontal
          data={[{ id: null, name: 'All', icon: '🌐', color: colors.primary }, ...categories.map(c => ({ ...c, icon: CATEGORY_EMOJI[c.icon] ?? '📍' }))]}
          keyExtractor={item => item.id ?? 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(item.id)}
              >
                <Text style={styles.categoryIcon}>{item.icon}</Text>
                <Text style={[styles.categoryLabel, { color: isSelected ? colors.onPrimary : colors.text }]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Destinations list */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={destinations}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🗺</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No destinations found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                Try a different search or category filter.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <KalawCard
              title={item.name}
              subtitle={`${item.category_name} · ${item.location}`}
              imageUrl={item.cover_image_url ?? undefined}
              badge={item.fee_verified ? `₱${item.estimated_fee}` : undefined}
              badgeColor={colors.success + '30'}
              onPress={() => router.push({ pathname: '/(tourist)/destination/[id]', params: { id: item.id } } as any)}
              style={styles.card}
            />
          )}
        />
      )}

      <KalawAssistanceFAB />
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
  categoryList: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.xl, borderWidth: 1.5,
  },
  categoryIcon: { fontSize: 14 },
  categoryLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },
  card: {},
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingTop: Spacing.xxxl, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  emptySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center' },
});
