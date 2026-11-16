import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getDatabase } from '../../../database/migrations/init';
import { Typography, Spacing, Radius, Shadows } from '../../../constants/tokens';
import { ThemeMode } from '../../../types';

const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
  { label: 'Light', value: 'light', icon: '☀️' },
  { label: 'Dark', value: 'dark', icon: '🌙' },
  { label: 'System', value: 'system', icon: '⚙️' },
];

interface Counts { contacts: number; unverifiedContacts: number; categories: number; pendingBusinesses: number }

export default function AdminSettingsScreen() {
  const { colors, isDark, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;
  const [counts, setCounts] = useState<Counts | null>(null);

  // Refresh the badges every time the tab comes back into focus.
  useFocusEffect(useCallback(() => {
    let live = true;
    (async () => {
      try {
        const db = await getDatabase();
        const n = async (sql: string) => (await db.getFirstAsync<{ n: number }>(sql))?.n ?? 0;
        const next = {
          contacts: await n('SELECT COUNT(*) AS n FROM emergency_contacts'),
          unverifiedContacts: await n('SELECT COUNT(*) AS n FROM emergency_contacts WHERE is_verified = 0'),
          categories: await n('SELECT COUNT(*) AS n FROM destination_categories'),
          pendingBusinesses: await n("SELECT COUNT(*) AS n FROM businesses WHERE verification_status = 'pending'"),
        };
        if (live) setCounts(next);
      } catch { /* badges are optional */ }
    })();
    return () => { live = false; };
  }, []));

  function confirmSignOut() {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out of the admin account?')) signOut();
      return;
    }
    Alert.alert('Sign out?', 'You will need to sign in again to manage KalawGuide.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  const TOOLS: { icon: string; label: string; hint?: string; route: string; badge?: number; warn?: boolean }[] = [
    { icon: '🏪', label: 'Business verification', hint: 'Check that listings are legit', route: '/(admin)/(tabs)/businesses', badge: counts?.pendingBusinesses, warn: !!counts?.pendingBusinesses },
    { icon: '☎️', label: 'Emergency contacts', hint: counts ? `${counts.contacts} contacts · ${counts.unverifiedContacts} unverified` : undefined, route: '/(admin)/emergency-contacts', warn: !!counts?.unverifiedContacts },
    { icon: '🏷', label: 'Destination categories', hint: counts ? `${counts.categories} categories` : undefined, route: '/(admin)/categories' },
    { icon: '📊', label: 'Reports & analytics', hint: 'Users, verification and tourist activity', route: '/(admin)/reports' },
    { icon: '📋', label: 'Activity logs', hint: 'Sign-ins, approvals and edits', route: '/(admin)/activity-logs' },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.appBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.appBarTitle, { color: colors.primary }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account */}
        <View style={[styles.card, styles.accountCard, { backgroundColor: colors.surface, ...shadow }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.onPrimary }]}>{(user?.displayName ?? 'A').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{user?.displayName ?? 'Administrator'}</Text>
            <Text style={[styles.muted, { color: colors.muted }]} numberOfLines={1}>{user?.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.subtle }]}>
              <Text style={[styles.roleText, { color: colors.primary }]}>🛡 Administrator</Text>
            </View>
          </View>
        </View>

        {/* Appearance */}
        <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          <Text style={[styles.muted, { color: colors.muted }]}>
            Currently {mode === 'system' ? `following your phone (${isDark ? 'dark' : 'light'})` : mode}.
          </Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map(opt => {
              const active = mode === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.themeOption, { backgroundColor: active ? colors.primary : colors.subtle, borderColor: active ? colors.primary : colors.border }]}
                  onPress={() => setMode(opt.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${opt.label} theme`}
                >
                  <Text style={styles.themeIcon}>{opt.icon}</Text>
                  <Text style={[styles.themeLabel, { color: active ? colors.onPrimary : colors.text }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Admin tools */}
        <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Admin tools</Text>
          {TOOLS.map((t, i) => (
            <View key={t.route}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <TouchableOpacity style={styles.menuRow} onPress={() => router.push(t.route as any)} accessibilityRole="button">
                <Text style={styles.menuIcon}>{t.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuLabel, { color: colors.text }]}>{t.label}</Text>
                  {!!t.hint && <Text style={[styles.menuHint, { color: t.warn ? colors.warning : colors.muted }]}>{t.hint}</Text>}
                </View>
                {!!t.badge && (
                  <View style={[styles.badge, { backgroundColor: colors.warning }]}>
                    <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>{t.badge}</Text>
                  </View>
                )}
                <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* About */}
        <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
          {[
            ['App version', '1.0.0'],
            ['Coverage', 'Mati City, Davao Oriental'],
            ['Data', 'Stored on this device (offline-first)'],
          ].map(([k, v], i) => (
            <View key={k}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.infoRow}>
                <Text style={[styles.muted, { color: colors.muted }]}>{k}</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{v}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: colors.surface, borderColor: colors.danger }]}
          onPress={confirmSignOut}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.legal, { color: colors.muted }]}>KalawGuide · Administrator workspace</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appBar: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  appBarTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.semiBold },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  card: { borderRadius: Radius.md, padding: 16, gap: 10 },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.bold },
  name: { fontFamily: Typography.fontFamilyBody, fontSize: 18, fontWeight: Typography.weight.semiBold },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm, marginTop: 4 },
  roleText: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: Typography.weight.semiBold },
  muted: { fontFamily: Typography.fontFamilyBody, fontSize: 13 },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 15, fontWeight: Typography.weight.semiBold },
  themeRow: { flexDirection: 'row', gap: Spacing.sm },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, gap: Spacing.xs, minHeight: 64 },
  themeIcon: { fontSize: 20 },
  themeLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: Typography.weight.semiBold },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: 48 },
  menuIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  menuLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 15, fontWeight: Typography.weight.medium },
  menuHint: { fontFamily: Typography.fontFamilyBody, fontSize: 12 },
  chevron: { fontFamily: Typography.fontFamilyBody, fontSize: 20 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: Typography.weight.bold },
  divider: { height: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 12 },
  infoValue: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: Typography.weight.medium, textAlign: 'right', flex: 1 },
  signOutBtn: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  signOutText: { fontFamily: Typography.fontFamilyBody, fontSize: 15, fontWeight: Typography.weight.semiBold },
  legal: { fontFamily: Typography.fontFamilyBody, fontSize: 11, textAlign: 'center' },
});
