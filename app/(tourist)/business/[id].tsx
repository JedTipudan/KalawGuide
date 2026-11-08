import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, Linking, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getDatabase } from '../../../database/migrations/init';
import { formatCurrency, generateId, now } from '../../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../../constants/tokens';

interface BizDetail {
  id: string; name: string; description: string; category: string;
  address: string; contact_number: string | null; email: string | null;
  website: string | null; facebook: string | null; cover_image_url: string | null;
}
interface PriceRow { id: string; title: string; amount: number; unit: string; category: string; description: string | null; }
interface FacilityRow { id: string; name: string; icon: string | null; }

export default function BusinessDetailScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [biz, setBiz] = useState<BizDetail | null>(null);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    if (!id) return;
    const db = await getDatabase();
    const b = await db.getFirstAsync<BizDetail>(
      'SELECT id, name, description, category, address, contact_number, email, website, facebook, cover_image_url FROM businesses WHERE id = ? AND verification_status = ? AND is_active = 1',
      [id, 'approved']
    );
    if (b) setBiz(b);
    const p = await db.getAllAsync<PriceRow>(
      'SELECT id, title, amount, unit, category, description FROM listing_prices WHERE business_id = ? AND is_active = 1 ORDER BY category, title',
      [id]
    );
    setPrices(p);
    const f = await db.getAllAsync<FacilityRow>(
      'SELECT id, name, icon FROM listing_facilities WHERE business_id = ? ORDER BY name',
      [id]
    );
    setFacilities(f);
    if (user) {
      const fav = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM favorites WHERE user_id = ? AND entity_type = 'business' AND entity_id = ?",
        [user.id, id]
      );
      setIsFavorite(!!fav);
    }
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  async function toggleFavorite() {
    if (!user || !id) return;
    const db = await getDatabase();
    if (isFavorite) {
      await db.runAsync(
        "DELETE FROM favorites WHERE user_id = ? AND entity_type = 'business' AND entity_id = ?",
        [user.id, id]
      );
      setIsFavorite(false);
    } else {
      await db.runAsync(
        'INSERT OR IGNORE INTO favorites (id, user_id, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?)',
        [generateId(), user.id, 'business', id, now()]
      );
      setIsFavorite(true);
    }
  }

  if (!biz) return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {biz.cover_image_url ? (
          <Image source={{ uri: biz.cover_image_url }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.coverPlaceholder, { backgroundColor: colors.subtle }]}>
            <Text style={styles.coverIcon}>🏪</Text>
          </View>
        )}

        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtnOverlay, { backgroundColor: colors.surface + 'E0' }]}>
          <Text style={[styles.backText, { color: colors.text }]}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <View style={styles.nameInfo}>
              <Text style={[styles.name, { color: colors.text }]}>{biz.name}</Text>
              <Text style={[styles.category, { color: colors.muted }]}>{biz.category.replace('_', ' ')}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.favBtn, { backgroundColor: isFavorite ? colors.danger + '20' : colors.subtle }]}
                onPress={toggleFavorite}
                accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Text style={{ fontSize: 20 }}>{isFavorite ? '♥' : '♡'}</Text>
              </TouchableOpacity>
              <View style={[styles.verifiedBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.verifiedText, { color: colors.success }]}>✅ Verified</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.address, { color: colors.muted }]}>📍 {biz.address}</Text>
          <Text style={[styles.description, { color: colors.text }]}>{biz.description}</Text>

          {/* Contact */}
          {(biz.contact_number || biz.email || biz.website || biz.facebook) && (
            <View style={[styles.contactCard, { backgroundColor: colors.surface, ...shadow }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact</Text>
              {biz.contact_number && (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${biz.contact_number!.replace(/[^0-9+]/g, '')}`)}>
                  <Text style={[styles.contactItem, { color: colors.primary }]}>📞 {biz.contact_number}</Text>
                </TouchableOpacity>
              )}
              {biz.email && (
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${biz.email}`)}>
                  <Text style={[styles.contactItem, { color: colors.primary }]}>📧 {biz.email}</Text>
                </TouchableOpacity>
              )}
              {biz.facebook && (
                <TouchableOpacity onPress={() => Linking.openURL(biz.facebook!)}>
                  <Text style={[styles.contactItem, { color: colors.primary }]}>📘 Facebook</Text>
                </TouchableOpacity>
              )}
              {biz.website && (
                <TouchableOpacity onPress={() => Linking.openURL(biz.website!)}>
                  <Text style={[styles.contactItem, { color: colors.primary }]}>🌐 {biz.website}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Facilities */}
          {facilities.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Facilities & Activities</Text>
              <View style={styles.facilityGrid}>
                {facilities.map(f => (
                  <View key={f.id} style={[styles.facilityChip, { backgroundColor: colors.subtle }]}>
                    {f.icon ? <Text style={styles.facilityIcon}>{f.icon}</Text> : null}
                    <Text style={[styles.facilityName, { color: colors.text }]}>{f.name}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Prices */}
          {prices.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Published Prices</Text>
              {prices.map(p => (
                <View key={p.id} style={[styles.itemCard, { backgroundColor: colors.surface, ...shadow }]}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.text }]}>{p.title}</Text>
                    {p.description ? <Text style={[styles.itemDesc, { color: colors.muted }]} numberOfLines={2}>{p.description}</Text> : null}
                    <Text style={[styles.itemMeta, { color: colors.muted }]}>{p.unit}</Text>
                  </View>
                  <Text style={[styles.priceValue, { color: colors.primary }]}>{formatCurrency(p.amount)}</Text>
                </View>
              ))}
            </>
          )}

          <View style={[styles.priceNote, { backgroundColor: colors.subtle }]}>
            <Text style={[styles.priceNoteText, { color: colors.muted }]}>
              ℹ️ Prices and information are provided by the establishment and may change. Please contact the business directly to confirm current rates.
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
  cover: { width: '100%', height: 220 },
  coverPlaceholder: { width: '100%', height: 220, alignItems: 'center', justifyContent: 'center' },
  coverIcon: { fontSize: 64 },
  backBtnOverlay: { position: 'absolute', top: Spacing.base, left: Spacing.base, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.lg },
  backBtn: { padding: Spacing.base },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  body: { padding: Spacing.base, gap: Spacing.lg },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  nameInfo: { flex: 1, gap: Spacing.xs },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  favBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  facilityChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.xl },
  facilityIcon: { fontSize: 14 },
  facilityName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  name: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  category: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textTransform: 'capitalize' },
  verifiedBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm },
  verifiedText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.semiBold },
  address: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg },
  description: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, lineHeight: Typography.size.bodyLg * Typography.lineHeight },
  contactCard: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  contactItem: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, paddingVertical: Spacing.xs },
  itemCard: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  itemInfo: { flex: 1, gap: Spacing.xs },
  itemName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  itemDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  itemMeta: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  priceValue: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  priceNote: { borderRadius: Radius.md, padding: Spacing.md },
  priceNoteText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * Typography.lineHeight },
});
