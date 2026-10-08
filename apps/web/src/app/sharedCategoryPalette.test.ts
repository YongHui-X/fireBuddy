import { describe, expect, it } from 'vitest';
import {
  CATEGORY_CHART_PALETTE, CATEGORY_NEUTRAL_COLOR, DEFAULT_EXPENSE_CATEGORY_COLORS, demoCategories, demoCategoryIds,
  upgradeDefaultCategoryColors,
} from '@firebuddy/shared';

describe('category chart palette', () => {
  it('gives every default expense category its own colour, with a neutral for Others', () => {
    const expense = demoCategories.filter((category) => category.categoryType === 'expense');
    const colours = expense.map((category) => category.color);
    expect(new Set(colours).size).toBe(expense.length);
    expect(expense.find((category) => category.id === demoCategoryIds.others)?.color).toBe(CATEGORY_NEUTRAL_COLOR);
    for (const category of expense) expect(DEFAULT_EXPENSE_CATEGORY_COLORS[category.id]).toBe(category.color);
    expect(new Set(CATEGORY_CHART_PALETTE).size).toBe(CATEGORY_CHART_PALETTE.length);
  });

  it('moves a saved default category off its old green, case-insensitively', () => {
    const [upgraded] = upgradeDefaultCategoryColors([{ id: demoCategoryIds.food, color: '#3C8A61', isDefault: true }]);
    expect(upgraded.color).toBe(CATEGORY_CHART_PALETTE[0]);
  });

  it('keeps a colour the person picked and leaves custom categories alone', () => {
    const picked = { id: demoCategoryIds.food, color: '#B85C8A', isDefault: true };
    const custom = { id: 'custom-1', color: '#3C8A61', isDefault: false };
    expect(upgradeDefaultCategoryColors([picked, custom])).toEqual([picked, custom]);
  });
});
