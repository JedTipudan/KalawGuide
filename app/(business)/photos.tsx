import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, Alert, RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { now } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

export default function OwnerPhotoGalleryScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const biz = await db.getFirstAsync<{ id: string; cover_image_url: string | null }>(
      'SELECT id, cover_image_url FROM businesses WHERE owner_id = ? LIMIT 1',
      [user.id]
    );
    if (biz) {
      setBusinessId(biz.id);
      setCoverImage(biz.cover_image_url);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function pickCoverImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setCoverImage(uri);
      if (businessId) {
        const db = await getDatabase();
        await db.runAsync(
          'UPDATE businesses SET cover_image_url = ?, updated_at = ? WHERE id = ?',
          [uri, now(), businessId]
        );
      }
    }
  }

  async function removeCoverImage() {
    Alert.alert('Remove Cover Photo', 'Remove the current cover photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setCoverImage(null);
          if (businessId) {
            const db = await getDatabase();
            await db.runAsync(
              'UPDATE businesses SET cover_image_url = NULL, updated_at = ? WHERE id = ?',
              [now(), businessId]
            );
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.utilBar, { backgroundColor: colors.surface }]}>
        <Text style={[styles.utilBarTitle, { color: colors.primary }]}>☰ Owner workspace</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>Photo gallery</Text>
        <Text style={[styles.pageSubtitle, { color: '#57717A' }]}>
          Add a cover photo for your business listing. Images are stored locally.
        </Text>

        {!businessId ? (
          <View style={[styles.noBizCard, { backgroundColor: colors.surface, ...shadow }]}>
            <Text style={[styles.noBizText, { color: colors.muted }]}>
              Create your business profile first before adding photos.
            </Text>
          </View>
        ) : (
          <View style={styles.gallerySection}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Cover Photo</Text>

            {coverImage ? (
              <View style={styles.coverContainer}>
                <Image source={{ uri: coverImage }} style={styles.coverImage} resizeMode="cover" />
                <TouchableOpacity
                  style={[styles.removeBtn, { backgroundColor: '#AC3545' }]}
                  onPress={removeCoverImage}
                >
                  <Text style={styles.removeBtnText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border, ...shadow }]}
                onPress={pickCoverImage}
                activeOpacity={0.8}
              >
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={[styles.uploadLabel, { color: colors.text }]}>Tap to upload cover photo</Text>
                <Text style={[styles.uploadHint, { color: colors.muted }]}>Recommended: 16:9 ratio</Text>
              </TouchableOpacity>
            )}

            {coverImage && (
              <TouchableOpacity
                style={[styles.changeBtn, { borderColor: colors.primary }]}
                onPress={pickCoverImage}
              >
                <Text style={[styles.changeBtnText, { color: colors.primary }]}>📷 Change Cover Photo</Text>
              </TouchableOpacity>
            )}

            <View style={[styles.noteCard, { backgroundColor: colors.subtle }]}>
              <Text style={[styles.noteText, { color: colors.muted }]}>
                ℹ️ Photos are stored locally on this device. They will be visible to tourists browsing your business profile.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  utilBar: { paddingHorizontal: 20, paddingVertical: 18 },
  utilBarTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 16, fontWeight: '700' },
  content: { padding: 20, gap: Spacing.lg, paddingBottom: 100 },
  pageTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: '700' },
  pageSubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: 15 },
  noBizCard: { borderRadius: Radius.md, padding: Spacing.xl, alignItems: 'center' },
  noBizText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, textAlign: 'center' },
  gallerySection: { gap: Spacing.md },
  sectionLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 16, fontWeight: '600' },
  coverContainer: { gap: Spacing.md },
  coverImage: { width: '100%', height: 200, borderRadius: Radius.md },
  removeBtn: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  removeBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  uploadPlaceholder: {
    height: 180, borderRadius: Radius.md, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  uploadIcon: { fontSize: 36 },
  uploadLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 15, fontWeight: '600' },
  uploadHint: { fontFamily: Typography.fontFamilyBody, fontSize: 13 },
  changeBtn: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1.5 },
  changeBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: '600' },
  noteCard: { borderRadius: Radius.md, padding: Spacing.md },
  noteText: { fontFamily: Typography.fontFamilyBody, fontSize: 13, lineHeight: 13 * 1.45 },
});
