import type { Category } from './types';

/**
 * Categorical chart palette for spending categories. Seven distinct hues plus a neutral slate for
 * "Others", one value per category that works on both the light (#ffffff) and dark forest
 * (#1c3428) surfaces. Validated with the dataviz palette checker on 4 Oct 2026: lightness band,
 * chroma floor, colour-blind separation (worst adjacent deltaE 8.4), normal-vision floor (19.3) and
 * >= 3:1 contrast pass in both modes. Charts using it must keep category names beside the colour
 * (legend rows or labels), because every pair cannot pass when slices are re-ordered by amount.
 */
export const CATEGORY_CHART_PALETTE = [
  '#d95926', // orange
  '#3987e5', // blue
  '#d55181', // magenta
  '#c98500', // amber
  '#199e70', // teal green
  '#9085e9', // violet
  '#e66767', // coral red
] as const;

/** Neutral for "Others" and anything uncategorised, so it never competes with a real category. */
export const CATEGORY_NEUTRAL_COLOR = '#7a869a';

/** Default expense category ids; the same values as `demoCategoryIds`, repeated to avoid an import cycle. */
const ID = {
  food: '00000000-0000-4000-8000-000000000001',
  transport: '00000000-0000-4000-8000-000000000002',
  shopping: '00000000-0000-4000-8000-000000000003',
  utilities: '00000000-0000-4000-8000-000000000004',
  health: '00000000-0000-4000-8000-000000000005',
  entertainment: '00000000-0000-4000-8000-000000000006',
  travel: '00000000-0000-4000-8000-000000000007',
  others: '00000000-0000-4000-8000-000000000008',
} as const;

/** Default expense categories mapped to their palette colour. */
export const DEFAULT_EXPENSE_CATEGORY_COLORS: Readonly<Record<string, string>> = {
  [ID.food]: CATEGORY_CHART_PALETTE[0],
  [ID.transport]: CATEGORY_CHART_PALETTE[1],
  [ID.shopping]: CATEGORY_CHART_PALETTE[2],
  [ID.utilities]: CATEGORY_CHART_PALETTE[3],
  [ID.health]: CATEGORY_CHART_PALETTE[4],
  [ID.entertainment]: CATEGORY_CHART_PALETTE[5],
  [ID.travel]: CATEGORY_CHART_PALETTE[6],
  [ID.others]: CATEGORY_NEUTRAL_COLOR,
};

/** The mostly-green colours default categories shipped with before this palette. */
const LEGACY_DEFAULT_EXPENSE_COLORS: Readonly<Record<string, string>> = {
  [ID.food]: '#3c8a61',
  [ID.transport]: '#67b47c',
  [ID.shopping]: '#e5b24a',
  [ID.utilities]: '#7baa90',
  [ID.health]: '#2e9b57',
  [ID.entertainment]: '#8bb89d',
  [ID.travel]: '#25543d',
  [ID.others]: '#a8d3b7',
};

/**
 * Move saved default categories onto the new palette. Only a default category still wearing its
 * original colour changes; a colour the person picked themselves is kept.
 */
export function upgradeDefaultCategoryColors<T extends Pick<Category, 'id' | 'color' | 'isDefault'>>(categories: readonly T[]): T[] {
  return categories.map((category) => {
    const legacy = LEGACY_DEFAULT_EXPENSE_COLORS[category.id];
    const next = DEFAULT_EXPENSE_CATEGORY_COLORS[category.id];
    if (!category.isDefault || !legacy || !next || category.color.toLowerCase() !== legacy) return category;
    return { ...category, color: next };
  });
}
