import type { AccountType } from './types';
import { accountTypeLabels } from './add-expense';

/** Local calendar date as YYYY-MM-DD, using the device timezone. */
export function getDeviceDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** YYYY-MM for a date key, defaulting to today. */
export function getDeviceMonthKey(dateKey = getDeviceDateKey()) {
  return dateKey.slice(0, 7);
}

/** Move a YYYY-MM key forwards or backwards by whole months. */
export function shiftMonthKey(monthKey: string, delta: number) {
  const [year, month] = monthKey.split('-').map(Number);
  const shifted = new Date(year, month - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
}

/** "September 2026" for a YYYY-MM key. */
export function formatMonthLabel(monthKey: string) {
  return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
}

/** "September" for a YYYY-MM key. */
export function formatMonthName(monthKey: string) {
  return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('en-SG', { month: 'long' });
}

/** Absolute SGD figure with en-SG grouping, e.g. "S$5,200.00". Sign is the caller's job. */
export function formatSGD(value: number | string, digits = 2) {
  const numeric = typeof value === 'string' ? Number(value) : value;
  const safe = Number.isFinite(numeric) ? Math.abs(numeric) : 0;

  return `S$${safe.toLocaleString('en-SG', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/** "+ S$148.30" for income, "- S$8.50" for expenses. */
export function formatSignedSGD(value: number | string, transactionType: 'income' | 'expense', digits = 2) {
  return `${transactionType === 'income' ? '+' : '-'} ${formatSGD(value, digits)}`;
}

/** Today, Yesterday, or "Wed, 23 Sept" for a YYYY-MM-DD key. */
export function formatDateLabel(value: string, todayKey = getDeviceDateKey()) {
  const parsed = new Date(`${value}T00:00:00`);
  const today = new Date(`${todayKey}T00:00:00`);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (parsed.toDateString() === today.toDateString()) {
    return 'Today';
  }

  if (parsed.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return parsed.toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
}

/** "23 Sept 2026" for a YYYY-MM-DD key, used where the year matters. */
export function formatLongDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function accountTypeLabel(type: AccountType) {
  return accountTypeLabels[type];
}

/** Up to two initials from a display name, falling back to "FB". */
export function getInitials(name: string) {
  return (
    name
      .split(/[._\s-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'FB'
  );
}

/** Time-of-day greeting without storing another preference. */
export function getGreeting(hour = new Date().getHours()) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "23 Sept" for a YYYY-MM-DD key, used in compact period headers. */
export function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
  });
}
