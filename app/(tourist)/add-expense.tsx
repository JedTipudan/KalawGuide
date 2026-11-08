import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { KalawInput } from '../../components/common/KalawInput';
import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';
import { Typography, Spacing, Radius } from '../../constants/tokens';
import { ExpenseCategory } from '../../types';

const CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: 'transportation', label: 'Transportation', icon: '🚌' },
  { value: 'accommodation', label: 'Accommodation', icon: '🏨' },
  { value: 'food', label: 'Food', icon: '🍽' },
  { value: 'activities', label: 'Activities', icon: '🏄' },
  { value: 'shopping', label: 'Shopping', icon: '🛍' },
  { value: 'other', label: 'Other', icon: '💸' },
];

export default function AddExpenseScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Expense name is required.';
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = 'Enter a valid amount greater than 0.';
    if (!date.trim()) e.date = 'Date is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !user) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO expenses (id, user_id, name, amount, category, date, description, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only')`,
        [generateId(), user.id, name.trim(), Number(amount), category, date, description.trim() || null, now(), now()]
      );
      router.back();
    } catch (e) {
      console.error('add expense error:', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>Add Expense</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Record an actual expense from your trip</Text>

          <View style={styles.form}>
            <KalawInput
              label="Expense Name *"
              placeholder="e.g. Tricycle to Dahican Beach"
              value={name}
              onChangeText={setName}
              error={errors.name}
            />

            <KalawInput
              label="Amount (₱) *"
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              error={errors.amount}
            />

            <KalawInput
              label="Date *"
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={setDate}
              error={errors.date}
              hint="Format: YYYY-MM-DD"
            />

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Category</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map(cat => {
                  const active = category === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.catOption,
                        {
                          backgroundColor: active ? colors.primary + '20' : colors.surface,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setCategory(cat.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.catIcon}>{cat.icon}</Text>
                      <Text style={[styles.catLabel, { color: active ? colors.primary : colors.text }]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <KalawInput
              label="Description"
              placeholder="Optional notes"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          <KalawButton label="Save Expense" onPress={handleSave} loading={saving} fullWidth size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  backBtn: { alignSelf: 'flex-start', padding: Spacing.xs },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  form: { gap: Spacing.base },
  fieldGroup: { gap: Spacing.sm },
  fieldLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.lg, borderWidth: 1.5,
  },
  catIcon: { fontSize: 16 },
  catLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
});
