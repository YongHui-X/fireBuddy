import {
  calendarMonth,
  classifyWealthPosition,
  cpfBalancesFromWealth,
  cpfRetirementSum,
  demoCategoryIds,
  estimateCpfLifePayout,
  FIRE_TYPES,
  formatShortMonthLabel,
  getDeviceDateKey,
  groupThousands,
  HOME_PRICES,
  homePriceIn,
  INSURANCE_CATEGORY_ID,
  latestSnapshotByPosition,
  monthIndex,
  standardCpfLifePayout,
  toTodaysMoney,
  presetSpending,
  projectCpf,
  sanitizeAmountInput,
  validateRetirementPlan,
  type CpfRetirementSum,
  type FireType,
  type RetirementIncome,
  type RetirementLumpSum,
  type RetirementPlan,
  type Transaction,
} from '@firebuddy/shared';
import { useRouter } from 'expo-router';
import { Calculator, ChevronDown, ChevronUp, Flame, Landmark, PiggyBank, Plus, Timer } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { CheckboxRow } from '@/components/ui/CheckboxRow';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InfoButton } from '@/components/ui/InfoButton';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { ProgressTrack } from '@/components/ui/ProgressTrack';
import { AppText } from '@/components/ui/Text';
import { FIELD_INVALID, SelectField, TextField } from '@/components/ui/TextField';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { YearField } from '@/components/ui/YearField';
import { radii, spacing } from '@/constants/tokens';
import { pct } from '@/hooks/use-fire-plan';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { usePrivacy } from '@/lib/privacy';
import { useTheme } from '@/lib/theme';
import { useRegion } from '@/lib/user-profile';

// Checked against CPF Board, 10 Oct 2026 (PRD 6.6.1, 18 and 19): payouts start from 65 and may be
// deferred to 70, about 34% more by 70 on CPF's own table; Escalating starts about 20% lower and
// rises 2% a year for life; Basic pays less and falls once CPF balances drop below S$60,000, and is
// counted as level. "Not sure" is saved as Standard, CPF's default plan, marked as assumed.
const cpfOptions = [
  { value: 'standard', label: 'Standard', detail: 'CPF’s default: level payouts for life' },
  { value: 'escalating', label: 'Escalating', detail: 'Starts about 20% lower, then rises 2% a year' },
  { value: 'basic', label: 'Basic', detail: 'Lower payouts that fall once your CPF balances drop below S$60,000' },
  { value: 'unknown', label: 'Not sure yet', detail: 'Counted as Standard, CPF’s default' },
] as const;
const cpfAges = [65, 66, 67, 68, 69, 70];
const cpfSums: readonly { value: CpfRetirementSum; label: string; detail: string }[] = [
  { value: 'brs', label: 'Basic Retirement Sum', detail: 'The least you can set aside at 55 if you own a home' },
  { value: 'frs', label: 'Full Retirement Sum', detail: 'What most people set aside at 55' },
  { value: 'ers', label: 'Enhanced Retirement Sum', detail: 'The most you can set aside, for higher payouts' },
];
// How the CPF LIFE payout is worked out (PRD 6.6.1, 18, 24 and 29): two main choices, and two
// fallbacks behind "Don't know your balances?".
const cpfSources = [
  { value: 'wealth', label: 'Use my CPF balances', detail: 'From your CPF positions in Wealth', fallback: false },
  { value: 'balances', label: 'I’ll type my own figures', detail: 'Today’s OA, SA and MA from the CPF app', fallback: false },
  { value: 'sum', label: 'From the retirement sum', detail: 'Pick what you expect to set aside at 55', fallback: true },
  { value: 'typed', label: 'I’ll type CPF’s payout figure', detail: 'From CPF’s Retirement Payout Planner', fallback: true },
] as const;
type CpfSource = (typeof cpfSources)[number]['value'];
const CPF_SOURCE_INFO = [
  'Use my CPF balances: reads OA, SA and MA from your CPF positions in Wealth, so the plan follows them as you update Wealth.',
  'I’ll type my own figures: type today’s OA, SA and MA from the CPF app.',
  'Both project your CPF to 55 with CPF’s 2026 rates and work out your payout.',
  'Don’t know your balances? Use the retirement sum you expect to set aside at 55, or type the monthly payout from CPF’s Retirement Payout Planner.',
];
/** Projected from OA, SA and MA, whether read from Wealth or typed. */
const fromBalances = (source: CpfSource) => source === 'wealth' || source === 'balances';
// The form's steps (PRD 6.6.1, 28 and 30).
const STEPS = ['About you', 'Spending', 'Investing', 'Home', 'Retirement income', 'Extras'] as const;
const LAST_STEP = STEPS.length - 1;

/** Blank fields the calculation needs, with the step each is on (PRD 6.6.1, 29). */
function missingFields(draft: Draft, singapore: boolean): Partial<Record<keyof Draft, number>> {
  const blank = (value: string) => value.trim() === '';
  const missing: Partial<Record<keyof Draft, number>> = {};
  const need = (key: keyof Draft, step: number, empty: boolean) => { if (empty) missing[key] = step; };
  const cpfMember = singapore && draft.residency !== 'foreigner';
  need('birthMonth', 0, !isMonth(draft.birthMonth));
  need('retirementAge', 0, blank(draft.retirementAge));
  need('endAge', 0, blank(draft.endAge));
  need('grossMonthly', 1, cpfMember && fromBalances(draft.cpfSource) && blank(draft.grossMonthly));
  need('coastAge', 1, draft.fireType === 'coast' && blank(draft.coastAge));
  need('currentSpending', 1, ['lean', 'regular', 'fat'].includes(draft.fireType) && blank(draft.currentSpending));
  need('monthlySpending', 1, blank(draft.monthlySpending) || !(Number(draft.monthlySpending) > 0));
  need('monthlyContribution', 2, blank(draft.monthlyContribution));
  need('overrideAmount', 2, draft.useOverride && blank(draft.overrideAmount));
  for (const key of ['oa', 'sa', 'ma'] as const) need(key, 4, cpfMember && draft.cpfSource === 'balances' && blank(draft[key]));
  need('cpfMonthlyPayout', 4, cpfMember && draft.cpfSource === 'typed' && blank(draft.cpfMonthlyPayout));
  need('beforeReturn', 5, blank(draft.beforeReturn));
  need('afterReturn', 5, draft.splitReturns && blank(draft.afterReturn));
  need('inflation', 5, blank(draft.inflation));
  return missing;
}

/** The step whose fields a validation message is about, so Save can take the person there. */
function stepForError(message: string): number {
  const text = message.toLowerCase();
  if (/big cost|return/.test(text)) return LAST_STEP;
  if (/home loan/.test(text)) return 3;
  if (/birth|retire at|retirement age|retire before|plan through|plan can look|citizen|\bpr\b/.test(text)) return 0;
  if (/spending|spend|healthcare|\bpay\b|bonus|barista|stop investing/.test(text)) return 1;
  if (/portfolio|asset|investment|contribution/.test(text)) return 2;
  if (/cpf|income/.test(text)) return 4;
  return LAST_STEP;
}

/**
 * The fields a validation message is about, so they can be outlined in red (owner, 13 Oct 2026).
 * The first one carries the message; the rest are outlined only.
 */
