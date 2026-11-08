import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { KalawButton } from '../../../components/common/KalawButton';
import { Typography, Spacing, Radius, Shadows } from '../../../constants/tokens';
import { ThemeMode } from '../../../types';

export default function ProfileScreen() {
  const { colors, isDark, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
    { label: 'Light', value: 'light', icon: '☀️' },
    { label: 'Dark', value: 'dark', icon: '🌙' },
    { label: 'System', value: 'system', icon: '⚙️' },
  ];

  const base = Platform.OS === 'web' ? '/(web)' : '/(tourist)';
  const MENU_ITEMS = [
    { icon: '📅', label: 'My Trips', onPress: () => router.push(Platform.OS === 'web' ? '/(web)/trips' as any : '/(tourist)/(tabs)/trips' as any) },
    { icon: '🧾', label: 'My Expenses', onPress: () => router.push(`${base}/expenses` as any) },
    { icon: '💰', label: 'My Budgets', onPress: () => router.push(`${base}/my-budgets` as any) },
    { icon: '📋', label: 'My Bookings', onPress: () => router.push(`${base}/booking-history` as any) },
    { icon: '🚨', label: 'Emergency Info', onPress: () => router.push(`${base}/emergency` as any) },
    { icon: '⚙️', label: 'Settings', onPress: () => router.push(`${base}/settings` as any) },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.onPrimary }]}>{initials}</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{user?.displayName ?? 'Traveler'}</Text>
          <Text style={[styles.email, { color: colors.muted }]}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.roleText, { color: colors.primary }]}>
              🧳 Tourist
            </Text>
          </View>
        </View>

        {/* Theme picker */}
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

        {/* Menu */}
        <View style={[styles.section, { backgroundColor: colors.surface, ...shadow }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Access</Text>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                i < MENU_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.menuArrow, { color: colors.muted }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account info */}
        <View style={[styles.section, { backgroundColor: colors.surface, ...shadow }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Sign-in method</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.provider === 'google' ? '🔵 Google' : '📧 Email'}
            </Text>
          </View>
        </View>

        <KalawButton
          label="Sign Out"
          onPress={signOut}
          variant="secondary"
          fullWidth
        />

        <Text style={[styles.version, { color: colors.muted }]}>KalawGuide v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: 100 },
  profileSection: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '700', fontFamily: Typography.fontFamilyBody },
  name: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  email: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  roleBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.xl },
  roleText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  section: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  themeRow: { flexDirection: 'row', gap: Spacing.sm },
  themeOption: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1.5, gap: Spacing.xs,
  },
  themeIcon: { fontSize: 20 },
  themeLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md,
  },
  menuIcon: { fontSize: 20, width: 28 },
  menuLabel: { flex: 1, fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg },
  menuArrow: { fontSize: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  infoValue: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  version: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, textAlign: 'center' },
});
