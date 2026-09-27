import {
  demoFoundation,
  formatSGD,
  type CategoryBudgetRow,
  type MonthSummary,
  type SpendingBreakdownRow,
  type Transaction,
} from '@firebuddy/shared';
import { ArrowUpRight, Landmark } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useTheme } from '@/lib/theme';

import { DonutChart } from '../charts/DonutChart';
import { TransactionRow } from '../transactions/TransactionRow';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { EmptyState } from '../ui/EmptyState';
import { PressOverlay } from '../ui/PressOverlay';
import { ProgressTrack } from '../ui/ProgressTrack';
import { AppText } from '../ui/Text';

/** Forest hero for the headline figure, the first thing on Home. */
export function NetWorthHero({ monthName, onPress }: { monthName: string; onPress: () => void }) {
  const { theme } = useTheme();
  const { netWorth, assets, liabilities, monthlyChange } = demoFoundation;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Net worth, view wealth" onPress={onPress}>
      {({ pressed }) => (
        <Card tone="hero" style={styles.hero}>
          <PressOverlay pressed={pressed} radius={radii.card} light />
          <View style={[styles.heroIcon, { backgroundColor: 'rgba(203, 234, 99, 0.16)' }]}>
            <Landmark size={20} color={theme.railActiveInk} strokeWidth={1.9} />
          </View>
          <AppText variant="overline" tone="heroMuted" style={styles.heroLabel}>Net worth</AppText>
          <AppText variant="heroFigure" tone="hero">{formatSGD(netWorth, 0)}</AppText>
          <Chip label={`${monthlyChange >= 0 ? '+' : '-'}${formatSGD(Math.abs(monthlyChange), 0)} in ${monthName}`} tone="lime" icon={ArrowUpRight} style={styles.heroChip} />
          <View style={[styles.heroMeta, { borderTopColor: theme.heroLine }]}>
            <View style={styles.heroMetaItem}>
              <AppText variant="overline" tone="heroMuted">Assets</AppText>
              <AppText variant="amount" tone="hero">{formatSGD(assets, 0)}</AppText>
            </View>
            <View style={styles.heroMetaItem}>
              <AppText variant="overline" tone="heroMuted">Liabilities</AppText>
              <AppText variant="amount" tone="hero">{formatSGD(liabilities, 0)}</AppText>
            </View>
          </View>
          <AppText variant="label" tone="hero" style={styles.heroLink}>View wealth</AppText>
        </Card>
      )}
    </Pressable>
  );
}

/** "Where it went": income at the top, then a split bar of expenses against savings. */
export function MoneyPulseCard({ summary, monthName }: { summary: MonthSummary; monthName: string }) {
  const { theme } = useTheme();
  const { income, expenses, savings, savingsRate, transactionCount } = summary;
  const scale = Math.max(income, expenses, Math.abs(savings), 1);
  const expenseShare = Math.min(expenses / scale, 1);
  const savingsShare = Math.min(Math.max(savings, 0) / scale, 1 - expenseShare);
  const limited = transactionCount < 3;

  let observationTitle: string | null = null;
  let observationDetail: string | null = null;
  if (income > 0 && savings < 0) {
    observationTitle = `Expenses exceeded income by ${formatSGD(Math.abs(savings), 0)}`;
    observationDetail = `Review the largest expenses recorded in ${monthName}.`;
  } else if (income > 0 && savingsRate !== null) {
    observationTitle = `You saved ${(savingsRate * 100).toFixed(1)}% of recorded income`;
    observationDetail = `${formatSGD(savings, 0)} remained after ${formatSGD(expenses, 0)} of expenses in ${monthName}.`;
  } else if (expenses > 0) {
    observationTitle = `${formatSGD(expenses, 0)} recorded in expenses`;
    observationDetail = `Add income for ${monthName} to see your savings rate.`;
  }

  return (
    <Card>
      <CardHeader title={`${monthName} Money Pulse`} action={limited ? <Chip label="Limited data" tone="warning" style={styles.limited} /> : undefined} />
      <AppText variant="caption" tone="ink2">Income</AppText>
      <AppText variant="metric" style={styles.pulseIncome}>{formatSGD(income, 0)}</AppText>
      <AppText variant="caption" tone="ink2" style={styles.pulseLabel}>Where it went</AppText>
      <View style={[styles.pulseTrack, { backgroundColor: theme.surface2 }]}>
        <View style={[styles.pulseSegment, { flex: expenseShare, backgroundColor: theme.expense }]} />
        <View style={[styles.pulseSegment, { flex: savingsShare, backgroundColor: theme.info }]} />
        <View style={{ flex: Math.max(1 - expenseShare - savingsShare, 0) }} />
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.expense }]} />
          <AppText variant="caption" tone="ink2">Expenses</AppText>
          <AppText variant="amountSmall">{formatSGD(expenses, 0)}</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.info }]} />
          <AppText variant="caption" tone="ink2">Savings</AppText>
          <AppText variant="amountSmall" tone={savings < 0 ? 'expense' : 'ink'}>{savings < 0 ? '-' : ''}{formatSGD(savings, 0)}</AppText>
          {savingsRate !== null ? <AppText variant="caption" tone="ink3">{(savingsRate * 100).toFixed(1)}%</AppText> : null}
        </View>
      </View>
      {observationTitle ? (
        <View style={[styles.observation, { backgroundColor: theme.surface2 }]}>
          <AppText variant="bodySemibold">{observationTitle}</AppText>
          {observationDetail ? <AppText variant="caption" tone="ink2">{observationDetail}</AppText> : null}
        </View>
      ) : null}
    </Card>
  );
}

