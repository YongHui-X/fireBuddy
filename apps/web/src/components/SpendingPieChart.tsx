import { useRef, useState } from 'react';
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  type PieLabelRenderProps,
  type PieSectorShapeProps,
} from 'recharts';

import { formatSGD } from '../app/FireBuddyProvider';

export interface SpendingPieDatum {
  name: string;
  value: number;
  color: string;
}

interface SpendingLabelLineProps {
  index?: number;
  midAngle?: number;
  cx?: number;
  cy?: number;
  outerRadius?: number;
  points?: Array<{ x: number; y: number }>;
  stroke?: string;
}

export interface SpendingLabelGeometry {
  cx: number;
  cy: number;
  outerRadius: number;
  height: number;
  compact: boolean;
}

export interface SpendingLabelPosition {
  /** Label anchor, at the vertical centre of the callout block. */
  x: number;
  y: number;
  /** Where the leader line leaves the pie. */
  edgeX: number;
  edgeY: number;
  height: number;
  lines: string[];
  textAnchor: 'start' | 'end';
}

const spendingLabelGap = 7;
const spendingSectorPopDistance = 7;
/* Callout geometry at 12px type: distance from the pie edge to the label anchor, the rhythm of the
   wrapped name lines and the percentage beneath them, the clear space kept between neighbouring
   callouts, and where the first baseline sits inside a block. */
const spendingLabelOffset = 22;
const spendingLabelLineHeight = 14;
const spendingValueLineGap = 16;
const spendingLabelMinGap = 6;
const spendingLabelAscent = 11;

/** Keep the largest chart slices distinct (four by default) and group the remaining spend as Others. */
export function groupSpendingPieData(spending: SpendingPieDatum[], themeMode: 'light' | 'dark', limit = 4) {
  const sorted = [...spending].sort((left, right) => right.value - left.value);
  if (sorted.length <= limit) return sorted;

  return [
    ...sorted.slice(0, limit),
    {
      name: 'Others',
      value: sorted.slice(limit).reduce((total, item) => total + item.value, 0),
      color: themeMode === 'dark' ? '#c1b3d4' : '#6d647d',
    },
  ];
}

/** Wrap long compact labels at a word boundary without removing any text. */
export function getSpendingLabelLines(name: string, compact: boolean) {
  if (!compact || name.length <= 10) return [name];

  const words = name.split(' ');
  if (words.length === 1) return [name];

  let bestSplit = 1;
  let smallestDifference = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const firstLine = words.slice(0, index).join(' ');
    const secondLine = words.slice(index).join(' ');
    const difference = Math.abs(firstLine.length - secondLine.length);
    if (difference < smallestDifference) {
      bestSplit = index;
      smallestDifference = difference;
    }
  }

  return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
}

/** Shorten a native radial line while preserving its original direction. */
export function getSpendingLineEndpoint(
  start: { x: number; y: number },
  end: { x: number; y: number },
  gap = spendingLabelGap,
) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const length = Math.hypot(deltaX, deltaY);
  if (length === 0) return end;

  return {
    x: end.x - ((deltaX / length) * gap),
    y: end.y - ((deltaY / length) * gap),
  };
}

/** Calculate a small radial offset that keeps an active slice aligned with its label. */
export function getSpendingSectorOffset(
  midAngle: number,
  isActive: boolean,
  distance = spendingSectorPopDistance,
) {
  if (!isActive) return { x: 0, y: 0 };

  const radians = (-midAngle * Math.PI) / 180;
  return {
    x: Math.cos(radians) * distance,
    y: Math.sin(radians) * distance,
  };
}

/** Height of one callout block: the name lines plus the percentage line. */
function getSpendingLabelHeight(lineCount: number) {
  return lineCount * spendingLabelLineHeight + spendingValueLineGap;
}

/**
 * Place every callout on its natural radial position, then nudge neighbours apart on each side of the
 * pie so no two blocks overlap. Moved callouts slide along the label circle, so their leader lines
 * never cross the pie. Slice order matches the data order the pie draws (clockwise from the top).
 */
