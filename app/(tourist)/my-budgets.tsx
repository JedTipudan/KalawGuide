import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KalawButton } from '../../components/common/KalawButton';
import { getDatabase } from '../../database/migrations/init';
import { formatCurrency, formatShortDate } from '../../utils/helpers';
import { calculateBudget } from '../../services/budget/budgetService';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface BudgetRow {
  id: string; title: string; travelers: number; duration_days: number;
  transportation: number; accommodation: number; food: number;
  activities: number; miscellaneous: number; created_at: string;
}

export default function MyBudgetsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const base = Platform.OS === 'web' ? '/(web)' : '/(tourist)';
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const rows = await db.getAllAsync<BudgetRow>(
      'SELECT id, title, travelers, duration_days, transportation, accommodation, food, activities, miscellaneous, created_at FROM budget_plans WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );
    setBudgets(rows);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function handleDelete(id: string) {
    if (Platform.OS === 'web') {
      if (!window.confirm('Remove this budget plan?')) return;
      const db = await getDatabase();
      await db.runAsync('DELETE FROM budget_plans WHERE id = ?', [id]);
      setBudgets(prev => prev.filter(b => b.id !== id));
    } else {
      Alert.alert('Delete Budget', 'Remove this budget plan?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const db = await getDatabase();
          await db.runAsync('DELETE FROM budget_plans WHERE id = ?', [id]);
          setBudgets(prev => prev.filter(b => b.id !== id));
        }},
      ]);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>My Budgets</Text>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No budget plans yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Create a budget plan to estimate your trip costs.
            </Text>
            <KalawButton
              label="Create Budget Plan"
              onPress={() => router.push(`${base}/budget` as any)}
              size="md"
            />
          </View>
        }
        renderItem={({ item }) => {
          const summary = calculateBudget({
            travelers: item.travelers,
            durationDays: item.duration_days,
            transportation: item.transportation,
            accommodation: item.accommodation,
            food: item.food,
            activities: item.activities,
            miscellaneous: item.miscellaneous,
          });
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface, ...shadow }]}
              onPress={() => router.push({ pathname: `${base}/budget-results`, params: { id: item.id } } as any)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.cardMeta, { color: colors.muted }]}>
                    👥 {item.travelers} traveler{item.travelers !== 1 ? 's' : ''} · 📅 {item.duration_days} day{item.duration_days !== 1 ? 's' : ''}
                  </Text>
                  <Text style={[styles.cardDate, { color: colors.muted }]}>Created {formatShortDate(item.created_at)}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatCurrency(summary.total)}</Text>
                  <Text style={[styles.perPerson, { color: colors.muted }]}>{formatCurrency(summary.perPerson)}/person</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.deleteBtn, { borderColor: colors.danger + '60' }]}
                onPress={() => handleDelete(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.deleteBtnText, { color: colors.danger }]}>🗑 Delete</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      {budgets.length > 0 && (
        <View style={styles.fab}>
          <KalawButton
            label="+ New Budget"
            onPress={() => router.push(`${base}/budget` as any)}
            size="md"
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.base, gap: Spacing.sm },
  backBtn: { alignSelf: 'flex-start', padding: Spacing.xs },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  list: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 120 },
  card: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  cardTop: { flexDirection: 'row', gap: Spacing.md },
  cardInfo: { flex: 1, gap: Spacing.xs },
  cardTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  cardMeta: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  cardDate: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label },
  cardRight: { alignItems: 'flex-end', gap: Spacing.xs },
  totalAmount: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  perPerson: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label },
  deleteBtn: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.sm, borderWidth: 1 },
  deleteBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.lg },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  emptySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center', maxWidth: 280 },
  fab: { position: 'absolute', bottom: Spacing.xl, left: Spacing.base, right: Spacing.base },
});
