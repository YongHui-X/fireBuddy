import { formatGreeting, formatMonthLabel, formatMonthName, type Transaction } from '@firebuddy/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { DailyTipCard } from '@/components/home/DailyTipCard';
import { HomeActions } from '@/components/home/HomeActions';
import { CategoryBudgetsCard, MoneyPulseCard, NetWorthHeadline, RecentTransactionsCard, SpendingBreakdownCard } from '@/components/home/HomeCards';
import { QuickActions } from '@/components/home/QuickActions';
import { TransactionDetailsSheet } from '@/components/transactions/TransactionDetailsSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Chip } from '@/components/ui/Chip';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { useDailyTip } from '@/hooks/use-daily-tip';
import { useCategoryBudgets, useCurrentMonth, useMonthSummary, useRecentTransactions, useSpendingBreakdown } from '@/hooks/use-ledger';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useUserProfile } from '@/lib/user-profile';

/** Home: a forest hero holding the greeting, net worth headline and shortcuts, then this month's detail on the canvas. Retirement progress lives in the planner. */
export default function HomeScreen() {
  const router = useRouter();
  const { deleteTransaction, notify, isFreshDataset } = useFireBuddy();
  const { nickname } = useUserProfile();
  const dailyTip = useDailyTip();
  const month = useCurrentMonth();
  const monthName = formatMonthName(month);
  const summary = useMonthSummary(month);
  const budgets = useCategoryBudgets(month);
  const breakdown = useSpendingBreakdown(month);
  const recent = useRecentTransactions(5);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const openAdd = () => router.push('/add-transaction');

  return (
    <Screen
      hero={(
        <>
          <PageToolbar
            variant="greeting"
            tone="hero"
            title={formatGreeting(nickname)}
            description={`Your finances for ${monthName}.`}
            // Development builds start on sample figures; say so until the tester chooses Start fresh.
            metadata={__DEV__ && !isFreshDataset ? <Chip label="Sample data · Start fresh in Profile" tone="heroNeutral" /> : undefined}
            trailing={<HomeActions />}
            style={styles.toolbar}
          />
          <NetWorthHeadline monthName={monthName} onOpenWealth={() => router.push('/wealth')} />
          <QuickActions />
        </>
      )}
    >
      {dailyTip.tip ? <DailyTipCard tip={dailyTip.tip} onDismiss={dailyTip.dismiss} /> : null}
      <MoneyPulseCard summary={summary} monthName={monthName} />
      <CategoryBudgetsCard rows={budgets} periodLabel={formatMonthLabel(month)} onManage={() => router.navigate('/categories')} />
      <SpendingBreakdownCard
        rows={breakdown}
        periodLabel={formatMonthLabel(month)}
        onViewMore={() => router.push({ pathname: '/insights', params: { month } })}
        onAdd={openAdd}
      />
      <RecentTransactionsCard transactions={recent} onSelect={setViewing} onViewAll={() => router.navigate('/transactions')} onAdd={openAdd} />

      <TransactionDetailsSheet
        transaction={viewing}
        onClose={() => setViewing(null)}
        onEdit={(transaction) => {
          setViewing(null);
          router.push({ pathname: '/add-transaction', params: { id: transaction.id } });
        }}
        onDelete={(transaction) => {
          setViewing(null);
          setDeleting(transaction);
        }}
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
  // The hero spaces its blocks itself, so the toolbar drops its own bottom padding.
  toolbar: {
    paddingBottom: 0,
  },
});
