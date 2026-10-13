import { describeActiveFilters, formatDateLabel, formatMonthLabel, formatShortDate, type ActiveFilterKey, type LedgerFilters, type Transaction } from '@firebuddy/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Copy, Download, Ellipsis, Pencil, Repeat, SlidersHorizontal, Tags, Trash2, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { HeroBand } from '@/components/layout/HeroBand';
import { Screen, useScreenInsets } from '@/components/layout/Screen';
import { ActiveFilters } from '@/components/transactions/ActiveFilters';
import { FiltersSheet, type LedgerFilterDraft } from '@/components/transactions/FiltersSheet';
import { RecurringSheet } from '@/components/transactions/RecurringSheet';
import { TagsSheet } from '@/components/transactions/TagsSheet';
import { TransactionDetailsSheet } from '@/components/transactions/TransactionDetailsSheet';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
import { useResetWhen } from '@/hooks/use-reset-when';

const emptyFilters: LedgerFilterDraft = { transactionType: null, categoryId: null, accountId: null, tagId: null, startDate: null, endDate: null };

/** The ledger: month stepper, search, a Filters sheet, totals, then day-grouped rows. */
export default function TransactionsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { money } = usePrivacy();
  const insets = useScreenInsets();
  const { q, month: requestedMonth, saved } = useLocalSearchParams<{ q?: string; month?: string; saved?: string }>();
  const { transactions, categories, accounts, tags, recurringRules, getCategoryById, getAccountById, deleteTransaction, duplicateTransaction, addTag, renameTag, deleteTag, updateRecurringRule, deleteRecurringRule, notify } = useFireBuddy();
  const latestMonth = useCurrentMonth();
  const months = useTransactionMonths();
  const [pickedMonth, setMonth] = useState(latestMonth);
  // A month with no entries left (say, after deleting its last one) falls back to the newest month.
  const month = months.includes(pickedMonth) ? pickedMonth : (months[0] ?? latestMonth);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<LedgerFilterDraft>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<Transaction | null>(null);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useResetWhen(typeof q === 'string' && q ? q : null, () => setSearch(q as string));

  // Arriving from a save: show that month with no filters so the new entry is on screen.
  const arrival = typeof requestedMonth === 'string' && /^\d{4}-\d{2}$/.test(requestedMonth) ? `${requestedMonth}|${saved ?? ''}` : null;
  useResetWhen(arrival, () => {
    setMonth(requestedMonth as string);
    setDraft(emptyFilters);
    setSearch('');
  });

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

  // One removable chip per active filter, named rather than counted.
  const activeChips = describeActiveFilters(draft, {
    categoryName: (id) => getCategoryById(id)?.name,
    accountName: (id) => getAccountById(id)?.name,
    tagName: (id) => tags.find((tag) => tag.id === id)?.name,
    rangeLabel: customRangeLabel,
  });
  const removeFilter = (key: ActiveFilterKey) =>
    setDraft((current) => (key === 'dates' ? { ...current, startDate: null, endDate: null } : { ...current, [key]: null }));

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
      {/* The navy band holds the title and the period's two totals (DESIGN.md, navy bands on the tab screens). */}
      <HeroBand>
        <PageToolbar
          tone="hero"
          title="Transactions"
          description="Review income and expenses across your accounts."
          trailing={(
            <View style={styles.toolbarActions}>
              <IconButton icon={Repeat} tone="hero" accessibilityLabel={`Recurring, ${recurringRules.length} set up`} onPress={() => setRecurringOpen(true)} />
              <IconButton icon={Ellipsis} tone="hero" accessibilityLabel="More actions" onPress={() => setOverflowOpen(true)} />
            </View>
          )}
        />
        <View style={styles.summary}>
          <View style={[styles.summaryCell, { backgroundColor: theme.heroChipBg }]}>
            <AppText variant="overline" tone="heroMuted">Expenses</AppText>
            <AppText variant="metric" style={{ color: theme.heroExpenseInk }}>- {money(ledger.expenses)}</AppText>
          </View>
          <View style={[styles.summaryCell, { backgroundColor: theme.heroChipBg }]}>
            <AppText variant="overline" tone="heroMuted">Income</AppText>
            <AppText variant="metric" style={{ color: theme.heroIncomeInk }}>+ {money(ledger.income)}</AppText>
          </View>
        </View>
      </HeroBand>
      <SearchField value={search} onChangeText={setSearch} />
      {/* Filters and the month share one row, so the period and its filters read together. */}
      <View style={styles.filterRow}>
        <Button
          label="Filters"
          icon={SlidersHorizontal}
          variant="secondary"
          onPress={() => setFiltersOpen(true)}
          accessibilityState={{ expanded: filtersOpen }}
        />
        <MonthStepper compact months={months} value={month} onChange={setMonth} onOpenPicker={() => setMonthPickerOpen(true)} valueLabel={customRangeLabel} style={styles.monthStepper} />
      </View>
      {activeChips.length ? (
        <View style={styles.activeRow}>
          <ActiveFilters chips={activeChips} onRemove={removeFilter} onClear={() => setDraft(emptyFilters)} />
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen scroll={false} heroTop>
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
                doudou="oops"
                title="No transactions match these filters"
                message="Clear the filters to see everything recorded this month."
                actionLabel="Clear filters"
                onAction={() => { setDraft(emptyFilters); setSearch(''); }}
              />
            ) : (
              // Nothing recorded in this month at all, whether or not other months have entries.
              <EmptyState
                doudou="peek"
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
      <RecurringSheet
        open={recurringOpen}
        rules={recurringRules}
        categories={categories}
        accounts={accounts}
        onClose={() => setRecurringOpen(false)}
        onSave={(rule) => {
          updateRecurringRule(rule);
          notify(rule.paused ? `${rule.template.description} paused.` : `${rule.template.description} updated.`);
        }}
        onStop={(rule) => {
          deleteRecurringRule(rule.id);
          notify(`${rule.template.description} no longer repeats.`);
        }}
      />
      <ActionSheet
        open={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        title="Transactions"
        actions={[
          { label: 'Recurring', detail: recurringRules.length ? `${recurringRules.length} repeating` : 'Salary, rent, subscriptions', icon: Repeat, onSelect: () => setRecurringOpen(true) },
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
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
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
  monthStepper: {
    flex: 1,
    minWidth: 0,
  },
  activeRow: {
    marginTop: -spacing.xs,
  },
  summary: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryCell: {
    flex: 1,
    padding: layout.cardPad,
    gap: 4,
    borderRadius: radii.card,
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
