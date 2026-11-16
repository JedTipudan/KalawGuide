import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Radius } from '../../constants/tokens';
import { ActivityCategory, ActivityEntry, describeAction, getActivityLogs } from '../../services/admin/activityLog';

const FILTERS: { key: ActivityCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'account', label: 'Accounts' },
  { key: 'business', label: 'Businesses' },
  { key: 'content', label: 'Content' },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Shared activity feed for the mobile and web admin "Activity Logs" screens. */
export function ActivityLogView({ refreshKey = 0 }: { refreshKey?: number }) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<ActivityCategory | 'all'>('all');
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloads, setReloads] = useState(0);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    let live = true;
    getActivityLogs({ category: filter, limit: 200 })
      .then(rows => { if (live) { setLogs(rows); setState('ready'); } })
      .catch((e: unknown) => { if (live) { setErrMsg(e instanceof Error ? e.message : String(e)); setState('error'); } });
    return () => { live = false; };
  }, [filter, refreshKey, reloads]);

  const load = () => { setState('loading'); setReloads(n => n + 1); };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.chips}>
          {FILTERS.map(f => {
            const active = f.key === filter;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => { setState('loading'); setFilter(f.key); }}
                style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, { color: active ? colors.onPrimary : colors.text }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity onPress={load} style={[styles.refresh, { borderColor: colors.border }]} accessibilityRole="button">
          <Text style={[styles.refreshText, { color: colors.primary }]}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {state === 'loading' && <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />}

      {state === 'error' && (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{"Couldn't load activity"}</Text>
          {!!errMsg && <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>{errMsg}</Text>}
          <TouchableOpacity onPress={load}><Text style={[styles.refreshText, { color: colors.primary }]}>Try again</Text></TouchableOpacity>
        </View>
      )}

      {state === 'ready' && logs.length === 0 && (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No activity yet</Text>
          <Text style={[styles.emptyBody, { color: colors.muted }]}>
            Sign-ins, registrations, business verifications, price changes and admin edits appear here as they happen.
          </Text>
        </View>
      )}

      {state === 'ready' && logs.map(log => {
        const meta = describeAction(log.action);
        const who = log.user_name ?? log.user_email ?? (log.user_id === 'system' ? 'Guest / system' : 'Unknown user');
        return (
          <View key={log.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.icon}>{meta.icon}</Text>
            <View style={styles.rowBody}>
              <Text style={[styles.action, { color: colors.text }]}>
                {meta.label}{log.entity_name ? <Text style={{ color: colors.primary }}>{` · ${log.entity_name}`}</Text> : null}
              </Text>
              {!!log.details && <Text style={[styles.details, { color: colors.muted }]} numberOfLines={2}>{log.details}</Text>}
              <Text style={[styles.meta, { color: colors.muted }]}>{who} · {timeAgo(log.created_at)}</Text>
            </View>
          </View>
        );
      })}

      {state === 'ready' && logs.length > 0 && (
        <Text style={[styles.footnote, { color: colors.muted }]}>Showing the latest {logs.length} events on this device.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, minHeight: 36, justifyContent: 'center' },
  chipText: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: Typography.weight.semiBold },
  refresh: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1 },
  refreshText: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: Typography.weight.semiBold },
  row: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, alignItems: 'flex-start' },
  icon: { fontSize: 20, width: 28, textAlign: 'center' },
  rowBody: { flex: 1, gap: 2 },
  action: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  details: { fontFamily: Typography.fontFamilyBody, fontSize: 13 },
  meta: { fontFamily: Typography.fontFamilyBody, fontSize: 12 },
  empty: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl, borderRadius: Radius.md, borderWidth: 1 },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 16, fontWeight: Typography.weight.semiBold },
  emptyBody: { fontFamily: Typography.fontFamilyBody, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  footnote: { fontFamily: Typography.fontFamilyBody, fontSize: 12, textAlign: 'center', marginTop: Spacing.sm },
});
