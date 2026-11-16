import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';
import { Typography } from '../../constants/tokens';
import { LiveMap } from '../../components/map/LiveMap';
import type { MapMarker } from '../../components/map/mapHtml';
import { useLiveLocation } from '../../features/map/useLiveLocation';

export default function MapScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const { coords, status, retry } = useLiveLocation();
  const base = Platform.OS === 'web' ? '/(web)' : '/(tourist)';

  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{ id: string; name: string; location: string; latitude: number; longitude: number }>(
        `SELECT id, name, location, latitude, longitude FROM destinations
         WHERE is_active = 1 AND latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY name`,
      );
      setMarkers(rows.map(r => ({ id: r.id, name: r.name, lat: r.latitude, lng: r.longitude, subtitle: r.location })));
    })();
  }, []);

  const statusText =
    status === 'live' ? '● Live location on'
    : status === 'denied' ? 'Location permission is off — tap to retry'
    : status === 'unavailable' ? 'Location unavailable — tap to retry'
    : 'Finding your location…';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      {Platform.OS !== 'web' && (
        <View style={[styles.navBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tourist)/(tabs)/home' as any))}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.navTitle, { color: colors.primary }]}>‹ Map</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.mapArea}>
        <LiveMap
          style={StyleSheet.absoluteFill}
          markers={markers}
          user={coords}
          onRequestLocate={retry}
          onOpenMarker={id => router.push(`${base}/destination/${id}` as any)}
        />
        <TouchableOpacity
          onPress={status === 'live' ? undefined : retry}
          activeOpacity={status === 'live' ? 1 : 0.7}
          style={[styles.statusPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.statusText, { color: status === 'live' ? colors.success : colors.muted }]}>{statusText}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { paddingHorizontal: 20, paddingVertical: 18 },
  navTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.bold },
  mapArea: { flex: 1, minHeight: 360 },
  statusPill: {
    position: 'absolute', top: 12, left: 12, right: 64, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
  },
  statusText: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: Typography.weight.semiBold },
});
