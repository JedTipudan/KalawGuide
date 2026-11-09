import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Typography, Radius } from '../constants/tokens';

export default function IndexScreen() {
  const { colors } = useTheme();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Web: inline script in WebAppShell already rewrote the URL before React
  // hydrated. Just redirect to landing and let the auth guard take over.
  if (Platform.OS === 'web') {
    return <Redirect href={'/(web)/landing' as any} />;
  }

  // Native: once auth finishes loading, redirect from here directly.
  // This is more reliable than depending on _layout.tsx segments which can
  // be [] or 'index' inconsistently across Android versions.
  useEffect(() => {
    if (isLoading) return;
    const role = user?.role ?? null;
    if (!user) router.replace('/(auth)/welcome');
    else if (role === 'tourist') router.replace('/(tourist)/(tabs)/home');
    else if (role === 'business_owner') router.replace('/(business)/dashboard');
    else if (role === 'admin') router.replace('/(admin)/dashboard');
    else router.replace('/(auth)/welcome');
  }, [isLoading, user]);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={[styles.logoMark, { backgroundColor: '#FFFFFF22' }]}>
        <Text style={styles.logoText}>K</Text>
      </View>
      <Text style={styles.appName}>KalawGuide</Text>
      <Text style={styles.tagline}>Discover Mati City</Text>
      <ActivityIndicator
        size="small"
        color="rgba(255,255,255,0.7)"
        style={{ marginTop: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  logoMark: { width: 96, height: 96, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 48, fontWeight: '700', color: '#FFFFFF', fontFamily: Typography.fontFamilyBody },
  appName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h2, fontWeight: Typography.weight.bold, color: '#FFFFFF' },
  tagline: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, color: '#FFFFFF99' },
});
