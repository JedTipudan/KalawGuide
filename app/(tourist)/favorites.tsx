import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawCard } from '../../components/cards/KalawCard';
import { getDatabase } from '../../database/migrations/init';
import { now } from '../../utils/helpers';
import { Typography, Spacing, Radius } from '../../constants/tokens';

interface FavRow {
  id: string; entity_type: string; entity_id: string;
  name: string; location: string; cover_image_url: string | null; category: string;
}

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavRow[]>([]);
  const [tab, setTab] = useState<'destination' | 'business'>('destination');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const dests = await db.getAllAsync<FavRow>(`
      SELECT f.id, f.entity_type, f.entity_id, d.name, d.location, d.cover_image_url, c.name as category
      FROM favorites f
      JOIN destinations d ON f.entity_id = d.id
      LEFT JOIN destination_categories c ON d.category_id = c.id
      WHERE f.user_id = ? AND f.entity_type = 'destination'
      ORDER BY f.created_at DESC`, [user.id]);
    const bizs = await db.getAllAsync<FavRow>(`
      SELECT f.id, f.entity_type, f.entity_id, b.name, b.address as location, b.cover_image_url, b.category
      FROM favorites f
      JOIN businesses b ON f.entity_id = b.id
      WHERE f.user_id = ? AND f.entity_type = 'business' AND b.verification_status = 'approved'
      ORDER BY f.created_at DESC`, [user.id]);
    setFavorites(tab === 'destination' ? dests : bizs);
  }, [user, tab]);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function removeFavorite(entityId: string) {
    if (!user) return;
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM favorites WHERE user_id=? AND entity_id=?`, [user.id, entityId]);
    setFavorites(prev => prev.filter(f => f.entity_id !== entityId));
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Favorites</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Your saved places</Text>
      </View>

      <View style={styles.tabs}>
        {(['destination', 'business'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, { backgroundColor: tab === t ? colors.primary : colors.surface, borderColor: tab === t ? colors.primary : colors.border }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? colors.onPrimary : colors.text }]}>
              {t === 'destination' ? '🗺 Destinations' : '🏪 Businesses'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={favorites}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{tab === 'destination' ? '🗺' : '🏪'}</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved {tab === 'destination' ? 'destinations' : 'businesses'}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Tap ♡ on any listing to save it here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View>
            <KalawCard
              title={item.name}
              subtitle={`${item.category} · ${item.location}`}
              imageUrl={item.cover_image_url ?? undefined}
              onPress={() => {
                if (tab === 'destination') router.push({ pathname: '/(tourist)/destination/[id]', params: { id: item.entity_id } } as any);
                else router.push({ pathname: '/(tourist)/business/[id]', params: { id: item.entity_id } } as any);
              }}
            />
            <TouchableOpacity style={[styles.removeBtn, { borderColor: colors.danger }]} onPress={() => removeFavorite(item.entity_id)}>
              <Text style={[styles.removeBtnText, { color: colors.danger }]}>♡ Remove from favorites</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.base, gap: Spacing.xs },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  tabs: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1.5 },
  tabLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },
  removeBtn: { marginTop: -Spacing.sm, marginBottom: Spacing.sm, alignSelf: 'flex-end', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.lg, borderWidth: 1 },
  removeBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  emptySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center' },
});
