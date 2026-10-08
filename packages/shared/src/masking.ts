import { CURRENCIES, currencyDigits, formatMoney } from './region';
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
  'monthlyPayment', 'originalPrincipal', 'assetTotal', 'gapFromTodayAssets', 'lastMonthAmount',
]);
const RATIO_KEYS = new Set(['savingsRate', 'progressRate', 'progressRateCapped', 'projectedShareOfTargetAtRetirement', 'progressToday', 'share', 'beforeReturn', 'afterReturn', 'inflation', 'interestRate', 'debtToIncome', 'highestInterestRate']);
const PERCENT_KEYS = new Set(['changePercent']);
const MONTH_KEYS = new Set(['emergencyRunwayMonths', 'emergencyRunwayMonthsWithDebt', 'estimatedMonths', 'monthsRemaining']);
const CATEGORY_KEYS = new Set(['category']);
const TEXT_KEYS = new Set(['title', 'rationale', 'evidence', 'explanation', 'message', 'limitations']);
const PASSTHROUGH_KEYS = new Set([
  'effectiveDate', 'snapshotStatus', 'period', 'start', 'end', 'month', 'fundingStatus', 'status', 'completeness',
  'savingsRateStatus', 'warningCodes', 'code', 'kind', 'label', 'destination', 'ruleId', 'actionType',
  'calculationVersion', 'estimatedFiYear', 'earliestRetirementMonth', 'retirementMonth', 'endAge', 'cpfStartAge',
  'cpfPlan', 'provenance', 'recordCount', 'completedMonths', 'evidencePeriod', 'startDate', 'endDate', 'figure',
  'year', 'value', 'unit', 'availableYears', 'sourceTitle', 'payoffMonth', 'direction',
]);
const NUMERIC_RE = /^-?\d+(?:\.\d+)?$/;

/**
 * Money prefixes the user might type or the snapshot might hold, Singapore's and the general
 * mode's currencies alike, so an amount is scrubbed whichever currency it is written in.
 */
