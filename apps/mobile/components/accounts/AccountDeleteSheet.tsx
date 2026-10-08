import { checkAccountDeletion, type Account, type Transaction } from '@firebuddy/shared';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing, tint } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { AppText } from '../ui/Text';
import { accountTypeIcons } from './AccountSheet';

export interface AccountDeleteSheetProps {
  account: Account | null;
  accounts: readonly Account[];
  transactions: readonly Pick<Transaction, 'accountId'>[];
  /** Account of each repeating rule; a rule must move with the account's transactions. */
  ruleAccountIds?: readonly string[];
  onCancel: () => void;
  /** `moveTo` is the account that takes over its transactions and default flag, or null when nothing needs moving. */
  onConfirm: (moveTo: string | null) => void;
}

/**
 * Confirms deleting an account. When transactions use it, or it is the default, the user picks
 * which account takes them over, so nothing is ever left pointing at a missing account.
 */
export function AccountDeleteSheet({ account, accounts, transactions, ruleAccountIds = [], onCancel, onConfirm }: AccountDeleteSheetProps) {
  const { theme } = useTheme();
  const check = account ? checkAccountDeletion(accounts, transactions, account.id, ruleAccountIds) : null;
  const plan = check?.ok ? check : null;
  const [chosen, setMoveTo] = useState<string | null>(null);
  // The user's pick while it is still a valid target, otherwise the default account (or the first
  // other one), so the common case is a single tap.
  const moveTo = !plan?.needsTarget
    ? null
    : plan.candidates.some((item) => item.id === chosen)
      ? chosen
      : (plan.candidates.find((item) => item.isDefault) ?? plan.candidates[0]).id;

  if (!account) return null;

  const message = !plan
    ? (check && !check.ok ? check.reason : '')
    : plan.usedBy > 0 || plan.usedByRepeats > 0
      ? `${usageText(plan.usedBy, plan.usedByRepeats)} use “${account.name}”. Choose where they move to.`
      : account.isDefault
        ? `“${account.name}” is your default account. Choose the new default.`
        : `Delete “${account.name}”? No transactions use it, so nothing else changes.`;

  return (
    <BottomSheet
      open={Boolean(account)}
      onClose={onCancel}
      title="Delete account?"
      footer={(
        <View style={styles.footer}>
          <Button
            label={plan?.needsTarget ? 'Move and delete' : 'Delete'}
            variant="danger"
            block
            disabled={!plan || (plan.needsTarget && !moveTo)}
            onPress={() => onConfirm(plan?.needsTarget ? moveTo : null)}
          />
          <Button label="Cancel" variant="secondary" block onPress={onCancel} />
        </View>
      )}
    >
      <View style={styles.body}>
        <AppText variant="body" tone="ink2">{message}</AppText>
        {plan?.needsTarget ? (
          <View style={[styles.list, { borderColor: theme.line }]} accessibilityRole="radiogroup">
            {plan.candidates.map((option, index) => {
              const Icon = accountTypeIcons[option.type];
              const selected = option.id === moveTo;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setMoveTo(option.id)}
                  style={[styles.row, index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line } : null, selected ? { backgroundColor: theme.accentSoft } : null]}
                >
                  <View style={[styles.icon, { backgroundColor: tint(option.color, 0.18) }]}>
                    <Icon size={18} color={option.color} strokeWidth={1.9} />
                  </View>
                  <AppText variant="bodySemibold" numberOfLines={1} style={styles.name}>{option.name}</AppText>
                  {selected ? <Check size={18} color={theme.accentText} strokeWidth={2.4} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </BottomSheet>
  );
}

/** "3 transactions and 1 repeat", "1 repeat". */
function usageText(transactions: number, repeats: number) {
  const parts = [
    transactions ? `${transactions} transaction${transactions === 1 ? '' : 's'}` : null,
    repeats ? `${repeats} repeat${repeats === 1 ? '' : 's'}` : null,
  ].filter(Boolean);
  return parts.join(' and ');
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
  },
  footer: {
    gap: spacing.sm,
  },
  list: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
  },
});
