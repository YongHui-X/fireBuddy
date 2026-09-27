import { formatMonthLabel, formatMonthName, getGreeting, type Transaction } from '@firebuddy/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Screen } from '@/components/layout/Screen';
import { CategoryBudgetsCard, FiProgressCard, MoneyPulseCard, NetWorthHero, RecentTransactionsCard, SpendingBreakdownCard } from '@/components/home/HomeCards';
import { TransactionDetailsSheet } from '@/components/transactions/TransactionDetailsSheet';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { useCategoryBudgets, useCurrentMonth, useMonthSummary, useRecentTransactions, useSpendingBreakdown } from '@/hooks/use-ledger';
import { useFireBuddy } from '@/lib/fire-buddy-store';

/** Home: the same reading order as the web dashboard on a phone, one card per row. */
export default function HomeScreen() {
  const router = useRouter();
  const { profile, deleteTransaction, notify } = useFireBuddy();
  const month = useCurrentMonth();
  const monthName = formatMonthName(month);
  const summary = useMonthSummary(month);
  const budgets = useCategoryBudgets(month);
  const breakdown = useSpendingBreakdown(month);
  const recent = useRecentTransactions(5);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const openComingSoon = (title: string, description: string) => router.push({ pathname: '/coming-soon', params: { title, description } });
  const openAdd = () => router.push('/add-transaction');
  const firstName = profile.name.split(' ')[0] ?? profile.name;

  return (
    <Screen>
      <PageToolbar
        variant="greeting"
        title={`${getGreeting()}, ${firstName}`}
        description={`Here’s your financial position for ${monthName}.`}
        metadata={<Chip label="Local demo data" />}
      />
      <NetWorthHero monthName={monthName} onPress={() => openComingSoon('Wealth', 'Assets and liabilities, dated separately from payment accounts.')} />
      <MoneyPulseCard summary={summary} monthName={monthName} />
      <CategoryBudgetsCard rows={budgets} periodLabel={formatMonthLabel(month)} onManage={() => router.navigate('/categories')} />
      <SpendingBreakdownCard
        rows={breakdown}
        periodLabel={formatMonthLabel(month)}
        onViewMore={() => openComingSoon('Insights', 'Spending trends by day, week, month and year.')}
        onAdd={openAdd}
      />
      <RecentTransactionsCard transactions={recent} onSelect={setViewing} onViewAll={() => router.navigate('/transactions')} onAdd={openAdd} />
      <FiProgressCard onOpen={() => openComingSoon('FIRE Planner', 'Your retirement timeline, from investing to drawing down.')} />

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
