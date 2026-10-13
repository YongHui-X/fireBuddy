import { DOUDOU_GOLD_COLORS } from '@firebuddy/shared';
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * FireBuddy design tokens for the native app: the Gold Standard palette (owner, 9 Oct 2026). Navy
 * owns regions (heroes, the rail), gold is spent on the primary action and highlights, main text is
 * near-black or white, and secondary text is a solid grey. The canvas is flat: one background colour
 * edge to edge with hairline-bordered cards. The paused web app keeps its forest and lime palette in
 * `apps/web/src/styles/tokens.css`. See DESIGN.md, "Mobile palette: Gold Standard".
 */

export const brand = {
  navy950: '#000814',
  navy900: '#001d3d',
  navy800: '#003566',
  navy700: '#00509d',
  navy50: '#eef3fa',
  gold400: '#ffd60a',
  gold500: '#ffc300',
  gold600: '#e6af00',
  /** Gold dark enough to set as text on white (about 6:1). */
  goldText: '#7a5a00',
} as const;

/** DouDou's colours on the phone: the golden bean with green leaves (the web keeps the lime bean). */
export const doudouColors = DOUDOU_GOLD_COLORS;

export interface Theme {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  lineStrong: string;
  primary: string;
  primaryHover: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  focusRing: string;
  /** Gold readable as text on the page (the `gold` chip). */
  goldText: string;
  income: string;
  incomeSoft: string;
  expense: string;
  expenseSoft: string;
  danger: string;
  dangerFill: string;
  onDanger: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  chartProjection: string;
  railBg: string;
  railInk: string;
  railInkMuted: string;
  railLine: string;
  railHoverBg: string;
  railActiveBg: string;
  railActiveInk: string;
  /** Icon and label of the current tab in the bottom bar: strong blue on white, gold on charcoal. */
  tabActiveInk: string;
  heroBg: string;
  heroInk: string;
  heroInkMuted: string;
  heroLine: string;
  /** Pill and shortcut background inside a hero; text on it is `heroChipInk`. */
  heroChipBg: string;
  heroChipInk: string;
  /** The change pill inside a hero: `heroUpBg`/`heroUpInk` when up, `heroChipBg`/`heroDownInk` when down. */
  heroUpBg: string;
  heroUpInk: string;
  heroDownInk: string;
  /** Income and expense figures on a navy hero: the same green and red as the ledger, lifted to read on navy. */
  heroIncomeInk: string;
  heroExpenseInk: string;
  /** Status bar icon colour while a hero sits under it. */
  heroStatusBar: 'light' | 'dark';
  /** Up to two soft radial glows painted behind a hero's content; opacity 0 draws none. */
  heroGlow: string;
  heroGlowOpacity: number;
  heroGlow2: string;
  heroGlow2Opacity: number;
  /**
   * Home's net worth hero, applied over the theme inside the Home hero only. It is the navy hero
   * with a solid gold change pill; `figure` colours a net worth of zero or more (white in light
   * mode, gold in dark mode).
   */
  homeHero: Partial<Omit<Theme, 'homeHero'>> & { figure: string };
  brandMarkFill: string;
  brandMarkSun: string;
  brandMarkLine: string;
  emberSymbol: string;
  /** 8% ink wash laid over a pressed control. */
  pressOverlay: string;
  backdrop: string;
}

// Cool white canvas under white cards (owner, 9 Oct 2026).
export const lightTheme: Theme = {
  bg: '#f6f7fa',
  surface: '#ffffff',
  surface2: '#eef1f6',
  surface3: '#e2e7ef',
  ink: '#14181f',
  ink2: '#4d5a6b',
  ink3: '#6b7686',
  line: '#e2e6ee',
  lineStrong: '#c9d1dd',
  primary: brand.gold500,
  primaryHover: brand.gold600,
  onPrimary: '#14181f',
  accent: brand.navy700,
  accentSoft: '#e8f0fa',
  accentText: brand.navy800,
  focusRing: brand.navy700,
  goldText: brand.goldText,
  income: '#1e7a45',
  incomeSoft: '#e4f3e8',
  expense: '#c23a2b',
  expenseSoft: '#fbeae7',
  danger: '#c23a2b',
  dangerFill: '#c23a2b',
  onDanger: '#ffffff',
  warning: '#9a6700',
  warningSoft: '#fff3d4',
  info: '#35678a',
  infoSoft: '#e5eef5',
  // Drawdown line: teal, apart from the blue growth line and the red runs-out line (owner, 10 Oct 2026).
  chartProjection: '#0f9488',
  railBg: brand.navy900,
  railInk: '#eef3fa',
  railInkMuted: '#a9b8cc',
  railLine: 'rgba(255, 255, 255, 0.1)',
  railHoverBg: 'rgba(255, 255, 255, 0.06)',
  railActiveBg: 'rgba(255, 195, 0, 0.14)',
  railActiveInk: brand.gold400,
  tabActiveInk: brand.navy700,
  heroBg: brand.navy900,
  heroInk: '#ffffff',
  heroInkMuted: '#b8c6d8',
  heroLine: 'rgba(255, 255, 255, 0.14)',
  heroChipBg: 'rgba(255, 255, 255, 0.1)',
  heroChipInk: '#b8c6d8',
  heroUpBg: 'rgba(255, 255, 255, 0.1)',
  heroUpInk: brand.gold400,
  heroDownInk: '#ffb0a3',
  heroIncomeInk: '#6fd193',
  heroExpenseInk: '#ff6b6b',
  heroStatusBar: 'light',
  heroGlow: brand.gold500,
  heroGlowOpacity: 0,
  heroGlow2: brand.navy700,
  heroGlow2Opacity: 0,
  homeHero: {
    heroChipBg: 'rgba(255, 255, 255, 0.12)',
    heroUpBg: brand.gold500,
    heroUpInk: '#14181f',
    figure: '#ffffff',
  },
  brandMarkFill: brand.navy900,
  brandMarkSun: brand.gold500,
  brandMarkLine: '#ffffff',
  emberSymbol: '#d9782d',
  pressOverlay: 'rgba(0, 29, 61, 0.08)',
  backdrop: 'rgba(0, 8, 20, 0.45)',
};

