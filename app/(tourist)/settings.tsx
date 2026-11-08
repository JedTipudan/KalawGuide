import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';
import { ThemeMode } from '../../types';

export default function SettingsScreen() {
  const { colors, isDark, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
    { label: 'Light', value: 'light', icon: '☀️' },
    { label: 'Dark', value: 'dark', icon: '🌙' },
    { label: 'System', value: 'system', icon: '⚙️' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        {/* Appearance */}
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

        {/* Account */}
        <View style={[styles.section, { backgroundColor: colors.surface, ...shadow }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Name</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{user?.displayName}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Email</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{user?.email}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Sign-in method</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.provider === 'google' ? '🔵 Google' : '📧 Email'}
            </Text>
          </View>
        </View>

        {/* About */}
        <View style={[styles.section, { backgroundColor: colors.surface, ...shadow }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>App Version</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>1.0.0</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Location</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>Mati City, Davao Oriental</Text>
          </View>
        </View>

        <KalawButton label="Sign Out" onPress={signOut} variant="secondary" fullWidth />
        <Text style={[styles.legal, { color: colors.muted }]}>KalawGuide · Privacy Policy · Terms and Conditions</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  backBtn: { alignSelf: 'flex-start', padding: Spacing.xs },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  section: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  themeRow: { flexDirection: 'row', gap: Spacing.sm },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, gap: Spacing.xs },
  themeIcon: { fontSize: 20 },
  themeLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  infoLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  infoValue: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium, textAlign: 'right', flex: 1, marginLeft: Spacing.md },
  divider: { height: 1 },
  legal: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, textAlign: 'center' },
});
