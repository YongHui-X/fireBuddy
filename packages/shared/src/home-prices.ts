/**
 * Typical Singapore home prices for the "plan to buy" hint (PRD 6.6.1, rule 29), before grants.
 * Checked on 11 Oct 2026:
 * - BTO ranges: HDB's February and June 2026 BTO launch annexes (Standard, Plus and Prime), as
 *   summarised by PropKaki. Singles from 35 may buy a 2-room Flexi.
 * - Resale medians: HDB and PropKaki, second quarter of 2026.
 * - Condos: a new 2-bedroom preview price at Tengah Garden Residences (Stacked Homes) for singles,
 *   and Homy.sg's August 2026 median across all sizes for couples. Rough guides only.
 * Prices change every quarter, so the screen shows each figure's date.
 */
export const HOME_PRICES_SOURCE_DATE = '2026-10-11';
/** The year the prices describe; later years grow with the plan's inflation. */
export const HOME_PRICES_YEAR = 2026;

export interface HomePrice {
  kind: 'BTO' | 'Resale' | 'Condo';
  detail: string;
  /** Low and high of the range; equal for a single median or example. */
  low: number;
  high: number;
  /** When the figure is from, as shown on screen. */
  asOf: string;
}

export const HOME_PRICES: Readonly<Record<'single' | 'couple', readonly HomePrice[]>> = {
  single: [
    { kind: 'BTO', detail: '2-room Flexi, age 35+', low: 137000, high: 444000, asOf: '2026 launches' },
    { kind: 'Resale', detail: '3-room, median', low: 440000, high: 440000, asOf: 'Q2 2026' },
    { kind: 'Condo', detail: 'New 2-bedroom', low: 1110000, high: 1110000, asOf: 'One launch, 2026 preview' },
  ],
  couple: [
    { kind: 'BTO', detail: '4-room', low: 302000, high: 810000, asOf: '2026 launches' },
    { kind: 'Resale', detail: '4-room, median', low: 630000, high: 630000, asOf: 'Q2 2026' },
    { kind: 'Condo', detail: 'All sizes, median', low: 1990000, high: 1990000, asOf: 'Aug 2026' },
  ],
};

/** A 2026 price grown by `inflation` a year to `year`; earlier years return the price unchanged. */
export function homePriceIn(price: number, year: number, inflation: number): number {
  return price * (1 + inflation) ** Math.max(0, year - HOME_PRICES_YEAR);
}
