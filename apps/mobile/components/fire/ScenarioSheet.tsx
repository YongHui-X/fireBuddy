import { monthIndex, sanitizeAmountInput, validateRetirementPlan, type FireCalculationResult, type RetirementPlan } from '@firebuddy/shared';
import { ArrowRight, Check } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { ageAt, fireMonthLabel, pct, todaysMoney, useFireProjection, type PlanOverrides } from '@/hooks/use-fire-plan';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useTheme } from '@/lib/theme';
import { usePrivacy } from '@/lib/privacy';
import { useResetWhen } from '@/hooks/use-reset-when';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { AppText } from '../ui/Text';
import { TextField } from '../ui/TextField';

export interface ScenarioSheetProps {
  open: boolean;
  baseline: FireCalculationResult;
  onClose: () => void;
}


interface Draft {
  retirementMonth: string;
  monthlyContribution: string;
  monthlySpending: string;
  beforeReturn: string;
  afterReturn: string;
  inflation: string;
}

const draftFrom = (plan: RetirementPlan): Draft => ({
  retirementMonth: plan.retirementMonth.slice(0, 4),
  monthlyContribution: String(plan.monthlyContribution),
  monthlySpending: String(plan.monthlySpending),
  beforeReturn: String(Number((plan.beforeReturn * 100).toFixed(4))),
  afterReturn: String(Number((plan.afterReturn * 100).toFixed(4))),
  inflation: String(Number((plan.inflation * 100).toFixed(4))),
});

