import { useFocusEffect, useSegments } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

export interface ScreenProps {
  /** Wraps children in a ScrollView. Off when the screen owns a list that scrolls. */
  scroll?: boolean;
  /**
   * A forest region painted edge to edge above the content, behind the status bar. Home uses it
   * for the greeting, net worth and shortcuts. Scrolling screens only.
   */
  hero?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * Bottom padding every screen needs so its last card clears the tab bar and the system bars.
 * The custom tab bar sits in normal layout flow, so only its absolute-positioned fallback adds
 * height here; without a tab bar, the home-indicator inset applies directly.
 */
export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const insideTabs = segments[0] === '(tabs)';
  return {
    top: insets.top,
    bottom: insets.bottom,
    contentBottom: spacing.xxl + (insideTabs ? 0 : insets.bottom),
    horizontal: layout.gutter,
  };
}

/** Every screen starts with a status-bar inset in the canvas colour, or in forest when it carries a hero. */
export function Screen({ scroll = true, hero, contentStyle, children }: ScreenProps) {
  const { theme, scheme } = useTheme();
  const insets = useScreenInsets();
  const content = [styles.content, { paddingBottom: insets.contentBottom }, contentStyle];

  // The forest hero sits under the status bar, so its icons go light while this screen is in
  // front and return to the theme's style when it leaves. Keyed on whether a hero exists, not
  // the node itself, so a re-render never re-runs the effect.
  const hasHero = Boolean(hero);
  useFocusEffect(
    useCallback(() => {
      if (!hasHero) return undefined;
      setStatusBarStyle('light');
      return () => setStatusBarStyle(scheme === 'dark' ? 'light' : 'dark');
    }, [hasHero, scheme]),
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={{ height: insets.top, backgroundColor: hero ? theme.heroBg : theme.bg }} />
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={hero ? styles.scrollWithHero : content}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
        >
          {hero ? (
            <>
              <View style={[styles.hero, { backgroundColor: theme.heroBg }]}>
                {/* Keeps the forest behind an iOS overscroll instead of showing the canvas. */}
                <View style={[styles.heroBleed, { backgroundColor: theme.heroBg }]} />
                {hero}
              </View>
              {/* The canvas rises over the forest with rounded top corners, so the curve bends toward the hero. */}
              <View style={[content, styles.contentAfterHero, { backgroundColor: theme.bg }]}>{children}</View>
            </>
          ) : children}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, styles.staticContent]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  scrollWithHero: {
    flexGrow: 0,
  },
  hero: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.lg,
    // Extra bottom room is hidden under the canvas's rounded top edge.
    paddingBottom: spacing.xxxl + radii.addTile,
    gap: spacing.xl,
  },
  heroBleed: {
    position: 'absolute',
    top: -1000,
    left: 0,
    right: 0,
    height: 1000,
  },
  contentAfterHero: {
    marginTop: -radii.addTile,
    paddingTop: spacing.xxl,
    borderTopLeftRadius: radii.addTile,
    borderTopRightRadius: radii.addTile,
  },
  staticContent: {
    minHeight: 0,
  },
});
