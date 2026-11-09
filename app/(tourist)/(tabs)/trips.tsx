import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { KalawAssistanceFAB } from '../../../components/assistant/KalawAssistanceFAB';
import { getDatabase } from '../../../database/migrations/init';
import { generateId, now, formatShortDate, getDaysBetween } from '../../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../../constants/tokens';

interface ItineraryRow {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
}

export default function TripsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [itineraries, setItineraries] = useState<ItineraryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<ItineraryRow>(
        'SELECT id, title, description, start_date, end_date, created_at FROM itineraries WHERE user_id = ? ORDER BY start_date DESC',
        [user.id]
      );
      setItineraries(rows);
    } catch (e) {
      console.error('trips load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function createNew() {
    if (!user) return;
    if (Platform.OS === 'web') {
      router.push('/(web)/explore?from=trips' as any);
      return;
    }
    const id = generateId();
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 2);
    const startIso = start.toISOString().split('T')[0];
    const endIso = end.toISOString().split('T')[0];
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO itineraries (id, user_id, title, start_date, end_date, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'local_only')`,
        [id, user.id, 'My Trip to Mati', startIso, endIso, now(), now()]
      );
      await load();
      router.push({ pathname: '/(tourist)/itinerary/[id]', params: { id } } as any);
    } catch (e) {
      Alert.alert('Error', 'Could not create itinerary.');
    }
  }

  async function deleteItinerary(id: string) {
    if (Platform.OS === 'web') {
      if (!window.confirm('Delete this trip?')) return;
      const db = await getDatabase();
      await db.runAsync('DELETE FROM itineraries WHERE id = ?', [id]);
      setItineraries(prev => prev.filter(i => i.id !== id));
    } else {
      Alert.alert('Delete Trip', 'Are you sure you want to delete this trip?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const db = await getDatabase();
          await db.runAsync('DELETE FROM itineraries WHERE id = ?', [id]);
          setItineraries(prev => prev.filter(i => i.id !== id));
        }},
      ]);
    }
  }

  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>My Trips</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Plan and manage your itineraries</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={createNew}
          accessibilityLabel="Create new trip"
        >
          <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={itineraries}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No trips yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                Tap "+ New" to plan your first Mati City adventure.
              </Text>
            </View>
          ) : <View />
        }
        renderItem={({ item }) => {
          const days = getDaysBetween(item.start_date, item.end_date);
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}
              onPress={() => {
                if (Platform.OS === 'web') {
                  router.push(`/(web)/itinerary/${item.id}` as any);
                } else {
                  router.push({ pathname: '/(tourist)/itinerary/[id]', params: { id: item.id } } as any);
                }
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.cardDates, { color: colors.muted }]}>
                  {formatShortDate(item.start_date)} – {formatShortDate(item.end_date)} · {days} day{days !== 1 ? 's' : ''}
                </Text>
                {item.description ? (
                  <Text style={[styles.cardDesc, { color: colors.muted }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => deleteItinerary(item.id)}
                style={styles.deleteBtn}
                accessibilityLabel="Delete trip"
              >
                <Text style={[styles.deleteIcon, { color: colors.danger }]}>🗑</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
      {Platform.OS !== 'web' && <KalawAssistanceFAB />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.base, paddingBottom: Spacing.sm,
  },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  addBtn: {
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  addBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },
  card: {
    flexDirection: 'row', borderRadius: Radius.md, overflow: 'hidden', alignItems: 'center',
  },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: Spacing.base, gap: Spacing.xs },
  cardTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  cardDates: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  cardDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  deleteBtn: { padding: Spacing.base },
  deleteIcon: { fontSize: 18 },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  emptySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center', maxWidth: 260 },
});
