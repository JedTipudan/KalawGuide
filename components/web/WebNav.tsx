import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Typography, Spacing } from '../../constants/tokens';

interface WebNavProps {
  variant?: 'public' | 'tourist' | 'business' | 'admin';
}

export function WebNav({ variant = 'public' }: WebNavProps) {
  const { colors, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  function goHome() {
    if (!user) { router.push('/(web)/landing' as any); return; }
    if (user.role === 'admin') router.push('/(web)/admin-dashboard' as any);
    else if (user.role === 'business_owner') router.push('/(web)/business-dashboard' as any);
    else router.push('/(web)/home' as any);
  }

  function cycleTheme() {
    if (mode === 'light') setMode('dark');
    else if (mode === 'dark') setMode('system');
    else setMode('light');
  }

  const themeLabel = mode === 'light' ? '☀ Light' : mode === 'dark' ? '☾ Dark' : '◐ System';

  return (
    <View style={[styles.nav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={goHome}>
        <Text style={[styles.logo, { color: colors.primary }]}>≋  KalawGuide</Text>
      </TouchableOpacity>

      <View style={styles.right}>
        {variant === 'tourist' && (
          <View style={styles.navLinks}>
            {TOURIST_LINKS.map(l => (
              <div key={l.route} className="nav-link">
                <TouchableOpacity onPress={() => router.push(l.route as any)}>
                  <Text style={[styles.navLink, { color: pathname === l.route ? colors.primary : colors.muted }]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              </div>
            ))}
          </View>
        )}
        {variant === 'business' && (
          <View style={styles.navLinks}>
            {BUSINESS_LINKS.map(l => (
              <div key={l.route} className="nav-link">
                <TouchableOpacity onPress={() => router.push(l.route as any)}>
                  <Text style={[styles.navLink, { color: pathname === l.route ? colors.primary : colors.muted }]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              </div>
            ))}
          </View>
        )}
        {variant === 'admin' && (
          <View style={styles.navLinks}>
            {ADMIN_LINKS.map(l => (
              <div key={l.route} className="nav-link">
                <TouchableOpacity onPress={() => router.push(l.route as any)}>
                  <Text style={[styles.navLink, { color: pathname === l.route ? colors.primary : colors.muted }]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              </div>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={cycleTheme}
          style={[styles.themeBtn, { backgroundColor: colors.subtle, borderColor: colors.border }]}
        >
          <Text style={[styles.themeBtnText, { color: colors.text }]}>{themeLabel}</Text>
        </TouchableOpacity>

        {user ? (
          <TouchableOpacity onPress={signOut} style={[styles.signOutBtn, { borderColor: colors.border }]}>
            <Text style={[styles.signOutText, { color: colors.muted }]}>Sign Out</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.authLinks}>
            <TouchableOpacity onPress={() => router.push('/(web)/sign-in' as any)}>
              <Text style={[styles.navLink, { color: colors.muted }]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(web)/register-tourist' as any)}
              style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.ctaBtnText, { color: colors.onPrimary }]}>Get Started</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const TOURIST_LINKS = [
  { label: 'Home', route: '/(web)/home' },
  { label: 'Explore', route: '/(web)/explore' },
  { label: 'Recommendations', route: '/(web)/recommendations' },
  { label: 'Budget', route: '/(web)/budget' },
  { label: 'Trips', route: '/(web)/trips' },
  { label: 'Expenses', route: '/(web)/expenses' },
  { label: 'Businesses', route: '/(web)/businesses' },
  { label: 'Emergency', route: '/(web)/emergency' },
];

const BUSINESS_LINKS = [
  { label: 'Dashboard', route: '/(web)/business-dashboard' },
  { label: 'Profile', route: '/(web)/business-profile' },
  { label: 'Products', route: '/(web)/business-products' },
  { label: 'Prices', route: '/(web)/business-prices' },
  { label: 'Facilities', route: '/(web)/business-facilities' },
];

const ADMIN_LINKS = [
  { label: 'Dashboard', route: '/(web)/admin-dashboard' },
  { label: 'Users', route: '/(web)/admin-users' },
  { label: 'Businesses', route: '/(web)/admin-businesses' },
  { label: 'Destinations', route: '/(web)/admin-destinations' },
  { label: 'Logs', route: '/(web)/admin-activity-logs' },
];

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 64,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  logo: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.h4,
    fontWeight: Typography.weight.bold,
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  } as any,
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  navLink: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.medium,
  },
  themeBtn: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeBtnText: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.body,
  },
  authLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  ctaBtn: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  ctaBtnText: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.semiBold,
  },
  signOutBtn: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  signOutText: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.body,
  },
});
