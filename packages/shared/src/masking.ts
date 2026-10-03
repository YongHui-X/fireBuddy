import type { RagChatMessage } from './types';

/**
 * Client-side twin of `apps/backend/services/ember_masking.py`.
 *
 * A device that keeps the records computes the user's snapshot itself, replaces every figure
 * and user-entered name with a placeholder token plus a coarse band, sends only that, and puts
 * the real values back into the answer. Token kinds: M money, R rate, N months, C custom
 * category, P account or position name, Q an amount typed in the question. Keep the key sets
 * and bands in step with the Python module; the backend prompt describes them to the model.
 */

export const TOKEN_RE = /\{\{\s*([MRNCPQ]\d+)\s*\}\}/g;
const TOKEN_WITH_BAND_RE = /\{\{\s*([MRNCPQ]\d+)\s*\}\}(?:\s*\((?:range|approx\.?|about)[^)]*\))?/g;
export const UNAVAILABLE_FIGURE = '[figure unavailable]';
/** Masked JSON is longer than the raw block because of band text; the backend enforces the same cap. */
export const MAX_MASKED_CONTEXT_CHARS = 3600;

const MONEY_KEYS = new Set([
  'netWorth', 'liabilityTotal', 'monthlyDebtService', 'investableAssets', 'averageMonthlyEssentialSpending',
  'income', 'spending', 'savingsAmount', 'investedAmount', 'debtService', 'fiTarget', 'requiredMonthlyInvestment',
  'total', 'amount', 'difference', 'currentInvestableAssets', 'projectedPortfolio', 'fundingGap', 'targetToday',
  'portfolioToday', 'monthlySpending', 'monthlyContribution', 'cpfMonthlyPayout', 'balance', 'expenseTotal',
  'annualisedSpending', 'emergencyFundTarget3Months', 'emergencyFundTarget6Months', 'totalMonthlyDebtService',
  'monthlyPayment', 'originalPrincipal',
]);
const RATIO_KEYS = new Set(['savingsRate', 'progressRate', 'progressRateCapped', 'beforeReturn', 'afterReturn', 'inflation', 'interestRate', 'debtToIncome', 'highestInterestRate']);
const PERCENT_KEYS = new Set(['changePercent']);
const MONTH_KEYS = new Set(['emergencyRunwayMonths', 'emergencyRunwayMonthsWithDebt', 'estimatedMonths', 'monthsRemaining']);
const CATEGORY_KEYS = new Set(['category']);
const TEXT_KEYS = new Set(['title', 'rationale', 'evidence', 'explanation', 'message', 'limitations']);
const PASSTHROUGH_KEYS = new Set([
  'effectiveDate', 'snapshotStatus', 'period', 'start', 'end', 'month', 'fundingStatus', 'status', 'completeness',
  'savingsRateStatus', 'warningCodes', 'code', 'kind', 'label', 'destination', 'ruleId', 'actionType',
  'calculationVersion', 'estimatedFiYear', 'earliestRetirementMonth', 'retirementMonth', 'endAge', 'cpfStartAge',
  'cpfPlan', 'provenance', 'recordCount', 'completedMonths', 'evidencePeriod', 'startDate', 'endDate', 'figure',
  'year', 'value', 'unit', 'availableYears', 'sourceTitle', 'payoffMonth',
]);
const NUMERIC_RE = /^-?\d+(?:\.\d+)?$/;

