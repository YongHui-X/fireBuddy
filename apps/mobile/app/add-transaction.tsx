import {
  createTransactionDraft,
  currencyPrefix,
  defaultFirstRepeatDate,
  describeRecurringSchedule,
  RECURRING_FREQUENCIES,
  recurringFrequencyLabels,
  type RecurringFrequency,
  draftToCreateInput,
  firstCategoryIdForType,
  sanitizeAmountInput,
  validateTransactionDraft,
  type TransactionDraft,
  type TransactionDraftErrors,
  type TransactionType,
} from '@firebuddy/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Plus, Repeat, Trash2, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AccountSheet } from '@/components/accounts/AccountSheet';
import { CategorySheet } from '@/components/categories/CategorySheet';

import { ActionSheet } from '@/components/ui/ActionSheet';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { CategoryAvatar } from '@/components/ui/CategoryAvatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DateField } from '@/components/ui/DateField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AppText } from '@/components/ui/Text';
import { SelectField, TextField } from '@/components/ui/TextField';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { fonts, radii, spacing, tint } from '@/constants/tokens';
import { useGridItemWidth } from '@/hooks/use-grid-item-width';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { usePrivacy } from '@/lib/privacy';
import { useTheme } from '@/lib/theme';

/**
 * Add or edit a transaction. Mounted as a transparent modal route so the tab screen stays
 * visible beneath the sheet and the Android back button closes it like any other sheet.
 */
