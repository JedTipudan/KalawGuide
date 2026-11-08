import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { BusinessShell } from '../../components/web/BusinessShell';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeMode } from '../../types';

export default function WebBusinessSettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();

  const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
    { label: 'Light', value: 'light', icon: '☀️' },
    { label: 'Dark', value: 'dark', icon: '🌙' },
    { label: 'System', value: 'system', icon: '⚙️' },
  ];

  const INFO_ROWS = [
    { label: 'Name', value: user?.displayName ?? '—' },
    { label: 'Email', value: user?.email ?? '—' },
    { label: 'Role', value: '🏪 Business Owner' },
    { label: 'Sign-in method', value: user?.provider === 'google' ? '🔵 Google' : '📧 Email' },
  ];

  return (
    <BusinessShell activeLabel="Account Settings">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { color: colors.text }]}>Account Settings</Text>
        <Text style={[s.pageSub, { color: colors.muted }]}>Manage your account preferences.</Text>

        {/* Account info */}
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Account</Text>
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

        <TouchableOpacity style={[s.signOutBtn, { borderColor: colors.danger }]} onPress={signOut}>
          <Text style={[s.signOutText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[s.legal, { color: colors.muted }]}>KalawGuide v1.0.0 · Privacy Policy · Terms and Conditions</Text>
      </ScrollView>
    </BusinessShell>
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
  themeRow: { flexDirection: 'row', gap: 12 },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 10, borderWidth: 1.5, gap: 6 },
  themeIcon: { fontSize: 22 },
  themeLabel: { fontSize: 13, fontWeight: '600' },
  signOutBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  signOutText: { fontSize: 15, fontWeight: '700' },
  legal: { fontSize: 12, textAlign: 'center' },
});
