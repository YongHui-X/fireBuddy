import {
  formatDateLabel,
  formatLongDate,
  formatMonthLabel,
  formatShortDate,
  getDeviceMonthKey,
  insightRangeLabels,
  insightRanges,
  type ExpenseSeriesPoint,
  type InsightRange,
  type Transaction,
} from '@firebuddy/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays, ChartPie, Download } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DonutChart } from '@/components/charts/DonutChart';
import { TrendChart } from '@/components/charts/TrendChart';
import { Screen } from '@/components/layout/Screen';
import { TransactionDetailsSheet } from '@/components/transactions/TransactionDetailsSheet';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { Card, CardHeader } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { PressOverlay } from '@/components/ui/PressOverlay';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AppText } from '@/components/ui/Text';
import { radii, spacing } from '@/constants/tokens';
import { useInsights } from '@/hooks/use-insights';
import { shareTransactionsCsv } from '@/lib/export-csv';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { usePrivacy } from '@/lib/privacy';
import { useTheme } from '@/lib/theme';

const rangeOptions = insightRanges.map((value) => ({ value, label: insightRangeLabels[value] }));

/**
 * Expense analytics: a Day / Week / Month / Year control (or one chosen month), the category
 * breakdown donut, the trend bars and the largest entries. Income never appears here, as on the web.
 */