export default function AddTransactionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { currency } = usePrivacy();
  const { id, duplicateOf } = useLocalSearchParams<{ id?: string; duplicateOf?: string }>();
  const { transactions, accounts, categories, tags, recurringRules, addTransaction, addRecurringTransaction, updateRecurringRule, updateTransaction, deleteTransaction, addTag, addCategory, addAccount, getAccountById, getCategoryById, notify } = useFireBuddy();

  const editing = useMemo(() => (typeof id === 'string' ? transactions.find((transaction) => transaction.id === id) ?? null : null), [id, transactions]);
  const source = editing ?? (typeof duplicateOf === 'string' ? transactions.find((transaction) => transaction.id === duplicateOf) ?? null : null);

  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState<TransactionDraft>(() => createTransactionDraft({ accounts, categories, from: source }));
  const [errors, setErrors] = useState<TransactionDraftErrors>({});
  const [accountPicker, setAccountPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  // Repeating is offered when creating; an edited copy instead asks whether the change applies to its rule.
  const [repeat, setRepeat] = useState<RecurringFrequency | null>(null);
  const [repeatPicker, setRepeatPicker] = useState(false);
  const [hasEnd, setHasEnd] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [endError, setEndError] = useState<string | null>(null);
  // Empty means the default: one period after the transaction's own date.
  const [nextRepeat, setNextRepeat] = useState('');
  const [nextRepeatError, setNextRepeatError] = useState<string | null>(null);
  const firstRepeat = repeat ? nextRepeat || defaultFirstRepeatDate(draft.date, repeat) || '' : '';
  const [scopeOpen, setScopeOpen] = useState(false);
  const rule = editing?.recurringId ? recurringRules.find((item) => item.id === editing.recurringId) ?? null : null;
  const categoryGrid = useGridItemWidth(4, spacing.sm);
  const chipWidth = categoryGrid.itemWidth ? { width: categoryGrid.itemWidth } : null;

  const visibleCategories = categories.filter((category) => category.categoryType === draft.transactionType);
  const account = getAccountById(draft.accountId);

  function close(after?: () => void) {
    setOpen(false);
    setTimeout(() => {
      router.back();
      after?.();
    }, 180);
  }

  function update<K extends keyof TransactionDraft>(field: K, value: TransactionDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => (field in current ? { ...current, [field]: undefined } : current));
  }

  function changeType(transactionType: TransactionType) {
    setDraft((current) => ({ ...current, transactionType, categoryId: firstCategoryIdForType(categories, transactionType) }));
  }

  function save() {
    const nextErrors = validateTransactionDraft(draft);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      return;
    }
    if (!editing && repeat && firstRepeat <= draft.date) {
      setNextRepeatError('Pick a date after this transaction’s date.');
      return;
    }
    if (!editing && repeat && hasEnd && (!endDate || endDate < firstRepeat)) {
      setEndError('Pick an end date on or after the next repeat.');
      return;
    }
    if (editing && rule) {
      // A copy from a repeating rule: ask whether later copies should change too.
      setScopeOpen(true);
      return;
    }
    commit(false);
  }

  /** Save the draft; `applyToRule` also updates the repeating rule this copy came from. */
  function commit(applyToRule: boolean) {
    const input = draftToCreateInput(draft, getCategoryById(draft.categoryId)?.name);
    if (editing) {
      updateTransaction(editing.id, input);
      if (applyToRule && rule) {
        updateRecurringRule({
          ...rule,
          template: { transactionType: input.transactionType, amount: input.amount, categoryId: input.categoryId, accountId: input.accountId, description: input.description, tagIds: [...input.tagIds] },
          updatedAt: new Date().toISOString(),
        });
        notify('Transaction and future repeats updated.');
      } else {
        notify('Transaction updated.');
      }
    } else if (repeat) {
      addRecurringTransaction(input, repeat, hasEnd ? endDate : null, firstRepeat);
      notify(`${input.transactionType === 'income' ? 'Income' : 'Expense'} saved. It repeats ${recurringFrequencyLabels[repeat].toLowerCase()}.`);
    } else {
      addTransaction(input);
      notify(`${input.transactionType === 'income' ? 'Income' : 'Expense'} saved.`);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    // Land on the ledger for the saved month so the new entry is the first thing on screen.
    close(() => router.navigate({ pathname: '/transactions', params: { month: input.date.slice(0, 7), saved: String(Date.now()) } }));
  }

  /**
   * Blur the amount or description field first. Otherwise Android hands focus back to it when the
   * category sheet closes and the keyboard pops up again over the new category.
   */
  function openCategorySheet() {
    Keyboard.dismiss();
    setCategorySheetOpen(true);
  }

  function addNewTag() {
    const name = newTag.trim();
    if (!name) return;
    const existing = tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase()) ?? addTag(name);
    if (!draft.tagIds.includes(existing.id)) update('tagIds', [...draft.tagIds, existing.id]);
    setNewTag('');
  }

  return (
    <>
      <BottomSheet
        open={open}
        onClose={() => close()}
        title={editing ? 'Edit transaction' : 'Add transaction'}
        fill
      >
        <View style={styles.body}>
          <SegmentedControl<TransactionType>
            options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
            value={draft.transactionType}
            onChange={changeType}
            accessibilityLabel="Transaction type"
          />

          <View style={[styles.amountWell, { backgroundColor: theme.surface2, borderColor: errors.amount ? theme.danger : 'transparent' }]}>
            <AppText variant="overline" tone="ink2">Amount</AppText>
            <View style={styles.amountRow}>
              <AppText variant="metric" tone="ink2">{currencyPrefix(currency).trim()}</AppText>
              <TextInput
                accessibilityLabel="Amount"
                value={draft.amount}
                onChangeText={(text) => update('amount', sanitizeAmountInput(text))}
                placeholder="0.00"
                placeholderTextColor={theme.ink3}
                keyboardType="decimal-pad"
                autoFocus={!editing}
                style={[styles.amountInput, { color: draft.transactionType === 'income' ? theme.income : theme.ink }]}
              />
            </View>
            {errors.amount ? <AppText variant="caption" tone="danger">{errors.amount}</AppText> : null}
          </View>

          <TextField
            label="Description"
            optional
            value={draft.description}
            onChangeText={(text) => update('description', text)}
            placeholder={draft.transactionType === 'income' ? 'e.g. Monthly salary' : 'e.g. Hawker Centre lunch'}
            autoCapitalize="sentences"
            returnKeyType="done"
          />

          <View style={styles.paired}>
            <DateField label="Date" value={draft.date} onChange={(date) => update('date', date)} error={errors.date} maximumDate={new Date()} style={styles.pairedField} />
            <SelectField
              label="Account"
              value={account ? account.name : ''}
              placeholder="Choose account"
              icon={Wallet}
              error={errors.accountId}
              onPress={() => setAccountPicker(true)}
              style={styles.pairedField}
            />
          </View>

          {editing ? (
            rule ? (
              <View style={[styles.repeatNote, { backgroundColor: theme.surface2 }]}>
                <Repeat size={16} color={theme.ink2} strokeWidth={2} />
                <AppText variant="caption" tone="ink2" style={styles.repeatNoteText}>
                  {`Repeats: ${describeRecurringSchedule(rule).toLowerCase()}${rule.paused ? ' (paused)' : ''}. Manage it under Recurring on the Transactions tab.`}
                </AppText>
              </View>
            ) : null
          ) : (
            <View style={styles.field}>
              <SelectField
                label="Repeats"
                icon={Repeat}
                value={repeat ? describeRecurringSchedule({ frequency: repeat, startDate: firstRepeat || draft.date }) : 'Never'}
                help={repeat ? 'Later copies are added by themselves on their dates, for salary, rent or subscriptions.' : undefined}
                onPress={() => setRepeatPicker(true)}
              />
              {repeat ? (
                <>
                  <DateField
                    label="Next repeat"
                    value={firstRepeat}
                    onChange={(date) => { setNextRepeat(date); setNextRepeatError(null); }}
                    help="When the next one is due, if it's not the same day as this one (for example, the 25th for rent)."
                    error={nextRepeatError}
                  />
                  <ToggleRow label="Set an end date" value={hasEnd} onChange={(next) => { setHasEnd(next); setEndError(null); }} />
                  {hasEnd ? <DateField label="End date" value={endDate} onChange={(date) => { setEndDate(date); setEndError(null); }} error={endError} placeholder="Choose a date" /> : null}
                </>
              ) : null}
            </View>
          )}

          <View style={styles.field}>
            <AppText variant="label">Category</AppText>
            <View style={styles.categoryGrid} onLayout={categoryGrid.onLayout}>
              {visibleCategories.map((category) => {
                const selected = draft.categoryId === category.id;
                return (
                  <Pressable
                    key={category.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => update('categoryId', category.id)}
                    style={[
                      styles.categoryChip,
                      chipWidth,
                      { backgroundColor: selected ? tint(category.color, 0.16) : theme.surface, borderColor: selected ? category.color : theme.line },
                    ]}
                  >
                    <CategoryAvatar category={category} size="row" />
                    {/* A long one-word custom name ends in "…" on one line rather than breaking mid-word; names with spaces may wrap to two lines. Built-ins use short names. */}
                    <AppText variant="captionMedium" numberOfLines={category.name.trim().includes(' ') ? 2 : 1} ellipsizeMode="tail" align="center">{category.name}</AppText>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New category"
                onPress={openCategorySheet}
                style={[styles.categoryChip, chipWidth, styles.newCategoryChip, { borderColor: theme.lineStrong }]}
              >
                <View style={[styles.newCategoryIcon, { backgroundColor: theme.surface2 }]}>
                  <Plus size={19} color={theme.ink2} strokeWidth={2} />
                </View>
                <AppText variant="captionMedium" tone="ink2" numberOfLines={2} align="center">New category</AppText>
              </Pressable>
            </View>
            {errors.categoryId ? <AppText variant="caption" tone="danger">{errors.categoryId}</AppText> : null}
          </View>

          <View style={styles.field}>
            <AppText variant="label">Tags <AppText variant="caption" tone="ink3">optional</AppText></AppText>
            {tags.length ? (
              <View style={styles.tagRow}>
                {tags.map((tag) => {
                  const selected = draft.tagIds.includes(tag.id);
                  return (
                    <Pressable
                      key={tag.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => update('tagIds', selected ? draft.tagIds.filter((tagId) => tagId !== tag.id) : [...draft.tagIds, tag.id])}
                      style={[styles.tag, { backgroundColor: selected ? theme.accentSoft : theme.surface, borderColor: selected ? theme.accent : theme.lineStrong }]}
                    >
                      <AppText variant="captionMedium" tone={selected ? 'accentText' : 'ink2'}>{tag.name}</AppText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <View style={styles.tagInputRow}>
              <TextField value={newTag} onChangeText={setNewTag} placeholder="Add a tag" autoCapitalize="none" returnKeyType="done" onSubmitEditing={addNewTag} style={styles.tagInput} />
              <Button label="Add" icon={Plus} variant="secondary" onPress={addNewTag} disabled={!newTag.trim()} />
            </View>
          </View>
          {/* The save buttons scroll with the form (owner, 10 Oct 2026), so they can be reached
              without closing the keyboard instead of sitting half-hidden behind it in a pinned footer. */}
          <View style={styles.footer}>
            <Button label={editing ? 'Save changes' : 'Save transaction'} variant="primary" block onPress={save} />
            {editing ? <Button label="Delete" icon={Trash2} variant="danger" block onPress={() => setConfirmDelete(true)} /> : null}
          </View>
        </View>
      </BottomSheet>

      <ActionSheet
        open={accountPicker}
        onClose={() => setAccountPicker(false)}
        title="Account"
        actions={[
          ...accounts.map((option) => ({
            label: option.name,
            detail: option.lastFour ? `···· ${option.lastFour}` : undefined,
            selected: option.id === draft.accountId,
            onSelect: () => update('accountId', option.id),
          })),
          // Always last, so the user's own accounts stay at the top of the list.
          { key: 'add-account', label: 'Add account', icon: Plus, onSelect: () => setAccountSheetOpen(true) },
        ]}
      />
      <ActionSheet
        open={repeatPicker}
        onClose={() => setRepeatPicker(false)}
        title="Repeats"
        actions={[
          { key: 'never', label: 'Never', selected: repeat === null, onSelect: () => { setRepeat(null); setNextRepeat(''); } },
          ...RECURRING_FREQUENCIES.map((frequency) => ({
            key: frequency,
            label: recurringFrequencyLabels[frequency],
            detail: describeRecurringSchedule({ frequency, startDate: draft.date }),
            selected: repeat === frequency,
            // A new frequency moves the next repeat back to its default, one period after the date.
            onSelect: () => { setRepeat(frequency); setNextRepeat(''); setNextRepeatError(null); },
          })),
        ]}
      />
      <ActionSheet
        open={scopeOpen}
        onClose={() => setScopeOpen(false)}
        title="This transaction repeats"
        description="Change only this one, or this one and every future repeat?"
        actions={[
          { key: 'one', label: 'Just this one', onSelect: () => commit(false) },
          { key: 'future', label: 'This and future repeats', onSelect: () => commit(true) },
        ]}
      />
      <AccountSheet
        open={accountSheetOpen}
        mode="add"
        onClose={() => setAccountSheetOpen(false)}
        onSave={(input) => {
          Keyboard.dismiss();
          const account = addAccount(input);
          update('accountId', account.id);
          setAccountSheetOpen(false);
          notify(`${account.name} added.`);
        }}
      />
      <CategorySheet
        open={categorySheetOpen}
        mode="add"
        categoryType={draft.transactionType}
        onClose={() => setCategorySheetOpen(false)}
        onSave={(input) => {
          Keyboard.dismiss();
          const category = addCategory(input);
          update('categoryId', category.id);
          setCategorySheetOpen(false);
          notify(`${category.name} added.`);
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete transaction?"
        message={editing ? `Delete “${editing.description}”? This cannot be undone.` : ''}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (editing) {
            deleteTransaction(editing.id);
            notify('Transaction deleted.');
          }
          setConfirmDelete(false);
          close();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.lg,
  },
  repeatNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.tile,
  },
  repeatNoteText: {
    flex: 1,
  },
  footer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  amountWell: {
    borderRadius: radii.card,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontFamily: fonts.display.semibold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    paddingVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  paired: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pairedField: {
    flex: 1,
    minWidth: 0,
  },
  field: {
    gap: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // Four fixed columns once measured, so the grid stays short and a new category never stretches the row.
  categoryChip: {
    width: '23%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radii.tile,
    borderWidth: 1,
  },
  newCategoryChip: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  newCategoryIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  tagInput: {
    flex: 1,
  },
});
