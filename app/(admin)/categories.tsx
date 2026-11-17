import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, Modal, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawInput } from '../../components/common/KalawInput';
import { KalawButton } from '../../components/common/KalawButton';
import { getDatabase } from '../../database/migrations/init';
import { logActivity } from '../../services/admin/activityLog';
import { generateId, now } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';
import { categoryEmoji } from '../../utils/categoryIcon';

interface CategoryRow { id: string; name: string; icon: string; color: string; }

const PRESET_COLORS = ['#0E7490','#22C55E','#F97316','#F97316','#6B4FA0','#1A6B8A'];
const PRESET_ICONS = ['🏖','🌿','🏔','🌊','🏛','🍽','🛍','🎭','⛵','🦅'];

export default function AdminCategoryManagementScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏖');
  const [color, setColor] = useState('#0E7490');
  const [saving, setSaving] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<CategoryRow>(
      'SELECT id, name, icon, color FROM destination_categories ORDER BY name ASC'
    );
    setCategories(rows);
  }, []);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  function openAdd() {
    setEditing(null); setName(''); setIcon('🏖'); setColor('#0E7490');
    setModalVisible(true);
  }

  function openEdit(cat: CategoryRow) {
    setEditing(cat); setName(cat.name); setIcon(categoryEmoji(cat.icon)); setColor(cat.color);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      if (editing) {
        await db.runAsync(
          'UPDATE destination_categories SET name=?, icon=?, color=? WHERE id=?',
          [name.trim(), icon, color, editing.id]
        );
        await logActivity({ userId: user?.id ?? null, action: 'category_saved', entityType: 'category', entityId: editing.id, entityName: name.trim() });
      } else {
        await db.runAsync(
          'INSERT INTO destination_categories (id, name, icon, color) VALUES (?, ?, ?, ?)',
          [generateId(), name.trim(), icon, color]
        );
        await logActivity({ userId: user?.id ?? null, action: 'category_saved', entityType: 'category', entityId: 'new', entityName: name.trim() });
      }
      setModalVisible(false);
      await load();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string, catName: string) {
    Alert.alert('Delete Category', `Delete "${catName}"? Destinations using this category will be unlinked.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM destination_categories WHERE id = ?', [id]);
        await logActivity({ userId: user?.id ?? null, action: 'category_deleted', entityType: 'category', entityId: id, entityName: catName });
        await load();
      }},
    ]);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.commandBar, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/settings' as any))} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={[styles.commandBarTitle, { color: colors.primary }]}>‹ Destination categories</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Category management</Text>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
              <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>+ Add</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, ...shadow }]}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>No categories found.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
            <View style={[styles.iconBadge, { backgroundColor: item.color + '20' }]}>
              <Text style={styles.catIcon}>{categoryEmoji(item.icon)}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.catName, { color: colors.text }]}>{item.name}</Text>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => openEdit(item)} style={[styles.editBtn, { borderColor: colors.border }]}>
                <Text style={[styles.editBtnText, { color: colors.text }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                <Text style={[styles.deleteIcon, { color: colors.danger }]}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editing ? 'Edit Category' : 'New Category'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[styles.closeBtn, { color: colors.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <KalawInput label="Category Name *" placeholder="e.g. Beach" value={name} onChangeText={setName} />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Icon</Text>
            <View style={styles.iconGrid}>
              {PRESET_ICONS.map(ic => (
                <TouchableOpacity
                  key={ic}
                  style={[styles.iconOption, { backgroundColor: icon === ic ? colors.primary + '20' : colors.subtle, borderColor: icon === ic ? colors.primary : colors.border }]}
                  onPress={() => setIcon(ic)}
                >
                  <Text style={styles.iconOptionText}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Color</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorOption, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: colors.text }]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <KalawButton label={editing ? 'Save Changes' : 'Add Category'} onPress={handleSave} loading={saving} fullWidth size="lg" />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  commandBar: { paddingHorizontal: 16, paddingVertical: 16 },
  commandBarTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 18, fontWeight: '700' },
  list: { padding: 16, gap: Spacing.md, paddingBottom: 100 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  pageTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: '700' },
  addBtn: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.lg },
  addBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: '600' },
  emptyCard: { borderRadius: Radius.md, padding: Spacing.xl, alignItems: 'center' },
  emptyText: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  iconBadge: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  catIcon: { fontSize: 22 },
  cardInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  catName: { fontFamily: Typography.fontFamilyBody, fontSize: 15, fontWeight: '600' },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  editBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.sm, borderWidth: 1 },
  editBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 13 },
  deleteIcon: { fontSize: 18 },
  modal: { flex: 1 },
  modalContent: { padding: Spacing.base, gap: Spacing.base, paddingBottom: 60 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  modalTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 20, fontWeight: '700' },
  closeBtn: { fontSize: 20, padding: Spacing.sm },
  fieldLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: '600', marginBottom: -Spacing.sm },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconOption: { width: 44, height: 44, borderRadius: Radius.sm, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  iconOptionText: { fontSize: 22 },
  colorGrid: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  colorOption: { width: 36, height: 36, borderRadius: 18 },
});
