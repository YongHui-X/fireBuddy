import { monthIndex, sanitizeAmountInput, type FireCalculationResult, type RetirementPlan } from '@firebuddy/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { fireMonthLabel, pct, useFireProjection, type PlanOverrides } from '@/hooks/use-fire-plan';
import { useTheme } from '@/lib/theme';
import { usePrivacy } from '@/lib/privacy';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { AppText } from '../ui/Text';
import { TextField } from '../ui/TextField';

export interface ScenarioSheetProps {
  open: boolean;
  baseline: FireCalculationResult;
  onClose: () => void;
}

const signed = (value: number, formatter: (n: number) => string) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatter(Math.abs(value))}`;

interface Draft {
  retirementMonth: string;
  monthlyContribution: string;
  monthlySpending: string;
  beforeReturn: string;
  afterReturn: string;
  inflation: string;
}

const draftFrom = (plan: RetirementPlan): Draft => ({
  retirementMonth: plan.retirementMonth,
  monthlyContribution: String(plan.monthlyContribution),
  monthlySpending: String(plan.monthlySpending),
  beforeReturn: String(Number((plan.beforeReturn * 100).toFixed(4))),
  afterReturn: String(Number((plan.afterReturn * 100).toFixed(4))),
  inflation: String(Number((plan.inflation * 100).toFixed(4))),
});

/** Turn the typed draft into plan overrides, or a message when a field is not usable yet. */
function parseDraft(draft: Draft, plan: RetirementPlan, today: string): { overrides: PlanOverrides } | { error: string } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.retirementMonth) || draft.retirementMonth < today.slice(0, 7)) return { error: 'Retirement month must be YYYY-MM, this month or later.' };
  const money = (value: string) => (value.trim() === '' ? NaN : Math.ceil(Number(value)));
  const rate = (value: string) => (value.trim() === '' ? NaN : Number(value) / 100);
  const overrides: PlanOverrides = {
    retirementMonth: draft.retirementMonth,
    monthlyContribution: money(draft.monthlyContribution),
    monthlySpending: money(draft.monthlySpending),
    beforeReturn: rate(draft.beforeReturn),
    afterReturn: rate(draft.afterReturn),
    inflation: rate(draft.inflation),
  };
  if (![overrides.monthlyContribution, overrides.monthlySpending].every((value) => Number.isFinite(value) && value! >= 0)) return { error: 'Enter valid spending and investment amounts.' };
  if (![overrides.beforeReturn, overrides.afterReturn].every((value) => Number.isFinite(value) && value! >= -0.2 && value! <= 0.3) || !Number.isFinite(overrides.inflation) || overrides.inflation! < 0 || overrides.inflation! > 0.2) {
    return { error: 'Returns must be between -20% and 30%, inflation between 0% and 20%.' };
  }
  // Drop untouched fields so the comparison lists only what actually changed.
  (Object.keys(overrides) as (keyof PlanOverrides)[]).forEach((key) => {
    if (overrides[key] === plan[key]) delete overrides[key];
  });
  return { overrides };
}

/** Compare one unsaved change set against the saved plan. Nothing here writes to the store. */
export function ScenarioSheet({ open, baseline, onClose }: ScenarioSheetProps) {
  const { theme } = useTheme();
  const { money, currency } = usePrivacy();
  const amount = (value: string | null | undefined) => (value == null ? 'Unavailable' : money(Number(value), 0));
  const plan = baseline.plan!;
  const [draft, setDraft] = useState<Draft>(() => draftFrom(plan));
  const [overrides, setOverrides] = useState<PlanOverrides | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scenario = useFireProjection(overrides ?? undefined);

  useEffect(() => {
    if (!open) return;
    setDraft(draftFrom(plan));
    setOverrides(null);
    setError(null);
  }, [open, plan]);

  const set = (key: keyof Draft) => (text: string) => {
    setOverrides(null);
    setDraft((current) => ({ ...current, [key]: key === 'retirementMonth' ? text.replace(/[^\d-]/g, '').slice(0, 7) : sanitizeAmountInput(text) }));
  };

  function compare() {
    const parsed = parseDraft(draft, plan, baseline.effectiveDate);
    if ('error' in parsed) {
      setError(parsed.error);
      setOverrides(null);
      return;
    }
    setError(null);
    setOverrides(parsed.overrides);
  }

  const result = overrides ? scenario.result : null;
  const changedKeys = overrides ? (Object.keys(overrides) as (keyof PlanOverrides)[]) : [];
  const toNumber = (value: string | null | undefined) => (value == null ? null : Number(value));
  const rows: { key: 'fiTarget' | 'projectedPortfolio' | 'fundingGap' | 'requiredMonthlyInvestment'; label: string }[] = [
    { key: 'fiTarget', label: 'Amount needed' },
    { key: 'projectedPortfolio', label: 'Projected portfolio' },
    { key: 'fundingGap', label: 'Remaining needed amount' },
    { key: 'requiredMonthlyInvestment', label: 'Monthly investment needed' },
  ];
  const months = (value: string | null | undefined) => (value ? monthIndex(value) : null);
  const earliestDelta = result && months(result.earliestRetirementMonth) !== null && months(baseline.earliestRetirementMonth) !== null
    ? months(result.earliestRetirementMonth)! - months(baseline.earliestRetirementMonth)!
    : null;

  const field = (key: keyof Draft, label: string, saved: string, keyboard: 'default' | 'decimal-pad' = 'decimal-pad') => (
    <TextField label={label} help={`Saved: ${saved}`} value={draft[key]} onChangeText={set(key)} keyboardType={keyboard} autoCapitalize="none" autoCorrect={false} />
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Try a scenario"
      description="Change a few inputs and compare. Your saved plan stays as it is."
      footer={(
        <View style={styles.footer}>
          <Button label="Reset" variant="text" onPress={() => { setDraft(draftFrom(plan)); setOverrides(null); setError(null); }} />
          <Button label="Compare scenario" block style={styles.grow} onPress={compare} />
        </View>
      )}
    >
      <View style={styles.form}>
        {field('retirementMonth', 'Retirement month', `${fireMonthLabel(plan.retirementMonth)} (type as YYYY-MM)`, 'default')}
        {field('monthlyContribution', `Monthly investment (${currency})`, money(plan.monthlyContribution, 0))}
        {field('monthlySpending', `Monthly spending today (${currency})`, money(plan.monthlySpending, 0))}
        {field('beforeReturn', 'Return before retirement (%)', pct(plan.beforeReturn))}
        {field('afterReturn', 'Return after retirement (%)', pct(plan.afterReturn))}
        {field('inflation', 'Inflation (%)', pct(plan.inflation))}
        {error ? <AppText variant="bodySmall" tone="danger">{error}</AppText> : null}

        {result ? (
          result.fundingStatus === 'review_required' ? (
            <AppText variant="bodySmall" tone="warning">{result.warnings.map((warning) => warning.message).join(' ')}</AppText>
          ) : (
            <View style={[styles.result, { borderColor: theme.line, backgroundColor: theme.surface2 }]}>
              <AppText variant="bodyMedium">
                <AppText variant="bodySemibold" tone={result.fundingStatus === 'funded' ? 'income' : 'expense'}>{result.fundingStatus === 'funded' ? 'Funded' : 'Shortfall'}</AppText>
                {` through age ${plan.endAge} under this scenario${changedKeys.length ? '' : ' (nothing changed)'}.`}
              </AppText>
              <View style={[styles.tableHead, { borderBottomColor: theme.line }]}>
                <AppText variant="overline" tone="ink2" style={styles.cellLabel}>Future dollars</AppText>
                <AppText variant="overline" tone="ink2" style={styles.cell} align="right">Saved</AppText>
                <AppText variant="overline" tone="ink2" style={styles.cell} align="right">Scenario</AppText>
              </View>
              {rows.map(({ key, label }) => {
                const a = toNumber(baseline[key]);
                const b = toNumber(result[key]);
                const better = a !== null && b !== null && b !== a ? (key === 'projectedPortfolio' ? b > a : b < a) : null;
                return (
                  <View key={key} style={styles.tableRow}>
                    <View style={styles.cellLabel}>
                      <AppText variant="bodySmall">{label}</AppText>
                      <AppText variant="caption" tone={better === null ? 'ink3' : better ? 'income' : 'expense'}>
                        {a === null || b === null ? 'Unavailable' : b === a ? 'No change' : signed(b - a, (n) => money(n, 0))}
                      </AppText>
                    </View>
                    <AppText variant="amountSmall" style={styles.cell} align="right">{amount(baseline[key])}</AppText>
                    <AppText variant="amountSmall" style={styles.cell} align="right">{amount(result[key])}</AppText>
                  </View>
                );
              })}
              <View style={styles.tableRow}>
                <View style={styles.cellLabel}>
                  <AppText variant="bodySmall">Funded</AppText>
                  <AppText variant="caption" tone="ink3">{signed((Number(result.progressRate ?? 0) - Number(baseline.progressRate ?? 0)) * 100, (n) => `${n.toFixed(1)} pts`)}</AppText>
                </View>
                <AppText variant="amountSmall" style={styles.cell} align="right">{(Number(baseline.progressRate ?? 0) * 100).toFixed(1)}%</AppText>
                <AppText variant="amountSmall" style={styles.cell} align="right">{(Number(result.progressRate ?? 0) * 100).toFixed(1)}%</AppText>
              </View>
              <View style={styles.tableRow}>
                <View style={styles.cellLabel}>
                  <AppText variant="bodySmall">Earliest you could retire</AppText>
                  <AppText variant="caption" tone="ink3">{earliestDelta === null ? 'Unavailable' : earliestDelta === 0 ? 'No change' : `${Math.abs(earliestDelta)} months ${earliestDelta < 0 ? 'earlier' : 'later'}`}</AppText>
                </View>
                <AppText variant="caption" style={styles.cell} align="right">{baseline.earliestRetirementMonth ? fireMonthLabel(baseline.earliestRetirementMonth) : 'Not found'}</AppText>
                <AppText variant="caption" style={styles.cell} align="right">{result.earliestRetirementMonth ? fireMonthLabel(result.earliestRetirementMonth) : 'Not found'}</AppText>
              </View>
            </View>
          )
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  grow: {
    flex: 1,
  },
  result: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  tableHead: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cellLabel: {
    flex: 1.4,
    minWidth: 0,
  },
  cell: {
    flex: 1,
    minWidth: 0,
  },
});
