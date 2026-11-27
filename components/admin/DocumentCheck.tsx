import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type { DocCheck } from '../../features/docCheck/documentCheckService';
import { VERDICT_LABEL, type DocVerdict } from '../../features/docCheck/verdict';

const ICON: Record<DocVerdict, string> = { legit: '✅', review: '🔎', suspicious: '⚠️', duplicate: '♻️' };

function useVerdictColor() {
  const { colors } = useTheme();
  return (v: DocVerdict) => ({ legit: colors.success, review: colors.warning, suspicious: colors.danger, duplicate: colors.danger }[v]);
}

export function DocCheckBadge({ verdict, score }: { verdict: DocVerdict; score?: number }) {
  const color = useVerdictColor()(verdict);
  return (
    <View style={[s.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[s.badgeText, { color }]}>
        {ICON[verdict]} {VERDICT_LABEL[verdict]}{score !== undefined ? ` · ${score}%` : ''}
      </Text>
    </View>
  );
}

export function DocCheckReport({ check, busy, onRecheck }: { check: DocCheck | undefined; busy: boolean; onRecheck: () => void }) {
  const { colors } = useTheme();
  const f = check?.findings;
  const rows: [string, string | null | undefined][] = f ? [
    ['Looks like', f.detectedType],
    ['Names on it', f.namesOnDocument.join(', ')],
    ['Document no.', f.documentNumber],
    ['Issued by', f.issuer],
    ['Issued', f.issueDate],
    ['Valid until', f.expiryDate],
  ] : [];

  return (
    <View style={[s.report, { borderColor: colors.border, backgroundColor: colors.subtle }]}>
      <View style={s.head}>
        <Text style={[s.title, { color: colors.text }]}>🤖 AI Document Check</Text>
        <TouchableOpacity
          disabled={busy}
          onPress={onRecheck}
          style={[s.btn, { borderColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
        >
          {busy ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={[s.btnText, { color: colors.primary }]}>{check ? 'Check again' : 'Run check'}</Text>}
        </TouchableOpacity>
      </View>

      {!check ? (
        <Text style={[s.muted, { color: colors.muted }]}>Not checked yet.</Text>
      ) : (
        <>
          <DocCheckBadge verdict={check.verdict} score={check.score} />
          {!!check.summary && <Text style={[s.summary, { color: colors.text }]}>{check.summary}</Text>}
          {check.flags.map((fl, i) => (
            <Text key={i} style={[s.flag, { color: fl.level === 'high' ? colors.danger : fl.level === 'medium' ? colors.text : colors.muted }]}>
              {fl.level === 'high' ? '🚩' : fl.level === 'medium' ? '•' : 'ℹ️'} {fl.text}
            </Text>
          ))}
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <View key={k} style={s.kv}>
              <Text style={[s.k, { color: colors.muted }]}>{k}</Text>
              <Text style={[s.v, { color: colors.text }]} numberOfLines={2}>{v}</Text>
            </View>
          ))}
          <Text style={[s.muted, { color: colors.muted }]}>
            Checked {check.checkedAt.slice(0, 16).replace('T', ' ')}. The AI only advises: compare with the original
            document or the issuing office before approving.
          </Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  report: { width: '100%', borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700' },
  btn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, minWidth: 96, alignItems: 'center' },
  btnText: { fontSize: 13, fontWeight: '600' },
  summary: { fontSize: 13, lineHeight: 19 },
  flag: { fontSize: 13, lineHeight: 19 },
  kv: { flexDirection: 'row', gap: 8 },
  k: { width: 96, fontSize: 12, fontWeight: '600' },
  v: { flex: 1, fontSize: 12 },
  muted: { fontSize: 12, lineHeight: 17 },
});
