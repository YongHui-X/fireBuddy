import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { layout, radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

/**
 * The navy hero band for list screens that cannot use `Screen`'s `hero` (their list owns the
 * scrolling), such as Transactions. Put it first in the list header: it bleeds past the list's
 * gutter and top padding so it meets the status bar, which the screen paints navy with
 * `<Screen heroTop>`. Copy inside uses the `hero` tones. Its foot matches Home: the canvas
 * curves up into the navy, not the navy down into the canvas.
 */
export function HeroBand({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return (
    <View>
      <View style={[styles.band, { backgroundColor: theme.heroBg }, style]}>{children}</View>
      {/* The canvas rises over the band with rounded top corners, like Home's hero (Screen's contentAfterHero). */}
      <View style={[styles.cap, { backgroundColor: theme.bg }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    // Cancels the list's horizontal gutter and top padding (layout.gutter, spacing.xl).
    marginHorizontal: -layout.gutter,
    marginTop: -spacing.xl,
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.lg,
    // Extra bottom room is hidden under the canvas cap's rounded top edge.
    paddingBottom: spacing.xl + radii.addTile,
    gap: spacing.lg,
  },
  cap: {
    marginHorizontal: -layout.gutter,
    marginTop: -radii.addTile,
    height: radii.addTile,
    borderTopLeftRadius: radii.addTile,
    borderTopRightRadius: radii.addTile,
  },
});
