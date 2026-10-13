import { describe, expect, it } from 'vitest';
import {
  demoCategories,
  demoCategoryIds,
  shortenDefaultCategoryNames,
} from '@firebuddy/shared';

describe('shortenDefaultCategoryNames', () => {
  it('shortens the selected built-in category names and leaves the others unchanged', () => {
    const shortened = shortenDefaultCategoryNames(demoCategories);
    const byId = new Map(shortened.map((category) => [category.id, category.name]));

    expect(byId.get(demoCategoryIds.food)).toBe('Food');
    expect(byId.get(demoCategoryIds.utilities)).toBe('Bills');
    expect(byId.get(demoCategoryIds.health)).toBe('Health');
    expect(byId.get(demoCategoryIds.entertainment)).toBe('Leisure');
    expect(byId.get(demoCategoryIds.otherIncome)).toBe('Other');
    expect(byId.get(demoCategoryIds.transport)).toBe('Transport');
    expect(byId.get(demoCategoryIds.shopping)).toBe('Shopping');
    expect(byId.get(demoCategoryIds.travel)).toBe('Travel');
    expect(byId.get(demoCategoryIds.others)).toBe('Others');
    expect(byId.get(demoCategoryIds.salary)).toBe('Salary');
  });

  it('keeps every shortened name at or below nine characters', () => {
    const shortened = shortenDefaultCategoryNames(demoCategories);
    expect(shortened.every((category) => category.name.length <= 9)).toBe(true);
  });

  it('does not overwrite a renamed built-in category', () => {
    const categories = demoCategories.map((category) => (
      category.id === demoCategoryIds.health ? { ...category, name: 'Doctor' } : category
    ));
    const result = shortenDefaultCategoryNames(categories);
    expect(result.find((category) => category.id === demoCategoryIds.health)?.name).toBe('Doctor');
  });

  it('does not change a custom category', () => {
    const categories = [{ ...demoCategories.find((category) => category.id === demoCategoryIds.health)!, name: 'Healthcare', isDefault: false }];
    expect(shortenDefaultCategoryNames(categories)[0].name).toBe('Healthcare');
  });

  it('returns the same array when nothing needs changing', () => {
    const shortened = shortenDefaultCategoryNames(demoCategories);
    expect(shortenDefaultCategoryNames(shortened)).toBe(shortened);
  });

  it('does not mutate the input array or its objects', () => {
    const input = demoCategories.map((category) => ({ ...category }));
    const before = JSON.stringify(input);
    shortenDefaultCategoryNames(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});
