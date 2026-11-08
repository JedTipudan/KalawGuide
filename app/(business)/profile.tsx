import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

const CATEGORIES = [
  { value: 'accommodation', label: '🏨 Accommodation' },
  { value: 'restaurant', label: '🍽 Restaurant' },
  { value: 'tour_operator', label: '🗺 Tour Operator' },
  { value: 'transport', label: '🚌 Transport' },
  { value: 'activity', label: '🏄 Activity' },
  { value: 'retail', label: '🛍 Retail' },
  { value: 'other', label: '🏪 Other' },
];

const DOCUMENT_TYPES = [
  { value: 'business_permit', label: 'Business Permit', hint: 'Mayor\'s permit or DTI registration' },
  { value: 'bir_certificate', label: 'BIR Certificate', hint: 'Certificate of Registration from BIR' },
  { value: 'ownership_proof', label: 'Proof of Ownership', hint: 'Title, lease contract, or deed of sale' },
  { value: 'valid_id', label: 'Valid Government ID', hint: 'Owner\'s government-issued ID' },
  { value: 'other', label: 'Other Supporting Document', hint: 'Any other relevant document' },
];

interface DocRow {
  id: string;
  document_type: string;
  label: string;
  uri: string;
  uploaded_at: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: string; message: string }> = {
  not_submitted: { color: '#57717A', icon: '📋', message: 'Not yet submitted for review.' },
  pending: { color: '#956112', icon: '⏳', message: 'Under review by administrator.' },
  approved: { color: '#197151', icon: '✅', message: 'Approved — your listing is publicly visible.' },
  rejected: { color: '#AC3545', icon: '❌', message: 'Rejected — see note below and resubmit.' },
  suspended: { color: '#AC3545', icon: '⛔', message: 'Suspended by administrator.' },
};

