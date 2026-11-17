import { useEffect } from 'react';
import { Platform, View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Typography } from '../constants/tokens';

export default function IndexScreen() {
  const { colors } = useTheme();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web' || isLoading) return;
    if (!user) router.replace('/(auth)/welcome');
    else if (user.role === 'tourist') router.replace('/(tourist)/(tabs)/home');
    else if (user.role === 'business_owner') router.replace('/(business)/(tabs)/dashboard');
    else if (user.role === 'admin') router.replace('/(admin)/(tabs)/dashboard');
    else router.replace('/(auth)/welcome');
  }, [isLoading, user, router]);

  if (Platform.OS === 'web') {
    return <Redirect href={'/(web)/landing' as any} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Status bar area */}
      <View style={[styles.statusBar, { backgroundColor: colors.surface }]} />

      {/* Content */}
      <View style={[styles.content, { backgroundColor: colors.surface }]}>
        <Text style={[styles.appName, { color: colors.primary }]}>≋ KalawGuide</Text>
        <Text style={[styles.heading, { color: colors.text }]}>
          Your next adventure,{'\n'}a little more local.
        </Text>
        <Text style={[styles.tagline, { color: colors.muted }]}>Discover. Plan. Go.</Text>

        <Image source={require('../assets/images/hero-bg.jpg')} style={[styles.heroImage, { backgroundColor: colors.subtle }]} resizeMode="cover" />

        <Text style={[styles.locationLabel, { color: colors.accent }]}>MATI CITY · DAVAO ORIENTAL</Text>
        <Text style={[styles.loadingText, { color: colors.muted }]}>Getting your next journey ready…</Text>
        <ActivityIndicator size="small" color={colors.muted} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusBar: { paddingTop: 8, paddingHorizontal: 24, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 24, gap: 16 },
  appName: { fontFamily: Typography.fontFamilyBody, fontSize: 36, fontWeight: Typography.weight.bold },
  heading: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: Typography.weight.bold, lineHeight: 40 },
  tagline: { fontFamily: Typography.fontFamilyBody, fontSize: 16 },
  heroImage: {
    width: '100%', height: 300, borderRadius: 16,
  },
  locationLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: Typography.weight.semiBold },
  loadingText: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
});
