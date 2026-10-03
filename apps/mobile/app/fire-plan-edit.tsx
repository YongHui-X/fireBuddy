import {
  calendarMonth,
  getDeviceDateKey,
  latestSnapshotByPosition,
  monthIndex,
  sanitizeAmountInput,
  validateRetirementPlan,
  type RetirementIncome,
  type RetirementPlan,
} from '@firebuddy/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { DateField } from '@/components/ui/DateField';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AppText } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { spacing } from '@/constants/tokens';
import { pct } from '@/hooks/use-fire-plan';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { usePrivacy } from '@/lib/privacy';
import { useTheme } from '@/lib/theme';

// Same presets as the web setup wizard: retirement spending as a share of today's expenses.
// Nothing is stored; the active style is read back from the spending figure.
const fireStyles = [
  { key: 'lean', label: 'Lean', ratio: 0.6, blurb: 'Frugal retirement, about 60% of what you spend now.' },
  { key: 'regular', label: 'Regular', ratio: 1, blurb: 'Keep your current lifestyle in retirement.' },
  { key: 'fat', label: 'Fat', ratio: 1.5, blurb: 'A more comfortable retirement, about 150% of what you spend now.' },
] as const;
type FireStyle = (typeof fireStyles)[number]['key'] | 'custom';
const otherStylesHint = 'Coast FIRE: set your monthly investment to 0. Barista FIRE: add part-time income below.';

const cpfOptions = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'standard', label: 'Standard' },
  { value: 'escalating', label: 'Escalating' },
  { value: 'basic', label: 'Basic' },
] as const;
const cpfAges = [65, 66, 67, 68, 69, 70].map((age) => ({ value: String(age), label: String(age) }));

/** Text drafts for every editable plan value. Numbers are parsed once on save. */
interface Draft {
  birthMonth: string;
  retirementAge: string;
  endAge: string;
  monthlySpending: string;
  monthlyContribution: string;
  assetIds: string[];
  useOverride: boolean;
  overrideAmount: string;
  overrideDate: string;
  cpfPlan: RetirementPlan['cpfPlan'];
  cpfStartAge: string;
  cpfMonthlyPayout: string;
  otherIncome: { label: string; monthlyAmount: string; startMonth: string; endMonth: string; annualGrowth: string }[];
  beforeReturn: string;
  afterReturn: string;
  inflation: string;
}

const rateText = (rate: number) => String(Number((rate * 100).toFixed(4)));
const monthText = (text: string) => text.replace(/[^\d-]/g, '').slice(0, 7);
const retirementAtAge = (birth: string, age: number) => (birth ? calendarMonth(monthIndex(birth) + age * 12) : '');
const ageIn = (birth: string, month: string) => Math.floor((monthIndex(month) - monthIndex(birth)) / 12);

function draftFrom(plan: RetirementPlan, today: string, activeAssetIds: readonly string[] = plan.assetIds): Draft {
  const validBirth = /^\d{4}-\d{2}$/.test(plan.birthMonth) && /^\d{4}-\d{2}$/.test(plan.retirementMonth);
  return {
    birthMonth: plan.birthMonth,
    retirementAge: validBirth ? String(ageIn(plan.birthMonth, plan.retirementMonth)) : '',
    endAge: String(plan.endAge),
    monthlySpending: String(plan.monthlySpending),
    monthlyContribution: String(plan.monthlyContribution),
    assetIds: plan.assetIds.filter((id) => activeAssetIds.includes(id)),
    useOverride: plan.portfolioOverride !== null,
    overrideAmount: String(plan.portfolioOverride?.amount ?? 0),
    overrideDate: plan.portfolioOverride?.date ?? today,
    cpfPlan: plan.cpfPlan,
    cpfStartAge: String(plan.cpfStartAge),
    cpfMonthlyPayout: String(plan.cpfMonthlyPayout),
    otherIncome: plan.otherIncome.map((item) => ({ label: item.label, monthlyAmount: String(item.monthlyAmount), startMonth: item.startMonth, endMonth: item.endMonth, annualGrowth: rateText(item.annualGrowth) })),
    beforeReturn: rateText(plan.beforeReturn),
    afterReturn: rateText(plan.afterReturn),
    inflation: rateText(plan.inflation),
  };
}

