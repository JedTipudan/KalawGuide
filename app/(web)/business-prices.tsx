import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { BusinessShell } from '../../components/web/BusinessShell';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now, formatCurrency } from '../../utils/helpers';

interface PriceRow {
  id: string; title: string; amount: number; unit: string;
  category: string; description: string | null; conditions: string | null;
}

const PRICE_CATEGORIES = [
  { value: 'entrance_fee', label: 'Entrance Fee' },
  { value: 'cottage_rental', label: 'Cottage Rental' },
  { value: 'room_rate', label: 'Room Rate' },
  { value: 'overnight', label: 'Overnight Stay' },
  { value: 'day_use', label: 'Day Use' },
  { value: 'per_person', label: 'Per Person' },
  { value: 'group_package', label: 'Group Package' },
  { value: 'activity_fee', label: 'Activity Fee' },
  { value: 'other', label: 'Other' },
];

const UNITS = ['per person', 'per cottage', 'per night', 'per day', 'per group', 'per vehicle', 'flat rate'];

export default function WebBusinessPricesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [bizId, setBizId] = useState<string | null>(null);
  const [bizStatus, setBizStatus] = useState('not_submitted');
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('per person');
  const [category, setCategory] = useState('entrance_fee');
  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const db = await getDatabase();
      const biz = await db.getFirstAsync<{ id: string; verification_status: string }>(
        'SELECT id, verification_status FROM businesses WHERE owner_id = ? LIMIT 1', [user.id]
      );
      if (!biz) { setLoading(false); return; }
      setBizId(biz.id);
      setBizStatus(biz.verification_status);
      const rows = await db.getAllAsync<PriceRow>(
        'SELECT id, title, amount, unit, category, description, conditions FROM listing_prices WHERE business_id = ? AND is_active = 1 ORDER BY category, title',
        [biz.id]
      );
      setPrices(rows);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditingId(null); setTitle(''); setAmount(''); setUnit('per person');
    setCategory('entrance_fee'); setDescription(''); setConditions(''); setErrors({});
    setShowForm(true);
  }

  function openEdit(p: PriceRow) {
    setEditingId(p.id); setTitle(p.title); setAmount(String(p.amount)); setUnit(p.unit);
    setCategory(p.category); setDescription(p.description ?? ''); setConditions(p.conditions ?? '');
    setErrors({}); setShowForm(true);
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
      if (editingId) {
        await db.runAsync(
          'UPDATE listing_prices SET title=?, amount=?, unit=?, category=?, description=?, conditions=?, updated_at=? WHERE id=?',
          [title.trim(), Number(amount), unit, category, description.trim() || null, conditions.trim() || null, now(), editingId]
        );
        if (bizStatus === 'approved') {
          const old = prices.find(p => p.id === editingId);
          await db.runAsync(
            `INSERT INTO listing_revisions (id, business_id, submitted_by, field_name, old_value, new_value, status, created_at) VALUES (?, ?, ?, 'price', ?, ?, 'pending', ?)`,
            [generateId(), bizId, user!.id, `${old?.title}: ₱${old?.amount}`, `${title.trim()}: ₱${amount}`, now()]
          );
          window.alert('Price change submitted for admin review. Current published price remains until approved.');
        }
      } else {
        await db.runAsync(
          `INSERT INTO listing_prices (id, business_id, title, amount, unit, category, description, conditions, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [generateId(), bizId, title.trim(), Number(amount), unit, category, description.trim() || null, conditions.trim() || null, now(), now()]
        );
      }
      setShowForm(false);
      await load();
    } catch { window.alert('Could not save price.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Remove this price entry?')) return;
    const db = await getDatabase();
    await db.runAsync('UPDATE listing_prices SET is_active=0, updated_at=? WHERE id=?', [now(), id]);
    setPrices(prev => prev.filter(p => p.id !== id));
  }

  return (
    <BusinessShell activeLabel="Price Management">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.pageHeader}>
          <View>
            <Text style={[s.pageTitle, { color: colors.text }]}>Price Management</Text>
            <Text style={[s.pageSub, { color: colors.muted }]}>Publish your establishment's prices for tourists.</Text>
          </View>
          {bizId && (
            <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
              <Text style={[s.addBtnText, { color: colors.onPrimary }]}>+ Add Price</Text>
            </TouchableOpacity>
          )}
        </View>

        {bizStatus === 'approved' && (
          <View style={[s.infoBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
            <Text style={[s.infoText, { color: colors.warning }]}>
              ⚠️ Your listing is published. Editing existing prices will submit a change request for admin review.
            </Text>
          </View>
        )}

        {showForm && (
          <View style={[s.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.formTitle, { color: colors.text }]}>{editingId ? 'Edit Price' : 'Add Price'}</Text>
            <View style={s.formGrid}>
              <View style={s.twoCol}>
                <View style={[s.field, { flex: 2 }]}>
                  <Text style={[s.label, { color: colors.text }]}>Price Title *</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: errors.title ? colors.danger : colors.border }]}
                    placeholder="e.g. Entrance Fee, Cottage Rental" placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} />
                  {errors.title && <Text style={[s.error, { color: colors.danger }]}>{errors.title}</Text>}
                </View>
                <View style={[s.field, { flex: 1 }]}>
                  <Text style={[s.label, { color: colors.text }]}>Amount (₱) *</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: errors.amount ? colors.danger : colors.border }]}
                    placeholder="0.00" placeholderTextColor={colors.muted} value={amount} onChangeText={setAmount} />
                  {errors.amount && <Text style={[s.error, { color: colors.danger }]}>{errors.amount}</Text>}
                </View>
              </View>
              <View style={s.twoCol}>
                <View style={[s.field, { flex: 1 }]}>
                  <Text style={[s.label, { color: colors.text }]}>Category</Text>
                  <View style={s.chipRow}>
                    {PRICE_CATEGORIES.map(cat => (
                      <TouchableOpacity key={cat.value}
                        style={[s.chip, { backgroundColor: category === cat.value ? colors.primary + '20' : colors.background, borderColor: category === cat.value ? colors.primary : colors.border }]}
                        onPress={() => setCategory(cat.value)}>
                        <Text style={[s.chipText, { color: category === cat.value ? colors.primary : colors.text }]}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={[s.field, { flex: 1 }]}>
                  <Text style={[s.label, { color: colors.text }]}>Unit</Text>
                  <View style={s.chipRow}>
                    {UNITS.map(u => (
                      <TouchableOpacity key={u}
                        style={[s.chip, { backgroundColor: unit === u ? colors.primary + '20' : colors.background, borderColor: unit === u ? colors.primary : colors.border }]}
                        onPress={() => setUnit(u)}>
                        <Text style={[s.chipText, { color: unit === u ? colors.primary : colors.text }]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              <View style={s.twoCol}>
                <View style={[s.field, { flex: 1 }]}>
                  <Text style={[s.label, { color: colors.text }]}>Description</Text>
                  <TextInput style={[s.input, s.textarea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="Optional details" placeholderTextColor={colors.muted} value={description} onChangeText={setDescription} multiline numberOfLines={2} />
                </View>
                <View style={[s.field, { flex: 1 }]}>
                  <Text style={[s.label, { color: colors.text }]}>Conditions</Text>
                  <TextInput style={[s.input, s.textarea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="e.g. Weekends only" placeholderTextColor={colors.muted} value={conditions} onChangeText={setConditions} multiline numberOfLines={2} />
                </View>
              </View>
            </View>
            <View style={s.formActions}>
              <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowForm(false)}>
                <Text style={[s.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
                <Text style={[s.saveBtnText, { color: colors.onPrimary }]}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Price'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : !bizId ? (
          <View style={s.empty}><Text style={s.emptyIcon}>💰</Text><Text style={[s.emptyText, { color: colors.muted }]}>Create your business profile first.</Text></View>
        ) : prices.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyIcon}>💰</Text><Text style={[s.emptyText, { color: colors.muted }]}>No prices yet. Tap "+ Add Price" to get started.</Text></View>
        ) : (
          <View style={[s.table, { borderColor: colors.border }]}>
            <View style={[s.tableHeader, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
              {['Title', 'Amount', 'Category', 'Unit', 'Actions'].map(h => (
                <Text key={h} style={[s.th, { color: colors.muted }, h === 'Title' && { flex: 2 }]}>{h}</Text>
              ))}
            </View>
            {prices.map(item => (
              <View key={item.id} style={[s.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View style={[s.cell, { flex: 2 }]}>
                  <Text style={[s.itemName, { color: colors.text }]}>{item.title}</Text>
                  {item.description && <Text style={[s.itemDesc, { color: colors.muted }]} numberOfLines={1}>{item.description}</Text>}
                </View>
                <Text style={[s.cell, s.cellText, { color: colors.primary, fontWeight: '700' }]}>{formatCurrency(item.amount)}</Text>
                <Text style={[s.cell, s.cellText, { color: colors.text }]}>{PRICE_CATEGORIES.find(c => c.value === item.category)?.label ?? item.category}</Text>
                <Text style={[s.cell, s.cellText, { color: colors.muted }]}>{item.unit}</Text>
                <View style={[s.cell, s.actions]}>
                  <TouchableOpacity style={[s.actionBtn, { borderColor: colors.border }]} onPress={() => openEdit(item)}>
                    <Text style={[s.actionText, { color: colors.primary }]}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { borderColor: '#AC354560', backgroundColor: '#AC354510' }]} onPress={() => handleDelete(item.id)}>
                    <Text style={[s.actionText, { color: '#AC3545' }]}>🗑 Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </BusinessShell>
  );
}

const s = StyleSheet.create({
  content: { padding: 32, gap: 20, paddingBottom: 48 },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pageTitle: { fontSize: 24, fontWeight: '700' },
  pageSub: { fontSize: 14, marginTop: 4 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  infoBanner: { padding: 14, borderRadius: 10, borderWidth: 1 },
  infoText: { fontSize: 13, lineHeight: 20 },
  formCard: { borderRadius: 12, padding: 24, gap: 16, borderWidth: 1 },
  formTitle: { fontSize: 18, fontWeight: '700' },
  formGrid: { gap: 12 },
  twoCol: { flexDirection: 'row', gap: 12 },
  field: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  textarea: { height: 64, paddingTop: 10, textAlignVertical: 'top' },
  error: { fontSize: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  formActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveBtnText: { fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15 },
  table: { borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  th: { flex: 1, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, alignItems: 'center' },
  cell: { flex: 1, paddingRight: 8 },
  cellText: { fontSize: 14 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemDesc: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: '600' },
});
