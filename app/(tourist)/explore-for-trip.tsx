import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface DestRow {
  id: string; name: string; description: string;
  location: string; estimated_fee: number | null;
}

export default function ExploreForTripScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [destinations, setDestinations] = useState<DestRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  useEffect(() => {
    getDatabase().then(db =>
      db.getAllAsync<DestRow>(
        'SELECT id, name, description, location, estimated_fee FROM destinations WHERE is_active = 1 ORDER BY is_featured DESC, name ASC'
      )
    ).then(rows => { setDestinations(rows); setLoading(false); })
     .catch(() => setLoading(false));
  }, []);

  const filtered = destinations.filter(d =>
    !search.trim() ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.location.toLowerCase().includes(search.toLowerCase())
  );

  async function addToMyTrips(dest: DestRow) {
    if (!user || addingId) return;
    setAddingId(dest.id);
    try {
      const db = await getDatabase();
      const itinId = generateId();
      const start = new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + 2);
      const ts = now();
      await db.runAsync(
        `INSERT INTO itineraries (id, user_id, title, start_date, end_date, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'local_only')`,
        [itinId, user.id, `Trip to ${dest.name}`, start.toISOString().split('T')[0], end.toISOString().split('T')[0], ts, ts]
      );
      await db.runAsync(
        `INSERT INTO itinerary_items (id, itinerary_id, day_number, time, title, description, destination_id, estimated_cost, sort_order, created_at, updated_at)
         VALUES (?, ?, 1, '09:00', ?, ?, ?, ?, 0, ?, ?)`,
        [generateId(), itinId, `Visit ${dest.name}`, dest.description, dest.id, dest.estimated_fee ?? 0, ts, ts]
      );
      router.replace('/(tourist)/(tabs)/trips' as any);
    } catch (e) {
      Alert.alert('Error', 'Could not create trip.');
    } finally {
      setAddingId(null);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Pick a Destination</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Select a destination to add to your trips</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search destinations..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏝</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No destinations found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
              <View style={styles.cardBody}>
                <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.cardLoc, { color: colors.muted }]}>📍 {item.location}</Text>
                <Text style={[styles.cardDesc, { color: colors.muted }]} numberOfLines={2}>{item.description}</Text>
                {item.estimated_fee !== null && (
                  <Text style={[styles.cardFee, { color: colors.primary }]}>
                    {item.estimated_fee === 0 ? 'Free' : `₱${item.estimated_fee}`}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary, opacity: addingId === item.id ? 0.7 : 1 }]}
                onPress={() => addToMyTrips(item)}
                disabled={!!addingId}
              >
                <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>
                  {addingId === item.id ? 'Adding...' : '+ Add to My Trips'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.base, gap: Spacing.sm },
  backBtn: { alignSelf: 'flex-start' },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: Radius.lg, paddingHorizontal: Spacing.base, height: 48 },
  searchInput: { flex: 1, fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 40 },
  card: { borderRadius: Radius.md, overflow: 'hidden' },
  cardBody: { padding: Spacing.base, gap: Spacing.xs },
  cardName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  cardLoc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  cardDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: 20 },
  cardFee: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  addBtn: { margin: Spacing.base, marginTop: 0, padding: Spacing.sm, borderRadius: Radius.md, alignItems: 'center' },
  addBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
});
