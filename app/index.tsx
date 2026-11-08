import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Typography, Radius } from '../constants/tokens';

export default function IndexScreen() {
  const { colors } = useTheme();

  // On web, only this file renders when the URL is exactly "/".
  // For any other URL (e.g. /(web)/explore on refresh), Expo Router
  // renders that screen directly — this file never runs.
  if (Platform.OS === 'web') return <Redirect href={'/(web)/landing' as any} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={[styles.logoMark, { backgroundColor: '#FFFFFF22' }]}>
        <Text style={styles.logoText}>K</Text>
      </View>
      <Text style={styles.appName}>KalawGuide</Text>
      <Text style={styles.tagline}>Discover Mati City</Text>
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