function fieldsForError(message: string): (keyof Draft)[] {
  const text = message.toLowerCase();
  const rules: [RegExp, (keyof Draft)[]][] = [
    [/birth/, ['birthMonth']],
    [/retire before the age you plan through/, ['retirementAge', 'endAge']],
    [/plan through|plan can look/, ['endAge']],
    [/retire at|retirement age/, ['retirementAge']],
    [/spending and contribution/, ['monthlySpending', 'monthlyContribution']],
    [/returns must be/, ['beforeReturn', 'afterReturn', 'inflation']],
    [/cpf payout and commencement/, ['cpfMonthlyPayout', 'cpfStartAge']],
    [/cpf balances come from/, ['cpfSource']],
    [/portfolio total/, ['overrideAmount']],
    [/other income/, ['otherIncome']],
    [/stop investing/, ['coastAge']],
    [/yearly increase in your investment/, ['contributionGrowth']],
    [/big cost/, ['lumpSums']],
    [/insurance and healthcare/, ['insuranceAmount', 'medicalAmount', 'healthGrowth']],
    [/became a pr/, ['prSince']],
    [/monthly pay|bonus months/, ['grossMonthly', 'bonusMonths']],
    [/spend now/, ['currentSpending']],
    [/oa, sa and ma balances/, ['oa', 'sa', 'ma']],
    [/home budget and downpayment/, ['homeBudget', 'oaDownpayment', 'cashUpfront']],
    [/home loan/, ['oaHousing', 'buyAge', 'housingFrom', 'housingUntil']],
    [/barista/, ['baristaAmount', 'baristaUntilAge']],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? [];
}

// Insurance and healthcare grow faster than prices as you age: inflation plus this (PRD 6.6.1, 25).
const HEALTH_EXTRA_GROWTH = 0.02;
// Extra payout for starting later, from CPF's table (about 34% by 70, not quite 35%).
const deferralGain = (age: number) => standardCpfLifePayout(220400, age) / standardCpfLifePayout(220400, 65) - 1;

interface IncomeDraft { key: string; label: string; monthlyAmount: string; startMonth: string; endMonth: string; annualGrowth: string }
/** A big cost or payment. `priceMonth` and `savedAmount` keep its today's-money date when the amount is unchanged. */
interface LumpDraft { key: string; label: string; month: string; amount: string; direction: RetirementLumpSum['direction']; priceMonth?: string; savedAmount?: number }

// Quick-add choices for big costs and money coming in (PRD 6.6.1, 20).
const lumpTemplates: readonly { label: string; direction: RetirementLumpSum['direction'] }[] = [
  { label: 'Home downpayment', direction: 'out' },
  { label: 'Renovation', direction: 'out' },
  { label: 'Car', direction: 'out' },
  { label: 'Wedding', direction: 'out' },
  { label: 'Children’s education', direction: 'out' },
  { label: 'Policy or endowment payout', direction: 'in' },
  { label: 'Inheritance', direction: 'in' },
  { label: 'Selling or downsizing a home', direction: 'in' },
  { label: 'Medical procedure', direction: 'out' },
  { label: 'Something else', direction: 'out' },
];

// Stable keys for income and lump cards, so removing one never hands its fields to the next card.
let incomeKeySeed = 0;
const incomeKey = () => `income-${(incomeKeySeed += 1)}`;

/** Text drafts for every editable plan value. Numbers are parsed once on save. */
interface Draft {
  birthMonth: string;
  retirementAge: string;
  endAge: string;
  fireType: FireType;
  /** Coast FIRE's "Age you'll stop investing" (PRD 6.6.1, 33). */
  coastAge: string;
  monthlySpending: string;
  monthlyContribution: string;
  baristaAmount: string;
  baristaUntilAge: string;
  baristaRaise: string;
  contributionGrowth: string;
  /** Off: one return for the whole plan (PRD 6.6.1, 1). */
  splitReturns: boolean;
  assetIds: string[];
  useOverride: boolean;
  overrideAmount: string;
  /** Typed total only: on save, move it into a Wealth investment the plan then ticks (PRD 6.6.1, 36). */
  addToWealth: boolean;
  cpfPlan: RetirementPlan['cpfPlan'];
  cpfStartAge: string;
  cpfMonthlyPayout: string;
  cpfSource: CpfSource;
  cpfSum: CpfRetirementSum;
  /** Singapore residency (PRD 6.6.1, 22); `prSince` is a YYYY-MM from the year picker. */
  residency: NonNullable<RetirementPlan['residency']>;
  prSince: string;
  /** Pay and spending now (rule 23). */
  grossMonthly: string;
  hasBonus: boolean;
  bonusMonths: string;
  currentSpending: string;
  /** CPF balances and the OA home loan (rule 24). */
  oa: string;
  sa: string;
  ma: string;
  propertyStatus: NonNullable<RetirementPlan['property']>['status'];
  oaHousing: string;
  /** A planned home (PRD 6.6.1, 31). */
  homeBudget: string;
  /** "Age you'll buy", typed; it sets the purchase year from the birth year (owner, 11 Oct 2026). */
  buyAge: string;
  oaDownpayment: string;
  cashUpfront: string;
  housingFrom: string;
  housingUntil: string;
  withdrawAt55: boolean;
  /** Insurance and healthcare a year (rules 25, 29 and 30); the plan stores them a month. */
  insuranceAmount: string;
  medicalAmount: string;
  healthGrowth: string;
  healthPriceMonth?: string;
  savedHealth?: number;
  otherIncome: IncomeDraft[];
  lumpSums: LumpDraft[];
  beforeReturn: string;
  afterReturn: string;
  inflation: string;
}

const BARISTA_LABEL = 'Part-time income (Barista FIRE)';
/** The planned home's cash downpayment and renovation, kept as the phone's own big cost (PRD 6.6.1, 31). */
const HOME_CASH_LABEL = 'Home: cash downpayment and renovation';

/**
 * A rough guide for a home budget: a 25% downpayment and a 25-year HDB loan for the rest at its
 * 2.6% concessionary rate (75% loan limit since 20 Aug 2024).
 */
/** The month a planned home is bought: January of the year the person reaches "Age you'll buy". */
function buyMonth(draft: Draft): string {
  if (!/^\d{1,3}$/.test(draft.buyAge) || !isMonth(draft.birthMonth)) return draft.housingFrom;
  return `${Number(draft.birthMonth.slice(0, 4)) + Number(draft.buyAge)}-01`;
}

function homeLoanGuide(budget: number) {
  const loan = budget * 0.75;
  const rate = 0.026 / 12;
  return { downpayment: budget * 0.25, monthly: (loan * rate) / (1 - (1 + rate) ** -300) };
}
const rateText = (rate: number) => String(Number((rate * 100).toFixed(4)));
const atAge = (birth: string, age: number) => (birth ? calendarMonth(monthIndex(birth) + age * 12) : '');
const ageIn = (birth: string, month: string) => Math.floor((monthIndex(month) - monthIndex(birth)) / 12);
const isMonth = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** Recorded monthly averages that pre-fill the form; null without records. */
interface Recorded { spending: number | null; insurance: number | null; health: number | null; wealthCpf: boolean }

/**
 * Average monthly amount of the matching transactions over the last twelve completed months,
 * dividing by every month from the first one recorded, so a gap month counts as a month.
 */
function monthlyAverage(transactions: readonly Transaction[], today: string, match: (item: Transaction) => boolean): number | null {
  const thisMonth = today.slice(0, 7);
  const start = calendarMonth(monthIndex(thisMonth) - 12);
  const items = transactions.filter((item) => match(item) && item.date.slice(0, 7) >= start && item.date.slice(0, 7) < thisMonth);
  if (!items.length) return null;
  const first = items.reduce((min, item) => (item.date.slice(0, 7) < min ? item.date.slice(0, 7) : min), items[0]!.date.slice(0, 7));
  const months = Math.max(1, monthIndex(thisMonth) - monthIndex(first));
  return items.reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0) / months;
}

function draftFrom(plan: RetirementPlan, today: string, activeAssetIds: readonly string[], fresh: boolean, recorded: Recorded): Draft {
  const validBirth = isMonth(plan.birthMonth) && isMonth(plan.retirementMonth);
  const barista = plan.otherIncome.find((item) => item.source === 'barista');
  return {
    birthMonth: isMonth(plan.birthMonth) ? plan.birthMonth : '',
    retirementAge: validBirth ? String(ageIn(plan.birthMonth, plan.retirementMonth)) : '',
    endAge: String(plan.endAge),
    fireType: plan.fireType ?? 'custom',
    coastAge: plan.coastMonth && isMonth(plan.coastMonth) && isMonth(plan.birthMonth) ? String(ageIn(plan.birthMonth, plan.coastMonth)) : '',
    monthlySpending: String(plan.monthlySpending),
    monthlyContribution: String(plan.monthlyContribution),
    baristaAmount: barista ? String(barista.monthlyAmount) : '',
    baristaUntilAge: barista && isMonth(plan.birthMonth) ? String(ageIn(plan.birthMonth, barista.endMonth)) : '',
    // A pay rise matching inflation keeps the part-time income's buying power.
    baristaRaise: rateText(barista ? barista.annualGrowth : plan.inflation),
    contributionGrowth: rateText(plan.contributionGrowth ?? 0),
    splitReturns: plan.beforeReturn !== plan.afterReturn,
    // A new plan starts from every Wealth asset that has a value; an existing one keeps its ticks.
    assetIds: fresh ? [...activeAssetIds] : plan.assetIds.filter((id) => activeAssetIds.includes(id)),
    useOverride: plan.portfolioOverride !== null,
    overrideAmount: String(plan.portfolioOverride?.amount ?? 0),
    addToWealth: false,
    // "Not sure" is saved as Standard marked assumed, so it reads back as "Not sure".
    cpfPlan: plan.cpfPlan === 'standard' && plan.provenance.cpfPlan === 'assumed' ? 'unknown' : plan.cpfPlan,
    cpfStartAge: String(plan.cpfStartAge),
    cpfMonthlyPayout: String(plan.cpfMonthlyPayout),
    // Balances for a new plan, the saved choice otherwise; a typed payout stays typed (PRD 6.6.1, 18 and 24).
    cpfSource: plan.cpfEstimate?.source === 'balances'
      ? (plan.cpfBalancesSource === 'wealth' ? 'wealth' : 'balances')
      : fresh ? (recorded.wealthCpf ? 'wealth' : 'balances') : plan.cpfEstimate || !(plan.cpfMonthlyPayout > 0) ? 'sum' : 'typed',
    cpfSum: plan.cpfEstimate?.sum ?? 'frs',
    residency: plan.residency ?? 'citizen',
    prSince: plan.prSinceYear ? `${plan.prSinceYear}-01` : '',
    grossMonthly: plan.pay ? String(plan.pay.grossMonthly) : '',
    hasBonus: (plan.pay?.bonusMonths ?? 0) > 0,
    bonusMonths: plan.pay?.bonusMonths ? String(plan.pay.bonusMonths) : '1',
    currentSpending: plan.currentSpending !== undefined ? String(plan.currentSpending) : recorded.spending !== null ? String(Math.round(recorded.spending)) : '',
    oa: plan.cpfBalances ? String(plan.cpfBalances.oa) : '',
    sa: plan.cpfBalances ? String(plan.cpfBalances.sa) : '',
    ma: plan.cpfBalances ? String(plan.cpfBalances.ma) : '',
    propertyStatus: plan.property?.status ?? 'none',
    oaHousing: String(plan.property?.oaMonthly ?? 0),
    homeBudget: plan.property?.budget ? String(plan.property.budget) : '',
    buyAge: plan.property?.status === 'plan' && isMonth(plan.property.fromMonth) && isMonth(plan.birthMonth) ? String(Number(plan.property.fromMonth.slice(0, 4)) - Number(plan.birthMonth.slice(0, 4))) : '',
    oaDownpayment: plan.property?.oaDownpayment ? String(plan.property.oaDownpayment) : '',
    cashUpfront: plan.property?.cashUpfront ? String(plan.property.cashUpfront) : '',
    housingFrom: plan.property?.fromMonth || today.slice(0, 7),
    housingUntil: plan.property?.untilMonth || '',
    withdrawAt55: plan.cpfWithdrawAt55 ?? false,
    // A new plan starts from recorded insurance and health spending. An older plan's retirement
    // spending may already include it, so it starts at 0 rather than counting it twice.
    insuranceAmount: plan.healthcare ? String(Math.round((plan.healthcare.insurance ?? 0) * 12)) : fresh && recorded.insurance !== null ? String(Math.round(recorded.insurance * 12)) : '',
    // A plan saved before the two fields were split keeps its whole amount under healthcare.
    medicalAmount: plan.healthcare ? String(Math.round((plan.healthcare.medical ?? (plan.healthcare.insurance === undefined ? plan.healthcare.monthlyAmount : 0)) * 12)) : fresh && recorded.health !== null ? String(Math.round(recorded.health * 12)) : '',
    healthGrowth: rateText(plan.healthcare?.growth ?? plan.inflation + HEALTH_EXTRA_GROWTH),
    healthPriceMonth: plan.healthcare?.priceMonth,
    savedHealth: plan.healthcare?.monthlyAmount,
    otherIncome: plan.otherIncome.filter((item) => item.source !== 'barista').map((item) => ({ key: incomeKey(), label: item.label, monthlyAmount: String(item.monthlyAmount), startMonth: item.startMonth, endMonth: item.endMonth, annualGrowth: rateText(item.annualGrowth) })),
    lumpSums: (plan.lumpSums ?? []).filter((item) => item.label !== HOME_CASH_LABEL).map((item) => ({ key: incomeKey(), label: item.label, month: item.month, amount: String(item.amount), direction: item.direction, priceMonth: item.priceMonth, savedAmount: item.amount })),
    beforeReturn: rateText(plan.beforeReturn),
    afterReturn: rateText(plan.afterReturn),
    inflation: rateText(plan.inflation),
  };
}

