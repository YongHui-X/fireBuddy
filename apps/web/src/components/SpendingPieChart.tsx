import { useState } from 'react';
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
  points?: Array<{ x: number; y: number }>;
  stroke?: string;
}

const spendingLabelGap = 7;
const spendingSectorPopDistance = 7;

/** Keep the four largest chart slices distinct and group the remaining spend. */
export function groupSpendingPieData(spending: SpendingPieDatum[], themeMode: 'light' | 'dark') {
  const sorted = [...spending].sort((left, right) => right.value - left.value);
  if (sorted.length <= 4) return sorted;

  return [
    ...sorted.slice(0, 4),
    {
      name: 'Others',
      value: sorted.slice(4).reduce((total, item) => total + item.value, 0),
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

/** Draw the radial line and move it with its active pie sector. */
function renderSpendingLabelLine(
  { index, midAngle, points, stroke }: SpendingLabelLineProps,
  activeIndex: number | null,
) {
  if (!points || points.length < 2) return <path d="" />;

  const [start, end] = points;
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

/** Render label text at the endpoint calculated by Recharts for each radial line. */
function renderSpendingLabel(props: PieLabelRenderProps, activeIndex: number | null) {
  const datum = props.payload as SpendingPieDatum | undefined;
  if (!datum) return null;

  const x = Number(props.x);
  const y = Number(props.y);
  const centreX = Number(props.cx);
  const percentage = Number(props.percent ?? 0);
  const textAnchor = props.textAnchor ?? (x >= centreX ? 'start' : 'end');
  const labelLines = getSpendingLabelLines(datum.name, centreX < 180);
  const labelY = y - (labelLines.length > 1 ? 8 : 3);
  const isActive = props.index === activeIndex;
  const offset = getSpendingSectorOffset(Number(props.midAngle), isActive);

  return <g
    className={`spending-callout${isActive ? ' spending-callout-active' : ''}`}
    style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
  >
    <title>{datum.name}: {formatSGD(datum.value, 0)}, {(percentage * 100).toFixed(1)}%</title>
    <text className="spending-callout-label" x={x} y={labelY} textAnchor={textAnchor} aria-label={`${datum.name}, ${(percentage * 100).toFixed(1)}%`}>
      {labelLines.map((line, index) => <tspan key={line} x={x} dy={index === 0 ? 0 : 11}>{line}</tspan>)}
      <tspan className="spending-callout-value" x={x} dy={13}>{(percentage * 100).toFixed(1)}%</tspan>
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

/** Render a solid spending pie using Recharts' native radial label geometry. */
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
        label={(props) => renderSpendingLabel(props, activeIndex)}
        labelLine={(props) => renderSpendingLabelLine(props, activeIndex)}
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
