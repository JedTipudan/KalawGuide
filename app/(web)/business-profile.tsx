import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, Platform } from 'react-native';
import { BusinessShell } from '../../components/web/BusinessShell';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';

const DOCUMENT_TYPES = [
  { value: 'business_permit', label: 'Business Permit', hint: "Mayor's permit or DTI registration" },
  { value: 'bir_certificate', label: 'BIR Certificate', hint: 'Certificate of Registration from BIR' },
  { value: 'ownership_proof', label: 'Proof of Ownership', hint: 'Title, lease contract, or deed of sale' },
  { value: 'valid_id', label: 'Valid Government ID', hint: "Owner's government-issued ID" },
  { value: 'other', label: 'Other Supporting Document', hint: 'Any other relevant document' },
];

interface DocRow {
  id: string; document_type: string; label: string; uri: string; uploaded_at: string;
}

const CATEGORIES = [
  { value: 'accommodation', label: '🏨 Accommodation' },
  { value: 'restaurant', label: '🍽 Restaurant' },
  { value: 'tour_operator', label: '🗺 Tour Operator' },
  { value: 'transport', label: '🚌 Transport' },
  { value: 'activity', label: '🏄 Activity' },
  { value: 'retail', label: '🛍 Retail' },
  { value: 'other', label: '🏪 Other' },
];

