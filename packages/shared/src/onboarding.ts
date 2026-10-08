import type { DoudouPose } from './doudou';
import { getGreeting } from './format';

/** Longest nickname kept, so the Home greeting stays on one or two lines. */
export const NICKNAME_MAX_LENGTH = 24;

/**
 * Cleans what the user typed into "How should we address you?": trims, collapses inner spaces and
 * caps the length by characters (not UTF-16 units, so an emoji is never cut in half). Returns null
 * when nothing usable is left, which the app treats as "no name".
 */
export function normaliseNickname(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  if (!collapsed) return null;
  const capped = Array.from(collapsed).slice(0, NICKNAME_MAX_LENGTH).join('').trim();
  return capped || null;
}

/** "Good morning, Jo!" with a nickname, "Good morning!" without one. */
export function formatGreeting(nickname: string | null | undefined, hour = new Date().getHours()) {
  const name = normaliseNickname(nickname);
  return name ? `${getGreeting(hour)}, ${name}!` : `${getGreeting(hour)}!`;
}

/** Ids of the controls the tour points at. Each one is registered by the component that draws it. */
export type TourTargetId = 'add' | 'wealth' | 'planner' | 'insights' | 'doudou' | 'transactions' | 'categories' | 'profile';

export interface TourStep {
  id: string;
  targetId: TourTargetId;
  title: string;
  body: string;
  pose: DoudouPose;
}

/** DouDou's spotlight tour on Home, in order. Copy is short, plain and encouraging. */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'add',
    targetId: 'add',
    title: 'Log it in seconds',
    body: 'Tap the + to record spending or income. Small habits add up.',
    pose: 'point',
  },
  {
    id: 'wealth',
    targetId: 'wealth',
    title: 'Your wealth, together',
    body: 'See your savings, investments, property and debts in one place.',
    pose: 'point',
  },
  {
    id: 'planner',
    targetId: 'planner',
    title: 'Plan your FIRE date',
    body: 'Work out when you could reach financial freedom.',
    pose: 'point',
  },
  {
    id: 'insights',
    targetId: 'insights',
    title: 'Spot the patterns',
    body: 'See where your money goes each month.',
    pose: 'point',
  },
  {
    id: 'doudou',
    targetId: 'doudou',
    title: 'Meet me, DouDou',
    body: "I'm your money buddy. Ask me about CPF, budgeting or your FIRE plan and I'll explain it simply.",
    pose: 'point',
  },
  {
    id: 'transactions',
    targetId: 'transactions',
    title: 'Every entry in one place',
    body: 'Search, filter and edit everything you have logged, and set up recurring ones.',
    pose: 'point',
  },
  {
    id: 'categories',
    targetId: 'categories',
    title: 'Sort and budget',
    body: 'Organise your categories and give any of them a monthly budget for Home to track.',
    pose: 'point',
  },
  {
    id: 'profile',
    targetId: 'profile',
    title: 'Make it yours',
    body: 'Change your name or country, set a daily reminder, back up, or replay this tour in Profile.',
    pose: 'point',
  },
];

export interface DailyTipInput {
  /** Local YYYY-MM-DD, so the tip stays the same all day and changes at midnight. */
  dateKey: string;
  /** Whether any transaction is dated today. */
  loggedToday: boolean;
}

export interface DailyTip {
  id: string;
  text: string;
}

/** Nudge shown first on a day nothing has been logged yet. */
export const LOG_TODAY_TIP: DailyTip = {
  id: 'log-today',
  text: 'Nothing logged yet today. Building a good financial habit starts today.',
};

/** General tips, rotated by date. None mentions an amount or judges spending. */
export const DAILY_TIPS: readonly DailyTip[] = [
  { id: 'eye', text: 'Tap the eye on Home to hide every amount when others are around.' },
  { id: 'wealth-snapshot', text: 'Update Wealth once a month to watch your net worth grow.' },
  { id: 'essential', text: 'Mark essential categories in Budgets to see your true monthly needs.' },
  { id: 'planner', text: 'Try a scenario in FIRE Planner. Small changes can move your date.' },
  { id: 'backup', text: 'Your records live on this phone. Save a backup file from Profile.' },
  { id: 'categories', text: 'Set a budget on a category and Home will track it for you.' },
];

