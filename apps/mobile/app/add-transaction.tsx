import {
  createTransactionDraft,
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
import { Plus, Trash2, Wallet } from 'lucide-react-native';

import { CategorySheet } from '@/components/categories/CategorySheet';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ActionSheet } from '@/components/ui/ActionSheet';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { CategoryAvatar } from '@/components/ui/CategoryAvatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DateField } from '@/components/ui/DateField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AppText } from '@/components/ui/Text';
import { SelectField, TextField } from '@/components/ui/TextField';
import { fonts, radii, spacing, tint } from '@/constants/tokens';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useTheme } from '@/lib/theme';

/**
 * Add or edit a transaction. Mounted as a transparent modal route so the tab screen stays
 * visible beneath the sheet and the Android back button closes it like any other sheet.
 */
export default function AddTransactionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id, duplicateOf } = useLocalSearchParams<{ id?: string; duplicateOf?: string }>();
  const { transactions, accounts, categories, tags, addTransaction, updateTransaction, deleteTransaction, addTag, addCategory, getAccountById, getCategoryById, notify } = useFireBuddy();

  const editing = useMemo(() => (typeof id === 'string' ? transactions.find((transaction) => transaction.id === id) ?? null : null), [id, transactions]);
  const source = editing ?? (typeof duplicateOf === 'string' ? transactions.find((transaction) => transaction.id === duplicateOf) ?? null : null);

  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState<TransactionDraft>(() => createTransactionDraft({ accounts, categories, from: source }));
  const [errors, setErrors] = useState<TransactionDraftErrors>({});
  const [accountPicker, setAccountPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);

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
    const input = draftToCreateInput(draft, getCategoryById(draft.categoryId)?.name);
    if (editing) {
      updateTransaction(editing.id, input);
      notify('Transaction updated.');
    } else {
      addTransaction(input);
      notify(`${input.transactionType === 'income' ? 'Income' : 'Expense'} saved.`);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    // Land on the ledger for the saved month so the new entry is the first thing on screen.
    close(() => router.navigate({ pathname: '/transactions', params: { month: input.date.slice(0, 7), saved: String(Date.now()) } }));
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
        description={editing ? undefined : 'Record income or an expense against one of your accounts.'}
        footer={(
          <View style={styles.footer}>
            <Button label={editing ? 'Save changes' : 'Save transaction'} variant="primary" block onPress={save} />
            {editing ? <Button label="Delete" icon={Trash2} variant="danger" block onPress={() => setConfirmDelete(true)} /> : null}
          </View>
        )}
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
              <AppText variant="metric" tone="ink2">S$</AppText>
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

          <View style={styles.field}>
            <AppText variant="label">Category</AppText>
            <View style={styles.categoryGrid}>
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
                      { backgroundColor: selected ? tint(category.color, 0.16) : theme.surface, borderColor: selected ? category.color : theme.line },
                    ]}
                  >
                    <CategoryAvatar category={category} size="row" />
                    <AppText variant="captionMedium" numberOfLines={2} align="center">{category.name}</AppText>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New category"
                onPress={() => setCategorySheetOpen(true)}
                style={[styles.categoryChip, styles.newCategoryChip, { borderColor: theme.lineStrong }]}
              >
                <View style={[styles.newCategoryIcon, { backgroundColor: theme.surface2 }]}>
                  <Plus size={19} color={theme.ink2} strokeWidth={2} />
                </View>
                <AppText variant="captionMedium" tone="ink2" align="center">New category</AppText>
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
        </View>
      </BottomSheet>

      <ActionSheet
        open={accountPicker}
        onClose={() => setAccountPicker(false)}
        title="Account"
        actions={accounts.map((option) => ({
          label: option.name,
          detail: option.lastFour ? `···· ${option.lastFour}` : undefined,
          selected: option.id === draft.accountId,
          onSelect: () => update('accountId', option.id),
        }))}
      />
      <CategorySheet
        open={categorySheetOpen}
        mode="add"
        categoryType={draft.transactionType}
        onClose={() => setCategorySheetOpen(false)}
        onSave={(input) => {
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
  footer: {
    gap: spacing.sm,
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
  categoryChip: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: radii.tile,
    borderWidth: 1,
  },
  newCategoryChip: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  newCategoryIcon: {
    width: 38,
    height: 38,
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
