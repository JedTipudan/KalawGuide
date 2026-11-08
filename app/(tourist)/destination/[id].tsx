import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, Linking, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getDatabase } from '../../../database/migrations/init';
import { generateId, now } from '../../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../../constants/tokens';
import { Icon } from '../../../components/common/Icon';

interface DestinationDetail {
  id: string; name: string; description: string; location: string;
  cover_image_url: string | null; estimated_fee: number | null;
  fee_verified: number; latitude: number | null; longitude: number | null;
  category_name: string; category_icon: string; category_color: string;
}

function buildMapHtml(lat: number, lng: number, name: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#map{margin:0;padding:0;width:100%;height:100%;}
.leaflet-control-attribution{display:none;}
</style>
</head><body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:true,dragging:true,scrollWheelZoom:false,tap:false}).setView([${lat},${lng}],14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
L.marker([${lat},${lng}]).addTo(map).bindPopup(${JSON.stringify(name)}).openPopup();
</script></body></html>`;
}

export default function DestinationDetailScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dest, setDest] = useState<DestinationDetail | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const shadow = isDark ? Shadows.dark.md : Shadows.light.md;

  useEffect(() => {
    if (!id || Platform.OS === 'web') return;
    async function load() {
      const db = await getDatabase();
      const row = await db.getFirstAsync<DestinationDetail>(`
        SELECT d.id, d.name, d.description, d.location, d.cover_image_url,
               d.estimated_fee, d.fee_verified, d.latitude, d.longitude,
               c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM destinations d
        LEFT JOIN destination_categories c ON d.category_id = c.id
        WHERE d.id = ?
      `, [id]);
      if (row) setDest(row);
      if (user) {
        const fav = await db.getFirstAsync<{ id: string }>(
          "SELECT id FROM favorites WHERE user_id = ? AND entity_type = 'destination' AND entity_id = ?",
          [user.id, id]
        );
        setIsFavorite(!!fav);
      }
    }
    load();
  }, [id, user]);

  // On web, this mobile screen should never render — hand off to the web version
  if (Platform.OS === 'web') {
    return <Redirect href={`/(web)/destination/${id}` as any} />;
  }

  async function toggleFavorite() {
    if (!user || !id) return;
    const db = await getDatabase();
    if (isFavorite) {
      await db.runAsync(
        "DELETE FROM favorites WHERE user_id = ? AND entity_type = 'destination' AND entity_id = ?",
        [user.id, id]
      );
      setIsFavorite(false);
    } else {
      await db.runAsync(
        'INSERT OR IGNORE INTO favorites (id, user_id, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?)',
        [generateId(), user.id, 'destination', id, now()]
      );
      setIsFavorite(true);
    }
  }

  if (!dest) return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cover image */}
        {dest.cover_image_url ? (
          <Image source={{ uri: dest.cover_image_url }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <View style={[styles.coverPlaceholder, { backgroundColor: colors.subtle }]}>
            <Text style={styles.coverPlaceholderIcon}>🏝</Text>
          </View>
        )}

        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtnOverlay, { backgroundColor: colors.surface + 'E0' }]}>
          <Text style={[styles.backText, { color: colors.text }]}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.body}>
          {/* Category badge */}
          <View style={[styles.categoryBadge, { backgroundColor: dest.category_color + '20' }]}>
            <Text style={[styles.categoryText, { color: dest.category_color }]}>
              {dest.category_name}
            </Text>
          </View>

          <Text style={[styles.name, { color: colors.text }]}>{dest.name}</Text>
          <Text style={[styles.location, { color: colors.muted }]}>📍 {dest.location}</Text>

          {/* Favorite button */}
          <TouchableOpacity
            style={[styles.favBtn, { backgroundColor: isFavorite ? colors.danger + '20' : colors.subtle }]}
            onPress={toggleFavorite}
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Text style={[styles.favBtnText, { color: isFavorite ? colors.danger : colors.muted }]}>
              {isFavorite ? '♥ Saved to Favorites' : '♡ Add to Favorites'}
            </Text>
          </TouchableOpacity>

          {/* Fee */}
          {dest.estimated_fee !== null && (
            <View style={[styles.feeCard, { backgroundColor: dest.fee_verified ? colors.success + '15' : colors.subtle, borderColor: dest.fee_verified ? colors.success + '40' : colors.border }]}>
              <Text style={[styles.feeLabel, { color: dest.fee_verified ? colors.success : colors.muted }]}>
                {dest.fee_verified ? '✅ Verified Entrance Fee' : '⚠️ Estimated Entrance Fee'}
              </Text>
              <Text style={[styles.feeValue, { color: dest.fee_verified ? colors.success : colors.text }]}>
                {dest.estimated_fee === 0 ? 'Free' : `₱${dest.estimated_fee?.toLocaleString()}`}
              </Text>
              {!dest.fee_verified && (
                <Text style={[styles.feeNote, { color: colors.muted }]}>
                  This fee has not been verified. Confirm locally before visiting.
                </Text>
              )}
            </View>
          )}

          {/* Description */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
          <Text style={[styles.description, { color: colors.text }]}>{dest.description}</Text>

          {/* Map */}
          {dest.latitude && dest.longitude && (
            <View style={[styles.mapCard, { backgroundColor: colors.surface, ...shadow }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
              <View style={styles.mapContainer}>
                <WebView
                  style={styles.map}
                  originWhitelist={['*']}
                  source={{ html: buildMapHtml(dest.latitude, dest.longitude, dest.name) }}
                  scrollEnabled={false}
                  javaScriptEnabled
                />
              </View>
              <View style={[styles.coordsRow, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
                <Icon name="location" size={14} color={colors.muted} />
                <Text style={[styles.coordsText, { color: colors.muted }]}>
                  {dest.latitude.toFixed(4)}°N, {dest.longitude.toFixed(4)}°E
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.openMapsBtn, { backgroundColor: colors.subtle, borderColor: colors.border }]}
                onPress={() => {
                  const lat = dest.latitude!;
                  const lng = dest.longitude!;
                  const url = Platform.OS === 'ios'
                    ? `maps://?ll=${lat},${lng}&q=${encodeURIComponent(dest.name)}`
                    : `geo:${lat},${lng}?q=${encodeURIComponent(dest.name)}`;
                  Linking.openURL(url).catch(() =>
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)
                  );
                }}
              >
                <Icon name="location" size={18} color={colors.primary} />
                <Text style={[styles.openMapsBtnText, { color: colors.primary }]}>Open in Maps</Text>
                <Icon name="chevron" size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push({ pathname: '/(tourist)/itinerary/[id]', params: { id: 'new' } } as any)}
              activeOpacity={0.8}
            >
              <Icon name="trips" size={20} color={colors.onPrimary} />
              <Text style={[styles.actionLabel, { color: colors.onPrimary }]}>Add to My Trip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border }]}
              onPress={() => router.push('/(tourist)/budget' as any)}
              activeOpacity={0.8}
            >
              <Icon name="budget" size={20} color={colors.text} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Plan Budget</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.disclaimer, { backgroundColor: colors.subtle }]}>
            <Text style={[styles.disclaimerText, { color: colors.muted }]}>
              ℹ️ Information shown is for reference. Always verify current conditions, fees, and access locally before visiting.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: Spacing.xxxl },
  coverImage: { width: '100%', height: 240 },
  coverPlaceholder: { width: '100%', height: 240, alignItems: 'center', justifyContent: 'center' },
  coverPlaceholderIcon: { fontSize: 64 },
  backBtnOverlay: { position: 'absolute', top: Spacing.base, left: Spacing.base, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.lg },
  backBtn: { padding: Spacing.base },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  body: { padding: Spacing.base, gap: Spacing.lg },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.xl },
  categoryText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  name: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  location: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg },
  favBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base, borderRadius: Radius.lg, alignSelf: 'flex-start' },
  favBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  feeCard: { borderRadius: Radius.md, padding: Spacing.base, borderWidth: 1, gap: Spacing.xs },
  feeLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  feeValue: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  feeNote: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  description: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, lineHeight: Typography.size.bodyLg * Typography.lineHeight },
  mapCard: { borderRadius: Radius.md, gap: Spacing.sm, padding: Spacing.base },
  mapContainer: { height: 220, borderRadius: Radius.md, overflow: 'hidden' },
  map: { flex: 1 },
  coordsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, alignSelf: 'flex-start' },
  coordsText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium },
  openMapsBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5 },
  openMapsBtnText: { flex: 1, fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  actions: { flexDirection: 'row', gap: Spacing.md },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.base, borderRadius: Radius.lg, gap: Spacing.sm },
  actionLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  disclaimer: { borderRadius: Radius.md, padding: Spacing.md },
  disclaimerText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * Typography.lineHeight },
});
