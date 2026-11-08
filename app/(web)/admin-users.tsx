import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { AdminShell } from '../../components/web/AdminShell';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { now } from '../../utils/helpers';

interface UserRow {
  id: string; email: string; display_name: string;
  role: string; provider: string; status: string; created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  tourist: '#075C73', business_owner: '#197151', admin: '#AC3545',
};

const ROLE_FILTERS = [
  { label: 'All', value: 'all' },
  { label: '🧳 Tourist', value: 'tourist' },
  { label: '🏪 Business', value: 'business_owner' },
  { label: '🛡 Admin', value: 'admin' },
  { label: '🚫 Blocked', value: 'blocked' },
];

export default function WebAdminUsersScreen() {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      let query = 'SELECT id, email, display_name, role, provider, status, created_at FROM users WHERE 1=1';
      const params: string[] = [];

      if (roleFilter === 'blocked') {
        query += " AND status = 'blocked'";
      } else if (roleFilter !== 'all') {
        query += ' AND role = ?';
        params.push(roleFilter);
      }
      if (search.trim()) {
        query += ' AND (display_name LIKE ? OR email LIKE ?)';
        const s = `%${search.trim()}%`;
        params.push(s, s);
      }
      query += ' ORDER BY created_at DESC';
      setUsers(await db.getAllAsync<UserRow>(query, params));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);
  function onRefresh() { setRefreshing(true); load(); }

  async function changeRole(userId: string, currentRole: string) {
    const options = ['tourist', 'business_owner'].filter(r => r !== currentRole);
    const chosen = options.length === 1
      ? options[0]
      : window.confirm(`Change role to "business_owner"? Click Cancel to set as "tourist".`)
        ? 'business_owner'
        : 'tourist';
    const db = await getDatabase();
    await db.runAsync('UPDATE users SET role=?, updated_at=? WHERE id=?', [chosen, now(), userId]);
    await load();
  }

  async function toggleBlock(userId: string, currentStatus: string) {
    const isBlocking = currentStatus !== 'blocked';
    const msg = isBlocking
      ? 'Block this user? They will not be able to sign in until unblocked.'
      : 'Unblock this user? They will be able to sign in again.';
    if (!window.confirm(msg)) return;
    const newStatus = isBlocking ? 'blocked' : 'active';
    const db = await getDatabase();
    await db.runAsync('UPDATE users SET status=?, updated_at=? WHERE id=?', [newStatus, now(), userId]);
    await load();
  }

  const isBlocked = (u: UserRow) => u.status === 'blocked';

  return (
    <AdminShell activeLabel="User Management">
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={s.pageHeader}>
          <View>
            <Text style={[s.pageTitle, { color: colors.text }]}>User Management</Text>
            <Text style={[s.pageSub, { color: colors.muted }]}>
              Manage roles and restrict accounts to keep the platform safe for tourists.
            </Text>
          </View>
        </View>

        {/* Search + filters */}
        <View style={s.toolbar}>
          <TextInput
            style={[s.search, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Search by name or email..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
          <View style={s.filterRow}>
            {ROLE_FILTERS.map(f => (
              <TouchableOpacity
                key={f.value}
                style={[s.chip, {
                  backgroundColor: roleFilter === f.value ? colors.primary : colors.surface,
                  borderColor: roleFilter === f.value ? colors.primary : colors.border,
                }]}
                onPress={() => setRoleFilter(f.value)}
              >
                <Text style={[s.chipText, { color: roleFilter === f.value ? colors.onPrimary : colors.text }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Safety notice */}
        <View style={[s.noticeBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
          <Text style={[s.noticeText, { color: colors.warning }]}>
            🛡 Blocking a user prevents them from signing in. Use this to protect tourists from scam accounts or fraudulent business listings.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : users.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>👥</Text>
            <Text style={[s.emptyText, { color: colors.muted }]}>No users found.</Text>
          </View>
        ) : (
          <View style={[s.table, { borderColor: colors.border }]}>
            {/* Header */}
            <View style={[s.tableHeader, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
              {['User', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                <Text key={h} style={[s.th, { color: colors.muted }, h === 'User' && { flex: 2 }]}>{h}</Text>
              ))}
            </View>

            {users.map(u => {
              const roleColor = ROLE_COLORS[u.role] ?? colors.muted;
              const blocked = isBlocked(u);
              const isSelf = u.id === currentUser?.id;
              return (
                <View key={u.id} style={[s.row, { borderColor: colors.border, backgroundColor: blocked ? colors.danger + '08' : colors.surface }]}>
                  {/* User */}
                  <View style={[s.cell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                    <View style={[s.avatar, { backgroundColor: blocked ? '#AC354520' : roleColor + '20' }]}>
                      <Text style={[s.avatarText, { color: blocked ? '#AC3545' : roleColor }]}>
                        {u.display_name[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.userName, { color: blocked ? colors.muted : colors.text }]} numberOfLines={1}>
                        {u.display_name}{isSelf ? ' (you)' : ''}
                      </Text>
                      <Text style={[s.userMeta, { color: colors.muted }]}>
                        {u.provider === 'google' ? '🔵 Google' : '📧 Email'}
                      </Text>
                    </View>
                  </View>

                  {/* Email */}
                  <Text style={[s.cell, s.cellText, { color: colors.muted }]} numberOfLines={1}>{u.email}</Text>

                  {/* Role */}
                  <View style={s.cell}>
                    <View style={[s.badge, { backgroundColor: roleColor + '20' }]}>
                      <Text style={[s.badgeText, { color: roleColor }]}>{u.role.replace('_', ' ')}</Text>
                    </View>
                  </View>

                  {/* Status */}
                  <View style={s.cell}>
                    {blocked
                      ? <View style={[s.badge, { backgroundColor: '#AC354520' }]}><Text style={[s.badgeText, { color: '#AC3545' }]}>🚫 Blocked</Text></View>
                      : <View style={[s.badge, { backgroundColor: '#19715120' }]}><Text style={[s.badgeText, { color: '#197151' }]}>✅ Active</Text></View>
                    }
                  </View>

                  {/* Actions */}
                  <View style={[s.cell, s.actions]}>
                    {!isSelf && u.role !== 'admin' && (
                      <>
                        <TouchableOpacity
                          style={[s.actionBtn, { borderColor: colors.border }]}
                          onPress={() => changeRole(u.id, u.role)}
                        >
                          <Text style={[s.actionText, { color: colors.primary }]}>🔄 Role</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.actionBtn, blocked
                            ? { borderColor: '#19715160', backgroundColor: '#19715110' }
                            : { borderColor: '#AC354560', backgroundColor: '#AC354510' }
                          ]}
                          onPress={() => toggleBlock(u.id, u.status)}
                        >
                          <Text style={[s.actionText, { color: blocked ? '#197151' : '#AC3545' }]}>
                            {blocked ? '✅ Unblock' : '🚫 Block'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {isSelf && (
                      <Text style={[s.selfNote, { color: colors.muted }]}>Current session</Text>
                    )}
                    {u.role === 'admin' && !isSelf && (
                      <Text style={[s.selfNote, { color: colors.muted }]}>Admin protected</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  content: { padding: 32, gap: 20, paddingBottom: 48 },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pageTitle: { fontSize: 24, fontWeight: '700' },
  pageSub: { fontSize: 14, marginTop: 4, maxWidth: 560 },
  toolbar: { gap: 10 },
  search: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  noticeBanner: { padding: 14, borderRadius: 10, borderWidth: 1 },
  noticeText: { fontSize: 13, lineHeight: 20 },
  empty: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15 },
  table: { borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  th: { flex: 1, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, alignItems: 'center' },
  cell: { flex: 1, paddingRight: 8 },
  cellText: { fontSize: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
  userName: { fontSize: 14, fontWeight: '600' },
  userMeta: { fontSize: 12, marginTop: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: '600' },
  selfNote: { fontSize: 12, fontStyle: 'italic' },
});
