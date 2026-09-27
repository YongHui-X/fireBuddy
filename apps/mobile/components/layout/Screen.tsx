import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { AppTopbar } from '../navigation/AppTopbar';

export interface ScreenProps {
  /** Renders the forest topbar. Off for stacked routes, which draw their own status-bar inset. */
  topbar?: boolean;
  /** Wraps children in a ScrollView. Off when the screen owns a list that scrolls. */
  scroll?: boolean;
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
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  return {
    top: insets.top,
    bottom: insets.bottom,
    contentBottom: spacing.xxl + (tabBarHeight > 0 ? 0 : insets.bottom),
    horizontal: layout.gutter,
  };
}

export function Screen({ topbar = true, scroll = true, contentStyle, children }: ScreenProps) {
  const { theme } = useTheme();
  const insets = useScreenInsets();
  const content = [styles.content, { paddingBottom: insets.contentBottom }, contentStyle];

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      {topbar ? <AppTopbar /> : <View style={{ height: insets.top }} />}
      <View style={[styles.canvasTint, { backgroundColor: theme.bgTop }]} pointerEvents="none" />
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={content}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
        >
          {children}
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
  canvasTint: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 220,
    opacity: 0.7,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  staticContent: {
    minHeight: 0,
  },
});
