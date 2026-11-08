import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, Modal, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now, formatCurrency } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface ServiceRow { id: string; name: string; description: string | null; price: number; duration: string | null; is_available: number; }

export default function BusinessServicesScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [bizId, setBizId] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const biz = await db.getFirstAsync<{ id: string }>('SELECT id FROM businesses WHERE owner_id = ? LIMIT 1', [user.id]);
    if (!biz) return;
    setBizId(biz.id);
    const rows = await db.getAllAsync<ServiceRow>(
      'SELECT id, name, description, price, duration, is_available FROM business_services WHERE business_id = ? ORDER BY name',
      [biz.id]
    );
    setServices(rows);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditing(null); setName(''); setDescription(''); setPrice(''); setDuration(''); setErrors({}); setModalVisible(true); }
  function openEdit(s: ServiceRow) { setEditing(s); setName(s.name); setDescription(s.description ?? ''); setPrice(String(s.price)); setDuration(s.duration ?? ''); setErrors({}); setModalVisible(true); }

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
          'UPDATE business_services SET name=?, description=?, price=?, duration=?, updated_at=? WHERE id=?',
          [name.trim(), description.trim() || null, Number(price), duration.trim() || null, now(), editing.id]
        );
      } else {
        await db.runAsync(
          `INSERT INTO business_services (id, business_id, name, description, price, price_verified, duration, is_available, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 0, ?, 1, ?, ?)`,
          [generateId(), bizId, name.trim(), description.trim() || null, Number(price), duration.trim() || null, now(), now()]
        );
      }
      setModalVisible(false);
      await load();
    } catch { Alert.alert('Error', 'Could not save service.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete Service', 'Remove this service?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM business_services WHERE id = ?', [id]);
        setServices(prev => prev.filter(s => s.id !== id));
      }},
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Services</Text>
        {bizId && (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
            <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {!bizId ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛎</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No business profile yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Create your business profile first.</Text>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🛎</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No services yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Tap "+ Add" to list your first service.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
              <View style={styles.cardBody}>
                <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
                {item.description ? <Text style={[styles.cardDesc, { color: colors.muted }]} numberOfLines={2}>{item.description}</Text> : null}
                <View style={styles.cardMeta}>
                  <Text style={[styles.cardPrice, { color: colors.primary }]}>{formatCurrency(item.price)}</Text>
                  {item.duration ? <Text style={[styles.cardDuration, { color: colors.muted }]}>· {item.duration}</Text> : null}
                </View>
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
                <Text style={[styles.modalTitle, { color: colors.text }]}>{editing ? 'Edit Service' : 'Add Service'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={[styles.closeBtn, { color: colors.muted }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <KalawInput label="Service Name *" placeholder="e.g. Island Hopping Tour" value={name} onChangeText={setName} error={errors.name} />
              <KalawInput label="Description" placeholder="Optional description" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
              <KalawInput label="Price (₱) *" placeholder="0.00" value={price} onChangeText={setPrice} keyboardType="decimal-pad" error={errors.price} />
              <KalawInput label="Duration" placeholder="e.g. 3 hours, Half day" value={duration} onChangeText={setDuration} />
              <KalawButton label={editing ? 'Save Changes' : 'Add Service'} onPress={handleSave} loading={saving} fullWidth size="lg" />
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
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardPrice: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  cardDuration: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
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
