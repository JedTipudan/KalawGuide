import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Switch, ActivityIndicator } from 'react-native';
import { AdminShell } from '../../components/web/AdminShell';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';

interface ContactRow {
  id: string; name: string; organization: string;
  contact_number: string; description: string | null; is_verified: number;
}

const EMPTY = { name: '', org: '', number: '', desc: '', verified: false };

export default function WebAdminEmergencyScreen() {
  const { colors } = useTheme();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      setContacts(await db.getAllAsync<ContactRow>(
        'SELECT id, name, organization, contact_number, description, is_verified FROM emergency_contacts ORDER BY name'
      ));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
    setShowForm(true);
  }

  function openEdit(c: ContactRow) {
    setEditingId(c.id);
    setForm({ name: c.name, org: c.organization, number: c.contact_number, desc: c.description ?? '', verified: c.is_verified === 1 });
    setErrors({});
    setShowForm(true);
  }

  async function handleSave() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.org.trim()) e.org = 'Organization is required.';
    if (!form.number.trim()) e.number = 'Contact number is required.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      if (editingId) {
        await db.runAsync(
          'UPDATE emergency_contacts SET name=?, organization=?, contact_number=?, description=?, is_verified=?, last_verified_at=?, updated_at=? WHERE id=?',
          [form.name.trim(), form.org.trim(), form.number.trim(), form.desc.trim() || null, form.verified ? 1 : 0, form.verified ? now() : null, now(), editingId]
        );
      } else {
        await db.runAsync(
          `INSERT INTO emergency_contacts (id, name, organization, contact_number, description, is_verified, last_verified_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateId(), form.name.trim(), form.org.trim(), form.number.trim(), form.desc.trim() || null, form.verified ? 1 : 0, form.verified ? now() : null, now(), now()]
        );
      }
      setShowForm(false);
      await load();
    } catch { window.alert('Could not save contact.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Remove this emergency contact?')) return;
    const db = await getDatabase();
    await db.runAsync('DELETE FROM emergency_contacts WHERE id = ?', [id]);
    setContacts(prev => prev.filter(c => c.id !== id));
  }

  return (
    <AdminShell activeLabel="Emergency Contacts">
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.pageHeader}>
          <View>
            <Text style={[s.pageTitle, { color: colors.text }]}>Emergency Contacts</Text>
            <Text style={[s.pageSub, { color: colors.muted }]}>Manage local emergency contacts visible to tourists.</Text>
          </View>
          <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
            <Text style={[s.addBtnText, { color: colors.onPrimary }]}>+ Add Contact</Text>
          </TouchableOpacity>
        </View>

        {/* Inline form */}
        {showForm && (
          <View style={[s.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.formTitle, { color: colors.text }]}>{editingId ? 'Edit Contact' : 'New Emergency Contact'}</Text>
            <View style={s.formGrid}>
              <View style={s.formField}>
                <Text style={[s.label, { color: colors.text }]}>Name *</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: errors.name ? colors.danger : colors.border }]}
                  placeholder="e.g. Mati City Police Station"
                  placeholderTextColor={colors.muted}
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                />
                {errors.name && <Text style={[s.error, { color: colors.danger }]}>{errors.name}</Text>}
              </View>
              <View style={s.formField}>
                <Text style={[s.label, { color: colors.text }]}>Organization *</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: errors.org ? colors.danger : colors.border }]}
                  placeholder="e.g. Philippine National Police"
                  placeholderTextColor={colors.muted}
                  value={form.org}
                  onChangeText={v => setForm(f => ({ ...f, org: v }))}
                />
                {errors.org && <Text style={[s.error, { color: colors.danger }]}>{errors.org}</Text>}
              </View>
              <View style={s.formField}>
                <Text style={[s.label, { color: colors.text }]}>Contact Number *</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: errors.number ? colors.danger : colors.border }]}
                  placeholder="(087) 000-0000"
                  placeholderTextColor={colors.muted}
                  value={form.number}
                  onChangeText={v => setForm(f => ({ ...f, number: v }))}
                />
                {errors.number && <Text style={[s.error, { color: colors.danger }]}>{errors.number}</Text>}
              </View>
              <View style={s.formField}>
                <Text style={[s.label, { color: colors.text }]}>Description</Text>
                <TextInput
                  style={[s.input, s.textarea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Optional description"
                  placeholderTextColor={colors.muted}
                  value={form.desc}
                  onChangeText={v => setForm(f => ({ ...f, desc: v }))}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>
            <View style={s.toggleRow}>
              <View>
                <Text style={[s.label, { color: colors.text }]}>Mark as Verified</Text>
                <Text style={[s.toggleHint, { color: colors.muted }]}>Only enable after personally confirming the number is correct.</Text>
              </View>
              <Switch
                value={form.verified}
                onValueChange={v => setForm(f => ({ ...f, verified: v }))}
                trackColor={{ false: colors.border, true: colors.success + '80' }}
                thumbColor={form.verified ? colors.success : colors.muted}
              />
            </View>
            <View style={s.formActions}>
              <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowForm(false)}>
                <Text style={[s.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
                <Text style={[s.saveBtnText, { color: colors.onPrimary }]}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Contact'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={[s.warningBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
          <Text style={[s.warningText, { color: colors.warning }]}>
            ⚠️ Only mark contacts as verified after personally confirming the number is correct and active.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : contacts.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📞</Text>
            <Text style={[s.emptyText, { color: colors.muted }]}>No emergency contacts yet. Add one above.</Text>
          </View>
        ) : (
          <View style={[s.table, { borderColor: colors.border }]}>
            <View style={[s.tableHeader, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
              {['Name & Organization', 'Contact Number', 'Status', 'Actions'].map(h => (
                <Text key={h} style={[s.th, { color: colors.muted }, h === 'Name & Organization' && { flex: 2 }]}>{h}</Text>
              ))}
            </View>
            {contacts.map(c => (
              <View key={c.id} style={[s.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View style={[s.cell, { flex: 2 }]}>
                  <Text style={[s.contactName, { color: colors.text }]}>{c.name}</Text>
                  <Text style={[s.contactOrg, { color: colors.muted }]}>{c.organization}</Text>
                  {c.description ? <Text style={[s.contactDesc, { color: colors.muted }]} numberOfLines={1}>{c.description}</Text> : null}
                </View>
                <Text style={[s.cell, s.cellText, { color: colors.primary }]}>{c.contact_number}</Text>
                <View style={s.cell}>
                  {c.is_verified === 1
                    ? <View style={[s.badge, { backgroundColor: '#19715120' }]}><Text style={[s.badgeText, { color: '#197151' }]}>✅ Verified</Text></View>
                    : <View style={[s.badge, { backgroundColor: '#95611220' }]}><Text style={[s.badgeText, { color: '#956112' }]}>⚠️ Unverified</Text></View>
                  }
                </View>
                <View style={[s.cell, s.actions]}>
                  <TouchableOpacity style={[s.actionBtn, { borderColor: colors.border }]} onPress={() => openEdit(c)}>
                    <Text style={[s.actionText, { color: colors.text }]}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { borderColor: '#AC354560', backgroundColor: '#AC354510' }]} onPress={() => handleDelete(c.id)}>
                    <Text style={[s.actionText, { color: '#AC3545' }]}>🗑 Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  content: { padding: 32, gap: 24, paddingBottom: 48 },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pageTitle: { fontSize: 24, fontWeight: '700' },
  pageSub: { fontSize: 14, marginTop: 4 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  formCard: { borderRadius: 12, padding: 24, gap: 16, borderWidth: 1 },
  formTitle: { fontSize: 18, fontWeight: '700' },
  formGrid: { gap: 12 },
  formField: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  textarea: { height: 72, paddingTop: 10, textAlignVertical: 'top' },
  error: { fontSize: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  toggleHint: { fontSize: 12, marginTop: 2 },
  formActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveBtnText: { fontSize: 14, fontWeight: '600' },
  warningBanner: { padding: 14, borderRadius: 10, borderWidth: 1 },
  warningText: { fontSize: 13, lineHeight: 20 },
  empty: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15 },
  table: { borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  th: { flex: 1, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, alignItems: 'center' },
  cell: { flex: 1, paddingRight: 8 },
  cellText: { fontSize: 14 },
  contactName: { fontSize: 14, fontWeight: '600' },
  contactOrg: { fontSize: 12, marginTop: 2 },
  contactDesc: { fontSize: 12, marginTop: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: '600' },
});
