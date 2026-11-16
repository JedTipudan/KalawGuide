import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Radius } from '../../constants/tokens';
import { getReport, PERIOD_LABELS, RankedItem, Report, ReportPeriod } from '../../services/admin/reportsService';

const PERIODS: ReportPeriod[] = ['7d', '30d', 'all'];

function Ranked({ title, items, empty }: { title: string; items: RankedItem[]; empty: string }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...items.map(i => i.count));
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      {items.length === 0 ? (
        <Text style={[styles.muted, { color: colors.muted }]}>{empty}</Text>
      ) : items.map(i => (
        <View key={i.name} style={styles.barRow}>
          <View style={styles.barLabelRow}>
            <Text style={[styles.barLabel, { color: colors.text }]} numberOfLines={1}>{i.name.replace(/_/g, ' ')}</Text>
            <Text style={[styles.barValue, { color: colors.muted }]}>{i.count}</Text>
          </View>
          <View style={[styles.barTrack, { backgroundColor: colors.subtle }]}>
            <View style={[styles.barFill, { width: `${(i.count / max) * 100}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Shared Reports & Analytics body for the mobile and web admin screens. */
export function ReportView({ refreshKey = 0 }: { refreshKey?: number }) {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<ReportPeriod>('30d');
  const [report, setReport] = useState<Report | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloads, setReloads] = useState(0);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    let live = true;
    getReport(period)
      .then(r => { if (live) { setReport(r); setState('ready'); } })
      .catch((e: unknown) => { if (live) { setErrMsg(e instanceof Error ? e.message : String(e)); setState('error'); } });
    return () => { live = false; };
  }, [period, refreshKey, reloads]);

  const load = () => { setState('loading'); setReloads(n => n + 1); };

  return (
    <View style={styles.wrap}>
      <View style={styles.periodRow}>
        {PERIODS.map(p => {
          const active = p === period;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => { setState('loading'); setPeriod(p); }}
              style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, { color: active ? colors.onPrimary : colors.text }]}>{PERIOD_LABELS[p]}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={load} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]} accessibilityRole="button">
          <Text style={[styles.chipText, { color: colors.primary }]}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {state === 'loading' && <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />}

      {state === 'error' && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'center' }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{"Couldn't build the report"}</Text>
          {!!errMsg && <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>{errMsg}</Text>}
          <TouchableOpacity onPress={load}><Text style={[styles.chipText, { color: colors.primary }]}>Try again</Text></TouchableOpacity>
        </View>
      )}

      {state === 'ready' && report && (
        <>
          {report.sections.map(section => (
            <View key={section.title} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.icon}  {section.title}</Text>
              <View style={styles.grid}>
                {section.metrics.map(m => (
                  <View key={m.label} style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.metricValue, { color: colors.primary }]}>{m.value}</Text>
                    <Text style={[styles.metricLabel, { color: colors.text }]}>{m.label}</Text>
                    {!!m.hint && <Text style={[styles.metricHint, { color: colors.muted }]}>{m.hint}</Text>}
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.grid}>
            <View style={styles.half}>
              <Ranked title="🔥 Most popular destinations" items={report.topDestinations} empty="No saves or trip stops yet for this period." />
            </View>
            <View style={styles.half}>
              <Ranked title="✅ Verified businesses by category" items={report.businessCategories} empty="No verified businesses yet." />
            </View>
          </View>

          <Text style={[styles.footnote, { color: colors.muted }]}>
            Live counts from the KalawGuide data on this device ·{PERIOD_LABELS[report.period]} · updated{' '}
            {new Date(report.generatedAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.lg },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, minHeight: 36, justifyContent: 'center' },
  chipText: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: Typography.weight.semiBold },
  section: { gap: Spacing.sm },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 16, fontWeight: Typography.weight.bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metric: { flexGrow: 1, flexBasis: 140, minWidth: 130, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, gap: 2 },
  metricValue: { fontFamily: Typography.fontFamilyBody, fontSize: 24, fontWeight: Typography.weight.bold },
  metricLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: Typography.weight.medium },
  metricHint: { fontFamily: Typography.fontFamilyBody, fontSize: 11 },
  half: { flexGrow: 1, flexBasis: 280 },
  card: { padding: Spacing.base, borderRadius: Radius.md, borderWidth: 1, gap: Spacing.sm },
  cardTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 15, fontWeight: Typography.weight.semiBold },
  muted: { fontFamily: Typography.fontFamilyBody, fontSize: 13 },
  barRow: { gap: 4 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  barLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 13, flex: 1, textTransform: 'capitalize' },
  barValue: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: Typography.weight.semiBold },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  footnote: { fontFamily: Typography.fontFamilyBody, fontSize: 12, textAlign: 'center' },
});
