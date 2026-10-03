import type { ExpenseSeriesPoint } from '@firebuddy/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { fonts, radii, spacing } from '@/constants/tokens';
import { usePrivacy } from '@/lib/privacy';
import { useTheme } from '@/lib/theme';

import { AppText } from '../ui/Text';

export interface TrendChartProps {
  points: readonly ExpenseSeriesPoint[];
  /** Mean per bucket, drawn as a dashed reference line. */
  average: number;
  height?: number;
  /** Describes one bar for the selection readout, e.g. "Mon 29 Sep". */
  describePeriod: (point: ExpenseSeriesPoint) => string;
}

const compact = (value: number) => (value >= 1000 ? `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : `$${Math.round(value)}`);

/**
 * The web's expense area chart as bars, which read better at phone width and give each day a
 * tappable target. Tapping a bar reads its total out above the chart, replacing the hover tooltip.
 * While amounts are hidden the bars collapse to a flat baseline so the shape reveals nothing.
 */
export function TrendChart({ points, average, height = 170, describePeriod }: TrendChartProps) {
  const { theme } = useTheme();
  const { money, hidden } = usePrivacy();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const pad = { top: 10, right: 6, bottom: 22, left: 6 };
  const plotW = Math.max(width - pad.left - pad.right, 1);
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...points.map((point) => point.expenses), average, 1);
  const slot = plotW / Math.max(points.length, 1);
  const barW = Math.min(Math.max(slot * 0.62, 3), 28);
  const y = (value: number) => pad.top + (1 - value / max) * plotH;
  // A selection left over from a previous range matches nothing and counts as no selection.
  const active = points.find((point) => point.period === selected) ?? null;
  const activeKey = active ? selected : null;
  // Label every bar when there is room; otherwise about seven evenly spaced ones, always including the last.
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));
  const showLabel = (index: number) => index === points.length - 1 || (index % labelEvery === 0 && points.length - 1 - index >= labelEvery / 2);

  return (
    <View style={styles.wrap}>
      <View style={[styles.readout, { backgroundColor: theme.surface2 }]}>
        {active ? (
          <>
            <AppText variant="caption" tone="ink2">{describePeriod(active)}</AppText>
            <AppText variant="metric">{money(active.expenses, 0)}</AppText>
          </>
        ) : (
          <>
            <AppText variant="caption" tone="ink2">{points.length ? 'Average per period' : 'No expenses in this range'}</AppText>
            <AppText variant="metric">{points.length ? money(average, 0) : '—'}</AppText>
          </>
        )}
      </View>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 && points.length ? (
          <>
            <Svg width={width} height={height} accessibilityRole="image" accessibilityLabel="Expense totals over the selected range">
              <Line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke={theme.lineStrong} strokeWidth={1} />
              {!hidden && average > 0 ? (
                <Line x1={pad.left} x2={width - pad.right} y1={y(average)} y2={y(average)} stroke={theme.ink3} strokeWidth={1} strokeDasharray="4 4" />
              ) : null}
              {points.map((point, index) => {
                const x = pad.left + index * slot + (slot - barW) / 2;
                const barH = hidden ? 3 : Math.max((point.expenses / max) * plotH, point.expenses > 0 ? 2 : 0);
                const isActive = point.period === activeKey;
                const dimmed = activeKey !== null && !isActive;
                return (
                  <Rect
                    key={point.period}
                    x={x}
                    y={y(0) - barH}
                    width={barW}
                    height={barH}
                    rx={Math.min(barW / 2, 4)}
                    fill={hidden ? theme.surface3 : isActive ? theme.accentText : theme.accent}
                    opacity={dimmed ? 0.4 : 1}
                  />
                );
              })}
              {points.map((point, index) => showLabel(index) ? (
                <SvgText key={`label-${point.period}`} x={pad.left + index * slot + slot / 2} y={height - 6} fontSize={11} fontFamily={fonts.body.regular} fill={theme.ink3} textAnchor="middle">
                  {point.label}
                </SvgText>
              ) : null)}
              {!hidden ? (
                <SvgText x={width - pad.right} y={pad.top + 9} fontSize={10} fontFamily={fonts.body.regular} fill={theme.ink3} textAnchor="end">{compact(max)}</SvgText>
              ) : null}
            </Svg>
            {/* Full-height touch columns, so even a tiny bar is easy to hit. */}
            <View style={[StyleSheet.absoluteFill, styles.hitRow, { paddingLeft: pad.left, paddingRight: pad.right, paddingBottom: pad.bottom }]} pointerEvents="box-none">
              {points.map((point) => (
                <Pressable
                  key={`hit-${point.period}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${describePeriod(point)}: ${money(point.expenses, 0)}`}
                  accessibilityState={{ selected: point.period === activeKey }}
                  onPress={() => setSelected((current) => (current === point.period ? null : point.period))}
                  style={styles.hit}
                />
              ))}
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  readout: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.tile,
    gap: 1,
    minWidth: 150,
  },
  hitRow: {
    flexDirection: 'row',
  },
  hit: {
    flex: 1,
  },
});