export default function BusinessProfileScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const [bizId, setBizId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('accommodation');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('not_submitted');
  const [verificationNote, setVerificationNote] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      id: string; name: string; description: string; category: string;
      address: string; contact_number: string | null; email: string | null;
      website: string | null; verification_status: string; verification_note: string | null;
    }>('SELECT id, name, description, category, address, contact_number, email, website, verification_status, verification_note FROM businesses WHERE owner_id = ? LIMIT 1', [user.id]);
    if (row) {
      setBizId(row.id);
      setName(row.name);
      setDescription(row.description);
      setCategory(row.category);
      setAddress(row.address);
      setContactNumber(row.contact_number ?? '');
      setEmailVal(row.email ?? '');
      setWebsite(row.website ?? '');
      setVerificationStatus(row.verification_status);
      setVerificationNote(row.verification_note ?? null);

      const docs = await db.getAllAsync<DocRow>(
        'SELECT id, document_type, label, uri, uploaded_at FROM business_documents WHERE business_id = ? ORDER BY uploaded_at ASC',
        [row.id]
      );
      setDocuments(docs);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Business name is required.';
    if (!description.trim()) e.description = 'Description is required.';
    if (!address.trim()) e.address = 'Address is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !user) return;
    setLoading(true);
    try {
      const db = await getDatabase();
      if (bizId) {
        await db.runAsync(
          `UPDATE businesses SET name=?, description=?, category=?, address=?,
           contact_number=?, email=?, website=?, updated_at=? WHERE id=?`,
          [name.trim(), description.trim(), category, address.trim(),
           contactNumber.trim() || null, emailVal.trim() || null,
           website.trim() || null, now(), bizId]
        );
      } else {
        const id = generateId();
        await db.runAsync(
          `INSERT INTO businesses (id, owner_id, name, description, category, address,
           contact_number, email, website, image_urls, verification_status, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 'not_submitted', 1, ?, ?)`,
          [id, user.id, name.trim(), description.trim(), category, address.trim(),
           contactNumber.trim() || null, emailVal.trim() || null,
           website.trim() || null, now(), now()]
        );
        setBizId(id);
        setVerificationStatus('not_submitted');
      }
      Alert.alert('Saved', 'Business profile saved successfully.');
    } catch {
      Alert.alert('Error', 'Could not save business profile.');
    } finally {
      setLoading(false);
    }
  }

  async function pickDocument(docType: string, label: string) {
    if (!bizId) {
      Alert.alert('Save first', 'Please save your business profile before uploading documents.');
      return;
    }
    setUploadingType(docType);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const db = await getDatabase();
      // Replace existing doc of same type
      await db.runAsync('DELETE FROM business_documents WHERE business_id = ? AND document_type = ?', [bizId, docType]);
      const docId = generateId();
      await db.runAsync(
        'INSERT INTO business_documents (id, business_id, document_type, label, uri, mime_type, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [docId, bizId, docType, label, asset.uri, asset.mimeType ?? 'image/jpeg', now()]
      );
      await load();
    } catch {
      Alert.alert('Error', 'Could not upload document.');
    } finally {
      setUploadingType(null);
    }
  }

  async function removeDocument(docId: string) {
    Alert.alert('Remove Document', 'Remove this document?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM business_documents WHERE id = ?', [docId]);
        await load();
      }},
    ]);
  }

  async function handleSubmitVerification() {
    if (!bizId) { Alert.alert('Save first', 'Please save your profile before submitting.'); return; }
    if (documents.length === 0) {
      Alert.alert('Documents required', 'Please upload at least one ownership document before submitting for verification.');
      return;
    }
    setSubmitting(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        "UPDATE businesses SET verification_status='pending', verification_note=NULL, updated_at=? WHERE id=?",
        [now(), bizId]
      );
      setVerificationStatus('pending');
      setVerificationNote(null);
      Alert.alert('Submitted', 'Your business has been submitted for administrator review. You will be notified once reviewed.');
    } catch {
      Alert.alert('Error', 'Could not submit for verification.');
    } finally {
      setSubmitting(false);
    }
  }

  const statusCfg = STATUS_CONFIG[verificationStatus] ?? STATUS_CONFIG.not_submitted;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.text }]}>Business Profile</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {bizId ? 'Update your business information.' : 'Create your business listing.'}
          </Text>

          {/* Verification status banner */}
          <View style={[styles.statusBanner, { backgroundColor: statusCfg.color + '18', borderColor: statusCfg.color + '50' }]}>
            <Text style={[styles.statusIcon]}>{statusCfg.icon}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.statusLabel, { color: statusCfg.color }]}>
                {verificationStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </Text>
              <Text style={[styles.statusMsg, { color: colors.muted }]}>{statusCfg.message}</Text>
              {verificationNote && (
                <Text style={[styles.statusNote, { color: colors.danger }]}>Note: {verificationNote}</Text>
              )}
            </View>
          </View>

          {/* Business info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Business Information</Text>
            <KalawInput label="Business Name *" placeholder="e.g. Dahican Surf Resort" value={name} onChangeText={setName} error={errors.name} />
            <KalawInput label="Description *" placeholder="Describe your business..." value={description} onChangeText={setDescription} multiline numberOfLines={4} error={errors.description} />
            <KalawInput label="Address *" placeholder="Street, Barangay, Mati City" value={address} onChangeText={setAddress} error={errors.address} />
            <KalawInput label="Contact Number" placeholder="(087) 000-0000" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" />
            <KalawInput label="Email" placeholder="business@example.com" value={emailVal} onChangeText={setEmailVal} keyboardType="email-address" />
            <KalawInput label="Website" placeholder="https://..." value={website} onChangeText={setWebsite} keyboardType="url" />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.catOption, {
                    backgroundColor: category === cat.value ? colors.primary + '20' : colors.surface,
                    borderColor: category === cat.value ? colors.primary : colors.border,
                  }]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text style={[styles.catLabel, { color: category === cat.value ? colors.primary : colors.text }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <KalawButton label="Save Profile" onPress={handleSave} loading={loading} fullWidth size="lg" />

          {/* Ownership documents */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ownership Documents</Text>
            <View style={[styles.docNote, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
              <Text style={[styles.docNoteText, { color: colors.warning }]}>
                📎 Upload documents to prove you own or operate this business. Required before submitting for verification. All documents are reviewed only by KalawGuide administrators.
              </Text>
            </View>

            {DOCUMENT_TYPES.map(dt => {
              const uploaded = documents.find(d => d.document_type === dt.value);
              return (
                <View key={dt.value} style={[styles.docRow, { backgroundColor: colors.surface, borderColor: uploaded ? colors.success + '60' : colors.border, ...shadow }]}>
                  <View style={styles.docInfo}>
                    <Text style={[styles.docLabel, { color: colors.text }]}>{dt.label}</Text>
                    <Text style={[styles.docHint, { color: colors.muted }]}>{dt.hint}</Text>
                    {uploaded && (
                      <Text style={[styles.docUploaded, { color: colors.success }]}>✅ Uploaded</Text>
                    )}
                  </View>
                  <View style={styles.docActions}>
                    {uploaded && (
                      <Image source={{ uri: uploaded.uri }} style={styles.docThumb} resizeMode="cover" />
                    )}
                    <TouchableOpacity
                      style={[styles.docBtn, { backgroundColor: uploaded ? colors.subtle : colors.primary + '15', borderColor: uploaded ? colors.border : colors.primary }]}
                      onPress={() => pickDocument(dt.value, dt.label)}
                      disabled={uploadingType === dt.value}
                    >
                      <Text style={[styles.docBtnText, { color: uploaded ? colors.muted : colors.primary }]}>
                        {uploadingType === dt.value ? '...' : uploaded ? 'Replace' : 'Upload'}
                      </Text>
                    </TouchableOpacity>
                    {uploaded && (
                      <TouchableOpacity onPress={() => removeDocument(uploaded.id)}>
                        <Text style={[styles.docRemove, { color: colors.danger }]}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Submit for verification */}
          {bizId && (verificationStatus === 'not_submitted' || verificationStatus === 'rejected') && (
            <KalawButton
              label={verificationStatus === 'rejected' ? 'Resubmit for Verification' : 'Submit for Verification'}
              onPress={handleSubmitVerification}
              loading={submitting}
              variant="secondary"
              fullWidth
            />
          )}

          <View style={[styles.infoBanner, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.muted }]}>
              ℹ️ Your listing will only be publicly visible after an administrator reviews your documents and approves your business. This process helps protect tourists from fraudulent listings.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  statusBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.base, borderRadius: Radius.md, borderWidth: 1 },
  statusIcon: { fontSize: 22 },
  statusLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold, textTransform: 'capitalize' },
  statusMsg: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  statusNote: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontStyle: 'italic' },
  section: { gap: Spacing.md },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  fieldLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catOption: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1.5 },
  catLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  docNote: { padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  docNoteText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * 1.5 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.base, borderRadius: Radius.md, borderWidth: 1.5 },
  docInfo: { flex: 1, gap: 2 },
  docLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  docHint: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label },
  docUploaded: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium },
  docActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  docThumb: { width: 44, height: 44, borderRadius: Radius.sm },
  docBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1.5 },
  docBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  docRemove: { fontSize: 18, padding: Spacing.xs },
  infoBanner: { padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  infoText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * 1.5 },
});