const CURRENCY_RE = /(?:S\$|SGD\s?|\$)\s?-?\d[\d,]*(?:\.\d+)?(?:\s?[kKmM]\b)?/g;
const THOUSANDS_RE = /(?<![\d{\w])\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\d%\w])/g;
const BARE_NUMBER_RE = /(?<![\d{\w/.-])\d{4,}(?:\.\d+)?(?![\d%\w/.-])/g;
const PERCENT_IN_TEXT_RE = /(?<![\w{])-?\d+(?:\.\d+)?\s?%/g;
const AMOUNT_IN_TEXT_RE = /S\$\s?-?\d[\d,]*(?:\.\d+)?/g;

const NAME_STOPLIST = new Set(['cash', 'bank', 'savings', 'cpf', 'investments', 'loan', 'mortgage', 'others', 'other', 'home', 'car', 'salary']);
const MIN_NAME_LENGTH = 4;

export interface MaskingNames {
  accounts?: readonly string[];
  positions?: readonly string[];
  customCategories?: readonly string[];
}

function isYear(text: string) {
  return /^\d{4}$/.test(text) && Number(text) >= 1900 && Number(text) <= 2100;
}

export function moneyBand(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude === 0) return 'zero';
  const edges: Array<[number, string]> = [
    [1000, 'under 1k'], [5000, '1k-5k'], [10000, '5k-10k'], [25000, '10k-25k'], [50000, '25k-50k'],
    [100000, '50k-100k'], [250000, '100k-250k'], [500000, '250k-500k'], [1000000, '500k-1M'],
  ];
  let band = 'over 1M';
  for (const [edge, label] of edges) {
    if (magnitude < edge) {
      band = label;
      break;
    }
  }
  return value < 0 ? `negative, ${band}` : band;
}

export function percentBand(percent: number): string {
  const low = Math.floor(percent / 10) * 10;
  if (percent < 0) return `${low} to ${low + 10}%`;
  if (percent > 100) return 'over 100%';
  const floor = low === 100 ? 90 : low;
  return `${floor}-${floor + 10}%`;
}

export function monthsBand(months: number): string {
  if (months < 1) return '0-1 months';
  if (months < 3) return '1-3 months';
  if (months < 6) return '3-6 months';
  if (months < 12) return '6-12 months';
  return 'over 12 months';
}

export function formatMaskedMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}S$${Math.abs(value).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Token map for one request. Deterministic: the same value always gets the same token. */
export class MaskingSession {
  private readonly tokens = new Map<string, string>();
  private readonly values = new Map<string, string>();
  private readonly counters = new Map<string, number>();
  private readonly categoryNames = new Map<string, string>();
  private readonly namePatterns: Array<{ pattern: RegExp; kind: 'P' | 'C'; real: string }> = [];

  constructor(names: MaskingNames = {}) {
    for (const name of names.customCategories ?? []) this.categoryNames.set(name.toLowerCase(), name);
    const protectedNames: Array<[string, 'P' | 'C']> = [
      ...[...(names.accounts ?? []), ...(names.positions ?? [])].map((name): [string, 'P' | 'C'] => [name, 'P']),
      ...(names.customCategories ?? []).map((name): [string, 'P' | 'C'] => [name, 'C']),
    ];
    for (const [name, kind] of protectedNames.sort((left, right) => right[0].length - left[0].length)) {
      const cleaned = name.trim();
      if (cleaned.length < MIN_NAME_LENGTH || NAME_STOPLIST.has(cleaned.toLowerCase())) continue;
      this.namePatterns.push({ pattern: new RegExp(`(?<!\\w)${escapeRegExp(cleaned)}(?!\\w)`, 'gi'), kind, real: cleaned });
    }
  }

  tokenFor(kind: string, value: string): string {
    const key = `${kind}\u0000${value}`;
    const existing = this.tokens.get(key);
    if (existing) return existing;
    const count = (this.counters.get(kind) ?? 0) + 1;
    this.counters.set(kind, count);
    const token = `{{${kind}${count}}}`;
    this.tokens.set(key, token);
    this.values.set(`${kind}${count}`, value);
    return token;
  }

  private moneyToken(raw: string) {
    const value = Number(raw);
    if (!Number.isFinite(value)) return this.maskText(raw);
    return `${this.tokenFor('M', formatMaskedMoney(value))} (range: ${moneyBand(value)})`;
  }

  private ratioToken(raw: string) {
    const value = Number(raw);
    if (!Number.isFinite(value)) return this.maskText(raw);
    const percent = value * 100;
    return `${this.tokenFor('R', `${percent.toFixed(1)}%`)} (range: ${percentBand(percent)})`;
  }

  private percentToken(raw: string) {
    const value = Number(raw);
    if (!Number.isFinite(value)) return this.maskText(raw);
    return `${this.tokenFor('R', `${value.toFixed(1)}%`)} (range: ${percentBand(value)})`;
  }

  private monthsToken(raw: string) {
    const value = Number(raw);
    if (!Number.isFinite(value)) return this.maskText(raw);
    return `${this.tokenFor('N', `${value.toFixed(1)} months`)} (range: ${monthsBand(value)})`;
  }

  private categoryToken(raw: string) {
    const real = this.categoryNames.get(raw.toLowerCase());
    return real ? this.tokenFor('C', real) : raw;
  }

  /** Masked copy of a facts block. Unknown numeric strings are masked as money (fail closed). */
  maskFacts<T>(facts: T): T {
    return this.maskValue(null, facts) as T;
  }

  private maskValue(key: string | null, value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.maskValue(key, item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([child, item]) => [child, this.maskValue(child, item)]));
    }
    if (typeof value !== 'string') return value;
    if (key !== null && PASSTHROUGH_KEYS.has(key)) return value;
    if (key !== null && MONEY_KEYS.has(key)) return this.moneyToken(value);
    if (key !== null && RATIO_KEYS.has(key)) return this.ratioToken(value);
    if (key !== null && PERCENT_KEYS.has(key)) return this.percentToken(value);
    if (key !== null && MONTH_KEYS.has(key)) return this.monthsToken(value);
    if (key !== null && CATEGORY_KEYS.has(key)) return this.categoryToken(value);
    if (key !== null && TEXT_KEYS.has(key)) return this.maskText(value);
    if (NUMERIC_RE.test(value)) return this.moneyToken(value);
    return this.maskText(value);
  }

  /** Mask S$ amounts, percentages and registered names inside a sentence. */
  maskText(text: string): string {
    if (!text) return text;
    let masked = text.replace(AMOUNT_IN_TEXT_RE, (match) => {
      const value = Number(match.replace('S$', '').replace(/,/g, '').trim());
      return Number.isFinite(value) ? `${this.tokenFor('M', formatMaskedMoney(value))} (range: ${moneyBand(value)})` : match;
    });
    masked = masked.replace(PERCENT_IN_TEXT_RE, (match) => {
      const value = Number(match.replace('%', '').trim());
      return Number.isFinite(value) ? `${this.tokenFor('R', `${value}%`)} (range: ${percentBand(value)})` : match;
    });
    return this.maskNames(masked);
  }

  private maskNames(text: string) {
    let out = text;
    for (const { pattern, kind, real } of this.namePatterns) {
      out = out.replace(pattern, () => this.tokenFor(kind, real));
    }
    return out;
  }

  /** Replace amounts and the user's own names in typed text; keep years, dates, percentages and default categories. */
  scrubQuestion(text: string): string {
    if (!text) return text;
    const quantity = (match: string) => (isYear(match) ? match : this.tokenFor('Q', match));
    let scrubbed = text.replace(CURRENCY_RE, quantity);
    scrubbed = scrubbed.replace(THOUSANDS_RE, quantity);
    scrubbed = scrubbed.replace(BARE_NUMBER_RE, quantity);
    return this.maskNames(scrubbed);
  }

  scrubHistory(history: readonly RagChatMessage[]): RagChatMessage[] {
    return history.map((message) => ({ ...message, content: this.scrubQuestion(message.content) }));
  }

  /** Put the real values back. A token the session never issued becomes a neutral marker. */
  unmask(text: string | null | undefined): string {
    if (!text) return '';
    return text.replace(TOKEN_WITH_BAND_RE, (_match, id: string) => this.values.get(id) ?? UNAVAILABLE_FIGURE);
  }
}
