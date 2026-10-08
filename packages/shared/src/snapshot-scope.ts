/**
 * Data minimisation for the device-built DouDou snapshot: the phone reads the (already scrubbed)
 * question and keeps only the snapshot sections it needs. A general question gets no figures at
 * all, and an unclear one is treated as general. Run this before `MaskingSession.maskFacts` so
 * unneeded figures are never even tokenised.
 */

export type SnapshotSection = 'spending' | 'cashflow' | 'netWorth' | 'emergency' | 'fire';

export const SNAPSHOT_SECTIONS: readonly SnapshotSection[] = ['spending', 'cashflow', 'netWorth', 'emergency', 'fire'];

/** Top-level `PersonalSnapshot.facts` keys each section carries. */
export const SNAPSHOT_SECTION_KEYS: Record<SnapshotSection, readonly string[]> = {
  spending: ['spending'],
  cashflow: ['monthlyPulse'],
  netWorth: ['netWorth', 'liabilityTotal', 'assetTotal', 'investableAssets', 'monthlyDebtService', 'debtToIncome'],
  emergency: ['emergencyRunwayMonths', 'averageMonthlyEssentialSpending', 'derived'],
  fire: ['fire', 'warningCodes'],
};

/** Plain words for the "Used:" note under an answer. */
export const SNAPSHOT_SECTION_LABELS: Record<SnapshotSection, string> = {
  spending: 'spending totals',
  cashflow: 'income and savings',
  netWorth: 'net worth',
  emergency: 'emergency fund',
  fire: 'FIRE plan',
};

/** Always kept with any section so the model knows how fresh the figures are. */
const CONTEXT_KEYS = ['effectiveDate', 'snapshotStatus'] as const;

