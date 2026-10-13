import { CATEGORY_CHART_PALETTE, CATEGORY_NEUTRAL_COLOR } from './category-palette';
import { getDeviceDateKey } from './format';
import type { Account, Category, RetirementPlan, Tag, Transaction, WealthContribution, WealthPosition, WealthPositionSnapshot } from './types';

/**
 * Local demo dataset used when no Supabase session exists. Mirrors the web demo records so the
 * two apps show the same Singapore saver, using the canonical shared types (string amounts,
 * categoryId / accountId keys).
 */
export const demoUserId = 'demo';

const demoTimestamp = '2026-01-01T00:00:00.000Z';

export const demoCategoryIds = {
  food: '00000000-0000-4000-8000-000000000001',
  transport: '00000000-0000-4000-8000-000000000002',
  shopping: '00000000-0000-4000-8000-000000000003',
  utilities: '00000000-0000-4000-8000-000000000004',
  health: '00000000-0000-4000-8000-000000000005',
  entertainment: '00000000-0000-4000-8000-000000000006',
  travel: '00000000-0000-4000-8000-000000000007',
  others: '00000000-0000-4000-8000-000000000008',
  salary: '00000000-0000-4000-8000-000000000009',
  bonus: '00000000-0000-4000-8000-000000000010',
  dividends: '00000000-0000-4000-8000-000000000011',
  interest: '00000000-0000-4000-8000-000000000012',
  otherIncome: '00000000-0000-4000-8000-000000000013',
} as const;

function demoCategory(
  id: string,
  name: string,
  color: string,
  icon: string,
  monthlyBudget: number,
  categoryType: Category['categoryType'],
): Category {
  return {
    id,
    userId: null,
    name,
    icon,
    color,
    monthlyBudget: monthlyBudget.toFixed(2),
    categoryType,
    isDefault: true,
    createdAt: demoTimestamp,
  };
}

export const demoCategories: readonly Category[] = [
  demoCategory(demoCategoryIds.food, 'Food & Drink', CATEGORY_CHART_PALETTE[0], 'food', 600, 'expense'),
  demoCategory(demoCategoryIds.transport, 'Transport', CATEGORY_CHART_PALETTE[1], 'transport', 250, 'expense'),
  demoCategory(demoCategoryIds.shopping, 'Shopping', CATEGORY_CHART_PALETTE[2], 'shopping', 300, 'expense'),
  demoCategory(demoCategoryIds.utilities, 'Bills & Utilities', CATEGORY_CHART_PALETTE[3], 'utilities', 150, 'expense'),
  demoCategory(demoCategoryIds.health, 'Healthcare', CATEGORY_CHART_PALETTE[4], 'health', 150, 'expense'),
  demoCategory(demoCategoryIds.entertainment, 'Entertainment', CATEGORY_CHART_PALETTE[5], 'entertainment', 200, 'expense'),
  demoCategory(demoCategoryIds.travel, 'Travel', CATEGORY_CHART_PALETTE[6], 'travel', 400, 'expense'),
  demoCategory(demoCategoryIds.others, 'Others', CATEGORY_NEUTRAL_COLOR, 'shapes', 200, 'expense'),
  demoCategory(demoCategoryIds.salary, 'Salary', '#3C8A61', 'salary', 0, 'income'),
  demoCategory(demoCategoryIds.bonus, 'Bonus', '#E5B24A', 'bonus', 0, 'income'),
  demoCategory(demoCategoryIds.dividends, 'Dividends', '#67B47C', 'dividends', 0, 'income'),
  demoCategory(demoCategoryIds.interest, 'Interest', '#7BAA90', 'interest', 0, 'income'),
  demoCategory(demoCategoryIds.otherIncome, 'Other income', '#A8D3B7', 'income', 0, 'income'),
];

/** The phone's built-in Insurance category (PRD 6.6.1, 26). The frozen web keeps its own list. */
export const INSURANCE_CATEGORY_ID = '00000000-0000-4000-8000-000000000014';
export const insuranceCategory: Category = demoCategory(INSURANCE_CATEGORY_ID, 'Insurance', '#4F6DB8', 'insurance', 0, 'expense');

/**
 * Adds the built-in Insurance category once, before Others, unless the list already has it or a
 * category of the person's own called Insurance. Returns the same array when nothing changes.
 */
