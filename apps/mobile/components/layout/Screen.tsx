import { useFocusEffect, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { layout, radii, spacing, type Theme } from '@/constants/tokens';
import { useLaunchFinished } from '@/lib/launch-state';
import { ThemeScope, useTheme } from '@/lib/theme';
import { useTour } from '@/components/tour/TourProvider';

export interface ScreenProps {
  /** Wraps children in a ScrollView. Off when the screen owns a list that scrolls. */
  scroll?: boolean;
  /**
   * A navy region painted edge to edge above the content, behind the status bar. Home uses it
   * for the greeting, net worth and shortcuts. Scrolling screens only.
   */
  hero?: ReactNode;
  /** Tokens that replace the theme inside the hero, such as Home's own palette (`theme.homeHero`). */
  heroTheme?: Partial<Theme>;
  /** For list screens whose first row is a `HeroBand`: paints the status bar area navy and sets its icons to match. */
  heroTop?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** A change scrolls back to the top, such as moving to the next step of a form. */
  scrollKey?: string | number;
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

/** Every screen starts with a status-bar inset in the canvas colour, or in the hero colour when it carries a hero. */
export function Screen({ scroll = true, hero, heroTheme, heroTop = false, contentStyle, scrollKey, children }: ScreenProps) {
  const { theme } = useTheme();
  // The tour spotlights controls near the top, so it always starts there and the page holds still
  // until it ends; a page left scrolled down would push step 2 off the top of the screen.
  const { active: touring } = useTour();
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (touring) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [touring]);
  useEffect(() => {
    if (scrollKey !== undefined) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollKey]);
  const heroColors = heroTheme ? { ...theme, ...heroTheme } : theme;
  const insets = useScreenInsets();
  const content = [styles.content, { paddingBottom: insets.contentBottom }, contentStyle];

  // The hero sits under the status bar, so its icons follow the hero (light on navy) while this screen is in
  // front. A mounted StatusBar sits on top of the root one and pops off when the screen leaves;
  // it waits for the launch screen, which owns the status bar until it has gone.
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const launchFinished = useLaunchFinished();
  const heroStatusBar = (Boolean(hero) || heroTop) && focused && launchFinished;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      {heroStatusBar ? <StatusBar style={heroColors.heroStatusBar} /> : null}
      <View style={{ height: insets.top, backgroundColor: hero || heroTop ? heroColors.heroBg : theme.bg }} />
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          scrollEnabled={!touring}
          style={styles.scroll}
          contentContainerStyle={hero ? styles.scrollWithHero : content}
          keyboardShouldPersistTaps="handled"
          // iOS scrolls the focused field above the keyboard, so a field near the bottom (such as
          // "PR since") stays visible while typing; Android resizes the window instead.
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
        >
          {hero ? (
            <>
              <View style={[styles.hero, { backgroundColor: heroColors.heroBg }]}>
                {/* Keeps the hero colour behind an iOS overscroll instead of showing the canvas. */}
                <View style={[styles.heroBleed, { backgroundColor: heroColors.heroBg }]} />
                <HeroGlow colors={heroColors} />
                <ThemeScope overrides={heroTheme}>{hero}</ThemeScope>
              </View>
              {/* The canvas rises over the hero with rounded top corners, so the curve bends toward the hero. */}
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

/** The hero's soft radial glows: one from the top right, one from the bottom left. Draws nothing at opacity 0. */
function HeroGlow({ colors }: { colors: Theme }) {
  if (!colors.heroGlowOpacity && !colors.heroGlow2Opacity) return null;
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="heroGlow" cx="100%" cy="0%" rx="85%" ry="70%">
          <Stop offset="0" stopColor={colors.heroGlow} stopOpacity={colors.heroGlowOpacity} />
          <Stop offset="1" stopColor={colors.heroGlow} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="heroGlow2" cx="0%" cy="100%" rx="70%" ry="60%">
          <Stop offset="0" stopColor={colors.heroGlow2} stopOpacity={colors.heroGlow2Opacity} />
          <Stop offset="1" stopColor={colors.heroGlow2} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {colors.heroGlow2Opacity ? <Rect width="100%" height="100%" fill="url(#heroGlow2)" /> : null}
      {colors.heroGlowOpacity ? <Rect width="100%" height="100%" fill="url(#heroGlow)" /> : null}
    </Svg>
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
