import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { Typography, Spacing, Radius } from '../../constants/tokens';

export default function RoleSelectScreen() {
  const { colors } = useTheme();
  const { setRole, signOut } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<'tourist' | 'business_owner' | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!selected) return;
    setLoading(true);
    try {
      await setRole(selected);
      if (selected === 'tourist') {
        router.replace('/(tourist)/(tabs)/home');
      } else {
        router.replace('/(business)/dashboard');
      }
    } catch (e) {
      console.error('setRole error:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>How will you use KalawGuide?</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Choose your account type. You can only select one.
        </Text>

        <View style={styles.options}>
          {ROLES.map(role => (
            <TouchableOpacity
              key={role.value}
              style={[
                styles.option,
                {
                  backgroundColor: selected === role.value ? colors.primary + '15' : colors.surface,
                  borderColor: selected === role.value ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelected(role.value as 'tourist' | 'business_owner')}
              activeOpacity={0.8}
            >
              <Text style={styles.optionIcon}>{role.icon}</Text>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>{role.title}</Text>
                <Text style={[styles.optionDesc, { color: colors.muted }]}>{role.description}</Text>
              </View>
              <View style={[
                styles.radio,
                { borderColor: selected === role.value ? colors.primary : colors.border },
              ]}>
                {selected === role.value && (
                  <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <KalawButton
          label="Continue"
          onPress={handleContinue}
          disabled={!selected}
          loading={loading}
          fullWidth
          size="lg"
        />
        <KalawButton
          label="Cancel"
          onPress={async () => { await signOut(); router.replace('/(auth)/welcome'); }}
          variant="ghost"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const ROLES = [
  {
    value: 'tourist',
    icon: '🧳',
    title: 'Tourist',
    description: 'Discover destinations, plan trips, track expenses, and book local services.',
  },
  {
    value: 'business_owner',
    icon: '🏪',
    title: 'Business Owner',
    description: 'List your business, manage products and services, and receive booking requests.',
  },
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: Spacing.xl, gap: Spacing.lg, justifyContent: 'center' },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg },
  options: { gap: Spacing.md },
  option: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.base, borderRadius: Radius.md, borderWidth: 2, gap: Spacing.md,
  },
  optionIcon: { fontSize: 28 },
  optionText: { flex: 1, gap: Spacing.xs },
  optionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  optionDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * Typography.lineHeight },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