/**
 * The CPF LIFE payout a draft would save: the typed figure, or the retirement-sum estimate. A plan
 * projected from balances saves this too, as the fallback; the phone re-projects it on every run.
 */
function draftCpfPayout(draft: Draft): number {
  if (draft.cpfSource === 'typed') return draft.cpfMonthlyPayout.trim() === '' ? NaN : Math.ceil(Number(draft.cpfMonthlyPayout));
  return estimateCpfLifePayout({ cpfPlan: draft.cpfPlan, sum: draft.cpfSum, birthMonth: draft.birthMonth, startAge: Number(draft.cpfStartAge), inflation: Number(draft.inflation) / 100 }) ?? NaN;
}

/** Build the plan the shared engine validates. Provenance marks every value as typed by the person. */
function planFrom(draft: Draft, base: RetirementPlan, today: string, singapore: boolean, wealthCpf: { oa: number; sa: number; ma: number } | null = null): RetirementPlan {
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
    // Typed in today's money like spending, so the engine inflates it to the retirement month (PRD 6.6.1, 3).
    // An unchanged amount keeps the month it was typed in, as spending does; a new amount is dated this month.
    const saved = base.otherIncome.find((item) => item.source === 'barista');
    const priceMonth = saved?.priceMonth && saved.monthlyAmount === baristaAmount ? saved.priceMonth : today.slice(0, 7);
    otherIncome.push({ label: BARISTA_LABEL, monthlyAmount: baristaAmount, startMonth: retirementMonth, endMonth: atAge(draft.birthMonth, baristaUntil), annualGrowth: rate(draft.baristaRaise), source: 'barista', priceMonth });
  }
  // A cost this year can only fall from this month on; an unchanged amount keeps its today's-money month.
  const thisMonth = today.slice(0, 7);
  const lumpSums: RetirementLumpSum[] = draft.lumpSums.map((item) => {
    const amount = money(item.amount);
    return {
      label: item.label.trim(),
      month: isMonth(item.month) && item.month < thisMonth ? thisMonth : item.month,
      amount,
      direction: item.direction,
      priceMonth: item.priceMonth && item.savedAmount === amount ? item.priceMonth : thisMonth,
    };
  });
  // CPF only for a Singapore citizen or PR (PRD 6.6.1, 22).
  const cpfMember = singapore && draft.residency !== 'foreigner';
  const estimated = cpfMember && draft.cpfSource !== 'typed';
  const byBalances = cpfMember && fromBalances(draft.cpfSource);
  const byWealth = byBalances && draft.cpfSource === 'wealth';
  const balancesTyped = [draft.oa, draft.sa, draft.ma].some((value) => value.trim() !== '');
  const orZero = (value: string) => money(value.trim() === '' ? '0' : value);
  // Typed a year, stored a month.
  const insurance = orZero(draft.insuranceAmount) / 12;
  const medical = orZero(draft.medicalAmount) / 12;
  const health = insurance + medical;
  // A typed total is dated the day it is saved; an unchanged total keeps its date (PRD 6.6.1, 29).
  const overrideAmount = money(draft.overrideAmount);
  const overrideDate = base.portfolioOverride && base.portfolioOverride.amount === overrideAmount ? base.portfolioOverride.date : today.slice(0, 10);
  const owns = draft.propertyStatus !== 'none';
  const buying = draft.propertyStatus === 'plan';
  const homeMonth = buying ? buyMonth(draft) : draft.housingFrom;
  const cashUpfront = buying ? orZero(draft.cashUpfront) : 0;
  // An unchanged cash amount keeps the month it was typed in, like any big cost.
  const savedHomeCash = (base.lumpSums ?? []).find((item) => item.label === HOME_CASH_LABEL);
  const spendingChanged = money(draft.monthlySpending) !== base.monthlySpending;
  const keys = ['birthMonth', 'retirementMonth', 'endAge', 'monthlySpending', 'monthlyContribution', 'assetIds', 'portfolioOverride', 'cpfPlan', 'cpfStartAge', 'cpfMonthlyPayout', 'otherIncome', 'lumpSums', 'coastMonth', 'beforeReturn', 'afterReturn', 'inflation', 'contributionGrowth', 'residency', 'pay', 'currentSpending', 'cpfBalances', 'cpfBalancesSource', 'property', 'healthcare'];
  return {
    ...base,
    version: 2,
    // Spending is a today's-money figure, so an edit re-dates it to this month.
    spendingMonth: spendingChanged ? today.slice(0, 7) : base.spendingMonth,
    birthMonth: draft.birthMonth,
    retirementMonth,
    endAge: whole(draft.endAge),
    fireType: draft.fireType,
    coastMonth: draft.fireType === 'coast' && Number.isInteger(whole(draft.coastAge)) && isMonth(draft.birthMonth) ? atAge(draft.birthMonth, whole(draft.coastAge)) : undefined,
    monthlySpending: money(draft.monthlySpending),
    monthlyContribution: money(draft.monthlyContribution),
    assetIds: draft.useOverride ? [] : draft.assetIds,
    portfolioOverride: draft.useOverride ? { amount: overrideAmount, date: overrideDate } : null,
    // CPF LIFE is Singapore's; the general mode never assumes it. "Not sure" counts as Standard.
    cpfPlan: singapore ? (draft.cpfPlan === 'unknown' ? 'standard' : draft.cpfPlan) : 'unknown',
    cpfStartAge: whole(draft.cpfStartAge),
    cpfMonthlyPayout: cpfMember ? draftCpfPayout(draft) : 0,
    cpfEstimate: estimated ? { sum: draft.cpfSum, source: byBalances ? 'balances' : 'sum' } : undefined,
    residency: singapore ? draft.residency : undefined,
    prSinceYear: singapore && draft.residency === 'pr' && isMonth(draft.prSince) ? Number(draft.prSince.slice(0, 4)) : undefined,
    pay: draft.grossMonthly.trim() === '' ? undefined : { grossMonthly: money(draft.grossMonthly), bonusMonths: draft.hasBonus ? Number(draft.bonusMonths || '0') : 0 },
    currentSpending: draft.currentSpending.trim() === '' ? undefined : money(draft.currentSpending),
    // Balances stand as of today: read from Wealth (kept as a fallback; the phone re-reads Wealth on every run) or typed.
    cpfBalances: byWealth
      ? (wealthCpf ? { ...wealthCpf, month: thisMonth } : base.cpfBalances)
      : byBalances && balancesTyped ? { oa: orZero(draft.oa), sa: orZero(draft.sa), ma: orZero(draft.ma), month: thisMonth } : undefined,
    cpfBalancesSource: byBalances ? (byWealth ? 'wealth' : 'typed') : undefined,
    property: {
      status: draft.propertyStatus,
      oaMonthly: owns && cpfMember ? orZero(draft.oaHousing) : 0,
      fromMonth: owns ? homeMonth : '',
      untilMonth: owns && cpfMember ? draft.housingUntil : '',
      ...(buying ? { budget: orZero(draft.homeBudget), oaDownpayment: cpfMember ? orZero(draft.oaDownpayment) : 0, cashUpfront } : {}),
    },
    cpfWithdrawAt55: byBalances ? draft.withdrawAt55 : undefined,
    healthcare: health > 0 || Number.isNaN(health)
      ? { monthlyAmount: health, insurance, medical, growth: rate(draft.healthGrowth), priceMonth: draft.healthPriceMonth && draft.savedHealth === health ? draft.healthPriceMonth : thisMonth }
      : undefined,
    otherIncome,
    // A planned home's cash downpayment and renovation is a cost in the year it is bought.
    lumpSums: buying && cashUpfront > 0 && isMonth(homeMonth)
      ? [...lumpSums, { label: HOME_CASH_LABEL, month: homeMonth < thisMonth ? thisMonth : homeMonth, amount: cashUpfront, direction: 'out', priceMonth: savedHomeCash && savedHomeCash.amount === cashUpfront ? savedHomeCash.priceMonth : thisMonth }]
      : lumpSums,
    beforeReturn: rate(draft.beforeReturn),
    // With one return, the after-retirement return is the same figure.
    afterReturn: draft.splitReturns ? rate(draft.afterReturn) : rate(draft.beforeReturn),
    inflation: rate(draft.inflation),
    contributionGrowth: draft.contributionGrowth.trim() === '' ? 0 : rate(draft.contributionGrowth),
    provenance: {
      ...base.provenance,
      ...Object.fromEntries(keys.map((key) => [key, 'user-entered'])),
      ...(spendingChanged ? { spendingMonth: 'user-entered' } : {}),
      ...(cpfMember && draft.cpfPlan === 'unknown' ? { cpfPlan: 'assumed' } : {}),
      ...(estimated ? { cpfMonthlyPayout: 'assumed' } : {}),
    },
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
  const { retirementPlan, positions, balanceSnapshots: snapshots, transactions, setRetirementPlan, addPosition, notify } = useFireBuddy();
  const saving = useRef(false);
  const today = useMemo(() => getDeviceDateKey(), []);
  const base = retirementPlan;
  const latest = useMemo(() => latestSnapshotByPosition(snapshots, today), [snapshots, today]);
  const assets = useMemo(() => positions.filter((item) => !item.isArchived && item.positionKind === 'asset'), [positions]);
  const valuedAssetIds = useMemo(() => assets.filter((asset) => latest.has(asset.id)).map((asset) => asset.id), [assets, latest]);
  // CPF balances from the CPF positions in Wealth, by account (PRD 6.6.1, 29).
  const wealthCpf = useMemo(() => cpfBalancesFromWealth(positions, latest), [positions, latest]);
  // Twelve-month averages from the person's records (PRD 6.6.1, 23, 25 and 29). Insurance and Health
  // have their own lines, so "spending now" leaves them out.
  const recorded = useMemo<Recorded & { takeHome: number | null }>(() => {
    const healthIds = new Set<string>([INSURANCE_CATEGORY_ID, demoCategoryIds.health]);
    return {
      spending: monthlyAverage(transactions, today, (item) => item.transactionType === 'expense' && !(item.categoryId && healthIds.has(item.categoryId))),
      insurance: monthlyAverage(transactions, today, (item) => item.transactionType === 'expense' && item.categoryId === INSURANCE_CATEGORY_ID),
      health: monthlyAverage(transactions, today, (item) => item.transactionType === 'expense' && item.categoryId === demoCategoryIds.health),
      takeHome: monthlyAverage(transactions, today, (item) => item.transactionType === 'income' && item.categoryId === demoCategoryIds.salary),
      wealthCpf: wealthCpf.found,
    };
  }, [transactions, today, wealthCpf.found]);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(base ?? emptyPlan(today), today, base ? assets.map((item) => item.id) : valuedAssetIds, !base, recorded));
  const [error, setError] = useState<string | null>(null);
  // With no valued assets in Wealth there is nothing to tick, so the total is typed straight away
  // and the "Type my total myself" switch is hidden (owner, 13 Oct 2026).
  const noAssets = valuedAssetIds.length === 0;
  if (noAssets && !draft.useOverride) setDraft((current) => ({ ...current, useOverride: true }));
  const [picker, setPicker] = useState<'fire' | 'cpf' | 'cpfAge' | 'cpfSum' | 'cpfSource' | 'cpfFallback' | 'lump' | null>(null);
  const [showRequired, setShowRequired] = useState(false);
  const [pricesOpen, setPricesOpen] = useState(false);
  const [openIncome, setOpenIncome] = useState<number | null>(null);
  const [openLump, setOpenLump] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  // Editing a saved plan can jump between steps and save from any of them (PRD 6.6.1, 28).
  const editing = Boolean(base);

  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => {
    setError(null);
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const amountField = (key: 'retirementAge' | 'coastAge' | 'endAge' | 'monthlySpending' | 'monthlyContribution' | 'overrideAmount' | 'cpfMonthlyPayout' | 'beforeReturn' | 'afterReturn' | 'inflation' | 'baristaAmount' | 'baristaUntilAge' | 'baristaRaise' | 'contributionGrowth' | 'grossMonthly' | 'bonusMonths' | 'currentSpending' | 'oa' | 'sa' | 'ma' | 'oaHousing' | 'homeBudget' | 'oaDownpayment' | 'cashUpfront' | 'insuranceAmount' | 'medicalAmount' | 'healthGrowth') => (value: string) =>
    set(key)(sanitizeAmountInput(value));
  const income = (index: number, key: Exclude<keyof IncomeDraft, 'key'>) => (value: string) => {
    setError(null);
    setDraft((current) => ({
      ...current,
      otherIncome: current.otherIncome.map((item, i) => (i === index ? { ...item, [key]: key === 'label' || key.endsWith('Month') ? value : sanitizeAmountInput(value) } : item)),
    }));
  };

  const lump = (index: number, key: 'label' | 'month' | 'amount' | 'direction') => (value: string) => {
    setError(null);
    setDraft((current) => ({
      ...current,
      lumpSums: current.lumpSums.map((item, i) => (i === index ? { ...item, [key]: key === 'amount' ? sanitizeAmountInput(value) : value } : item)),
    }));
  };
  /** Add a big cost or payment from a template, dated this year, and open it for the amount. */
  function addLump(template: (typeof lumpTemplates)[number], month = today.slice(0, 7)) {
    setError(null);
    // Opened by key, not position, so quick repeated adds always open the newest card.
    const key = incomeKey();
    setDraft((current) => ({ ...current, lumpSums: [...current.lumpSums, { key, label: template.label === 'Something else' ? '' : template.label, month, amount: '0', direction: template.direction }] }));
    setOpenLump(key);
  }

  /** Pick a FIRE type. Lean, Regular and Fat also set the spending figure; the rest keep it. */
  function chooseFireType(type: FireType) {
    setError(null);
    setDraft((current) => {
      // Lean, Regular and Fat scale "spending now" (PRD 6.6.1, 23), else the recorded average.
      const now = Number(current.currentSpending);
      const spending = presetSpending(type, now > 0 ? now : recorded.spending, Number(current.monthlySpending), current.fireType);
      return { ...current, fireType: type, monthlySpending: spending === null ? current.monthlySpending : String(spending) };
    });
  }

  const fireType = FIRE_TYPES.find((item) => item.key === draft.fireType) ?? FIRE_TYPES[FIRE_TYPES.length - 1]!;
  const tickedTotal = draft.assetIds.reduce((sum, id) => sum + Number(latest.get(id)?.amount ?? 0), 0);
  const startingTotal = draft.useOverride ? Math.ceil(Number(draft.overrideAmount) || 0) : tickedTotal;
  // CPF counts for a Singapore citizen or PR (PRD 6.6.1, 22); every plan type counts, "Not sure" as Standard.
  const cpfMember = isSingapore && draft.residency !== 'foreigner';
  // The CPF projection for the draft as typed (PRD 6.6.1, 24); null until it has enough to go on.
  const cpfProjection = useMemo(() => {
    if (!cpfMember || !fromBalances(draft.cpfSource)) return null;
    const preview = planFrom(draft, base ?? emptyPlan(today), today, true, wealthCpf.found ? wealthCpf : null);
    if (!preview.cpfBalances || !isMonth(preview.retirementMonth) || !Number.isInteger(preview.cpfStartAge) || !Number.isFinite(preview.inflation)) return null;
    if (![preview.cpfBalances.oa, preview.cpfBalances.sa, preview.cpfBalances.ma].every((value) => Number.isFinite(value) && value >= 0)) return null;
    try {
      return projectCpf(preview, today, draft.cpfSum);
    } catch {
      return null;
    }
  }, [cpfMember, draft, base, today, wealthCpf]);
  const cpfPayout = cpfProjection ? cpfProjection.monthlyPayout : draftCpfPayout(draft);

  /**
   * OA in today's money the year a planned home is bought: projected from CPF balances when they are
   * in, else today's OA from Wealth or as typed; null when unknown.
   */
  function oaForHome(next: Draft): number | null {
    const preview = planFrom({ ...next, oaDownpayment: '0' }, base ?? emptyPlan(today), today, true, wealthCpf.found ? wealthCpf : null);
    try {
      const ready = preview.cpfBalances && isMonth(preview.retirementMonth) && Number.isInteger(preview.cpfStartAge) && Number.isFinite(preview.inflation);
      const projected = ready ? projectCpf(preview, today, next.cpfSum)?.oaAtPurchase ?? null : null;
      if (projected !== null && preview.property) {
        return projected / (1 + preview.inflation) ** Math.max(0, (monthIndex(preview.property.fromMonth) - monthIndex(today.slice(0, 7))) / 12);
      }
    } catch {
      // Falls back to today's OA below.
    }
    if (wealthCpf.found) return wealthCpf.oa;
    return next.oa.trim() !== '' && Number.isFinite(Number(next.oa)) ? Number(next.oa) : null;
  }

  /**
   * Fill a planned home's figures from its budget (owner, 11 Oct 2026): a 25% downpayment from OA as
   * far as OA goes and the rest in cash, then the HDB loan's monthly payment from OA for 25 years.
   * Each stays editable until the budget or age changes again.
   */
  function withHomeGuide(next: Draft): Draft {
    const budget = Number(next.homeBudget);
    if (next.propertyStatus !== 'plan' || !(budget > 0)) return next;
    const guide = homeLoanGuide(budget);
    const downpayment = Math.round(guide.downpayment);
    if (!cpfMember) return { ...next, cashUpfront: String(downpayment) };
    const oa = oaForHome(next);
    const fromOa = oa === null ? downpayment : Math.round(Math.min(downpayment, Math.max(0, oa)));
    const bought = buyMonth(next);
    return {
      ...next,
      oaDownpayment: String(fromOa),
      cashUpfront: String(downpayment - fromOa),
      oaHousing: String(Math.round(guide.monthly)),
      housingUntil: isMonth(bought) ? `${Number(bought.slice(0, 4)) + 25}-01` : next.housingUntil,
    };
  }

  /** "Age you'll buy": digits only; a reachable age refills the home figures for that year. */
  function setBuyAge(text: string) {
    const age = text.replace(/\D/g, '').slice(0, 3);
    setError(null);
    setDraft((current) => {
      const next = { ...current, buyAge: age };
      const now = isMonth(current.birthMonth) ? Number(today.slice(0, 4)) - Number(current.birthMonth.slice(0, 4)) : null;
      return now !== null && Number(age) >= now && Number(age) <= 100 ? withHomeGuide({ ...next, housingFrom: buyMonth(next) }) : next;
    });
  }
  const birthYear = isMonth(draft.birthMonth) ? Number(draft.birthMonth.slice(0, 4)) : null;
  const ageThisYear = birthYear === null ? null : Number(today.slice(0, 4)) - birthYear;
  // What the typed CPF LIFE payout is worth in today's money, so the smaller planner figure is no
  // surprise: the estimator quotes the dollars of the year payouts start (owner, 10 Oct 2026).
  const cpfToday = (() => {
    const payout = cpfPayout;
    const age = Number(draft.cpfStartAge);
    const inflation = Number(draft.inflation) / 100;
    if (!isMonth(draft.birthMonth) || !(payout > 0) || !Number.isInteger(age) || !Number.isFinite(inflation)) return null;
    return toTodaysMoney(payout, atAge(draft.birthMonth, age), calendarMonth(monthIndex(today.slice(0, 7)) - 1), inflation);
  })();
  const cpfOption = cpfOptions.find((option) => option.value === draft.cpfPlan) ?? cpfOptions[3];
  // The retirement sum for the year the person turns 55, shown with its year in the picker.
  const year55 = isMonth(draft.birthMonth) ? Number(draft.birthMonth.slice(0, 4)) + 55 : null;
  const sumDetail = (sum: CpfRetirementSum) => {
    if (year55 === null) return '';
    const amount = cpfRetirementSum(sum, year55, Number(draft.inflation) / 100 || 0);
    return `${money(amount, 0)} in ${year55}${year55 > 2027 ? ', grown with inflation' : ''}`;
  };
  const cpfSum = cpfSums.find((item) => item.value === draft.cpfSum) ?? cpfSums[1]!;
  const cpfSource = cpfSources.find((item) => item.value === draft.cpfSource) ?? cpfSources[0];

  const missing = missingFields(draft, isSingapore);
  /** "Required" under a blank field the calculation needs, once the person has tried to move on. */
  const errorFields = error ? fieldsForError(error) : [];
  /** "Required" on a blank field, else the save message on the field it is about (outlined only after the first). */
  const req = (key: keyof Draft) => {
    if (showRequired && missing[key] !== undefined) return 'Required';
    const at = errorFields.indexOf(key);
    if (at < 0) return undefined;
    return at === 0 ? error ?? undefined : FIELD_INVALID;
  };
  // Income and big-cost cards with a problem get a red edge, and their year and amount fields an outline.
  const thisYear = Number(today.slice(0, 4));
  const yearBad = (month: string) => !isMonth(month) || Number(month.slice(0, 4)) < thisYear;
  const incomeBad = (item: IncomeDraft) => errorFields.includes('otherIncome') && (item.monthlyAmount.trim() === '' || yearBad(item.startMonth) || !isMonth(item.endMonth) || item.endMonth <= item.startMonth);
  const lumpBad = (item: LumpDraft) => errorFields.includes('lumpSums') && (item.amount.trim() === '' || yearBad(item.month));
  // A problem no simple check spots (such as a year past the plan's end) outlines every card.
  const noneSpotted = (list: 'otherIncome' | 'lumpSums') => errorFields.includes(list) && !(list === 'otherIncome' ? draft.otherIncome.some(incomeBad) : draft.lumpSums.some(lumpBad));

  /** The first problem with the draft and the step it belongs to; null when the plan can be saved. */
  function problem(): { message: string; step: number; required?: boolean } | null {
    const blanks = Object.values(missing);
    if (blanks.length) return { message: 'Fill in the fields marked Required.', step: Math.min(...blanks), required: true };
    if (cpfMember && draft.cpfSource === 'wealth' && !wealthCpf.found) {
      return { message: 'Choose OA, SA or MA on your CPF positions in Wealth, or type your own figures.', step: 4 };
    }
    const plan = planFrom(draft, base ?? emptyPlan(today), today, isSingapore, wealthCpf.found ? wealthCpf : null);
    const invalid = validateRetirementPlan(plan, today);
    if (invalid) return { message: invalid, step: stepForError(invalid) };
    if (draft.fireType === 'coast' && Number(draft.coastAge) > Number(draft.retirementAge)) {
      return { message: 'Stop investing at or before the age you want to retire.', step: 1 };
    }
    if (draft.fireType === 'barista' && !plan.otherIncome.some((item) => item.source === 'barista')) {
      return { message: 'For Barista FIRE, enter your part-time income and the age it stops, after your retirement age.', step: 1 };
    }
    if (!plan.portfolioOverride && plan.assetIds.some((id) => !assets.some((asset) => asset.id === id) || !latest.has(id))) {
      return { message: 'Every ticked asset needs a dated value in Wealth, or type your total instead.', step: 2 };
    }
    return null;
  }

  /** Go to a step, clearing any message from the last one. */
  function goTo(next: number) {
    setError(null);
    setStep(Math.max(0, Math.min(LAST_STEP, next)));
  }

  /** Continue checks only this step and the ones before it; later steps are checked when reached. */
  function next() {
    const found = problem();
    if (found && found.step <= step) {
      if (found.required) setShowRequired(true);
      setStep(found.step);
      setError(found.message);
      return;
    }
    goTo(step + 1);
  }

  /** Clear the answers and go back to step 1; the saved plan stays until the new one is saved. */
  function startOver() {
    setConfirmReset(false);
    setDraft(draftFrom(emptyPlan(today), today, valuedAssetIds, true, recorded));
    setOpenIncome(null);
    setOpenLump(null);
    setShowRequired(false);
    goTo(0);
  }

  function save() {
    // One save per visit: a double press must not add the typed total to Wealth twice.
    if (saving.current) return;
    const found = problem();
    if (found) {
      if (found.required) setShowRequired(true);
      setStep(found.step);
      setError(found.message);
      return;
    }
    // A typed total moved into Wealth becomes an ordinary investment the plan ticks, so the plan
    // and net worth follow one figure from then on (PRD 6.6.1, 36).
    saving.current = true;
    let final = draft;
    if (draft.useOverride && draft.addToWealth) {
      const position = addPosition(
        { name: isSingapore ? 'Net worth excluding CPF (from FIRE plan)' : 'Net worth (from FIRE plan)', positionKind: 'asset', positionType: 'other', ...classifyWealthPosition('other', false), includeInFi: true, isEmergencyFund: false, currency: 'SGD', linkedAccountId: null },
        { valueDate: today.slice(0, 10), amount: Math.ceil(Number(draft.overrideAmount)).toFixed(2) },
      );
      final = { ...draft, useOverride: false, addToWealth: false, assetIds: [position.id] };
    }
    const plan = planFrom(final, base ?? emptyPlan(today), today, isSingapore, wealthCpf.found ? wealthCpf : null);
    setRetirementPlan(plan);
    // A first plan is set up; an existing one is recalculated.
    notify(editing ? 'Plan saved. Your projection has been recalculated.' : 'Plan saved. Your FIRE plan is ready.');
    router.back();
  }

  return (
    <Screen scrollKey={step}>
      <PageToolbar title={editing ? 'Edit plan' : 'Set up your plan'} onBack={() => router.back()} />

      <View style={styles.steps}>
        <AppText variant="captionMedium" tone="ink2">{`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}</AppText>
        <ProgressTrack value={(step + 1) / STEPS.length} accessibilityLabel={`Step ${step + 1} of ${STEPS.length}`} />
        {editing ? (
          <View style={styles.stepChips}>
            {STEPS.map((name, index) => (
              <Chip key={name} label={name} round tone={index === step ? 'gold' : 'neutral'} onPress={() => goTo(index)} />
            ))}
          </View>
        ) : null}
      </View>

      {step === 0 ? (
      <Card>
        <CardHeader title="About you" />
        <View style={styles.form}>
          <YearField label="Year you were born" value={draft.birthMonth} onChange={set('birthMonth')} help={ageThisYear !== null ? `You’re ${ageThisYear} this year.` : undefined} error={req('birthMonth')} />
          <TextField label="Age you want to retire" error={req('retirementAge')} value={draft.retirementAge} onChangeText={amountField('retirementAge')} keyboardType="number-pad" maxLength={3} />
          <TextField label="Plan through age" error={req('endAge')} info="How long do you see yourself living? The plan has to last this long." value={draft.endAge} onChangeText={amountField('endAge')} keyboardType="number-pad" maxLength={3} />
          {isSingapore ? (
            <View style={styles.block}>
              <AppText variant="bodyMedium">Are you a Singapore citizen or PR?</AppText>
              <SegmentedControl
                accessibilityLabel="Singapore citizen, PR or neither"
                options={[{ value: 'citizen', label: 'Citizen' }, { value: 'pr', label: 'PR' }, { value: 'foreigner', label: 'Neither' }]}
                value={draft.residency}
                onChange={set('residency')}
              />
              {draft.residency === 'foreigner' ? <AppText variant="caption" tone="ink2">No CPF on a work pass, so CPF LIFE is left out of your plan.</AppText> : null}
              {draft.residency === 'pr' ? (
                <YearField error={req('prSince')} label="PR since" info="CPF rates are lower in your first two years as a PR." value={draft.prSince} onChange={set('prSince')} />
              ) : null}
            </View>
          ) : null}
        </View>
      </Card>
      ) : null}

      {step === 1 ? (
      <>
      <Card>
        <CardHeader title="Your pay and spending now" info="These stay on your phone. Your pay sets your CPF contributions and shows what saving more would do; your spending now is the base for Lean, Regular and Fat FIRE." />
        <View style={styles.form}>
          <TextField
            label={`Gross monthly pay before CPF (${currency})`}
            optional={missing.grossMonthly === undefined && !(cpfMember && fromBalances(draft.cpfSource))}
            error={req('grossMonthly')}
            help={recorded.takeHome ? `You record about ${money(recorded.takeHome, 0)} a month in Salary, after CPF.` : undefined}
            value={groupThousands(draft.grossMonthly)}
            onChangeText={amountField('grossMonthly')}
            keyboardType="decimal-pad"
          />
          <ToggleRow label="I get a bonus" value={draft.hasBonus} onChange={set('hasBonus')} />
          {draft.hasBonus ? (
            <TextField error={req('bonusMonths')} label="Bonus, in months of pay" info="A typical year’s bonus, including the 13th month if you get one." value={draft.bonusMonths} onChangeText={amountField('bonusMonths')} keyboardType="decimal-pad" />
          ) : null}
          <TextField
            label={`Spending now per month (${currency})`}
            error={req('currentSpending')}
            info="What you spend in a month today, leaving out insurance and healthcare: they have their own line."
            help={recorded.spending !== null ? `From your records: about ${money(recorded.spending, 0)} a month.` : undefined}
            value={groupThousands(draft.currentSpending)}
            onChangeText={amountField('currentSpending')}
            keyboardType="decimal-pad"
          />
        </View>
      </Card>

      <Card>
        <CardHeader title="Spending in retirement" />
        <View style={styles.form}>
          <SelectField label="Which kind of FIRE?" icon={Flame} value={fireType.label} info={fireType.blurb} onPress={() => setPicker('fire')} />
          {draft.fireType === 'coast' ? (
            <TextField
              label="Age you’ll stop investing"
              error={req('coastAge')}
              info="Your Coast age. You invest each month until then, and your investments grow on their own until you retire. FireBuddy works out how much to invest a month to get there."
              value={draft.coastAge}
              onChangeText={amountField('coastAge')}
              keyboardType="number-pad"
              maxLength={3}
            />
          ) : null}
          {draft.fireType === 'barista' ? (
            <View style={[styles.subCard, { backgroundColor: theme.surface2 }]}>
              <TextField error={req('baristaAmount')} label={`Part-time income a month (${currency})`} info="In today’s money, like your spending. FireBuddy raises it with inflation up to your retirement, then by your yearly pay rise." value={groupThousands(draft.baristaAmount)} onChangeText={amountField('baristaAmount')} keyboardType="decimal-pad" />
              <View style={styles.paired}>
                <TextField error={req('baristaUntilAge')} label="Until age" value={draft.baristaUntilAge} onChangeText={amountField('baristaUntilAge')} keyboardType="number-pad" maxLength={3} style={styles.pairedField} />
                <TextField error={req('baristaRaise')} label="Yearly pay rise (%)" info={`How much the part-time pay grows each year once you start. ${pct(Number(draft.inflation) / 100 || 0)} (your inflation) keeps its buying power; 0 lets it shrink.`} value={draft.baristaRaise} onChangeText={amountField('baristaRaise')} keyboardType="decimal-pad" style={styles.pairedField} />
              </View>
            </View>
          ) : null}
          <TextField
            label={`Retirement spending a month (${currency})`}
            error={req('monthlySpending')}
            info="In today’s money. Leave out insurance and healthcare: they have their own line below. Lean, Regular and Fat FIRE work this out from your spending now."
            value={groupThousands(draft.monthlySpending)}
            onChangeText={(value) => {
              setError(null);
              // A typed figure no longer matches the Lean, Regular or Fat share, so it becomes Custom.
              setDraft((current) => ({ ...current, monthlySpending: sanitizeAmountInput(value), fireType: FIRE_TYPES.find((item) => item.key === current.fireType)?.ratio ? 'custom' : current.fireType }));
            }}
            keyboardType="decimal-pad"
          />
          <View style={[styles.subCard, { backgroundColor: theme.surface2 }]}>
            <TextField error={req('insuranceAmount')}
              label={`Insurance annual premiums (${currency})`}
              optional
              info="Premiums you pay in cash for health, life and other insurance, in today’s money. Leave it blank if you’re not sure."
              help={recorded.insurance !== null ? `You record about ${money(recorded.insurance * 12, 0)} a year in Insurance.` : undefined}
              value={groupThousands(draft.insuranceAmount)}
              onChangeText={amountField('insuranceAmount')}
              keyboardType="decimal-pad"
            />
            <TextField error={req('medicalAmount')}
              label={`Annual healthcare spending (${currency})`}
              optional
              info="Clinic visits, medicines and dental each year, in today’s money. Big bills such as surgery are mostly paid by MediShield Life or your Integrated Shield Plan."
              help={recorded.health !== null ? `You record about ${money(recorded.health * 12, 0)} a year in Health.` : undefined}
              value={groupThousands(draft.medicalAmount)}
              onChangeText={amountField('medicalAmount')}
              keyboardType="decimal-pad"
            />
            <TextField error={req('healthGrowth')}
              label="Yearly rise (%)"
              info={`Healthcare prices in Singapore have risen only a little faster than other prices (about 2.35% a year against 2.14%, 2005 to 2025), but premiums and doctor visits grow as you age. The default is your inflation plus 2%.`}
              value={draft.healthGrowth}
              onChangeText={amountField('healthGrowth')}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </Card>
      </>
      ) : null}

      {step === 2 ? (
      <>
      <Card>
        <CardHeader
          title="What you have today"
          subtitle={draft.useOverride ? `Starting from ${money(startingTotal, 0)}, your own total` : `Starting from ${money(startingTotal, 0)} across ${draft.assetIds.length} asset${draft.assetIds.length === 1 ? '' : 's'}`}
        />
        <View style={styles.form}>
          {draft.useOverride ? (
            <>
              <TextField
                label={isSingapore ? `My total net worth today, excluding CPF (${currency})` : `My total net worth today (${currency})`}
                info={isSingapore ? 'Everything you own minus what you owe, leaving out CPF: your plan counts CPF on its own.' : 'Everything you own minus what you owe.'}
                error={req('overrideAmount')} value={groupThousands(draft.overrideAmount)} onChangeText={amountField('overrideAmount')} keyboardType="decimal-pad" />
              <View>
                <CheckboxRow checked={draft.addToWealth} onChange={set('addToWealth')} accessibilityLabel="Also add this to Wealth">Also add this to Wealth</CheckboxRow>
                <AppText variant="caption" tone="ink3">Counts in your net worth and updates when you update Wealth.</AppText>
              </View>
            </>
          ) : assets.length ? (
            <View style={styles.block}>
              <View style={styles.infoLine}>
                <AppText variant="caption" tone="ink2" style={styles.grow}>Your assets in Wealth</AppText>
                <InfoButton title="Your assets in Wealth" body="Untick any you will not spend in retirement, such as your home." />
              </View>
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
          ) : null}
          {noAssets ? null : <ToggleRow label="Type my total myself" info="Use one figure instead of your Wealth assets." value={draft.useOverride} onChange={set('useOverride')} />}
        </View>
      </Card>

      <Card>
        <CardHeader title="Investing each month" />
        <View style={styles.form}>
          <TextField label={`Monthly investment (${currency})`} error={req('monthlyContribution')} info="What you add to your investments each month until you retire." value={groupThousands(draft.monthlyContribution)} onChangeText={amountField('monthlyContribution')} keyboardType="decimal-pad" />
          <TextField error={req('contributionGrowth')}
            label="Increase it each year (%)"
            optional
            info="If your pay rises, you may invest more. Your monthly investment goes up by this much once a year until you retire. Leave it at 0 to keep it flat."
            value={draft.contributionGrowth}
            onChangeText={amountField('contributionGrowth')}
            keyboardType="decimal-pad"
          />
        </View>
      </Card>
      </>
      ) : null}

      {step === 3 ? (
      <Card>
        <CardHeader title="Your home" info="A home you own or plan to buy. Your home isn’t counted as money to spend in retirement; this step is for its costs." />
        <View style={styles.form}>
          <View style={styles.block}>
            <AppText variant="bodyMedium">Do you own property?</AppText>
            <SegmentedControl
              accessibilityLabel="Do you own property"
              options={[{ value: 'own', label: 'I own one' }, { value: 'plan', label: 'Plan to buy' }, { value: 'none', label: 'No' }]}
              value={draft.propertyStatus}
              onChange={set('propertyStatus')}
            />
          </View>
          {draft.propertyStatus === 'plan' || (cpfMember && draft.propertyStatus === 'own') ? (
            <View style={styles.paired}>
              {draft.propertyStatus === 'plan' ? (
                <TextField
                  label="Age you’ll buy"
                  info="Your downpayment, renovation and loan payments start the year you reach this age."
                  error={req('buyAge')}
                  value={draft.buyAge}
                  onChangeText={setBuyAge}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={styles.pairedField}
                />
              ) : (
                <YearField error={req('housingFrom')} label="Loan from" value={draft.housingFrom} onChange={set('housingFrom')} style={styles.pairedField} />
              )}
              {cpfMember ? <YearField error={req('housingUntil')} label="Loan until" info="The first year you no longer pay." value={draft.housingUntil} onChange={set('housingUntil')} style={styles.pairedField} /> : null}
            </View>
          ) : null}
          {/* Under the pair, not the age box, so both boxes stay level. */}
          {draft.propertyStatus === 'plan' && /^\d+$/.test(draft.buyAge) && birthYear !== null ? (
            <AppText variant="caption" tone="ink2">{`You’ll buy in ${birthYear + Number(draft.buyAge)}.`}</AppText>
          ) : null}
          {draft.propertyStatus === 'plan' ? (
            <>
              <TextField
                label={`Home budget (${currency})`}
                optional
                info="What you expect to pay for the home, in today’s money. FireBuddy fills in the figures below from it: a 25% downpayment, from your OA as far as it goes and the rest in cash, then a 25-year HDB loan at 2.6% paid from OA. Change any of them."
                help={Number(draft.homeBudget) > 0 && cpfMember && oaForHome(draft) === null ? 'Add your CPF balances in Retirement income to check your OA covers the downpayment.' : undefined}
                error={req('homeBudget')}
                value={groupThousands(draft.homeBudget)}
                onChangeText={(text) => {
                  setError(null);
                  setDraft((current) => withHomeGuide({ ...current, homeBudget: sanitizeAmountInput(text) }));
                }}
                keyboardType="decimal-pad"
              />
              {cpfMember ? (
                <TextField error={req('oaDownpayment')} label={`Downpayment from OA (${currency})`} optional info="CPF OA used for the downpayment. It comes out of your OA in the year you buy." value={groupThousands(draft.oaDownpayment)} onChangeText={amountField('oaDownpayment')} keyboardType="decimal-pad" />
              ) : null}
              <TextField error={req('cashUpfront')} label={`Cash upfront (${currency})`} optional info="Cash for the downpayment and renovation, in today’s money: any downpayment not from CPF, plus renovation and furniture. It’s taken from your investments in the year you buy." help={Number(draft.homeBudget) > 0 ? 'Add renovation and furniture on top.' : undefined} value={groupThousands(draft.cashUpfront)} onChangeText={amountField('cashUpfront')} keyboardType="decimal-pad" />
            </>
          ) : null}
          {cpfMember && draft.propertyStatus !== 'none' ? (
            <TextField error={req('oaHousing')} label={`Monthly home loan (${currency})`} info="Paid from your CPF OA, so that money doesn’t grow in CPF. Leave 0 if you pay it in cash." value={groupThousands(draft.oaHousing)} onChangeText={amountField('oaHousing')} keyboardType="decimal-pad" />
          ) : null}
          {draft.propertyStatus === 'plan' && isSingapore ? (
            <HomePrices
              open={pricesOpen}
              onToggle={() => setPricesOpen((value) => !value)}
              thisYear={Number(today.slice(0, 4))}
              inflation={Number(draft.inflation) / 100 || 0}
              money={(value) => money(value, 0)}
            />
          ) : null}
        </View>
      </Card>
      ) : null}

      {step === 4 ? (
      <Card>
        <CardHeader title="Retirement income" info="CPF LIFE and other income are in the money of the year each payment starts, as the CPF LIFE estimator shows them." />
        <View style={styles.form}>
          {cpfMember ? (
            <>
              <SelectField label="CPF LIFE plan" icon={Landmark} value={cpfOption.label} info={cpfOption.detail} onPress={() => setPicker('cpf')} />
              <SelectField label="Work out my payout" error={req('cpfSource')} icon={Calculator} value={cpfSource.label} info={CPF_SOURCE_INFO} onPress={() => setPicker('cpfSource')} />
              {!cpfSource.fallback ? (
                <Button label="Don’t know your balances?" variant="text" size="compact" onPress={() => setPicker('cpfFallback')} style={styles.linkButton} />
              ) : null}
              {fromBalances(draft.cpfSource) ? (
                <>
                  {draft.cpfSource === 'wealth' && !wealthCpf.found ? (
                    <AppText variant="caption" tone="warning">
                      {wealthCpf.untagged ? 'Your CPF positions in Wealth need an account. Open each one in Wealth and choose OA, SA or MA.' : 'No CPF in Wealth yet. Add your OA, SA and MA in Wealth, or type your own figures.'}
                    </AppText>
                  ) : null}
                  {(['oa', 'sa', 'ma'] as const).map((key) => {
                    const fromWealth = draft.cpfSource === 'wealth';
                    return (
                      <TextField
                        key={key}
                        label={`${key.toUpperCase()} (${currency})`}
                        info={key === 'oa' ? (fromWealth ? 'From your CPF positions in Wealth. Update them there.' : 'Today’s balances, from the CPF app.') : undefined}
                        value={groupThousands(fromWealth ? (wealthCpf.found ? String(Math.round(wealthCpf[key])) : '') : draft[key])}
                        onChangeText={amountField(key)}
                        editable={!fromWealth}
                        error={req(key)}
                        keyboardType="decimal-pad"
                        style={styles.halfField}
                      />
                    );
                  })}
                </>
              ) : null}
              <View style={styles.paired}>
                {draft.cpfSource !== 'typed' ? (
                  <SelectField label="Set aside at 55" icon={PiggyBank} value={cpfSum.label.replace(' Retirement Sum', '')} onPress={() => setPicker('cpfSum')} style={styles.pairedField} />
                ) : null}
                {draft.cpfSource === 'typed' ? (
                  <TextField label="Payout a month" error={req('cpfMonthlyPayout')} info="In S$. Use the figure from CPF’s Retirement Payout Planner. It is in the dollars of the year your payouts start. FireBuddy shows every amount in today’s money, so after years of inflation the same payout looks smaller on your plan." value={groupThousands(draft.cpfMonthlyPayout)} onChangeText={amountField('cpfMonthlyPayout')} keyboardType="decimal-pad" style={styles.pairedField} />
                ) : null}
                <SelectField label="Starts at age" error={req('cpfStartAge')} icon={Timer} value={draft.cpfStartAge} onPress={() => setPicker('cpfAge')} style={styles.pairedField} />
              </View>
              <AppText variant="caption" tone="ink3">
                {draft.cpfSource === 'typed'
                  ? (cpfToday !== null ? `Worth about ${money(cpfToday, 0)} a month in today’s money, which is what your plan shows.` : 'Enter the payout from CPF’s planner for the age you pick.')
                  : Number.isFinite(cpfPayout) && cpfToday !== null
                    ? `About ${money(cpfPayout, 0)} a month from age ${draft.cpfStartAge}, worth about ${money(cpfToday, 0)} in today’s money${cpfProjection ? `, from about ${money(cpfProjection.raAt55, 0)} in your retirement account at 55` : ''}. Check yours in CPF’s Retirement Payout Planner.`
                    : 'Enter the year you were born to see the estimate.'}
                {fromBalances(draft.cpfSource) && !cpfProjection ? ' Until your balances and retirement age are in, this uses the retirement sum.' : ''}
              </AppText>
              {fromBalances(draft.cpfSource) ? (
                <View style={styles.block}>
                  <ToggleRow
                    label="Take out CPF above my retirement sum at 55"
                    info={[
                      'At 55, CPF moves your SA, then OA, into a new Retirement Account, up to the retirement sum you chose above. That account pays your CPF LIFE income later.',
                      'Whatever is left above that sum can be taken out as cash from 55. Turn this on to add it to your investments that year. Leave it off to keep it in CPF, where your plan does not spend it.',
                    ]}
                    help={cpfProjection && cpfProjection.withdrawableAt55 > 0 ? `About ${money(cpfProjection.withdrawableAt55, 0)} at 55, in that year’s dollars.` : undefined}
                    value={draft.withdrawAt55}
                    onChange={set('withdrawAt55')}
                  />
                </View>
              ) : null}
            </>
          ) : null}

          <View style={styles.block}>
            <AppText variant="bodySemibold">{isSingapore ? 'Other income' : 'Pension and other income'}</AppText>
            {draft.otherIncome.length === 0 ? <AppText variant="caption" tone="ink2">Rental, a pension, part-time work.</AppText> : null}
            {draft.otherIncome.map((item, index) => {
              const expanded = openIncome === index;
              const summary = [
                item.monthlyAmount ? `${money(Number(item.monthlyAmount) || 0, 0)} a month` : null,
                isMonth(item.startMonth) && isMonth(item.endMonth) ? `${formatShortMonthLabel(item.startMonth)} to ${formatShortMonthLabel(item.endMonth)}` : null,
              ].filter(Boolean).join(' · ');
              return (
                <View key={item.key} style={[styles.incomeCard, { borderColor: incomeBad(item) || noneSpotted('otherIncome') ? theme.danger : theme.line, backgroundColor: theme.surface }]}>
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
                      <TextField label={`Monthly amount after tax (${currency})`} error={incomeBad(item) && item.monthlyAmount.trim() === '' ? FIELD_INVALID : undefined} value={groupThousands(item.monthlyAmount)} onChangeText={income(index, 'monthlyAmount')} keyboardType="decimal-pad" />
                      <View style={styles.paired}>
                        <YearField label="Starts in" error={incomeBad(item) && yearBad(item.startMonth) ? FIELD_INVALID : undefined} value={item.startMonth} onChange={income(index, 'startMonth')} style={styles.pairedField} />
                        <YearField label="Stops in" info="The first year it no longer pays." error={incomeBad(item) && (!isMonth(item.endMonth) || item.endMonth <= item.startMonth) ? FIELD_INVALID : undefined} value={item.endMonth} onChange={income(index, 'endMonth')} style={styles.pairedField} />
                      </View>
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
      ) : null}

      {step === LAST_STEP ? (
      <>
      <Card>
        <CardHeader title="Big costs and money coming in" info="One-off amounts on a year you choose, in today’s money: a home downpayment or a car before you retire, or a policy payout or downsizing later. Costs come out of your investments; money coming in goes into them. Money arriving late in retirement cannot pay for earlier years." />
        <View style={styles.form}>
          {draft.lumpSums.length === 0 ? <AppText variant="caption" tone="ink2">Optional. A home downpayment, a car, a policy payout…</AppText> : null}
          {draft.lumpSums.map((item, index) => {
            const expanded = openLump === item.key;
            const amount = Number(item.amount) || 0;
            const summary = [amount ? `${item.direction === 'in' ? '+' : '−'}${money(amount, 0)}` : null, isMonth(item.month) ? item.month.slice(0, 4) : null].filter(Boolean).join(' · ');
            return (
              <View key={item.key} style={[styles.incomeCard, { borderColor: lumpBad(item) || noneSpotted('lumpSums') ? theme.danger : theme.line, backgroundColor: theme.surface }]}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setOpenLump(expanded ? null : item.key)} style={styles.incomeHead}>
                  <View style={styles.incomeCopy}>
                    <AppText variant="bodySemibold" numberOfLines={1}>{item.label.trim() || (item.direction === 'in' ? 'Money coming in' : 'Big cost')}</AppText>
                    <AppText variant="caption" tone="ink2" numberOfLines={1}>{summary || 'Tap to fill in'}</AppText>
                  </View>
                  {expanded ? <ChevronUp size={18} color={theme.ink2} /> : <ChevronDown size={18} color={theme.ink2} />}
                </Pressable>
                {expanded ? (
                  <View style={styles.form}>
                    <SegmentedControl
                      accessibilityLabel="A cost or money coming in"
                      options={[{ value: 'out', label: 'A cost' }, { value: 'in', label: 'Money coming in' }]}
                      value={item.direction}
                      onChange={(value) => lump(index, 'direction')(value)}
                    />
                    <TextField label="What is it?" value={item.label} onChangeText={lump(index, 'label')} placeholder="Home downpayment, policy payout…" />
                    <View style={styles.paired}>
                      <TextField label={`Amount (${currency})`} info="In today’s money. FireBuddy adds inflation up to the year it happens." error={lumpBad(item) && item.amount.trim() === '' ? FIELD_INVALID : undefined} value={groupThousands(item.amount)} onChangeText={lump(index, 'amount')} keyboardType="decimal-pad" style={styles.pairedField} />
                      <YearField label="Year" error={(lumpBad(item) && yearBad(item.month)) || noneSpotted('lumpSums') ? FIELD_INVALID : undefined} value={item.month} onChange={lump(index, 'month')} style={styles.pairedField} />
                    </View>
                    <Button label="Remove" variant="text" size="compact" onPress={() => { set('lumpSums')(draft.lumpSums.filter((_, i) => i !== index)); setOpenLump(null); }} />
                  </View>
                ) : null}
              </View>
            );
          })}
          <Button label="Add a cost or payment" icon={Plus} variant="secondary" disabled={draft.lumpSums.length >= 20} onPress={() => setPicker('lump')} />
        </View>
      </Card>

      <Card>
        <CardHeader title="Assumptions" info="Editable assumptions, not forecasts. The defaults are deliberately cautious." />
        <View style={styles.form}>
          <TextField
            label={draft.splitReturns ? 'Return before retirement (%)' : 'Investment return (%)'}
            error={req('beforeReturn')}
            info={`Yearly growth of your investments before inflation. Default ${pct(0.07)}.`}
            value={draft.beforeReturn}
            onChangeText={amountField('beforeReturn')}
            keyboardType="decimal-pad"
          />
          <ToggleRow
            label="Lower return after I retire"
            info="For moving to safer investments once you stop working."
            value={draft.splitReturns}
            onChange={(next) => setDraft((current) => ({ ...current, splitReturns: next, afterReturn: next && current.afterReturn === current.beforeReturn ? '5' : current.afterReturn }))}
          />
          {draft.splitReturns ? (
            <TextField label="Return after retirement (%)" error={req('afterReturn')} value={draft.afterReturn} onChangeText={amountField('afterReturn')} keyboardType="decimal-pad" />
          ) : null}
          <TextField label="Inflation (%)" error={req('inflation')} info={`Yearly rise in prices, and so in your spending. Default ${pct(0.03)}.`} value={draft.inflation} onChangeText={amountField('inflation')} keyboardType="decimal-pad" />
        </View>
      </Card>
      </>
      ) : null}

      {error ? <AppText variant="bodySmall" tone="danger">{error}</AppText> : null}
      <View style={styles.actions}>
        {step === 0
          ? <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
          : <Button label="Back" variant="secondary" onPress={() => goTo(step - 1)} />}
        {step < LAST_STEP
          ? <Button label="Continue" variant="primary" block style={styles.grow} onPress={next} />
          : <Button label="Save plan" variant="primary" block style={styles.grow} onPress={save} />}
      </View>
      {editing ? (
        <View style={styles.editActions}>
          {step < LAST_STEP ? <Button label="Save plan" variant="secondary" block onPress={save} /> : null}
          <Button label="Start over" variant="text" size="compact" onPress={() => setConfirmReset(true)} />
        </View>
      ) : null}

      <ConfirmDialog
        open={confirmReset}
        title="Start over?"
        message="This clears your answers and takes you back to step 1. Your saved plan stays as it is until you save the new one."
        confirmLabel="Start over"
        onCancel={() => setConfirmReset(false)}
        onConfirm={startOver}
      />

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
          detail: age === 65 ? 'The earliest age' : `Deferred ${age - 65} year${age === 66 ? '' : 's'}: about ${Math.round(deferralGain(age) * 100)}% more a month`,
          selected: String(age) === draft.cpfStartAge,
          onSelect: () => set('cpfStartAge')(String(age)),
        }))}
      />
      <ActionSheet
        open={picker === 'cpfSource'}
        onClose={() => setPicker(null)}
        title="Work out my CPF LIFE payout"
        actions={cpfSources.filter((item) => !item.fallback).map((item) => ({
          key: item.value,
          label: item.label,
          detail: item.detail,
          selected: item.value === draft.cpfSource,
          onSelect: () => set('cpfSource')(item.value),
        }))}
      />
      <ActionSheet
        open={picker === 'cpfFallback'}
        onClose={() => setPicker(null)}
        title="Don’t know your balances?"
        actions={cpfSources.filter((item) => item.fallback).map((item) => ({
          key: item.value,
          label: item.label,
          detail: item.detail,
          selected: item.value === draft.cpfSource,
          // Switching to typing starts the field from the current estimate.
          onSelect: () => setDraft((current) => ({ ...current, cpfSource: item.value, cpfMonthlyPayout: item.value === 'typed' && current.cpfSource !== 'typed' && Number.isFinite(cpfPayout) ? String(cpfPayout) : current.cpfMonthlyPayout })),
        }))}
      />
      <ActionSheet
        open={picker === 'cpfSum'}
        onClose={() => setPicker(null)}
        title="Savings set aside at 55"
        actions={cpfSums.map((item) => ({ key: item.value, label: item.label, detail: [sumDetail(item.value), item.detail].filter(Boolean).join('. '), selected: item.value === draft.cpfSum, onSelect: () => set('cpfSum')(item.value) }))}
      />
      <ActionSheet
        open={picker === 'lump'}
        onClose={() => setPicker(null)}
        title="Add a cost or payment"
        actions={lumpTemplates.map((template) => ({ key: template.label, label: template.label, detail: template.direction === 'in' ? 'Money coming in' : 'A cost', onSelect: () => addLump(template) }))}
      />
    </Screen>
  );
}

/**
 * "Not sure how much?" for a planned home (PRD 6.6.1, 29 and 33): typical prices for singles and
 * couples in today's money, the same money as the budget, with the amount only.
 */
function HomePrices({ open, onToggle, thisYear, inflation, money }: { open: boolean; onToggle: () => void; thisYear: number; inflation: number; money: (value: number) => string }) {
  const { theme } = useTheme();
  // Averages, so rounded to the nearest thousand.
  const thousand = (value: number) => money(Math.round(value / 1000) * 1000);
  const range = (low: number, high: number) => (low === high ? thousand(low) : `${thousand(low)} to ${thousand(high)}`);
  return (
    <View style={[styles.subCard, { backgroundColor: theme.surface2 }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.incomeHead}>
        <AppText variant="bodyMedium" style={styles.grow}>Not sure how much? See averages</AppText>
        {open ? <ChevronUp size={18} color={theme.ink2} /> : <ChevronDown size={18} color={theme.ink2} />}
      </Pressable>
      {open ? (
        <View style={styles.form}>
          {(['single', 'couple'] as const).map((who) => (
            <View key={who} style={styles.block}>
              <AppText variant="label">{who === 'single' ? 'Singles' : 'Couples'}</AppText>
              {HOME_PRICES[who].map((item) => (
                <View key={`${who}-${item.kind}`} style={[styles.priceItem, { borderColor: theme.line }]}>
                  <AppText variant="caption" tone="ink2">{`${item.kind} · ${item.detail}`}</AppText>
                  <AppText variant="bodySemibold">{range(homePriceIn(item.low, thisYear, inflation), homePriceIn(item.high, thisYear, inflation))}</AppText>
                </View>
              ))}
            </View>
          ))}
          <AppText variant="caption" tone="ink3">Today’s prices, before grants. FireBuddy adds inflation up to the year you buy.</AppText>
        </View>
      ) : null}
    </View>
  );
}

/** A blank plan for a phone that has never had one; the validator explains what is still missing. */
function emptyPlan(today: string): RetirementPlan {
  return {
    version: 2, spendingMonth: today.slice(0, 7), birthMonth: '', retirementMonth: '', endAge: 95, monthlySpending: 0, monthlyContribution: 0,
    assetIds: [], portfolioOverride: null, cpfPlan: 'unknown', cpfStartAge: 65, cpfMonthlyPayout: 0, otherIncome: [],
    beforeReturn: 0.07, afterReturn: 0.07, inflation: 0.03, provenance: {}, fireType: 'regular', contributionGrowth: 0,
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
    // Fields with labels of different heights still line up their boxes.
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  halfField: {
    width: '48%',
  },
  linkButton: {
    alignSelf: 'flex-start',
  },
  priceItem: {
    gap: 2,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  steps: {
    gap: spacing.sm,
  },
  stepChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editActions: {
    gap: spacing.sm,
    alignItems: 'stretch',
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
