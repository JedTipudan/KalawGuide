import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { calculateBudget } from '../../services/budget/budgetService';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';
import { Typography, Spacing, Radius } from '../../constants/tokens';
import { BudgetPlan } from '../../types';

export default function BudgetScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('My Mati Trip Budget');
  const [travelers, setTravelers] = useState('1');
  const [days, setDays] = useState('3');
  const [transportation, setTransportation] = useState('');
  const [accommodation, setAccommodation] = useState('');
  const [food, setFood] = useState('');
  const [activities, setActivities] = useState('');
  const [miscellaneous, setMiscellaneous] = useState('');
  const [saving, setSaving] = useState(false);

  const plan: Partial<BudgetPlan> = {
    travelers: Number(travelers) || 1,
    durationDays: Number(days) || 1,
    transportation: Number(transportation) || 0,
    accommodation: Number(accommodation) || 0,
    food: Number(food) || 0,
    activities: Number(activities) || 0,
    miscellaneous: Number(miscellaneous) || 0,
  };

  const summary = calculateBudget(plan);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      const id = generateId();
      await db.runAsync(
        `INSERT INTO budget_plans (id, user_id, title, travelers, duration_days, transportation,
         accommodation, food, activities, miscellaneous, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, user.id, title.trim() || 'My Budget', plan.travelers!, plan.durationDays!,
         plan.transportation!, plan.accommodation!, plan.food!, plan.activities!, plan.miscellaneous!,
         now(), now()]
      );
      const base = Platform.OS === 'web' ? '/(web)' : '/(tourist)';
      router.push({ pathname: `${base}/budget-results`, params: { id } } as any);
    } catch (e) {
      console.error('save budget error:', e);
    } finally {
      setSaving(false);
    }
  }

  const FIELDS = [
    { label: 'Transportation (₱)', placeholder: 'Total transport cost', value: transportation, onChange: setTransportation, hint: 'Bus, van, tricycle, etc.' },
    { label: 'Accommodation per night (₱)', placeholder: '0.00', value: accommodation, onChange: setAccommodation, hint: `× ${days || 1} night(s) = ₱${summary.accommodation.toLocaleString()}` },
    { label: 'Food per person per day (₱)', placeholder: '0.00', value: food, onChange: setFood, hint: `× ${days || 1} day(s) × ${travelers || 1} person(s) = ₱${summary.food.toLocaleString()}` },
    { label: 'Activities (₱)', placeholder: 'Total activity costs', value: activities, onChange: setActivities, hint: 'Tours, entrance fees, etc.' },
    { label: 'Miscellaneous (₱)', placeholder: 'Other expenses', value: miscellaneous, onChange: setMiscellaneous, hint: 'Shopping, tips, emergencies' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Budget Planner</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Estimate your travel costs for Mati City
          </Text>

          <View style={[styles.estimateNote, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
            <Text style={[styles.estimateNoteText, { color: colors.muted }]}>
              ⚠️ All amounts are estimates based on your inputs. Actual costs may vary. Always confirm prices locally.
            </Text>
          </View>

          <View style={styles.form}>
            <KalawInput label="Budget Title" placeholder="e.g. Mati Summer Trip" value={title} onChangeText={setTitle} />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <KalawInput label="Travelers" placeholder="1" value={travelers} onChangeText={setTravelers} keyboardType="number-pad" />
              </View>
              <View style={styles.halfField}>
                <KalawInput label="Days" placeholder="3" value={days} onChangeText={setDays} keyboardType="number-pad" />
              </View>
            </View>

            {FIELDS.map(field => (
              <KalawInput
                key={field.label}
                label={field.label}
                placeholder={field.placeholder}
                value={field.value}
                onChangeText={field.onChange}
                keyboardType="decimal-pad"
                hint={field.hint}
              />
            ))}
          </View>

          {/* Live summary */}
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Estimated Total</Text>
            {[
              { label: 'Transportation', value: summary.transportation },
              { label: 'Accommodation', value: summary.accommodation },
              { label: 'Food', value: summary.food },
              { label: 'Activities', value: summary.activities },
              { label: 'Miscellaneous', value: summary.miscellaneous },
            ].map(row => (
              <View key={row.label} style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>{row.label}</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>₱{row.value.toLocaleString()}</Text>
              </View>
            ))}
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>₱{summary.total.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Per Person</Text>
              <Text style={[styles.summaryValue, { color: colors.accent }]}>₱{summary.perPerson.toLocaleString()}</Text>
            </View>
          </View>

          <KalawButton label="Save Budget Plan" onPress={handleSave} loading={saving} fullWidth size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  header: { marginBottom: -Spacing.sm },
  backBtn: { alignSelf: 'flex-start', padding: Spacing.xs },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  estimateNote: { padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  estimateNoteText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * Typography.lineHeight },
  form: { gap: Spacing.base },
  row: { flexDirection: 'row', gap: Spacing.md },
  halfField: { flex: 1 },
  summaryCard: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  summaryTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  summaryValue: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  summaryDivider: { height: 1 },
  totalLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  totalValue: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
});
