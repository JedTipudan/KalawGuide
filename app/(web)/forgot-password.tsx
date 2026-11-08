import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { WebLayout } from '../../components/web/WebLayout';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { Typography, Spacing, Radius } from '../../constants/tokens';

export default function WebForgotPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setSubmitted(true);
  }

  return (
    <WebLayout navVariant="public">
      <View style={[styles.authLayout, { backgroundColor: colors.background }]}>
        <View style={styles.invitation}>
          <View style={[styles.invitationInner, { backgroundColor: '#122F3C' }]}>
            <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>K</Text>
            </View>
            <Text style={styles.inviteTitle}>Reset your{'\n'}password</Text>
            <Text style={styles.inviteDesc}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>
          </View>
        </View>

        <View style={styles.formSide}>
          <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
            {submitted ? (
              <View style={styles.successState}>
                <Text style={styles.successIcon}>✉️</Text>
                <Text style={[styles.formTitle, { color: colors.text }]}>Check your email</Text>
                <Text style={[styles.formSub, { color: colors.muted }]}>
                  If an account exists for {email}, you'll receive password reset instructions shortly.
                </Text>
                <KalawButton label="Back to Sign In" onPress={() => router.push('/(web)/sign-in' as any)} fullWidth size="lg" />
              </View>
            ) : (
              <>
                <Text style={[styles.formTitle, { color: colors.text }]}>Forgot Password</Text>
                <Text style={[styles.formSub, { color: colors.muted }]}>We'll send reset instructions to your email</Text>
                <KalawInput label="Email address" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" error={error} />
                <KalawButton label="Send Reset Instructions" onPress={handleSubmit} fullWidth size="lg" />
                <TouchableOpacity onPress={() => router.push('/(web)/sign-in' as any)} style={styles.backLink}>
                  <Text style={[styles.backLinkText, { color: colors.primary }]}>← Back to Sign In</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  authLayout: { flexDirection: 'row', paddingHorizontal: 40, paddingVertical: 64, gap: 72, minHeight: 600 },
  invitation: { flex: 1 },
  invitationInner: { flex: 1, borderRadius: Radius.lg, padding: 48, gap: Spacing.lg, justifyContent: 'center' },
  logoMark: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  inviteTitle: { color: '#FFFFFF', fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h3, fontWeight: Typography.weight.bold, lineHeight: 38 },
  inviteDesc: { color: '#ACC1C8', fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, lineHeight: 26 },
  formSide: { width: 644, justifyContent: 'center' },
  formCard: { borderRadius: 24, padding: 40, gap: Spacing.base },
  formTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h3, fontWeight: Typography.weight.bold },
  formSub: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, marginTop: -Spacing.sm },
  successState: { alignItems: 'center', gap: Spacing.base },
  successIcon: { fontSize: 48 },
  backLink: { alignItems: 'center' },
  backLinkText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
});
