import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { BusinessShell } from '../../components/web/BusinessShell';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';

interface FacilityRow { id: string; name: string; icon: string | null; }

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

export default function WebBusinessFacilitiesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [bizId, setBizId] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const db = await getDatabase();
      const biz = await db.getFirstAsync<{ id: string }>('SELECT id FROM businesses WHERE owner_id = ? LIMIT 1', [user.id]);
      if (!biz) { setLoading(false); return; }
      setBizId(biz.id);
      const rows = await db.getAllAsync<FacilityRow>(
        'SELECT id, name, icon FROM listing_facilities WHERE business_id = ? ORDER BY name', [biz.id]
      );
      setFacilities(rows);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function addPreset(name: string, icon: string) {
    if (!bizId) return;
    if (facilities.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      window.alert(`"${name}" is already in your facilities list.`);
      return;
    }
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO listing_facilities (id, business_id, name, icon, created_at) VALUES (?, ?, ?, ?, ?)',
      [generateId(), bizId, name, icon, now()]
    );
    await load();
  }

  async function addCustom() {
    if (!customName.trim() || !bizId) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        'INSERT INTO listing_facilities (id, business_id, name, icon, created_at) VALUES (?, ?, ?, ?, ?)',
        [generateId(), bizId, customName.trim(), customIcon.trim() || null, now()]
      );
      setCustomName(''); setCustomIcon('');
      await load();
    } finally { setSaving(false); }
  }

  async function removeFacility(id: string, name: string) {
    if (!window.confirm(`Remove "${name}"?`)) return;
    const db = await getDatabase();
    await db.runAsync('DELETE FROM listing_facilities WHERE id = ?', [id]);
    setFacilities(prev => prev.filter(f => f.id !== id));
  }

  const addedNames = new Set(facilities.map(f => f.name.toLowerCase()));

  return (
    <BusinessShell activeLabel="Facilities & Activities">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { color: colors.text }]}>Facilities & Activities</Text>
        <Text style={[s.pageSub, { color: colors.muted }]}>
          List what your establishment offers. These appear on your public listing.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : !bizId ? (
          <View style={s.empty}><Text style={s.emptyIcon}>🏗</Text><Text style={[s.emptyText, { color: colors.muted }]}>Create your business profile first.</Text></View>
        ) : (
          <>
            {/* Current facilities */}
            {facilities.length > 0 && (
              <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>Your Facilities ({facilities.length})</Text>
                <View style={s.chipGrid}>
                  {facilities.map(item => (
                    <View key={item.id} style={[s.facilityChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
                      {item.icon ? <Text style={s.chipIcon}>{item.icon}</Text> : null}
                      <Text style={[s.chipName, { color: colors.primary }]}>{item.name}</Text>
                      <TouchableOpacity onPress={() => removeFacility(item.id, item.name)} style={s.removeBtn}>
                        <Text style={[s.removeText, { color: colors.danger }]}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Quick add presets */}
            <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Quick Add</Text>
              <Text style={[s.sectionSub, { color: colors.muted }]}>Click to add common facilities</Text>
              <View style={s.chipGrid}>
                {PRESET_FACILITIES.map(preset => {
                  const added = addedNames.has(preset.name.toLowerCase());
                  return (
                    <TouchableOpacity
                      key={preset.name}
                      style={[s.presetChip, {
                        backgroundColor: added ? colors.success + '15' : colors.background,
                        borderColor: added ? colors.success + '40' : colors.border,
                        opacity: added ? 0.7 : 1,
                      }]}
                      onPress={() => !added && addPreset(preset.name, preset.icon)}
                      disabled={added}
                    >
                      <Text style={s.chipIcon}>{preset.icon}</Text>
                      <Text style={[s.chipName, { color: added ? colors.success : colors.text }]}>{preset.name}</Text>
                      {added && <Text style={[s.addedMark, { color: colors.success }]}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Custom facility */}
            <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Add Custom Facility</Text>
              <View style={s.customRow}>
                <TextInput
                  style={[s.input, { flex: 2, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Facility name (e.g. Zip Line)"
                  placeholderTextColor={colors.muted}
                  value={customName}
                  onChangeText={setCustomName}
                />
                <TextInput
                  style={[s.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Emoji (optional)"
                  placeholderTextColor={colors.muted}
                  value={customIcon}
                  onChangeText={setCustomIcon}
                />
                <TouchableOpacity
                  style={[s.addBtn, { backgroundColor: customName.trim() ? colors.primary : colors.border }]}
                  onPress={addCustom}
                  disabled={!customName.trim() || saving}
                >
                  <Text style={[s.addBtnText, { color: customName.trim() ? colors.onPrimary : colors.muted }]}>{saving ? '…' : '+ Add'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </BusinessShell>
  );
}

const s = StyleSheet.create({
  content: { padding: 32, gap: 20, paddingBottom: 48 },
  pageTitle: { fontSize: 24, fontWeight: '700' },
  pageSub: { fontSize: 14, marginTop: -12 },
  section: { borderRadius: 12, padding: 20, gap: 12, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionSub: { fontSize: 13, marginTop: -8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  facilityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  presetChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipIcon: { fontSize: 14 },
  chipName: { fontSize: 13, fontWeight: '500' },
  removeBtn: { padding: 2 },
  removeText: { fontSize: 13, fontWeight: '700' },
  addedMark: { fontSize: 13, fontWeight: '700' },
  customRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15 },
});
