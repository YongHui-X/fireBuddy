import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { calculateRetirement } from '@firebuddy/shared';
import fixtures from '../../../../packages/shared/fixtures/retirement.json';

describe('monthly retirement engine', () => {
  it('matches every Python monthly cash flow and headline across common numerical fixtures', () => {
    const script = '../backend/tests/test_retirement_calculator.py';
    const python = JSON.parse(execFileSync('python', [script, '--fixtures'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
    fixtures.cases.forEach((fixture, index) => {
      const plan = { ...fixtures.base, ...fixture.overrides };
      const actual = calculateRetirement(plan, fixture.assets, '2026-01-01');
      expect(actual, fixture.name).toEqual(python[index]);
      if ('target' in fixture) expect(actual.fiTarget).toBe(fixture.target);
    });
  });
  it('does not infer an active plan from missing inputs', () => {
    expect(calculateRetirement(null, 100000, '2026-01-01').fundingStatus).toBe('review_required');
    expect(calculateRetirement({ ...fixtures.base, retirementMonth: '2200-01' }, 100000, '2026-01-01').fundingStatus).toBe('review_required');
  });
});
