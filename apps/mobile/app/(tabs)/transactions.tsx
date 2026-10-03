import { formatDateLabel, formatMonthLabel, formatShortDate, type LedgerFilters, type Transaction } from '@firebuddy/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Copy, Download, Ellipsis, Pencil, SlidersHorizontal, Tags, Trash2, Wallet } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { Screen, useScreenInsets } from '@/components/layout/Screen';
import { FiltersSheet, type LedgerFilterDraft } from '@/components/transactions/FiltersSheet';
import { TagsSheet } from '@/components/transactions/TagsSheet';
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
import { shareTransactionsCsv } from '@/lib/export-csv';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { usePrivacy } from '@/lib/privacy';
import { useTheme } from '@/lib/theme';

const emptyFilters: LedgerFilterDraft = { transactionType: null, categoryId: null, accountId: null, tagId: null, startDate: null, endDate: null };

/** The ledger: month stepper, search, a Filters sheet, totals, then day-grouped rows. */
export default function TransactionsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { money } = usePrivacy();
  const insets = useScreenInsets();
  const { q, month: requestedMonth, saved } = useLocalSearchParams<{ q?: string; month?: string; saved?: string }>();
  const { transactions, categories, accounts, tags, getCategoryById, getAccountById, deleteTransaction, duplicateTransaction, addTag, renameTag, deleteTag, notify } = useFireBuddy();
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
  const [tagsOpen, setTagsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

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
  // Show the actual dates in the period header; fall back to a generic label when one end is open.
  const customRangeLabel = !customRange
    ? undefined
    : draft.startDate && draft.endDate
      ? `${formatShortDate(draft.startDate)} – ${formatShortDate(draft.endDate)}`
      : draft.startDate
        ? `From ${formatShortDate(draft.startDate)}`
        : `Until ${formatShortDate(draft.endDate as string)}`;

  const tagUsage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const transaction of transactions) for (const tagId of transaction.tagIds) counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    return counts;
  }, [transactions]);

  /** Share the rows currently on screen as CSV, so the export always matches what the person is looking at. */
  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      const bounds = customRange
        ? { startDate: draft.startDate ?? undefined, endDate: draft.endDate ?? undefined }
        : { startDate: `${month}-01`, endDate: `${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, '0')}` };
      const shared = await shareTransactionsCsv(ledger.rows, categories, accounts, tags, {
        ...bounds,
        transactionType: draft.transactionType ?? undefined,
        categoryId: draft.categoryId ?? undefined,
        accountId: draft.accountId ?? undefined,
        tagId: draft.tagId ?? undefined,
        search: search || undefined,
      });
      if (!shared) notify('Sharing is not available on this device.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to export transactions.');
    } finally {
      setExporting(false);
    }
  }

  const header = (
    <View style={styles.header}>
      <PageToolbar
        title="Transactions"
        description="Review income and expenses across your accounts."
        trailing={<IconButton icon={Ellipsis} accessibilityLabel="More actions" onPress={() => setOverflowOpen(true)} />}
      />
      <MonthStepper months={months} value={month} onChange={setMonth} onOpenPicker={() => setMonthPickerOpen(true)} valueLabel={customRangeLabel} />
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
          <AppText variant="overline" tone="ink2">Expenses</AppText>
          <AppText variant="metric" tone="expense">- {money(ledger.expenses)}</AppText>
        </View>
        <View style={styles.summaryCell}>
          <AppText variant="overline" tone="ink2">Income</AppText>
          <AppText variant="metric" tone="income">+ {money(ledger.income)}</AppText>
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
            {ledger.activeFilterCount || search ? (
              <EmptyState
                title="No transactions match these filters"
                message="Clear the filters to see everything recorded this month."
                actionLabel="Clear filters"
                onAction={() => { setDraft(emptyFilters); setSearch(''); }}
              />
            ) : (
              // Nothing recorded in this month at all, whether or not other months have entries.
              <EmptyState
                title="No transactions were recorded"
                message="Have you written your expenses for today?"
                actionLabel="Add transaction"
                onAction={() => router.push('/add-transaction')}
              />
            )}
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
          { label: 'Manage tags', detail: `${tags.length} tag${tags.length === 1 ? '' : 's'}`, icon: Tags, onSelect: () => setTagsOpen(true) },
          { label: 'Export CSV', detail: ledger.rows.length ? `${ledger.rows.length} row${ledger.rows.length === 1 ? '' : 's'} shown` : 'Nothing to export', icon: Download, disabled: exporting || !ledger.rows.length, onSelect: () => void exportCsv() },
          { label: 'Accounts', detail: 'Manage payment accounts', icon: Wallet, onSelect: () => router.push('/accounts') },
        ]}
      />
      <TagsSheet
        open={tagsOpen}
        tags={tags}
        usageCounts={tagUsage}
        onClose={() => setTagsOpen(false)}
        onCreate={(name) => { addTag(name); notify(`${name} added.`); }}
        onRename={(id, name) => { renameTag(id, name); notify('Tag renamed.'); }}
        onDelete={(id) => { deleteTag(id); notify('Tag deleted.'); }}
      />
      <ActionSheet
        open={Boolean(menuFor)}
        onClose={() => setMenuFor(null)}
        title={menuFor?.description}
        description={menuFor ? `${formatDateLabel(menuFor.date)} · ${money(menuFor.amount)}` : undefined}
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
