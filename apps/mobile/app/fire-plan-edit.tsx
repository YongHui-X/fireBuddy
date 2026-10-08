import {
  calendarMonth,
  FIRE_TYPES,
  formatShortMonthLabel,
  getDeviceDateKey,
  latestSnapshotByPosition,
  monthIndex,
  presetSpending,
  sanitizeAmountInput,
  validateRetirementPlan,
  type FireType,
  type RetirementIncome,
  type RetirementPlan,
} from '@firebuddy/shared';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, Flame, Landmark, Plus, Timer } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { DateField } from '@/components/ui/DateField';
import { MonthYearField } from '@/components/ui/MonthYearField';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { AppText } from '@/components/ui/Text';
import { SelectField, TextField } from '@/components/ui/TextField';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { radii, spacing } from '@/constants/tokens';
import { pct } from '@/hooks/use-fire-plan';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { usePrivacy } from '@/lib/privacy';
import { useTheme } from '@/lib/theme';
import { useRegion } from '@/lib/user-profile';

// Checked against CPF Board, 6 Oct 2026: payouts start from 65 and may be deferred to 70 (up to
// 7% more a year, up to 35% at 70); Escalating starts lower and rises 2% a year for life; Basic
// pays less and declines once balances fall low, so it is not modelled here.
const cpfOptions = [
  { value: 'standard', label: 'Standard', detail: 'Level payouts for life' },
  { value: 'escalating', label: 'Escalating', detail: 'Starts lower, then rises 2% a year' },
  { value: 'basic', label: 'Basic', detail: 'Lower, declining payouts; not modelled' },
  { value: 'unknown', label: 'Not sure yet', detail: 'No CPF income is assumed' },
] as const;
const cpfAges = [65, 66, 67, 68, 69, 70];

interface IncomeDraft { key: string; label: string; monthlyAmount: string; startMonth: string; endMonth: string; annualGrowth: string }

// Stable keys for income cards, so removing one never hands its month fields to the next card.
let incomeKeySeed = 0;
const incomeKey = () => `income-${(incomeKeySeed += 1)}`;

/** Text drafts for every editable plan value. Numbers are parsed once on save. */
interface Draft {
  birthMonth: string;
  retirementAge: string;
  endAge: string;
  fireType: FireType;
  monthlySpending: string;
  monthlyContribution: string;
  baristaAmount: string;
  baristaUntilAge: string;
  assetIds: string[];
  useOverride: boolean;
  overrideAmount: string;
  overrideDate: string;
  cpfPlan: RetirementPlan['cpfPlan'];
  cpfStartAge: string;
  cpfMonthlyPayout: string;
  otherIncome: IncomeDraft[];
  beforeReturn: string;
  afterReturn: string;
  inflation: string;
}

const BARISTA_LABEL = 'Part-time income (Barista FIRE)';
const rateText = (rate: number) => String(Number((rate * 100).toFixed(4)));
const atAge = (birth: string, age: number) => (birth ? calendarMonth(monthIndex(birth) + age * 12) : '');
const ageIn = (birth: string, month: string) => Math.floor((monthIndex(month) - monthIndex(birth)) / 12);
const isMonth = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