export default function InsightsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { money, percent } = usePrivacy();
  const { month: requestedMonth } = useLocalSearchParams<{ month?: string }>();
  const { categories, accounts, tags, getCategoryById, getAccountById, deleteTransaction, notify } = useFireBuddy();
  const [range, setRange] = useState<InsightRange>('month');
  // Arriving from a Home card pins that month; the range control releases it again.
  const [month, setMonth] = useState<string | null>(() => (typeof requestedMonth === 'string' && /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : null));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [exporting, setExporting] = useState(false);

  const insights = useInsights({ range, month });
  const periodLabel = month ? formatMonthLabel(month) : `This ${insightRangeLabels[range].toLowerCase()}`;
  const boundsLabel = insights.bounds.startDate === insights.bounds.endDate
    ? formatLongDate(insights.bounds.startDate)
    : `${formatShortDate(insights.bounds.startDate)} – ${formatShortDate(insights.bounds.endDate)}`;
  const monthly = month !== null || range === 'year';
  const describePeriod = (point: ExpenseSeriesPoint) => (monthly && point.period.length === 7 ? formatMonthLabel(point.period) : formatDateLabel(point.period));

  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      const shared = await shareTransactionsCsv(insights.expenses, categories, accounts, tags, { transactionType: 'expense', ...insights.bounds });
      if (!shared) notify('Sharing is not available on this device.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to export expenses.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <Screen>
      <PageToolbar
        title="Insights"
        description="Explore your expense trends and spending breakdown."
        onBack={() => router.back()}
        trailing={<IconButton icon={Download} tone="bordered" accessibilityLabel="Export these expenses as CSV" disabled={exporting || !insights.expenses.length} onPress={() => void exportCsv()} />}
      />

      <SegmentedControl<InsightRange>
        options={rangeOptions}
        value={month ? 'month' : range}
        onChange={(next) => { setRange(next); setMonth(null); }}
        accessibilityLabel="Insights range"
      />

      <Card tone="hero" style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <AppText variant="overline" tone="heroMuted">Total expenses</AppText>
            <AppText variant="heroFigure" tone="hero" numberOfLines={1} adjustsFontSizeToFit>{money(insights.total, 0)}</AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Pick a month" onPress={() => setMonthPickerOpen(true)} style={[styles.monthButton, { borderColor: theme.heroLine }]}>
            {({ pressed }) => (
              <>
                <PressOverlay pressed={pressed} radius={radii.pill} light />
                <CalendarDays size={15} color={theme.heroInk} strokeWidth={2} />
                <AppText variant="captionMedium" tone="hero">{month ? formatMonthLabel(month) : 'Pick month'}</AppText>
              </>
            )}
          </Pressable>
        </View>
        <View style={styles.heroMeta}>
          <Chip label={periodLabel} tone="heroNeutral" round />
          <AppText variant="caption" tone="heroMuted" numberOfLines={1} style={styles.heroDates}>{boundsLabel} · {insights.transactionCount} expense{insights.transactionCount === 1 ? '' : 's'}</AppText>
        </View>
      </Card>

      <Card>
        <CardHeader title="Spending breakdown" subtitle={`${periodLabel} by category`} />
        {insights.breakdown.length ? (
          <View style={styles.breakdown}>
            <DonutChart data={insights.breakdown} total={insights.total} periodLabel={periodLabel} />
            <View style={styles.legendList}>
              {insights.breakdown.map((row) => (
                <View key={row.name} style={styles.legendRow}>
                  <View style={[styles.shareBadge, { backgroundColor: row.color }]}>
                    <AppText variant="captionMedium" style={styles.shareText}>{percent(row.share)}</AppText>
                  </View>
                  <AppText variant="bodySmall" numberOfLines={1} style={styles.legendName}>{row.name}</AppText>
                  <AppText variant="amountSmall">{money(row.amount)}</AppText>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <EmptyState icon={ChartPie} title="No category spending in this range" message="Add and categorise expenses to see where the money went." actionLabel="Add transaction" onAction={() => router.push('/add-transaction')} />
        )}
      </Card>

      <Card>
        <CardHeader title="Expense trend" subtitle={monthly && !month ? 'Monthly totals this year' : `Daily totals, ${boundsLabel}`} />
        <TrendChart points={insights.series} average={insights.average} describePeriod={describePeriod} />
        {insights.peak ? (
          <AppText variant="caption" tone="ink2" style={styles.peakNote}>
            Highest {monthly ? 'month' : 'day'}: {describePeriod(insights.peak)} at {money(insights.peak.expenses, 0)}. Dashed line is the average.
          </AppText>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Top spending" subtitle={insights.top.length ? `Largest ${insights.top.length === 1 ? 'expense' : `${insights.top.length} expenses`}` : 'Nothing recorded in this range'} />
        {insights.top.map((transaction, index) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            category={getCategoryById(transaction.categoryId)}
            account={getAccountById(transaction.accountId)}
            meta={`${formatDateLabel(transaction.date)} · ${getCategoryById(transaction.categoryId)?.name ?? 'Uncategorised'}`}
            onPress={setViewing}
            first={index === 0}
          />
        ))}
        {!insights.top.length ? <AppText variant="bodySmall" tone="ink2">Expenses in the selected range will be ranked here.</AppText> : null}
      </Card>

      <ActionSheet
        open={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        title="Spending month"
        description="Pick a month to see its full breakdown."
        actions={insights.months.map((option) => ({
          label: formatMonthLabel(option),
          detail: option === getDeviceMonthKey() ? 'Current month' : undefined,
          selected: option === month,
          onSelect: () => { setMonth(option); setRange('month'); },
        }))}
      />
      <TransactionDetailsSheet
        transaction={viewing}
        onClose={() => setViewing(null)}
        onEdit={(transaction) => { setViewing(null); router.push({ pathname: '/add-transaction', params: { id: transaction.id } }); }}
        onDelete={(transaction) => { setViewing(null); setDeleting(transaction); }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete transaction?"
        message={deleting ? `Delete “${deleting.description}”? This cannot be undone.` : ''}
        confirmLabel="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            deleteTransaction(deleting.id);
            notify('Transaction deleted.');
          }
          setDeleting(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 22,
    gap: spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginTop: 2,
  },
  heroMeta: {
    gap: spacing.sm,
  },
  heroDates: {
    marginTop: 2,
  },
  breakdown: {
    gap: spacing.lg,
  },
  legendList: {
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 28,
  },
  shareBadge: {
    minWidth: 44,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  shareText: {
    color: '#ffffff',
  },
  legendName: {
    flex: 1,
    minWidth: 0,
  },
  peakNote: {
    marginTop: spacing.md,
  },
});
