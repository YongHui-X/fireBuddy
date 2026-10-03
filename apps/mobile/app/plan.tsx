import { formatMonthName, summariseEssentialSpending } from '@firebuddy/shared';
import { useRouter } from 'expo-router';
import { Check, ClipboardList } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { CategoryAvatar } from '@/components/ui/CategoryAvatar';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { PressOverlay } from '@/components/ui/PressOverlay';
import { ProgressTrack } from '@/components/ui/ProgressTrack';
import { AppText } from '@/components/ui/Text';
import { radii, spacing } from '@/constants/tokens';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { usePrivacy } from '@/lib/privacy';
import { useTheme } from '@/lib/theme';

/**
 * Spending Plan: mark which expense categories are essential. The selection feeds emergency
 * runway maths without touching the retirement plan. Period limits and rollover are later work,
 * so category budgets are linked rather than duplicated here.
 */
export default function PlanScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { money, percent } = usePrivacy();
  const { categories, transactions, essentialCategoryIds, setEssentialCategoryIds, notify } = useFireBuddy();
  // Null means "no unsaved edits", so a reset elsewhere shows through until the person touches the list.
  const [edited, setEdited] = useState<string[] | null>(null);
  const selection = edited ?? essentialCategoryIds;

  const expenseCategories = useMemo(() => categories.filter((category) => category.categoryType === 'expense'), [categories]);
  const summary = useMemo(() => summariseEssentialSpending(transactions, selection), [transactions, selection]);
  const dirty = useMemo(() => {
    const saved = [...essentialCategoryIds].sort().join('|');
    return saved !== [...selection].sort().join('|');
  }, [essentialCategoryIds, selection]);
  const recordedMonths = summary.totalByMonth.filter((value) => value > 0).length;

  function toggle(id: string) {
    setEdited(selection.includes(id) ? selection.filter((item) => item !== id) : [...selection, id]);
  }

  function save() {
    setEssentialCategoryIds(selection);
    setEdited(null);
    notify('Essential spending categories saved.');
  }

  return (
    <Screen>
      <PageToolbar
        title="Spending Plan"
        description="Essential spending and emergency reserves for everyday finances."
        onBack={() => router.back()}
      />

      <Card tone="hero" style={styles.hero}>
        <AppText variant="overline" tone="heroMuted">Essential spending, monthly average</AppText>
        <AppText variant="heroFigure" tone="hero" numberOfLines={1} adjustsFontSizeToFit>
          {summary.averageEssential === null ? '—' : money(summary.averageEssential, 0)}
        </AppText>
        <AppText variant="caption" tone="heroMuted">
          {selection.length === 0
            ? 'Choose the categories your emergency fund must cover to see the figure.'
            : recordedMonths === 0
              ? 'No completed months recorded yet. The average needs at least one full month of expenses.'
              : `Across the last ${summary.months.length} completed months (${formatMonthName(summary.months[0])} to ${formatMonthName(summary.months[summary.months.length - 1])}). ${recordedMonths < summary.months.length ? 'Months without records count as zero.' : ''}`}
        </AppText>
        {summary.essentialShare !== null ? (
          <>
            <ProgressTrack value={summary.essentialShare} color={theme.railActiveInk} trackColor={theme.heroLine} height={8} keepColorWhenOver style={styles.heroTrack} accessibilityLabel={`${percent(summary.essentialShare)} of spending is essential`} />
            <AppText variant="caption" tone="heroMuted">{percent(summary.essentialShare)} of your {money(summary.averageTotal, 0)} average monthly spend is essential.</AppText>
          </>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="Essential spending categories"
          subtitle="Choose expenses your emergency reserves need to cover. This updates emergency runway without changing your retirement plan."
          action={selection.length ? <Button label="Clear" variant="text" size="compact" onPress={() => setEdited([])} /> : undefined}
        />
        <View style={styles.list}>
          {expenseCategories.map((category, index) => {
            const selected = selection.includes(category.id);
            return (
              <Pressable
                key={category.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={category.name}
                onPress={() => toggle(category.id)}
                style={[styles.row, index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line } : null]}
              >
                {({ pressed }) => (
                  <>
                    <PressOverlay pressed={pressed} />
                    <CategoryAvatar category={category} size="row" />
                    <View style={styles.copy}>
                      <AppText variant="bodySemibold" numberOfLines={1}>{category.name}</AppText>
                      <AppText variant="caption" tone="ink2">{selected ? 'Essential' : 'Discretionary'}</AppText>
                    </View>
                    <View style={[styles.checkbox, { borderColor: selected ? theme.accent : theme.lineStrong, backgroundColor: selected ? theme.accent : 'transparent' }]}>
                      {selected ? <Check size={16} color={theme.surface} strokeWidth={3} /> : null}
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
        <Button label={dirty ? 'Save essential categories' : 'Saved'} variant="primary" block disabled={!dirty} onPress={save} style={styles.save} />
      </Card>

      <Card>
        <CardHeader title="Category budgets" subtitle="Your existing category budgets remain available. Overall period limits and rollover are planned for later." />
        <Button label="Manage category budgets" icon={ClipboardList} variant="secondary" onPress={() => router.navigate('/categories')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 22,
    gap: 4,
  },
  heroTrack: {
    marginTop: spacing.md,
    marginBottom: 4,
  },
  list: {
    marginHorizontal: -spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radii.chip + 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  save: {
    marginTop: spacing.lg,
  },
});
