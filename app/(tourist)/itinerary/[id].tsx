import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, SectionList,
  TouchableOpacity, Alert, Modal, KeyboardAvoidingView,
  Platform, ScrollView, TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { KalawButton } from '../../../components/common/KalawButton';
import { KalawInput } from '../../../components/common/KalawInput';
import { getDatabase } from '../../../database/migrations/init';
import { generateId, now, formatShortDate, getDaysBetween } from '../../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../../constants/tokens';

interface ItineraryRow { id: string; title: string; start_date: string; end_date: string; }
interface ItemRow { id: string; day_number: number; time: string | null; title: string; description: string | null; estimated_cost: number | null; sort_order: number; }
interface Section { title: string; day: number; data: ItemRow[]; }

export default function ItineraryDetailScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [itinerary, setItinerary] = useState<ItineraryRow | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [addDay, setAddDay] = useState(1);
  const [itemTitle, setItemTitle] = useState('');
  const [itemTime, setItemTime] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemCost, setItemCost] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    if (!id) return;
    const db = await getDatabase();
    const itin = await db.getFirstAsync<ItineraryRow>(
      'SELECT id, title, start_date, end_date FROM itineraries WHERE id = ?', [id]
    );
    if (!itin) return;
    setItinerary(itin);
    setNewTitle(itin.title);

    const items = await db.getAllAsync<ItemRow>(
      'SELECT id, day_number, time, title, description, estimated_cost, sort_order FROM itinerary_items WHERE itinerary_id = ? ORDER BY day_number ASC, sort_order ASC, time ASC',
      [id]
    );

    const days = getDaysBetween(itin.start_date, itin.end_date);
    const built: Section[] = [];
    for (let d = 1; d <= days; d++) {
      const startDate = new Date(itin.start_date);
      startDate.setDate(startDate.getDate() + d - 1);
      built.push({
        title: `Day ${d} — ${formatShortDate(startDate.toISOString())}`,
        day: d,
        data: items.filter(i => i.day_number === d),
      });
    }
    setSections(built);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function saveTitle() {
    if (!id || !newTitle.trim()) return;
    const db = await getDatabase();
    await db.runAsync('UPDATE itineraries SET title=?, updated_at=? WHERE id=?', [newTitle.trim(), now(), id]);
    setItinerary(prev => prev ? { ...prev, title: newTitle.trim() } : null);
    setEditingTitle(false);
  }

  async function addItem() {
    if (!itemTitle.trim() || !id) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO itinerary_items (id, itinerary_id, day_number, time, title, description, estimated_cost, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [generateId(), id, addDay, itemTime.trim() || null, itemTitle.trim(),
         itemDesc.trim() || null, itemCost.trim() ? Number(itemCost) : null, now(), now()]
      );
      setModalVisible(false);
      setItemTitle(''); setItemTime(''); setItemDesc(''); setItemCost('');
      await load();
    } catch { Alert.alert('Error', 'Could not add activity.'); }
    finally { setSaving(false); }
  }

  async function deleteItem(itemId: string) {
    Alert.alert('Remove Activity', 'Remove this activity from the itinerary?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM itinerary_items WHERE id = ?', [itemId]);
        await load();
      }},
    ]);
  }

  if (!itinerary) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        {editingTitle ? (
          <View style={styles.titleEditRow}>
            <TextInput
              style={[styles.titleInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />
            <TouchableOpacity onPress={saveTitle} style={[styles.saveTitleBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.saveTitleText, { color: colors.onPrimary }]}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditingTitle(true)} style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{itinerary.title}</Text>
            <Text style={[styles.editIcon, { color: colors.muted }]}>✏️</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.dates, { color: colors.muted }]}>
          {formatShortDate(itinerary.start_date)} – {formatShortDate(itinerary.end_date)}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHeader}>
            <Text style={[styles.dayTitle, { color: colors.text }]}>{section.title}</Text>
            <TouchableOpacity
              style={[styles.addItemBtn, { backgroundColor: colors.primary + '20' }]}
              onPress={() => { setAddDay(section.day); setModalVisible(true); }}
            >
              <Text style={[styles.addItemText, { color: colors.primary }]}>+ Add</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, { backgroundColor: colors.surface, ...shadow }]}>
            <View style={[styles.itemAccent, { backgroundColor: colors.accent }]} />
            <View style={styles.itemBody}>
              {item.time && <Text style={[styles.itemTime, { color: colors.muted }]}>{item.time}</Text>}
              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
              {item.description && <Text style={[styles.itemDesc, { color: colors.muted }]} numberOfLines={2}>{item.description}</Text>}
              {item.estimated_cost !== null && (
                <Text style={[styles.itemCost, { color: colors.primary }]}>₱{item.estimated_cost.toLocaleString()}</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
              <Text style={[styles.deleteIcon, { color: colors.danger }]}>🗑</Text>
            </TouchableOpacity>
          </View>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? (
            <View style={[styles.emptyDay, { backgroundColor: colors.subtle }]}>
              <Text style={[styles.emptyDayText, { color: colors.muted }]}>No activities yet — tap "+ Add" to plan this day.</Text>
            </View>
          ) : null
        }
      />

      {/* Add activity modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Activity — Day {addDay}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={[styles.closeBtn, { color: colors.muted }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <KalawInput label="Activity *" placeholder="e.g. Surf at Dahican Beach" value={itemTitle} onChangeText={setItemTitle} />
              <KalawInput label="Time" placeholder="e.g. 08:00 AM" value={itemTime} onChangeText={setItemTime} />
              <KalawInput label="Description" placeholder="Optional notes" value={itemDesc} onChangeText={setItemDesc} multiline numberOfLines={3} />
              <KalawInput label="Estimated Cost (₱)" placeholder="Optional" value={itemCost} onChangeText={setItemCost} keyboardType="decimal-pad" />
              <KalawButton label="Add Activity" onPress={addItem} loading={saving} fullWidth size="lg" />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.base, gap: Spacing.sm },
  backBtn: { alignSelf: 'flex-start', padding: Spacing.xs },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold, flex: 1 },
  editIcon: { fontSize: 18 },
  titleEditRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  titleInput: { flex: 1, borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg },
  saveTitleBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  saveTitleText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  dates: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  list: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 100 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  dayTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  addItemBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.lg },
  addItemText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  itemCard: { flexDirection: 'row', borderRadius: Radius.md, overflow: 'hidden', alignItems: 'center', marginBottom: Spacing.sm },
  itemAccent: { width: 4, alignSelf: 'stretch' },
  itemBody: { flex: 1, padding: Spacing.md, gap: Spacing.xs },
  itemTime: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium },
  itemTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  itemDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  itemCost: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  deleteBtn: { padding: Spacing.md },
  deleteIcon: { fontSize: 18 },
  emptyDay: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, alignItems: 'center' },
  emptyDayText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  modal: { flex: 1 },
  modalContent: { padding: Spacing.base, gap: Spacing.base, paddingBottom: Spacing.xxxl },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  modalTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  closeBtn: { fontSize: 20, padding: Spacing.sm },
});
