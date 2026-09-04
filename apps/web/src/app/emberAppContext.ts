import type { RagAppAction, RagAppActionType, RagAppContext } from '@firebuddy/shared';

const MAX_SESSION_ACTIONS = 10;
const listeners = new Set<() => void>();
let sessionActions: RagAppAction[] = [];

const pageLabels: Array<[prefix: string, label: string]> = [
  ['/transactions', 'Transactions'],
  ['/categories', 'Categories'],
  ['/accounts', 'Accounts'],
  ['/insights', 'Insights'],
  ['/wealth', 'Wealth'],
  ['/fire', 'FIRE setup'],
  ['/plan', 'Spending Plan'],
  ['/goals', 'Life Goals'],
  ['/add', 'Add transaction'],
  ['/profile', 'Profile'],
  ['/ember', 'Ember'],
];

/** Record a generic successful action without retaining record values or identifiers. */
export function recordEmberAppAction(
  type: RagAppActionType,
  label: string,
  occurredAt = new Date(),
): void {
  sessionActions = [
    ...sessionActions,
    { type, label: label.replace(/\s+/g, ' ').trim().slice(0, 80), occurredAt: occurredAt.toISOString() },
  ].slice(-MAX_SESSION_ACTIONS);
  listeners.forEach((listener) => listener());
}

/** Clear activity metadata when the authenticated session ends. */
export function clearEmberAppActions(): void {
  sessionActions = [];
  listeners.forEach((listener) => listener());
}

export function getRecentEmberAppActions(limit = 5): RagAppAction[] {
  return sessionActions.slice(-Math.max(0, limit));
}

export function subscribeToEmberAppActions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Translate a known route into bounded context safe to disclose to Ember. */
export function getEmberPageContext(pathname: string): Pick<RagAppContext, 'currentPage' | 'currentPath'> {
  const normalizedPath = pathname.startsWith('/') ? pathname : '/';
  const currentPage = normalizedPath === '/'
    ? 'Home dashboard'
    : pageLabels.find(([prefix]) => normalizedPath.startsWith(prefix))?.[1] ?? 'FireBuddy';
  return { currentPage, currentPath: normalizedPath.slice(0, 100) };
}

/** Build the exact optional interface metadata included with an Ember request. */
export function buildEmberAppContext(pathname: string): RagAppContext {
  return {
    ...getEmberPageContext(pathname),
    recentActions: getRecentEmberAppActions(5),
  };
}

/** Offer one page-aware prompt while keeping submission explicit. */
export function getEmberPageSuggestion(pathname: string): string {
  const { currentPage } = getEmberPageContext(pathname);
  const suggestions: Record<string, string> = {
    'Home dashboard': 'What should I review on my dashboard when planning for FIRE?',
    Transactions: 'What transaction patterns should I review when planning for FIRE?',
    Categories: 'How can spending categories support a realistic FIRE plan?',
    Accounts: 'How should I think about cash accounts and emergency savings?',
    Insights: 'Which spending insights are most useful for financial planning?',
    Wealth: 'How should liquidity and CPF restrictions affect a FIRE plan?',
    'FIRE setup': 'Which assumptions should I stress test in a Singapore FIRE plan?',
    'Spending Plan': 'How can I build a sustainable spending plan for FIRE?',
    'Life Goals': 'How should I balance nearer-term goals with FIRE investing?',
    'Add transaction': 'What transaction details help keep financial records useful?',
    Profile: 'What financial planning information should I review regularly?',
  };
  return suggestions[currentPage] ?? 'What Singapore finance topic should I explore next?';
}
