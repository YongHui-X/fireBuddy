import { describe, expect, it } from 'vitest';
import {
  accountBalances,
  isAccountBalancePosition,
  isLinkablePosition,
  latestSnapshotByPosition,
  summariseWealth,
  withLinkedBalances,
  type Transaction,
  type WealthPosition,
  type WealthPositionSnapshot,
} from '@firebuddy/shared';

const stamp = '2026-10-01T00:00:00.000Z';

function position(overrides: Partial<WealthPosition> = {}): WealthPosition {
  return {
    id: 'dbs',
    userId: 'user',
    name: 'DBS savings',
    positionKind: 'asset',
    positionType: 'cash',
    liquidityClass: 'liquid',
    includeInFi: false,
    isEmergencyFund: true,
    restrictionType: 'none',
    currency: 'SGD',
    interestRate: null,
    monthlyPayment: null,
    nextPaymentDate: null,
    originalPrincipal: null,
    linkedAccountId: 'acct-dbs',
    isArchived: false,
    archivedAt: null,
    latestSnapshot: null,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function snapshot(valueDate: string, amount: string, positionId = 'dbs'): WealthPositionSnapshot {
  return { id: `s-${positionId}-${valueDate}`, userId: 'user', wealthPositionId: positionId, valueDate, amount, createdAt: stamp, updatedAt: stamp };
}

type Move = Pick<Transaction, 'accountId' | 'date' | 'amount' | 'transactionType'>;
const income = (date: string, amount: string, accountId = 'acct-dbs'): Move => ({ accountId, date, amount, transactionType: 'income' });
const expense = (date: string, amount: string, accountId = 'acct-dbs'): Move => ({ accountId, date, amount, transactionType: 'expense' });

const valueOn = (snapshots: readonly WealthPositionSnapshot[], date: string, id = 'dbs') => latestSnapshotByPosition(snapshots, date).get(id)?.amount;

describe('account-linked balances', () => {
  it('adds income and subtracts spending after the entered balance', () => {
    const result = withLinkedBalances([position()], [snapshot('2026-10-01', '5000.00')], [income('2026-10-03', '3000'), expense('2026-10-04', '50')], '2026-10-08');
    expect(valueOn(result, '2026-10-02')).toBe('5000.00');
    expect(valueOn(result, '2026-10-03')).toBe('8000.00');
    expect(valueOn(result, '2026-10-08')).toBe('7950.00');
    expect(summariseWealth([position()], result).netWorth).toBe(7950);
  });

  it('treats a new entered balance as the starting point, including that day', () => {
    const result = withLinkedBalances(
      [position()],
      [snapshot('2026-10-01', '5000.00'), snapshot('2026-10-05', '7900.00')],
      [income('2026-10-03', '3000'), expense('2026-10-05', '20'), expense('2026-10-06', '100')],
      '2026-10-08',
    );
    expect(valueOn(result, '2026-10-05')).toBe('7900.00');
    expect(valueOn(result, '2026-10-06')).toBe('7800.00');
  });

  it('ignores other accounts, earlier transactions and future dates', () => {
    const result = withLinkedBalances(
      [position()],
      [snapshot('2026-10-01', '5000.00')],
      [income('2026-09-30', '999'), income('2026-10-01', '999'), expense('2026-10-02', '10', 'acct-cash'), income('2026-10-20', '500')],
      '2026-10-08',
    );
    expect(valueOn(result, '2026-10-31')).toBe('5000.00');
  });

  it('leaves unlinked, archived, non-cash and unvalued positions alone', () => {
    const moves = [income('2026-10-03', '100')];
    const snaps = [snapshot('2026-10-01', '5000.00')];
    for (const item of [position({ linkedAccountId: null }), position({ isArchived: true }), position({ positionType: 'investment' })]) {
      expect(withLinkedBalances([item], snaps, moves, '2026-10-08')).toBe(snaps);
    }
    expect(withLinkedBalances([position()], [], moves, '2026-10-08')).toEqual([]);
    expect(isLinkablePosition({ positionKind: 'liability', positionType: 'credit_card' })).toBe(false);
  });

  it('counts an expense saved later on the same day as the entered balance', () => {
    const balance = { ...snapshot('2026-10-08', '3000.00'), updatedAt: '2026-10-08T09:00:00.000Z' };
    const earlier = { ...expense('2026-10-08', '20'), createdAt: '2026-10-08T08:00:00.000Z' };
    const later = { ...expense('2026-10-08', '50'), createdAt: '2026-10-08T10:00:00.000Z' };
    const result = withLinkedBalances([position()], [balance], [earlier, later], '2026-10-08');
    // The 8am expense was already in the balance typed at 9am; the 10am one comes off it.
    expect(valueOn(result, '2026-10-08')).toBe('2950.00');
    expect(summariseWealth([position()], result).netWorth).toBe(2950);
  });

  it('can go below zero when spending outruns the balance', () => {
    const result = withLinkedBalances([position()], [snapshot('2026-10-01', '30.00')], [expense('2026-10-02', '80.5')], '2026-10-08');
    expect(valueOn(result, '2026-10-08')).toBe('-50.50');
  });

  it('counts an account by itself until a Wealth balance follows it', () => {
    const accounts = [
      { id: 'acct-cash', name: 'Cash', createdAt: stamp },
      { id: 'acct-dbs', name: 'DBS savings', createdAt: stamp },
      { id: 'acct-off', name: 'Old wallet', trackBalance: false, createdAt: stamp },
      { id: 'acct-empty', name: 'Unused', createdAt: stamp },
    ];
    const moves = [
      income('2026-10-02', '1000', 'acct-cash'),
      expense('2026-10-03', '40', 'acct-cash'),
      income('2026-10-02', '500', 'acct-dbs'),
      income('2026-10-02', '700', 'acct-off'),
      income('2026-10-20', '999', 'acct-cash'),
    ];
    // DBS is followed by a stored Wealth balance, so only Cash gets an automatic one.
    const automatic = accountBalances(accounts, [position()], moves, '2026-10-08');
    expect(automatic.positions.map((item) => item.name)).toEqual(['Cash']);
    expect(isAccountBalancePosition(automatic.positions[0])).toBe(true);
    expect(automatic.positions[0].linkedAccountId).toBe('acct-cash');
    expect(valueOn(automatic.snapshots, '2026-10-02', automatic.positions[0].id)).toBe('1000.00');
    expect(valueOn(automatic.snapshots, '2026-10-08', automatic.positions[0].id)).toBe('960.00');
    expect(summariseWealth(automatic.positions, automatic.snapshots).netWorth).toBe(960);

    // An archived balance no longer follows DBS, so DBS counts by itself again.
    const archived = accountBalances(accounts, [position({ isArchived: true })], moves, '2026-10-08');
    expect(archived.positions.map((item) => item.name)).toEqual(['Cash', 'DBS savings']);

    // Cash typed into Wealth with no link is separate money; the accounts still count.
    expect(accountBalances(accounts, [position({ linkedAccountId: null })], moves, '2026-10-08').positions.map((item) => item.name)).toEqual(['Cash', 'DBS savings']);
    expect(accountBalances(accounts, [position({ linkedAccountId: null, positionType: 'investment' })], moves, '2026-10-08').positions.map((item) => item.name)).toEqual(['Cash', 'DBS savings']);
  });

  it('restarts an account from zero at balanceFrom', () => {
    const account = { id: 'acct-cash', name: 'Cash', createdAt: stamp, balanceFrom: '2026-10-05T12:00:00.000Z' };
    const moves = [
      { ...income('2026-10-02', '1000', 'acct-cash'), createdAt: '2026-10-02T09:00:00.000Z' },
      { ...expense('2026-10-05', '40', 'acct-cash'), createdAt: '2026-10-05T11:00:00.000Z' },
      { ...expense('2026-10-05', '30', 'acct-cash'), createdAt: '2026-10-05T13:00:00.000Z' },
      { ...income('2026-10-06', '200', 'acct-cash'), createdAt: '2026-10-06T09:00:00.000Z' },
    ];
    const automatic = accountBalances([account], [], moves, '2026-10-08');
    expect(automatic.positions).toHaveLength(1);
    expect(valueOn(automatic.snapshots, '2026-10-08', automatic.positions[0].id)).toBe('170.00');

    const withoutCreatedAt = accountBalances([account], [], [{ ...income('2026-10-06', '25', 'acct-cash') }], '2026-10-08');
    expect(valueOn(withoutCreatedAt.snapshots, '2026-10-08', withoutCreatedAt.positions[0].id)).toBe('25.00');
    // With no save time, a record dated before the restart day stays out.
    expect(accountBalances([account], [], [{ ...income('2026-10-02', '25', 'acct-cash') }], '2026-10-08').positions).toHaveLength(0);

    const fromBeginning = accountBalances([{ ...account, balanceFrom: null }], [], moves, '2026-10-08');
    expect(valueOn(fromBeginning.snapshots, '2026-10-08', fromBeginning.positions[0].id)).toBe('1130.00');

    expect(accountBalances([{ ...account, trackBalance: false }], [], moves, '2026-10-08').positions).toHaveLength(0);
  });
});
