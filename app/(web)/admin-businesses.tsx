import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { AdminShell } from '../../components/web/AdminShell';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';
import { BusinessVerificationStatus } from '../../types';

interface BizRow {
  id: string; name: string; category: string; address: string;
  verification_status: BusinessVerificationStatus;
  owner_name: string | null; owner_email: string | null;
  created_at: string; verification_note: string | null;
}

const STATUS_COLORS: Record<BusinessVerificationStatus, string> = {
  not_submitted: '#57717A', pending: '#956112', approved: '#197151',
  rejected: '#AC3545', suspended: '#AC3545',
};

interface RevisionRow {
  id: string; business_id: string; business_name: string;
  field_name: string; old_value: string | null; new_value: string;
  submitted_by_email: string | null; created_at: string;
}

interface DocRow {
  id: string; business_id: string; business_name: string; owner_name: string | null;
  document_type: string; label: string; uri: string; uploaded_at: string;
}

type AdminTab = 'businesses' | 'revisions' | 'documents';

const FILTERS: { label: string; value: BusinessVerificationStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: '⏳ Pending', value: 'pending' },
  { label: '✅ Approved', value: 'approved' },
  { label: '❌ Rejected', value: 'rejected' },
  { label: '⛔ Suspended', value: 'suspended' },
];

