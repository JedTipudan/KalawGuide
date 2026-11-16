import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { DestinationCardData, TripBudgetResult, TripCostCategory } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { Icon } from '../common/Icon';
import { Radius, Spacing, Typography } from '../../constants/tokens';

const CATEGORY_LABEL: Record<TripCostCategory, string> = {
  transportation: 'Transportation',
  accommodation: 'Accommodation',
  food: 'Food',
  entrance_fees: 'Entrance fees',
  activities: 'Activities',
  additional: 'Additional',
};

export function PriceBadge({ verified, missing }: { verified: boolean; missing?: boolean }) {
  const { colors } = useTheme();
  const color = missing ? colors.danger : verified ? colors.success : colors.warning;
  const label = missing ? 'Not recorded' : verified ? 'Verified' : 'Estimate';
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function DestinationCard({ data }: { data: DestinationCardData }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${data.name}, ${data.location}. Entrance fee ${data.fee === null ? 'not recorded' : formatCurrency(data.fee)}`}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{data.name}</Text>
      <View style={styles.row}>
        <Icon name="location" size={14} color={colors.muted} />
        <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>{data.location}</Text>
      </View>
      <View style={[styles.row, styles.spaced]}>
        <Text style={[styles.meta, { color: colors.text }]}>
          Entrance: {data.fee === null ? '—' : formatCurrency(data.fee)}
        </Text>
        <PriceBadge verified={data.feeVerified} missing={data.fee === null} />
      </View>
    </View>
  );
}

export function BudgetBreakdownCard({ data }: { data: TripBudgetResult }) {
  const { colors } = useTheme();
  const rows = (Object.keys(data.subtotals) as TripCostCategory[]).filter(k => data.subtotals[k] > 0);
  return (
    <View
      style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`Budget estimate. Group total ${formatCurrency(data.groupTotal)}, ${formatCurrency(data.perPerson)} per person`}
    >
      <View style={[styles.row, styles.spaced]}>
        <View style={styles.row}>
          <Icon name="budget" size={16} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Budget breakdown</Text>
        </View>
        <PriceBadge verified={!data.hasEstimates} />
      </View>
      <Text style={[styles.meta, { color: colors.muted }]}>
        {data.travelers} traveler{data.travelers > 1 ? 's' : ''} · {data.days} day{data.days > 1 ? 's' : ''} · {data.nights} night{data.nights === 1 ? '' : 's'}
      </Text>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      {rows.map(k => (
        <View key={k} style={[styles.row, styles.spaced]}>
          <Text style={[styles.line, { color: colors.text }]}>{CATEGORY_LABEL[k]}</Text>
          <Text style={[styles.line, styles.amount, { color: colors.text }]}>{formatCurrency(data.subtotals[k])}</Text>
        </View>
      ))}
      {data.contingency > 0 && (
        <View style={[styles.row, styles.spaced]}>
          <Text style={[styles.line, { color: colors.muted }]}>Contingency</Text>
          <Text style={[styles.line, styles.amount, { color: colors.muted }]}>{formatCurrency(data.contingency)}</Text>
        </View>
      )}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={[styles.row, styles.spaced]}>
        <Text style={[styles.total, { color: colors.text }]}>Group total</Text>
        <Text style={[styles.total, styles.amount, { color: colors.primary }]}>{formatCurrency(data.groupTotal)}</Text>
      </View>
      <View style={[styles.row, styles.spaced]}>
        <Text style={[styles.line, { color: colors.text }]}>Per person</Text>
        <Text style={[styles.line, styles.amount, { color: colors.text }]}>{formatCurrency(data.perPerson)}</Text>
      </View>
      <View style={[styles.row, styles.spaced]}>
        <Text style={[styles.line, { color: colors.muted }]}>Per person / day</Text>
        <Text style={[styles.line, styles.amount, { color: colors.muted }]}>{formatCurrency(data.dailyPerPerson)}</Text>
      </View>

      {data.missing.length > 0 && (
        <Text style={[styles.meta, { color: colors.danger, marginTop: Spacing.sm }]}>
          {data.missing.length} cost{data.missing.length > 1 ? 's' : ''} not included — price not available
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  spaced: { justifyContent: 'space-between' },
  cardTitle: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.semiBold,
  },
  meta: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, flexShrink: 1 },
  line: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  amount: { fontVariant: ['tabular-nums'] },
  total: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.bodyLg,
    fontWeight: Typography.weight.bold,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.xs },
  badge: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badgeText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.caption, fontWeight: Typography.weight.semiBold },
});