/** Turn the typed draft into plan overrides, or a message when a field is not usable yet. A one-return plan moves both returns together. */
function parseDraft(draft: Draft, plan: RetirementPlan, today: string, oneReturn: boolean): { overrides: PlanOverrides } | { error: string } {
  // A year only: the month follows the birth month so the age stays whole, and never falls before this month.
  if (!/^\d{4}$/.test(draft.retirementMonth) || draft.retirementMonth < today.slice(0, 4)) return { error: `Enter a year from ${today.slice(0, 4)} onwards.` };
  const typedMonth = `${draft.retirementMonth}-${plan.birthMonth.slice(5, 7)}`;
  const retirementMonth = typedMonth < today.slice(0, 7) ? today.slice(0, 7) : typedMonth;
  const money = (value: string) => (value.trim() === '' ? NaN : Math.ceil(Number(value)));
  const rate = (value: string) => (value.trim() === '' ? NaN : Number(value) / 100);
  const overrides: PlanOverrides = {
    retirementMonth,
    monthlyContribution: money(draft.monthlyContribution),
    monthlySpending: money(draft.monthlySpending),
    beforeReturn: rate(draft.beforeReturn),
    afterReturn: rate(oneReturn ? draft.beforeReturn : draft.afterReturn),
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

/** "2 years 3 months" for a count of months. */
function duration(months: number) {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years ? `${years} year${years === 1 ? '' : 's'}` : '', rest ? `${rest} month${rest === 1 ? '' : 's'}` : ''].filter(Boolean).join(' ') || '0 months';
}

/**
 * Compare one unsaved change set against the saved plan, in today's money only, one metric per
 * row ("Your plan → This scenario"). Nothing is saved unless the person taps "Use these numbers".
 */
export function ScenarioSheet({ open, baseline, onClose }: ScenarioSheetProps) {
  const { theme } = useTheme();
  const { money, currency } = usePrivacy();
  const { retirementPlan, setRetirementPlan, notify } = useFireBuddy();
  const plan = baseline.plan!;
  const [draft, setDraft] = useState<Draft>(() => draftFrom(plan));
  const [overrides, setOverrides] = useState<PlanOverrides | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scenario = useFireProjection(overrides ?? undefined);
  const scroller = useRef<ScrollView>(null);
  const oneReturn = plan.beforeReturn === plan.afterReturn;

  useResetWhen(open, () => {
    setDraft(draftFrom(plan));
    setOverrides(null);
    setError(null);
  });

  const set = (key: keyof Draft) => (text: string) => {
    setOverrides(null);
    setDraft((current) => ({ ...current, [key]: key === 'retirementMonth' ? text.replace(/\D/g, '').slice(0, 4) : sanitizeAmountInput(text) }));
  };

  function compare() {
    const parsed = parseDraft(draft, plan, baseline.effectiveDate, oneReturn);
    // The comparison sits at the top of the sheet: close the keyboard and bring it into view.
    Keyboard.dismiss();
    requestAnimationFrame(() => scroller.current?.scrollTo({ y: 0, animated: true }));
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
  // Each figure in today's money, priced at that plan's own stop-work month and inflation.
  type Metric = { key: string; label: string; before: string; after: string; delta: { text: string; better: boolean | null } | null };
  const metrics: Metric[] = [];
  if (result) {
    const base = baseline.plan!;
    const next = result.plan!;
    const realBefore = todaysMoney(baseline);
    const realAfter = todaysMoney(result);
    const atStop = (fire: FireCalculationResult, real: ReturnType<typeof todaysMoney>, key: 'fiTarget' | 'projectedPortfolio' | 'fundingGap') => real(fire[key], fire.plan!.retirementMonth);
    const moneyMetric = (key: string, label: string, before: number | null, after: number | null, higherIsBetter: boolean) => {
      const diff = before !== null && after !== null ? Math.round(after - before) : null;
      metrics.push({
        key,
        label,
        before: before === null ? 'Not available' : money(before, 0),
        after: after === null ? 'Not available' : money(after, 0),
        delta: diff === null || diff === 0 ? null : { text: `${diff > 0 ? '+' : '−'}${money(Math.abs(diff), 0)}`, better: higherIsBetter ? diff > 0 : diff < 0 },
      });
    };
    const earliest = (fire: FireCalculationResult) => (fire.earliestRetirementMonth ? `Age ${ageAt(fire.plan!, fire.earliestRetirementMonth)}, ${fireMonthLabel(fire.earliestRetirementMonth)}` : 'Not on this plan');
    const shift = baseline.earliestRetirementMonth && result.earliestRetirementMonth ? monthIndex(result.earliestRetirementMonth) - monthIndex(baseline.earliestRetirementMonth) : null;
    metrics.push({
      key: 'earliest',
      label: 'Earliest you could stop working',
      before: earliest(baseline),
      after: earliest(result),
      delta: shift ? { text: `${duration(Math.abs(shift))} ${shift < 0 ? 'earlier' : 'later'}`, better: shift < 0 } : null,
    });
    if (next.retirementMonth !== base.retirementMonth) {
      metrics.push({ key: 'stop', label: 'You stop working', before: `Age ${ageAt(base, base.retirementMonth)}, ${fireMonthLabel(base.retirementMonth)}`, after: `Age ${ageAt(next, next.retirementMonth)}, ${fireMonthLabel(next.retirementMonth)}`, delta: null });
    }
    moneyMetric('needed', 'Amount needed', atStop(baseline, realBefore, 'fiTarget'), atStop(result, realAfter, 'fiTarget'), false);
    moneyMetric('projected', 'Projected amount', atStop(baseline, realBefore, 'projectedPortfolio'), atStop(result, realAfter, 'projectedPortfolio'), true);
    if (Number(baseline.fundingGap ?? 0) > 0 || Number(result.fundingGap ?? 0) > 0) {
      moneyMetric('gap', 'Shortfall', atStop(baseline, realBefore, 'fundingGap'), atStop(result, realAfter, 'fundingGap'), false);
    }
    moneyMetric('required', 'Monthly investment needed', baseline.requiredMonthlyInvestment == null ? null : Number(baseline.requiredMonthlyInvestment), result.requiredMonthlyInvestment == null ? null : Number(result.requiredMonthlyInvestment), false);
    const fundedBefore = Number(baseline.progressRate ?? 0) * 100;
    const fundedAfter = Number(result.progressRate ?? 0) * 100;
    const points = Math.round((fundedAfter - fundedBefore) * 10) / 10;
    metrics.push({ key: 'funded', label: 'Funded', before: `${fundedBefore.toFixed(1)}%`, after: `${fundedAfter.toFixed(1)}%`, delta: points ? { text: `${points > 0 ? '+' : '−'}${Math.abs(points).toFixed(1)} pts`, better: points > 0 } : null });
  }

  const canApply = Boolean(result && result.fundingStatus !== 'review_required' && changedKeys.length);

  /** Save the scenario's numbers as the plan. Spending re-dates to this month, as Edit plan does. */
  function apply() {
    if (!overrides || !retirementPlan) return;
    const keys = Object.keys(overrides);
    const next: RetirementPlan = {
      ...retirementPlan,
      ...overrides,
      spendingMonth: overrides.monthlySpending !== undefined ? baseline.effectiveDate.slice(0, 7) : retirementPlan.spendingMonth,
      provenance: { ...retirementPlan.provenance, ...Object.fromEntries(keys.map((key) => [key, 'user-entered' as const])) },
    };
    const invalid = validateRetirementPlan(next, baseline.effectiveDate);
    if (invalid) {
      setError(invalid);
      return;
    }
    setRetirementPlan(next);
    notify('Plan updated with these numbers.');
    onClose();
  }

  const field = (key: keyof Draft, label: string, saved: string, keyboard: 'number-pad' | 'decimal-pad' = 'decimal-pad') => (
    <TextField label={label} help={`Saved: ${saved}`} value={draft[key]} onChangeText={set(key)} keyboardType={keyboard} autoCapitalize="none" autoCorrect={false} />
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Try a scenario"
      description="Change a few inputs and compare. Your saved plan stays as it is."
      scrollRef={scroller}
      footer={(
        // After a comparison with changes, "Update plan" takes the main spot in the always-visible footer.
        canApply ? (
          <View style={styles.footer}>
            <Button label="Compare" variant="secondary" onPress={compare} />
            <Button label="Update plan" icon={Check} block style={styles.grow} onPress={apply} />
          </View>
        ) : (
          <View style={styles.footer}>
            <Button label="Reset" variant="text" onPress={() => { setDraft(draftFrom(plan)); setOverrides(null); setError(null); }} />
            <Button label="Compare scenario" block style={styles.grow} onPress={compare} />
          </View>
        )
      )}
    >
      <View style={styles.form}>
        {error ? <AppText variant="bodySmall" tone="danger">{error}</AppText> : null}
        {result ? (
          result.fundingStatus === 'review_required' ? (
            <AppText variant="bodySmall" tone="warning">{result.warnings.map((warning) => warning.message).join(' ')}</AppText>
          ) : (
            <View style={[styles.result, { borderColor: theme.line, backgroundColor: theme.surface2 }]}>
              <View style={styles.resultHead}>
                <Chip label={result.fundingStatus === 'funded' ? 'On track' : 'Shortfall'} tone={result.fundingStatus === 'funded' ? 'income' : 'expense'} round />
                {!changedKeys.length ? <AppText variant="caption" tone="ink2" style={styles.grow}>Nothing changed yet: edit a value below.</AppText> : null}
              </View>
              <View style={styles.legend}>
                <AppText variant="overline" tone="ink3">Your plan</AppText>
                <ArrowRight size={12} color={theme.ink3} />
                <AppText variant="overline" tone="ink">This scenario</AppText>
              </View>
              {metrics.map((metric) => (
                <View key={metric.key} style={[styles.metric, { borderTopColor: theme.line }]}>
                  <View style={styles.metricHead}>
                    <AppText variant="bodySmall" style={styles.grow}>{metric.label}</AppText>
                    {metric.delta ? <Chip label={metric.delta.text} tone={metric.delta.better === null ? 'neutral' : metric.delta.better ? 'income' : 'expense'} round /> : null}
                  </View>
                  <View style={styles.metricValues}>
                    <AppText variant="amountSmall" tone="ink3" numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{metric.before}</AppText>
                    <ArrowRight size={14} color={theme.ink3} />
                    <AppText variant="amount" numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{metric.after}</AppText>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : null}
        {field('retirementMonth', 'Year you stop working', `${plan.retirementMonth.slice(0, 4)} (age ${ageAt(plan, plan.retirementMonth)})`, 'number-pad')}
        {field('monthlyContribution', `Monthly investment (${currency})`, money(plan.monthlyContribution, 0))}
        {field('monthlySpending', `Monthly spending today (${currency})`, money(plan.monthlySpending, 0))}
        {oneReturn
          ? field('beforeReturn', 'Investment return (%)', pct(plan.beforeReturn))
          : (
            <>
              {field('beforeReturn', 'Return before retirement (%)', pct(plan.beforeReturn))}
              {field('afterReturn', 'Return after retirement (%)', pct(plan.afterReturn))}
            </>
          )}
        {field('inflation', 'Inflation (%)', pct(plan.inflation))}

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
  resultHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metric: {
    gap: 4,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metricHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metricValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metricValue: {
    flexShrink: 1,
  },
});
