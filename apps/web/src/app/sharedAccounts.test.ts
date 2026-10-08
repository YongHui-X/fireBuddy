import { describe, expect, it } from 'vitest';
import { checkAccountDeletion, deleteAccountMoving, type Account, type Transaction } from '@firebuddy/shared';

const now = '2026-10-06T12:00:00.000Z';

const account = (id: string, isDefault = false): Account => ({
  id,
  userId: 'user-1',
  name: `Account ${id}`,
  type: 'bank',
  color: '#25543D',
  lastFour: null,
  isDefault,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const transaction = (id: string, accountId: string): Transaction => ({
  id,
  userId: 'user-1',
  categoryId: null,
  accountId,
  description: `Transaction ${id}`,
  amount: '12.34',
  date: '2026-10-01',
  transactionType: 'expense',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  tagIds: [],
});

describe('shared account deletion helpers', () => {
  it('deletes an unused non-default account without changing transactions', () => {
    const accounts = [account('cash', true), account('unused')];
    const transactions = [transaction('one', 'cash')];

    expect(checkAccountDeletion(accounts, transactions, 'unused')).toMatchObject({
      ok: true,
      usedBy: 0,
      needsTarget: false,
    });
    expect(deleteAccountMoving(accounts, transactions, 'unused', null, now)).toEqual({
      accounts: [accounts[0]],
      transactions,
    });
  });

  it('requires and applies a valid target for used transactions', () => {
    const accounts = [account('cash', true), account('savings'), account('card')];
    const transactions = [transaction('one', 'savings'), transaction('two', 'savings'), transaction('three', 'cash')];

    expect(checkAccountDeletion(accounts, transactions, 'savings')).toMatchObject({ ok: true, usedBy: 2, needsTarget: true });
    expect(deleteAccountMoving(accounts, transactions, 'savings', null, now)).toBeNull();

    const result = deleteAccountMoving(accounts, transactions, 'savings', 'card', now);
    expect(result).not.toBeNull();
    expect(result?.transactions).toEqual([
      { ...transactions[0], accountId: 'card', updatedAt: now },
      { ...transactions[1], accountId: 'card', updatedAt: now },
      transactions[2],
    ]);
    expect(result?.accounts).toEqual([accounts[0], accounts[2]]);
  });

  it('moves the default flag to the target when deleting a default account', () => {
    const accounts = [account('cash', true), account('savings')];

    expect(checkAccountDeletion(accounts, [], 'cash')).toMatchObject({ ok: true, usedBy: 0, needsTarget: true });
    const result = deleteAccountMoving(accounts, [], 'cash', 'savings', now);

    expect(result?.accounts).toEqual([{ ...accounts[1], isDefault: true, updatedAt: now }]);
    expect(result?.accounts.filter((item) => item.isDefault)).toHaveLength(1);
  });

  it.each(['cash', 'missing'])('rejects moveTo %s while deleting cash', (moveTo) => {
    expect(deleteAccountMoving([account('cash', true), account('savings')], [], 'cash', moveTo, now)).toBeNull();
  });

  it('rejects deleting the last remaining account', () => {
    const accounts = [account('cash', true)];
    expect(checkAccountDeletion(accounts, [], 'cash')).toEqual({
      ok: false,
      reason: 'Keep at least one account. Add another one first, then delete this.',
    });
    expect(deleteAccountMoving(accounts, [], 'cash', null, now)).toBeNull();
  });

  it('rejects an unknown account id', () => {
    expect(checkAccountDeletion([account('cash')], [], 'missing')).toEqual({ ok: false, reason: 'This account no longer exists.' });
  });

  it('does not mutate its inputs', () => {
    const accounts = [account('cash', true), account('savings')];
    const transactions = [transaction('one', 'cash')];
    const beforeAccounts = structuredClone(accounts);
    const beforeTransactions = structuredClone(transactions);

    deleteAccountMoving(accounts, transactions, 'cash', 'savings', now);

    expect(accounts).toEqual(beforeAccounts);
    expect(transactions).toEqual(beforeTransactions);
  });

  it('requires a target for an account used by a recurring rule', () => {
    const accounts = [account('cash', true), account('recurring')];
    const recurringAccountIds = ['recurring'];

    expect(checkAccountDeletion(accounts, [], 'recurring', recurringAccountIds)).toMatchObject({
      ok: true,
      usedBy: 0,
      usedByRepeats: 1,
      needsTarget: true,
    });
    expect(deleteAccountMoving(accounts, [], 'recurring', null, now, recurringAccountIds)).toBeNull();
  });
});
