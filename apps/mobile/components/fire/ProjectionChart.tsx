import { monthIndex, niceTicks, placeAxisLabels, type FireCalculationResult, type RetirementLumpSum } from '@firebuddy/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { fonts, spacing } from '@/constants/tokens';
import { todaysMoney } from '@/hooks/use-fire-plan';
import { useTheme } from '@/lib/theme';

import { AppText } from '../ui/Text';

export interface ChartStage {
  /** YYYY-MM the stage starts. */
  month: string;
  /** Short word before the year at the foot: "Coast 2038", "Part-time 2045". */
  label: string;
  /** Age in that month, shown above the dashed line. */
  age: number;
}

export interface ProjectionChartProps {
  fire: FireCalculationResult;
  /** Depletion month, when the retirement balance first goes below zero. */
  depletion: string | null;
  /** The FIRE stages, each drawn as a dashed line with its year at the foot. */
  stages: readonly ChartStage[];
  height?: number;
  /** Show each month in that year's dollars instead of today's money (PRD 6.6.1, 35). */
  future?: boolean;
}

/** "$250k", "$1.5M", "−$100k": one decimal only when it is not a whole number. */
const compact = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1e6) return `${sign}$${Number((abs / 1e6).toFixed(abs % 1e6 === 0 ? 0 : 1))}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}k`;
  return `${sign}$${Math.round(abs)}`;
};

/** Rough width of an 11px label, so the year labels can be spaced without measuring. */
const labelWidth = (text: string) => text.length * 6.4 + 4;

/**
 * The FIRE Projection in today's money (or each year's dollars) on react-native-svg. Solid lines: recorded values grey,
 * growth blue, drawdown teal. Dashed lines: each FIRE stage in dark ink, the month the money runs
 * out in red, so no two lines share a colour family (owner, 10 Oct 2026). A dark dot marks the
 * amount needed. Ages sit above the dashed lines and years at the foot; neither row ever overlaps
 * (stages win, then the depletion year). The axis starts at zero: when the money runs out the line
 * rests on zero and the red line marks when, with no negative numbers (owner, 10 Oct 2026).
 */