export function CategoryBudgetsCard({ rows, periodLabel, onManage }: { rows: CategoryBudgetRow[]; periodLabel: string; onManage: () => void }) {
  const { theme } = useTheme();
  const spent = rows.reduce((total, row) => total + row.spent, 0);
  const budget = rows.reduce((total, row) => total + row.budget, 0);
  const shown = rows.slice(0, 5);

  return (
    <Card>
      <CardHeader title="Category budgets" subtitle={periodLabel} action={<Button label="Manage" variant="text" size="compact" onPress={onManage} />} />
      {rows.length ? (
        <View style={styles.budgetList}>
          {shown.map((row) => (
            <View key={row.category.id} style={styles.budgetRow}>
              <View style={styles.budgetHeading}>
                <View style={styles.budgetName}>
                  <View style={[styles.legendDot, { backgroundColor: row.category.color }]} />
                  <AppText variant="bodySmall" numberOfLines={1} style={styles.budgetNameText}>{row.category.name}</AppText>
                </View>
                <AppText variant="amountSmall">
                  {formatSGD(row.spent, 0)} <AppText variant="caption" tone="ink2">of {formatSGD(row.budget, 0)}</AppText>
                </AppText>
              </View>
              <ProgressTrack value={row.ratio} color={row.category.color} accessibilityLabel={`${row.category.name}: ${formatSGD(row.spent)} spent of ${formatSGD(row.budget)} budget`} />
            </View>
          ))}
          <View style={[styles.budgetSummary, { borderTopColor: theme.line }]}>
            <View style={styles.budgetHeading}>
              <AppText variant="bodySemibold">All {rows.length} budgets</AppText>
              <AppText variant="amountSmall">
                {formatSGD(spent, 0)} <AppText variant="caption" tone="ink2">of {formatSGD(budget, 0)}</AppText>
              </AppText>
            </View>
            <ProgressTrack value={budget > 0 ? spent / budget : 0} color={theme.accent} />
            {budget > 0 ? (
              <AppText variant="caption" tone="ink2">
                {Math.round((spent / budget) * 100)}% of this month’s budgets used, {formatSGD(Math.max(budget - spent, 0), 0)} left.
              </AppText>
            ) : null}
          </View>
        </View>
      ) : (
        <EmptyState title="No category budgets set yet." actionLabel="Set budgets" onAction={onManage} />
      )}
    </Card>
  );
}

