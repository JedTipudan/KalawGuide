import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';
import { now, generateId } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';
import { BusinessVerificationStatus } from '../../types';

interface BizRow {
  id: string; name: string; category: string; address: string;
  verification_status: BusinessVerificationStatus;
  owner_name: string | null; owner_email: string | null;
  created_at: string;
}

interface RevisionRow {
  id: string; business_id: string; business_name: string;
  field_name: string; old_value: string | null; new_value: string;
  submitted_by_email: string | null; created_at: string;
}

type Tab = 'businesses' | 'revisions';

const STATUS_COLORS: Record<BusinessVerificationStatus, string> = {
  not_submitted: '#57717A', pending: '#956112', approved: '#197151',
  rejected: '#AC3545', suspended: '#AC3545',
};

const FILTERS: { label: string; value: BusinessVerificationStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: '⏳ Pending', value: 'pending' },
  { label: '✅ Approved', value: 'approved' },
  { label: '❌ Rejected', value: 'rejected' },
  { label: '⛔ Suspended', value: 'suspended' },
];

export default function AdminBusinessesScreen() {
  const { colors, isDark } = useTheme();
  const [tab, setTab] = useState<Tab>('businesses');
  const [businesses, setBusinesses] = useState<BizRow[]>([]);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [filter, setFilter] = useState<BusinessVerificationStatus | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    const db = await getDatabase();
    let query = `
      SELECT b.id, b.name, b.category, b.address, b.verification_status, b.created_at,
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
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

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
        ? `Your price change for "${rev.business_name}" has been approved and is now live.`
        : `Your price change for "${rev.business_name}" was not approved.`;
      await db.runAsync(
        'INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [generateId(), biz.owner_id, 'listing', title, body, now()]
      );
      await db.runAsync(
        'INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, entity_name, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [generateId(), biz.owner_id, approved ? 'price_approved' : 'price_rejected', 'business', rev.business_id, rev.business_name, rev.new_value, now()]
      );
    }
    await load();
  }

  function handleApprove(id: string) {
    Alert.alert('Approve Business', 'Approve this listing? It will become publicly visible.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => updateStatus(id, 'approved') },
    ]);
  }

  function handleReject(id: string) {
    Alert.prompt('Reject Business', 'Provide a reason for rejection (optional):', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: (note) => updateStatus(id, 'rejected', note) },
    ], 'plain-text');
  }

  function handleSuspend(id: string) {
    Alert.alert('Suspend Business', 'Suspend this business? It will be hidden from tourists.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: () => updateStatus(id, 'suspended') },
    ]);
  }

  function handleActivate(id: string) {
    Alert.alert('Reactivate Business', 'Reactivate this business listing?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reactivate', onPress: () => updateStatus(id, 'approved') },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Business Verification</Text>

        {/* Tab switcher */}
        <View style={[styles.tabRow, { backgroundColor: colors.subtle }]}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'businesses' && { backgroundColor: colors.surface }]}
            onPress={() => setTab('businesses')}
          >
            <Text style={[styles.tabLabel, { color: tab === 'businesses' ? colors.primary : colors.muted }]}>
              🏪 Businesses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'revisions' && { backgroundColor: colors.surface }]}
            onPress={() => setTab('revisions')}
          >
            <Text style={[styles.tabLabel, { color: tab === 'revisions' ? colors.primary : colors.muted }]}>
              🔄 Price Revisions {revisions.length > 0 ? `(${revisions.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'businesses' && (
          <>
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search businesses..." placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} />
            </View>
            <View style={styles.filterRow}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f.value}
                  style={[styles.filterChip, { backgroundColor: filter === f.value ? colors.primary : colors.surface, borderColor: filter === f.value ? colors.primary : colors.border }]}
                  onPress={() => setFilter(f.value)}
                >
                  <Text style={[styles.filterLabel, { color: filter === f.value ? colors.onPrimary : colors.text }]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      {tab === 'businesses' ? (
        <FlatList
          data={businesses}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏪</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No businesses found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusColor = STATUS_COLORS[item.verification_status];
            return (
              <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.bizName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.bizCategory, { color: colors.muted }]}>{item.category.replace('_', ' ')} · {item.address}</Text>
                    {item.owner_name && <Text style={[styles.ownerName, { color: colors.muted }]}>👤 {item.owner_name}</Text>}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{item.verification_status.replace('_', ' ')}</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  {item.verification_status === 'pending' && (
                    <>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success + '20', borderColor: colors.success }]} onPress={() => handleApprove(item.id)}>
                        <Text style={[styles.actionText, { color: colors.success }]}>✅ Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]} onPress={() => handleReject(item.id)}>
                        <Text style={[styles.actionText, { color: colors.danger }]}>❌ Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {item.verification_status === 'approved' && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]} onPress={() => handleSuspend(item.id)}>
                      <Text style={[styles.actionText, { color: colors.warning }]}>⛔ Suspend</Text>
                    </TouchableOpacity>
                  )}
                  {(item.verification_status === 'rejected' || item.verification_status === 'suspended') && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success + '20', borderColor: colors.success }]} onPress={() => handleActivate(item.id)}>
                      <Text style={[styles.actionText, { color: colors.success }]}>✅ Reactivate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {revisions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔄</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No pending revisions</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Price change requests from business owners will appear here.</Text>
            </View>
          ) : (
            revisions.map(rev => (
              <View key={rev.id} style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
                <Text style={[styles.bizName, { color: colors.text }]}>{rev.business_name}</Text>
                <Text style={[styles.bizCategory, { color: colors.muted }]}>Field: {rev.field_name.replace('_', ' ')}</Text>
                {rev.submitted_by_email && <Text style={[styles.ownerName, { color: colors.muted }]}>👤 {rev.submitted_by_email}</Text>}
                <View style={[styles.revisionChange, { backgroundColor: colors.subtle }]}>
                  {rev.old_value && (
                    <Text style={[styles.revisionOld, { color: colors.danger }]}>Before: {rev.old_value}</Text>
                  )}
                  <Text style={[styles.revisionNew, { color: colors.success }]}>After: {rev.new_value}</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success + '20', borderColor: colors.success }]} onPress={() => reviewRevision(rev.id, true)}>
                    <Text style={[styles.actionText, { color: colors.success }]}>✅ Approve Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]} onPress={() => reviewRevision(rev.id, false)}>
                    <Text style={[styles.actionText, { color: colors.danger }]}>❌ Reject Change</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.base, gap: Spacing.md },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  tabRow: { flexDirection: 'row', borderRadius: Radius.lg, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center' },
  tabLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: Radius.lg, paddingHorizontal: Spacing.base, height: 48, gap: Spacing.sm },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.xl, borderWidth: 1.5 },
  filterLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },
  card: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  cardTop: { flexDirection: 'row', gap: Spacing.md },
  cardInfo: { flex: 1, gap: Spacing.xs },
  bizName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  bizCategory: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textTransform: 'capitalize' },
  ownerName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm, alignSelf: 'flex-start' },
  statusText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.semiBold, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1 },
  actionText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  revisionChange: { borderRadius: Radius.sm, padding: Spacing.md, gap: Spacing.xs },
  revisionOld: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  revisionNew: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  emptySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center', maxWidth: 280 },
});