/**
 * Dark mode is a neutral charcoal taken from the owner's reference screenshot (10 Oct 2026): page
 * #212226, cards #27282d, dividers #3d3e43. The navy heroes (#003566) and gold stand out against
 * it. ink3 keeps 4.5:1 on `surface`.
 */
export const darkTheme: Theme = {
  ...lightTheme,
  bg: '#212226',
  surface: '#27282d',
  surface2: '#2f3036',
  surface3: '#383940',
  ink: '#f2f5fa',
  ink2: '#b6c2d2',
  ink3: '#93a1b5',
  line: '#3d3e43',
  lineStrong: '#4b4d54',
  accent: '#7fb3e6',
  accentSoft: '#10294a',
  accentText: '#a8cbf0',
  focusRing: brand.gold400,
  goldText: brand.gold400,
  income: '#6fd193',
  incomeSoft: '#173a2a',
  expense: '#f08d7d',
  expenseSoft: '#3d2326',
  danger: '#f08d7d',
  dangerFill: '#d9534a',
  warning: '#e6bd5f',
  warningSoft: '#33290f',
  info: '#86b9da',
  infoSoft: '#132b40',
  chartProjection: '#2dd4bf',
  railBg: brand.navy900,
  railLine: 'rgba(255, 255, 255, 0.08)',
  tabActiveInk: brand.gold400,
  heroBg: brand.navy800,
  heroLine: 'rgba(255, 255, 255, 0.14)',
  homeHero: {
    heroChipBg: 'rgba(255, 255, 255, 0.12)',
    heroUpBg: brand.gold500,
    heroUpInk: '#14181f',
    figure: brand.gold400,
  },
  brandMarkFill: brand.navy800,
  emberSymbol: '#f0a068',
  pressOverlay: 'rgba(242, 245, 250, 0.08)',
  backdrop: 'rgba(0, 0, 0, 0.6)',
};

/**
 * The launch screen, which follows the phone's light or dark setting (the native splash shows
 * before the app can read the in-app theme choice). `bg` must match the expo-splash-screen colours
 * in app.json exactly, so the hand-off from the native splash is invisible.
 */
export interface LaunchPalette {
  bg: string;
  /** Radial glow behind DouDou as [offset 0-1, colour, opacity] stops, centred just above the middle. */
  glow: readonly (readonly [number, string, number])[];
  ground: string;
  ink: string;
  muted: string;
  /** Dark gold edge on the bean, needed only on the pale light glow. */
  outline: boolean;
}

export const launchPalettes: Record<'light' | 'dark', LaunchPalette> = {
  light: {
    bg: '#f6f7fa',
    glow: [[0, brand.gold500, 0.22], [0.34, brand.gold500, 0.09], [0.72, brand.gold500, 0]],
    ground: 'rgba(0, 29, 61, 0.12)',
    ink: brand.navy900,
    muted: '#4d5a6b',
    outline: true,
  },
  dark: {
    bg: '#212226',
    // A lighter navy pool of light, as on the app icon; gold over deep navy turns muddy.
    glow: [[0, '#1f5a99', 0.5], [0.34, brand.navy800, 0.32], [0.72, brand.navy800, 0]],
    ground: 'rgba(0, 0, 0, 0.35)',
    ink: '#f2f5fa',
    muted: '#b6c2d2',
    outline: false,
  },
};

/** The line under "FireBuddy" on the launch screen. */
export const BRAND_TAGLINE = 'Small steps to financial freedom';