export function layoutSpendingLabels(data: SpendingPieDatum[], geometry: SpendingLabelGeometry): SpendingLabelPosition[] {
  const total = data.reduce((sum, datum) => sum + Math.max(datum.value, 0), 0);
  const radius = geometry.outerRadius + spendingLabelOffset;
  let cumulative = 0;

  const positions = data.map<SpendingLabelPosition>((datum) => {
    const fraction = total > 0 ? Math.max(datum.value, 0) / total : 0;
    const midAngle = 90 - ((cumulative + (fraction / 2)) * 360);
    cumulative += fraction;
    const radians = (-midAngle * Math.PI) / 180;
    const lines = getSpendingLabelLines(datum.name, geometry.compact);
    return {
      x: geometry.cx + (Math.cos(radians) * radius),
      y: geometry.cy + (Math.sin(radians) * radius),
      edgeX: geometry.cx + (Math.cos(radians) * geometry.outerRadius),
      edgeY: geometry.cy + (Math.sin(radians) * geometry.outerRadius),
      height: getSpendingLabelHeight(lines.length),
      lines,
      textAnchor: Math.cos(radians) >= 0 ? 'start' : 'end',
    };
  });

  (['start', 'end'] as const).forEach((side) => {
    const column = positions.filter((position) => position.textAnchor === side).sort((left, right) => left.y - right.y);
    const naturalY = column.map((position) => position.y);

    for (let index = 1; index < column.length; index += 1) {
      const previous = column[index - 1];
      const minY = previous.y + (previous.height / 2) + spendingLabelMinGap + (column[index].height / 2);
      if (column[index].y < minY) column[index].y = minY;
    }

    const last = column.at(-1);
    if (last) last.y = Math.min(last.y, geometry.height - (last.height / 2) - 2);
    for (let index = column.length - 2; index >= 0; index -= 1) {
      const next = column[index + 1];
      const maxY = next.y - (next.height / 2) - spendingLabelMinGap - (column[index].height / 2);
      if (column[index].y > maxY) column[index].y = maxY;
    }

    column.forEach((position, index) => {
      if (Math.abs(position.y - naturalY[index]) < 0.5) return;
      const deltaY = position.y - geometry.cy;
      const deltaX = Math.sqrt(Math.max((radius * radius) - (deltaY * deltaY), 0));
      position.x = geometry.cx + (side === 'start' ? deltaX : -deltaX);
    });
  });

  return positions;
}

type SpendingLabelLayout = (cx: number, cy: number, outerRadius: number) => SpendingLabelPosition[];

/** Draw the leader line from the pie edge to the laid-out callout and move it with its active sector. */
function renderSpendingLabelLine(
  { index, midAngle, cx, cy, outerRadius, points, stroke }: SpendingLabelLineProps,
  activeIndex: number | null,
  getLayout: SpendingLabelLayout,
) {
  const position = index !== undefined && cx !== undefined && cy !== undefined && outerRadius !== undefined
    ? getLayout(cx, cy, outerRadius)[index]
    : undefined;
  const start = position ? { x: position.edgeX, y: position.edgeY } : points?.[0];
  const end = position ? { x: position.x, y: position.y } : points?.[1];
  if (!start || !end) return <path d="" />;

  const shortenedEnd = getSpendingLineEndpoint(start, end);
  const isActive = index === activeIndex;
  const offset = getSpendingSectorOffset(Number(midAngle), isActive);
  return <path
    className={`recharts-pie-label-line spending-pie-label-line${isActive ? ' spending-pie-label-line-active' : ''}`}
    d={`M ${start.x} ${start.y} L ${shortenedEnd.x} ${shortenedEnd.y}`}
    fill="none"
    stroke={stroke}
    style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
  />;
}

