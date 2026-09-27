import { formatDateLabel, formatMonthLabel, formatSGD, type LedgerFilters, type Transaction } from '@firebuddy/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Copy, Download, Ellipsis, Pencil, SlidersHorizontal, Tags, Trash2, Wallet } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { Screen, useScreenInsets } from '@/components/layout/Screen';
import { FiltersSheet, type LedgerFilterDraft } from '@/components/transactions/FiltersSheet';
import { TransactionDetailsSheet } from '@/components/transactions/TransactionDetailsSheet';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { MonthStepper } from '@/components/ui/MonthStepper';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { SearchField } from '@/components/ui/SearchField';
import { AppText } from '@/components/ui/Text';
import { layout, radii, spacing } from '@/constants/tokens';
import { useCurrentMonth, useFilteredLedger, useTransactionMonths } from '@/hooks/use-ledger';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useTheme } from '@/lib/theme';

const emptyFilters: LedgerFilterDraft = { transactionType: null, categoryId: null, accountId: null, tagId: null, startDate: null, endDate: null };

/** The ledger: month stepper, search, a Filters sheet, totals, then day-grouped rows. */
export default function TransactionsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useScreenInsets();
  const { q, month: requestedMonth, saved } = useLocalSearchParams<{ q?: string; month?: string; saved?: string }>();
  const { transactions, getCategoryById, getAccountById, deleteTransaction, duplicateTransaction, notify } = useFireBuddy();
  const latestMonth = useCurrentMonth();
  const months = useTransactionMonths();
  const [month, setMonth] = useState(latestMonth);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<LedgerFilterDraft>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<Transaction | null>(null);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  useEffect(() => {
    if (typeof q === 'string' && q) setSearch(q);
  }, [q]);

  // Arriving from a save: show that month with no filters so the new entry is on screen.
  useEffect(() => {
    if (typeof requestedMonth === 'string' && /^\d{4}-\d{2}$/.test(requestedMonth)) {
      setMonth(requestedMonth);
      setDraft(emptyFilters);
      setSearch('');
    }
  }, [requestedMonth, saved]);

  useEffect(() => {
    if (!months.includes(month)) setMonth(months[0] ?? latestMonth);
  }, [months, month, latestMonth]);

  const filters = useMemo<LedgerFilters>(() => ({ ...draft, search, monthKey: month }), [draft, search, month]);
  const ledger = useFilteredLedger(filters);
  const customRange = Boolean(draft.startDate || draft.endDate);

  const openComingSoon = (title: string, description: string) => router.push({ pathname: '/coming-soon', params: { title, description } });

  const header = (
    <View style={styles.header}>
      <PageToolbar
        title="Transactions"
        description="Review income and expenses across your accounts."
        trailing={<IconButton icon={Ellipsis} accessibilityLabel="More actions" onPress={() => setOverflowOpen(true)} />}
      />
      <MonthStepper months={months} value={month} onChange={setMonth} onOpenPicker={() => setMonthPickerOpen(true)} valueLabel={customRange ? 'Custom range' : undefined} />
      <SearchField value={search} onChangeText={setSearch} />
      <View style={styles.filterRow}>
        <Button
          label="Filters"
          icon={SlidersHorizontal}
          variant="secondary"
          onPress={() => setFiltersOpen(true)}
          accessibilityState={{ expanded: filtersOpen }}
        />
        {ledger.activeFilterCount ? <Chip label={`${ledger.activeFilterCount} active`} tone="accent" round /> : null}
        {ledger.activeFilterCount ? <Button label="Clear" variant="text" size="compact" onPress={() => setDraft(emptyFilters)} /> : null}
      </View>
      <Card padded={false} style={styles.summary}>
        <View style={[styles.summaryCell, { borderRightColor: theme.line }]}>
          <AppText variant="overline" tone="ink2">Filtered expenses</AppText>
          <AppText variant="metric" tone="expense">- {formatSGD(ledger.expenses)}</AppText>
        </View>
        <View style={styles.summaryCell}>
          <AppText variant="overline" tone="ink2">Filtered income</AppText>
          <AppText variant="metric" tone="income">+ {formatSGD(ledger.income)}</AppText>
        </View>
      </Card>
    </View>
  );

  return (
    <Screen scroll={false}>
      <SectionList
        sections={ledger.sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        contentContainerStyle={[styles.list, { paddingBottom: insets.contentBottom }]}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <AppText variant="overline" tone="ink2" style={styles.sectionHeader}>{formatDateLabel(section.dateKey)}</AppText>
        )}
        renderItem={({ item, index, section }) => (
          <View style={[styles.rowCard, { backgroundColor: theme.surface, borderColor: theme.line }, index === 0 ? styles.rowFirst : null, index === section.data.length - 1 ? styles.rowLast : null]}>
            <TransactionRow
              transaction={item}
              category={getCategoryById(item.categoryId)}
              account={getAccountById(item.accountId)}
              onPress={setViewing}
              onMenu={setMenuFor}
              first
            />
          </View>
        )}
        ListEmptyComponent={(
          <Card>
            <EmptyState
              title={transactions.length ? 'No transactions match these filters' : 'No transactions yet'}
              message={transactions.length ? 'Clear the filters to return to your complete history.' : 'Add your first income or expense to start building your history.'}
              actionLabel={transactions.length ? 'Clear filters' : 'Add transaction'}
              onAction={transactions.length ? () => { setDraft(emptyFilters); setSearch(''); setMonth(latestMonth); } : () => router.push('/add-transaction')}
            />
          </Card>
        )}
      />

      <FiltersSheet open={filtersOpen} value={draft} onClose={() => setFiltersOpen(false)} onApply={setDraft} />
      <ActionSheet
        open={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        title="Month"
        actions={months.map((option) => ({ label: formatMonthLabel(option), selected: option === month && !customRange, onSelect: () => { setMonth(option); setDraft((current) => ({ ...current, startDate: null, endDate: null })); } }))}
      />
      <ActionSheet
        open={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        title="Transactions"
        actions={[
          { label: 'Manage tags', icon: Tags, onSelect: () => openComingSoon('Manage tags', 'Rename and remove the tags applied to your transactions.') },
          { label: 'Export CSV', icon: Download, onSelect: () => openComingSoon('Export CSV', 'Download your ledger as a spreadsheet.') },
          { label: 'Accounts', icon: Wallet, onSelect: () => openComingSoon('Accounts', 'Manage the payment accounts used by your transactions.') },
        ]}
      />
      <ActionSheet
        open={Boolean(menuFor)}
        onClose={() => setMenuFor(null)}
        title={menuFor?.description}
        description={menuFor ? `${formatDateLabel(menuFor.date)} · ${formatSGD(menuFor.amount)}` : undefined}
        actions={menuFor ? [
          { label: 'Edit', icon: Pencil, onSelect: () => router.push({ pathname: '/add-transaction', params: { id: menuFor.id } }) },
          { label: 'Duplicate', icon: Copy, onSelect: () => { duplicateTransaction(menuFor.id); notify('Transaction duplicated.'); } },
          { label: 'Delete', icon: Trash2, tone: 'danger', onSelect: () => setDeleting(menuFor) },
        ] : []}
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
  list: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.xl,
  },
  header: {
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summary: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  summaryCell: {
    flex: 1,
    padding: layout.cardPad,
    gap: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  rowCard: {
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
  },
  rowFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
  },
  rowLast: {
    borderBottomLeftRadius: radii.card,
    borderBottomRightRadius: radii.card,
  },
});
