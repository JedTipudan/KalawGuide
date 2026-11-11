import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/tokens';
import { storage } from '../../utils/storage';

const ONBOARDED_KEY = 'kalawguide_onboarded';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    storage.getItem(ONBOARDED_KEY).then(val => {
      if (!val) router.replace('/(auth)/onboarding');
      else setChecking(false);
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
      {/* App bar */}
      <View style={[styles.appBar, { backgroundColor: colors.surface }]}>
        <Text style={[styles.appBarTitle, { color: colors.primary }]}>≋ KalawGuide</Text>
        <TouchableOpacity>
          <Text style={[styles.menuIcon, { color: colors.text }]}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Hero placeholder */}
        <View style={[styles.hero, { backgroundColor: colors.subtle }]}>
          <Text style={styles.heroEmoji}>🏖</Text>
        </View>

        <Text style={[styles.locationLabel, { color: colors.accent }]}>MATI CITY · DAVAO ORIENTAL</Text>
        <Text style={[styles.heading, { color: colors.text }]}>
          Your next adventure,{'\n'}a little more local.
        </Text>
        <Text style={[styles.tagline, { color: colors.muted }]}>Discover. Plan. Go.</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(auth)/sign-in')}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/(auth)/register-tourist')}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Register as Tourist</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/(auth)/register-business')}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Register as Business Owner</Text>
        </TouchableOpacity>

        <Text style={[styles.legal, { color: colors.muted }]}>
          KalawGuide · Privacy Policy · Terms and Conditions
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  appBarTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.semiBold },
  menuIcon: { fontFamily: Typography.fontFamilyBody, fontSize: 22 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  hero: { width: '100%', height: 260, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 72 },
  locationLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: Typography.weight.semiBold },
  heading: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: Typography.weight.bold, lineHeight: 40 },
  tagline: { fontFamily: Typography.fontFamilyBody, fontSize: 16 },
  actions: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  primaryBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  secondaryBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  secondaryBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  legal: { fontFamily: Typography.fontFamilyBody, fontSize: 12, textAlign: 'center', marginTop: 4 },
});
