/**
 * Where the user lives decides which features fit them. Singapore gets the full app (CPF, SRS,
 * HDB, CPF LIFE, Singapore DouDou); every other country gets the general mode with its own
 * currency (owner, 6 Oct 2026). Pure helpers, shared by web and mobile.
 */

export interface Country {
  /** ISO 3166-1 alpha-2 code, e.g. "SG". */
  code: string;
  name: string;
  /** ISO 4217 code of the usual currency, e.g. "SGD". */
  currency: string;
}

export const SINGAPORE = 'SG';

/** Singapore first, then the rest alphabetically. Short on purpose: the list is searchable. */
export const COUNTRIES: readonly Country[] = [
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'AT', name: 'Austria', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', currency: 'EUR' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'BN', name: 'Brunei', currency: 'BND' },
  { code: 'KH', name: 'Cambodia', currency: 'KHR' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'CN', name: 'China', currency: 'CNY' },
  { code: 'DK', name: 'Denmark', currency: 'DKK' },
  { code: 'FI', name: 'Finland', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'IE', name: 'Ireland', currency: 'EUR' },
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR' },
  { code: 'MX', name: 'Mexico', currency: 'MXN' },
  { code: 'MM', name: 'Myanmar', currency: 'MMK' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
  { code: 'NO', name: 'Norway', currency: 'NOK' },
  { code: 'PH', name: 'Philippines', currency: 'PHP' },
  { code: 'PT', name: 'Portugal', currency: 'EUR' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'KR', name: 'South Korea', currency: 'KRW' },
  { code: 'ES', name: 'Spain', currency: 'EUR' },
  { code: 'SE', name: 'Sweden', currency: 'SEK' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  { code: 'TW', name: 'Taiwan', currency: 'TWD' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
];

/** Currencies offered when confirming, in the order of the country list, without repeats. */
export const CURRENCIES: readonly string[] = [...new Set(COUNTRIES.map((country) => country.currency))];

/**
 * Symbols written before the amount. A currency not listed falls back to its ISO code and a
 * space ("KHR 1,200"), which is unambiguous even where the local symbol is not.
 */
const CURRENCY_PREFIX: Record<string, string> = {
  SGD: 'S$', USD: 'US$', AUD: 'A$', CAD: 'C$', NZD: 'NZ$', HKD: 'HK$', TWD: 'NT$', BND: 'B$', MXN: 'MX$', BRL: 'R$',
  EUR: '€', GBP: '£', JPY: '¥', CNY: 'CN¥', KRW: '₩', INR: '₹', PHP: '₱', THB: '฿', VND: '₫', MYR: 'RM', IDR: 'Rp',
};

/** Currencies that have no minor unit in everyday use, so they never show cents. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'IDR', 'KHR', 'MMK']);

/** No country chosen yet counts as Singapore, so existing users keep the full app unchanged. */
export function isSingapore(country: string | null | undefined): boolean {
  return !country || country.toUpperCase() === SINGAPORE;
}

export function findCountry(code: string | null | undefined): Country | undefined {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  return COUNTRIES.find((country) => country.code === upper);
}

/** The usual currency for a country, SGD when unknown or unset. */
export function currencyForCountry(code: string | null | undefined): string {
  return findCountry(code)?.currency ?? 'SGD';
}

/** Case- and accent-insensitive search on name or code, Singapore always first when it matches. */
export function searchCountries(query: string): Country[] {
  const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const needle = fold(query.trim());
  if (!needle) return [...COUNTRIES];
  const byCode = COUNTRIES.filter((country) => country.code.toLowerCase() === needle);
  // An exact code ("us", "uk"-style typing) ranks first, then names containing the text.
  return [...byCode, ...COUNTRIES.filter((country) => !byCode.includes(country) && fold(country.name).includes(needle))];
}

export function currencyPrefix(currency: string): string {
  return CURRENCY_PREFIX[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
}

/** Decimal places a currency shows when the caller asks for cents. */
export function currencyDigits(currency: string, digits: number): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : digits;
}

/**
 * Absolute money figure in the user's currency with en-SG grouping: "S$5,200.00", "€5,200.00",
 * "¥5,200", "RM5,200.00". The sign is the caller's job, as with `formatSGD`.
 */
export function formatMoney(value: number | string, currency = 'SGD', digits = 2): string {
  const numeric = typeof value === 'string' ? Number(value) : value;
  const safe = Number.isFinite(numeric) ? Math.abs(numeric) : 0;
  const places = currencyDigits(currency, digits);
  return `${currencyPrefix(currency)}${safe.toLocaleString('en-SG', { minimumFractionDigits: places, maximumFractionDigits: places })}`;
}
