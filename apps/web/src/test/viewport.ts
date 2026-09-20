/**
 * A jsdom-backed `matchMedia` so components that follow a breakpoint can be tested at a width.
 *
 * jsdom ships no `matchMedia` at all, which means `useMediaQuery` silently returns false and every
 * responsive branch renders its desktop path. Tests that care about the phone layout need to be
 * able to say so, and tests that care about the desktop layout need to be able to pin themselves
 * there so a new mobile branch cannot quietly break them.
 *
 * The default is 1024x768 with a fine pointer, which is jsdom's own `innerWidth` and matches what
 * the existing suites were implicitly written against.
 */

type Viewport = {
  width: number;
  height: number;
  pointer: 'fine' | 'coarse';
  hover: 'hover' | 'none';
  reducedMotion: boolean;
  colorScheme: 'light' | 'dark';
};

const DEFAULT_VIEWPORT: Viewport = {
  width: 1024,
  height: 768,
  pointer: 'fine',
  hover: 'hover',
  reducedMotion: false,
  colorScheme: 'light',
};

let viewport: Viewport = { ...DEFAULT_VIEWPORT };

type LiveQuery = {
  query: string;
  matches: boolean;
  listeners: Set<(event: MediaQueryListEvent) => void>;
};

const liveQueries = new Set<LiveQuery>();

/** Evaluate one `(feature: value)` term against the current viewport. */
function evaluateFeature(term: string): boolean {
  const featureMatch = term.match(/^\(\s*([a-z-]+)\s*(?::\s*(.+?))?\s*\)$/i);
  if (!featureMatch) return false;

  const feature = featureMatch[1].toLowerCase();
  const rawValue = featureMatch[2]?.trim().toLowerCase();

  // A bare `(pointer)` style term asks whether the feature exists at all.
  if (rawValue === undefined) return feature !== 'unknown-feature';

  const pixels = (value: string) => Number.parseFloat(value.replace('px', ''));

  switch (feature) {
    case 'min-width':
      return viewport.width >= pixels(rawValue);
    case 'max-width':
      return viewport.width <= pixels(rawValue);
    case 'width':
      return viewport.width === pixels(rawValue);
    case 'min-height':
      return viewport.height >= pixels(rawValue);
    case 'max-height':
      return viewport.height <= pixels(rawValue);
    case 'pointer':
    case 'any-pointer':
      return rawValue === viewport.pointer;
    case 'hover':
    case 'any-hover':
      return rawValue === viewport.hover;
    case 'prefers-reduced-motion':
      return rawValue === 'reduce' ? viewport.reducedMotion : !viewport.reducedMotion;
    case 'prefers-color-scheme':
      return rawValue === viewport.colorScheme;
    case 'orientation':
      return rawValue === (viewport.width >= viewport.height ? 'landscape' : 'portrait');
    default:
      return false;
  }
}

/** Evaluate a full media query: comma-separated alternatives of `and`-joined terms. */
export function evaluateMediaQuery(query: string): boolean {
  return query
    .split(',')
    .some((alternative) => {
      const terms = alternative.trim().split(/\s+and\s+/i).filter(Boolean);
      if (terms.length === 0) return false;
      return terms.every((term) => {
        const cleaned = term.trim();
        // `screen and (min-width: 600px)` — a bare media type we treat as satisfied.
        if (!cleaned.startsWith('(')) return cleaned === 'screen' || cleaned === 'all';
        return evaluateFeature(cleaned);
      });
    });
}

function notifyQueries() {
  liveQueries.forEach((entry) => {
    const next = evaluateMediaQuery(entry.query);
    if (next === entry.matches) return;
    entry.matches = next;
    const event = { matches: next, media: entry.query } as MediaQueryListEvent;
    entry.listeners.forEach((listener) => listener(event));
  });
}

/**
 * Assign a window dimension even when a test has redefined it as a read-only property.
 * `Ember.test.tsx` does exactly that, so a plain assignment throws.
 */
function setWindowDimension(key: 'innerWidth' | 'innerHeight', value: number) {
  Object.defineProperty(window, key, { configurable: true, writable: true, value });
}

/** Install the stub. Called once from `setup.ts`. */
export function installMatchMedia() {
  window.matchMedia = ((query: string) => {
    const entry: LiveQuery = { query, matches: evaluateMediaQuery(query), listeners: new Set() };
    liveQueries.add(entry);

    const list: MediaQueryList = {
      get matches() {
        return evaluateMediaQuery(query);
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: EventListener) =>
        entry.listeners.add(listener as (event: MediaQueryListEvent) => void),
      removeEventListener: (_type: string, listener: EventListener) =>
        entry.listeners.delete(listener as (event: MediaQueryListEvent) => void),
      addListener: (listener: (event: MediaQueryListEvent) => void) => entry.listeners.add(listener),
      removeListener: (listener: (event: MediaQueryListEvent) => void) => entry.listeners.delete(listener),
      dispatchEvent: () => true,
    };

    return list;
  }) as typeof window.matchMedia;
}

/** Point the whole environment at a viewport. Media queries re-evaluate and listeners fire. */
export function setViewport(next: Partial<Viewport>) {
  viewport = { ...viewport, ...next };
  setWindowDimension('innerWidth', viewport.width);
  setWindowDimension('innerHeight', viewport.height);
  notifyQueries();
  window.dispatchEvent(new Event('resize'));
}

/** Shorthand for the common case. Widths below 768 also imply a touch screen. */
export function setViewportWidth(width: number, height = 800) {
  const touch = width < 768;
  setViewport({
    width,
    height,
    pointer: touch ? 'coarse' : 'fine',
    hover: touch ? 'none' : 'hover',
  });
}

/** The three phone widths worth testing against, plus the desktop pin. */
export const viewports = {
  phoneSmall: 360,
  phone: 393,
  phoneLarge: 412,
  tablet: 768,
  desktop: 1280,
} as const;

export function resetViewport() {
  viewport = { ...DEFAULT_VIEWPORT };
  setWindowDimension('innerWidth', viewport.width);
  setWindowDimension('innerHeight', viewport.height);
  notifyQueries();
}

export function clearMediaQueryRegistry() {
  liveQueries.clear();
}
