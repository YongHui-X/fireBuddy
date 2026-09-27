import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { darkTheme, lightTheme, shadows, type Shadows, type Theme } from '@/constants/tokens';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

/** Same key the web app uses, so the name reads consistently in storage tooling. */
export const THEME_STORAGE_KEY = 'firebuddy_theme_v1';

interface ThemeContextValue {
  theme: Theme;
  scheme: ColorScheme;
  shadows: Shadows;
  preference: ThemePreference;
  hydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** Resolves the active palette from the stored preference and the OS scheme, and keeps the system bars in step. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && isPreference(stored)) setPreferenceState(stored);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scheme: ColorScheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    // Paints behind modals and during rotation so there is never a white flash in dark mode.
    SystemUI.setBackgroundColorAsync(theme.bg).catch(() => undefined);
    if (Platform.OS === 'android') {
      // Under edge-to-edge the bar is transparent; only the button glyph colour is ours to set.
      NavigationBar.setButtonStyleAsync(scheme === 'dark' ? 'light' : 'dark').catch(() => undefined);
    }
  }, [scheme, theme.bg]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const toggle = useCallback(() => {
    setPreference(scheme === 'dark' ? 'light' : 'dark');
  }, [scheme, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, scheme, shadows: shadows(scheme), preference, hydrated, setPreference, toggle }),
    [theme, scheme, preference, hydrated, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
