import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { KalawAssistanceFAB } from '../../../components/assistant/KalawAssistanceFAB';
import { Typography, Spacing, Radius, Shadows } from '../../../constants/tokens';
import { ThemeMode } from '../../../types';

const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
  { label: 'Light', value: 'light', icon: '☀️' },
  { label: 'Dark', value: 'dark', icon: '🌙' },
  { label: 'System', value: 'system', icon: '⚙️' },
];

export default function ProfileScreen() {
  const { colors, isDark, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const firstName = user?.displayName?.split(' ')[0] ?? 'Traveler';
  const base = Platform.OS === 'web' ? '/(web)' : '/(tourist)';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* App bar */}
      <View style={[styles.appBar, { backgroundColor: colors.surface }]}>
        <Text style={[styles.appBarTitle, { color: colors.primary }]}>My Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.heading, { color: colors.text }]}>{firstName}'s travel space</Text>

          {/* Profile info card */}
          <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {user?.displayName ?? 'Traveler'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.muted }]}>
              {user?.email ?? 'you@example.com'}
            </Text>
            <Text style={[styles.profileMeta, { color: colors.muted }]}>
              {user?.provider === 'google' ? '🔵 Google account' : '📧 Email account'}
            </Text>
          </View>

          {/* Appearance */}
          <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
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

          {/* Saved collections */}
          <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>My Collections</Text>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/(tourist)/(tabs)/favorites' as any)}>
              <Text style={[styles.menuItem, { color: colors.text }]}>🗺  Saved destinations</Text>
              <Text style={[styles.menuChevron, { color: colors.muted }]}>›</Text>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/(tourist)/(tabs)/trips' as any)}>
              <Text style={[styles.menuItem, { color: colors.text }]}>🧳  My trips</Text>
              <Text style={[styles.menuChevron, { color: colors.muted }]}>›</Text>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/(tourist)/my-budgets' as any)}>
              <Text style={[styles.menuItem, { color: colors.text }]}>💰  Saved budgets</Text>
              <Text style={[styles.menuChevron, { color: colors.muted }]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Account */}
          <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
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
          </View>

          {/* Quick links */}
          <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>More</Text>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push(`${base}/emergency` as any)}>
              <Text style={[styles.menuItem, { color: colors.text }]}>🚨  Emergency information</Text>
              <Text style={[styles.menuChevron, { color: colors.muted }]}>›</Text>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push(`${base}/recommendations` as any)}>
              <Text style={[styles.menuItem, { color: colors.text }]}>✨  Recommendations</Text>
              <Text style={[styles.menuChevron, { color: colors.muted }]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* About */}
          <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
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

          {/* Sign out */}
          <TouchableOpacity
            style={[styles.signOutBtn, { backgroundColor: colors.surface, borderColor: colors.border, ...shadow }]}
            onPress={signOut}
            activeOpacity={0.8}
          >
            <Text style={[styles.signOutText, { color: colors.text }]}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={[styles.legal, { color: colors.muted }]}>KalawGuide · Privacy Policy · Terms and Conditions</Text>
        </View>
      </ScrollView>

      <KalawAssistanceFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appBar: {
    paddingHorizontal: 20, paddingVertical: 14,
  },
  appBarTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.semiBold },
  scroll: { paddingBottom: 100 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 16 },
  heading: { fontFamily: Typography.fontFamilyBody, fontSize: 26, fontWeight: Typography.weight.bold },
  card: { borderRadius: Radius.md, padding: 16, gap: 10 },
  profileName: { fontFamily: Typography.fontFamilyBody, fontSize: 20, fontWeight: Typography.weight.semiBold },
  profileEmail: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  profileMeta: { fontFamily: Typography.fontFamilyBody, fontSize: 13 },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 15, fontWeight: Typography.weight.semiBold },
  themeRow: { flexDirection: 'row', gap: Spacing.sm },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, gap: Spacing.xs },
  themeIcon: { fontSize: 20 },
  themeLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: Typography.weight.medium },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  menuItem: { fontFamily: Typography.fontFamilyBody, fontSize: 15 },
  menuChevron: { fontFamily: Typography.fontFamilyBody, fontSize: 18 },
  divider: { height: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  infoLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  infoValue: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.medium, textAlign: 'right', flex: 1, marginLeft: Spacing.md },
  signOutBtn: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingVertical: 13, alignItems: 'center',
  },
  signOutText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  legal: { fontFamily: Typography.fontFamilyBody, fontSize: 11, textAlign: 'center' },
});