const MONEY_PREFIX = String.raw`(?:S\$|US\$|A\$|C\$|NZ\$|HK\$|NT\$|B\$|MX\$|R\$|CN¥|(?:${CURRENCIES.join('|')})\s?|RM\s?|Rp\s?|€|£|¥|₹|₩|₱|฿|₫|\$)`;
const CURRENCY_RE = new RegExp(String.raw`${MONEY_PREFIX}\s?-?\d[\d,]*(?:\.\d+)?(?:\s?[kKmM]\b)?`, 'g');
const THOUSANDS_RE = /(?<![\d{\w])\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\d%\w])/g;
const BARE_NUMBER_RE = /(?<![\d{\w/.-])\d{4,}(?:\.\d+)?(?![\d%\w/.-])/g;
const PERCENT_IN_TEXT_RE = /(?<![\w{])-?\d+(?:\.\d+)?\s?%/g;
const AMOUNT_IN_TEXT_RE = new RegExp(String.raw`${MONEY_PREFIX}\s?-?\d[\d,]*(?:\.\d+)?`, 'g');
const MONEY_PREFIX_RE = new RegExp(`^${MONEY_PREFIX}`);

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

/**
 * "S$1,240.71", or "S$1,241" with `decimals` 0 to match screens that show whole dollars. Other
 * currencies use their own prefix ("€1,240.71"), and zero-decimal ones never show cents ("¥1,241").
 */
export function formatMaskedMoney(value: number, decimals: 0 | 2 = 2, currency = 'SGD'): string {
  const places = currencyDigits(currency, decimals);
  const rounded = places === 0 ? Math.round(Math.abs(value)) : Math.abs(value);
  const sign = value < 0 && rounded !== 0 ? '-' : '';
  return `${sign}${formatMoney(rounded, currency, places)}`;
}

/**
 * A band the model wrote away from its token, e.g. "{{M1}} this month (range: 1k-5k)". Bands are
 * for the model only, so any left after the tokens are put back are removed.
 */
const STRAY_BAND_RE = /\s*\(range:[^)]*\)/gi;
/** A money band label as the model may write it: "50k-100k", "50k–100k", "1k to 5k". */
const MONEY_BAND = String.raw`(?:under 1k|over 1M|\d+k\s*(?:-|–|—|to)\s*\d+(?:k|M))`;
/** "which falls", "and this is", or nothing, in front of a band clause. */
const BAND_LEAD = String.raw`,?\s*(?:(?:which|and|this|that|it)\s+)*`;
/** A money band label copied on its own after a figure: "S$517 (under 1k)", "(1k-5k)". */
const STRAY_MONEY_BAND_RE = new RegExp(String.raw`\s*\(${MONEY_BAND}\)`, 'gi');
/**
 * A clause that restates a money band: "which falls within the range of 50k-100k". Only the
 * clause goes, so "Your net worth is S$80,000, which falls within the range of 50k-100k." keeps
 * its figure. Percent and month bands are left alone: "3-6 months" is also real guidance text.
 */
const BAND_CLAUSE_RE = new RegExp(String.raw`${BAND_LEAD}(?:falls|sits|lies|is)?\s*(?:with)?in\s+(?:the\s+|a\s+)?range\s+of\s+${MONEY_BAND}`, 'gi');
/** The same clause worded as a bracket: ", which is in the 50k-100k bracket". */
const BRACKET_CLAUSE_RE = new RegExp(String.raw`${BAND_LEAD}(?:falls|sits|lies|is)?\s*(?:with)?in\s+the\s+${MONEY_BAND}\s+(?:bracket|band|range)`, 'gi');
/**
 * The same clause worded with "between": ", which falls between 50k and 100k". It needs a verb,
 * so advice such as "aim for between 50k and 100k" is left alone.
 */
const BETWEEN_CLAUSE_RE = new RegExp(String.raw`${BAND_LEAD}(?:falls|sits|lies|is)\s+(?:somewhere\s+)?between\s+\d+k\s+and\s+\d+(?:k|M)`, 'gi');
/**
 * The same leak for a percent band, but only straight after "which is …": ", which is in the
 * range of 90-100%". Guidance such as "savings rates of 50–70%" has no such lead-in and stays.
 */
const PERCENT_BAND_CLAUSE_RE = /,?\s*which\s+(?:is|falls|sits)\s+(?:with)?in\s+(?:the\s+)?range\s+of\s+\d+\s*-\s*\d+%/gi;
/** A months band after "which is": "17.1 months, which is over 12 months" or "…in the 6-12 months range". */
const MONTHS_BAND_CLAUSE_RE = /,?\s*which\s+is\s+(?:over 12 months|(?:with)?in\s+the\s+(?:range\s+of\s+)?(?:0-1|1-3|3-6|6-12) months(?:\s+range)?)/gi;
/** Placeholder-speak the model sometimes keeps: "Your income is represented by S$5,200." */
const REPRESENTED_BY_RE = /\b(?:is\s+)?represented\s+by\s+(?:the\s+)?(?:placeholder\s+|[a-z]+[A-Z][A-Za-z]*\s+(?:ratio\s+|figure\s+|value\s+)?(?:of\s+)?)?(?=S\$|\$|\d)/g;
/** The range wording inside a sentence that also holds a real figure: "… and the range is 50k-100k". */
const BAND_PHRASE_RE = new RegExp(String.raw`,?\s*(?:(?:and|with|but)\s+)?(?:(?:the|a|its|your)\s+)?range\s+(?:is|of|being)?\s*${MONEY_BAND}`, 'gi');
const REAL_FIGURE_RE = /S\$\s?\d|\d(?:\.\d+)?%|\d(?:\.\d+)? months/;

/**
 * A sentence that mentions a money band. If it also states a real figure ("Your net worth is
 * S$75,000 and the range is 50k-100k."), only the range wording goes; a sentence that is nothing
 * but the range ("The range for your net worth is 50k-100k.") goes entirely.
 */
function stripBandSentence(sentence: string) {
  return REAL_FIGURE_RE.test(sentence) ? sentence.replace(BAND_PHRASE_RE, '') : '';
}

/** A short sentence that only restates a money band: "The range for your net worth is 50k-100k." */
const BAND_SENTENCE_RE = new RegExp(String.raw`[^.\n]*\brange\b[^.\n]{0,40}\b${MONEY_BAND}\b[^.\n]*\.?`, 'gi');
/** A months or percent band right after its own figure: "17.1 months (over 12 months)", "77.4% (70-80%)". */
const FIGURE_BAND_RE = /(\d(?:\.\d+)? months|\d(?:\.\d+)?%)\s*\((?:0-1 months|1-3 months|3-6 months|6-12 months|over 12 months|\d+-\d+%|over 100%)\)/gi;
/** A bullet left empty once its band clause is gone, e.g. "- ." */
const EMPTY_BULLET_RE = /^[ \t]*-[ \t]*(?:(?:this|that|it)(?:[ \t]+(?:total|figure|amount|value|number))?)?[ \t]*[.,;:]?[ \t]*(?:\r?\n|$)/gim;

export interface MaskingOptions {
  /** Show money as whole dollars when the real values are put back, like the app's own screens. */
  wholeDollars?: boolean;
  /** ISO currency the restored figures are written in; SGD when unset. */
  currency?: string;
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
  private readonly moneyDecimals: 0 | 2;
  private readonly currency: string;

  constructor(names: MaskingNames = {}, options: MaskingOptions = {}) {
    this.moneyDecimals = options.wholeDollars ? 0 : 2;
    this.currency = options.currency ?? 'SGD';
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
    return `${this.tokenFor('M', formatMaskedMoney(value, this.moneyDecimals, this.currency))} (range: ${moneyBand(value)})`;
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

  /** Mask money amounts (any listed currency), percentages and registered names inside a sentence. */
  maskText(text: string): string {
    if (!text) return text;
    let masked = text.replace(AMOUNT_IN_TEXT_RE, (match) => {
      const value = Number(match.replace(MONEY_PREFIX_RE, '').replace(/,/g, '').trim());
      return Number.isFinite(value) ? `${this.tokenFor('M', formatMaskedMoney(value, this.moneyDecimals, this.currency))} (range: ${moneyBand(value)})` : match;
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

  /**
   * Unmask an answer that is still streaming in. A placeholder or its "(range: …)" band can be
   * split across chunks ("{{M" … "1}} (ran" … "ge: 1k-5k)"), so the unfinished tail is held back
   * until it closes; the rest is unmasked as usual. Call `unmask` on the full text at the end.
   */
  unmaskPartial(text: string): string {
    let safe = text;
    const openToken = safe.lastIndexOf('{{');
    if (openToken >= 0 && safe.indexOf('}}', openToken) < 0) safe = safe.slice(0, openToken);
    const openBracket = safe.lastIndexOf('(');
    if (openBracket >= 0 && safe.indexOf(')', openBracket) < 0) safe = safe.slice(0, openBracket);
    return this.unmask(safe);
  }

  /**
   * Put the real values back. A token the session never issued becomes a neutral marker, and any
   * "(range: …)" band the model left elsewhere in the sentence is removed.
   */
  unmask(text: string | null | undefined): string {
    if (!text) return '';
    return text
      .replace(TOKEN_WITH_BAND_RE, (_match, id: string) => this.values.get(id) ?? UNAVAILABLE_FIGURE)
      .replace(STRAY_BAND_RE, '')
      .replace(STRAY_MONEY_BAND_RE, '')
      .replace(BAND_CLAUSE_RE, '')
      .replace(BRACKET_CLAUSE_RE, '')
      .replace(BETWEEN_CLAUSE_RE, '')
      .replace(PERCENT_BAND_CLAUSE_RE, '')
      .replace(MONTHS_BAND_CLAUSE_RE, '')
      .replace(REPRESENTED_BY_RE, 'is ')
      .replace(BAND_SENTENCE_RE, stripBandSentence)
      .replace(FIGURE_BAND_RE, '$1')
      .replace(EMPTY_BULLET_RE, '')
      // A months value already ends in "months"; the model often writes "{{N1}} months" as well.
      .replace(/(\d months) months\b/g, '$1');
  }

  /** `unmask` for a finished answer: also drops the trailing spaces and blank tail the clean-ups can leave. */
  unmaskFinal(text: string | null | undefined): string {
    return this.unmask(text).replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
  }
}