export default function WebBusinessProfileScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [bizId, setBizId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('accommodation');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('not_submitted');
  const [verificationNote, setVerificationNote] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingDocType, setPendingDocType] = useState<{ value: string; label: string } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      id: string; name: string; description: string; category: string;
      address: string; contact_number: string | null; email: string | null;
      website: string | null; verification_status: string; verification_note: string | null;
      image_urls: string;
    }>('SELECT * FROM businesses WHERE owner_id = ? LIMIT 1', [user.id]);
    if (row) {
      setBizId(row.id); setName(row.name); setDescription(row.description);
      setCategory(row.category); setAddress(row.address);
      setContactNumber(row.contact_number ?? ''); setEmail(row.email ?? '');
      setWebsite(row.website ?? ''); setVerificationStatus(row.verification_status);
      setVerificationNote(row.verification_note);
      try { setPhotos(JSON.parse(row.image_urls ?? '[]')); } catch { setPhotos([]); }
      const docs = await db.getAllAsync<DocRow>(
        'SELECT id, document_type, label, uri, uploaded_at FROM business_documents WHERE business_id = ? ORDER BY uploaded_at ASC',
        [row.id]
      );
      setDocuments(docs);
    }
    setInitializing(false);
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

  async function ensureBizId(): Promise<string | null> {
    if (bizId) return bizId;
    if (!validate() || !user) return null;
    setLoading(true);
    try {
      const db = await getDatabase();
      const id = generateId();
      await db.runAsync(
        `INSERT INTO businesses (id, owner_id, name, description, category, address, contact_number, email, website, image_urls, verification_status, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 'not_submitted', 1, ?, ?)`,
        [id, user.id, name.trim(), description.trim(), category, address.trim(), contactNumber.trim() || null, email.trim() || null, website.trim() || null, now(), now()]
      );
      setBizId(id);
      return id;
    } catch { window.alert('Could not save profile. Fill in required fields first.'); return null; }
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!validate() || !user) return;
    setLoading(true);
    try {
      const db = await getDatabase();
      if (bizId) {
        await db.runAsync(
          `UPDATE businesses SET name=?, description=?, category=?, address=?, contact_number=?, email=?, website=?, updated_at=? WHERE id=?`,
          [name.trim(), description.trim(), category, address.trim(), contactNumber.trim() || null, email.trim() || null, website.trim() || null, now(), bizId]
        );
      } else {
        const id = generateId();
        await db.runAsync(
          `INSERT INTO businesses (id, owner_id, name, description, category, address, contact_number, email, website, image_urls, verification_status, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 'not_submitted', 1, ?, ?)`,
          [id, user.id, name.trim(), description.trim(), category, address.trim(), contactNumber.trim() || null, email.trim() || null, website.trim() || null, now(), now()]
        );
        setBizId(id); setVerificationStatus('not_submitted');
      }
      window.alert('Business profile saved successfully.');
      await load();
    } catch { window.alert('Could not save business profile.'); }
    finally { setLoading(false); }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const currentBizId = await ensureBizId();
    if (!currentBizId) return;
    setPhotoUploading(true);
    try {
      const newUris = await Promise.all(files.map(file => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      })));
      const updated = [...photos, ...newUris];
      const db = await getDatabase();
      await db.runAsync('UPDATE businesses SET image_urls=?, updated_at=? WHERE id=?', [JSON.stringify(updated), now(), currentBizId]);
      setPhotos(updated);
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  }

  async function removePhoto(index: number) {
    if (!bizId) return;
    const updated = photos.filter((_, i) => i !== index);
    const db = await getDatabase();
    await db.runAsync('UPDATE businesses SET image_urls=?, updated_at=? WHERE id=?', [JSON.stringify(updated), now(), bizId]);
    setPhotos(updated);
  }

  function triggerFileUpload(dt: { value: string; label: string }) {
    if (!bizId) { window.alert('Please save your profile before uploading documents.'); return; }
    setPendingDocType(dt);
    if (fileInputRef.current) fileInputRef.current.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pendingDocType || !bizId) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const uri = ev.target?.result as string;
      const db = await getDatabase();
      await db.runAsync('DELETE FROM business_documents WHERE business_id = ? AND document_type = ?', [bizId, pendingDocType.value]);
      await db.runAsync(
        'INSERT INTO business_documents (id, business_id, document_type, label, uri, mime_type, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [generateId(), bizId, pendingDocType.value, pendingDocType.label, uri, file.type || 'image/jpeg', now()]
      );
      await load();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function removeDocument(docId: string) {
    if (!window.confirm('Remove this document?')) return;
    const db = await getDatabase();
    await db.runAsync('DELETE FROM business_documents WHERE id = ?', [docId]);
    await load();
  }

  async function handleSubmitVerification() {
    if (!bizId) { window.alert('Please save your profile before submitting.'); return; }
    if (documents.length === 0) { window.alert('Please upload at least one ownership document before submitting for verification.'); return; }
    if (!window.confirm('Submit your business for administrator review?')) return;
    setSubmitting(true);
    try {
      const db = await getDatabase();
      await db.runAsync("UPDATE businesses SET verification_status='pending', updated_at=? WHERE id=?", [now(), bizId]);
      setVerificationStatus('pending');
      window.alert('Your business has been submitted for administrator review.');
    } catch { window.alert('Could not submit for verification.'); }
    finally { setSubmitting(false); }
  }

  const STATUS_COLOR: Record<string, string> = {
    not_submitted: colors.muted, pending: '#956112',
    approved: '#197151', rejected: '#AC3545', suspended: '#AC3545',
  };

  if (initializing) return (
    <BusinessShell activeLabel="My Business Profile">
      <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
    </BusinessShell>
  );

  return (
    <BusinessShell activeLabel="My Business Profile">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { color: colors.text }]}>Business Profile</Text>
        <Text style={[s.pageSub, { color: colors.muted }]}>
          {bizId ? 'Update your business information.' : 'Create your business listing.'}
        </Text>

        {verificationStatus !== 'not_submitted' && (
          <View style={[s.statusBanner, {
            backgroundColor: STATUS_COLOR[verificationStatus] + '15',
            borderColor: STATUS_COLOR[verificationStatus] + '40',
          }]}>
            <Text style={[s.statusText, { color: STATUS_COLOR[verificationStatus] }]}>
              Verification status: <Text style={{ fontWeight: '700' }}>{verificationStatus.replace('_', ' ')}</Text>
            </Text>
            {verificationNote && <Text style={[s.statusNote, { color: colors.muted }]}>Note: {verificationNote}</Text>}
          </View>
        )}

        {/* Business Information */}
        <View style={[s.formCard, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Business Information</Text>
          <View style={s.formGrid}>
            <View style={s.field}>
              <Text style={[s.label, { color: colors.text }]}>Business Name *</Text>
              <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: errors.name ? colors.danger : colors.border }]}
                placeholder="e.g. Dahican Surf Resort" placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
              {errors.name && <Text style={[s.error, { color: colors.danger }]}>{errors.name}</Text>}
            </View>
            <View style={s.field}>
              <Text style={[s.label, { color: colors.text }]}>Description *</Text>
              <TextInput style={[s.input, s.textarea, { backgroundColor: colors.background, color: colors.text, borderColor: errors.description ? colors.danger : colors.border }]}
                placeholder="Describe your business..." placeholderTextColor={colors.muted} value={description} onChangeText={setDescription} multiline numberOfLines={4} />
              {errors.description && <Text style={[s.error, { color: colors.danger }]}>{errors.description}</Text>}
            </View>
            <View style={s.twoCol}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={[s.label, { color: colors.text }]}>Address *</Text>
                <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: errors.address ? colors.danger : colors.border }]}
                  placeholder="Street, Barangay, Mati City" placeholderTextColor={colors.muted} value={address} onChangeText={setAddress} />
                {errors.address && <Text style={[s.error, { color: colors.danger }]}>{errors.address}</Text>}
              </View>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={[s.label, { color: colors.text }]}>Contact Number</Text>
                <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="(087) 000-0000" placeholderTextColor={colors.muted} value={contactNumber} onChangeText={setContactNumber} />
              </View>
            </View>
            <View style={s.twoCol}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={[s.label, { color: colors.text }]}>Email</Text>
                <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="business@example.com" placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} />
              </View>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={[s.label, { color: colors.text }]}>Website</Text>
                <TextInput style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="https://..." placeholderTextColor={colors.muted} value={website} onChangeText={setWebsite} />
              </View>
            </View>
            <View style={s.field}>
              <Text style={[s.label, { color: colors.text }]}>Category</Text>
              <View style={s.catGrid}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat.value}
                    style={[s.catOption, { backgroundColor: category === cat.value ? colors.primary + '20' : colors.background, borderColor: category === cat.value ? colors.primary : colors.border }]}
                    onPress={() => setCategory(cat.value)}>
                    <Text style={[s.catLabel, { color: category === cat.value ? colors.primary : colors.text }]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <View style={s.formActions}>
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={loading}>
              <Text style={[s.saveBtnText, { color: colors.onPrimary }]}>{loading ? 'Saving…' : 'Save Profile'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Place Photos */}
        <View style={[s.formCard, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Place Photos</Text>
          <Text style={[s.sectionSub, { color: colors.muted }]}>Upload photos of your resort, area, or place. These will appear on your public listing.</Text>
          {Platform.OS === 'web' && (
            <input
              ref={photoInputRef as any}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handlePhotoChange as any}
            />
          )}
          <View style={s.photoGrid}>
            {photos.map((uri, i) => (
              <View key={i} style={s.photoWrap}>
                <Image source={{ uri }} style={s.photoThumb} resizeMode="cover" />
                <TouchableOpacity style={s.photoRemove} onPress={() => removePhoto(i)}>
                  <Text style={s.photoRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[s.photoAdd, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => { if (photoInputRef.current) photoInputRef.current.click(); }}
              disabled={photoUploading}
            >
              <Text style={{ fontSize: 28, color: colors.muted }}>+</Text>
              <Text style={[s.photoAddText, { color: colors.muted }]}>{photoUploading ? 'Uploading…' : 'Add Photos'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ownership Documents */}
        <View style={[s.formCard, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Ownership Documents</Text>
          <View style={[s.docNote, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
            <Text style={[s.infoText, { color: colors.warning }]}>
              📎 Upload documents to prove you own or operate this business. Required before submitting for verification. Reviewed only by KalawGuide administrators.
            </Text>
          </View>
          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef as any}
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange as any}
            />
          )}
          {DOCUMENT_TYPES.map(dt => {
            const uploaded = documents.find(d => d.document_type === dt.value);
            return (
              <View key={dt.value} style={[s.docRow, { backgroundColor: colors.background, borderColor: uploaded ? colors.success + '60' : colors.border }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.label, { color: colors.text }]}>{dt.label}</Text>
                  <Text style={[s.docHint, { color: colors.muted }]}>{dt.hint}</Text>
                  {uploaded && <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>✅ Uploaded</Text>}
                </View>
                <View style={s.docActions}>
                  {uploaded && <Image source={{ uri: uploaded.uri }} style={s.docThumb} resizeMode="cover" />}
                  <TouchableOpacity
                    style={[s.outlineBtn, { borderColor: uploaded ? colors.border : colors.primary }]}
                    onPress={() => triggerFileUpload(dt)}
                  >
                    <Text style={[s.outlineBtnText, { color: uploaded ? colors.muted : colors.primary }]}>
                      {uploaded ? 'Replace' : 'Upload'}
                    </Text>
                  </TouchableOpacity>
                  {uploaded && (
                    <TouchableOpacity onPress={() => removeDocument(uploaded.id)}>
                      <Text style={{ color: colors.danger, fontSize: 18, paddingHorizontal: 6 }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
          {bizId && (verificationStatus === 'not_submitted' || verificationStatus === 'rejected') && (
            <TouchableOpacity style={[s.outlineBtn, { borderColor: colors.primary, alignSelf: 'flex-start' }]} onPress={handleSubmitVerification} disabled={submitting}>
              <Text style={[s.outlineBtnText, { color: colors.primary }]}>
                {submitting ? 'Submitting…' : verificationStatus === 'rejected' ? 'Resubmit for Verification' : 'Submit for Verification'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[s.infoBanner, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
          <Text style={[s.infoText, { color: colors.muted }]}>
            Your listing will only be publicly visible after administrator approval. This protects tourists from fraudulent listings.
          </Text>
        </View>
      </ScrollView>
    </BusinessShell>
  );
}

const s = StyleSheet.create({
  content: { padding: 32, gap: 24, paddingBottom: 48 },
  pageTitle: { fontSize: 24, fontWeight: '700' },
  pageSub: { fontSize: 14 },
  sectionSub: { fontSize: 13, marginTop: -8 },
  statusBanner: { padding: 14, borderRadius: 10, borderWidth: 1, gap: 4 },
  statusText: { fontSize: 14, textTransform: 'capitalize' },
  statusNote: { fontSize: 13 },
  formCard: { borderRadius: 12, padding: 24, gap: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  formGrid: { gap: 16 },
  twoCol: { flexDirection: 'row', gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  textarea: { height: 96, paddingTop: 10, textAlignVertical: 'top' },
  error: { fontSize: 12 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  catLabel: { fontSize: 13, fontWeight: '500' },
  formActions: { flexDirection: 'row', gap: 12 },
  saveBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  saveBtnText: { fontSize: 14, fontWeight: '600' },
  outlineBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  outlineBtnText: { fontSize: 14, fontWeight: '600' },
  infoBanner: { padding: 14, borderRadius: 10, borderWidth: 1 },
  infoText: { fontSize: 13, lineHeight: 20 },
  docNote: { padding: 12, borderRadius: 8, borderWidth: 1 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, borderWidth: 1.5 },
  docHint: { fontSize: 12 },
  docActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  docThumb: { width: 44, height: 44, borderRadius: 6 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap: { position: 'relative', width: 120, height: 100 },
  photoThumb: { width: 120, height: 100, borderRadius: 8 },
  photoRemove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  photoRemoveText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  photoAdd: { width: 120, height: 100, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoAddText: { fontSize: 12 },
});
