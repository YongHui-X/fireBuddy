import { getMonthlySpend, type Category, type TransactionType } from '@firebuddy/shared';
import { Pencil, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategorySheet } from '@/components/categories/CategorySheet';
import { Screen } from '@/components/layout/Screen';
import { Card, CardHeader } from '@/components/ui/Card';
import { CategoryAvatar } from '@/components/ui/CategoryAvatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { PressOverlay } from '@/components/ui/PressOverlay';
import { ProgressTrack } from '@/components/ui/ProgressTrack';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AppText } from '@/components/ui/Text';
import { layout, radii, spacing } from '@/constants/tokens';
import { useGridItemWidth } from '@/hooks/use-grid-item-width';
import { useCurrentMonth } from '@/hooks/use-ledger';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { usePrivacy } from '@/lib/privacy';
import { useTheme } from '@/lib/theme';

/** Category cards with this month's spend against each budget, plus the full breakdown list. */
export default function CategoriesScreen() {
  const { theme, shadows } = useTheme();
  const { money, percent } = usePrivacy();
  const { categories, transactions, addCategory, updateCategory, deleteCategory, notify } = useFireBuddy();
  const month = useCurrentMonth();
  const [type, setType] = useState<TransactionType>('expense');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const grid = useGridItemWidth(2, spacing.md);

  const rows = useMemo(() => {
    const visible = categories.filter((category) => category.categoryType === type);
    const totalSpend = transactions.filter((transaction) => transaction.transactionType === 'expense').reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0);
    return visible.map((category) => {
      const spent = getMonthlySpend(transactions, category.id, month);
      const budget = Number(category.monthlyBudget);
      const allTime = transactions.filter((transaction) => transaction.categoryId === category.id && transaction.transactionType === 'expense').reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0);
      return { category, spent, budget, ratio: budget > 0 ? spent / budget : 0, share: totalSpend > 0 ? allTime / totalSpend : 0, allTime };
    });
  }, [categories, transactions, type, month]);

  // The band's one figure: this month's spend against the budgets set, or a plain prompt when none are.
  const budgetTotal = rows.reduce((sum, row) => sum + row.budget, 0);
  const spentTotal = rows.reduce((sum, row) => sum + row.spent, 0);
  const bandLine = type === 'income'
    ? 'Manage the sources used to classify income.'
    : budgetTotal > 0
      ? `${money(spentTotal, 0)} spent of ${money(budgetTotal, 0)} budgeted this month`
      : 'Manage your spend categories and monthly budgets.';

  return (
    <Screen
      hero={(
        <>
          <PageToolbar
            tone="hero"
            title="Categories"
            description={bandLine}
            // One Gold Rule: the tab bar's Add tile owns the gold on this screen, so adding a category is a quiet icon.
            trailing={<IconButton icon={Plus} tone="hero" accessibilityLabel="Add category" onPress={() => setAdding(true)} />}
          />
          <SegmentedControl<TransactionType>
            tone="hero"
            options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
            value={type}
            onChange={setType}
            accessibilityLabel="Category type"
          />
        </>
      )}
    >
      <View style={styles.grid} onLayout={grid.onLayout}>
        {rows.map(({ category, spent, budget, ratio }) => (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityLabel={category.isDefault ? (category.categoryType === 'expense' ? `Set a budget for ${category.name}` : `${category.name}, built-in category`) : `Edit ${category.name}`}
            onPress={() => setEditing(category)}
            style={[styles.card, shadows.card, { backgroundColor: theme.surface, borderColor: theme.line }, grid.itemWidth ? { width: grid.itemWidth } : null]}
          >
            {({ pressed }) => (
              <>
                <PressOverlay pressed={pressed} radius={radii.card} />
                <View style={styles.cardTop}>
                  <CategoryAvatar category={category} size="card" />
                  {!category.isDefault || category.categoryType === 'expense' ? <Pencil size={16} color={theme.ink3} strokeWidth={1.9} /> : null}
                </View>
                <AppText variant="bodySemibold" numberOfLines={1}>{category.name}</AppText>
                {category.categoryType === 'expense' ? (
                  <>
                    <AppText variant="caption" tone="ink2">{money(spent, 0)} this month</AppText>
                    <ProgressTrack value={ratio} style={styles.track} />
                    <AppText variant="caption" tone="ink2">
                      {budget > 0 ? `${percent(ratio)} of ${money(budget, 0)}` : 'No budget'}
                    </AppText>
                  </>
                ) : (
                  <AppText variant="caption" tone="ink2">Income source</AppText>
                )}
              </>
            )}
          </Pressable>
        ))}
      </View>

      {type === 'expense' ? (
        <Card>
          <CardHeader title="Full breakdown" subtitle={`${rows.length} categories, all recorded spend`} />
          {[...rows].sort((left, right) => right.allTime - left.allTime).map(({ category, share, allTime }, index) => (
            <View key={category.id} style={[styles.breakdownRow, index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line } : null]}>
              <CategoryAvatar category={category} size="row" />
              <View style={styles.breakdownCopy}>
                <AppText variant="bodySemibold" numberOfLines={1}>{category.name}</AppText>
                <AppText variant="caption" tone="ink2">{percent(share)} of tracked spend</AppText>
              </View>
              <AppText variant="amount">{money(allTime, 0)}</AppText>
            </View>
          ))}
        </Card>
      ) : null}

      <CategorySheet
        open={adding}
        mode="add"
        categoryType={type}
        onClose={() => setAdding(false)}
        onSave={(input) => {
          addCategory(input);
          setAdding(false);
          notify(`${input.name} added.`);
        }}
      />
      <CategorySheet
        open={Boolean(editing)}
        mode="edit"
        categoryType={editing?.categoryType ?? type}
        initial={editing}
        onClose={() => setEditing(null)}
        onSave={(input) => {
          if (editing) {
            updateCategory(editing.id, input);
            notify(`${input.name} updated.`);
          }
          setEditing(null);
        }}
        onDelete={() => setConfirmDelete(true)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete category?"
        message={editing ? `Delete “${editing.name}”? Its transactions stay in your history as uncategorised.` : ''}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (editing) {
            deleteCategory(editing.id);
            notify(`${editing.name} deleted.`);
          }
          setConfirmDelete(false);
          setEditing(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  // Half width before the first layout; then the measured column width, so a lone last card stays its own size.
  card: {
    width: '47%',
    padding: layout.cardPad - 2,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  track: {
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 58,
    paddingVertical: spacing.sm,
  },
  breakdownCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
