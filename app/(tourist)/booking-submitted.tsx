import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

export default function BookingSubmittedScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { businessName, serviceName, date, guests } = useLocalSearchParams<{
    businessName?: string; serviceName?: string; date?: string; guests?: string;
  }>();
  const shadow = isDark ? Shadows.dark.md : Shadows.light.md;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.navBar, { backgroundColor: colors.surface }]}>
          <Text style={[styles.navTitle, { color: colors.primary }]}>‹ Booking submitted</Text>
        </View>

        <Text style={[styles.pageTitle, { color: colors.text }]}>Booking submitted</Text>
        <Text style={[styles.disclaimer, { color: '#57717A' }]}>
          Submitting a request does not confirm availability or a reservation.
        </Text>

        {/* Confirmation card */}
        <View style={[styles.card, { backgroundColor: '#FFFFFF', ...shadow }]}>
          <Text style={[styles.successTitle, { color: '#197151' }]}>✓ Request submitted</Text>
          <Text style={[styles.pendingLabel, { color: '#956112' }]}>Pending business review</Text>

          <View style={[styles.detailsBlock, { borderTopColor: colors.border }]}>
            {businessName ? (
              <Text style={[styles.detailLine, { color: colors.text }]}>🏪 {businessName}</Text>
            ) : null}
            {serviceName ? (
              <Text style={[styles.detailLine, { color: colors.text }]}>🛎 {serviceName}</Text>
            ) : null}
            {date ? (
              <Text style={[styles.detailLine, { color: colors.text }]}>📅 {date}</Text>
            ) : null}
            {guests ? (
              <Text style={[styles.detailLine, { color: colors.text }]}>👥 {guests} guest{guests !== '1' ? 's' : ''}</Text>
            ) : null}
          </View>

          <Text style={[styles.noteText, { color: '#57717A' }]}>
            The business will approve or reject your request after reviewing availability. No payment or reservation is implied.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, borderColor: '#DDE7E7' }]}
            onPress={() => router.push('/(tourist)/booking-history' as any)}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>View Booking History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: '#FFFFFF', borderColor: '#DDE7E7' }]}
            onPress={() => router.push('/(tourist)/businesses' as any)}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Back to Local Businesses</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 100 },
  navBar: { paddingHorizontal: 20, paddingVertical: 18 },
  navTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: '700' },
  pageTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: '700', paddingHorizontal: 20, paddingTop: 20 },
  disclaimer: { fontFamily: Typography.fontFamilyBody, fontSize: 15, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },
  card: {
    marginHorizontal: 20, borderRadius: 18, padding: 24, gap: Spacing.base,
  },
  successTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 30, fontWeight: '700' },
  pendingLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 20, fontWeight: '700' },
  detailsBlock: { borderTopWidth: 1, paddingTop: Spacing.base, gap: Spacing.sm },
  detailLine: { fontFamily: Typography.fontFamilyBody, fontSize: 16 },
  noteText: { fontFamily: Typography.fontFamilyBody, fontSize: 15, lineHeight: 15 * 1.45 },
  primaryBtn: {
    paddingVertical: 13, paddingHorizontal: 16, borderRadius: Radius.lg,
    borderWidth: 1, alignItems: 'center',
  },
  primaryBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: '600' },
  secondaryBtn: {
    paddingVertical: 13, paddingHorizontal: 16, borderRadius: Radius.lg,
    borderWidth: 1, alignItems: 'center',
  },
  secondaryBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: '600' },
});
