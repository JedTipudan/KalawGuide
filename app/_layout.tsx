import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { WebAppShell } from '../components/common/WebAppShell';

const isWeb = Platform.OS === 'web';

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    if (segments.length === 0) return;

    const seg0 = segments[0] as string | undefined;
    const seg1 = segments[1] as string | undefined;

    if (seg1 === 'role-select') return;

    const role = user?.role ?? null;

    if (isWeb) {
      const AUTH_SCREENS = ['sign-in', 'register-tourist', 'register-business', 'forgot-password', 'role-select', 'landing'];
      const PROTECTED_SCREENS = [
        'home', 'budget', 'budget-results', 'trips', 'expenses', 'add-expense',
        'my-budgets', 'booking-history', 'recommendations',
        'profile', 'settings',
        'business-dashboard', 'business-profile', 'business-products', 'business-prices',
        'business-facilities', 'business-bookings', 'business-notifications', 'business-settings',
        'admin-dashboard', 'admin-users', 'admin-businesses', 'admin-destinations',
        'admin-emergency', 'admin-reports', 'admin-activity-logs', 'admin-settings',
      ];
      const screenName = seg0 === '(web)' ? seg1 : seg0;
      const onAuthScreen = !!screenName && AUTH_SCREENS.includes(screenName);
      const onProtectedScreen = !!screenName && PROTECTED_SCREENS.includes(screenName);
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

    // Native: index.tsx handles its own redirect, so only guard non-index screens here
    if (seg0 === 'index') return;

    if (!user) {
      if (seg0 !== '(auth)') router.replace('/(auth)/welcome');
      return;
    }
    if (role === 'tourist' && seg0 !== '(tourist)') router.replace('/(tourist)/(tabs)/home');
    else if (role === 'business_owner' && seg0 !== '(business)') router.replace('/(business)/dashboard');
    else if (role === 'admin' && seg0 !== '(admin)') router.replace('/(admin)/dashboard');
  }, [user, isLoading, segments]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="+not-found" />
        {isWeb && <Stack.Screen name="(web)" />}
        {!isWeb && <Stack.Screen name="(auth)" />}
        {!isWeb && <Stack.Screen name="(tourist)" />}
        {!isWeb && <Stack.Screen name="(business)" />}
        {!isWeb && <Stack.Screen name="(admin)" />}
      </Stack>
    </>
  );
}


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

  if (!isWeb) return inner;

  return <WebAppShell>{inner}</WebAppShell>;
}
