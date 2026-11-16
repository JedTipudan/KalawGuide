import React from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { AdminShell } from '../../components/web/AdminShell';
import { useTheme } from '../../contexts/ThemeContext';
import { ReportView } from '../../components/admin/ReportView';
import { rw } from '../../utils/responsive';

export default function WebAdminReportsScreen() {
  const { colors } = useTheme();
  return (
    <AdminShell activeLabel="Reports & Analytics">
      <ScrollView {...rw('scpad')} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.eyebrow, { color: colors.primary }]}>PLATFORM / REPORTS</Text>
        <Text style={[s.title, { color: colors.text }]}>Reports & analytics</Text>
        <Text style={[s.sub, { color: colors.muted }]}>
          Platform health at a glance: users, business verification, listings and tourist activity.
        </Text>
        <ReportView />
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
