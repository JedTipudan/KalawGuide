import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AdminShell } from '../../components/web/AdminShell';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeMode } from '../../types';

export default function WebAdminSettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();

  const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
    { label: 'Light', value: 'light', icon: '☀️' },
    { label: 'Dark', value: 'dark', icon: '🌙' },
    { label: 'System', value: 'system', icon: '⚙️' },
  ];

  const INFO_ROWS = [
    { label: 'App Version', value: '1.0.0' },
    { label: 'Platform', value: 'Web' },
    { label: 'Database', value: 'SQLite (local)' },
    { label: 'Location', value: 'Mati City, Davao Oriental' },
  ];

  return (
    <AdminShell activeLabel="System Settings">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { color: colors.text }]}>System Settings</Text>
        <Text style={[s.pageSub, { color: colors.muted }]}>Administrator preferences and platform information.</Text>

        {/* Account */}
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Administrator Account</Text>
          <View style={s.infoGrid}>
            <View style={s.infoRow}>
              <Text style={[s.infoLabel, { color: colors.muted }]}>Name</Text>
              <Text style={[s.infoValue, { color: colors.text }]}>{user?.displayName ?? '—'}</Text>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <View style={s.infoRow}>
              <Text style={[s.infoLabel, { color: colors.muted }]}>Email</Text>
              <Text style={[s.infoValue, { color: colors.text }]}>{user?.email ?? '—'}</Text>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <View style={s.infoRow}>
              <Text style={[s.infoLabel, { color: colors.muted }]}>Role</Text>
              <View style={[s.roleBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[s.roleText, { color: colors.primary }]}>🛡 Administrator</Text>
              </View>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <View style={s.infoRow}>
              <Text style={[s.infoLabel, { color: colors.muted }]}>Sign-in method</Text>
              <Text style={[s.infoValue, { color: colors.text }]}>
                {user?.provider === 'google' ? '🔵 Google' : '📧 Email'}
              </Text>
            </View>
          </View>
        </View>

        {/* Appearance */}
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Appearance</Text>
          <Text style={[s.cardSub, { color: colors.muted }]}>Choose your preferred color theme.</Text>
          <View style={s.themeRow}>
            {THEME_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[s.themeOption, {
                  backgroundColor: mode === opt.value ? colors.primary : colors.subtle,
                  borderColor: mode === opt.value ? colors.primary : colors.border,
                }]}
                onPress={() => setMode(opt.value)}
              >
                <Text style={s.themeIcon}>{opt.icon}</Text>
                <Text style={[s.themeLabel, { color: mode === opt.value ? '#fff' : colors.text }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Platform info */}
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Platform Information</Text>
          <View style={s.infoGrid}>
            {INFO_ROWS.map((row, i) => (
              <React.Fragment key={row.label}>
                {i > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
                <View style={s.infoRow}>
                  <Text style={[s.infoLabel, { color: colors.muted }]}>{row.label}</Text>
                  <Text style={[s.infoValue, { color: colors.text }]}>{row.value}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={[s.signOutBtn, { borderColor: colors.danger }]} onPress={signOut}>
          <Text style={[s.signOutText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[s.legal, { color: colors.muted }]}>KalawGuide · Privacy Policy · Terms and Conditions</Text>
      </ScrollView>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  content: { padding: 32, gap: 24, paddingBottom: 48 },
  pageTitle: { fontSize: 24, fontWeight: '700' },
  pageSub: { fontSize: 14, marginTop: -16 },
  card: { borderRadius: 12, padding: 24, gap: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardSub: { fontSize: 14, marginTop: -8 },
  infoGrid: { gap: 0 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontSize: 13, fontWeight: '600' },
  themeRow: { flexDirection: 'row', gap: 12 },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 10, borderWidth: 1.5, gap: 6 },
  themeIcon: { fontSize: 22 },
  themeLabel: { fontSize: 13, fontWeight: '600' },
  signOutBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  signOutText: { fontSize: 15, fontWeight: '700' },
  legal: { fontSize: 12, textAlign: 'center' },
});
