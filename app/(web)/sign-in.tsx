import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { WebLayout } from '../../components/web/WebLayout';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { GoogleSignInButton } from '../../components/common/GoogleSignInButton';
import { Typography, Spacing, Radius } from '../../constants/tokens';

WebBrowser.maybeCompleteAuthSession();

export default function WebSignInScreen() {
  const { colors } = useTheme();
  const { signIn, googleSignIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const passwordRef = useRef<React.ElementRef<typeof TextInput>>(null);

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email.';
    if (!password) e.password = 'Password is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignIn() {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      await signIn({ email: email.trim(), password });
    } catch (err: unknown) {
      setErrors({ general: err instanceof Error ? err.message : 'Sign in failed.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
      if (!clientId) {
        const { isNewUser } = await googleSignIn({ id: 'google_demo_' + Date.now(), email: 'demo.google@kalawguide.app', name: 'Google Demo User', picture: undefined });
        if (isNewUser) router.replace('/(web)/role-select' as any);
        return;
      }
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'kalawguide' });
      const request = new AuthSession.AuthRequest({ clientId, scopes: ['openid', 'profile', 'email'], redirectUri, responseType: AuthSession.ResponseType.Token });
      const result = await request.promptAsync({ authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth' });
      if (result.type === 'success' && result.authentication?.accessToken) {
        const info = await (await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${result.authentication.accessToken}`)).json();
        const { isNewUser } = await googleSignIn({ id: info.sub, email: info.email, name: info.name, picture: info.picture });
        if (isNewUser) router.replace('/(web)/role-select' as any);
      }
    } catch (err: unknown) {
      setErrors({ general: err instanceof Error ? err.message : 'Google sign-in failed.' });
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <WebLayout navVariant="public">
      <View style={[styles.authLayout, { backgroundColor: colors.background }]}>
        {/* Left — travel invitation */}
        <View style={styles.invitation}>
          <View style={[styles.invitationInner, { backgroundColor: '#122F3C' }]}>
            <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>K</Text>
            </View>
            <Text style={styles.inviteTitle}>Welcome back to{'\n'}KalawGuide</Text>
            <Text style={styles.inviteDesc}>
              Your travel companion for Mati City, Davao Oriental. Discover destinations, plan budgets, and explore local businesses.
            </Text>
            <View style={styles.inviteFeatures}>
              {FEATURES.map(f => (
                <View key={f} style={styles.inviteFeatureRow}>
                  <Text style={styles.inviteFeatureDot}>✦</Text>
                  <Text style={styles.inviteFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Right — form card */}
        <View style={styles.formSide}>
          <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Sign In</Text>
            <Text style={[styles.formSub, { color: colors.muted }]}>Continue your journey</Text>

            <GoogleSignInButton onPress={handleGoogleSignIn} loading={googleLoading} />

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.muted }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {errors.general && (
              <View style={[styles.errorBanner, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{errors.general}</Text>
              </View>
            )}

            <KalawInput label="Email address" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} blurOnSubmit={false} error={errors.email} />
            <KalawInput label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" returnKeyType="go" onSubmitEditing={handleSignIn} blurOnSubmit ref={passwordRef} error={errors.password} />

            <TouchableOpacity onPress={() => router.push('/(web)/forgot-password' as any)}>
              <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
            </TouchableOpacity>

            <KalawButton label="Sign In" onPress={handleSignIn} loading={loading} fullWidth size="lg" />

            <View style={styles.switchRow}>
              <Text style={[styles.switchText, { color: colors.muted }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(web)/register-tourist' as any)}>
                <Text style={[styles.switchLink, { color: colors.primary }]}>Register as Tourist</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.switchRow}>
              <TouchableOpacity onPress={() => router.push('/(web)/register-business' as any)}>
                <Text style={[styles.switchLink, { color: colors.primary }]}>Register as Business Owner</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </WebLayout>
  );
}

const FEATURES = [
  'Discover beaches, mountains & waterfalls',
  'Plan and track your travel budget',
  'Build day-by-day itineraries',
  'Find verified local businesses',
  'KalawAssistance — offline travel guide',
];

const styles = StyleSheet.create({
  authLayout: {
    flexDirection: 'row',
    paddingHorizontal: 40,
    paddingVertical: 64,
    gap: 72,
    minHeight: 600,
  },
  invitation: { flex: 1 },
  invitationInner: {
    flex: 1, borderRadius: Radius.lg,
    padding: 48, gap: Spacing.lg,
    justifyContent: 'center',
  },
  logoMark: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  inviteTitle: { color: '#FFFFFF', fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h3, fontWeight: Typography.weight.bold, lineHeight: 38 },
  inviteDesc: { color: '#ACC1C8', fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, lineHeight: 26 },
  inviteFeatures: { gap: Spacing.md, marginTop: Spacing.sm },
  inviteFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  inviteFeatureDot: { color: '#6ED8DF', fontSize: 14 },
  inviteFeatureText: { color: '#ACC1C8', fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },

  formSide: { width: 644, justifyContent: 'center' },
  formCard: { borderRadius: 24, padding: 40, gap: Spacing.base },
  formTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h3, fontWeight: Typography.weight.bold },
  formSub: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, marginTop: -Spacing.sm },

  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium },

  errorBanner: { padding: Spacing.md, borderRadius: Radius.sm, borderWidth: 1 },
  errorText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },

  forgotText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'right' },

  switchRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  switchText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  switchLink: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
});
