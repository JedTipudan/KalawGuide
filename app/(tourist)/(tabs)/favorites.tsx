import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { KalawCard } from '../../../components/cards/KalawCard';
import { KalawAssistanceFAB } from '../../../components/assistant/KalawAssistanceFAB';
import { getDatabase } from '../../../database/migrations/init';
import { Typography, Spacing, Radius } from '../../../constants/tokens';

type FavTab = 'destinations' | 'businesses';

interface DestFav {
  id: string; entity_id: string; name: string; location: string;
  cover_image_url: string | null; estimated_fee: number | null; fee_verified: number;
  category_name: string;
}
interface BizFav {
  id: string; entity_id: string; name: string; address: string;
  cover_image_url: string | null; category: string;
}

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<FavTab>('destinations');
  const [destFavs, setDestFavs] = useState<DestFav[]>([]);
  const [bizFavs, setBizFavs] = useState<BizFav[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const dests = await db.getAllAsync<DestFav>(`
      SELECT f.id, f.entity_id, d.name, d.location, d.cover_image_url,
             d.estimated_fee, d.fee_verified, c.name as category_name
      FROM favorites f
      JOIN destinations d ON f.entity_id = d.id
      LEFT JOIN destination_categories c ON d.category_id = c.id
      WHERE f.user_id = ? AND f.entity_type = 'destination' AND d.is_active = 1
      ORDER BY f.created_at DESC
    `, [user.id]);
    setDestFavs(dests);

    const bizs = await db.getAllAsync<BizFav>(`
      SELECT f.id, f.entity_id, b.name, b.address, b.cover_image_url, b.category
      FROM favorites f
      JOIN businesses b ON f.entity_id = b.id
      WHERE f.user_id = ? AND f.entity_type = 'business'
        AND b.verification_status = 'approved' AND b.is_active = 1
      ORDER BY f.created_at DESC
    `, [user.id]);
    setBizFavs(bizs);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function removeFav(favId: string) {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM favorites WHERE id = ?', [favId]);
    await load();
  }

  const isEmpty = tab === 'destinations' ? destFavs.length === 0 : bizFavs.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Favorites</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Your saved places</Text>
        <View style={[styles.tabs, { backgroundColor: colors.subtle }]}>
          {(['destinations', 'businesses'] as FavTab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && { backgroundColor: colors.surface }]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.muted }]}>
                {t === 'destinations' ? '🗺 Destinations' : '🏪 Businesses'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={(tab === 'destinations' ? destFavs : bizFavs) as any[]}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{tab === 'destinations' ? '🗺' : '🏪'}</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No favorites yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Tap the ♡ on any {tab === 'destinations' ? 'destination' : 'business'} to save it here.
            </Text>
            <TouchableOpacity
              style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push(tab === 'destinations' ? '/(tourist)/explore' : '/(tourist)/businesses')}
            >
              <Text style={[styles.exploreBtnText, { color: colors.onPrimary }]}>
                Explore {tab === 'destinations' ? 'Destinations' : 'Businesses'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          if (tab === 'destinations') {
            const d = item as DestFav;
            return (
              <View>
                <KalawCard
                  title={d.name}
                  subtitle={`${d.category_name} · ${d.location}`}
                  imageUrl={d.cover_image_url ?? undefined}
                  badge={d.fee_verified ? `₱${d.estimated_fee}` : undefined}
                  badgeColor={colors.success + '30'}
                  onPress={() => router.push({ pathname: '/(tourist)/destination/[id]', params: { id: d.entity_id } } as any)}
                />
                <TouchableOpacity
                  style={[styles.removeBtn, { backgroundColor: colors.danger + '15' }]}
                  onPress={() => removeFav(d.id)}
                >
                  <Text style={[styles.removeBtnText, { color: colors.danger }]}>♥ Remove from Favorites</Text>
                </TouchableOpacity>
              </View>
            );
          } else {
            const b = item as unknown as BizFav;
            return (
              <View>
                <KalawCard
                  title={b.name}
                  subtitle={`${b.category.replace('_', ' ')} · ${b.address}`}
                  imageUrl={b.cover_image_url ?? undefined}
                  badge="Verified"
                  badgeColor={colors.success + '30'}
                  onPress={() => router.push({ pathname: '/(tourist)/business/[id]', params: { id: b.entity_id } } as any)}
                />
                <TouchableOpacity
                  style={[styles.removeBtn, { backgroundColor: colors.danger + '15' }]}
                  onPress={() => removeFav(b.id)}
                >
                  <Text style={[styles.removeBtnText, { color: colors.danger }]}>♥ Remove from Favorites</Text>
                </TouchableOpacity>
              </View>
            );
          }
        }}
      />
      <KalawAssistanceFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.base, gap: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  tabs: { flexDirection: 'row', borderRadius: Radius.lg, padding: 4 },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center' },
  tabLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },
  removeBtn: { marginTop: -Spacing.sm, marginBottom: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base, borderBottomLeftRadius: Radius.md, borderBottomRightRadius: Radius.md, alignItems: 'center' },
  removeBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  emptySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center', maxWidth: 280 },
  exploreBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.lg, marginTop: Spacing.sm },
  exploreBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
});