/** Whole days since 1970 for a YYYY-MM-DD key; 0 for anything unreadable. */
function dayNumber(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return 0;
  const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : 0;
}

/**
 * The one tip Home shows today. A day with nothing logged gets the gentle logging nudge; otherwise
 * the general tips rotate by date. Pure and offline, so it never touches the network.
 */
export function pickDailyTip({ dateKey, loggedToday }: DailyTipInput): DailyTip {
  if (!loggedToday) return LOG_TODAY_TIP;
  const index = ((dayNumber(dateKey) % DAILY_TIPS.length) + DAILY_TIPS.length) % DAILY_TIPS.length;
  return DAILY_TIPS[index];
}

/**
 * Which dataset a phone starts from. An install with nothing stored yet starts empty in a
 * production build and on the demo dataset in a development build (the demo tools are for
 * testing only, owner 6 Oct 2026). A phone that already has records keeps them.
 */
export function initialDataset({ hasStoredRecords, isDev }: { hasStoredRecords: boolean; isDev: boolean }): 'stored' | 'demo' | 'fresh' {
  if (hasStoredRecords) return 'stored';
  return isDev ? 'demo' : 'fresh';
}

/** Hour (local, 24h) the evening logging reminder fires. */
export const REMINDER_HOUR = 21;
/** How many evenings ahead the phone keeps scheduled, topped up every time the app opens. */
export const REMINDER_DAYS_AHEAD = 7;

/**
 * DouDou's 9pm nudges: playful, a little cheeky, never guilt-tripping and never an amount
 * (owner, 6 Oct 2026). Rotated by date so consecutive evenings differ.
 */
export const REMINDER_LINES: readonly { title: string; body: string }[] = [
  { title: 'DouDou is waiting 🌱', body: 'Did anything leave your wallet today? 30 seconds and we are done.' },
  { title: 'Psst… it’s DouDou', body: 'Log today and I promise to stop staring at you. Probably.' },
  { title: 'Your streak misses you', body: 'So do I. Add today’s spending before bed?' },
  { title: 'DouDou check-in 👀', body: 'Coffee? Lunch? A sneaky snack? Tell me before you sleep.' },
  { title: 'Tiny habit, big future', body: 'One quick entry today keeps your FIRE plan honest.' },
  { title: 'Knock knock 🫘', body: 'It’s DouDou. Anything to add for today?' },
  { title: 'Before you scroll away…', body: 'Give me 30 seconds: what did today cost?' },
];

export interface ReminderSlot {
  /** Local YYYY-MM-DD the reminder fires on, at `REMINDER_HOUR`. */
  dateKey: string;
  title: string;
  body: string;
}

/**
 * Evenings to schedule, starting today. Today is left out once something is logged or 9pm has
 * passed, so the user is never nudged after they have already logged. Pure: the caller passes the
 * local date, the minutes since midnight and whether today has an entry.
 */
export function planReminders({ todayKey, minutesNow, loggedToday, days = REMINDER_DAYS_AHEAD }: { todayKey: string; minutesNow: number; loggedToday: boolean; days?: number }): ReminderSlot[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayKey);
  if (!match) return [];
  const start = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const slots: ReminderSlot[] = [];
  const skipToday = loggedToday || minutesNow >= REMINDER_HOUR * 60;
  for (let offset = skipToday ? 1 : 0; slots.length < days; offset += 1) {
    const day = new Date(start + offset * 86_400_000);
    const dateKey = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}-${String(day.getUTCDate()).padStart(2, '0')}`;
    const line = REMINDER_LINES[Math.floor(day.getTime() / 86_400_000) % REMINDER_LINES.length];
    slots.push({ dateKey, ...line });
  }
  return slots;
}
