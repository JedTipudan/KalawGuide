import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { GoogleSignInButton } from '../../components/common/GoogleSignInButton';
import { Typography, Spacing, Radius } from '../../constants/tokens';

export default function RegisterTouristScreen() {
  const { colors } = useTheme();
  const { register, googleSignIn } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const emailRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const passwordRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const confirmRef = useRef<React.ElementRef<typeof TextInput>>(null);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.displayName = 'Full name is required.';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      await register({ email: email.trim(), password, displayName: displayName.trim(), role: 'tourist' });
    } catch (err: unknown) {
      setErrors({ general: err instanceof Error ? err.message : 'Registration failed.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      const { isNewUser } = await googleSignIn({ id: 'google_demo_' + Date.now(), email: 'demo.google@kalawguide.app', name: 'Google Demo User', picture: undefined });
      if (isNewUser) router.replace('/(auth)/role-select');
    } catch (err: unknown) {
      setErrors({ general: err instanceof Error ? err.message : 'Google sign-in failed.' });
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: colors.text }]}>Create tourist account</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Start exploring Mati City and Davao Oriental</Text>
          </View>

          <GoogleSignInButton onPress={handleGoogleSignIn} loading={googleLoading} />

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.muted }]}>OR CONTINUE WITH EMAIL</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.form}>
            {errors.general && (
              <View style={[styles.errorBanner, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{errors.general}</Text>
              </View>
            )}

            <KalawInput
              label="Full name"
              placeholder="Your full name"
              value={displayName}
              onChangeText={setDisplayName}
              autoComplete="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
              error={errors.displayName}
            />
            <KalawInput
              label="Email address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
              ref={emailRef}
              error={errors.email}
            />
            <KalawInput
              label="Password"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              blurOnSubmit={false}
              ref={passwordRef}
              error={errors.password}
            />
            <KalawInput
              label="Confirm password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleRegister}
              blurOnSubmit
              ref={confirmRef}
              error={errors.confirmPassword}
            />

            <KalawButton label="Create Tourist Account" onPress={handleRegister} loading={loading} fullWidth size="lg" />
          </View>

          <View style={styles.signInRow}>
            <Text style={[styles.signInText, { color: colors.muted }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
              <Text style={[styles.signInLink, { color: colors.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.legal, { color: colors.muted }]}>KalawGuide · Privacy Policy · Terms and Conditions</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  header: { marginBottom: -Spacing.sm },
  backButton: { alignSelf: 'flex-start', padding: Spacing.xs },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  titleSection: { gap: Spacing.xs },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h3, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium },
  form: { gap: Spacing.base },
  errorBanner: { padding: Spacing.md, borderRadius: Radius.sm, borderWidth: 1 },
  errorText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  signInRow: { flexDirection: 'row', justifyContent: 'center' },
  signInText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  signInLink: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  legal: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, textAlign: 'center' },
});
