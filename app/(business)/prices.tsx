import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now, formatCurrency } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface PriceRow {
  id: string; business_id: string; title: string; amount: number;
  unit: string; category: string; description: string | null;
  conditions: string | null; is_active: number;
}

const PRICE_CATEGORIES = [
  { value: 'entrance_fee',    label: 'Entrance Fee' },
  { value: 'cottage_rental',  label: 'Cottage Rental' },
  { value: 'room_rate',       label: 'Room Rate' },
  { value: 'overnight',       label: 'Overnight Stay' },
  { value: 'day_use',         label: 'Day Use' },
  { value: 'per_person',      label: 'Per Person' },
  { value: 'group_package',   label: 'Group Package' },
  { value: 'activity_fee',    label: 'Activity Fee' },
  { value: 'other',           label: 'Other' },
];

const UNITS = ['per person', 'per cottage', 'per night', 'per day', 'per group', 'per vehicle', 'flat rate'];

export default function BusinessPricesScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [bizId, setBizId] = useState<string | null>(null);
  const [bizStatus, setBizStatus] = useState('not_submitted');
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<PriceRow | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('per person');
  const [category, setCategory] = useState('entrance_fee');
  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const biz = await db.getFirstAsync<{ id: string; verification_status: string }>(
      'SELECT id, verification_status FROM businesses WHERE owner_id = ? LIMIT 1', [user.id]
    );
    if (!biz) return;
    setBizId(biz.id);
    setBizStatus(biz.verification_status);
    const rows = await db.getAllAsync<PriceRow>(
      'SELECT * FROM listing_prices WHERE business_id = ? AND is_active = 1 ORDER BY category, title',
      [biz.id]
    );
    setPrices(rows);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null); setTitle(''); setAmount(''); setUnit('per person');
    setCategory('entrance_fee'); setDescription(''); setConditions(''); setErrors({});
    setModalVisible(true);
  }

  function openEdit(p: PriceRow) {
    setEditing(p); setTitle(p.title); setAmount(String(p.amount)); setUnit(p.unit);
    setCategory(p.category); setDescription(p.description ?? ''); setConditions(p.conditions ?? '');
    setErrors({}); setModalVisible(true);
  }

  async function handleSave() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required.';
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) < 0) e.amount = 'Enter a valid amount.';
    setErrors(e);
    if (Object.keys(e).length > 0 || !bizId) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      if (editing) {
        await db.runAsync(
          `UPDATE listing_prices SET title=?, amount=?, unit=?, category=?, description=?, conditions=?, updated_at=? WHERE id=?`,
          [title.trim(), Number(amount), unit, category, description.trim() || null, conditions.trim() || null, now(), editing.id]
        );
      } else {
        await db.runAsync(
          `INSERT INTO listing_prices (id, business_id, title, amount, unit, category, description, conditions, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [generateId(), bizId, title.trim(), Number(amount), unit, category, description.trim() || null, conditions.trim() || null, now(), now()]
        );
      }
      // If listing is approved, create a revision for admin review
      if (bizStatus === 'approved' && editing) {
        await db.runAsync(
          `INSERT INTO listing_revisions (id, business_id, submitted_by, field_name, old_value, new_value, status, created_at)
           VALUES (?, ?, ?, 'price', ?, ?, 'pending', ?)`,
          [generateId(), bizId, user!.id, `${editing.title}: ₱${editing.amount}`, `${title.trim()}: ₱${amount}`, now()]
        );
        Alert.alert('Price Update Submitted', 'Your price change has been submitted for admin review. The current published price remains visible to tourists until approved.');
      }
      setModalVisible(false);
      await load();
    } catch { Alert.alert('Error', 'Could not save price.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    Alert.alert('Remove Price', 'Remove this price entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const db = await getDatabase();
        await db.runAsync('UPDATE listing_prices SET is_active=0, updated_at=? WHERE id=?', [now(), id]);
        await load();
      }},
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Price Management</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Manage your establishment's prices</Text>
        </View>
        {bizId && (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
            <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {!bizId ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💰</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No business profile yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Create your business profile first.</Text>
        </View>
      ) : (
        <FlatList
          data={prices}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No prices yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Tap "+ Add" to list your first price.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={[styles.priceTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.priceAmount, { color: colors.primary }]}>{formatCurrency(item.amount)}</Text>
                </View>
                <Text style={[styles.priceMeta, { color: colors.muted }]}>
                  {PRICE_CATEGORIES.find(c => c.value === item.category)?.label ?? item.category} · {item.unit}
                </Text>
                {item.description ? <Text style={[styles.priceDesc, { color: colors.muted }]} numberOfLines={2}>{item.description}</Text> : null}
                {item.conditions ? <Text style={[styles.priceConditions, { color: colors.muted }]}>⚠️ {item.conditions}</Text> : null}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                  <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                  <Text style={[styles.actionText, { color: colors.danger }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{editing ? 'Edit Price' : 'Add Price'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={[styles.closeBtn, { color: colors.muted }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <KalawInput label="Price Title *" placeholder="e.g. Entrance Fee, Cottage Rental" value={title} onChangeText={setTitle} error={errors.title} />
              <KalawInput label="Amount (₱) *" placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" error={errors.amount} />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Category</Text>
              <View style={styles.chipGrid}>
                {PRICE_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.chip, { backgroundColor: category === cat.value ? colors.primary + '20' : colors.surface, borderColor: category === cat.value ? colors.primary : colors.border }]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Text style={[styles.chipLabel, { color: category === cat.value ? colors.primary : colors.text }]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Unit</Text>
              <View style={styles.chipGrid}>
                {UNITS.map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.chip, { backgroundColor: unit === u ? colors.primary + '20' : colors.surface, borderColor: unit === u ? colors.primary : colors.border }]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[styles.chipLabel, { color: unit === u ? colors.primary : colors.text }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <KalawInput label="Description" placeholder="Optional details about this price" value={description} onChangeText={setDescription} multiline numberOfLines={2} />
              <KalawInput label="Conditions" placeholder="e.g. Weekends only, minimum 10 pax" value={conditions} onChangeText={setConditions} multiline numberOfLines={2} />

              {bizStatus === 'approved' && editing && (
                <View style={[styles.infoBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
                  <Text style={[styles.infoText, { color: colors.warning }]}>
                    ⚠️ This listing is published. Price changes will be submitted for admin review before going live.
                  </Text>
                </View>
              )}

              <KalawButton label={editing ? 'Save Changes' : 'Add Price'} onPress={handleSave} loading={saving} fullWidth size="lg" />
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
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  addBtn: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.lg },
  addBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },
  card: { borderRadius: Radius.md, padding: Spacing.base, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  cardBody: { flex: 1, gap: Spacing.xs },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold, flex: 1 },
  priceAmount: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  priceMeta: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  priceDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  priceConditions: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  cardActions: { gap: Spacing.xs },
  actionBtn: { padding: Spacing.sm },
  actionText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  emptySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center' },
  modal: { flex: 1 },
  modalContent: { padding: Spacing.base, gap: Spacing.base, paddingBottom: Spacing.xxxl },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  modalTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  closeBtn: { fontSize: 20, padding: Spacing.sm },
  fieldLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1.5 },
  chipLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  infoBanner: { padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  infoText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
});
