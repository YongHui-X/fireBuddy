import {
  type CategoryBudgetRow,
  type MonthSummary,
  type SpendingBreakdownRow,
  type Transaction,
} from '@firebuddy/shared';
import { ArrowDownRight, ArrowUpRight, Eye, EyeOff } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { useWealth } from '@/hooks/use-wealth';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { usePrivacy } from '@/lib/privacy';
import { useTheme } from '@/lib/theme';
import { useRegion } from '@/lib/user-profile';

import { DonutChart } from '../charts/DonutChart';
import { TransactionRow } from '../transactions/TransactionRow';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { EmptyState } from '../ui/EmptyState';
import { InfoButton } from '../ui/InfoButton';
import { ProgressTrack } from '../ui/ProgressTrack';
import { AppText } from '../ui/Text';

/**
 * The net worth headline, set straight on the navy hero like a wallet balance: the label with
 * the app-wide privacy eye beside it, the figure in white, this month's change, and the asset and
 * debt totals. Reads the latest dated wealth values.
 */
export function NetWorthHeadline({ monthName, onOpenWealth }: { monthName: string; onOpenWealth?: () => void }) {
  const { theme } = useTheme();
  const { money, signedMoney, hidden, toggle } = usePrivacy();
  const { netWorth, assetTotal, liabilityTotal, liabilities, monthlyChange, active, missingValues } = useWealth();
  const { isSingapore } = useRegion();
  const EyeIcon = hidden ? EyeOff : Eye;

  return (
    <View style={styles.headline}>
      <View style={styles.headlineLabelRow}>
        <AppText variant="overline" tone="heroMuted">Net worth</AppText>
        {/* A bare icon rather than an IconButton so it sits beside the label; hitSlop keeps the target comfortable. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
          accessibilityState={{ checked: hidden }}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
          onPress={toggle}
          style={({ pressed }) => [styles.headlineEye, pressed ? styles.headlineEyePressed : null]}
        >
          <EyeIcon size={16} color={theme.heroInkMuted} strokeWidth={2} />
        </Pressable>
      </View>
      {/* The figure takes Home's highlight colour; a negative net worth stays in plain ink, since gold reads as good news. */}
      <AppText variant="balance" tone="hero" numberOfLines={1} adjustsFontSizeToFit style={active.length && netWorth >= 0 ? { color: theme.homeHero.figure } : undefined}>
        {active.length ? signedMoney(netWorth, 0) : '—'}
      </AppText>
      <View style={styles.headlineMeta}>
        {monthlyChange !== null ? (
          <Chip
            label={`${hidden ? '' : monthlyChange >= 0 ? '+' : '-'}${money(Math.abs(monthlyChange), 0)} in ${monthName}`}
            tone={hidden ? 'heroNeutral' : monthlyChange >= 0 ? 'heroUp' : 'heroDown'}
            icon={hidden ? undefined : monthlyChange >= 0 ? ArrowUpRight : ArrowDownRight}
            round
          />
        ) : !active.length ? (
          // Net worth comes from Wealth balances, not from logged income, so say where it starts.
          // Kept to caption size on purpose (owner, 8 Oct 2026).
          <AppText variant="caption" tone="heroMuted" accessibilityRole="link" onPress={onOpenWealth} suppressHighlighting>
            Add your savings in Wealth to see your net worth.
          </AppText>
        ) : missingValues ? (
          // Mirrors the Wealth screen: a total built on unvalued positions says so.
          <Chip
            label={`${missingValues} position${missingValues === 1 ? ' has' : 's have'} no value yet`}
            tone="heroNeutral"
            round
            onPress={onOpenWealth}
          />
        ) : null}
        {active.length ? (
          // Debts show only when there are any (owner, 11 Oct 2026).
          <View style={styles.headlineTotals}>
            <AppText variant="caption" tone="heroMuted" numberOfLines={1} style={styles.headlineTotalsText}>
              Total assets {signedMoney(assetTotal, 0)}{liabilities.length ? ` · Debts ${money(liabilityTotal, 0)}` : ''}
            </AppText>
            <InfoButton title="Total assets" body={isSingapore ? 'Everything you own, including CPF and your home. Net worth leaves out any CPF you switched off from counting toward FI.' : 'Everything you own, including pensions and your home.'} tone="hero" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** "Where it went": income at the top, then a split bar of expenses against savings. */
export function MoneyPulseCard({ summary, monthName }: { summary: MonthSummary; monthName: string }) {
  const { theme } = useTheme();
  const { money, percent, hidden } = usePrivacy();
  const { income, expenses, savings, savingsRate } = summary;
  const scale = Math.max(income, expenses, Math.abs(savings), 1);
  const expenseShare = Math.min(expenses / scale, 1);
  const savingsShare = Math.min(Math.max(savings, 0) / scale, 1 - expenseShare);

  let observationTitle: string | null = null;
  let observationDetail: string | null = null;
  if (income > 0 && savings < 0) {
    observationTitle = `Expenses exceeded income by ${money(Math.abs(savings), 0)}`;
    observationDetail = `Review the largest expenses recorded in ${monthName}.`;
  } else if (income > 0 && savingsRate !== null) {
    observationTitle = `You saved ${percent(savingsRate, 1)} of recorded income`;
    observationDetail = `${money(savings, 0)} remained after ${money(expenses, 0)} of expenses in ${monthName}.`;
  } else if (expenses > 0) {
    observationTitle = `${money(expenses, 0)} recorded in expenses`;
    observationDetail = `Add income for ${monthName} to see your savings rate.`;
  }

  return (
    <Card>
      <CardHeader title={`${monthName} Money Pulse`} />
      <AppText variant="caption" tone="ink2">Income</AppText>
      <AppText variant="metric" style={styles.pulseIncome}>{money(income, 0)}</AppText>
      <AppText variant="caption" tone="ink2" style={styles.pulseLabel}>Where it went</AppText>
      {/* While amounts are hidden the split is drawn as two equal neutral segments. */}
      <View style={[styles.pulseTrack, { backgroundColor: theme.surface2 }]}>
        <View style={[styles.pulseSegment, { flex: hidden ? 1 : expenseShare, backgroundColor: hidden ? theme.surface3 : theme.expense }]} />
        <View style={[styles.pulseSegment, { flex: hidden ? 1 : savingsShare, backgroundColor: hidden ? theme.surface3 : theme.info }]} />
        <View style={{ flex: hidden ? 0 : Math.max(1 - expenseShare - savingsShare, 0) }} />
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.expense }]} />
          <AppText variant="caption" tone="ink2">Expenses</AppText>
          <AppText variant="amountSmall">{money(expenses, 0)}</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.info }]} />
          <AppText variant="caption" tone="ink2">Savings</AppText>
          <AppText variant="amountSmall" tone={savings < 0 && !hidden ? 'expense' : 'ink'}>{savings < 0 && !hidden ? '-' : ''}{money(savings, 0)}</AppText>
          {savingsRate !== null ? <AppText variant="caption" tone="ink3">{percent(savingsRate, 1)}</AppText> : null}
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
  const { money, percent } = usePrivacy();
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
                  {money(row.spent, 0)} <AppText variant="caption" tone="ink2">of {money(row.budget, 0)}</AppText>
                </AppText>
              </View>
              <ProgressTrack value={row.ratio} accessibilityLabel={`${row.category.name}: ${money(row.spent)} spent of ${money(row.budget)} budget`} />
            </View>
          ))}
          <View style={[styles.budgetSummary, { borderTopColor: theme.line }]}>
            <View style={styles.budgetHeading}>
              <AppText variant="bodySemibold">All {rows.length} budgets</AppText>
              <AppText variant="amountSmall">
                {money(spent, 0)} <AppText variant="caption" tone="ink2">of {money(budget, 0)}</AppText>
              </AppText>
            </View>
            <ProgressTrack value={budget > 0 ? spent / budget : 0} color={theme.accent} />
            {budget > 0 ? (
              <AppText variant="caption" tone="ink2">
                {percent(spent / budget)} of this month’s budgets used, {money(Math.max(budget - spent, 0), 0)} left.
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
  const { money, percent } = usePrivacy();
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
                <AppText variant="caption" tone="ink3">{percent(row.share)}</AppText>
                <AppText variant="amountSmall">{money(row.amount, 0)}</AppText>
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
        <EmptyState doudou="peek" title="No transactions yet." message="Add one to build your monthly pulse." actionLabel="Add transaction" onAction={onAdd} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  headline: {
    gap: 2,
  },
  headlineLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headlineEye: {
    padding: 2,
    borderRadius: radii.chip,
  },
  headlineEyePressed: {
    opacity: 0.6,
  },
  headlineMeta: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  headlineTotals: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headlineTotalsText: {
    flexShrink: 1,
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
});
