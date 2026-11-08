import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';
import { now, generateId } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface BizRow {
  id: string; name: string; category: string; address: string;
  verification_status: string; verification_note: string | null; updated_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  not_submitted: { label: 'Draft',            color: '#57717A', icon: '📝' },
  pending:       { label: 'Pending Approval', color: '#956112', icon: '⏳' },
  approved:      { label: 'Published',        color: '#197151', icon: '✅' },
  rejected:      { label: 'Rejected',         color: '#AC3545', icon: '❌' },
  suspended:     { label: 'Suspended',        color: '#AC3545', icon: '⛔' },
};

export default function BusinessListingsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<BizRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const rows = await db.getAllAsync<BizRow>(
      `SELECT id, name, category, address, verification_status, verification_note, updated_at
       FROM businesses WHERE owner_id = ? ORDER BY updated_at DESC`,
      [user.id]
    );
    setListings(rows);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function submitForApproval(id: string) {
    Alert.alert('Submit for Approval', 'Submit this listing for administrator review?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', onPress: async () => {
        const db = await getDatabase();
        await db.runAsync(`UPDATE businesses SET verification_status='pending', updated_at=? WHERE id=?`, [now(), id]);
        await db.runAsync(
          `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, created_at) VALUES (?,?,?,?,?,?,?)`,
          [generateId(), user!.id, 'submitted_for_approval', 'business', id, 'Submitted for admin review', now()]
        );
        await load();
      }},
    ]);
  }

  async function deleteDraft(id: string) {
    Alert.alert('Delete Draft', 'Remove this draft?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const db = await getDatabase();
        await db.runAsync(`DELETE FROM businesses WHERE id=? AND verification_status='not_submitted'`, [id]);
        await load();
      }},
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>My Listings</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{listings.length} listing{listings.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No listings yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Create your business profile first, then submit it for approval.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.verification_status] ?? STATUS_CONFIG.not_submitted;
          return (
            <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
              <Text style={[styles.bizName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.bizMeta, { color: colors.muted }]}>{item.category.replace('_', ' ')} · {item.address}</Text>
              <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.icon} {cfg.label}</Text>
              </View>
              {item.verification_note ? (
                <Text style={[styles.note, { color: colors.danger }]}>Admin note: {item.verification_note}</Text>
              ) : null}
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.primary }]} onPress={() => router.push('/(business)/profile' as any)}>
                  <Text style={[styles.actionText, { color: colors.primary }]}>✏️ Edit</Text>
                </TouchableOpacity>
                {(item.verification_status === 'not_submitted' || item.verification_status === 'rejected') && (
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.success }]} onPress={() => submitForApproval(item.id)}>
                    <Text style={[styles.actionText, { color: colors.success }]}>📤 Submit</Text>
                  </TouchableOpacity>
                )}
                {item.verification_status === 'not_submitted' && (
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.danger }]} onPress={() => deleteDraft(item.id)}>
                    <Text style={[styles.actionText, { color: colors.danger }]}>🗑 Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },
  card: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.sm },
  bizName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  bizMeta: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textTransform: 'capitalize' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  statusText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.semiBold },
  note: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', paddingTop: Spacing.xs },
  actionBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1 },
  actionText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  emptySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center', maxWidth: 280 },
});
