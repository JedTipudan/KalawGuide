import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { WebLayout } from '../../components/web/WebLayout';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { Typography, Spacing, Radius } from '../../constants/tokens';

export default function WebRegisterBusinessScreen() {
  const { colors } = useTheme();
  const { register } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const passwordRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const confirmRef = useRef<React.ElementRef<typeof TextInput>>(null);

  function validate() {
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
      await register({ email: email.trim(), password, displayName: displayName.trim(), role: 'business_owner' });
    } catch (err: unknown) {
      setErrors({ general: err instanceof Error ? err.message : 'Registration failed.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <WebLayout navVariant="public">
      <View style={[styles.authLayout, { backgroundColor: colors.background }]}>
        <View style={styles.invitation}>
          <View style={[styles.invitationInner, { backgroundColor: '#122F3C' }]}>
            <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>K</Text>
            </View>
            <Text style={styles.inviteTitle}>List your business{'\n'}on KalawGuide</Text>
            <Text style={styles.inviteDesc}>
              Reach tourists visiting Mati City. Create your business profile, manage products and services, and handle booking requests.
            </Text>
            <View style={[styles.infoBanner, { backgroundColor: 'rgba(110,216,223,0.1)', borderColor: 'rgba(110,216,223,0.3)' }]}>
              <Text style={styles.infoText}>
                ℹ️ After registration, submit your business for verification. Your listing will be publicly visible after administrator approval.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.formSide}>
          <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Business Owner Account</Text>
            <Text style={[styles.formSub, { color: colors.muted }]}>Register to list your business</Text>

            {errors.general && (
              <View style={[styles.errorBanner, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{errors.general}</Text>
              </View>
            )}

            <KalawInput label="Full name" placeholder="Your full name" value={displayName} onChangeText={setDisplayName} autoComplete="name" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} blurOnSubmit={false} error={errors.displayName} />
            <KalawInput label="Email address" placeholder="business@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} blurOnSubmit={false} ref={emailRef} error={errors.email} />
            <KalawInput label="Password" placeholder="At least 8 characters" value={password} onChangeText={setPassword} secureTextEntry returnKeyType="next" onSubmitEditing={() => confirmRef.current?.focus()} blurOnSubmit={false} ref={passwordRef} error={errors.password} />
            <KalawInput label="Confirm password" placeholder="Repeat your password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry returnKeyType="go" onSubmitEditing={handleRegister} blurOnSubmit ref={confirmRef} error={errors.confirmPassword} />

            <KalawButton label="Create Business Account" onPress={handleRegister} loading={loading} fullWidth size="lg" />

            <View style={styles.switchRow}>
              <Text style={[styles.switchText, { color: colors.muted }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(web)/sign-in' as any)}>
                <Text style={[styles.switchLink, { color: colors.primary }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.switchRow}>
              <TouchableOpacity onPress={() => router.push('/(web)/register-tourist' as any)}>
                <Text style={[styles.switchLink, { color: colors.primary }]}>Register as Tourist instead</Text>
              </TouchableOpacity>
            </View>
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
  infoBanner: { padding: Spacing.base, borderRadius: Radius.md, borderWidth: 1 },
  infoText: { color: '#6ED8DF', fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: 22 },
  formSide: { width: 644, justifyContent: 'center' },
  formCard: { borderRadius: 24, padding: 40, gap: Spacing.base },
  formTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h3, fontWeight: Typography.weight.bold },
  formSub: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, marginTop: -Spacing.sm },
  errorBanner: { padding: Spacing.md, borderRadius: Radius.sm, borderWidth: 1 },
  errorText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  switchRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  switchText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  switchLink: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
});