export function withInsuranceCategory<T extends Pick<Category, 'id' | 'name' | 'categoryType'>>(categories: readonly T[], insurance: T): readonly T[] {
  const taken = categories.some((category) => category.id === INSURANCE_CATEGORY_ID || (category.categoryType === 'expense' && category.name.trim().toLowerCase() === 'insurance'));
  if (taken) return categories;
  const others = categories.findIndex((category) => category.id === demoCategoryIds.others);
  const at = others < 0 ? categories.length : others;
  return [...categories.slice(0, at), insurance, ...categories.slice(at)];
}

/**
 * Shorter names for the built-in categories on the phone, whose four-column category grid has no
 * room for "Healthcare" or "Bills & Utilities" (owner, 10 Oct 2026). The web keeps the long names.
 */
export const SHORT_DEFAULT_CATEGORY_NAMES: Readonly<Record<string, { from: string; to: string }>> = {
  [demoCategoryIds.food]: { from: 'Food & Drink', to: 'Food' },
  [demoCategoryIds.utilities]: { from: 'Bills & Utilities', to: 'Bills' },
  [demoCategoryIds.health]: { from: 'Healthcare', to: 'Health' },
  [demoCategoryIds.entertainment]: { from: 'Entertainment', to: 'Leisure' },
  [demoCategoryIds.otherIncome]: { from: 'Other income', to: 'Other' },
};

/**
 * Gives built-in categories their short phone names. Only a built-in category still carrying its
 * original long name is renamed, so a name the person chose is never overwritten. Returns the same
 * array when nothing changes.
 */
export function shortenDefaultCategoryNames<T extends Pick<Category, 'id' | 'name' | 'isDefault'>>(categories: readonly T[]): readonly T[] {
  let changed = false;
  const next = categories.map((category) => {
    const short = SHORT_DEFAULT_CATEGORY_NAMES[category.id];
    if (!category.isDefault || !short || category.name !== short.from) return category;
    changed = true;
    return { ...category, name: short.to };
  });
  return changed ? next : categories;
}

function demoAccount(id: string, name: string, type: Account['type'], color: string, lastFour: string | null, isDefault = false): Account {
  // DBS Savings and OCBC 360 are followed by Wealth balances; the card and wallets stay out of net
  // worth, since the card is manual and the wallets hold only spending (PRD 6.4.1, item 5a).
  return { id, userId: demoUserId, name, type, color, lastFour, isDefault, trackBalance: false, createdAt: demoTimestamp, updatedAt: demoTimestamp };
}

export const demoAccounts: readonly Account[] = [
  demoAccount('dbs_savings', 'DBS Savings', 'bank', '#3C8A61', '4521', true),
  demoAccount('ocbc_360', 'OCBC 360', 'bank', '#67B47C', '8834'),
  demoAccount('dbs_altitude', 'DBS Altitude', 'credit_card', '#7BAA90', '1234'),
  demoAccount('grabpay', 'GrabPay', 'ewallet', '#2E9B57', null),
  demoAccount('cash_wallet', 'Cash', 'cash', '#E5B24A', null),
];

export const demoTags: readonly Tag[] = [];

export const demoProfile = {
  name: 'Jen Tan',
  email: 'jen@demo.com',
} as const;

/** Shift a YYYY-MM-DD key by whole months, clamping to the 1st so month arithmetic never overflows. */
function monthsAgo(todayKey: string, months: number, day = 1) {
  const [year, month] = todayKey.split('-').map(Number);
  const date = new Date(year, month - 1 - months, day);
  return getDeviceDateKey(date);
}

function demoPosition(id: string, name: string, values: Partial<WealthPosition>): WealthPosition {
  return {
    id, userId: demoUserId, name, positionKind: 'asset', positionType: 'cash', liquidityClass: 'liquid',
    includeInFi: false, isEmergencyFund: false, restrictionType: 'none', currency: 'SGD',
    interestRate: null, monthlyPayment: null, nextPaymentDate: null, originalPrincipal: null, isArchived: false,
    archivedAt: null, latestSnapshot: null, createdAt: demoTimestamp, updatedAt: demoTimestamp, ...values,
  };
}

export const demoWealthIds = {
  dbsSavings: '00000000-0000-4000-8000-00000000f101',
  ocbc360: '00000000-0000-4000-8000-00000000f105',
  brokerage: '00000000-0000-4000-8000-00000000f102',
  home: '00000000-0000-4000-8000-00000000f103',
  mortgage: '00000000-0000-4000-8000-00000000f104',
} as const;

