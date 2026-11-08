import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AdminShell } from '../../components/web/AdminShell';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';
import { formatShortDate } from '../../utils/helpers';

interface LogEntry {
  id: string; action: string; entity_type: string; entity_name: string | null;
  details: string | null; created_at: string; user_email: string | null;
}

const ACTION_ICONS: Record<string, string> = {
  submitted_for_approval: '📤', approved: '✅', rejected: '❌',
  suspended: '⛔', price_approved: '💰', price_rejected: '💸',
  listing_created: '🏪', listing_updated: '✏️', photo_uploaded: '📷',
  featured_changed: '⭐', price_added: '💰',
};

export default function WebAdminActivityLogsScreen() {
  const { colors } = useTheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<LogEntry>(`
        SELECT al.id, al.action, al.entity_type, al.entity_name, al.details, al.created_at,
               u.email as user_email
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC LIMIT 200
      `);
      setLogs(rows);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminShell activeLabel="Activity Logs">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.pageHeader}>
          <Text style={[s.pageTitle, { color: colors.text }]}>Activity Logs</Text>
          <TouchableOpacity style={[s.refreshBtn, { borderColor: colors.border }]} onPress={load}>
            <Text style={[s.refreshBtnText, { color: colors.primary }]}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>
        <Text style={[s.pageSub, { color: colors.muted }]}>Platform-wide activity and system events (last 200).</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : logs.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={[s.emptyText, { color: colors.muted }]}>No activity yet</Text>
          </View>
        ) : (
          <View style={[s.table, { borderColor: colors.border }]}>
            <View style={[s.tableHeader, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
              {['', 'Action', 'Entity', 'Details', 'User', 'Time'].map((h, i) => (
                <Text key={i} style={[s.th, { color: colors.muted }, i === 0 && { flex: 0, width: 36 }, i === 3 && { flex: 2 }]}>{h}</Text>
              ))}
            </View>
            {logs.map(log => (
              <View key={log.id} style={[s.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[s.cell, { flex: 0, width: 36, fontSize: 16 }]}>{ACTION_ICONS[log.action] ?? '📝'}</Text>
                <Text style={[s.cell, s.cellText, { color: colors.text }]} numberOfLines={1}>
                  {log.action.replace(/_/g, ' ')}
                </Text>
                <Text style={[s.cell, s.cellText, { color: colors.muted }]} numberOfLines={1}>
                  {log.entity_name ?? log.entity_type}
                </Text>
                <Text style={[s.cell, s.cellText, { color: colors.muted, flex: 2 }]} numberOfLines={2}>
                  {log.details ?? '—'}
                </Text>
                <Text style={[s.cell, s.cellText, { color: colors.muted }]} numberOfLines={1}>
                  {log.user_email ?? '—'}
                </Text>
                <Text style={[s.cell, s.cellText, { color: colors.muted }]} numberOfLines={1}>
                  {formatShortDate(log.created_at)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  content: { padding: 32, gap: 16, paddingBottom: 48 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontSize: 24, fontWeight: '700' },
  refreshBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  refreshBtnText: { fontSize: 13, fontWeight: '600' },
  pageSub: { fontSize: 14, marginTop: -8 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 16 },
  table: { borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  th: { flex: 1, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, alignItems: 'center' },
  cell: { flex: 1, paddingRight: 8 },
  cellText: { fontSize: 13 },
});
