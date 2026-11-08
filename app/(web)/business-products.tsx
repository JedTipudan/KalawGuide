import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { BusinessShell } from '../../components/web/BusinessShell';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now, formatCurrency } from '../../utils/helpers';

interface ProductRow { id: string; name: string; description: string | null; price: number; is_available: number; }
interface ServiceRow { id: string; name: string; description: string | null; price: number; duration: string | null; is_available: number; }

type Tab = 'products' | 'services';

export default function WebBusinessProductsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [bizId, setBizId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('products');
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const db = await getDatabase();
      const biz = await db.getFirstAsync<{ id: string }>('SELECT id FROM businesses WHERE owner_id = ? LIMIT 1', [user.id]);
      if (!biz) { setLoading(false); return; }
      setBizId(biz.id);
      const [prods, svcs] = await Promise.all([
        db.getAllAsync<ProductRow>('SELECT id, name, description, price, is_available FROM business_products WHERE business_id = ? ORDER BY name', [biz.id]),
        db.getAllAsync<ServiceRow>('SELECT id, name, description, price, duration, is_available FROM business_services WHERE business_id = ? ORDER BY name', [biz.id]),
      ]);
      setProducts(prods); setServices(svcs);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditingId(null); setName(''); setDescription(''); setPrice(''); setDuration(''); setErrors({}); setShowForm(true); }
  function openEdit(item: ProductRow | ServiceRow) {
    setEditingId(item.id); setName(item.name); setDescription(item.description ?? '');
    setPrice(String(item.price)); setDuration((item as ServiceRow).duration ?? '');
    setErrors({}); setShowForm(true);
  }

  async function handleSave() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (!price.trim() || isNaN(Number(price)) || Number(price) < 0) e.price = 'Enter a valid price.';
    setErrors(e);
    if (Object.keys(e).length > 0 || !bizId) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      if (tab === 'products') {
        if (editingId) {
          await db.runAsync('UPDATE business_products SET name=?, description=?, price=?, updated_at=? WHERE id=?',
            [name.trim(), description.trim() || null, Number(price), now(), editingId]);
        } else {
          await db.runAsync(
            `INSERT INTO business_products (id, business_id, name, description, price, price_verified, is_available, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)`,
            [generateId(), bizId, name.trim(), description.trim() || null, Number(price), now(), now()]);
        }
      } else {
        if (editingId) {
          await db.runAsync('UPDATE business_services SET name=?, description=?, price=?, duration=?, updated_at=? WHERE id=?',
            [name.trim(), description.trim() || null, Number(price), duration.trim() || null, now(), editingId]);
        } else {
          await db.runAsync(
            `INSERT INTO business_services (id, business_id, name, description, price, price_verified, duration, is_available, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, 1, ?, ?)`,
            [generateId(), bizId, name.trim(), description.trim() || null, Number(price), duration.trim() || null, now(), now()]);
        }
      }
      setShowForm(false); await load();
    } catch { window.alert('Could not save.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, type: Tab) {
    if (!window.confirm('Remove this item?')) return;
    const db = await getDatabase();
    if (type === 'products') {
      await db.runAsync('DELETE FROM business_products WHERE id = ?', [id]);
      setProducts(prev => prev.filter(p => p.id !== id));
    } else {
      await db.runAsync('DELETE FROM business_services WHERE id = ?', [id]);
      setServices(prev => prev.filter(s => s.id !== id));
    }
  }

  const items = tab === 'products' ? products : services;

  return (
    <BusinessShell activeLabel="Products & Services">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.pageHeader}>
          <View>
            <Text style={[s.pageTitle, { color: colors.text }]}>Products & Services</Text>
            <Text style={[s.pageSub, { color: colors.muted }]}>Manage what you offer to tourists.</Text>
          </View>
          {bizId && (
            <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
              <Text style={s.addBtnText}>+ Add {tab === 'products' ? 'Product' : 'Service'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={[s.tabs, { borderColor: colors.border }]}>
          {(['products', 'services'] as Tab[]).map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => { setTab(t); setShowForm(false); }}>
              <Text style={[s.tabText, { color: tab === t ? colors.primary : colors.muted }]}>
                {t === 'products' ? '📦 Products' : '🛎 Services'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Inline form */}
        {showForm && (
          <View style={[s.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.formTitle, { color: colors.text }]}>{editingId ? `Edit ${tab === 'products' ? 'Product' : 'Service'}` : `New ${tab === 'products' ? 'Product' : 'Service'}`}</Text>
            <View style={s.formGrid}>
              <View style={s.field}>
                <Text style={[s.label, { color: colors.text }]}>Name *</Text>
                <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: errors.name ? colors.danger : colors.border }]}
                  placeholder={tab === 'products' ? 'e.g. Surfboard Rental' : 'e.g. Island Hopping Tour'}
                  placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
                {errors.name && <Text style={[s.error, { color: colors.danger }]}>{errors.name}</Text>}
              </View>
              <View style={s.twoCol}>
                <View style={[s.field, { flex: 1 }]}>
                  <Text style={[s.label, { color: colors.text }]}>Price (₱) *</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: errors.price ? colors.danger : colors.border }]}
                    placeholder="0.00" placeholderTextColor={colors.muted} value={price} onChangeText={setPrice} />
                  {errors.price && <Text style={[s.error, { color: colors.danger }]}>{errors.price}</Text>}
                </View>
                {tab === 'services' && (
                  <View style={[s.field, { flex: 1 }]}>
                    <Text style={[s.label, { color: colors.text }]}>Duration</Text>
                    <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      placeholder="e.g. 3 hours" placeholderTextColor={colors.muted} value={duration} onChangeText={setDuration} />
                  </View>
                )}
              </View>
              <View style={s.field}>
                <Text style={[s.label, { color: colors.text }]}>Description</Text>
                <TextInput style={[s.input, s.textarea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Optional description" placeholderTextColor={colors.muted} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
              </View>
            </View>
            <View style={s.formActions}>
              <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowForm(false)}>
                <Text style={[s.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
                <Text style={s.saveBtnText}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : !bizId ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📦</Text>
            <Text style={[s.emptyText, { color: colors.muted }]}>Create your business profile first.</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>{tab === 'products' ? '📦' : '🛎'}</Text>
            <Text style={[s.emptyText, { color: colors.muted }]}>No {tab} yet. Tap "+ Add" to get started.</Text>
          </View>
        ) : (
          <View style={[s.table, { borderColor: colors.border }]}>
            <View style={[s.tableHeader, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
              {['Name', 'Price', tab === 'services' ? 'Duration' : 'Status', 'Actions'].map(h => (
                <Text key={h} style={[s.th, { color: colors.muted }, h === 'Name' && { flex: 2 }]}>{h}</Text>
              ))}
            </View>
            {items.map(item => (
              <View key={item.id} style={[s.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View style={[s.cell, { flex: 2 }]}>
                  <Text style={[s.itemName, { color: colors.text }]}>{item.name}</Text>
                  {item.description && <Text style={[s.itemDesc, { color: colors.muted }]} numberOfLines={1}>{item.description}</Text>}
                </View>
                <Text style={[s.cell, s.cellText, { color: colors.primary }]}>{formatCurrency(item.price)}</Text>
                <Text style={[s.cell, s.cellText, { color: colors.muted }]}>
                  {tab === 'services' ? ((item as ServiceRow).duration ?? '—') : (item.is_available ? '✅ Available' : '❌ Unavailable')}
                </Text>
                <View style={[s.cell, s.actions]}>
                  <TouchableOpacity style={[s.actionBtn, { borderColor: colors.border }]} onPress={() => openEdit(item)}>
                    <Text style={[s.actionText, { color: colors.primary }]}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { borderColor: '#AC354560', backgroundColor: '#AC354510' }]} onPress={() => handleDelete(item.id, tab)}>
                    <Text style={[s.actionText, { color: '#AC3545' }]}>🗑 Delete</Text>
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
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, gap: 0 },
  tab: { paddingHorizontal: 20, paddingVertical: 12 },
  tabText: { fontSize: 14, fontWeight: '600' },
  formCard: { borderRadius: 12, padding: 24, gap: 16, borderWidth: 1 },
  formTitle: { fontSize: 18, fontWeight: '700' },
  formGrid: { gap: 12 },
  twoCol: { flexDirection: 'row', gap: 12 },
  field: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  textarea: { height: 80, paddingTop: 10, textAlignVertical: 'top' },
  error: { fontSize: 12 },
  formActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
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
