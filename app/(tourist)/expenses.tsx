import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawAssistanceFAB } from '../../components/assistant/KalawAssistanceFAB';
import { getDatabase } from '../../database/migrations/init';
import { calculateTotalExpenses, calculateExpenseTotals } from '../../services/budget/budgetService';
import { formatCurrency, formatShortDate } from '../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';
import { ExpenseCategory } from '../../types';

interface ExpenseRow {
  id: string; name: string; amount: number; category: ExpenseCategory;
  date: string; description: string | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  transportation: '🚌', accommodation: '🏨', food: '🍽',
  activities: '🏄', shopping: '🛍', other: '💸',
};

export default function ExpensesScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

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
      const db = await getDatabase();
      await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } else {
      Alert.alert('Delete Expense', 'Remove this expense?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const db = await getDatabase();
          await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
          setExpenses(prev => prev.filter(e => e.id !== id));
        }},
      ]);
    }
  }

  const total = calculateTotalExpenses(expenses);
  const byCategory = calculateExpenseTotals(expenses);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Expenses</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Track your actual spending</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`${Platform.OS === 'web' ? '/(web)' : '/(tourist)'}/add-expense` as any)}
          accessibilityLabel="Add expense"
        >
          <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          expenses.length > 0 ? (
            <View style={styles.summarySection}>
              <View style={[styles.totalCard, { backgroundColor: colors.primary }]}>
                <Text style={[styles.totalLabel, { color: colors.onPrimary + 'CC' }]}>Total Spent</Text>
                <Text style={[styles.totalValue, { color: colors.onPrimary }]}>{formatCurrency(total)}</Text>
              </View>
              <View style={styles.categoryGrid}>
                {Object.entries(byCategory).map(([cat, amount]) => (
                  <View key={cat} style={[styles.catCard, { backgroundColor: colors.surface, ...shadow }]}>
                    <Text style={styles.catIcon}>{CATEGORY_ICONS[cat] ?? '💸'}</Text>
                    <Text style={[styles.catAmount, { color: colors.text }]}>{formatCurrency(amount)}</Text>
                    <Text style={[styles.catLabel, { color: colors.muted }]}>{cat}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : <View />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No expenses yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Tap "+ Add" to start tracking your spending.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.expenseCard, { backgroundColor: colors.surface, ...shadow }]}>
            <View style={[styles.expenseIcon, { backgroundColor: colors.subtle }]}>
              <Text style={styles.expenseIconText}>{CATEGORY_ICONS[item.category] ?? '💸'}</Text>
            </View>
            <View style={styles.expenseInfo}>
              <Text style={[styles.expenseName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.expenseMeta, { color: colors.muted }]}>
                {item.category} · {formatShortDate(item.date)}
              </Text>
              {item.description ? (
                <Text style={[styles.expenseDesc, { color: colors.muted }]} numberOfLines={1}>{item.description}</Text>
              ) : null}
            </View>
            <View style={styles.expenseRight}>
              <Text style={[styles.expenseAmount, { color: colors.text }]}>{formatCurrency(item.amount)}</Text>
              <TouchableOpacity onPress={() => handleDelete(item.id)} accessibilityLabel="Delete expense">
                <Text style={[styles.deleteIcon, { color: colors.danger }]}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      {Platform.OS !== 'web' && <KalawAssistanceFAB />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base, paddingBottom: Spacing.sm },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  addBtn: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.lg },
  addBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },
  summarySection: { gap: Spacing.md, marginBottom: Spacing.md },
  totalCard: { borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', gap: Spacing.xs },
  totalLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  totalValue: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h3, fontWeight: Typography.weight.bold },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  catCard: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', gap: Spacing.xs, minWidth: '28%', flex: 1 },
  catIcon: { fontSize: 22 },
  catAmount: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.semiBold },
  catLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, textTransform: 'capitalize' },
  expenseCard: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  expenseIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  expenseIconText: { fontSize: 22 },
  expenseInfo: { flex: 1, gap: Spacing.xs },
  expenseName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  expenseMeta: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textTransform: 'capitalize' },
  expenseDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  expenseRight: { alignItems: 'flex-end', gap: Spacing.sm },
  expenseAmount: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  deleteIcon: { fontSize: 18 },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  emptySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center', maxWidth: 260 },
});
