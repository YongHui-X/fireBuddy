/**
 * Category icon identifiers shared by the web and mobile apps. Each app binds these ids to its
 * own lucide package (lucide-react on web, lucide-react-native on mobile); the ids themselves and
 * the legacy two-letter aliases stored on older categories live here so both agree.
 */
export const categoryIconOptions = [
  { id: 'food', label: 'Food & Drink' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'transport', label: 'Transport' },
  { id: 'bus', label: 'Bus' },
  { id: 'car', label: 'Car' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'utilities', label: 'Bills & Utilities' },
  { id: 'housing', label: 'Housing' },
  { id: 'phone', label: 'Phone & Internet' },
  { id: 'health', label: 'Healthcare' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'camera', label: 'Camera' },
  { id: 'travel', label: 'Travel' },
  { id: 'places', label: 'Places' },
  { id: 'education', label: 'Education' },
  { id: 'gifts', label: 'Gifts' },
  { id: 'tech', label: 'Tech' },
  { id: 'banking', label: 'Banking' },
  { id: 'others', label: 'Others' },
  { id: 'shapes', label: 'Others' },
  { id: 'salary', label: 'Salary' },
  { id: 'bonus', label: 'Bonus' },
  { id: 'dividends', label: 'Dividends' },
  { id: 'interest', label: 'Interest' },
  { id: 'income', label: 'Other income' },
] as const;

export type CategoryIconId = (typeof categoryIconOptions)[number]['id'];

export const categoryIconIds: readonly CategoryIconId[] = categoryIconOptions.map((option) => option.id);

/** Two-letter icon codes written by the first Supabase seed. */
export const legacyCategoryIconIds: Record<string, CategoryIconId> = {
  FD: 'food',
  TR: 'transport',
  SH: 'shopping',
  BU: 'utilities',
  HC: 'health',
  EN: 'entertainment',
  TV: 'travel',
  OT: 'shapes',
  NW: 'others',
};

export function isCategoryIconId(value: string): value is CategoryIconId {
  return (categoryIconIds as readonly string[]).includes(value);
}

/** Resolve a stored icon value (modern id or legacy code) to a known id, defaulting to "others". */
export function resolveCategoryIconId(icon?: string | null): CategoryIconId {
  if (!icon) return 'others';
  const mapped = legacyCategoryIconIds[icon] ?? icon;
  return isCategoryIconId(mapped) ? mapped : 'others';
}

/** Swatches offered when creating a custom category: the chart palette first, then extra tones. */
export const categoryColors = [
  '#d95926',
  '#3987e5',
  '#d55181',
  '#c98500',
  '#199e70',
  '#9085e9',
  '#e66767',
  '#7a869a',
  '#3C8A61',
  '#2A9D8F',
  '#4F6DB8',
  '#7B61A8',
  '#B85C8A',
  '#D97745',
  '#67B47C',
  '#25543D',
] as const;