export function ProjectionChart({ fire, depletion, stages, height = 220, future = false }: ProjectionChartProps) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  const plan = fire.plan!;
  const rows = fire.monthlyCashFlows ?? [];
  if (!rows.length) return null;

  const real = todaysMoney(fire);
  const value = (amount: number | string, month: string) => (future ? Number(amount) : real(amount, month) ?? 0);

  // Money taken out before retiring (home cash upfront, big costs) is the only thing that makes the
  // Growing line fall; each one gets a ring on the line so the dip explains itself (owner, 11 Oct 2026).
  const withdrawals = new Set(rows.flatMap((row, index) => (row.phase === 'accumulation' && Number(row.lumpSum ?? 0) < 0 ? [index] : [])));
  // Sample one point per year plus the retirement and final months so the path stays light, and the
  // months either side of a withdrawal so it reads as a step rather than a year-long slope.
  const sampled = rows.filter((row, index) => index % 12 === 0 || row.month === plan.retirementMonth || index === rows.length - 1 || withdrawals.has(index) || withdrawals.has(index + 1));
  const accumulation = sampled.filter((row) => row.phase === 'accumulation' || row.month === plan.retirementMonth).map((row) => ({ month: row.month, value: value(row.balance, row.month) }));
  const drawdown = sampled.filter((row) => row.phase === 'retirement' || row.month === plan.retirementMonth).map((row) => ({ month: row.month, value: value(row.balance, row.month) }));
  const recorded = (fire.actualPath ?? []).map((point) => ({ month: point.date.slice(0, 7), value: Number(point.amount) }));
  const target = fire.fiTarget ? value(fire.fiTarget, plan.retirementMonth) : null;

  const all = [...accumulation, ...drawdown, ...recorded].map((point) => point.value);
  const top = Math.max(...all, target ?? 0, 1);
  const ticks = niceTicks(top, 0);
  const floor = ticks[0]!;
  const ceiling = ticks[ticks.length - 1]!;

  // Room above the plot for the age labels.
  const pad = { top: 26, right: 12, bottom: 24, left: Math.max(...ticks.map((tick) => labelWidth(compact(tick)))) + 6 };
  const plotW = Math.max(width - pad.left - pad.right, 1);
  const plotH = height - pad.top - pad.bottom;
  const startIndex = Math.min(monthIndex(rows[0]!.month), ...recorded.map((point) => monthIndex(point.month)));
  const span = Math.max(monthIndex(rows[rows.length - 1]!.month) - startIndex, 1);
  const x = (month: string) => pad.left + ((monthIndex(month) - startIndex) / span) * plotW;
  const y = (amount: number) => pad.top + (1 - (Math.max(Math.min(amount, ceiling), floor) - floor) / (ceiling - floor)) * plotH;
  const path = (points: { month: string; value: number }[]) => points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.month).toFixed(1)} ${y(point.value).toFixed(1)}`).join(' ');

  const firstYear = rows[0]!.month.slice(0, 4);
  const lastYear = rows[rows.length - 1]!.month.slice(0, 4);
  const labels = [
    ...stages.map((stage, index) => ({ key: `stage-${index}`, text: `${stage.label} ${stage.month.slice(0, 4)}`, x: x(stage.month), priority: 10 - index, color: theme.ink2, medium: true })),
    ...(depletion ? [{ key: 'depletion', text: `Runs out ${depletion.slice(0, 4)}`, x: x(depletion), priority: 5, color: theme.expense, medium: true }] : []),
    { key: 'first', text: firstYear, x: pad.left, priority: 2, color: theme.ink3, medium: false },
    { key: 'last', text: lastYear, x: width - pad.right, priority: 1, color: theme.ink3, medium: false },
  ];
  const placed = placeAxisLabels(labels.map((label) => ({ key: label.key, x: label.x, width: labelWidth(label.text), priority: label.priority })), pad.left - 4, width);
  const byKey = new Map(labels.map((label) => [label.key, label]));

  // Ages above each dashed line, spaced the same way.
  const depletionAge = depletion ? Math.floor((monthIndex(depletion) - monthIndex(plan.birthMonth)) / 12) : null;
  const ageLabels = [
    ...stages.map((stage, index) => ({ key: `age-${index}`, text: `Age ${stage.age}`, x: x(stage.month), priority: 10 - index, color: theme.ink2 })),
    ...(depletion && depletionAge !== null ? [{ key: 'age-depletion', text: `Age ${depletionAge}`, x: x(depletion), priority: 5, color: theme.expense }] : []),
  ];
  const placedAges = placeAxisLabels(ageLabels.map((label) => ({ key: label.key, x: label.x, width: labelWidth(label.text), priority: label.priority })), pad.left - 4, width);
  const ageByKey = new Map(ageLabels.map((label) => [label.key, label]));

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.wrap}>
      {width > 0 ? (
        <Svg width={width} height={height} accessibilityRole="image" accessibilityLabel={future ? 'FIRE projection in future dollars' : "FIRE projection in today's money"}>
          {ticks.map((tick) => (
            <Line key={tick} x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? theme.lineStrong : theme.line} strokeWidth={1} />
          ))}
          {ticks.map((tick) => (
            <SvgText key={`label-${tick}`} x={pad.left - 6} y={y(tick) + 4} fontSize={11} fontFamily={fonts.body.regular} fill={theme.ink3} textAnchor="end">
              {compact(tick)}
            </SvgText>
          ))}
          {stages.map((stage) => (
            <Line key={stage.month + stage.label} x1={x(stage.month)} x2={x(stage.month)} y1={pad.top} y2={pad.top + plotH} stroke={theme.ink2} strokeWidth={1.5} strokeDasharray="5 4" />
          ))}
          {depletion ? <Line x1={x(depletion)} x2={x(depletion)} y1={pad.top} y2={pad.top + plotH} stroke={theme.expense} strokeWidth={1.5} strokeDasharray="5 4" /> : null}
          {recorded.length ? <Path d={path(recorded)} stroke={theme.ink3} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {recorded.map((point) => <Circle key={point.month} cx={x(point.month)} cy={y(point.value)} r={3} fill={theme.ink3} />)}
          {accumulation.length > 1 ? <Path d={path(accumulation)} stroke={theme.accent} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {drawdown.length > 1 ? <Path d={path(drawdown)} stroke={theme.chartProjection} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {[...withdrawals].map((index) => {
            const row = rows[index]!;
            return <Circle key={`out-${row.month}`} cx={x(row.month)} cy={y(value(row.balance, row.month))} r={4.5} fill={theme.surface} stroke={theme.ink2} strokeWidth={2} />;
          })}
          {target !== null ? <Circle cx={x(plan.retirementMonth)} cy={y(target)} r={6} fill={theme.ink} stroke={theme.surface} strokeWidth={2} /> : null}
          {placedAges.map((label) => {
            const meta = ageByKey.get(label.key)!;
            return (
              <SvgText key={label.key} x={label.center} y={pad.top - 8} fontSize={11} fontFamily={fonts.body.medium} fill={meta.color} textAnchor="middle">
                {meta.text}
              </SvgText>
            );
          })}
          {placed.map((label) => {
            const meta = byKey.get(label.key)!;
            return (
              <SvgText key={label.key} x={label.center} y={height - 6} fontSize={11} fontFamily={meta.medium ? fonts.body.medium : fonts.body.regular} fill={meta.color} textAnchor="middle">
                {meta.text}
              </SvgText>
            );
          })}
        </Svg>
      ) : null}
      <View style={styles.key}>
        {recorded.length ? <KeyItem color={theme.ink3} label="Recorded" /> : null}
        <KeyItem color={theme.accent} label="Growing" />
        <KeyItem color={theme.chartProjection} label="Drawing down" />
        <KeyItem color={theme.ink} label="Amount needed" dot />
        {[...withdrawals].map((index) => {
          const month = rows[index]!.month;
          return <KeyItem key={`out-${month}`} color={theme.ink2} label={`${costName(plan.lumpSums ?? [], month)} ${month.slice(0, 4)}`} ring />;
        })}
        <KeyItem color={theme.ink2} label="FIRE stage" dashed />
        {depletion ? <KeyItem color={theme.expense} label="Money runs out" dashed /> : null}
      </View>
    </View>
  );
}

/** The key's name for the big costs paid in `month`: "Home" for the home's cash, else the typed label, shortened. */
function costName(lumpSums: readonly RetirementLumpSum[], month: string) {
  const names = lumpSums
    .filter((item) => item.direction === 'out' && item.month === month)
    .map((item) => (item.label.trim().startsWith('Home:') ? 'Home' : item.label.trim() || 'Big cost'));
  const text = names.length ? names.join(', ') : 'Big cost';
  return text.length > 24 ? `${text.slice(0, 23)}…` : text;
}

function KeyItem({ color, label, dashed, dot, ring }: { color: string; label: string; dashed?: boolean; dot?: boolean; ring?: boolean }) {
  return (
    <View style={styles.keyItem}>
      {ring ? <View style={[styles.keyDot, styles.keyRing, { borderColor: color }]} /> : dot ? <View style={[styles.keyDot, { backgroundColor: color }]} /> : dashed ? (
        <View style={styles.keyDashes}>
          {[0, 1, 2].map((index) => <View key={index} style={[styles.keyDash, { backgroundColor: color }]} />)}
        </View>
      ) : <View style={[styles.keySwatch, { backgroundColor: color }]} />}
      <AppText variant="caption" tone="ink2" numberOfLines={1} style={styles.keyLabel}>{label}</AppText>
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
    columnGap: spacing.md,
    rowGap: spacing.xs,
  },
  keyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  keyLabel: {
    flexShrink: 1,
  },
  keySwatch: {
    width: 18,
    height: 4,
    borderRadius: 2,
  },
  keyDashes: {
    flexDirection: 'row',
    gap: 2,
    width: 18,
  },
  keyDash: {
    width: 4.5,
    height: 2,
    borderRadius: 1,
  },
  keyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  keyRing: {
    borderWidth: 2,
  },
});
