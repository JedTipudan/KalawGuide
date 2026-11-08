import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, RefreshControl, Modal,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

const PRESET_FACILITIES = [
  { name: 'Swimming Pool', icon: '🏊' },
  { name: 'Cottages', icon: '🏠' },
  { name: 'Parking', icon: '🅿️' },
  { name: 'Restaurant', icon: '🍽' },
  { name: 'Beach Access', icon: '🏖' },
  { name: 'Accommodation', icon: '🛏' },
  { name: 'WiFi', icon: '📶' },
  { name: 'Restrooms', icon: '🚻' },
  { name: 'Function Hall', icon: '🏛' },
  { name: 'Kayaking', icon: '🚣' },
  { name: 'Snorkeling', icon: '🤿' },
  { name: 'Surfing', icon: '🏄' },
  { name: 'Hiking Trail', icon: '🥾' },
  { name: 'Picnic Area', icon: '🧺' },
  { name: 'Bonfire Area', icon: '🔥' },
  { name: 'Videoke', icon: '🎤' },
];

interface FacilityRow { id: string; name: string; icon: string | null; created_at: string; }

export default function BusinessFacilitiesScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('');
  const [saving, setSaving] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const biz = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM businesses WHERE owner_id = ? LIMIT 1', [user.id]
    );
    if (!biz) return;
    setBusinessId(biz.id);
    const rows = await db.getAllAsync<FacilityRow>(
      'SELECT id, name, icon, created_at FROM listing_facilities WHERE business_id = ? ORDER BY name',
      [biz.id]
    );
    setFacilities(rows);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function addPreset(name: string, icon: string) {
    if (!businessId) return;
    const exists = facilities.some(f => f.name.toLowerCase() === name.toLowerCase());
    if (exists) { Alert.alert('Already added', `"${name}" is already in your facilities list.`); return; }
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO listing_facilities (id, business_id, name, icon, created_at) VALUES (?, ?, ?, ?, ?)',
      [generateId(), businessId, name, icon, now()]
    );
    await load();
  }

  async function addCustom() {
    if (!customName.trim() || !businessId) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        'INSERT INTO listing_facilities (id, business_id, name, icon, created_at) VALUES (?, ?, ?, ?, ?)',
        [generateId(), businessId, customName.trim(), customIcon.trim() || null, now()]
      );
      setCustomName('');
      setCustomIcon('');
      setModalVisible(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function removeFacility(id: string, name: string) {
    Alert.alert('Remove Facility', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const db = await getDatabase();
          await db.runAsync('DELETE FROM listing_facilities WHERE id = ?', [id]);
          await load();
        },
      },
    ]);
  }

  const addedNames = new Set(facilities.map(f => f.name.toLowerCase()));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Facilities & Activities</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{facilities.length} added</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
          disabled={!businessId}
        >
          <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>+ Custom</Text>
        </TouchableOpacity>
      </View>

      {!businessId ? (
        <View style={styles.noBiz}>
          <Text style={styles.noBizIcon}>🏪</Text>
          <Text style={[styles.noBizText, { color: colors.muted }]}>Create your business profile first.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>

          {/* Current facilities */}
          {facilities.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Facilities</Text>
              <View style={styles.facilityGrid}>
                {facilities.map(item => (
                  <View key={item.id} style={[styles.facilityChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
                    {item.icon ? <Text style={styles.facilityIcon}>{item.icon}</Text> : null}
                    <Text style={[styles.facilityName, { color: colors.primary }]}>{item.name}</Text>
                    <TouchableOpacity onPress={() => removeFacility(item.id, item.name)} style={styles.removeBtn}>
                      <Text style={[styles.removeText, { color: colors.danger }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Preset quick-add */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Add</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>Tap to add common facilities</Text>
            <View style={styles.facilityGrid}>
              {PRESET_FACILITIES.map(preset => {
                const added = addedNames.has(preset.name.toLowerCase());
                return (
                  <TouchableOpacity
                    key={preset.name}
                    style={[styles.presetChip, {
                      backgroundColor: added ? colors.success + '15' : colors.surface,
                      borderColor: added ? colors.success + '40' : colors.border,
                      ...shadow,
                    }]}
                    onPress={() => !added && addPreset(preset.name, preset.icon)}
                    disabled={added}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.facilityIcon}>{preset.icon}</Text>
                    <Text style={[styles.facilityName, { color: added ? colors.success : colors.text }]}>{preset.name}</Text>
                    {added && <Text style={[styles.addedMark, { color: colors.success }]}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Custom facility modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Custom Facility</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[styles.modalClose, { color: colors.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <KalawInput label="Facility Name *" placeholder="e.g. Zip Line, ATV Rental" value={customName} onChangeText={setCustomName} />
              <KalawInput label="Emoji Icon (optional)" placeholder="e.g. 🎢" value={customIcon} onChangeText={setCustomIcon} />
              <KalawButton label="Add Facility" onPress={addCustom} loading={saving} fullWidth disabled={!customName.trim()} />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  addBtn: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.lg },
  addBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  content: { padding: Spacing.base, gap: Spacing.xl, paddingBottom: 100 },
  section: { gap: Spacing.md },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  sectionSubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  facilityChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.xl, borderWidth: 1 },
  presetChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.xl, borderWidth: 1 },
  facilityIcon: { fontSize: 16 },
  facilityName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  removeBtn: { padding: 2 },
  removeText: { fontSize: 14, fontWeight: '700' },
  addedMark: { fontSize: 14, fontWeight: '700' },
  noBiz: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  noBizIcon: { fontSize: 48 },
  noBizText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center' },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base },
  modalTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  modalClose: { fontSize: 22, padding: Spacing.sm },
  modalContent: { padding: Spacing.base, gap: Spacing.base },
});
