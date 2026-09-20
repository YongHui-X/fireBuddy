/**
 * The one place breakpoints are named.
 *
 * CSS media queries cannot read custom properties and this app has no PostCSS step, so the
 * stylesheets keep literal pixel values. This map is the JavaScript half of that ladder — keep
 * the two in sync, and keep the comment block at the top of `styles/mobile.css` authoritative.
 *
 *   xs      < 380px    last squeeze: 360dp Androids and the 375pt iPhone SE
 *   base    360-479    the mobile-first default, not a breakpoint
 *   sm      >= 480     large phone, phone landscape
 *   md      >= 600     phablet; two-up tiles become safe
 *   lg      >= 768     tablet portrait; cards return to their full padding
 *   xl      >= 1024    the shell switch: sidebar in, tab bar out
 *   wide    >= 1280    the existing wide dashboard grid
 */
export const mq = {
  xs: '(max-width: 379.98px)',
  sm: '(min-width: 480px)',
  md: '(min-width: 600px)',
  lg: '(min-width: 768px)',
  xl: '(min-width: 1024px)',
  wide: '(min-width: 1280px)',
  emberWide: '(min-width: 1180px)',
  setupWide: '(min-width: 1100px)',
  coarse: '(pointer: coarse)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
} as const;

export type BreakpointName = keyof typeof mq;
