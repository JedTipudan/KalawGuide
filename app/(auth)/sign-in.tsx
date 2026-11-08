import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { GoogleSignInButton } from '../../components/common/GoogleSignInButton';
import { Typography, Spacing, Radius } from '../../constants/tokens';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { colors } = useTheme();
  const { signIn, googleSignIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const passwordRef = useRef<React.ElementRef<typeof TextInput>>(null);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.';
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
      setErrors({ general: err instanceof Error ? err.message : 'Sign in failed. Please try again.' });
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
        if (isNewUser) router.replace('/(auth)/role-select');
        return;
      }
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'kalawguide' });
      const request = new AuthSession.AuthRequest({ clientId, scopes: ['openid', 'profile', 'email'], redirectUri, responseType: AuthSession.ResponseType.Token });
      const result = await request.promptAsync({ authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth' });
      if (result.type === 'success' && result.authentication?.accessToken) {
        const info = await (await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${result.authentication.accessToken}`)).json();
        const { isNewUser } = await googleSignIn({ id: info.sub, email: info.email, name: info.name, picture: info.picture });
        if (isNewUser) router.replace('/(auth)/role-select');
      } else if (result.type !== 'cancel') {
        setErrors({ general: 'Google sign-in failed. Please try again.' });
      }
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
            <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Sign in to continue your journey</Text>
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
                <Text style={[styles.errorBannerText, { color: colors.danger }]}>{errors.general}</Text>
              </View>
            )}

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
              error={errors.email}
            />

            <KalawInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={handleSignIn}
              blurOnSubmit
              ref={passwordRef}
              error={errors.password}
            />

            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
            </TouchableOpacity>

            <KalawButton label="Sign In" onPress={handleSignIn} loading={loading} fullWidth size="lg" />
          </View>

          <View style={styles.registerSection}>
            <Text style={[styles.registerText, { color: colors.muted }]}>Don't have an account?{' '}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register-tourist')}>
              <Text style={[styles.registerLink, { color: colors.primary }]}>Register as Tourist</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.registerSection}>
            <TouchableOpacity onPress={() => router.push('/(auth)/register-business')}>
              <Text style={[styles.registerLink, { color: colors.primary }]}>Register as Business Owner</Text>
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
  errorBannerText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  forgotText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'right' },
  registerSection: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  registerText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  registerLink: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  legal: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, textAlign: 'center' },
});
