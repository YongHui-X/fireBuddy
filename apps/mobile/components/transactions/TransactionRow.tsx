import type { Account, Category, Transaction } from '@firebuddy/shared';
import { Ellipsis, Repeat } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { AmountText } from '../ui/AmountText';
import { CategoryAvatar } from '../ui/CategoryAvatar';
import { IconButton } from '../ui/IconButton';
import { PressOverlay } from '../ui/PressOverlay';
import { AppText } from '../ui/Text';

export interface TransactionRowProps {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  /** Secondary line; defaults to "Category · Account". */
  meta?: string;
  onPress?: (transaction: Transaction) => void;
  onMenu?: (transaction: Transaction) => void;
  first?: boolean;
}

/** One ledger entry: category tile, description with its meta line, and the signed amount. */
export const TransactionRow = memo(function TransactionRow({ transaction, category, account, meta, onPress, onMenu, first = false }: TransactionRowProps) {
  const { theme } = useTheme();
  const secondary = meta ?? [category?.name ?? 'Uncategorised', account?.name].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View details for ${transaction.description}`}
      onPress={onPress ? () => onPress(transaction) : undefined}
      onLongPress={onMenu ? () => onMenu(transaction) : undefined}
      style={[styles.row, !first ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line } : null]}
    >
      {({ pressed }) => (
        <>
          <PressOverlay pressed={pressed && Boolean(onPress)} />
          <CategoryAvatar category={category} size="row" />
          <View style={styles.copy}>
            <AppText variant="bodySemibold" numberOfLines={1}>{transaction.description}</AppText>
            <View style={styles.metaRow}>
              {/* Copies made by a repeating rule carry a small repeat mark. */}
              {transaction.recurringId ? <Repeat size={12} color={theme.ink3} strokeWidth={2.2} accessibilityLabel="Repeats" /> : null}
              <AppText variant="caption" tone="ink2" numberOfLines={1} style={styles.meta}>{secondary}</AppText>
            </View>
          </View>
          <AmountText amount={transaction.amount} transactionType={transaction.transactionType} />
          {onMenu ? (
            <IconButton icon={Ellipsis} accessibilityLabel={`Actions for ${transaction.description}`} size="compact" iconSize={18} onPress={() => onMenu(transaction)} style={styles.menu} />
          ) : null}
        </>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingVertical: spacing.sm,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    flexShrink: 1,
  },
  menu: {
    marginRight: -10,
  },
});
