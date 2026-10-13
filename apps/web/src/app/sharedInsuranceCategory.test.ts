import { describe, expect, it } from 'vitest';
import { demoCategories, insuranceCategory, resolveCategoryIconId, withInsuranceCategory } from '@firebuddy/shared';

describe('built-in Insurance category', () => {
  it('adds Insurance once immediately before Others and is idempotent', () => {
    const added = withInsuranceCategory(demoCategories, insuranceCategory);
    expect(added.filter((category) => category.id === insuranceCategory.id)).toHaveLength(1);
    expect(added[added.findIndex((category) => category.name === 'Others') - 1]).toBe(insuranceCategory);
    expect(withInsuranceCategory(added, insuranceCategory)).toBe(added);
  });

  it('respects a person-owned Insurance category regardless of case or padding', () => {
    const own = [{ ...demoCategories[0], name: ' insurance ' }, ...demoCategories.slice(1)];
    expect(withInsuranceCategory(own, insuranceCategory)).toBe(own);
  });

  it('is an expense category with the insurance icon', () => {
    expect(insuranceCategory).toMatchObject({ categoryType: 'expense', icon: 'insurance' });
    expect(resolveCategoryIconId('insurance')).toBe('insurance');
  });
});
