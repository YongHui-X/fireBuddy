import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/schibsted-grotesk';
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { Toast } from '@/components/ui/Toast';
import { FireBuddyStoreProvider, useFireBuddy } from '@/lib/fire-buddy-store';
import { toNavigationTheme } from '@/lib/navigation-theme';
import { ThemeProvider, useTheme } from '@/lib/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    SchibstedGrotesk_400Regular,
    SchibstedGrotesk_500Medium,
    SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_700Bold,
  });

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <FireBuddyStoreProvider>
            <AppShell ready={fontsLoaded || Boolean(fontError)} />
          </FireBuddyStoreProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Holds the splash until fonts and the stored theme and data are in, so the first frame is the finished shell. */
function AppShell({ ready }: { ready: boolean }) {
  const { theme, scheme, hydrated: themeHydrated } = useTheme();
  const { hydrated: storeHydrated, notification, dismissNotification } = useFireBuddy();
  const navigationTheme = useMemo(() => toNavigationTheme(theme, scheme), [theme, scheme]);
  const allReady = ready && themeHydrated && storeHydrated;

  useEffect(() => {
    if (allReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [allReady]);

  if (!allReady) {
    return null;
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-transaction" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="coming-soon" options={{ presentation: 'card', animation: 'slide_from_right' }} />
      </Stack>
      {/* The forest topbar always sits under the status bar, so its icons stay light in both themes. */}
      <StatusBar style="light" translucent />
      <Toast message={notification?.message ?? null} onDismiss={dismissNotification} />
    </NavigationThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
