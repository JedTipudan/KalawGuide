import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { Typography, Spacing, Radius } from '../../constants/tokens';

export default function VerificationPendingScreen() {
  const { colors } = useTheme();
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.warning + '20' }]}>
          <Text style={styles.icon}>⏳</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Verification Pending</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Your business account has been submitted for review. An administrator will verify your information and approve your listing.
        </Text>
        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statusLabel, { color: colors.muted }]}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
            <Text style={[styles.statusText, { color: colors.warning }]}>Pending Verification</Text>
          </View>
        </View>
        <Text style={[styles.note, { color: colors.muted }]}>
          You will be notified once your business has been reviewed. This typically takes 1–3 business days.
        </Text>
        <KalawButton label="Sign Out" onPress={signOut} variant="secondary" fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: Spacing.xl, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  iconWrapper: { width: 80, height: 80, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 36 },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold, textAlign: 'center' },
  body: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, textAlign: 'center', lineHeight: Typography.size.bodyLg * Typography.lineHeight },
  statusCard: { width: '100%', padding: Spacing.base, borderRadius: Radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.xl },
  statusText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  note: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center', lineHeight: Typography.size.body * Typography.lineHeight },
});