function draftFrom(plan: RetirementPlan, today: string, activeAssetIds: readonly string[], fresh: boolean): Draft {
  const validBirth = isMonth(plan.birthMonth) && isMonth(plan.retirementMonth);
  const barista = plan.otherIncome.find((item) => item.source === 'barista');
  return {
    birthMonth: isMonth(plan.birthMonth) ? plan.birthMonth : '',
    retirementAge: validBirth ? String(ageIn(plan.birthMonth, plan.retirementMonth)) : '',
    endAge: String(plan.endAge),
    fireType: plan.fireType ?? 'custom',
    monthlySpending: String(plan.monthlySpending),
    monthlyContribution: String(plan.monthlyContribution),
    baristaAmount: barista ? String(barista.monthlyAmount) : '',
    baristaUntilAge: barista && isMonth(plan.birthMonth) ? String(ageIn(plan.birthMonth, barista.endMonth)) : '',
    // A new plan starts from every Wealth asset that has a value; an existing one keeps its ticks.
    assetIds: fresh ? [...activeAssetIds] : plan.assetIds.filter((id) => activeAssetIds.includes(id)),
    useOverride: plan.portfolioOverride !== null,
    overrideAmount: String(plan.portfolioOverride?.amount ?? 0),
    overrideDate: plan.portfolioOverride?.date ?? today,
    cpfPlan: plan.cpfPlan,
    cpfStartAge: String(plan.cpfStartAge),
    cpfMonthlyPayout: String(plan.cpfMonthlyPayout),
    otherIncome: plan.otherIncome.filter((item) => item.source !== 'barista').map((item) => ({ key: incomeKey(), label: item.label, monthlyAmount: String(item.monthlyAmount), startMonth: item.startMonth, endMonth: item.endMonth, annualGrowth: rateText(item.annualGrowth) })),
    beforeReturn: rateText(plan.beforeReturn),
    afterReturn: rateText(plan.afterReturn),
    inflation: rateText(plan.inflation),
  };
}