export interface DemoWealth {
  positions: WealthPosition[];
  snapshots: WealthPositionSnapshot[];
  contributions: WealthContribution[];
}

/**
 * An early-career saver with about S$80,000 of net worth: two bank accounts followed by Wealth
 * (DBS Savings, the emergency fund, and OCBC 360), brokerage S$47,000, and an HDB flat worth
 * S$380,000 with S$365,000 still owed on the loan, plus one investment contribution this month.
 * The bank balances are entered on the 1st of each of the last six months, as if updated after
 * paying the card bill and investing, and the month's transactions move them from there, so this
 * month's salary lifts DBS Savings to about S$13,000 and the bills take OCBC 360 to about S$5,800.
 * The other assets and the loan are valued six months ago, three months ago and this month.
 */
export function createDemoWealth(todayKey = getDeviceDateKey()): DemoWealth {
  const positions: WealthPosition[] = [
    demoPosition(demoWealthIds.dbsSavings, 'DBS Savings', { includeInFi: true, isEmergencyFund: true, linkedAccountId: 'dbs_savings' }),
    demoPosition(demoWealthIds.ocbc360, 'OCBC 360', { includeInFi: true, linkedAccountId: 'ocbc_360' }),
    demoPosition(demoWealthIds.brokerage, 'Brokerage', { positionType: 'investment', liquidityClass: 'less_liquid', includeInFi: true }),
    demoPosition(demoWealthIds.home, 'Home', { positionType: 'property', liquidityClass: 'less_liquid' }),
    demoPosition(demoWealthIds.mortgage, 'Mortgage', {
      positionKind: 'liability', positionType: 'mortgage', liquidityClass: 'less_liquid',
      interestRate: '0.0260', monthlyPayment: '1650.00', nextPaymentDate: monthsAgo(todayKey, -1), originalPrincipal: '380000.00',
    }),
  ];
  const quarterly = [6, 3, 0];
  const monthly = [6, 5, 4, 3, 2, 1, 0];
  const current: readonly [string, string, readonly number[]][] = [
    [demoWealthIds.dbsSavings, '8000', monthly],
    [demoWealthIds.brokerage, '47000', quarterly],
    [demoWealthIds.home, '380000', quarterly],
    [demoWealthIds.mortgage, '365000', quarterly],
    [demoWealthIds.ocbc360, '6000', monthly],
  ];
  const snapshots: WealthPositionSnapshot[] = current.flatMap(([wealthPositionId, amount, ages], index) => ages.map((age) => ({
    id: `00000000-0000-4000-8000-${String(200 + index * 10 + age).padStart(12, '0')}`,
    userId: demoUserId,
    wealthPositionId,
    valueDate: monthsAgo(todayKey, age),
    // Debts shrink over time while assets grow, so the history reads the right way round.
    amount: age === 0 ? amount : (Number(amount) * (wealthPositionId === demoWealthIds.mortgage
      ? (age === 6 ? 1.016 : 1.008)
      : ages === monthly ? 1 - age * 0.01 : age === 6 ? 0.94 : 0.97)).toFixed(2),
    createdAt: demoTimestamp,
    updatedAt: demoTimestamp,
  })));
  const contributions: WealthContribution[] = [{
    id: '00000000-0000-4000-8000-00000000f301', userId: demoUserId,
    wealthPositionId: demoWealthIds.brokerage, contributionDate: monthsAgo(todayKey, 0, 5),
    amount: '2000.00', note: 'Monthly investment', createdAt: demoTimestamp, updatedAt: demoTimestamp,
  }];
  return { positions, snapshots, contributions };
}

/**
 * An activated retirement plan for the demo saver, filled in the way the phone's form fills it today
 * so every planner feature has a figure to show: born mid-1994, aiming for Regular FIRE at 60 (28
 * years from now) on S$3,500 a month of today's spending, investing S$2,000 a month rising 2% a year.
 * CPF LIFE (Full Retirement Sum, standard plan from 65) is projected from typed CPF balances, the
 * HDB loan uses S$1,200 of OA a month for 22 years, insurance and healthcare cost S$350 a month
 * rising 5% a year, and a S$40,000 car in three years is the one big cost.
 */