/** Render the callout text at its laid-out position. */
function renderSpendingLabel(props: PieLabelRenderProps, activeIndex: number | null, getLayout: SpendingLabelLayout) {
  const datum = props.payload as SpendingPieDatum | undefined;
  const index = Number(props.index);
  if (!datum || Number.isNaN(index)) return null;

  const position = getLayout(Number(props.cx), Number(props.cy), Number(props.outerRadius))[index];
  if (!position) return null;

  const percentage = Number(props.percent ?? 0);
  const labelY = position.y - (position.height / 2) + spendingLabelAscent;
  const isActive = index === activeIndex;
  const offset = getSpendingSectorOffset(Number(props.midAngle), isActive);

  return <g
    className={`spending-callout${isActive ? ' spending-callout-active' : ''}`}
    style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
  >
    <title>{datum.name}: {formatSGD(datum.value, 0)}, {(percentage * 100).toFixed(1)}%</title>
    <text className="spending-callout-label" x={position.x} y={labelY} textAnchor={position.textAnchor} aria-label={`${datum.name}, ${(percentage * 100).toFixed(1)}%`}>
      {position.lines.map((line, lineIndex) => <tspan key={line} x={position.x} dy={lineIndex === 0 ? 0 : spendingLabelLineHeight}>{line}</tspan>)}
      <tspan className="spending-callout-value" x={position.x} dy={spendingValueLineGap}>{(percentage * 100).toFixed(1)}%</tspan>
    </text>
  </g>;
}

/** Move the active sector slightly outward with its connected annotation. */
function renderSpendingSector(props: PieSectorShapeProps, activeIndex: number | null) {
  const datum = props.payload as SpendingPieDatum | undefined;
  const isActive = props.isActive || props.index === activeIndex;
  const offset = getSpendingSectorOffset(Number(props.midAngle), isActive);

  return <Sector
    {...props}
    className={`spending-pie-sector${isActive ? ' spending-pie-sector-active' : ''}`}
    fill={datum?.color ?? props.fill}
    stroke="var(--card)"
    strokeWidth={3}
    style={{
      ...props.style,
      transform: `translate(${offset.x}px, ${offset.y}px)`,
    }}
  />;
}

/** Render a solid spending pie with callouts laid out so neighbouring labels never overlap. */
export function SpendingPieChart({
  data,
  height = 300,
  outerRadius = 78,
}: {
  data: SpendingPieDatum[];
  height?: number;
  outerRadius?: number | string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const layoutCache = useRef<{ key: string; positions: SpendingLabelPosition[] }>({ key: '', positions: [] });

  /* Recharts renders one label at a time, so the shared layout is computed once per geometry and reused. */
  const getLayout: SpendingLabelLayout = (cx, cy, resolvedOuterRadius) => {
    const key = [cx, cy, resolvedOuterRadius, height, ...data.map((datum) => `${datum.name}:${datum.value}`)].join('|');
    if (layoutCache.current.key !== key) {
      layoutCache.current = {
        key,
        positions: layoutSpendingLabels(data, { cx, cy, outerRadius: resolvedOuterRadius, height, compact: cx < 180 }),
      };
    }
    return layoutCache.current.positions;
  };

  return <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        startAngle={90}
        endAngle={-270}
        innerRadius={0}
        outerRadius={outerRadius}
        paddingAngle={0}
        shape={(props) => renderSpendingSector(props, activeIndex)}
        label={(props) => renderSpendingLabel(props, activeIndex, getLayout)}
        labelLine={(props) => renderSpendingLabelLine(props, activeIndex, getLayout)}
        onMouseEnter={(_, index) => setActiveIndex(index)}
        onMouseLeave={() => setActiveIndex(null)}
        onClick={(_, index) => setActiveIndex((currentIndex) => currentIndex === index ? null : index)}
        isAnimationActive="auto"
        animationDuration={250}
        animationEasing="ease-out"
      />
      <Tooltip
        formatter={(value, name) => [formatSGD(Number(value)), name]}
        separator=" · "
      />
    </PieChart>
  </ResponsiveContainer>;
}
