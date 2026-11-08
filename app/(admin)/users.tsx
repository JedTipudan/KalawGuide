import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TextInput, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { now } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface UserRow { id: string; email: string; display_name: string; role: string; provider: string; status: string; created_at: string; }

const ROLE_COLORS: Record<string, string> = {
  tourist: '#075C73',
  business_owner: '#197151',
  admin: '#AC3545',
};

export default function AdminUsersScreen() {
  const { colors, isDark } = useTheme();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    const db = await getDatabase();
    let query = 'SELECT id, email, display_name, role, provider, created_at FROM users';
    const params: string[] = [];
    if (search.trim()) {
      query += ' WHERE (display_name LIKE ? OR email LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s);
    }
    query += ' ORDER BY created_at DESC';
    const rows = await db.getAllAsync<UserRow>(query, params);
    setUsers(rows);
  }, [search]);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function changeRole(userId: string, currentRole: string) {
    const options = ['tourist', 'business_owner'].filter(r => r !== currentRole);
    Alert.alert('Change Role', 'Change role to:', [
      { text: 'Cancel', style: 'cancel' },
      ...options.map(role => ({
        text: role.replace('_', ' '),
        onPress: async () => {
          const db = await getDatabase();
          await db.runAsync('UPDATE users SET role=?, updated_at=? WHERE id=?', [role, now(), userId]);
          await load();
        },
      })),
    ]);
  }

  async function toggleBlock(userId: string, currentStatus: string) {
    const isBlocking = currentStatus !== 'blocked';
    Alert.alert(
      isBlocking ? 'Block User' : 'Unblock User',
      isBlocking
        ? 'Block this user? They will not be able to sign in until unblocked.'
        : 'Unblock this user? They will be able to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBlocking ? 'Block' : 'Unblock',
          style: isBlocking ? 'destructive' : 'default',
          onPress: async () => {
            const db = await getDatabase();
            await db.runAsync('UPDATE users SET status=?, updated_at=? WHERE id=?', [isBlocking ? 'blocked' : 'active', now(), userId]);
            await load();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>User Management</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search users..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No users found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const roleColor = ROLE_COLORS[item.role] ?? colors.muted;
          const blocked = item.status === 'blocked';
          const isSelf = item.id === currentUser?.id;
          return (
            <View style={[styles.card, { backgroundColor: blocked ? colors.danger + '08' : colors.surface, ...shadow }]}>
              <View style={[styles.avatar, { backgroundColor: blocked ? '#AC354520' : roleColor + '20' }]}>
                <Text style={[styles.avatarText, { color: blocked ? '#AC3545' : roleColor }]}>
                  {item.display_name[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.display_name}</Text>
                <Text style={[styles.email, { color: colors.muted }]} numberOfLines={1}>{item.email}</Text>
                <View style={styles.meta}>
                  <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                    <Text style={[styles.roleText, { color: roleColor }]}>{item.role.replace('_', ' ')}</Text>
                  </View>
                  {blocked && (
                    <View style={[styles.roleBadge, { backgroundColor: '#AC354520' }]}>
                      <Text style={[styles.roleText, { color: '#AC3545' }]}>🚫 Blocked</Text>
                    </View>
                  )}
                  <Text style={[styles.provider, { color: colors.muted }]}>
                    {item.provider === 'google' ? '🔵' : '📧'}
                  </Text>
                </View>
              </View>
              {!isSelf && item.role !== 'admin' && (
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.changeBtn, { borderColor: colors.border }]}
                    onPress={() => changeRole(item.id, item.role)}
                  >
                    <Text style={[styles.changeBtnText, { color: colors.primary }]}>Role</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.changeBtn, { borderColor: blocked ? colors.success : colors.danger }]}
                    onPress={() => toggleBlock(item.id, item.status)}
                  >
                    <Text style={[styles.changeBtnText, { color: blocked ? colors.success : colors.danger }]}>
                      {blocked ? 'Unblock' : 'Block'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.base, gap: Spacing.md },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: Radius.lg, paddingHorizontal: Spacing.base, height: 48, gap: Spacing.sm },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  cardActions: { gap: Spacing.xs },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  info: { flex: 1, gap: Spacing.xs },
  name: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  email: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  roleBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  roleText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium, textTransform: 'capitalize' },
  provider: { fontSize: 14 },
  changeBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1 },
  changeBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
});