export function createDemoRetirementPlan(todayKey = getDeviceDateKey()): RetirementPlan {
  const month = todayKey.slice(0, 7);
  const year = Number(todayKey.slice(0, 4));
  const mm = todayKey.slice(5, 7);
  return {
    version: 2,
    spendingMonth: month,
    birthMonth: '1994-06',
    retirementMonth: `${year + 28}-${mm}`,
    endAge: 95,
    monthlySpending: 3500,
    monthlyContribution: 2000,
    contributionGrowth: 0.02,
    assetIds: [demoWealthIds.dbsSavings, demoWealthIds.ocbc360, demoWealthIds.brokerage],
    portfolioOverride: null,
    fireType: 'regular',
    residency: 'citizen',
    pay: { grossMonthly: 6500, bonusMonths: 2 },
    currentSpending: 3200,
    // The payout is worked out from these balances on every run (PRD 6.6.1, 24); 1,500 is a placeholder.
    cpfPlan: 'standard',
    cpfStartAge: 65,
    cpfMonthlyPayout: 1500,
    cpfEstimate: { sum: 'frs', source: 'balances' },
    cpfBalancesSource: 'typed',
    cpfBalances: { oa: 45000, sa: 28000, ma: 32000, month },
    cpfWithdrawAt55: false,
    property: { status: 'own', oaMonthly: 1200, fromMonth: month, untilMonth: `${year + 22}-${mm}` },
    healthcare: { monthlyAmount: 350, insurance: 250, medical: 100, growth: 0.05, priceMonth: month },
    lumpSums: [{ label: 'Car', month: `${year + 3}-${mm}`, amount: 40000, direction: 'out', priceMonth: month }],
    otherIncome: [],
    beforeReturn: 0.07,
    afterReturn: 0.04,
    inflation: 0.03,
    provenance: {
      birthMonth: 'user-entered', retirementMonth: 'user-entered', monthlySpending: 'user-entered', monthlyContribution: 'user-entered',
      assetIds: 'recorded', cpfMonthlyPayout: 'assumed', beforeReturn: 'assumed', afterReturn: 'assumed', inflation: 'assumed', endAge: 'assumed',
    },
  };
}

type DemoCategoryKey = keyof typeof demoCategoryIds;

/** [months ago, day of month, category, account, description, amount] */
type DemoTransactionSeed = readonly [number, number, DemoCategoryKey, string, string, number];

const incomeCategoryKeys: readonly DemoCategoryKey[] = ['salary', 'bonus', 'dividends', 'interest', 'otherIncome'];

/**
 * Twelve months of history, each with its own spending story and category mix, so the month
 * stepper, budgets and insights all have something different to show. Mirrors the stories in
 * `supabase/reseed_jen_demo.sql`, without the Housing and Insurance categories this demo lacks.
 */
