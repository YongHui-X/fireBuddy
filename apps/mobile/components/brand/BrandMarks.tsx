import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/lib/theme';

interface MarkProps {
  size?: number;
}

/**
 * FireBuddy's primary mark: an early sun resting on the horizon. Ported from the web
 * `BrandMarks.tsx`; colours follow the active theme so the tile reads on the rail and the canvas.
 */
export function FireBuddyMark({ size = 36 }: MarkProps) {
  const { theme } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Rect width="48" height="48" rx="13" fill={theme.brandMarkFill} />
      <Path d="M13 28a11 11 0 0 1 22 0Z" fill={theme.brandMarkSun} />
      <Path d="M24 9v4M11 14l3 3M37 14l-3 3" stroke={theme.brandMarkLine} strokeWidth={3.4} strokeLinecap="round" />
      <Path d="M9 33h30" stroke={theme.brandMarkLine} strokeWidth={5} strokeLinecap="round" />
    </Svg>
  );
}

/** Secondary "Ascent" mark: rising steps toward a lime landing. Steps take the given colour. */
export function AscentMark({ size = 24, color }: MarkProps & { color?: string }) {
  const { theme } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path d="M9 38h10V28h10V18h9" stroke={color ?? theme.ink} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx="39" cy="11" r="6" fill={theme.brandMarkSun} />
    </Svg>
  );
}

/** Ember, the assistant, keeps a small warm spark subordinate to the FireBuddy mark. */
export function EmberMark({ size = 24, color }: MarkProps & { color?: string }) {
  const { theme } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path
        d="M14 3c.9 5.6 5.4 10.1 11 11-5.6.9-10.1 5.4-11 11-.9-5.6-5.4-10.1-11-11 5.6-.9 10.1-5.4 11-11Z"
        fill={color ?? theme.emberSymbol}
      />
    </Svg>
  );
}
