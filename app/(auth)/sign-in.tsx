import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Typography } from '../../constants/tokens';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { colors } = useTheme();
  const { signIn, googleSignIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface }]}>
        <Text style={[styles.brandTitle, { color: colors.primary }]}>≋  KalawGuide</Text>
        <TouchableOpacity style={[styles.themeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.themeBtnText, { color: colors.text }]}>◐ Theme</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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
                  style={[styles.fieldInput, { color: colors.muted }]}
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
                  style={[styles.fieldInput, { color: colors.muted }]}
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
              <Text style={[styles.rememberRow, { color: colors.muted }]}>
                <Text onPress={() => setRememberMe(v => !v)}>
                  {rememberMe ? '☑' : '□'}{'  '}Remember me
                </Text>
                {'          '}
                <Text style={{ color: colors.muted }} onPress={() => router.push('/(auth)/forgot-password')}>
                  Forgot password?
                </Text>
              </Text>

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
    paddingHorizontal: 20, paddingVertical: 20,
  },
  brandTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.bold },
  themeBtn: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 18,
  },
  themeBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  scroll: { paddingBottom: 64 },
  formWrapper: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 64 },
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
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 18, gap: 8,
  },
  fieldLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  fieldInput: { fontFamily: Typography.fontFamilyBody, fontSize: 12, padding: 0 },
  rememberRow: { fontFamily: Typography.fontFamilyBody, fontSize: 13 },
  roleNote: { fontFamily: Typography.fontFamilyBody, fontSize: 12, marginTop: -10 },
  primaryBtn: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  createAccountText: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: Typography.weight.bold },
  legal: { fontFamily: Typography.fontFamilyBody, fontSize: 12, textAlign: 'center', paddingHorizontal: 20 },
});