const demoTransactionSeeds: readonly DemoTransactionSeed[] = [
  // Current month: a typical month with every expense category represented.
  [0, 2, 'food', 'dbs_altitude', 'FairPrice groceries', 138.65],
  [0, 3, 'utilities', 'ocbc_360', 'SP Services electricity and water', 112.4],
  [0, 4, 'food', 'cash_wallet', 'Hawker lunches', 46.8],
  [0, 5, 'utilities', 'ocbc_360', 'Singtel mobile and fibre', 74.9],
  [0, 6, 'transport', 'dbs_savings', 'SimplyGo MRT and bus', 58.2],
  [0, 7, 'entertainment', 'dbs_altitude', 'Netflix and Spotify', 29.96],
  [0, 9, 'food', 'grabpay', 'GrabFood dinners', 62.3],
  [0, 11, 'shopping', 'dbs_altitude', 'Shopee household order', 57.8],
  [0, 12, 'transport', 'grabpay', 'Grab rides', 41.6],
  [0, 14, 'health', 'dbs_altitude', 'Polyclinic visit', 24.3],
  [0, 16, 'food', 'dbs_altitude', 'Sheng Siong groceries', 121.1],
  [0, 19, 'entertainment', 'dbs_altitude', 'Golden Village movie night', 32],
  [0, 22, 'food', 'dbs_altitude', 'Seafood dinner with family', 148],
  [0, 24, 'shopping', 'dbs_altitude', 'Uniqlo work shirts', 89.7],
  [0, 26, 'travel', 'dbs_altitude', 'Holiday flight deposit', 120],
  [0, 27, 'others', 'cash_wallet', 'Haircut', 18],
  // 1 month ago: a Japan trip made travel the biggest cost after housing.
  [1, 2, 'food', 'dbs_altitude', 'FairPrice groceries', 102.3],
  [1, 3, 'utilities', 'ocbc_360', 'SP Services electricity and water', 128.7],
  [1, 4, 'transport', 'dbs_savings', 'SimplyGo MRT and bus', 44.1],
  [1, 5, 'utilities', 'ocbc_360', 'Singtel mobile and fibre', 74.9],
  [1, 6, 'food', 'cash_wallet', 'Hawker lunches', 38.5],
  [1, 7, 'entertainment', 'dbs_altitude', 'Netflix and Spotify', 29.96],
  [1, 8, 'travel', 'dbs_altitude', 'Return flights to Tokyo', 1180],
  [1, 10, 'others', 'cash_wallet', 'Currency exchange fees', 32.4],
  [1, 12, 'transport', 'grabpay', 'Grab to Changi Airport', 31.5],
  [1, 13, 'travel', 'dbs_altitude', 'Tokyo hotel', 520],
  [1, 13, 'transport', 'dbs_altitude', 'JR Pass and Suica top up', 342],
  [1, 14, 'food', 'dbs_altitude', 'Tokyo ramen and izakaya', 215.4],
  [1, 15, 'travel', 'dbs_altitude', 'Kyoto ryokan', 640],
  [1, 16, 'entertainment', 'dbs_altitude', 'teamLab tickets', 68],
  [1, 17, 'food', 'dbs_altitude', 'Osaka street food', 96.2],
  [1, 18, 'shopping', 'dbs_altitude', 'Don Quijote souvenirs', 184.5],
  [1, 24, 'food', 'dbs_altitude', 'Sheng Siong groceries', 88.9],
  // 2 months ago: a home refresh pushed shopping well over budget.
  [2, 3, 'food', 'dbs_altitude', 'FairPrice groceries', 152.4],
  [2, 3, 'utilities', 'ocbc_360', 'SP Services electricity and water', 141.2],
  [2, 5, 'utilities', 'ocbc_360', 'Singtel mobile and fibre', 74.9],
  [2, 5, 'transport', 'dbs_savings', 'SimplyGo MRT and bus', 61.4],
  [2, 7, 'entertainment', 'dbs_altitude', 'Netflix and Spotify', 29.96],
  [2, 8, 'food', 'cash_wallet', 'Hawker lunches', 52.6],
  [2, 9, 'shopping', 'dbs_altitude', 'IKEA sofa', 899],
  [2, 10, 'utilities', 'ocbc_360', 'Town council conservancy charges', 82],
  [2, 10, 'others', 'cash_wallet', 'Movers and handyman', 180],
  [2, 12, 'shopping', 'dbs_altitude', 'Courts air purifier', 329],
  [2, 15, 'transport', 'grabpay', 'Grab rides', 28.9],
  [2, 17, 'food', 'dbs_altitude', 'Sheng Siong groceries', 134.8],
  [2, 18, 'health', 'dbs_altitude', 'Dental scaling and polish', 85],
  [2, 20, 'food', 'dbs_altitude', 'Brunch with friends', 76.5],
  [2, 21, 'shopping', 'dbs_altitude', 'Taobao home decor', 146.3],
  [2, 23, 'entertainment', 'dbs_altitude', 'Board game cafe', 36],
  // 3 months ago: a knee injury made healthcare the standout category.
  [3, 2, 'food', 'dbs_altitude', 'FairPrice groceries', 118.2],
  [3, 3, 'utilities', 'ocbc_360', 'SP Services electricity and water', 156.8],
  [3, 4, 'transport', 'dbs_savings', 'SimplyGo MRT and bus', 39.8],
  [3, 5, 'utilities', 'ocbc_360', 'Singtel mobile and fibre', 74.9],
  [3, 6, 'food', 'cash_wallet', 'Hawker lunches', 44.7],
  [3, 7, 'entertainment', 'dbs_altitude', 'Netflix and Spotify', 29.96],
  [3, 10, 'health', 'dbs_altitude', 'Orthopaedic specialist consultation', 280],
  [3, 11, 'transport', 'grabpay', 'Grab rides to hospital', 64.2],
  [3, 12, 'health', 'dbs_altitude', 'MRI scan co-payment', 460],
  [3, 14, 'health', 'dbs_altitude', 'Guardian pharmacy', 38.6],
  [3, 16, 'food', 'dbs_altitude', 'Sheng Siong groceries', 96.4],
  [3, 19, 'food', 'grabpay', 'GrabFood while recovering', 112.6],
  [3, 22, 'health', 'dbs_altitude', 'Physiotherapy sessions', 240],
  [3, 26, 'others', 'cash_wallet', 'Gift for mum', 45],
  // 4 months ago: a no-spend challenge kept discretionary costs near zero.
  [4, 3, 'food', 'dbs_altitude', 'FairPrice groceries', 96.5],
  [4, 3, 'utilities', 'ocbc_360', 'SP Services electricity and water', 118.9],
  [4, 5, 'utilities', 'ocbc_360', 'Singtel mobile and fibre', 74.9],
  [4, 5, 'transport', 'dbs_savings', 'SimplyGo MRT and bus', 46.3],
  [4, 7, 'food', 'cash_wallet', 'Hawker lunches', 38.4],
  [4, 13, 'health', 'dbs_altitude', 'Follow-up physiotherapy', 60],
  [4, 15, 'food', 'dbs_altitude', 'Sheng Siong groceries', 88.7],
  [4, 20, 'others', 'cash_wallet', 'Printing and stationery', 6.5],
  [4, 23, 'food', 'dbs_altitude', 'Meal prep supplies', 54.2],
  // 5 months ago: birthdays, a concert and nights out lifted food and entertainment.
  [5, 2, 'food', 'dbs_altitude', 'FairPrice groceries', 124.3],
  [5, 3, 'utilities', 'ocbc_360', 'SP Services electricity and water', 132.4],
  [5, 4, 'transport', 'dbs_savings', 'SimplyGo MRT and bus', 52.8],
  [5, 5, 'utilities', 'ocbc_360', 'Singtel mobile and fibre', 74.9],
  [5, 6, 'entertainment', 'dbs_altitude', 'Concert ticket', 248],
  [5, 7, 'entertainment', 'dbs_altitude', 'Netflix and Spotify', 29.96],
  [5, 8, 'shopping', 'dbs_altitude', 'Birthday gifts', 168],
  [5, 9, 'food', 'dbs_altitude', 'Birthday dinner', 286],
  [5, 13, 'food', 'grabpay', 'Hotpot with colleagues', 92.4],
  [5, 14, 'shopping', 'dbs_altitude', 'Zara outfit', 119.9],
  [5, 16, 'food', 'dbs_altitude', 'Drinks at Clarke Quay', 118],
  [5, 16, 'transport', 'grabpay', 'Late-night Grab rides', 87.3],
  [5, 20, 'entertainment', 'dbs_altitude', 'Karaoke night', 54],
  [5, 21, 'food', 'dbs_altitude', 'Sheng Siong groceries', 109.6],
  [5, 23, 'travel', 'dbs_altitude', 'Sentosa staycation', 320],
  // 6 months ago: a Bali getaway, with no entertainment spending at home.
  [6, 2, 'food', 'dbs_altitude', 'FairPrice groceries', 112.4],
  [6, 3, 'utilities', 'ocbc_360', 'SP Services electricity and water', 124.6],
  [6, 4, 'transport', 'dbs_savings', 'SimplyGo MRT and bus', 48.6],
  [6, 5, 'utilities', 'ocbc_360', 'Singtel mobile and fibre', 74.9],
  [6, 6, 'food', 'cash_wallet', 'Hawker lunches', 41.2],
  [6, 10, 'travel', 'dbs_altitude', 'Return flights to Bali', 410],
  [6, 12, 'health', 'dbs_altitude', 'Travel vaccinations', 95],
  [6, 14, 'shopping', 'dbs_altitude', 'Swimwear and sunscreen', 74.5],
  [6, 17, 'transport', 'grabpay', 'Grab to Changi Airport', 29.8],
  [6, 18, 'travel', 'dbs_altitude', 'Ubud villa', 560],
  [6, 18, 'others', 'cash_wallet', 'Visa on arrival fee', 49],
  [6, 19, 'food', 'dbs_altitude', 'Bali beach club dining', 138.7],
  [6, 20, 'transport', 'cash_wallet', 'Bali driver hire', 85],
  [6, 25, 'food', 'dbs_altitude', 'Sheng Siong groceries', 98.3],
  // 7 months ago: a laptop upgrade made shopping the main discretionary cost.
  [7, 3, 'food', 'dbs_altitude', 'FairPrice groceries', 131.7],
  [7, 3, 'utilities', 'ocbc_360', 'SP Services electricity and water', 119.3],
  [7, 5, 'utilities', 'ocbc_360', 'Singtel mobile and fibre', 74.9],
  [7, 5, 'transport', 'dbs_savings', 'SimplyGo MRT and bus', 55.1],
  [7, 7, 'entertainment', 'dbs_altitude', 'Netflix and Spotify', 29.96],
  [7, 8, 'food', 'cash_wallet', 'Hawker lunches', 48.9],
  [7, 11, 'shopping', 'dbs_altitude', 'MacBook Air', 1599],
  [7, 12, 'shopping', 'dbs_altitude', 'Laptop sleeve and adapter', 89],
  [7, 13, 'transport', 'grabpay', 'Grab rides', 36.4],
  [7, 17, 'food', 'dbs_altitude', 'Sheng Siong groceries', 117.2],
  [7, 19, 'entertainment', 'dbs_altitude', 'Nintendo Switch game', 69.9],
  [7, 22, 'food', 'dbs_altitude', 'Omakase dinner', 168],
  [7, 24, 'others', 'cash_wallet', 'Phone screen repair', 129],
  // 8 months ago: a family celebration drove food, gifts and red packets.
  [8, 2, 'food', 'dbs_altitude', 'FairPrice groceries', 146.2],
  [8, 3, 'utilities', 'ocbc_360', 'SP Services electricity and water', 127.8],
  [8, 4, 'transport', 'dbs_savings', 'SimplyGo MRT and bus', 49.7],
  [8, 5, 'utilities', 'ocbc_360', 'Singtel mobile and fibre', 74.9],
  [8, 8, 'shopping', 'dbs_altitude', 'New clothes for the celebration', 156],
  [8, 10, 'food', 'dbs_altitude', 'Festive goodies', 96.5],
  [8, 13, 'others', 'cash_wallet', 'Red packets for family', 680],
  [8, 14, 'food', 'dbs_altitude', 'Family reunion dinner', 388],
  [8, 15, 'transport', 'grabpay', 'Grab rides visiting relatives', 72.4],
  [8, 20, 'food', 'cash_wallet', 'Hawker lunches', 43.6],
  [8, 22, 'health', 'dbs_altitude', 'GP visit for flu', 42],
  // 9 months ago: a Melaka weekend and an annual health screening.
  [9, 3, 'food', 'dbs_altitude', 'FairPrice groceries', 119.8],
  [9, 3, 'utilities', 'ocbc_360', 'SP Services electricity and water', 121.5],
  [9, 5, 'utilities', 'ocbc_360', 'Singtel mobile and fibre', 74.9],
  [9, 5, 'transport', 'dbs_savings', 'SimplyGo MRT and bus', 47.2],
  [9, 7, 'entertainment', 'dbs_altitude', 'Netflix and Spotify', 29.96],
  [9, 7, 'food', 'cash_wallet', 'Hawker lunches', 39.9],
  [9, 12, 'entertainment', 'dbs_altitude', 'Bouldering gym pass', 38],
  [9, 17, 'transport', 'dbs_altitude', 'Coach to Melaka', 64],
  [9, 17, 'travel', 'dbs_altitude', 'Melaka hotel', 186],
  [9, 18, 'food', 'dbs_altitude', 'Melaka food trail', 84.6],
  [9, 21, 'health', 'dbs_altitude', 'Annual health screening', 158],
  [9, 24, 'food', 'dbs_altitude', 'Sheng Siong groceries', 102.4],
  // 10 months ago: online sales and a Taipei trip.
  [10, 2, 'food', 'dbs_altitude', 'FairPrice groceries', 128.9],
  [10, 3, 'utilities', 'ocbc_360', 'SP Services electricity and water', 116.2],
  [10, 4, 'transport', 'dbs_savings', 'SimplyGo MRT and bus', 51.3],
  [10, 5, 'utilities', 'ocbc_360', 'Singtel mobile and fibre', 74.9],
  [10, 6, 'food', 'cash_wallet', 'Hawker lunches', 46.1],
  [10, 9, 'travel', 'dbs_altitude', 'Return flights to Taipei', 368],
  [10, 11, 'shopping', 'dbs_altitude', 'Dyson cordless vacuum', 649],
  [10, 12, 'shopping', 'dbs_altitude', 'Lazada sale haul', 213.4],
  [10, 15, 'others', 'dbs_savings', 'Charity donation', 100],
  [10, 19, 'transport', 'grabpay', 'Grab rides', 33.7],
  [10, 20, 'travel', 'dbs_altitude', 'Taipei hotel', 412],
  [10, 21, 'food', 'dbs_altitude', 'Taipei night market', 72.8],
  [10, 27, 'food', 'dbs_altitude', 'Sheng Siong groceries', 94.7],
  // 11 months ago: a simple month with running gear and a comedy show.
  [11, 3, 'food', 'dbs_altitude', 'FairPrice groceries', 117.4],
  [11, 3, 'utilities', 'ocbc_360', 'SP Services electricity and water', 109.8],
  [11, 5, 'utilities', 'ocbc_360', 'Singtel mobile and fibre', 74.9],
  [11, 5, 'transport', 'dbs_savings', 'SimplyGo MRT and bus', 62.4],
  [11, 7, 'entertainment', 'dbs_altitude', 'Netflix and Spotify', 29.96],
  [11, 9, 'food', 'cash_wallet', 'Hawker lunches', 51.3],
  [11, 14, 'transport', 'grabpay', 'Grab rides', 24.6],
  [11, 16, 'shopping', 'dbs_altitude', 'Running shoes', 139],
  [11, 18, 'food', 'dbs_altitude', 'Sheng Siong groceries', 106.8],
  [11, 21, 'entertainment', 'dbs_altitude', 'Comedy show', 58],
  [11, 24, 'food', 'dbs_altitude', 'Team lunch', 42],
  // Income: monthly salary plus occasional bonuses, dividends, interest and a one-off sale.
  [0, 25, 'salary', 'dbs_savings', 'Monthly salary', 5200],
  [1, 25, 'salary', 'dbs_savings', 'Monthly salary', 5200],
  [2, 25, 'salary', 'dbs_savings', 'Monthly salary', 5200],
  [3, 25, 'salary', 'dbs_savings', 'Monthly salary', 5200],
  [4, 25, 'salary', 'dbs_savings', 'Monthly salary', 5200],
  [5, 25, 'salary', 'dbs_savings', 'Monthly salary', 5200],
  [6, 25, 'salary', 'dbs_savings', 'Monthly salary', 5200],
  [7, 25, 'salary', 'dbs_savings', 'Monthly salary', 5200],
  [8, 25, 'salary', 'dbs_savings', 'Monthly salary', 5200],
  [9, 25, 'salary', 'dbs_savings', 'Monthly salary', 5200],
  [10, 25, 'salary', 'dbs_savings', 'Monthly salary', 5200],
  [11, 25, 'salary', 'dbs_savings', 'Monthly salary', 5200],
  [3, 14, 'bonus', 'dbs_savings', 'Performance bonus', 1500],
  [8, 24, 'bonus', 'dbs_savings', 'Annual wage supplement', 5200],
  [1, 24, 'dividends', 'dbs_savings', 'Quarterly ETF distribution', 148.3],
  [4, 24, 'dividends', 'dbs_savings', 'Quarterly ETF distribution', 131.6],
  [7, 24, 'dividends', 'dbs_savings', 'Quarterly ETF distribution', 139.2],
  [10, 24, 'dividends', 'dbs_savings', 'Quarterly ETF distribution', 124.75],
  [2, 27, 'interest', 'dbs_savings', 'Savings account interest', 18.4],
  [5, 27, 'interest', 'dbs_savings', 'Savings account interest', 21.15],
  [6, 12, 'otherIncome', 'dbs_savings', 'Carousell sale of old monitor', 120],
];

/**
 * Date a seed relative to today. Past months keep their day of month; current-month rows are
 * spread across the days elapsed so far, so this month is always populated and never in the future.
 */
function seedDate(todayKey: string, months: number, day: number) {
  if (months > 0) return monthsAgo(todayKey, months, day);
  const today = Number(todayKey.slice(8, 10));
  return monthsAgo(todayKey, 0, 1 + Math.floor(((day - 1) * (today - 1)) / 30));
}

/** Build the demo ledger dated relative to the given day (defaults to today). */
export function createDemoTransactions(todayKey = getDeviceDateKey()): Transaction[] {
  return demoTransactionSeeds.map(([months, day, categoryKey, accountId, description, amount], index) => ({
    id: `00000000-0000-4000-9000-${String(2000 + index).padStart(12, '0')}`,
    userId: demoUserId,
    categoryId: demoCategoryIds[categoryKey],
    accountId,
    description,
    amount: amount.toFixed(2),
    date: seedDate(todayKey, months, day),
    transactionType: incomeCategoryKeys.includes(categoryKey) ? 'income' : 'expense',
    createdAt: demoTimestamp,
    updatedAt: demoTimestamp,
    tagIds: [],
  }));
}