/** The question must be about the person, not Singapore rules in general. */
// "this month's spending" is about the user's own records even without "my".
const PERSONAL_CUE = /\b(i|i'm|im|i've|ive|me|my|mine|myself|we|we're|our|us|this month'?s?|last month'?s?)\b/i;

const SECTION_PATTERNS: Record<SnapshotSection, RegExp> = {
  spending: /\b(spen[dt]\w*|expens\w*|budget\w*|categor\w*|food|dining|groceries|transport|shopping|bills?|overspend\w*)\b/i,
  cashflow: /\b(sav(e|es|ed|ing|ings)|income|earn\w*|salary|cash ?flow|afford\w*|left over)\b/i,
  netWorth: /\b(net ?worth|worth|assets?|wealth|liabilit\w*|debts?|loans?|mortgage|invest\w*|portfolio|afford\w*)\b/i,
  emergency: /\b(emergency|rainy day|runway|buffer|safety net|job loss|lose my job)\b/i,
  fire: /\b(fire|fi|retire\w*|financial(ly)? independen\w*|coast|drawdown|cpf life)\b/i,
};

/** Product names that contain section words but are general topics, e.g. "Savings Bonds". */
const PRODUCT_NAMES = /\b((singapore )?savings bonds?|ssbs?|savings accounts?|t-?bills?|cpf (special|ordinary|medisave) account)\b/gi;

/** Sections a question needs, in a stable order. Empty means send no figures. */
export function selectSnapshotSections(question: string): SnapshotSection[] {
  const text = question.replace(/[’']/g, "'").replace(PRODUCT_NAMES, ' ');
  if (!PERSONAL_CUE.test(text)) return [];
  return SNAPSHOT_SECTIONS.filter((section) => SECTION_PATTERNS[section].test(text));
}

/** A short continuation that opens like "And last month?" or "What about transport?". */
const FOLLOW_UP_CUE = /^\s*(and|also|what about|how about|same|compared?( with| to)?|vs\.?|versus|then|ok(ay)?,?)\b/i;
/** Words that point back at the conversation: "Which category is largest?", "And the month before?". */
const REFERENCE_CUE = /\b(it|that|those|these|them|largest|biggest|smallest|highest|lowest|(the )?month before|last month|previous month|this month)\b/i;
const MAX_FOLLOW_UP_WORDS = 8;
/** How many earlier user turns a follow-up may look back through for a topic. */
const MAX_TURNS_BACK = 3;

/**
 * Sections for one turn of a conversation. A question with its own topic uses that. A short
 * follow-up with none ("And last month?", "Which category is largest?") reuses the topics of the
 * most recent of the user's last few questions that had one, so it gets the same figures instead
 * of a refusal. A short general question ("What is SRS?") matches neither cue and sends nothing.
 * Pass the already scrubbed question and history.
 */
export function selectSnapshotSectionsForTurn(question: string, history: readonly { role: string; content: string }[]): SnapshotSection[] {
  const own = selectSnapshotSections(question);
  if (own.length > 0) return own;
  const words = question.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0 || words > MAX_FOLLOW_UP_WORDS) return own;
  if (!FOLLOW_UP_CUE.test(question) && !REFERENCE_CUE.test(question)) return own;
  const earlier = history.filter((message) => message.role === 'user').slice(-MAX_TURNS_BACK).reverse();
  for (const message of earlier) {
    const sections = selectSnapshotSections(message.content);
    if (sections.length > 0) return sections;
  }
  return [];
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_NAME = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b(?:\s+(20\d\d))?/gi;
/** At most this many extra months go with one question, keeping the masked block small. */
const MAX_EXTRA_MONTHS = 3;

/**
 * Months a spending question names beyond this month and last month, as YYYY-MM keys, so
 * "How much did I spend in July?" gets July's figures. A month without a year means the most
 * recent one on or before `todayKey`. "May" counts only next to a spending word, since it is
 * also a common verb.
 */
export function requestedSpendingMonths(question: string, todayKey: string): string[] {
  const currentKey = todayKey.slice(0, 7);
  const [year, month] = currentKey.split('-').map(Number);
  const previousKey = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  const found: string[] = [];
  for (const match of question.matchAll(MONTH_NAME)) {
    const word = match[1].toLowerCase();
    if (word === 'may' && !/\b(in|during|for|of|since)\s+may\b/i.test(question)) continue;
    const index = MONTHS.indexOf(word.slice(0, 3)) + 1;
    const explicitYear = match[2] ? Number(match[2]) : null;
    const keyYear = explicitYear ?? (index <= month ? year : year - 1);
    const key = `${keyYear}-${String(index).padStart(2, '0')}`;
    if (key > currentKey || key === currentKey || key === previousKey || found.includes(key)) continue;
    found.push(key);
  }
  return found.slice(0, MAX_EXTRA_MONTHS);
}

/** Keep only the chosen sections plus the freshness keys; null when nothing is chosen. */
export function scopeSnapshotFacts(facts: Record<string, unknown>, sections: readonly SnapshotSection[]): Record<string, unknown> | null {
  if (sections.length === 0) return null;
  const keep = new Set<string>(CONTEXT_KEYS);
  for (const section of sections) for (const key of SNAPSHOT_SECTION_KEYS[section]) keep.add(key);
  const scoped: Record<string, unknown> = {};
  for (const key of Object.keys(facts)) if (keep.has(key)) scoped[key] = facts[key];
  return scoped;
}

/** What the phone has on record, checked before DouDou answers a question about the user's own figures. */
export interface RecordPresence {
  expenses: boolean;
  /** Any income or expense at all. */
  transactions: boolean;
  /** Any wealth position (savings, investments, property or debts). */
  wealth: boolean;
  firePlan: boolean;
  /** Any expense category with a monthly budget above zero. */
  budgets: boolean;
}

export type MissingRecord = 'expenses' | 'transactions' | 'wealth' | 'firePlan' | 'budgets';

/** The record each section is built from; a section with nothing behind it has nothing true to say. */
const SECTION_NEEDS: Record<SnapshotSection, Exclude<MissingRecord, 'budgets'>> = {
  spending: 'expenses',
  cashflow: 'transactions',
  netWorth: 'wealth',
  emergency: 'wealth',
  fire: 'firePlan',
};

const BUDGET_CUE = /\bbudget\w*\b/i;

/**
 * Which records a personal question needs but the phone does not have, in a stable order, so
 * DouDou can say "you don't have any recorded expenses yet" instead of reading zeros as facts.
 * Pass the sections chosen for the turn and the scrubbed question.
 */
export function findMissingRecords(sections: readonly SnapshotSection[], question: string, presence: RecordPresence): MissingRecord[] {
  const missing = new Set<MissingRecord>();
  for (const section of sections) {
    const need = SECTION_NEEDS[section];
    if (!presence[need]) missing.add(need);
  }
  if (sections.includes('spending') && BUDGET_CUE.test(question) && !presence.budgets) missing.add('budgets');
  // No transactions at all says the same as no expenses; keep the broader one.
  if (missing.has('transactions')) missing.delete('expenses');
  return (['transactions', 'expenses', 'budgets', 'wealth', 'firePlan'] as const).filter((item) => missing.has(item));
}

/** Sections that still have records behind them, so empty ones are never sent. */
export function sectionsWithRecords(sections: readonly SnapshotSection[], presence: RecordPresence): SnapshotSection[] {
  return sections.filter((section) => presence[SECTION_NEEDS[section]]);
}

const MISSING_RECORD_COPY: Record<MissingRecord, string> = {
  transactions: "You don't have any recorded transactions yet. Tap + on Home to add your first one.",
  expenses: "You don't have any recorded expenses yet. Tap + on Home to add one.",
  budgets: "You haven't set any budgets yet. Add one to a category in Budgets.",
  wealth: "You don't have any recorded savings, investments or debts yet. Add them in Wealth.",
  firePlan: "You haven't set up a FIRE plan yet. Open FIRE Planner to make one.",
};

/**
 * DouDou's own words for missing records, written on the phone with no network call. `partial`
 * is for an answer that still used the records the phone does have.
 */
export function describeMissingRecords(missing: readonly MissingRecord[], partial = false): string {
  const lines = missing.map((item) => MISSING_RECORD_COPY[item]);
  if (partial) return lines.join(' ');
  return [...lines, "Once they're added, ask me again and I'll take them into account."].join(' ');
}
