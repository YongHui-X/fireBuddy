import {
  describeRecurringSchedule,
  formatLongDate,
  getDeviceDateKey,
  nextDueDate,
  RECURRING_FREQUENCIES,
  recurringFrequencyLabels,
  rescheduleRecurringRule,
  resumeRecurringRule,
  sanitizeAmountInput,
  type Account,
  type Category,
  type RecurringFrequency,
  type RecurringRule,
} from '@firebuddy/shared';
import { ChevronLeft, Pause, Play, Repeat, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { usePrivacy } from '@/lib/privacy';
import { useTheme } from '@/lib/theme';

import { AmountText } from '../ui/AmountText';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { CategoryAvatar } from '../ui/CategoryAvatar';
import { Chip } from '../ui/Chip';
import { DateField } from '../ui/DateField';
import { EmptyState } from '../ui/EmptyState';
import { PressOverlay } from '../ui/PressOverlay';
import { AppText } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { ToggleRow } from '../ui/ToggleRow';

export interface RecurringSheetProps {
  open: boolean;
  rules: readonly RecurringRule[];
  categories: readonly Category[];
  accounts: readonly Account[];
  onClose: () => void;
  onSave: (rule: RecurringRule) => void;
  onStop: (rule: RecurringRule) => void;
}

/**
 * Every repeating transaction on one sheet: the list, and an editor for one rule (amount, name,
 * how often, end date, pause or stop). Editing changes future copies only; past ones stay as recorded.
 * One sheet with two views, so a second modal never opens on top of the first.
 */
export function RecurringSheet({ open, rules, categories, accounts, onClose, onSave, onStop }: RecurringSheetProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = editingId ? rules.find((rule) => rule.id === editingId) ?? null : null;
  const close = () => { setEditingId(null); onClose(); };

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={editing ? 'Edit repeat' : 'Recurring'}
      description={editing ? 'Changes apply to future copies. Ones already recorded stay as they are.' : 'Added by themselves on their dates. Tap one to change, pause or stop it.'}
    >
      {editing ? (
        <RuleEditor
          key={editing.id}
          rule={editing}
          onBack={() => setEditingId(null)}
          onSave={(rule) => { onSave(rule); setEditingId(null); }}
          onStop={(rule) => { onStop(rule); setEditingId(null); }}
        />
      ) : rules.length === 0 ? (
        <EmptyState icon={Repeat} title="Nothing repeats yet" message="When you add a transaction, set Repeats to weekly, monthly or yearly for salary, rent or subscriptions." />
      ) : (
        <View style={styles.list}>
          {rules.map((rule, index) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              category={categories.find((category) => category.id === rule.template.categoryId)}
              account={accounts.find((account) => account.id === rule.template.accountId)}
              first={index === 0}
              onPress={() => setEditingId(rule.id)}
            />
          ))}
        </View>
      )}
    </BottomSheet>
  );
}

