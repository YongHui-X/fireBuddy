import { describe, expect, it } from 'vitest';

import { latestSnapshotByPosition } from '@firebuddy/shared';
import type { WealthPositionSnapshot } from '@firebuddy/shared';

const snapshot = (overrides: Partial<WealthPositionSnapshot> = {}): WealthPositionSnapshot => ({
  id: 'snapshot',
  userId: 'user',
  wealthPositionId: 'position',
  valueDate: '2026-10-01',
  amount: '100',
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
  ...overrides,
});

describe('latestSnapshotByPosition', () => {
  it('chooses the later updatedAt on the same valueDate regardless of array order', () => {
    const older = snapshot({ id: 'older', amount: '100', updatedAt: '2026-10-01T09:00:00.000Z' });
    const newer = snapshot({ id: 'newer', amount: '200', updatedAt: '2026-10-01T10:00:00.000Z' });

    expect(latestSnapshotByPosition([newer, older]).get('position')).toBe(newer);
    expect(latestSnapshotByPosition([older, newer]).get('position')).toBe(newer);
  });

  it('uses createdAt and then array order for complete updatedAt ties', () => {
    const olderCreated = snapshot({ id: 'older-created', amount: '100', createdAt: '2026-10-01T09:00:00.000Z' });
    const newerCreated = snapshot({ id: 'newer-created', amount: '200', createdAt: '2026-10-01T10:00:00.000Z' });
    const first = snapshot({ id: 'first', amount: '300' });
    const last = snapshot({ id: 'last', amount: '400' });

    expect(latestSnapshotByPosition([newerCreated, olderCreated]).get('position')).toBe(newerCreated);
    expect(latestSnapshotByPosition([first, last]).get('position')).toBe(last);
  });

  it('prioritises a later valueDate over a newer update timestamp', () => {
    const earlier = snapshot({ id: 'earlier', valueDate: '2026-09-30', amount: '100', updatedAt: '2026-10-02T09:00:00.000Z' });
    const later = snapshot({ id: 'later', valueDate: '2026-10-01', amount: '200', updatedAt: '2026-09-01T09:00:00.000Z' });

    expect(latestSnapshotByPosition([later, earlier]).get('position')).toBe(later);
  });

  it('excludes future values and resolves positions independently', () => {
    const current = snapshot({ id: 'current', amount: '100' });
    const future = snapshot({ id: 'future', valueDate: '2026-10-02', amount: '999', updatedAt: '2026-10-02T12:00:00.000Z' });
    const other = snapshot({ id: 'other', wealthPositionId: 'other-position', amount: '50' });

    const result = latestSnapshotByPosition([future, other, current], '2026-10-01');
    expect(result.get('position')).toBe(current);
    expect(result.get('other-position')).toBe(other);
    expect(result.has('future')).toBe(false);
  });
});
