import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { WebLayout } from '../../components/web/WebLayout';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { GoogleSignInButton } from '../../components/common/GoogleSignInButton';
import { Typography, Spacing, Radius } from '../../constants/tokens';
import { rw } from '../../utils/responsive';
import { Kiko } from '../../components/brand/Kiko';
import { promptGoogleProfile, completeGoogleRedirect, hasGoogleRedirect } from '../../services/auth/googlePrompt';


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

  async function finishGoogle(getProfile: () => Promise<Awaited<ReturnType<typeof promptGoogleProfile>>>) {
    setGoogleLoading(true);
    try {
      const profile = await getProfile();
      if (!profile) return; // user cancelled at Google
      const { isNewUser } = await googleSignIn(profile);
      if (isNewUser) router.replace('/(web)/role-select' as any);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
      setErrors({ general: msg });
    } finally {
      setGoogleLoading(false);
    }
  }

  // The button leaves the page for Google; Google sends the tab back here to finish signing in.
  const handleGoogleSignIn = () => finishGoogle(promptGoogleProfile);
  useEffect(() => {
    if (hasGoogleRedirect()) {
      Promise.resolve().then(() => finishGoogle(completeGoogleRedirect));
    }
    // Runs once, when Google redirects back to this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WebLayout navVariant="public">
      <View {...rw('stack pad vpad')} style={[styles.authLayout, { backgroundColor: colors.background }]}>
        {/* Left — travel invitation */}
        <View {...rw('hide-sm')} style={styles.invitation}>
          <View style={[styles.invitationInner, { backgroundColor: colors.subtle, borderWidth: 1, borderColor: colors.border }]}>
            <Kiko pose="map" height={170} />
            <Text style={[styles.inviteTitle, { color: colors.text }]}>Welcome back to{'\n'}KalawGuide</Text>
            <Text style={[styles.inviteDesc, { color: colors.muted }]}>
              Your travel companion for Mati City, Davao Oriental. Discover destinations, plan budgets, and explore local businesses.
            </Text>
            <View style={styles.inviteFeatures}>
              {FEATURES.map(f => (
                <View key={f} style={styles.inviteFeatureRow}>
                  <Text style={[styles.inviteFeatureDot, { color: colors.primary }]}>✦</Text>
                  <Text style={[styles.inviteFeatureText, { color: colors.text }]}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Right — form card */}
        <View {...rw('full')} style={styles.formSide}>
          <View {...rw('card')} style={[styles.formCard, { backgroundColor: colors.surface }]}>
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
  inviteDesc: { color: '#CBD5E1', fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, lineHeight: 26 },
  inviteFeatures: { gap: Spacing.md, marginTop: Spacing.sm },
  inviteFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  inviteFeatureDot: { color: '#22B8C7', fontSize: 14 },
  inviteFeatureText: { color: '#CBD5E1', fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },

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
