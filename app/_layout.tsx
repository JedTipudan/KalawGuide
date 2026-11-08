import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Typography, Radius } from '../constants/tokens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { WebAppShell } from '../components/common/WebAppShell';

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (isLoading) return;
    if (segments.length === 0) return;
    if (isWeb && String(segments[0] ?? '') === 'index') return;

    const role = user?.role ?? null;
    const seg0 = segments[0] ? String(segments[0]) : undefined;
    const seg1 = segments[1] ? String(segments[1]) : undefined;

    if (seg1 === 'role-select') return;

    if (isWeb) {
      const AUTH_SCREENS = ['sign-in', 'register-tourist', 'register-business', 'forgot-password', 'role-select', 'landing'];
      const PROTECTED_SCREENS = [
        'home', 'explore', 'budget', 'budget-results', 'trips', 'expenses', 'add-expense',
        'my-budgets', 'booking-history', 'emergency', 'businesses', 'recommendations',
        'profile', 'settings',
        'business-dashboard', 'business-profile', 'business-products', 'business-prices',
        'business-facilities', 'business-bookings', 'business-notifications', 'business-settings',
        'admin-dashboard', 'admin-users', 'admin-businesses', 'admin-destinations',
        'admin-emergency', 'admin-reports', 'admin-activity-logs', 'admin-settings',
      ];
      const onWebGroup = seg0 === '(web)';
      const onAuthScreen = onWebGroup && !!seg1 && AUTH_SCREENS.includes(seg1 as string);
      const onProtectedScreen = onWebGroup && !!seg1 && PROTECTED_SCREENS.includes(seg1 as string);

      if (!user) {
        if (onProtectedScreen) router.replace('/(web)/landing' as any);
        return;
      }
      if (onAuthScreen) {
        if (role === 'tourist') router.replace('/(web)/home' as any);
        else if (role === 'business_owner') router.replace('/(web)/business-dashboard' as any);
        else if (role === 'admin') router.replace('/(web)/admin-dashboard' as any);
      }
      return;
    }

    // Native routing
    if (!user) {
      if (seg0 !== '(auth)') router.replace('/(auth)/welcome');
      return;
    }
    if (role === 'tourist' && seg0 !== '(tourist)') router.replace('/(tourist)/(tabs)/home');
    else if (role === 'business_owner' && seg0 !== '(business)') router.replace('/(business)/dashboard');
    else if (role === 'admin' && seg0 !== '(admin)') router.replace('/(admin)/dashboard');
  }, [user, isLoading, segments.map(s => String(s ?? '')).join('/'), isWeb]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        {isWeb ? (
          <Stack.Screen name="(web)" options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tourist)" options={{ headerShown: false }} />
            <Stack.Screen name="(business)" options={{ headerShown: false }} />
            <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          </>
        )}
      </Stack>
      {isLoading && Platform.OS !== 'web' && (
        <View style={[splash.container, { backgroundColor: colors.primary }]}>
          <View style={splash.logoMark}>
            <Text style={splash.logoText}>K</Text>
          </View>
          <Text style={splash.appName}>KalawGuide</Text>
          <Text style={splash.tagline}>Discover Mati City</Text>
        </View>
      )}
    </>
  );
}

const splash = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 16 },
  logoMark: { width: 96, height: 96, borderRadius: Radius.xl, backgroundColor: '#FFFFFF22', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 48, fontWeight: '700', color: '#FFFFFF', fontFamily: Typography.fontFamilyBody },
  appName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h2, fontWeight: '700', color: '#FFFFFF' },
  tagline: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, color: '#FFFFFF99' },
});

export default function RootLayout() {
  const inner = (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );

  if (Platform.OS !== 'web') return inner;

  return <WebAppShell>{inner}</WebAppShell>;
}
