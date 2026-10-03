import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * FireBuddy design tokens for the native app. The palette mirrors `apps/web/src/styles/tokens.css`
 * (forest and lime, lime kept for the single primary action), but the phone canvas is flat: one
 * background colour edge to edge, hairline-bordered flat cards instead of shadowed paper on a
 * tinted canvas, and a single forest accent card per screen. Figures sit directly on the canvas.
 */

export const brand = {
  forest900: '#0f251c',
  forest800: '#163a2c',
  forest700: '#1f4d3a',
  forest600: '#2b6a4f',
  forest500: '#3a8362',
  forest300: '#9fc4ad',
  forest100: '#dcebe0',
  forest50: '#eef4ee',
  lime500: '#cbea63',
  lime600: '#b9dc47',
  lime700: '#5f7d12',
} as const;

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
  heroBg: string;
  heroInk: string;
  heroInkMuted: string;
  heroLine: string;
  brandMarkFill: string;
  brandMarkSun: string;
  brandMarkLine: string;
  emberSymbol: string;
  /** 8% ink wash laid over a pressed control. */
  pressOverlay: string;
  backdrop: string;
}

export const lightTheme: Theme = {
  bg: '#f2f4ec',
  surface: '#ffffff',
  surface2: '#f1f4ec',
  surface3: '#e4e9de',
  ink: '#14231c',
  ink2: '#56655c',
  ink3: '#6b7a71',
  line: '#dde2d6',
  lineStrong: '#c3ccbd',
  primary: brand.lime500,
  primaryHover: brand.lime600,
  onPrimary: '#14231c',
  accent: brand.forest600,
  accentSoft: brand.forest50,
  accentText: brand.forest700,
  focusRing: brand.forest600,
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
  chartProjection: '#35678a',
  railBg: brand.forest800,
  railInk: '#eef4ee',
  railInkMuted: '#a9c3b3',
  railLine: 'rgba(255, 255, 255, 0.1)',
  railHoverBg: 'rgba(255, 255, 255, 0.06)',
  railActiveBg: 'rgba(203, 234, 99, 0.14)',
  railActiveInk: brand.lime500,
  heroBg: brand.forest800,
  heroInk: '#ffffff',
  heroInkMuted: '#b7cfc0',
  heroLine: 'rgba(255, 255, 255, 0.14)',
  brandMarkFill: brand.forest800,
  brandMarkSun: brand.lime500,
  brandMarkLine: '#ffffff',
  emberSymbol: '#d9782d',
  pressOverlay: 'rgba(20, 35, 28, 0.08)',
  backdrop: 'rgba(15, 37, 28, 0.45)',
};

export const darkTheme: Theme = {
  ...lightTheme,
  bg: '#0c1712',
  surface: '#132119',
  surface2: '#1b2c22',
  surface3: '#24382c',
  ink: '#edf2ea',
  ink2: '#a9b7ad',
  ink3: '#8a988f',
  line: '#26392e',
  lineStrong: '#375043',
  accent: '#8fd1a8',
  accentSoft: '#1c3226',
  accentText: '#a9e0bc',
  focusRing: brand.lime500,
  income: '#6fd193',
  incomeSoft: '#173225',
  expense: '#f08d7d',
  expenseSoft: '#3c221f',
  danger: '#f08d7d',
  dangerFill: '#d9534a',
  warning: '#e6bd5f',
  warningSoft: '#332a14',
  info: '#86b9da',
  infoSoft: '#17293a',
  chartProjection: '#86b9da',
  railBg: '#0f1e17',
  railLine: 'rgba(255, 255, 255, 0.08)',
  heroBg: '#1d3b2d',
  heroLine: 'rgba(255, 255, 255, 0.12)',
  brandMarkFill: brand.forest700,
  emberSymbol: '#f0a068',
  pressOverlay: 'rgba(237, 242, 234, 0.08)',
  backdrop: 'rgba(0, 0, 0, 0.6)',
};

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
  limeGlow: ViewStyle;
  /** iOS-only upward shadow for the tab bar; Android relies on the hairline. */
  barUp: ViewStyle;
}

export function shadows(scheme: 'light' | 'dark'): Shadows {
  const shadowColor = scheme === 'dark' ? '#000000' : '#14231c';
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
    limeGlow: {
      shadowColor: brand.lime500,
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

/** Category colour at a tinted alpha for icon tiles, e.g. "#3C8A61" -> "#3C8A612e". */
export function tint(hex: string, alpha: number) {
  const clamped = Math.round(Math.min(Math.max(alpha, 0), 1) * 255);
  const suffix = clamped.toString(16).padStart(2, '0');
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${suffix}` : hex;
}