/** Build the plan the shared engine validates. Provenance marks every value as typed by the person. */
function planFrom(draft: Draft, base: RetirementPlan, today: string, singapore: boolean): RetirementPlan {
  const money = (value: string) => (value.trim() === '' ? NaN : Math.ceil(Number(value)));
  const rate = (value: string) => (value.trim() === '' ? NaN : Number(value) / 100);
  const whole = (value: string) => (value.trim() === '' ? NaN : Number(value));
  const retirementAge = whole(draft.retirementAge);
  const retirementMonth = Number.isInteger(retirementAge) && isMonth(draft.birthMonth) ? atAge(draft.birthMonth, retirementAge) : '';
  const otherIncome: RetirementIncome[] = draft.otherIncome.map((item) => ({
    label: item.label.trim(),
    monthlyAmount: money(item.monthlyAmount),
    startMonth: item.startMonth,
    endMonth: item.endMonth,
    annualGrowth: rate(item.annualGrowth),
  }));
  // Barista FIRE is the part-time income between retirement and the chosen age, kept as one tagged income.
  const baristaAmount = money(draft.baristaAmount);
  const baristaUntil = whole(draft.baristaUntilAge);
  if (draft.fireType === 'barista' && baristaAmount > 0 && Number.isInteger(baristaUntil) && retirementMonth) {
    otherIncome.push({ label: BARISTA_LABEL, monthlyAmount: baristaAmount, startMonth: retirementMonth, endMonth: atAge(draft.birthMonth, baristaUntil), annualGrowth: 0, source: 'barista' });
  }
  const spendingChanged = money(draft.monthlySpending) !== base.monthlySpending;
  const keys = ['birthMonth', 'retirementMonth', 'endAge', 'monthlySpending', 'monthlyContribution', 'assetIds', 'portfolioOverride', 'cpfPlan', 'cpfStartAge', 'cpfMonthlyPayout', 'otherIncome', 'beforeReturn', 'afterReturn', 'inflation'];
  return {
    ...base,
    version: 2,
    // Spending is a today's-money figure, so an edit re-dates it to this month.
    spendingMonth: spendingChanged ? today.slice(0, 7) : base.spendingMonth,
    birthMonth: draft.birthMonth,
    retirementMonth,
    endAge: whole(draft.endAge),
    fireType: draft.fireType,
    monthlySpending: money(draft.monthlySpending),
    monthlyContribution: money(draft.monthlyContribution),
    assetIds: draft.useOverride ? [] : draft.assetIds,
    portfolioOverride: draft.useOverride ? { amount: money(draft.overrideAmount), date: draft.overrideDate } : null,
    // CPF LIFE is Singapore's; the general mode never assumes it.
    cpfPlan: singapore ? draft.cpfPlan : 'unknown',
    cpfStartAge: whole(draft.cpfStartAge),
    cpfMonthlyPayout: singapore ? money(draft.cpfMonthlyPayout) : 0,
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
  const { money, currency } = usePrivacy();
  const { isSingapore } = useRegion();
  const { retirementPlan, positions, snapshots, transactions, setRetirementPlan, notify } = useFireBuddy();
  const today = useMemo(() => getDeviceDateKey(), []);
  const base = retirementPlan;
  const latest = useMemo(() => latestSnapshotByPosition(snapshots, today), [snapshots, today]);
  const assets = useMemo(() => positions.filter((item) => !item.isArchived && item.positionKind === 'asset'), [positions]);
  const valuedAssetIds = useMemo(() => assets.filter((asset) => latest.has(asset.id)).map((asset) => asset.id), [assets, latest]);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(base ?? emptyPlan(today), today, base ? assets.map((item) => item.id) : valuedAssetIds, !base));
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<'fire' | 'cpf' | 'cpfAge' | null>(null);
  const [openIncome, setOpenIncome] = useState<number | null>(null);
  // Average of recorded expenses over the last twelve months, the base for the FIRE type presets.
  const recordedExpenses = useMemo(() => {
    const start = calendarMonth(monthIndex(today.slice(0, 7)) - 12);
    const items = transactions.filter((item) => item.transactionType === 'expense' && item.date.slice(0, 7) >= start && item.date.slice(0, 7) < today.slice(0, 7));
    if (!items.length) return null;
    // Divide by every completed month from the first recorded expense onwards, so a gap month counts as a month.
    const first = items.reduce((min, item) => (item.date.slice(0, 7) < min ? item.date.slice(0, 7) : min), items[0]!.date.slice(0, 7));
    const months = Math.max(1, monthIndex(today.slice(0, 7)) - monthIndex(first));
    return items.reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0) / months;
  }, [transactions, today]);

  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => {
    setError(null);
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const amountField = (key: 'retirementAge' | 'endAge' | 'monthlySpending' | 'monthlyContribution' | 'overrideAmount' | 'cpfMonthlyPayout' | 'beforeReturn' | 'afterReturn' | 'inflation' | 'baristaAmount' | 'baristaUntilAge') => (value: string) =>
    set(key)(sanitizeAmountInput(value));
  const income = (index: number, key: Exclude<keyof IncomeDraft, 'key'>) => (value: string) => {
    setError(null);
    setDraft((current) => ({
      ...current,
      otherIncome: current.otherIncome.map((item, i) => (i === index ? { ...item, [key]: key === 'label' || key.endsWith('Month') ? value : sanitizeAmountInput(value) } : item)),
    }));
  };

  /** Pick a FIRE type. Lean, Regular and Fat also set the spending figure; the rest keep it. */
  function chooseFireType(type: FireType) {
    setError(null);
    setDraft((current) => {
      const spending = presetSpending(type, recordedExpenses, Number(current.monthlySpending), current.fireType);
      return { ...current, fireType: type, monthlySpending: spending === null ? current.monthlySpending : String(spending) };
    });
  }

  const fireType = FIRE_TYPES.find((item) => item.key === draft.fireType) ?? FIRE_TYPES[FIRE_TYPES.length - 1]!;
  const tickedTotal = draft.assetIds.reduce((sum, id) => sum + Number(latest.get(id)?.amount ?? 0), 0);
  const startingTotal = draft.useOverride ? Math.ceil(Number(draft.overrideAmount) || 0) : tickedTotal;
  const cpfIncluded = isSingapore && (draft.cpfPlan === 'standard' || draft.cpfPlan === 'escalating');
  const cpfOption = cpfOptions.find((option) => option.value === draft.cpfPlan) ?? cpfOptions[3];

  function save() {
    const plan = planFrom(draft, base ?? emptyPlan(today), today, isSingapore);
    const invalid = validateRetirementPlan(plan, today);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (draft.fireType === 'barista' && !plan.otherIncome.some((item) => item.source === 'barista')) {
      setError('For Barista FIRE, enter your part-time income and the age it stops, after your retirement age.');
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
          <MonthYearField label="Born in" value={draft.birthMonth} onChange={set('birthMonth')} help="The month only fine-tunes ages by a few months; your best guess is fine." />
          <TextField label="Age you want to retire" value={draft.retirementAge} onChangeText={amountField('retirementAge')} keyboardType="number-pad" maxLength={3} />
          <TextField label="Plan through age" help="How long do you see yourself living?" value={draft.endAge} onChangeText={amountField('endAge')} keyboardType="number-pad" maxLength={3} />
        </View>
      </Card>

      <Card>
        <CardHeader title="Spending and investing" />
        <View style={styles.form}>
          <SelectField label="Which kind of FIRE?" icon={Flame} value={fireType.label} help={fireType.blurb} onPress={() => setPicker('fire')} />
          {draft.fireType === 'barista' ? (
            <View style={[styles.subCard, { backgroundColor: theme.surface2 }]}>
              <TextField label={`Part-time income per month (${currency})`} value={draft.baristaAmount} onChangeText={amountField('baristaAmount')} keyboardType="decimal-pad" />
              <TextField label="Until age" help="When you expect to stop part-time work." value={draft.baristaUntilAge} onChangeText={amountField('baristaUntilAge')} keyboardType="number-pad" maxLength={3} />
            </View>
          ) : null}
          {draft.fireType === 'coast' ? (
            <AppText variant="caption" tone="ink2">Your plan shows your coast number: once your investments reach it, you can stop adding and still get there by your retirement age.</AppText>
          ) : null}
          <TextField
            label={`Retirement spending per month (today’s ${currency})`}
            help={recordedExpenses ? `You spend about ${money(recordedExpenses, 0)} a month now.` : 'Record a few months of expenses and the Lean, Regular and Fat choices fill this in for you.'}
            value={draft.monthlySpending}
            onChangeText={(value) => {
              setError(null);
              // A typed figure no longer matches the Lean, Regular or Fat share, so it becomes Custom.
              setDraft((current) => ({ ...current, monthlySpending: sanitizeAmountInput(value), fireType: FIRE_TYPES.find((item) => item.key === current.fireType)?.ratio ? 'custom' : current.fireType }));
            }}
            keyboardType="decimal-pad"
          />
          <TextField label={`Monthly investment (${currency})`} help="What you add to your investments each month until retirement." value={draft.monthlyContribution} onChangeText={amountField('monthlyContribution')} keyboardType="decimal-pad" />
        </View>
      </Card>

      <Card>
        <CardHeader
          title="What you have today"
          subtitle={draft.useOverride ? `Starting from ${money(startingTotal, 0)}, your own total` : `Starting from ${money(startingTotal, 0)} across ${draft.assetIds.length} asset${draft.assetIds.length === 1 ? '' : 's'}`}
        />
        <View style={styles.form}>
          {draft.useOverride ? (
            <>
              <TextField label={`My total investments today (${currency})`} value={draft.overrideAmount} onChangeText={amountField('overrideAmount')} keyboardType="decimal-pad" />
              <DateField label="As of which date?" value={draft.overrideDate} onChange={set('overrideDate')} maximumDate={new Date()} />
            </>
          ) : assets.length ? (
            <View style={styles.block}>
              <AppText variant="caption" tone="ink2">Using your assets in Wealth. Untick any you will not spend in retirement, such as your home.</AppText>
              {assets.map((asset) => {
                const value = latest.get(asset.id);
                return (
                  <ToggleRow
                    key={asset.id}
                    label={asset.name}
                    help={value ? `${money(Number(value.amount), 0)} recorded ${value.valueDate}` : 'No dated value yet: add one in Wealth to count it'}
                    value={draft.assetIds.includes(asset.id)}
                    disabled={!value}
                    onChange={(next) => set('assetIds')(next ? [...draft.assetIds, asset.id] : draft.assetIds.filter((id) => id !== asset.id))}
                  />
                );
              })}
            </View>
          ) : (
            <AppText variant="bodySmall" tone="ink2">No assets in Wealth yet. Add some there, or type your total below.</AppText>
          )}
          <ToggleRow label="Type my total myself" help="Use one figure instead of your Wealth assets." value={draft.useOverride} onChange={set('useOverride')} />
        </View>
      </Card>

      <Card>
        <CardHeader title="Retirement income" subtitle="In the money of the year each payment starts." />
        <View style={styles.form}>
          {isSingapore ? (
            <>
              <SelectField label="CPF LIFE plan" icon={Landmark} value={cpfOption.label} help={cpfOption.detail} onPress={() => setPicker('cpf')} />
              {cpfIncluded ? (
                <View style={styles.paired}>
                  <TextField label={`Payout a month (${currency})`} value={draft.cpfMonthlyPayout} onChangeText={amountField('cpfMonthlyPayout')} keyboardType="decimal-pad" style={styles.pairedField} />
                  <SelectField label="Starts at age" icon={Timer} value={draft.cpfStartAge} onPress={() => setPicker('cpfAge')} style={styles.pairedField} />
                </View>
              ) : null}
              {cpfIncluded ? <AppText variant="caption" tone="ink3">Use the CPF LIFE estimator for your payout. Each year you defer past 65 adds up to 7%, up to 35% at 70; enter the payout for the age you pick.</AppText> : null}
            </>
          ) : null}

          <View style={styles.block}>
            <AppText variant="bodySemibold">{isSingapore ? 'Other income' : 'Pension and other income'}</AppText>
            {draft.otherIncome.length === 0 ? <AppText variant="caption" tone="ink2">Rental, a pension, part-time work: anything that pays you in retirement.</AppText> : null}
            {draft.otherIncome.map((item, index) => {
              const expanded = openIncome === index;
              const summary = [
                item.monthlyAmount ? `${money(Number(item.monthlyAmount) || 0, 0)} a month` : null,
                isMonth(item.startMonth) && isMonth(item.endMonth) ? `${formatShortMonthLabel(item.startMonth)} to ${formatShortMonthLabel(item.endMonth)}` : null,
              ].filter(Boolean).join(' · ');
              return (
                <View key={item.key} style={[styles.incomeCard, { borderColor: theme.line, backgroundColor: theme.surface }]}>
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setOpenIncome(expanded ? null : index)} style={styles.incomeHead}>
                    <View style={styles.incomeCopy}>
                      <AppText variant="bodySemibold" numberOfLines={1}>{item.label.trim() || 'New income'}</AppText>
                      <AppText variant="caption" tone="ink2" numberOfLines={1}>{summary || 'Tap to fill in'}</AppText>
                    </View>
                    {expanded ? <ChevronUp size={18} color={theme.ink2} /> : <ChevronDown size={18} color={theme.ink2} />}
                  </Pressable>
                  {expanded ? (
                    <View style={styles.form}>
                      <TextField label="What is it?" value={item.label} onChangeText={income(index, 'label')} placeholder="Rental, pension, part-time work…" />
                      <TextField label={`Monthly amount after tax (${currency})`} value={item.monthlyAmount} onChangeText={income(index, 'monthlyAmount')} keyboardType="decimal-pad" />
                      <MonthYearField label="Starts" value={item.startMonth} onChange={income(index, 'startMonth')} />
                      <MonthYearField label="Stops" value={item.endMonth} onChange={income(index, 'endMonth')} help="The first month it no longer pays." />
                      <TextField label="Yearly increase (%)" value={item.annualGrowth} onChangeText={income(index, 'annualGrowth')} keyboardType="decimal-pad" />
                      <Button label="Remove" variant="text" size="compact" onPress={() => { set('otherIncome')(draft.otherIncome.filter((_, i) => i !== index)); setOpenIncome(null); }} />
                    </View>
                  ) : null}
                </View>
              );
            })}
            <Button
              label="Add income"
              icon={Plus}
              variant="secondary"
              disabled={draft.otherIncome.length >= 19}
              onPress={() => {
                const retirementMonth = isMonth(draft.birthMonth) && draft.retirementAge ? atAge(draft.birthMonth, Number(draft.retirementAge)) : today.slice(0, 7);
                const endMonth = isMonth(draft.birthMonth) && draft.endAge ? atAge(draft.birthMonth, Number(draft.endAge)) : retirementMonth;
                set('otherIncome')([...draft.otherIncome, { key: incomeKey(), label: '', monthlyAmount: '0', startMonth: retirementMonth, endMonth, annualGrowth: '0' }]);
                setOpenIncome(draft.otherIncome.length);
              }}
            />
          </View>
        </View>
      </Card>

      <Card>
        <CardHeader title="Assumptions" subtitle="Editable assumptions, not forecasts." />
        <View style={styles.form}>
          <TextField label="Return before retirement (%)" help={`Default ${pct(0.05)}. Yearly growth while you are still investing.`} value={draft.beforeReturn} onChangeText={amountField('beforeReturn')} keyboardType="decimal-pad" />
          <TextField label="Return after retirement (%)" help={`Default ${pct(0.03)}. Yearly growth once you are drawing down.`} value={draft.afterReturn} onChangeText={amountField('afterReturn')} keyboardType="decimal-pad" />
          <TextField label="Inflation (%)" help={`Default ${pct(0.03)}. Yearly rise in your spending.`} value={draft.inflation} onChangeText={amountField('inflation')} keyboardType="decimal-pad" />
        </View>
      </Card>

      {error ? <AppText variant="bodySmall" tone="danger">{error}</AppText> : null}
      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        <Button label="Save plan" block style={styles.grow} onPress={save} />
      </View>

      <ActionSheet
        open={picker === 'fire'}
        onClose={() => setPicker(null)}
        title="Which kind of FIRE?"
        actions={FIRE_TYPES.map((item) => ({ key: item.key, label: item.label, detail: item.blurb, selected: item.key === draft.fireType, onSelect: () => chooseFireType(item.key) }))}
      />
      <ActionSheet
        open={picker === 'cpf'}
        onClose={() => setPicker(null)}
        title="CPF LIFE plan"
        actions={cpfOptions.map((option) => ({ key: option.value, label: option.label, detail: option.detail, selected: option.value === draft.cpfPlan, onSelect: () => set('cpfPlan')(option.value) }))}
      />
      <ActionSheet
        open={picker === 'cpfAge'}
        onClose={() => setPicker(null)}
        title="CPF LIFE payouts start at"
        actions={cpfAges.map((age) => ({
          key: String(age),
          label: `Age ${age}`,
          detail: age === 65 ? 'The earliest age' : `Deferred ${age - 65} year${age === 66 ? '' : 's'}: up to ${(age - 65) * 7}% more`,
          selected: String(age) === draft.cpfStartAge,
          onSelect: () => set('cpfStartAge')(String(age)),
        }))}
      />
    </Screen>
  );
}

/** A blank plan for a phone that has never had one; the validator explains what is still missing. */
function emptyPlan(today: string): RetirementPlan {
  return {
    version: 2, spendingMonth: today.slice(0, 7), birthMonth: '', retirementMonth: '', endAge: 95, monthlySpending: 0, monthlyContribution: 0,
    assetIds: [], portfolioOverride: null, cpfPlan: 'unknown', cpfStartAge: 65, cpfMonthlyPayout: 0, otherIncome: [],
    beforeReturn: 0.05, afterReturn: 0.03, inflation: 0.03, provenance: {}, fireType: 'regular',
  };
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  block: {
    gap: spacing.sm,
  },
  subCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.tile,
  },
  paired: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pairedField: {
    flex: 1,
  },
  incomeCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  incomeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  incomeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
