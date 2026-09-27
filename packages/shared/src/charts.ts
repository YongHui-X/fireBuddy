/** Point on a circle, with 0 degrees at twelve o'clock. */
export function polarPoint(centerX: number, centerY: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  };
}

/** SVG path for one donut segment between two angles in degrees. */
export function describeDonutSegment(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  const outerStart = polarPoint(centerX, centerY, outerRadius, endAngle);
  const outerEnd = polarPoint(centerX, centerY, outerRadius, startAngle);
  const innerStart = polarPoint(centerX, centerY, innerRadius, startAngle);
  const innerEnd = polarPoint(centerX, centerY, innerRadius, endAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

export interface DonutSegment<T> {
  item: T;
  path: string;
  startAngle: number;
  endAngle: number;
  share: number;
}

/**
 * Lay out values as donut segments with a small gap between them. Values of zero are skipped and
 * a single full-circle segment is split into two halves so the arc renders on every engine.
 */
export function layoutDonutSegments<T>(
  items: readonly T[],
  getValue: (item: T) => number,
  geometry: { centerX: number; centerY: number; innerRadius: number; outerRadius: number; gapDegrees?: number },
): DonutSegment<T>[] {
  const gap = geometry.gapDegrees ?? 2;
  const total = items.reduce((sum, item) => sum + Math.max(getValue(item), 0), 0);
  if (total <= 0) return [];

  const segments: DonutSegment<T>[] = [];
  let cursor = 0;
  for (const item of items) {
    const value = Math.max(getValue(item), 0);
    if (value <= 0) continue;
    const sweep = (value / total) * 360;
    const startAngle = cursor + gap / 2;
    const endAngle = Math.max(startAngle, cursor + sweep - gap / 2);
    const path = sweep >= 359.5
      ? `${describeDonutSegment(geometry.centerX, geometry.centerY, geometry.innerRadius, geometry.outerRadius, 0, 180)} ${describeDonutSegment(geometry.centerX, geometry.centerY, geometry.innerRadius, geometry.outerRadius, 180, 360)}`
      : describeDonutSegment(geometry.centerX, geometry.centerY, geometry.innerRadius, geometry.outerRadius, startAngle, endAngle);
    segments.push({ item, path, startAngle, endAngle, share: value / total });
    cursor += sweep;
  }
  return segments;
}
