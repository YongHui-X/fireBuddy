import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildEmberAppContext,
  clearEmberAppActions,
  getEmberPageContext,
  getRecentEmberAppActions,
  recordEmberAppAction,
  subscribeToEmberAppActions,
} from './emberAppContext';

describe('Ember application context', () => {
  beforeEach(() => clearEmberAppActions());

  it('maps routes without retaining query parameters', () => {
    expect(getEmberPageContext('/transactions')).toEqual({ currentPage: 'Transactions', currentPath: '/transactions' });
    expect(getEmberPageContext('/')).toEqual({ currentPage: 'Home dashboard', currentPath: '/' });
  });

  it('retains only generic recent session actions and not record details', () => {
    for (let index = 0; index < 7; index += 1) {
      recordEmberAppAction('update', `Updated item ${index}`, new Date(`2026-09-03T0${index}:00:00.000Z`));
    }

    const context = buildEmberAppContext('/wealth');
    expect(context.currentPage).toBe('Wealth');
    expect(context.recentActions).toHaveLength(5);
    expect(context.recentActions[0].label).toBe('Updated item 2');
    expect(JSON.stringify(context)).not.toContain('accountId');
  });

  it('notifies subscribers when activity changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToEmberAppActions(listener);
    recordEmberAppAction('create', 'Added a transaction');
    unsubscribe();
    recordEmberAppAction('delete', 'Deleted a transaction');

    expect(listener).toHaveBeenCalledOnce();
    expect(getRecentEmberAppActions()).toHaveLength(2);
  });
});