/** Build the plan the shared engine validates. Provenance marks every value as typed by the person. */
function planFrom(draft: Draft, base: RetirementPlan, today: string): RetirementPlan {
  const money = (value: string) => (value.trim() === '' ? NaN : Math.ceil(Number(value)));
  const rate = (value: string) => (value.trim() === '' ? NaN : Number(value) / 100);
  const whole = (value: string) => (value.trim() === '' ? NaN : Number(value));
  const retirementAge = whole(draft.retirementAge);
  const otherIncome: RetirementIncome[] = draft.otherIncome.map((item) => ({
    label: item.label.trim(),
    monthlyAmount: money(item.monthlyAmount),
    startMonth: item.startMonth,
    endMonth: item.endMonth,
    annualGrowth: rate(item.annualGrowth),
  }));
  const spendingChanged = money(draft.monthlySpending) !== base.monthlySpending;
  const keys = ['birthMonth', 'retirementMonth', 'endAge', 'monthlySpending', 'monthlyContribution', 'assetIds', 'portfolioOverride', 'cpfPlan', 'cpfStartAge', 'cpfMonthlyPayout', 'otherIncome', 'beforeReturn', 'afterReturn', 'inflation'];
  return {
    ...base,
    version: 2,
    // Spending is a today's-money figure, so an edit re-dates it to this month.
    spendingMonth: spendingChanged ? today.slice(0, 7) : base.spendingMonth,
    birthMonth: draft.birthMonth,
    retirementMonth: Number.isInteger(retirementAge) && /^\d{4}-\d{2}$/.test(draft.birthMonth) ? retirementAtAge(draft.birthMonth, retirementAge) : '',
    endAge: whole(draft.endAge),
    monthlySpending: money(draft.monthlySpending),
    monthlyContribution: money(draft.monthlyContribution),
    assetIds: draft.useOverride ? [] : draft.assetIds,
    portfolioOverride: draft.useOverride ? { amount: money(draft.overrideAmount), date: draft.overrideDate } : null,
    cpfPlan: draft.cpfPlan,
    cpfStartAge: whole(draft.cpfStartAge),
    cpfMonthlyPayout: money(draft.cpfMonthlyPayout),
    otherIncome,
    beforeReturn: rate(draft.beforeReturn),
    afterReturn: rate(draft.afterReturn),
    inflation: rate(draft.inflation),
    provenance: { ...base.provenance, ...Object.fromEntries(keys.map((key) => [key, 'user-entered'])), ...(spendingChanged ? { spendingMonth: 'user-entered' } : {}) },
  };
}

/**
 * Edit every value of the saved retirement plan in one scrolling form. The shared validator
 * decides whether the result is usable; the projection screen recalculates from the saved plan.
 */
