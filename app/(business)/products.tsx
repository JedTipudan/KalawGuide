import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, Modal, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now, formatCurrency } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface ProductRow { id: string; name: string; description: string | null; price: number; is_available: number; }

export default function BusinessProductsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [bizId, setBizId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const biz = await db.getFirstAsync<{ id: string }>('SELECT id FROM businesses WHERE owner_id = ? LIMIT 1', [user.id]);
    if (!biz) return;
    setBizId(biz.id);
    const rows = await db.getAllAsync<ProductRow>(
      'SELECT id, name, description, price, is_available FROM business_products WHERE business_id = ? ORDER BY name',
      [biz.id]
    );
    setProducts(rows);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditing(null); setName(''); setDescription(''); setPrice(''); setErrors({}); setModalVisible(true); }
  function openEdit(p: ProductRow) { setEditing(p); setName(p.name); setDescription(p.description ?? ''); setPrice(String(p.price)); setErrors({}); setModalVisible(true); }

  async function handleSave() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (!price.trim() || isNaN(Number(price)) || Number(price) < 0) e.price = 'Enter a valid price.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    if (!bizId) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      if (editing) {
        await db.runAsync(
          'UPDATE business_products SET name=?, description=?, price=?, updated_at=? WHERE id=?',
          [name.trim(), description.trim() || null, Number(price), now(), editing.id]
        );
      } else {
        await db.runAsync(
          `INSERT INTO business_products (id, business_id, name, description, price, price_verified, is_available, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)`,
          [generateId(), bizId, name.trim(), description.trim() || null, Number(price), now(), now()]
        );
      }
      setModalVisible(false);
      await load();
    } catch { Alert.alert('Error', 'Could not save product.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete Product', 'Remove this product?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM business_products WHERE id = ?', [id]);
        setProducts(prev => prev.filter(p => p.id !== id));
      }},
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Products</Text>
        {bizId && (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
            <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {!bizId ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No business profile yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Create your business profile first.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No products yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Tap "+ Add" to list your first product.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
              <View style={styles.cardBody}>
                <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
                {item.description ? <Text style={[styles.cardDesc, { color: colors.muted }]} numberOfLines={2}>{item.description}</Text> : null}
                <Text style={[styles.cardPrice, { color: colors.primary }]}>{formatCurrency(item.price)}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                  <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                  <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
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
                <Text style={[styles.modalTitle, { color: colors.text }]}>{editing ? 'Edit Product' : 'Add Product'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={[styles.closeBtn, { color: colors.muted }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <KalawInput label="Product Name *" placeholder="e.g. Surfboard Rental" value={name} onChangeText={setName} error={errors.name} />
              <KalawInput label="Description" placeholder="Optional description" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
              <KalawInput label="Price (₱) *" placeholder="0.00" value={price} onChangeText={setPrice} keyboardType="decimal-pad" error={errors.price} />
              <KalawButton label={editing ? 'Save Changes' : 'Add Product'} onPress={handleSave} loading={saving} fullWidth size="lg" />
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
  card: { borderRadius: Radius.md, padding: Spacing.base, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardBody: { flex: 1, gap: Spacing.xs },
  cardName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  cardDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  cardPrice: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  cardActions: { gap: Spacing.sm },
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
});