function RuleRow({ rule, category, account, first, onPress }: { rule: RecurringRule; category?: Category; account?: Account; first: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const next = nextDueDate(rule);
  const status = rule.paused ? 'Paused' : next ? [`Next ${formatLongDate(next)}`, rule.endDate ? `ends ${formatLongDate(rule.endDate)}` : null].filter(Boolean).join(' · ') : 'Ended';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${rule.template.description}, ${describeRecurringSchedule(rule)}`}
      onPress={onPress}
      style={[styles.row, !first ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line } : null]}
    >
      {({ pressed }) => (
        <>
          <PressOverlay pressed={pressed} />
          <CategoryAvatar category={category} size="row" />
          <View style={styles.rowCopy}>
            <AppText variant="bodySemibold" numberOfLines={1}>{rule.template.description}</AppText>
            <AppText variant="caption" tone="ink2" numberOfLines={1}>
              {[describeRecurringSchedule(rule), account?.name].filter(Boolean).join(' · ')}
            </AppText>
            <AppText variant="caption" tone={rule.paused ? 'warning' : 'ink3'} numberOfLines={1}>{status}</AppText>
          </View>
          <AmountText amount={rule.template.amount} transactionType={rule.template.transactionType} />
        </>
      )}
    </Pressable>
  );
}

function RuleEditor({ rule, onBack, onSave, onStop }: { rule: RecurringRule; onBack: () => void; onSave: (rule: RecurringRule) => void; onStop: (rule: RecurringRule) => void }) {
  const { theme } = useTheme();
  const { currency } = usePrivacy();
  const [description, setDescription] = useState(rule.template.description);
  const [amount, setAmount] = useState(rule.template.amount);
  const [frequency, setFrequency] = useState<RecurringFrequency>(rule.frequency);
  const [hasEnd, setHasEnd] = useState(rule.endDate !== null);
  const [endDate, setEndDate] = useState(rule.endDate ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);

  function save(patch?: Partial<RecurringRule>) {
    const value = Number(amount);
    if (!description.trim()) return setError('Give it a name.');
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount above zero.');
    if (hasEnd && !endDate) return setError('Choose an end date, or turn off Set an end date.');
    const now = new Date().toISOString();
    // An end date already passed simply ends the repeat; copies recorded before it stay.
    const edited: RecurringRule = { ...rule, template: { ...rule.template, description: description.trim(), amount: value.toFixed(2) }, endDate: hasEnd ? endDate : null, updatedAt: now };
    onSave({ ...rescheduleRecurringRule(edited, frequency, now), ...patch });
  }

  return (
    <View style={styles.editor}>
      <Button label="All repeats" icon={ChevronLeft} variant="text" size="compact" onPress={onBack} />
      {rule.paused ? <Chip label="Paused: nothing is added until you resume" tone="warning" /> : null}
      <TextField label="Name" value={description} onChangeText={(text) => { setDescription(text); setError(null); }} maxLength={120} />
      <TextField label={`Amount (${currency})`} value={amount} onChangeText={(text) => { setAmount(sanitizeAmountInput(text)); setError(null); }} keyboardType="decimal-pad" />
      <View style={styles.field}>
        <AppText variant="label">How often</AppText>
        <View style={styles.choices} accessibilityRole="radiogroup">
          {RECURRING_FREQUENCIES.map((option) => {
            const selected = option === frequency;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setFrequency(option)}
                style={[styles.choice, { backgroundColor: selected ? theme.accentSoft : theme.surface, borderColor: selected ? theme.accent : theme.lineStrong }]}
              >
                <AppText variant="captionMedium" tone={selected ? 'accentText' : 'ink2'}>{recurringFrequencyLabels[option]}</AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
      <ToggleRow label="Set an end date" value={hasEnd} onChange={(next) => { setHasEnd(next); setError(null); }} />
      {hasEnd ? <DateField label="End date" value={endDate} onChange={(date) => { setEndDate(date); setError(null); }} placeholder="Choose a date" /> : null}
      {error ? <AppText variant="bodySmall" tone="danger">{error}</AppText> : null}
      <Button label="Save changes" variant="primary" block onPress={() => save()} />
      {rule.paused ? (
        <Button label="Resume" icon={Play} variant="secondary" block onPress={() => onSave(resumeRecurringRule(rule, getDeviceDateKey(), new Date().toISOString()))} />
      ) : (
        <Button label="Pause" icon={Pause} variant="secondary" block onPress={() => save({ paused: true })} />
      )}
      {confirmStop ? (
        <View style={[styles.confirm, { borderColor: theme.line }]}>
          <AppText variant="bodySmall" tone="ink2">Stop this repeat? Copies already recorded stay in your transactions.</AppText>
          <Button label="Stop repeating" icon={Trash2} variant="danger" block onPress={() => onStop(rule)} />
          <Button label="Keep it" variant="text" block onPress={() => setConfirmStop(false)} />
        </View>
      ) : (
        <Button label="Stop repeating" icon={Trash2} variant="text" block onPress={() => setConfirmStop(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginHorizontal: -spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  editor: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.sm,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choice: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirm: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
  },
});