export const radii = {
  chip: 6,
  control: 10,
  tile: 12,
  card: 16,
  drawer: 18,
  pill: 999,
  addTile: 28,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  huge: 36,
} as const;

export const layout = {
  topbar: 60,
  tabBar: 64,
  addTile: { size: 56 },
  touch: 48,
  touchCompact: 44,
  gutter: 18,
  cardPad: 18,
} as const;

/** Exact family names registered by the Google font packages. Android cannot synthesise weights. */
export const fonts = {
  display: {
    medium: 'BricolageGrotesque_500Medium',
    semibold: 'BricolageGrotesque_600SemiBold',
    bold: 'BricolageGrotesque_700Bold',
  },
  body: {
    regular: 'SchibstedGrotesk_400Regular',
    medium: 'SchibstedGrotesk_500Medium',
    semibold: 'SchibstedGrotesk_600SemiBold',
    bold: 'SchibstedGrotesk_700Bold',
  },
} as const;

// Only the display face gets tabular figures: Schibsted's static instances space punctuation
// too widely under `tnum`, so body amounts stay proportional.
const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/** Type scale. Figures use the display face; prose uses the body face. */
export const type = {
  greeting: { fontFamily: fonts.display.semibold, fontSize: 24, lineHeight: 28, letterSpacing: -0.5 },
  pageTitle: { fontFamily: fonts.display.semibold, fontSize: 22, lineHeight: 26, letterSpacing: -0.5 },
  heroFigure: { fontFamily: fonts.display.semibold, fontSize: 34, lineHeight: 38, letterSpacing: -0.8, ...tabular },
  balance: { fontFamily: fonts.display.semibold, fontSize: 40, lineHeight: 44, letterSpacing: -1, ...tabular },
  metric: { fontFamily: fonts.display.semibold, fontSize: 22, lineHeight: 26, letterSpacing: -0.4, ...tabular },
  cardTitle: { fontFamily: fonts.display.semibold, fontSize: 17, lineHeight: 21, letterSpacing: -0.2 },
  sheetTitle: { fontFamily: fonts.display.semibold, fontSize: 18, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.body.medium, fontSize: 15, lineHeight: 22 },
  bodySemibold: { fontFamily: fonts.body.semibold, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: fonts.body.regular, fontSize: 13.5, lineHeight: 19 },
  label: { fontFamily: fonts.body.semibold, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.body.semibold, fontSize: 11.5, lineHeight: 16, letterSpacing: 0.7, textTransform: 'uppercase' as const },
  caption: { fontFamily: fonts.body.regular, fontSize: 12.5, lineHeight: 17 },
  captionMedium: { fontFamily: fonts.body.medium, fontSize: 12.5, lineHeight: 17 },
  tabLabel: { fontFamily: fonts.body.semibold, fontSize: 11, lineHeight: 14 },
  amount: { fontFamily: fonts.body.semibold, fontSize: 15, lineHeight: 20 },
  amountSmall: { fontFamily: fonts.body.semibold, fontSize: 13.5, lineHeight: 18 },
  button: { fontFamily: fonts.body.semibold, fontSize: 15, lineHeight: 20 },
  buttonCompact: { fontFamily: fonts.body.semibold, fontSize: 13.5, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export interface Shadows {
  card: ViewStyle;
  md: ViewStyle;
  lg: ViewStyle;
  /** The gold Add tile's soft glow. */
  goldGlow: ViewStyle;
  /** iOS-only upward shadow for the tab bar; Android relies on the hairline. */
  barUp: ViewStyle;
}

export function shadows(scheme: 'light' | 'dark'): Shadows {
  const shadowColor = scheme === 'dark' ? '#000000' : '#001d3d';
  const strength = scheme === 'dark' ? 1.8 : 1;
  return {
    // Cards are flat on the single-colour canvas; the hairline border does the separating.
    card: {
      shadowColor,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
    md: {
      shadowColor,
      shadowOpacity: 0.18 * strength,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    lg: {
      shadowColor,
      shadowOpacity: 0.28 * strength,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
      elevation: 12,
    },
    goldGlow: {
      shadowColor: brand.gold500,
      shadowOpacity: scheme === 'dark' ? 0.35 : 0.55,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    barUp: Platform.select<ViewStyle>({
      ios: {
        shadowColor,
        shadowOpacity: 0.12 * strength,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -6 },
      },
      default: {},
    }) ?? {},
  };
}

/** Category colour at a tinted alpha for icon tiles, e.g. "#3987E5" -> "#3987E52e". */
export function tint(hex: string, alpha: number) {
  const clamped = Math.round(Math.min(Math.max(alpha, 0), 1) * 255);
  const suffix = clamped.toString(16).padStart(2, '0');
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${suffix}` : hex;
}
