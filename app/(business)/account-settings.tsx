import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';
import { ThemeMode } from '../../types';

const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
  { label: 'Light', value: 'light', icon: '☀️' },
  { label: 'Dark', value: 'dark', icon: '🌙' },
  { label: 'System', value: 'system', icon: '⚙️' },
];

export default function OwnerAccountSettingsScreen() {
  const { colors, isDark, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.utilBar, { backgroundColor: colors.surface }]}>
        <Text style={[styles.utilBarTitle, { color: colors.primary }]}>☰ Owner workspace</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Account settings</Text>

        {/* Account info */}
        <View style={[styles.section, { backgroundColor: colors.surface, ...shadow }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Name</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{user?.displayName ?? '—'}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Email</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{user?.email ?? '—'}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Sign-in method</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.provider === 'google' ? '🔵 Google' : '📧 Email'}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Role</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>🏪 Business Owner</Text>
          </View>
        </View>

        {/* Theme */}
        <View style={[styles.section, { backgroundColor: colors.surface, ...shadow }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: mode === opt.value ? colors.primary : colors.subtle,
                    borderColor: mode === opt.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setMode(opt.value)}
              >
                <Text style={styles.themeIcon}>{opt.icon}</Text>
                <Text style={[styles.themeLabel, { color: mode === opt.value ? colors.onPrimary : colors.text }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <KalawButton label="Sign Out" onPress={signOut} variant="secondary" fullWidth />
        <Text style={[styles.version, { color: colors.muted }]}>KalawGuide v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  utilBar: { paddingHorizontal: 20, paddingVertical: 18 },
  utilBarTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 16, fontWeight: '700' },
  content: { padding: 20, gap: Spacing.lg, paddingBottom: 100 },
  pageTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: '700' },
  section: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 15, fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  infoLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  infoValue: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: '500' },
  divider: { height: 1 },
  themeRow: { flexDirection: 'row', gap: Spacing.sm },
  themeOption: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1.5, gap: Spacing.xs,
  },
  themeIcon: { fontSize: 20 },
  themeLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: '500' },
  version: { fontFamily: Typography.fontFamilyBody, fontSize: 12, textAlign: 'center' },
});
