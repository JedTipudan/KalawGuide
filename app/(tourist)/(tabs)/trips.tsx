import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { KalawAssistanceFAB } from '../../../components/assistant/KalawAssistanceFAB';
import { getDatabase } from '../../../database/migrations/init';
import { Typography } from '../../../constants/tokens';
import { Kiko } from '../../../components/brand/Kiko';

interface ItineraryRow {
  id: string; title: string; description: string | null;
  start_date: string; end_date: string; created_at: string;
}

export default function TripsScreen() {
  const { colors } = useTheme();
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
    } catch (e) { /* silent */ } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function deleteItinerary(id: string) {
    if (Platform.OS === 'web') {
      if (!window.confirm('Delete this trip?')) return;
    } else {
      await new Promise<void>(resolve =>
        Alert.alert('Delete Trip', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
          { text: 'Delete', style: 'destructive', onPress: async () => {
            const db = await getDatabase();
            await db.runAsync('DELETE FROM itineraries WHERE id = ?', [id]);
            setItineraries(prev => prev.filter(i => i.id !== id));
            resolve();
          }},
        ])
      );
      return;
    }
    const db = await getDatabase();
    await db.runAsync('DELETE FROM itineraries WHERE id = ?', [id]);
    setItineraries(prev => prev.filter(i => i.id !== id));
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Nav bar — mobile only; on web the top WebNav handles navigation */}
      {Platform.OS !== 'web' && (
        <View style={[styles.navBar, { backgroundColor: colors.surface }]}>
          <Text style={[styles.navTitle, { color: colors.primary }]}>My Trips</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>My trips</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Your upcoming escapes, saved plans, and favorite memories.
          </Text>

          {/* Tab buttons */}
          <TouchableOpacity style={[styles.tabBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.tabBtnText, { color: colors.text }]}>Upcoming trips</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.tabBtnText, { color: colors.text }]}>Past trips</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.tabBtnText, { color: colors.text }]}>Saved itineraries</Text>
          </TouchableOpacity>

          {/* Trip list */}
          {itineraries.length === 0 && !loading ? (
            <View style={[styles.savedCard, { backgroundColor: colors.surface, alignItems: 'center' }]}>
              <Kiko pose="relax" height={150} />
              <Text style={[styles.savedTitle, { color: colors.text, textAlign: 'center' }]}>Your coastal escape, ready when you are.</Text>
              <Text style={[styles.savedBody, { color: colors.muted, textAlign: "center" }]}>
                No trips yet.{'\n'}Keep planning without losing your place.
              </Text>
            </View>
          ) : (
            itineraries.map(item => {
              const days = Math.max(1, Math.round((new Date(item.end_date).getTime() - new Date(item.start_date).getTime()) / 86400000));
              return (
                <View key={item.id} style={styles.tripBlock}>
                  <View style={[styles.tripImageBox, { backgroundColor: colors.subtle }]}>
                    <Text style={styles.tripImageEmoji}>🏖</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.tripCard, { backgroundColor: colors.surface }]}
                    onPress={() => router.push({ pathname: '/(tourist)/itinerary/[id]', params: { id: item.id } } as any)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.tripBadge, { color: colors.accent }]}>UPCOMING · EXAMPLE</Text>
                    <Text style={[styles.tripTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.tripMeta, { color: colors.muted }]}>
                      {item.start_date} – {item.end_date}{'\n'}
                      2 travelers · {days} day{days !== 1 ? 's' : ''}{'\n'}
                      Estimated budget ₱12,000
                    </Text>
                    <TouchableOpacity
                      style={[styles.viewBtn, { backgroundColor: colors.primary }]}
                      onPress={() => router.push({ pathname: '/(tourist)/itinerary/[id]', params: { id: item.id } } as any)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.viewBtnText, { color: colors.onPrimary }]}>View itinerary</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          {/* Create new trip */}
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tourist)/explore-for-trip' as any)}
            activeOpacity={0.8}
          >
            <Text style={[styles.createBtnText, { color: colors.onPrimary }]}>Create a new trip</Text>
          </TouchableOpacity>

          {/* Saved itineraries card */}
          <View style={[styles.savedCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.savedTitle, { color: colors.text }]}>Your coastal escape, ready when you are.</Text>
            <Text style={[styles.savedBody, { color: colors.muted }]}>
              Mati coastal weekend · Draft saved{'\n'}Keep planning without losing your place.
            </Text>
          </View>
        </View>
      </ScrollView>

      {Platform.OS !== 'web' && <KalawAssistanceFAB />}
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
  tabBtn: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  tabBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  tripBlock: { gap: 0 },
  tripImageBox: {
    width: '100%', height: 210, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  tripImageEmoji: { fontSize: 64 },
  tripCard: { borderRadius: 18, padding: 24, gap: 14 },
  tripBadge: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: Typography.weight.bold },
  tripTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: Typography.weight.bold },
  tripMeta: { fontFamily: Typography.fontFamilyBody, fontSize: 16, lineHeight: 24 },
  viewBtn: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    alignItems: 'center',
  },
  viewBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  createBtn: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    alignItems: 'center',
  },
  createBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  savedCard: { borderRadius: 18, padding: 24, gap: 14 },
  savedTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.bold },
  savedBody: { fontFamily: Typography.fontFamilyBody, fontSize: 14, lineHeight: 20 },
});
