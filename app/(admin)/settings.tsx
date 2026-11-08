import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface ContactRow { id: string; name: string; organization: string; contact_number: string; description: string | null; is_verified: number; }

export default function AdminSettingsScreen() {
  const { colors, isDark } = useTheme();
  const { signOut } = useAuth();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [cName, setCName] = useState('');
  const [cOrg, setCOrg] = useState('');
  const [cNumber, setCNumber] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cVerified, setCVerified] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ContactRow>(
      'SELECT id, name, organization, contact_number, description, is_verified FROM emergency_contacts ORDER BY name'
    );
    setContacts(rows);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditing(null); setCName(''); setCOrg(''); setCNumber(''); setCDesc(''); setCVerified(false); setErrors({}); setModalVisible(true); }
  function openEdit(c: ContactRow) { setEditing(c); setCName(c.name); setCOrg(c.organization); setCNumber(c.contact_number); setCDesc(c.description ?? ''); setCVerified(c.is_verified === 1); setErrors({}); setModalVisible(true); }

  async function handleSave() {
    const e: Record<string, string> = {};
    if (!cName.trim()) e.name = 'Name is required.';
    if (!cOrg.trim()) e.org = 'Organization is required.';
    if (!cNumber.trim()) e.number = 'Contact number is required.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      if (editing) {
        await db.runAsync(
          'UPDATE emergency_contacts SET name=?, organization=?, contact_number=?, description=?, is_verified=?, last_verified_at=?, updated_at=? WHERE id=?',
          [cName.trim(), cOrg.trim(), cNumber.trim(), cDesc.trim() || null, cVerified ? 1 : 0, cVerified ? now() : null, now(), editing.id]
        );
      } else {
        await db.runAsync(
          `INSERT INTO emergency_contacts (id, name, organization, contact_number, description, is_verified, last_verified_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateId(), cName.trim(), cOrg.trim(), cNumber.trim(), cDesc.trim() || null, cVerified ? 1 : 0, cVerified ? now() : null, now(), now()]
        );
      }
      setModalVisible(false);
      await load();
    } catch { Alert.alert('Error', 'Could not save contact.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete Contact', 'Remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM emergency_contacts WHERE id = ?', [id]);
        setContacts(prev => prev.filter(c => c.id !== id));
      }},
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Emergency Contacts</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
            <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {contacts.map(contact => (
          <View key={contact.id} style={[styles.contactCard, { backgroundColor: colors.surface, ...shadow }]}>
            <View style={styles.contactInfo}>
              <View style={styles.contactTop}>
                <Text style={[styles.contactName, { color: colors.text }]}>{contact.name}</Text>
                {contact.is_verified === 1 ? (
                  <View style={[styles.verifiedBadge, { backgroundColor: colors.success + '20' }]}>
                    <Text style={[styles.verifiedText, { color: colors.success }]}>✅ Verified</Text>
                  </View>
                ) : (
                  <View style={[styles.unverifiedBadge, { backgroundColor: colors.warning + '20' }]}>
                    <Text style={[styles.unverifiedText, { color: colors.warning }]}>⚠️ Unverified</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.contactOrg, { color: colors.muted }]}>{contact.organization}</Text>
              <Text style={[styles.contactNumber, { color: colors.primary }]}>{contact.contact_number}</Text>
            </View>
            <View style={styles.contactActions}>
              <TouchableOpacity onPress={() => openEdit(contact)} style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(contact.id)} style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={[styles.warningBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
          <Text style={[styles.warningText, { color: colors.warning }]}>
            ⚠️ Only mark contacts as verified after personally confirming the number is correct and active.
          </Text>
        </View>

        <KalawButton label="Sign Out" onPress={signOut} variant="ghost" fullWidth />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{editing ? 'Edit Contact' : 'Add Emergency Contact'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={[styles.closeBtn, { color: colors.muted }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <KalawInput label="Name *" placeholder="e.g. Mati City Police Station" value={cName} onChangeText={setCName} error={errors.name} />
              <KalawInput label="Organization *" placeholder="e.g. Philippine National Police" value={cOrg} onChangeText={setCOrg} error={errors.org} />
              <KalawInput label="Contact Number *" placeholder="(087) 000-0000" value={cNumber} onChangeText={setCNumber} keyboardType="phone-pad" error={errors.number} />
              <KalawInput label="Description" placeholder="Optional description" value={cDesc} onChangeText={setCDesc} multiline numberOfLines={2} />
              <View style={styles.toggleRow}>
                <View>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>Mark as Verified</Text>
                  <Text style={[styles.toggleHint, { color: colors.muted }]}>Only check if you have confirmed this number is correct.</Text>
                </View>
                <Switch value={cVerified} onValueChange={setCVerified} trackColor={{ false: colors.border, true: colors.success + '80' }} thumbColor={cVerified ? colors.success : colors.muted} />
              </View>
              <KalawButton label={editing ? 'Save Changes' : 'Add Contact'} onPress={handleSave} loading={saving} fullWidth size="lg" />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  addBtn: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.lg },
  addBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  contactCard: { borderRadius: Radius.md, padding: Spacing.base, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  contactInfo: { flex: 1, gap: Spacing.xs },
  contactTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  contactName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold, flex: 1 },
  verifiedBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  verifiedText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium },
  unverifiedBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  unverifiedText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium },
  contactOrg: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  contactNumber: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  contactActions: { gap: Spacing.sm },
  actionBtn: { padding: Spacing.sm },
  actionText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  warningBanner: { padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  warningText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * Typography.lineHeight },
  modal: { flex: 1 },
  modalContent: { padding: Spacing.base, gap: Spacing.base, paddingBottom: Spacing.xxxl },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  modalTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  closeBtn: { fontSize: 20, padding: Spacing.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, gap: Spacing.md },
  toggleLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.medium },
  toggleHint: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
});
