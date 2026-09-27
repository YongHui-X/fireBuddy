import { formatSGD, layoutDonutSegments, type SpendingBreakdownRow } from '@firebuddy/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/lib/theme';

import { AppText } from '../ui/Text';

export interface DonutChartProps {
  data: readonly SpendingBreakdownRow[];
  total: number;
  size?: number;
  periodLabel: string;
}

/**
 * Spending donut using the web's own segment maths. On touch a tap replaces the hover tooltip:
 * the selected slice reads out in the centre, so nothing lands under the thumb.
 */
export function DonutChart({ data, total, size = 200, periodLabel }: DonutChartProps) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const center = size / 2;
  const outer = size / 2 - 4;
  const inner = outer * 0.64;
  const segments = layoutDonutSegments(data, (row) => row.amount, { centerX: center, centerY: center, innerRadius: inner, outerRadius: outer, gapDegrees: 2.5 });
  const active = data.find((row) => row.name === selected) ?? null;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} accessibilityRole="image" accessibilityLabel={`${periodLabel} spending by category`}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.length === 0 ? <Circle cx={center} cy={center} r={(outer + inner) / 2} stroke={theme.surface2} strokeWidth={outer - inner} fill="none" /> : null}
        {segments.map((segment) => {
          const dimmed = selected !== null && segment.item.name !== selected;
          return (
            <Path
              key={segment.item.name}
              d={segment.path}
              fill={segment.item.color}
              opacity={dimmed ? 0.35 : 1}
              onPress={() => setSelected((current) => (current === segment.item.name ? null : segment.item.name))}
            />
          );
        })}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {active ? (
          <>
            <AppText variant="caption" tone="ink2" align="center" numberOfLines={1}>{active.name}</AppText>
            <AppText variant="metric" align="center">{formatSGD(active.amount, 0)}</AppText>
            <AppText variant="caption" tone="ink3" align="center">{Math.round(active.share * 100)}%</AppText>
          </>
        ) : (
          <>
            <AppText variant="caption" tone="ink2" align="center">Total</AppText>
            <AppText variant="metric" align="center">{formatSGD(total, 0)}</AppText>
            <AppText variant="caption" tone="ink3" align="center">Tap a slice</AppText>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 1,
  },
});