export default function FirePlanEditScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { money } = usePrivacy();
  const { retirementPlan, positions, snapshots, transactions, setRetirementPlan, notify } = useFireBuddy();
  const today = useMemo(() => getDeviceDateKey(), []);
  const base = retirementPlan;
  const latest = useMemo(() => latestSnapshotByPosition(snapshots, today), [snapshots, today]);
  const assets = useMemo(() => positions.filter((item) => !item.isArchived && item.positionKind === 'asset'), [positions]);
  const [draft, setDraft] = useState<Draft>(() => (base ? draftFrom(base, today, assets.map((item) => item.id)) : emptyDraft(today)));
  const [error, setError] = useState<string | null>(null);
  // Average of recorded expenses over the last twelve months, the base for the FIRE style presets.
  const recordedExpenses = useMemo(() => {
    const start = calendarMonth(monthIndex(today.slice(0, 7)) - 12);
    const items = transactions.filter((item) => item.transactionType === 'expense' && item.date.slice(0, 7) >= start && item.date.slice(0, 7) < today.slice(0, 7));
    if (!items.length) return null;
    // Divide by every completed month from the first recorded expense onwards, so a gap month counts as a month.
    const first = items.reduce((min, item) => (item.date.slice(0, 7) < min ? item.date.slice(0, 7) : min), items[0]!.date.slice(0, 7));
    const months = Math.max(1, monthIndex(today.slice(0, 7)) - monthIndex(first));
    return items.reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0) / months;
  }, [transactions, today]);
  const spendingNumber = draft.monthlySpending.trim() === '' ? NaN : Math.ceil(Number(draft.monthlySpending));
  const activeStyle: FireStyle = recordedExpenses ? fireStyles.find((style) => Math.ceil(recordedExpenses * style.ratio) === spendingNumber)?.key ?? 'custom' : 'custom';
  const styleOptions = [...fireStyles.map((style) => ({ value: style.key as FireStyle, label: style.label })), { value: 'custom' as FireStyle, label: 'Custom' }];

  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => {
    setError(null);
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const text = (key: 'birthMonth' | 'retirementAge' | 'endAge' | 'monthlySpending' | 'monthlyContribution' | 'overrideAmount' | 'cpfMonthlyPayout' | 'beforeReturn' | 'afterReturn' | 'inflation') => (value: string) =>
    set(key)(key === 'birthMonth' ? monthText(value) : sanitizeAmountInput(value));
  const income = (index: number, key: keyof Draft['otherIncome'][number]) => (value: string) => {
    setError(null);
    setDraft((current) => ({
      ...current,
      otherIncome: current.otherIncome.map((item, i) => (i === index ? { ...item, [key]: key === 'label' ? value : key.endsWith('Month') ? monthText(value) : sanitizeAmountInput(value) } : item)),
    }));
  };
  const selectedTotal = draft.useOverride
    ? Math.ceil(Number(draft.overrideAmount) || 0)
    : draft.assetIds.reduce((sum, id) => sum + Number(latest.get(id)?.amount ?? 0), 0);
  const cpfIncluded = draft.cpfPlan === 'standard' || draft.cpfPlan === 'escalating';

  function save() {
    const plan = planFrom(draft, base ?? emptyPlan(today), today);
    const invalid = validateRetirementPlan(plan, today);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!plan.portfolioOverride && plan.assetIds.some((id) => !assets.some((asset) => asset.id === id) || !latest.has(id))) {
      setError('Every ticked asset needs a dated value in Wealth, or type your total instead.');
      return;
    }
    setRetirementPlan(plan);
    notify('Plan saved. Your projection has been recalculated.');
    router.back();
  }

  return (
    <Screen>
      <PageToolbar title="Edit plan" description="Change any value. The projection recalculates when you save." onBack={() => router.back()} />

      <Card>
        <CardHeader title="Your timeline" />
        <View style={styles.form}>
          <TextField label="Birth month" help="Type as YYYY-MM" value={draft.birthMonth} onChangeText={text('birthMonth')} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
          <TextField label="Intended retirement age" value={draft.retirementAge} onChangeText={text('retirementAge')} keyboardType="number-pad" />
          <TextField label="Plan through age" help="How long the money must last, 50 to 120." value={draft.endAge} onChangeText={text('endAge')} keyboardType="number-pad" />
        </View>
      </Card>

      <Card>
        <CardHeader title="Spending and investing" />
        <View style={styles.form}>
          <View style={styles.block}>
            <AppText variant="bodySmall">Which kind of FIRE are you aiming for?</AppText>
            <SegmentedControl
              options={styleOptions}
              value={activeStyle}
              accessibilityLabel="FIRE style"
              onChange={(value) => {
                if (value === 'custom' || !recordedExpenses) return;
                const style = fireStyles.find((item) => item.key === value)!;
                set('monthlySpending')(String(Math.ceil(recordedExpenses * style.ratio)));
              }}
            />
            <AppText variant="caption" tone="ink3">
              {activeStyle !== 'custom' ? fireStyles.find((style) => style.key === activeStyle)!.blurb : recordedExpenses ? 'Your own figure.' : 'Record some expenses to unlock the Lean, Regular and Fat presets, or type your own figure.'} {otherStylesHint}
            </AppText>
          </View>
          <TextField label="Retirement spending per month (today’s SGD)" help={recordedExpenses ? `You spend about ${money(recordedExpenses, 0)} a month now.` : undefined} value={draft.monthlySpending} onChangeText={text('monthlySpending')} keyboardType="decimal-pad" />
          <TextField label="Monthly investment (SGD)" help="What you add to the ticked assets each month until retirement." value={draft.monthlyContribution} onChangeText={text('monthlyContribution')} keyboardType="decimal-pad" />
        </View>
      </Card>

      <Card>
        <CardHeader title="Retirement assets" subtitle={`Starting portfolio: ${money(selectedTotal, 0)}`} />
        <View style={styles.form}>
          <ToggleRow label="Type my total myself" help="Instead of adding up assets from Wealth." value={draft.useOverride} onChange={set('useOverride')} />
          {draft.useOverride ? (
            <>
              <TextField label="My total investments today (SGD)" value={draft.overrideAmount} onChangeText={text('overrideAmount')} keyboardType="decimal-pad" />
              <DateField label="As of which date?" value={draft.overrideDate} onChange={set('overrideDate')} maximumDate={new Date()} />
            </>
          ) : assets.length ? (
            assets.map((asset) => {
              const value = latest.get(asset.id);
              const on = draft.assetIds.includes(asset.id);
              return (
                <ToggleRow
                  key={asset.id}
                  label={asset.name}
                  help={value ? `${money(Number(value.amount), 0)} recorded ${value.valueDate}` : 'No dated value yet'}
                  value={on}
                  onChange={(next) => set('assetIds')(next ? [...draft.assetIds, asset.id] : draft.assetIds.filter((id) => id !== asset.id))}
                />
              );
            })
          ) : (
            <AppText variant="bodySmall" tone="ink2">No assets in Wealth yet. Add some there, or type your total above.</AppText>
          )}
        </View>
      </Card>

      <Card>
        <CardHeader title="Retirement income" subtitle="In the dollars of the year it starts." />
        <View style={styles.form}>
          <View style={styles.block}>
            <AppText variant="bodySmall">CPF LIFE plan</AppText>
            <SegmentedControl options={cpfOptions} value={draft.cpfPlan} accessibilityLabel="CPF LIFE plan" onChange={set('cpfPlan')} />
            {!cpfIncluded ? <AppText variant="caption" tone="ink3">{draft.cpfPlan === 'basic' ? 'Basic declining payouts are not modelled, so no CPF income is included.' : 'No CPF payout is assumed until you choose a plan.'}</AppText> : null}
          </View>
          {cpfIncluded ? (
            <>
              <TextField label="CPF LIFE payout per month (SGD)" value={draft.cpfMonthlyPayout} onChangeText={text('cpfMonthlyPayout')} keyboardType="decimal-pad" />
              <View style={styles.block}>
                <AppText variant="bodySmall">Payout start age</AppText>
                <SegmentedControl options={cpfAges} value={draft.cpfStartAge} accessibilityLabel="CPF LIFE payout start age" onChange={set('cpfStartAge')} />
                <AppText variant="caption" tone="ink3">Deferring raises the monthly payout; enter the payout for the age you choose.</AppText>
              </View>
            </>
          ) : null}

          <AppText variant="bodySemibold">Other retirement income</AppText>
          {draft.otherIncome.map((item, index) => (
            <View key={index} style={[styles.incomeBlock, { borderColor: theme.line }]}>
              <TextField label="Description" value={item.label} onChangeText={income(index, 'label')} placeholder="Part-time work, rental…" />
              <TextField label="Monthly net SGD at start" value={item.monthlyAmount} onChangeText={income(index, 'monthlyAmount')} keyboardType="decimal-pad" />
              <TextField label="Start month" help="YYYY-MM" value={item.startMonth} onChangeText={income(index, 'startMonth')} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
              <TextField label="End month (exclusive)" help="YYYY-MM" value={item.endMonth} onChangeText={income(index, 'endMonth')} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
              <TextField label="Annual growth (%)" value={item.annualGrowth} onChangeText={income(index, 'annualGrowth')} keyboardType="decimal-pad" />
              <Button label="Remove income" variant="text" size="compact" onPress={() => set('otherIncome')(draft.otherIncome.filter((_, i) => i !== index))} />
            </View>
          ))}
          <Button
            label="Add other income"
            variant="secondary"
            disabled={draft.otherIncome.length >= 20}
            onPress={() => {
              const retirementMonth = /^\d{4}-\d{2}$/.test(draft.birthMonth) && draft.retirementAge ? retirementAtAge(draft.birthMonth, Number(draft.retirementAge)) : today.slice(0, 7);
              const endMonth = /^\d{4}-\d{2}$/.test(draft.birthMonth) && draft.endAge ? retirementAtAge(draft.birthMonth, Number(draft.endAge)) : retirementMonth;
              set('otherIncome')([...draft.otherIncome, { label: '', monthlyAmount: '0', startMonth: retirementMonth, endMonth, annualGrowth: '0' }]);
            }}
          />
        </View>
      </Card>

      <Card>
        <CardHeader title="Assumptions" subtitle="Editable assumptions, not forecasts." />
        <View style={styles.form}>
          <TextField label="Return before retirement (%)" help={`Default ${pct(0.05)}. Yearly growth while you are still investing.`} value={draft.beforeReturn} onChangeText={text('beforeReturn')} keyboardType="decimal-pad" />
          <TextField label="Return after retirement (%)" help={`Default ${pct(0.03)}. Yearly growth once you are drawing down.`} value={draft.afterReturn} onChangeText={text('afterReturn')} keyboardType="decimal-pad" />
          <TextField label="Inflation (%)" help={`Default ${pct(0.03)}. Yearly rise in your spending.`} value={draft.inflation} onChangeText={text('inflation')} keyboardType="decimal-pad" />
        </View>
      </Card>

      {error ? <AppText variant="bodySmall" tone="danger">{error}</AppText> : null}
      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        <Button label="Save plan" block style={styles.grow} onPress={save} />
      </View>
    </Screen>
  );
}

/** A blank plan for a phone that has never had one; the validator explains what is still missing. */
function emptyPlan(today: string): RetirementPlan {
  return {
    version: 2, spendingMonth: today.slice(0, 7), birthMonth: '', retirementMonth: '', endAge: 95, monthlySpending: 0, monthlyContribution: 0,
    assetIds: [], portfolioOverride: null, cpfPlan: 'unknown', cpfStartAge: 65, cpfMonthlyPayout: 0, otherIncome: [],
    beforeReturn: 0.05, afterReturn: 0.03, inflation: 0.03, provenance: {},
  };
}
function emptyDraft(today: string): Draft {
  return draftFrom(emptyPlan(today), today);
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  block: {
    gap: spacing.sm,
  },
  incomeBlock: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  grow: {
    flex: 1,
  },
});