export function SpendingBreakdownCard({ rows, periodLabel, onViewMore, onAdd }: { rows: SpendingBreakdownRow[]; periodLabel: string; onViewMore: () => void; onAdd: () => void }) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  // The five largest categories and everything else grouped as Others, as on the web.
  const grouped = rows.length > 6
    ? [...rows.slice(0, 5), { category: null, name: 'Others', color: '#7A869A', amount: rows.slice(5).reduce((sum, row) => sum + row.amount, 0), share: rows.slice(5).reduce((sum, row) => sum + row.share, 0) }]
    : rows;

  return (
    <Card>
      <CardHeader title="Spending breakdown" subtitle={`${periodLabel} expenses by category`} action={<Button label="View more" variant="text" size="compact" onPress={onViewMore} />} />
      {grouped.length ? (
        <View style={styles.breakdown}>
          <DonutChart data={grouped} total={total} periodLabel={periodLabel} />
          <View style={styles.legendList}>
            {grouped.map((row) => (
              <View key={row.name} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: row.color }]} />
                <AppText variant="bodySmall" numberOfLines={1} style={styles.legendName}>{row.name}</AppText>
                <AppText variant="caption" tone="ink3">{Math.round(row.share * 100)}%</AppText>
                <AppText variant="amountSmall">{formatSGD(row.amount, 0)}</AppText>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <EmptyState title={`No spending in ${periodLabel}`} message="Add and categorise transactions to see the breakdown." actionLabel="Add transaction" onAction={onAdd} />
      )}
    </Card>
  );
}

export function RecentTransactionsCard({ transactions, onSelect, onViewAll, onAdd }: { transactions: Transaction[]; onSelect: (transaction: Transaction) => void; onViewAll: () => void; onAdd: () => void }) {
  const { getCategoryById, getAccountById } = useFireBuddy();
  return (
    <Card>
      <CardHeader title="Recent transactions" subtitle="Newest five entries" action={<Button label="View all" variant="text" size="compact" onPress={onViewAll} />} />
      {transactions.length ? (
        transactions.map((transaction, index) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            category={getCategoryById(transaction.categoryId)}
            account={getAccountById(transaction.accountId)}
            onPress={onSelect}
            first={index === 0}
          />
        ))
      ) : (
        <EmptyState title="No transactions yet." message="Add one to build your monthly pulse." actionLabel="Add transaction" onAction={onAdd} />
      )}
    </Card>
  );
}

export function FiProgressCard({ onOpen }: { onOpen: () => void }) {
  const { theme } = useTheme();
  const { netWorth, fiTarget, projectedFireYear, projectedFireAge } = demoFoundation;
  const progress = fiTarget > 0 ? netWorth / fiTarget : 0;

  return (
    <Card>
      <CardHeader title="FI progress" subtitle="Projected on the demo plan" action={<Button label="Open planner" variant="text" size="compact" onPress={onOpen} />} />
      <AppText variant="heroFigure" style={styles.fiFigure}>{Math.round(progress * 100)}%</AppText>
      <ProgressTrack value={progress} color={theme.accent} height={10} keepColorWhenOver accessibilityLabel={`${Math.round(progress * 100)}% of your FI target`} />
      <View style={styles.facts}>
        <View style={styles.fact}>
          <AppText variant="caption" tone="ink2">FI target</AppText>
          <AppText variant="amount">{formatSGD(fiTarget, 0)}</AppText>
        </View>
        <View style={styles.fact}>
          <AppText variant="caption" tone="ink2">Projected retirement</AppText>
          <AppText variant="amount">{projectedFireYear} <AppText variant="caption" tone="ink2">age {projectedFireAge}</AppText></AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: {
    overflow: 'hidden',
    padding: 22,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  heroLabel: {
    marginBottom: 4,
  },
  heroChip: {
    marginTop: spacing.md,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  heroMetaItem: {
    flex: 1,
    gap: 4,
  },
  heroLink: {
    marginTop: spacing.xl,
    textDecorationLine: 'underline',
  },
  limited: {
    marginTop: 6,
  },
  pulseIncome: {
    marginTop: 2,
  },
  pulseLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  pulseTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    gap: 2,
  },
  pulseSegment: {
    height: '100%',
    borderRadius: 5,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  observation: {
    marginTop: spacing.lg,
    padding: 14,
    borderRadius: radii.tile,
    gap: 4,
  },
  budgetList: {
    gap: spacing.md,
  },
  budgetRow: {
    gap: 6,
  },
  budgetHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  budgetName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  budgetNameText: {
    flexShrink: 1,
  },
  budgetSummary: {
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  breakdown: {
    gap: spacing.lg,
  },
  legendList: {
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 26,
  },
  legendName: {
    flex: 1,
    minWidth: 0,
  },
  fiFigure: {
    marginBottom: spacing.sm,
  },
  facts: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  fact: {
    flex: 1,
    gap: 2,
  },
});
