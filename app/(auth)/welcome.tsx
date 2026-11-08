import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { KalawButton } from '../../components/common/KalawButton';
import { Typography, Spacing, Radius } from '../../constants/tokens';
import { storage } from '../../utils/storage';

const ONBOARDED_KEY = 'kalawguide_onboarded';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    storage.getItem(ONBOARDED_KEY).then(val => {
      if (!val) {
        // First launch — go to onboarding
        router.replace('/(auth)/onboarding');
      } else {
        setChecking(false);
      }
    });
  }, []);

  if (checking) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Brand */}
      <View style={styles.brand}>
        <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoText}>K</Text>
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>KalawGuide</Text>
        <Text style={[styles.tagline, { color: colors.muted }]}>
          Discover Mati City, Davao Oriental
        </Text>
        <View style={[styles.badge, { backgroundColor: colors.sand }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>
            📍 Mati City, Davao Oriental, Philippines
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <KalawButton
          label="Sign In"
          onPress={() => router.push('/(auth)/sign-in')}
          fullWidth
          size="lg"
        />
        <KalawButton
          label="Register as Tourist"
          onPress={() => router.push('/(auth)/register-tourist')}
          variant="secondary"
          fullWidth
          size="lg"
        />
        <KalawButton
          label="Register as Business Owner"
          onPress={() => router.push('/(auth)/register-business')}
          variant="ghost"
          fullWidth
        />
      </View>

      <Text style={[styles.legal, { color: colors.muted }]}>
        KalawGuide · Privacy Policy · Terms and Conditions
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, paddingHorizontal: Spacing.xl, justifyContent: 'space-between', paddingVertical: Spacing.xxxl },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.base },
  logoMark: { width: 88, height: 88, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 44, fontWeight: '700', color: '#FFFFFF', fontFamily: Typography.fontFamilyBody },
  appName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h2, fontWeight: Typography.weight.bold },
  tagline: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, textAlign: 'center' },
  badge: { marginTop: Spacing.sm, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.xl },
  badgeText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  actions: { gap: Spacing.md, paddingBottom: Spacing.lg },
  legal: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, textAlign: 'center' },
});
