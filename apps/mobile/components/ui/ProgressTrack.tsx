import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii } from '@/constants/tokens';
import { usePrivacy } from '@/lib/privacy';
import { useTheme } from '@/lib/theme';

export interface ProgressTrackProps {
  /** 0..1, values above 1 fill the track and switch to the over-budget colour unless `color` is fixed. */
  value: number;
  color?: string;
  /** The unfilled track; defaults to the muted surface. Pass `theme.heroLine` on a navy hero. */
  trackColor?: string;
  height?: number;
  /** Forces the fill colour even when over 1. */
  keepColorWhenOver?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Budget and FI progress bar: a muted track with a rounded fill that turns to the expense colour
 * when overspent. While amounts are hidden the fill is empty, so a bar cannot give away the ratio
 * its masked label no longer states.
 */
export function ProgressTrack({ value, color, trackColor, height = 8, keepColorWhenOver = false, accessibilityLabel, style }: ProgressTrackProps) {
  const { theme } = useTheme();
  const { hidden } = usePrivacy();
  const clamped = hidden ? 0 : Math.min(Math.max(value, 0), 1);
  const over = !hidden && value > 1 && !keepColorWhenOver;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor ?? theme.surface2 }, style]}
    >
      <View style={[styles.fill, { width: `${clamped * 100}%`, borderRadius: height / 2, backgroundColor: over ? theme.expense : color ?? theme.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radii.pill,
  },
  fill: {
    height: '100%',
  },
});
