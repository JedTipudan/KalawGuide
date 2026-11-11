import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawAssistanceFAB } from '../../components/assistant/KalawAssistanceFAB';
import { getDatabase } from '../../database/migrations/init';
import { calculateTotalExpenses } from '../../services/budget/budgetService';
import { formatShortDate } from '../../utils/helpers';
import { Typography } from '../../constants/tokens';
import { ExpenseCategory } from '../../types';

interface ExpenseRow {
  id: string; name: string; amount: number; category: ExpenseCategory;
  date: string; description: string | null;
}

export default function ExpensesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const rows = await db.getAllAsync<ExpenseRow>(
      'SELECT id, name, amount, category, date, description FROM expenses WHERE user_id = ? ORDER BY date DESC, created_at DESC',
      [user.id]
    );
    setExpenses(rows);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function handleDelete(id: string) {
    if (Platform.OS === 'web') {
      if (!window.confirm('Remove this expense?')) return;
    } else {
      await new Promise<void>(resolve =>
        Alert.alert('Delete Expense', 'Remove this expense?', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
          { text: 'Delete', style: 'destructive', onPress: async () => {
            const db = await getDatabase();
            await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
            setExpenses(prev => prev.filter(e => e.id !== id));
            resolve();
          }},
        ])
      );
      return;
    }
    const db = await getDatabase();
    await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  const total = calculateTotalExpenses(expenses);
  const estimated = 12000;
  const remaining = Math.max(0, estimated - total);
  const remainingPct = Math.round((remaining / estimated) * 100);
  const base = Platform.OS === 'web' ? '/(web)' : '/(tourist)';

  const CATEGORIES = [
    { key: 'transportation', label: 'Transportation', estimated: 2000 },
    { key: 'accommodation', label: 'Accommodation', estimated: 4000 },
    { key: 'food', label: 'Food', estimated: 3000 },
    { key: 'activities', label: 'Activities', estimated: 2000 },
    { key: 'shopping', label: 'Shopping', estimated: 0 },
    { key: 'other', label: 'Other', estimated: 1000 },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Nav bar */}
      <View style={[styles.navBar, { backgroundColor: colors.surface }]}>
        <Text style={[styles.navTitle, { color: colors.primary }]}>‹ Expense tracker</Text>
        <TouchableOpacity onPress={() => router.push(`${base}/settings` as any)}>
          <Text style={[styles.menuIcon, { color: colors.text }]}>☰</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Your trip spending</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Compare your plan with your actual travel expenses.
          </Text>

          {/* Summary cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.summaryCardLabel, { color: colors.muted }]}>Estimated budget</Text>
              <Text style={[styles.summaryCardValue, { color: colors.primary }]}>₱{estimated.toLocaleString()}</Text>
              <Text style={[styles.summaryCardSub, { color: colors.muted }]}>Example trip budget</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.summaryCardLabel, { color: colors.muted }]}>Actual expenses</Text>
              <Text style={[styles.summaryCardValue, { color: colors.primary }]}>₱{total.toLocaleString()}</Text>
              <Text style={[styles.summaryCardSub, { color: colors.muted }]}>{expenses.length} recorded expenses</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.summaryCardLabel, { color: colors.muted }]}>Remaining budget</Text>
              <Text style={[styles.summaryCardValue, { color: colors.primary }]}>₱{remaining.toLocaleString()}</Text>
              <Text style={[styles.summaryCardSub, { color: colors.muted }]}>{remainingPct}% remaining</Text>
            </View>
          </View>

          {/* Add Expense button */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`${base}/add-expense` as any)}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>Add Expense</Text>
          </TouchableOpacity>

          {/* Comparison card */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Your plan compared with your spending</Text>
            {CATEGORIES.map(cat => {
              const actual = expenses.filter(e => e.category === cat.key).reduce((s, e) => s + e.amount, 0);
              const pct = cat.estimated > 0 ? Math.min(1, actual / cat.estimated) : 0;
              return (
                <View key={cat.key} style={styles.catRow}>
                  <Text style={[styles.catLabel, { color: colors.text }]}>
                    {cat.label} · Estimated ₱{cat.estimated.toLocaleString()} / Actual ₱{actual.toLocaleString()}
                  </Text>
                  <View style={[styles.barBg, { backgroundColor: colors.subtle }]}>
                    <View style={[styles.barFill, { backgroundColor: colors.accent, width: `${Math.max(2, pct * 100)}%` as any }]} />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Expense history */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Recent expenses · {expenses.length === 0 ? 'Example records' : `${expenses.length} records`}
            </Text>
            {expenses.length === 0 ? (
              <>
                <Text style={[styles.historyRow, { color: colors.text }]}>Transportation · 12 June · ₱1,200</Text>
                <Text style={[styles.historyRow, { color: colors.text }]}>Accommodation · 12 June · ₱2,000</Text>
                <Text style={[styles.historyRow, { color: colors.text }]}>Food · 12 June · ₱1,000</Text>
                <Text style={[styles.manageLink, { color: colors.primary }]}>Manage expense · Edit · Remove</Text>
              </>
            ) : expenses.slice(0, 5).map(item => (
              <View key={item.id} style={styles.historyItem}>
                <Text style={[styles.historyRow, { color: colors.text }]}>
                  {item.category} · {formatShortDate(item.date)} · ₱{item.amount.toLocaleString()}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={[styles.deleteText, { color: colors.danger }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {Platform.OS !== 'web' && <KalawAssistanceFAB />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  navTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 21, fontWeight: Typography.weight.bold },
  menuIcon: { fontFamily: Typography.fontFamilyBody, fontSize: 22 },
  scroll: { paddingBottom: 100 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 72, gap: 28 },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: 15, marginTop: -20 },
  summaryRow: { gap: 20 },
  summaryCard: { borderRadius: 18, padding: 24, gap: 14 },
  summaryCardLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 12 },
  summaryCardValue: { fontFamily: Typography.fontFamilyBody, fontSize: 30, fontWeight: Typography.weight.bold },
  summaryCardSub: { fontFamily: Typography.fontFamilyBody, fontSize: 12 },
  primaryBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  card: { borderRadius: 18, padding: 24, gap: 14 },
  cardTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.bold },
  catRow: { gap: 6 },
  catLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  barBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  historyRow: { fontFamily: Typography.fontFamilyBody, fontSize: 15 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  manageLink: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: Typography.weight.bold },
  deleteText: { fontFamily: Typography.fontFamilyBody, fontSize: 13, fontWeight: Typography.weight.bold },
});
