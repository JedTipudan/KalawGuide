import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { calculateBudget } from '../../services/budget/budgetService';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';
import { Typography } from '../../constants/tokens';
import { BudgetPlan } from '../../types';

export default function BudgetScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [destination, setDestination] = useState('Mati City');
  const [travelers, setTravelers] = useState('2');
  const [travelDate, setTravelDate] = useState('');
  const [days, setDays] = useState('3');
  const [transportation, setTransportation] = useState('2000');
  const [accommodation, setAccommodation] = useState('4000');
  const [food, setFood] = useState('3000');
  const [activities, setActivities] = useState('2000');
  const [other, setOther] = useState('1000');
  const [saving, setSaving] = useState(false);
  const [calculated, setCalculated] = useState(false);

  const plan: Partial<BudgetPlan> = {
    travelers: Number(travelers) || 1,
    durationDays: Number(days) || 1,
    transportation: Number(transportation) || 0,
    accommodation: Number(accommodation) || 0,
    food: Number(food) || 0,
    activities: Number(activities) || 0,
    miscellaneous: Number(other) || 0,
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
        [id, user.id, `Trip to ${destination}`, plan.travelers!, plan.durationDays!,
         plan.transportation!, plan.accommodation!, plan.food!, plan.activities!, plan.miscellaneous!,
         now(), now()]
      );
      const base = Platform.OS === 'web' ? '/(web)' : '/(tourist)';
      router.push({ pathname: `${base}/budget-results`, params: { id } } as any);
    } catch (e) { /* silent */ } finally { setSaving(false); }
  }

  const FIELDS = [
    { label: 'Destination', placeholder: 'Mati City', value: destination, onChange: setDestination },
    { label: 'Number of travelers', placeholder: '2 travelers', value: travelers, onChange: setTravelers },
    { label: 'Travel date', placeholder: '12 June 2027', value: travelDate, onChange: setTravelDate },
    { label: 'Number of days', placeholder: '3 days', value: days, onChange: setDays },
    { label: 'Transportation · total', placeholder: '₱2,000', value: transportation, onChange: setTransportation },
    { label: 'Accommodation · total', placeholder: '₱4,000', value: accommodation, onChange: setAccommodation },
    { label: 'Food budget · total', placeholder: '₱3,000', value: food, onChange: setFood },
    { label: 'Activities · total', placeholder: '₱2,000', value: activities, onChange: setActivities },
    { label: 'Other expenses · total', placeholder: '₱1,000', value: other, onChange: setOther },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Nav bar — mobile only; on web the top WebNav handles navigation */}
      {Platform.OS !== 'web' && (
        <View style={[styles.navBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tourist)/(tabs)/home' as any))}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.navTitle, { color: colors.primary }]}>‹ Budget planner</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tourist)/settings' as any)}>
            <Text style={[styles.menuIcon, { color: colors.text }]}>☰</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>Plan your travel budget</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Use your own estimates. Save a budget that works for you.
            </Text>

            {/* Inputs card */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Your trip, your numbers</Text>
              {FIELDS.map(f => (
                <View key={f.label} style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: colors.muted }]}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.muted}
                    value={f.value}
                    onChangeText={f.onChange}
                    keyboardType={['Destination', 'Travel date'].includes(f.label) ? 'default' : 'decimal-pad'}
                  />
                </View>
              ))}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => setCalculated(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>Calculate Budget</Text>
              </TouchableOpacity>
            </View>

            {/* Budget estimate card */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.estimateLabel, { color: colors.accent }]}>YOUR ESTIMATED BUDGET</Text>
              <Text style={[styles.estimateTotal, { color: colors.primary }]}>
                ₱{summary.total.toLocaleString()}
              </Text>
              <Text style={[styles.estimatePerPerson, { color: colors.muted }]}>
                ₱{summary.perPerson.toLocaleString()} per person · {travelers || 1} travelers
              </Text>
              {[
                { label: 'Transportation', value: summary.transportation },
                { label: 'Accommodation', value: summary.accommodation },
                { label: 'Food', value: summary.food },
                { label: 'Activities', value: summary.activities },
                { label: 'Other expenses', value: summary.miscellaneous },
              ].map(row => (
                <Text key={row.label} style={[styles.breakdownRow, { color: colors.text }]}>
                  {row.label}{'     '}₱{row.value.toLocaleString()}
                </Text>
              ))}
              <Text style={[styles.disclaimer, { color: colors.muted }]}>
                Example traveler-entered amounts, not verified prices. Category amounts are totals for the whole trip.
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
                  {saving ? 'Saving…' : 'Save Budget'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push('/(tourist)/(tabs)/trips' as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Add to Itinerary</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  navTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 21, fontWeight: Typography.weight.bold },
  menuIcon: { fontFamily: Typography.fontFamilyBody, fontSize: 22 },
  scroll: { paddingBottom: 100 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 72, gap: 24 },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: 15, marginTop: -16 },
  card: { borderRadius: 18, padding: 24, gap: 14 },
  cardTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.bold },
  field: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 18, gap: 8,
  },
  fieldLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  fieldInput: { fontFamily: Typography.fontFamilyBody, fontSize: 12, padding: 0 },
  primaryBtn: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center',
  },
  primaryBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  secondaryBtn: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center',
  },
  secondaryBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  estimateLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: Typography.weight.bold },
  estimateTotal: { fontFamily: Typography.fontFamilyBody, fontSize: 44, fontWeight: Typography.weight.bold },
  estimatePerPerson: { fontFamily: Typography.fontFamilyBody, fontSize: 14, marginTop: -8 },
  breakdownRow: { fontFamily: Typography.fontFamilyBody, fontSize: 15 },
  disclaimer: { fontFamily: Typography.fontFamilyBody, fontSize: 12, lineHeight: 18 },
});
