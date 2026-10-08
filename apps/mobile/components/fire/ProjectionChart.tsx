import { monthIndex, type FireCalculationResult } from '@firebuddy/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { fonts, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { AppText } from '../ui/Text';

export interface ProjectionChartProps {
  fire: FireCalculationResult;
  /** Depletion month, when the retirement balance first goes below zero. */
  depletion: string | null;
  peak: number;
  height?: number;
}

const compact = (value: number) => `${value < 0 ? '−' : ''}${Math.abs(value) >= 1e6 ? `$${(Math.abs(value) / 1e6).toFixed(1)}M` : `$${Math.round(Math.abs(value) / 1000)}k`}`;

/**
 * The web's recharts projection rebuilt on react-native-svg: recorded eligible assets and the
 * accumulation curve in the accent colour, retirement drawdown dashed, a vertical retirement
 * line and a dot for the capital required. Negative balances are clipped so the accumulation
 * curve keeps its shape; the depletion month is marked instead. No tooltips on touch; the
 * facts above the chart carry the numbers.
 */
export function ProjectionChart({ fire, depletion, peak, height = 220 }: ProjectionChartProps) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  const plan = fire.plan!;
  const rows = fire.monthlyCashFlows ?? [];
  if (!rows.length) return null;

  const pad = { top: 18, right: 12, bottom: 24, left: 46 };
  const plotW = Math.max(width - pad.left - pad.right, 1);
  const plotH = height - pad.top - pad.bottom;
  const ceiling = Math.max(peak, Number(fire.fiTarget ?? 0), 1) * 1.08;
  const floor = -ceiling * 0.3;
  const actual = fire.actualPath ?? [];
  const startIndex = Math.min(monthIndex(rows[0]!.month), ...actual.map((point) => monthIndex(point.date)));
  const endIndex = monthIndex(rows[rows.length - 1]!.month);
  const span = Math.max(endIndex - startIndex, 1);
  const x = (month: string) => pad.left + ((monthIndex(month) - startIndex) / span) * plotW;
  const y = (value: number) => pad.top + (1 - (Math.max(Math.min(value, ceiling), floor) - floor) / (ceiling - floor)) * plotH;
  const path = (points: { month: string; value: number }[]) => points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.month).toFixed(1)} ${y(point.value).toFixed(1)}`).join(' ');

  // Sample one point per year plus the retirement and final months so the path stays light.
  const sampled = rows.filter((row, index) => index % 12 === 0 || row.month === plan.retirementMonth || index === rows.length - 1);
  const accumulation = sampled.filter((row) => row.phase === 'accumulation' || row.month === plan.retirementMonth).map((row) => ({ month: row.month, value: Number(row.balance) }));
  const drawdown = sampled.filter((row) => row.phase === 'retirement' || row.month === plan.retirementMonth).map((row) => ({ month: row.month, value: Number(row.balance) }));
  const recorded = actual.map((point) => ({ month: point.date.slice(0, 7), value: Number(point.amount) }));
  const yTicks = [floor, 0, ceiling * 0.5, ceiling];
  const firstYear = rows[0]!.month.slice(0, 4);
  const lastYear = rows[rows.length - 1]!.month.slice(0, 4);
  const retireYear = plan.retirementMonth.slice(0, 4);
  // The red depletion line gets its year at the foot like the retirement line. Labels are about
  // 30-60px wide, so the end year steps aside when the depletion year would sit on top of it.
  const depletionX = depletion ? Math.min(Math.max(x(depletion), pad.left + 16), width - pad.right - 16) : null;
  const showLastYear = depletionX === null || width - pad.right - depletionX > 52;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.wrap}>
      {width > 0 ? (
        <Svg width={width} height={height} accessibilityRole="image" accessibilityLabel="Projected accumulation and retirement portfolio drawdown in nominal SGD">
          {yTicks.map((tick) => (
            <Line key={tick} x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? theme.lineStrong : theme.line} strokeWidth={1} />
          ))}
          {yTicks.map((tick) => (
            <SvgText key={`label-${tick}`} x={pad.left - 6} y={y(tick) + 4} fontSize={11} fontFamily={fonts.body.regular} fill={theme.ink3} textAnchor="end">
              {compact(tick)}
            </SvgText>
          ))}
          <Line x1={x(plan.retirementMonth)} x2={x(plan.retirementMonth)} y1={pad.top} y2={pad.top + plotH} stroke={theme.ink3} strokeWidth={1} strokeDasharray="4 4" />
          {depletion ? <Line x1={x(depletion)} x2={x(depletion)} y1={pad.top} y2={pad.top + plotH} stroke={theme.expense} strokeWidth={1} strokeDasharray="4 4" /> : null}
          {recorded.length ? <Path d={path(recorded)} stroke={theme.accent} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {recorded.map((point) => <Circle key={point.month} cx={x(point.month)} cy={y(point.value)} r={3} fill={theme.accent} />)}
          {accumulation.length > 1 ? <Path d={path(accumulation)} stroke={theme.accent} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {drawdown.length > 1 ? <Path d={path(drawdown)} stroke={theme.chartProjection} strokeWidth={2} fill="none" strokeDasharray="7 6" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {fire.fiTarget ? <Circle cx={x(plan.retirementMonth)} cy={y(Number(fire.fiTarget))} r={5} fill={theme.warning} stroke={theme.surface} strokeWidth={2} /> : null}
          <SvgText x={pad.left} y={height - 6} fontSize={11} fontFamily={fonts.body.regular} fill={theme.ink3} textAnchor="start">{firstYear}</SvgText>
          <SvgText x={x(plan.retirementMonth)} y={height - 6} fontSize={11} fontFamily={fonts.body.medium} fill={theme.ink2} textAnchor="middle">{`Retire ${retireYear}`}</SvgText>
          {depletion && depletionX !== null ? <SvgText x={depletionX} y={height - 6} fontSize={11} fontFamily={fonts.body.medium} fill={theme.expense} textAnchor="middle">{depletion.slice(0, 4)}</SvgText> : null}
          {showLastYear ? <SvgText x={width - pad.right} y={height - 6} fontSize={11} fontFamily={fonts.body.regular} fill={theme.ink3} textAnchor="end">{lastYear}</SvgText> : null}
        </Svg>
      ) : null}
      <View style={styles.key}>
        <KeyItem color={theme.accent} label="Recorded and accumulation" />
        <KeyItem color={theme.chartProjection} label="Retirement drawdown" dashed />
        <KeyItem color={theme.warning} label="Amount needed for retirement" dot />
        {depletion ? <KeyItem color={theme.expense} label={`Depleted ${depletion.slice(0, 4)}`} dashed /> : null}
      </View>
    </View>
  );
}

function KeyItem({ color, label, dashed, dot }: { color: string; label: string; dashed?: boolean; dot?: boolean }) {
  return (
    <View style={styles.keyItem}>
      <View style={[dot ? styles.keyDot : styles.keySwatch, { backgroundColor: color }, dashed ? styles.keyDashed : null]} />
      <AppText variant="caption" tone="ink2">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  key: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  keyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  keySwatch: {
    width: 16,
    height: 3,
    borderRadius: 2,
  },
  keyDashed: {
    opacity: 0.75,
  },
  keyDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});
