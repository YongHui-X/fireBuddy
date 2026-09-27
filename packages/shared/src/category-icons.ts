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

/** Swatches offered when creating a custom category. Order matches the web picker. */
export const categoryColors = [
  '#3C8A61',
  '#67B47C',
  '#E5B24A',
  '#7BAA90',
  '#2E9B57',
  '#8BB89D',
  '#25543D',
  '#A8D3B7',
  '#2A9D8F',
  '#3A86A8',
  '#4F6DB8',
  '#7B61A8',
  '#B85C8A',
  '#D65A5A',
  '#D97745',
  '#7A869A',
] as const;
