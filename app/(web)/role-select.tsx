import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { WebLayout } from '../../components/web/WebLayout';
import { KalawButton } from '../../components/common/KalawButton';
import { Typography, Spacing, Radius } from '../../constants/tokens';

export default function WebRoleSelectScreen() {
  const { colors } = useTheme();
  const { setRole } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<'tourist' | 'business_owner' | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!selected) return;
    setLoading(true);
    await setRole(selected);
    if (selected === 'tourist') router.replace('/(web)/home' as any);
    else router.replace('/(web)/business-dashboard' as any);
    setLoading(false);
  }

  return (
    <WebLayout navVariant="public">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>How will you use KalawGuide?</Text>
          <Text style={[styles.sub, { color: colors.muted }]}>Choose your role to get started</Text>

          <View style={styles.options}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.option,
                  { borderColor: selected === r.value ? colors.primary : colors.border, backgroundColor: selected === r.value ? colors.primary + '10' : colors.subtle },
                ]}
                onPress={() => setSelected(r.value as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.optionIcon}>{r.icon}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{r.title}</Text>
                  <Text style={[styles.optionDesc, { color: colors.muted }]}>{r.desc}</Text>
                </View>
                <View style={[styles.radio, { borderColor: selected === r.value ? colors.primary : colors.border }]}>
                  {selected === r.value && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <KalawButton label="Continue" onPress={handleContinue} loading={loading} fullWidth size="lg" disabled={!selected} />
        </View>
      </View>
    </WebLayout>
  );
}

const ROLES = [
  { value: 'tourist', icon: '🗺', title: 'Tourist', desc: 'Discover destinations, plan budgets, and build itineraries.' },
  { value: 'business_owner', icon: '🏪', title: 'Business Owner', desc: 'List and manage your business, handle booking requests.' },
];

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, minHeight: 500 },
  card: { width: 560, borderRadius: 24, padding: 40, gap: Spacing.lg },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h3, fontWeight: Typography.weight.bold, textAlign: 'center' },
  sub: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, textAlign: 'center', marginTop: -Spacing.sm },
  options: { gap: Spacing.md },
  option: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderRadius: Radius.md, borderWidth: 2, gap: Spacing.md },
  optionIcon: { fontSize: 28, width: 36, textAlign: 'center' },
  optionText: { flex: 1, gap: Spacing.xs },
  optionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  optionDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
