import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Typography } from '../../constants/tokens';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { colors, mode, setMode } = useTheme();
  const themeLabel = mode === 'light' ? '☀ Light' : mode === 'dark' ? '☾ Dark' : '◐ System';
  const cycleTheme = () => setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light');
  const { signIn, googleSignIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  async function handleSignIn() {
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true); setError('');
    try {
      await signIn({ email: email.trim(), password });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally { setLoading(false); }
  }

  async function handleGoogleSignIn() {
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
      }
    } catch { /* silent */ }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Top bar — sits below the status bar (safe-area-context handles Android + iOS) */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.brandTitle, { color: colors.primary }]}>≋  KalawGuide</Text>
        <TouchableOpacity
          onPress={cycleTheme}
          style={[styles.themeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={`Theme: ${mode}. Tap to change.`}
          hitSlop={8}
        >
          <Text style={[styles.themeBtnText, { color: colors.text }]}>{themeLabel}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.formWrapper}>
            <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
              {/* Header */}
              <Text style={[styles.welcomeLabel, { color: colors.accent }]}>WELCOME TO KALAWGUIDE</Text>
              <Text style={[styles.heading, { color: colors.text }]}>Your next adventure{'\n'}starts here.</Text>
              <Text style={[styles.headingSubtitle, { color: colors.muted }]}>
                Welcome back. Sign in to your KalawGuide account.
              </Text>

              {/* Error */}
              {!!error && (
                <View style={[styles.errorBanner, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}>
                  <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                </View>
              )}

              {/* Email field */}
              <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Email or username</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text }]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              {/* Password field */}
              <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  Password · <Text onPress={() => setShowPassword(v => !v)} style={{ color: colors.primary }}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Text>
                <TextInput
                  ref={passwordRef}
                  style={[styles.fieldInput, { color: colors.text }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleSignIn}
                />
              </View>

              {/* Remember me + forgot */}
              <View style={styles.rememberRow}>
                <TouchableOpacity
                  onPress={() => setRememberMe(v => !v)}
                  style={styles.rememberTap}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                >
                  <View style={[styles.checkbox, { borderColor: rememberMe ? colors.primary : colors.muted, backgroundColor: rememberMe ? colors.primary : 'transparent' }]}>
                    {rememberMe && <Text style={[styles.checkMark, { color: colors.onPrimary }]}>✓</Text>}
                  </View>
                  <Text style={[styles.rememberText, { color: colors.muted }]}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.rememberTap}>
                  <Text style={[styles.rememberText, { color: colors.muted }]}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.roleNote, { color: colors.muted }]}>
                Your account role opens your dedicated workspace.
              </Text>

              {/* Sign In button */}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                onPress={handleSignIn}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              {/* Create account */}
              <TouchableOpacity onPress={() => router.push('/(auth)/register-tourist')}>
                <Text style={[styles.createAccountText, { color: colors.primary }]}>
                  New to KalawGuide? Create an Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.legal, { color: colors.muted }]}>
            KalawGuide · Privacy Policy · Terms and Conditions
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1,
  },
  brandTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.bold },
  themeBtn: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center',
  },
  themeBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  scroll: { paddingBottom: 64 },
  formWrapper: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
  formCard: {
    borderRadius: 24, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 18,
  },
  welcomeLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: Typography.weight.bold },
  heading: { fontFamily: Typography.fontFamilyBody, fontSize: 30, fontWeight: Typography.weight.bold, lineHeight: 40 },
  headingSubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: 15, marginTop: -10 },
  errorBanner: { padding: 12, borderRadius: 8, borderWidth: 1 },
  errorText: { fontFamily: Typography.fontFamilyBody, fontSize: 13 },
  field: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 6,
  },
  fieldLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  fieldInput: { fontFamily: Typography.fontFamilyBody, fontSize: 15, paddingVertical: 4, paddingHorizontal: 0, minHeight: 28 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  rememberTap: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 12, fontWeight: Typography.weight.bold, lineHeight: 14 },
  rememberText: { fontFamily: Typography.fontFamilyBody, fontSize: 13 },
  roleNote: { fontFamily: Typography.fontFamilyBody, fontSize: 12, marginTop: -8 },
  primaryBtn: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    alignItems: 'center', minHeight: 48, justifyContent: 'center',
  },
  primaryBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  createAccountText: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: Typography.weight.bold, paddingVertical: 8 },
  legal: { fontFamily: Typography.fontFamilyBody, fontSize: 12, textAlign: 'center', paddingHorizontal: 20 },
});
