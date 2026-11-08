import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, Modal, KeyboardAvoidingView,
  Platform, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface DestRow { id: string; name: string; location: string; category_name: string; is_featured: number; is_active: number; estimated_fee: number | null; fee_verified: number; }
interface CatRow { id: string; name: string; icon: string; }

export default function AdminDestinationsScreen() {
  const { colors, isDark } = useTheme();
  const [destinations, setDestinations] = useState<DestRow[]>([]);
  const [categories, setCategories] = useState<CatRow[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<DestRow | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [estimatedFee, setEstimatedFee] = useState('');
  const [feeVerified, setFeeVerified] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    const db = await getDatabase();
    const cats = await db.getAllAsync<CatRow>('SELECT id, name, icon FROM destination_categories ORDER BY name');
    setCategories(cats);
    if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
    const rows = await db.getAllAsync<DestRow>(`
      SELECT d.id, d.name, d.location, d.is_featured, d.is_active, d.estimated_fee, d.fee_verified,
             c.name as category_name
      FROM destinations d LEFT JOIN destination_categories c ON d.category_id = c.id
      ORDER BY d.is_featured DESC, d.name ASC
    `);
    setDestinations(rows);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null); setName(''); setDescription(''); setLocation('');
    setEstimatedFee(''); setFeeVerified(false); setIsFeatured(false);
    setErrors({}); setModalVisible(true);
  }

  async function handleSave() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (!location.trim()) e.location = 'Location is required.';
    if (!description.trim()) e.description = 'Description is required.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      const fee = estimatedFee.trim() ? Number(estimatedFee) : null;
      if (editing) {
        await db.runAsync(
          `UPDATE destinations SET name=?, description=?, location=?, category_id=?,
           estimated_fee=?, fee_verified=?, is_featured=?, updated_at=? WHERE id=?`,
          [name.trim(), description.trim(), location.trim(), categoryId,
           fee, feeVerified ? 1 : 0, isFeatured ? 1 : 0, now(), editing.id]
        );
      } else {
        await db.runAsync(
          `INSERT INTO destinations (id, name, description, category_id, location, estimated_fee,
           fee_verified, is_featured, is_active, image_urls, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, '[]', ?, ?)`,
          [generateId(), name.trim(), description.trim(), categoryId, location.trim(),
           fee, feeVerified ? 1 : 0, isFeatured ? 1 : 0, now(), now()]
        );
      }
      setModalVisible(false);
      await load();
    } catch { Alert.alert('Error', 'Could not save destination.'); }
    finally { setSaving(false); }
  }

  async function toggleActive(id: string, current: number) {
    const db = await getDatabase();
    await db.runAsync('UPDATE destinations SET is_active=?, updated_at=? WHERE id=?', [current ? 0 : 1, now(), id]);
    await load();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Destinations</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
          <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={destinations}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={[styles.destName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                {item.is_featured === 1 && (
                  <View style={[styles.featuredBadge, { backgroundColor: colors.warning + '20' }]}>
                    <Text style={[styles.featuredText, { color: colors.warning }]}>⭐ Featured</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.destMeta, { color: colors.muted }]}>{item.category_name} · {item.location}</Text>
              {item.estimated_fee !== null && (
                <Text style={[styles.destFee, { color: colors.muted }]}>
                  ₱{item.estimated_fee} {item.fee_verified ? '✅ verified' : '(estimate)'}
                </Text>
              )}
            </View>
            <View style={styles.cardActions}>
              <Switch
                value={item.is_active === 1}
                onValueChange={() => toggleActive(item.id, item.is_active)}
                trackColor={{ false: colors.border, true: colors.success + '80' }}
                thumbColor={item.is_active === 1 ? colors.success : colors.muted}
              />
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{editing ? 'Edit Destination' : 'Add Destination'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={[styles.closeBtn, { color: colors.muted }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <KalawInput label="Name *" placeholder="Destination name" value={name} onChangeText={setName} error={errors.name} />
              <KalawInput label="Description *" placeholder="Describe this destination" value={description} onChangeText={setDescription} multiline numberOfLines={3} error={errors.description} />
              <KalawInput label="Location *" placeholder="e.g. Mati City, Davao Oriental" value={location} onChangeText={setLocation} error={errors.location} />
              <KalawInput label="Estimated Fee (₱)" placeholder="Leave blank if free" value={estimatedFee} onChangeText={setEstimatedFee} keyboardType="decimal-pad" />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Category</Text>
              <View style={styles.catGrid}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catChip, { backgroundColor: categoryId === cat.id ? colors.primary + '20' : colors.surface, borderColor: categoryId === cat.id ? colors.primary : colors.border }]}
                    onPress={() => setCategoryId(cat.id)}
                  >
                    <Text style={[styles.catLabel, { color: categoryId === cat.id ? colors.primary : colors.text }]}>{cat.icon} {cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Fee Verified</Text>
                <Switch value={feeVerified} onValueChange={setFeeVerified} trackColor={{ false: colors.border, true: colors.success + '80' }} thumbColor={feeVerified ? colors.success : colors.muted} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Featured</Text>
                <Switch value={isFeatured} onValueChange={setIsFeatured} trackColor={{ false: colors.border, true: colors.primary + '80' }} thumbColor={isFeatured ? colors.primary : colors.muted} />
              </View>

              <KalawButton label={editing ? 'Save Changes' : 'Add Destination'} onPress={handleSave} loading={saving} fullWidth size="lg" />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  addBtn: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.lg },
  addBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  cardBody: { flex: 1, gap: Spacing.xs },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  destName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold, flex: 1 },
  featuredBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  featuredText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium },
  destMeta: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  destFee: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  cardActions: { alignItems: 'center' },
  modal: { flex: 1 },
  modalContent: { padding: Spacing.base, gap: Spacing.base, paddingBottom: Spacing.xxxl },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  modalTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  closeBtn: { fontSize: 20, padding: Spacing.sm },
  fieldLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1.5 },
  catLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  toggleLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg },
});
