import { formatLongDate, getDeviceDateKey, getDeviceMonthKey, shiftMonthKey, type LedgerFilters, type TransactionType } from '@firebuddy/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { useFireBuddy } from '@/lib/fire-buddy-store';

import { ActionSheet, type SheetAction } from '../ui/ActionSheet';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { DateField } from '../ui/DateField';
import { SegmentedControl } from '../ui/SegmentedControl';
import { AppText } from '../ui/Text';
import { SelectField } from '../ui/TextField';

export type LedgerFilterDraft = Pick<LedgerFilters, 'transactionType' | 'categoryId' | 'accountId' | 'tagId' | 'startDate' | 'endDate'>;

export interface FiltersSheetProps {
  open: boolean;
  value: LedgerFilterDraft;
  onClose: () => void;
  onApply: (next: LedgerFilterDraft) => void;
}

type TypeChoice = 'all' | TransactionType;
type Picker = 'category' | 'account' | 'tag' | null;

function monthBounds(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const last = new Date(year, month, 0);
  return { startDate: `${monthKey}-01`, endDate: getDeviceDateKey(last) };
}

/** The ledger filters that the phone hides behind a "Filters" trigger: type, category, account, tag, and a date range. */
export function FiltersSheet({ open, value, onClose, onApply }: FiltersSheetProps) {
  const { categories, accounts, tags, getCategoryById, getAccountById } = useFireBuddy();
  const [draft, setDraft] = useState<LedgerFilterDraft>(value);
  const [picker, setPicker] = useState<Picker>(null);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const typeChoice: TypeChoice = draft.transactionType ?? 'all';
  const visibleCategories = draft.transactionType ? categories.filter((category) => category.categoryType === draft.transactionType) : categories;
  const thisMonth = getDeviceMonthKey();
  const lastMonth = shiftMonthKey(thisMonth, -1);
  const customRange = Boolean(draft.startDate || draft.endDate);

  const pickerActions: Record<Exclude<Picker, null>, SheetAction[]> = {
    category: [
      { label: 'All categories', selected: !draft.categoryId, onSelect: () => setDraft((current) => ({ ...current, categoryId: null })) },
      ...visibleCategories.map((category) => ({ label: category.name, selected: draft.categoryId === category.id, onSelect: () => setDraft((current) => ({ ...current, categoryId: category.id })) })),
    ],
    account: [
      { label: 'All accounts', selected: !draft.accountId, onSelect: () => setDraft((current) => ({ ...current, accountId: null })) },
      ...accounts.map((account) => ({ label: account.name, selected: draft.accountId === account.id, onSelect: () => setDraft((current) => ({ ...current, accountId: account.id })) })),
    ],
    tag: [
      { label: 'All tags', selected: !draft.tagId, onSelect: () => setDraft((current) => ({ ...current, tagId: null })) },
      ...tags.map((tag) => ({ label: tag.name, selected: draft.tagId === tag.id, onSelect: () => setDraft((current) => ({ ...current, tagId: tag.id })) })),
    ],
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title="Filters"
        description="Narrow the ledger by date, type, category, account or tag."
        footer={(
          <View style={styles.footer}>
            <Button label="Apply filters" variant="primary" block onPress={() => { onApply(draft); onClose(); }} />
            <Button label="Reset" variant="text" block onPress={() => setDraft({ transactionType: null, categoryId: null, accountId: null, tagId: null, startDate: null, endDate: null })} />
          </View>
        )}
      >
        <View style={styles.body}>
          <View style={styles.field}>
            <AppText variant="label">Type</AppText>
            <SegmentedControl<TypeChoice>
              options={[{ value: 'all', label: 'All' }, { value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
              value={typeChoice}
              onChange={(next) => setDraft((current) => ({ ...current, transactionType: next === 'all' ? null : next, categoryId: null }))}
            />
          </View>
          <SelectField label="Category" value={getCategoryById(draft.categoryId)?.name ?? ''} placeholder="All categories" onPress={() => setPicker('category')} />
          <SelectField label="Account" value={getAccountById(draft.accountId)?.name ?? ''} placeholder="All accounts" onPress={() => setPicker('account')} />
          <SelectField label="Tag" value={tags.find((tag) => tag.id === draft.tagId)?.name ?? ''} placeholder="All tags" onPress={() => setPicker('tag')} />
          <View style={styles.field}>
            <AppText variant="label">Date range</AppText>
            <View style={styles.presets}>
              <Button label="Selected month" variant={customRange ? 'secondary' : 'primary'} size="compact" onPress={() => setDraft((current) => ({ ...current, startDate: null, endDate: null }))} />
              <Button label="Last month" variant="secondary" size="compact" onPress={() => setDraft((current) => ({ ...current, ...monthBounds(lastMonth) }))} />
              <Button label="This month" variant="secondary" size="compact" onPress={() => setDraft((current) => ({ ...current, ...monthBounds(thisMonth) }))} />
            </View>
            <View style={styles.dates}>
              <DateField label="Start date" value={draft.startDate ?? ''} placeholder="Any" onChange={(date) => setDraft((current) => ({ ...current, startDate: date }))} style={styles.date} />
              <DateField label="End date" value={draft.endDate ?? ''} placeholder="Any" onChange={(date) => setDraft((current) => ({ ...current, endDate: date }))} style={styles.date} />
            </View>
            {customRange ? (
              <AppText variant="caption" tone="ink2">
                Showing {draft.startDate ? formatLongDate(draft.startDate) : 'the beginning'} to {draft.endDate ? formatLongDate(draft.endDate) : 'today'}.
              </AppText>
            ) : null}
          </View>
        </View>
      </BottomSheet>
      <ActionSheet open={picker !== null} onClose={() => setPicker(null)} title={picker === 'category' ? 'Category' : picker === 'account' ? 'Account' : 'Tag'} actions={picker ? pickerActions[picker] : []} />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dates: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  date: {
    flex: 1,
  },
  footer: {
    gap: spacing.xs,
  },
});
