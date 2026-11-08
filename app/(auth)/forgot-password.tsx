import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { Typography, Spacing, Radius } from '../../constants/tokens';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return; }
    setLoading(true);
    setError('');
    // Simulate — in production this calls the backend
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: colors.text }]}>Reset password</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Enter your email and we'll send you a reset link.
            </Text>
          </View>

          {submitted ? (
            <View style={[styles.successBanner, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
              <Text style={[styles.successText, { color: colors.success }]}>
                ✓ If an account exists for {email}, a reset link has been sent. Check your inbox.
              </Text>
            </View>
          ) : (
            <View style={styles.form}>
              <KalawInput
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                error={error}
              />
              <KalawButton label="Send Reset Link" onPress={handleSubmit} loading={loading} fullWidth size="lg" />
            </View>
          )}

          <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')} style={styles.signInLink}>
            <Text style={[styles.signInText, { color: colors.primary }]}>Back to Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  backButton: { alignSelf: 'flex-start', padding: Spacing.xs },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  titleSection: { gap: Spacing.xs },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h3, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg },
  form: { gap: Spacing.base },
  successBanner: { padding: Spacing.base, borderRadius: Radius.md, borderWidth: 1 },
  successText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * Typography.lineHeight },
  signInLink: { alignSelf: 'center' },
  signInText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
});
