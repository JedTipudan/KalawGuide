import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { calculateBudget } from '../../services/budget/budgetService';
import { getDatabase } from '../../database/migrations/init';
import { formatCurrency, formatShortDate } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';
import { BudgetPlan } from '../../types';

export default function BudgetResultsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<BudgetPlan | null>(null);
  const shadow = isDark ? Shadows.dark.md : Shadows.light.md;

  useEffect(() => {
    if (!id) return;
    getDatabase().then(db =>
      db.getFirstAsync<{
        id: string; user_id: string; title: string; destination_name: string | null;
        travelers: number; duration_days: number; transportation: number;
        accommodation: number; food: number; activities: number; miscellaneous: number;
        created_at: string; updated_at: string;
      }>('SELECT * FROM budget_plans WHERE id = ?', [id])
    ).then(row => {
      if (row) setPlan({
        id: row.id, userId: row.user_id, title: row.title,
        destinationName: row.destination_name ?? undefined,
        travelers: row.travelers, durationDays: row.duration_days,
        transportation: row.transportation, accommodation: row.accommodation,
        food: row.food, activities: row.activities, miscellaneous: row.miscellaneous,
        createdAt: row.created_at, updatedAt: row.updated_at,
      });
    });
  }, [id]);

  if (!plan) return null;

  const summary = calculateBudget(plan);

  const BREAKDOWN = [
    { label: '🚌 Transportation', value: summary.transportation, desc: 'Total transport costs' },
    { label: '🏨 Accommodation', value: summary.accommodation, desc: `₱${plan.accommodation.toLocaleString()} × ${plan.durationDays} night(s)` },
    { label: '🍽 Food', value: summary.food, desc: `₱${plan.food.toLocaleString()} × ${plan.durationDays} day(s) × ${plan.travelers} person(s)` },
    { label: '🏄 Activities', value: summary.activities, desc: 'Total activity costs' },
    { label: '🛍 Miscellaneous', value: summary.miscellaneous, desc: 'Other expenses' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>{plan.title}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>
          {plan.travelers} traveler{plan.travelers !== 1 ? 's' : ''} · {plan.durationDays} day{plan.durationDays !== 1 ? 's' : ''} · {formatShortDate(plan.createdAt)}
        </Text>

        <View style={[styles.heroCard, { backgroundColor: colors.primary, ...shadow }]}>
          <Text style={[styles.heroLabel, { color: colors.onPrimary + 'CC' }]}>Estimated Total</Text>
          <Text style={[styles.heroTotal, { color: colors.onPrimary }]}>{formatCurrency(summary.total)}</Text>
          <Text style={[styles.heroPerPerson, { color: colors.onPrimary + 'CC' }]}>
            {formatCurrency(summary.perPerson)} per person
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cost Breakdown</Text>
        {BREAKDOWN.map(item => (
          <View key={item.label} style={[styles.breakdownRow, { backgroundColor: colors.surface }]}>
            <View style={styles.breakdownLeft}>
              <Text style={[styles.breakdownLabel, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.breakdownDesc, { color: colors.muted }]}>{item.desc}</Text>
            </View>
            <Text style={[styles.breakdownValue, { color: item.value > 0 ? colors.text : colors.muted }]}>
              {formatCurrency(item.value)}
            </Text>
          </View>
        ))}

        <View style={[styles.note, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
          <Text style={[styles.noteText, { color: colors.muted }]}>
            ⚠️ These are estimates based on your inputs. Actual costs may vary — always confirm prices locally.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]} onPress={() => router.push(`${Platform.OS === 'web' ? '/(web)' : '/(tourist)'}/expenses` as any)}>
            <Text style={styles.actionIcon}>🧾</Text>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Track Expenses</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]} onPress={() => router.push(`${Platform.OS === 'web' ? '/(web)' : '/(tourist)'}/trips` as any)}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Plan Itinerary</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  backBtn: { alignSelf: 'flex-start', padding: Spacing.xs },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  meta: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  heroCard: { borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  heroLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  heroTotal: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h2, fontWeight: Typography.weight.bold },
  heroPerPerson: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base, borderRadius: Radius.md, gap: Spacing.md },
  breakdownLeft: { flex: 1, gap: Spacing.xs },
  breakdownLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.medium },
  breakdownDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  breakdownValue: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  note: { padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  noteText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * Typography.lineHeight },
  actions: { flexDirection: 'row', gap: Spacing.md },
  actionBtn: { flex: 1, alignItems: 'center', padding: Spacing.base, borderRadius: Radius.md, gap: Spacing.sm },
  actionIcon: { fontSize: 28 },
  actionLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium, textAlign: 'center' },
});
