import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/lib/theme';

import { DoudouMark } from './Doudou';

export { DoudouMark };

interface MarkProps {
  size?: number;
}

/** FireBuddy's primary mark: DouDou the sprout bean on its own, no tile, the same art as the app icon. */
export function FireBuddyMark({ size = 36 }: MarkProps) {
  return <DoudouMark size={size} />;
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
