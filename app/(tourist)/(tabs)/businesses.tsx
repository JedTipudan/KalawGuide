import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TextInput, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { KalawCard } from '../../../components/cards/KalawCard';
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

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      let query = `SELECT id, name, description, category, address, cover_image_url, verification_status
                   FROM businesses WHERE verification_status = 'approved' AND is_active = 1`;
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
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏪</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No businesses found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                {search || selectedCategory
                  ? 'Try a different search or category.'
                  : 'Approved businesses will appear here once verified by an administrator.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <KalawCard
              title={item.name}
              subtitle={`${CATEGORIES.find(c => c.id === item.category)?.icon ?? '🏪'} ${item.category.replace('_', ' ')} · ${item.address}`}
              imageUrl={item.cover_image_url ?? undefined}
              badge="Verified"
              badgeColor={colors.success + '30'}
              onPress={() => router.push({ pathname: '/(tourist)/business/[id]', params: { id: item.id } } as any)}
            />
          )}
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
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  emptySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center', maxWidth: 280 },
});
