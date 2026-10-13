import { describe, expect, it } from 'vitest';
import { niceTicks, placeAxisLabels, toTodaysMoney } from '@firebuddy/shared';

describe('toTodaysMoney', () => {
  it('discounts twelve months at three percent', () => {
    expect(toTodaysMoney(103, '2027-01', '2026-01', 0.03)).toBeCloseTo(100);
  });

  it('does not change a month before the from month', () => {
    expect(toTodaysMoney(103, '2025-12', '2026-01', 0.03)).toBe(103);
  });

  it('does not change values with zero inflation', () => {
    expect(toTodaysMoney(103, '2030-01', '2026-01', 0)).toBe(103);
  });
});

describe('niceTicks', () => {
  it('includes zero and reaches the maximum', () => {
    const ticks = niceTicks(83);
    expect(ticks).toContain(0);
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(83);
  });

  it('uses 1, 2, 2.5, or 5 times a power of ten for the step', () => {
    const ticks = niceTicks(83, 0, 5);
    const step = ticks[1] - ticks[0];
    const power = 10 ** Math.floor(Math.log10(step));
    expect([1, 2, 2.5, 5]).toContain(step / power);
  });

  it('starts with a negative tick when the minimum is negative', () => {
    const ticks = niceTicks(40, -25);
    expect(ticks[0]).toBeLessThan(0);
    expect(ticks).toContain(0);
  });

  it('removes floating point noise from tick values', () => {
    expect(niceTicks(0.9, 0, 4)).not.toContain(0.30000000000000004);
  });
});

describe('placeAxisLabels', () => {
  it('keeps the higher priority label when labels overlap', () => {
    const placed = placeAxisLabels([
      { key: 'low', x: 50, width: 40, priority: 1 },
      { key: 'high', x: 50, width: 40, priority: 2 },
    ], 0, 100, 0);
    expect(placed.map((label) => label.key)).toEqual(['high']);
  });

  it('clamps labels inside the left and right bounds', () => {
    const placed = placeAxisLabels([
      { key: 'left', x: 0, width: 20, priority: 2 },
      { key: 'right', x: 100, width: 20, priority: 1 },
    ], 0, 100, 0);
    expect(placed.map((label) => label.center)).toEqual([10, 90]);
  });

  it('keeps all non-overlapping labels and sorts them by centre', () => {
    const placed = placeAxisLabels([
      { key: 'right', x: 90, width: 10, priority: 1 },
      { key: 'left', x: 10, width: 10, priority: 1 },
      { key: 'middle', x: 50, width: 10, priority: 1 },
    ], 0, 100, 0);
    expect(placed.map((label) => label.key)).toEqual(['left', 'middle', 'right']);
    expect(placed.map((label) => label.center)).toEqual([10, 50, 90]);
  });
});