export default function WebAdminBusinessesScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<AdminTab>('businesses');
  const [businesses, setBusinesses] = useState<BizRow[]>([]);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocRow | null>(null);
  const [filter, setFilter] = useState<BusinessVerificationStatus | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      let query = `
        SELECT b.id, b.name, b.category, b.address, b.verification_status, b.verification_note, b.created_at,
               u.display_name as owner_name, u.email as owner_email
        FROM businesses b LEFT JOIN users u ON b.owner_id = u.id WHERE 1=1
      `;
      const params: string[] = [];
      if (filter !== 'all') { query += ' AND b.verification_status = ?'; params.push(filter); }
      if (search.trim()) {
        query += ' AND (b.name LIKE ? OR b.address LIKE ?)';
        const s = `%${search.trim()}%`; params.push(s, s);
      }
      query += ' ORDER BY b.created_at DESC';
      setBusinesses(await db.getAllAsync<BizRow>(query, params));

      const revRows = await db.getAllAsync<RevisionRow>(`
        SELECT lr.id, lr.business_id, b.name as business_name,
               lr.field_name, lr.old_value, lr.new_value,
               u.email as submitted_by_email, lr.created_at
        FROM listing_revisions lr
        JOIN businesses b ON lr.business_id = b.id
        LEFT JOIN users u ON lr.submitted_by = u.id
        WHERE lr.status = 'pending'
        ORDER BY lr.created_at DESC
      `);
      setRevisions(revRows);

      const docRows = await db.getAllAsync<DocRow>(`
        SELECT bd.id, bd.business_id, b.name as business_name, u.display_name as owner_name,
               bd.document_type, bd.label, bd.uri, bd.uploaded_at
        FROM business_documents bd
        JOIN businesses b ON bd.business_id = b.id
        LEFT JOIN users u ON b.owner_id = u.id
        ORDER BY bd.uploaded_at DESC
      `);
      setDocuments(docRows);
    } finally { setLoading(false); }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: BusinessVerificationStatus, note?: string) {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE businesses SET verification_status=?, verification_note=?, updated_at=? WHERE id=?',
      [status, note ?? null, now(), id]
    );
    const biz = await db.getFirstAsync<{ owner_id: string; name: string }>(
      'SELECT owner_id, name FROM businesses WHERE id = ?', [id]
    );
    if (biz) {
      const notifMap: Record<string, { title: string; body: string }> = {
        approved: { title: 'Listing Approved ✅', body: `Your listing "${biz.name}" has been approved and is now publicly visible.` },
        rejected: { title: 'Listing Rejected ❌', body: `Your listing "${biz.name}" was rejected. Reason: ${note ?? 'No reason provided.'}` },
        suspended: { title: 'Listing Suspended ⛔', body: `Your listing "${biz.name}" has been suspended by an administrator.` },
      };
      const notif = notifMap[status];
      if (notif) {
        await db.runAsync(
          'INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
          [generateId(), biz.owner_id, 'listing', notif.title, notif.body, now()]
        );
        await db.runAsync(
          'INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, entity_name, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [generateId(), biz.owner_id, status, 'business', id, biz.name, note ?? null, now()]
        );
      }
    }
    await load();
  }

  async function reviewRevision(id: string, approved: boolean) {
    const db = await getDatabase();
    const rev = revisions.find(r => r.id === id);
    if (!rev) return;
    await db.runAsync(
      "UPDATE listing_revisions SET status=?, reviewed_at=? WHERE id=?",
      [approved ? 'approved' : 'rejected', now(), id]
    );
    const biz = await db.getFirstAsync<{ owner_id: string }>('SELECT owner_id FROM businesses WHERE id = ?', [rev.business_id]);
    if (biz) {
      const title = approved ? 'Price Update Approved ✅' : 'Price Update Rejected ❌';
      const body = approved
        ? `Your price change for "${rev.business_name}" has been approved.`
        : `Your price change for "${rev.business_name}" was not approved.`;
      await db.runAsync(
        'INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [generateId(), biz.owner_id, 'listing', title, body, now()]
      );
    }
    await load();
  }

  function handleApprove(id: string) {
    if (window.confirm('Approve this business listing? It will become publicly visible.'))
      updateStatus(id, 'approved');
  }

  function handleReject(id: string) {
    const note = window.prompt('Provide a reason for rejection (optional):') ?? undefined;
    if (note !== null) updateStatus(id, 'rejected', note || undefined);
  }

  function handleSuspend(id: string) {
    if (window.confirm('Suspend this business? It will be hidden from tourists.'))
      updateStatus(id, 'suspended');
  }

  function handleReactivate(id: string) {
    if (window.confirm('Reactivate this business listing?'))
      updateStatus(id, 'approved');
  }

  return (
    <AdminShell activeLabel="Business Verification">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.workspace}>
        <Text style={[s.pageTitle, { color: colors.text }]}>Business Verification</Text>

        {/* Tab switcher */}
        <View style={[s.tabRow, { borderColor: colors.border }]}>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'businesses' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab('businesses')}
          >
            <Text style={[s.tabText, { color: tab === 'businesses' ? colors.primary : colors.muted }]}>🏪 Businesses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'documents' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab('documents')}
          >
            <Text style={[s.tabText, { color: tab === 'documents' ? colors.primary : colors.muted }]}>
              📎 Ownership Documents {documents.length > 0 ? `(${documents.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'revisions' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab('revisions')}
          >
            <Text style={[s.tabText, { color: tab === 'revisions' ? colors.primary : colors.muted }]}>
              🔄 Price Revisions {revisions.length > 0 ? `(${revisions.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'businesses' ? (
          <>
            {/* Search + filters */}
            <View style={s.toolbar}>
              <TextInput
                style={[s.search, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Search businesses..."
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={setSearch}
              />
              <View style={s.filterRow}>
                {FILTERS.map(f => (
                  <TouchableOpacity
                    key={f.value}
                    style={[s.chip, { backgroundColor: filter === f.value ? colors.primary : colors.surface, borderColor: filter === f.value ? colors.primary : colors.border }]}
                    onPress={() => setFilter(f.value)}
                  >
                    <Text style={[s.chipText, { color: filter === f.value ? colors.onPrimary : colors.text }]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : businesses.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>🏪</Text>
                <Text style={[s.emptyText, { color: colors.muted }]}>No businesses found</Text>
              </View>
            ) : (
              <View style={[s.table, { borderColor: colors.border }]}>
                <View style={[s.tableHeader, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
                  {['Business', 'Category', 'Owner', 'Status', 'Actions'].map(h => (
                    <Text key={h} style={[s.th, { color: colors.muted }, h === 'Business' && { flex: 2 }]}>{h}</Text>
                  ))}
                </View>
                {businesses.map(item => {
                  const sc = STATUS_COLORS[item.verification_status];
                  return (
                    <View key={item.id} style={[s.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                      <View style={[s.cell, { flex: 2 }]}>
                        <Text style={[s.bizName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[s.bizAddr, { color: colors.muted }]} numberOfLines={1}>{item.address}</Text>
                      </View>
                      <Text style={[s.cell, s.cellText, { color: colors.text }]}>{item.category.replace('_', ' ')}</Text>
                      <View style={s.cell}>
                        <Text style={[s.cellText, { color: colors.text }]} numberOfLines={1}>{item.owner_name ?? '—'}</Text>
                        <Text style={[s.bizAddr, { color: colors.muted }]} numberOfLines={1}>{item.owner_email ?? ''}</Text>
                      </View>
                      <View style={s.cell}>
                        <View style={[s.badge, { backgroundColor: sc + '20' }]}>
                          <Text style={[s.badgeText, { color: sc }]}>{item.verification_status.replace('_', ' ')}</Text>
                        </View>
                      </View>
                      <View style={[s.cell, s.actions]}>
                        {item.verification_status === 'pending' && (
                          <>
                            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#19715120', borderColor: '#197151' }]} onPress={() => handleApprove(item.id)}>
                              <Text style={[s.actionText, { color: '#197151' }]}>✅ Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#AC354520', borderColor: '#AC3545' }]} onPress={() => handleReject(item.id)}>
                              <Text style={[s.actionText, { color: '#AC3545' }]}>❌ Reject</Text>
                            </TouchableOpacity>
                          </>
                        )}
                        {item.verification_status === 'approved' && (
                          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#95611220', borderColor: '#956112' }]} onPress={() => handleSuspend(item.id)}>
                            <Text style={[s.actionText, { color: '#956112' }]}>⛔ Suspend</Text>
                          </TouchableOpacity>
                        )}
                        {(item.verification_status === 'rejected' || item.verification_status === 'suspended') && (
                          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#19715120', borderColor: '#197151' }]} onPress={() => handleReactivate(item.id)}>
                            <Text style={[s.actionText, { color: '#197151' }]}>✅ Reactivate</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : tab === 'documents' ? (
          /* Ownership Documents tab */
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : documents.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📎</Text>
              <Text style={[s.emptyText, { color: colors.muted }]}>No documents uploaded yet</Text>
              <Text style={[s.emptySubText, { color: colors.muted }]}>Business owners upload ownership documents from their Business Profile page.</Text>
            </View>
          ) : (
            <View style={[s.table, { borderColor: colors.border }]}>
              <View style={[s.tableHeader, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
                {['Business', 'Owner', 'Document', 'Preview', 'Uploaded'].map(h => (
                  <Text key={h} style={[s.th, { color: colors.muted }, h === 'Business' && { flex: 2 }]}>{h}</Text>
                ))}
              </View>
              {documents.map(doc => (
                <View key={doc.id} style={[s.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <View style={[s.cell, { flex: 2 }]}>
                    <Text style={[s.bizName, { color: colors.text }]} numberOfLines={1}>{doc.business_name}</Text>
                  </View>
                  <Text style={[s.cell, s.cellText, { color: colors.text }]} numberOfLines={1}>{doc.owner_name ?? '—'}</Text>
                  <Text style={[s.cell, s.cellText, { color: colors.muted }]}>{doc.label}</Text>
                  <View style={s.cell}>
                    <TouchableOpacity onPress={() => setSelectedDoc(doc)} style={s.previewBtn}>
                      <Image source={{ uri: doc.uri }} style={s.docThumb} resizeMode="cover" />
                      <Text style={[s.viewLink, { color: colors.primary }]}>View Full</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[s.cell, s.cellText, { color: colors.muted }]} numberOfLines={1}>
                    {doc.uploaded_at.slice(0, 10)}
                  </Text>
                </View>
              ))}
            </View>
          )
        ) : (
          /* Revisions tab */
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : revisions.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🔄</Text>
              <Text style={[s.emptyText, { color: colors.muted }]}>No pending price revisions</Text>
            </View>
          ) : (
            <View style={[s.table, { borderColor: colors.border }]}>
              <View style={[s.tableHeader, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
                {['Business', 'Field', 'Before', 'After', 'Submitted By', 'Actions'].map(h => (
                  <Text key={h} style={[s.th, { color: colors.muted }]}>{h}</Text>
                ))}
              </View>
              {revisions.map(rev => (
                <View key={rev.id} style={[s.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Text style={[s.cell, s.cellText, { color: colors.text }]} numberOfLines={1}>{rev.business_name}</Text>
                  <Text style={[s.cell, s.cellText, { color: colors.muted }]}>{rev.field_name}</Text>
                  <Text style={[s.cell, s.cellText, { color: colors.danger }]} numberOfLines={2}>{rev.old_value ?? '—'}</Text>
                  <Text style={[s.cell, s.cellText, { color: colors.success }]} numberOfLines={2}>{rev.new_value}</Text>
                  <Text style={[s.cell, s.cellText, { color: colors.muted }]} numberOfLines={1}>{rev.submitted_by_email ?? '—'}</Text>
                  <View style={[s.cell, s.actions]}>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#19715120', borderColor: '#197151' }]} onPress={() => reviewRevision(rev.id, true)}>
                      <Text style={[s.actionText, { color: '#197151' }]}>✅ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#AC354520', borderColor: '#AC3545' }]} onPress={() => reviewRevision(rev.id, false)}>
                      <Text style={[s.actionText, { color: '#AC3545' }]}>❌ Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>

      {/* Document lightbox */}
      {selectedDoc && (
        <TouchableOpacity
          style={s.lightboxOverlay}
          activeOpacity={1}
          onPress={() => setSelectedDoc(null)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[s.lightboxCard, { backgroundColor: colors.surface }]}>
            <Text style={[s.lightboxTitle, { color: colors.text }]}>{selectedDoc.label}</Text>
            <Text style={[s.lightboxSub, { color: colors.muted }]}>{selectedDoc.business_name} · {selectedDoc.owner_name ?? '—'}</Text>
            <Image source={{ uri: selectedDoc.uri }} style={s.lightboxImg} resizeMode="contain" />
            <TouchableOpacity
              style={[s.lightboxClose, { backgroundColor: colors.primary }]}
              onPress={() => setSelectedDoc(null)}
            >
              <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 14 }}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </AdminShell>
  );
}

const s = StyleSheet.create({
  workspace: { padding: 32, gap: 24 },
  pageTitle: { fontSize: 24, fontWeight: '700' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, gap: 0 },
  tabBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  tabText: { fontSize: 14, fontWeight: '600' },
  toolbar: { gap: 12 },
  search: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 16 },
  emptySubText: { fontSize: 13, textAlign: 'center', maxWidth: 360 },
  table: { borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  th: { flex: 1, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, alignItems: 'center' },
  cell: { flex: 1, paddingRight: 8 },
  cellText: { fontSize: 14 },
  bizName: { fontSize: 14, fontWeight: '600' },
  bizAddr: { fontSize: 12, marginTop: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: '600' },
  previewBtn: { gap: 4, alignItems: 'flex-start' },
  docThumb: { width: 56, height: 56, borderRadius: 6 },
  viewLink: { fontSize: 12, fontWeight: '600' },
  lightboxOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
  } as any,
  lightboxCard: {
    width: 560, maxWidth: '90%' as any, borderRadius: 16,
    padding: 28, gap: 12, alignItems: 'center',
  },
  lightboxTitle: { fontSize: 18, fontWeight: '700' },
  lightboxSub: { fontSize: 13 },
  lightboxImg: { width: 480, height: 360, maxWidth: '100%' as any, borderRadius: 8 },
  lightboxClose: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
});
