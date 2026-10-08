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
import { Stack, ThemeProvider as NavigationThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { LaunchScreen } from '@/components/brand/LaunchScreen';
import { TourOverlay } from '@/components/tour/TourOverlay';
import { LegalNotice, useLegalNoticePending } from '@/components/profile/LegalNotice';
import { ReminderPrompt } from '@/components/profile/ReminderPrompt';
import { TourProvider } from '@/components/tour/TourProvider';
import { Toast } from '@/components/ui/Toast';
import { AiPreferenceProvider, useAiPreference } from '@/lib/ai-preference';
import { FireBuddyStoreProvider, useFireBuddy } from '@/lib/fire-buddy-store';
import { finishLaunch } from '@/lib/launch-state';
import { toNavigationTheme } from '@/lib/navigation-theme';
import { PrivacyProvider, usePrivacy } from '@/lib/privacy';
import { useDailyReminderSync } from '@/lib/daily-reminder';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { UserProfileProvider, useUserProfile } from '@/lib/user-profile';

/** A render error shows Expo Router's recovery screen with a Retry button instead of a blank app. */
export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Longest the launch screen waits for the custom fonts before showing the app anyway. */
const FONT_WAIT_MS = 5000;

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

  // Fonts normally load in well under a second. If they stall (seen in a backgrounded browser tab),
  // carry on with the system font rather than hold the launch screen forever.
  const [fontWaitOver, setFontWaitOver] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFontWaitOver(true), FONT_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <FireBuddyStoreProvider>
            <UserProfileProvider>
              <PrivacyProvider>
                <AiPreferenceProvider>
                  <TourProvider>
                    <AppShell ready={fontsLoaded || Boolean(fontError) || fontWaitOver} />
                  </TourProvider>
                </AiPreferenceProvider>
              </PrivacyProvider>
            </UserProfileProvider>
          </FireBuddyStoreProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Holds the launch screen until fonts, the stored theme, data and the privacy choice are in, so the
 * app it reveals is the finished shell. `LaunchScreen` hides the native splash and plays the intro.
 */
function AppShell({ ready }: { ready: boolean }) {
  const { theme, scheme, hydrated: themeHydrated } = useTheme();
  const { hydrated: storeHydrated, notification, dismissNotification } = useFireBuddy();
  const { hydrated: privacyHydrated } = usePrivacy();
  const { hydrated: aiHydrated } = useAiPreference();
  const { hydrated: profileHydrated, welcomedAt } = useUserProfile();
  const router = useRouter();
  const navigationTheme = useMemo(() => toNavigationTheme(theme, scheme), [theme, scheme]);
  const allReady = ready && themeHydrated && storeHydrated && privacyHydrated && aiHydrated && profileHydrated;
  // Development only: names the startup step still pending if the launch screen ever hangs.
  useEffect(() => {
    if (!__DEV__ || allReady) return;
    console.log(`[launch] waiting: fonts=${ready} theme=${themeHydrated} store=${storeHydrated} privacy=${privacyHydrated} ai=${aiHydrated} profile=${profileHydrated}`);
  }, [allReady, ready, themeHydrated, storeHydrated, privacyHydrated, aiHydrated, profileHydrated]);
  const [launching, setLaunching] = useState(true);
  // Stable, so the launch screen's effect never restarts the intro.
  const endLaunch = useCallback(() => setLaunching(false), []);
  useDailyReminderSync();
  const legalPending = useLegalNoticePending();

  // After the launch layer is gone and the app's StatusBar has mounted, let screens such as Home
  // apply their own status bar style; this runs after the children's effects, so it wins.
  useEffect(() => {
    if (!launching) finishLaunch();
  }, [launching]);

  // First run: open the welcome under the launch intro as soon as the app mounts, so the intro
  // fades straight into DouDou's question with no flash of Home. Once per un-welcomed spell: the
  // guard re-arms when a welcome finishes, so Profile's "Start fresh" (which clears welcomedAt)
  // brings the welcome back exactly once. This is the only place that opens it.
  const welcomeOpened = useRef(false);
  useEffect(() => {
    if (welcomedAt) {
      welcomeOpened.current = false;
      return;
    }
    if (!allReady || welcomeOpened.current) return;
    // Wait a frame so the Stack has mounted before pushing onto it.
    const frame = requestAnimationFrame(() => {
      welcomeOpened.current = true;
      router.push('/welcome');
    });
    return () => cancelAnimationFrame(frame);
  }, [allReady, welcomedAt, router]);

  return (
    <>
      {allReady ? (
        <NavigationThemeProvider value={navigationTheme}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="add-transaction" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
            <Stack.Screen name="wealth" options={{ presentation: 'card', animation: 'slide_from_right' }} />
            <Stack.Screen name="fire-planner" options={{ presentation: 'card', animation: 'slide_from_right' }} />
            <Stack.Screen name="fire-plan-edit" options={{ presentation: 'card', animation: 'slide_from_right' }} />
            <Stack.Screen name="insights" options={{ presentation: 'card', animation: 'slide_from_right' }} />
            <Stack.Screen name="accounts" options={{ presentation: 'card', animation: 'slide_from_right' }} />
            <Stack.Screen name="plan" options={{ presentation: 'card', animation: 'slide_from_right' }} />
            <Stack.Screen name="ember" options={{ presentation: 'card', animation: 'slide_from_right' }} />
            <Stack.Screen name="legal" options={{ presentation: 'card', animation: 'slide_from_right' }} />
            <Stack.Screen name="welcome" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
          </Stack>
          <TourOverlay />
          <LegalNotice hidden={launching} />
          {/* One prompt at a time: the updated-terms notice goes first. */}
          <ReminderPrompt hidden={launching || legalPending} />
          {/* Screens start with the canvas colour under the status bar, so its icons follow the theme. The launch screen sets its own until it goes. */}
          {launching ? null : <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />}
          <Toast message={notification?.message ?? null} onDismiss={dismissNotification} />
        </NavigationThemeProvider>
      ) : null}
      {launching ? <LaunchScreen ready={allReady} onDone={endLaunch} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
