import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from 'expo-router';

import { fonts, type Theme } from '@/constants/tokens';

/** React Navigation theme derived from the FireBuddy palette, so no screen flashes the template colours. */
export function toNavigationTheme(theme: Theme, scheme: 'light' | 'dark'): NavigationTheme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: scheme === 'dark',
    colors: {
      ...base.colors,
      primary: theme.accentText,
      background: theme.bg,
      card: theme.surface,
      text: theme.ink,
      border: theme.line,
      notification: theme.expense,
    },
    fonts: {
      regular: { fontFamily: fonts.body.regular, fontWeight: '400' },
      medium: { fontFamily: fonts.body.medium, fontWeight: '500' },
      bold: { fontFamily: fonts.body.bold, fontWeight: '700' },
      heavy: { fontFamily: fonts.display.bold, fontWeight: '700' },
    },
  };
}
