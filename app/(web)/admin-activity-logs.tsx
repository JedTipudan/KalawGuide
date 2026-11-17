import React from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { AdminShell } from '../../components/web/AdminShell';
import { useTheme } from '../../contexts/ThemeContext';
import { ActivityLogView } from '../../components/admin/ActivityLogView';
import { rw } from '../../utils/responsive';

export default function WebAdminActivityLogsScreen() {
  const { colors } = useTheme();
  return (
    <AdminShell activeLabel="Activity Logs">
      <ScrollView {...rw('scpad')} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.eyebrow, { color: colors.primary }]}>PLATFORM / ACTIVITY</Text>
        <Text {...rw('h2')} style={[s.title, { color: colors.text }]}>Activity logs</Text>
        <Text style={[s.sub, { color: colors.muted }]}>Who did what, and when, across KalawGuide.</Text>
        <ActivityLogView />
      </ScrollView>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  content: { padding: 32, gap: 12, paddingBottom: 48 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: '700' },
  sub: { fontSize: 14, marginBottom: 12 },
});
