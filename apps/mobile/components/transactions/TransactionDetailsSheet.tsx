import { accountTypeLabel, formatLongDate, formatSGD, type Transaction } from '@firebuddy/shared';
import { Pencil, Trash2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useTheme } from '@/lib/theme';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { CategoryAvatar } from '../ui/CategoryAvatar';
import { Chip } from '../ui/Chip';
import { AppText } from '../ui/Text';

export interface TransactionDetailsSheetProps {
  transaction: Transaction | null;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

/** Read-only view of one ledger entry with Edit and Delete beneath it. */
export function TransactionDetailsSheet({ transaction, onClose, onEdit, onDelete }: TransactionDetailsSheetProps) {
  const { theme } = useTheme();
  const { getCategoryById, getAccountById, tags } = useFireBuddy();
  const category = transaction ? getCategoryById(transaction.categoryId) : undefined;
  const account = transaction ? getAccountById(transaction.accountId) : undefined;
  const isIncome = transaction?.transactionType === 'income';
  const tagNames = transaction ? transaction.tagIds.map((id) => tags.find((tag) => tag.id === id)?.name).filter(Boolean) : [];

  return (
    <BottomSheet
      open={Boolean(transaction)}
      onClose={onClose}
      title="Transaction details"
      footer={transaction ? (
        <View style={styles.actions}>
          <Button label="Edit" icon={Pencil} variant="secondary" style={styles.action} onPress={() => onEdit(transaction)} />
          <Button label="Delete" icon={Trash2} variant="danger" style={styles.action} onPress={() => onDelete(transaction)} />
        </View>
      ) : null}
    >
      {transaction ? (
        <View style={styles.body}>
          <View style={styles.headline}>
            <CategoryAvatar category={category} size="sheet" />
            <View style={styles.headlineCopy}>
              <AppText variant="cardTitle" numberOfLines={2}>{transaction.description}</AppText>
              <Chip label={isIncome ? 'Income' : 'Expense'} tone={isIncome ? 'income' : 'expense'} style={styles.typeChip} />
            </View>
          </View>
          <AppText variant="heroFigure" tone={isIncome ? 'income' : 'expense'}>
            {isIncome ? '+' : '-'} {formatSGD(transaction.amount)}
          </AppText>
          <View style={[styles.list, { borderTopColor: theme.line }]}>
            <DetailRow label="Date" value={formatLongDate(transaction.date)} />
            <DetailRow label="Category" value={category?.name ?? 'Uncategorised'} />
            <DetailRow label="Account" value={account ? `${account.name} · ${accountTypeLabel(account.type)}` : 'Account'} />
            {tagNames.length ? <DetailRow label="Tags" value={tagNames.join(', ')} /> : null}
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.line }]}>
      <AppText variant="caption" tone="ink2">{label}</AppText>
      <AppText variant="bodyMedium" align="right" style={styles.value}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
  },
  headline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headlineCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  typeChip: {
    alignSelf: 'flex-start',
  },
  list: {
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 46,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  value: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
