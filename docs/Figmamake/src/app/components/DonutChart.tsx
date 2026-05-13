interface DonutSlice {
  value: number;
  color: string;
  name: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  /** Content rendered in the centre hole */
  centerLabel?: React.ReactNode;
}

/**
 * Custom SVG donut chart — no external library, never clips.
 * Uses polar-coordinate arc paths so we own every pixel.
 */
export function DonutChart({ data, size = 160, thickness = 28, centerLabel }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0 || data.length === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;   // 4 px safe gap from edge
  const innerR = outerR - thickness;
  const gapAngle = data.length > 1 ? 0.035 : 0; // radians gap between slices

  // Build arc paths
  const paths: { d: string; color: string; name: string }[] = [];
  let startAngle = -Math.PI / 2; // 12 o'clock

  data.forEach((slice) => {
    const fraction = slice.value / total;
    const sweep = fraction * 2 * Math.PI - gapAngle;
    if (sweep <= 0) return;

    const endAngle = startAngle + sweep;

    const cos0 = Math.cos(startAngle), sin0 = Math.sin(startAngle);
    const cos1 = Math.cos(endAngle),   sin1 = Math.sin(endAngle);

    const large = sweep > Math.PI ? 1 : 0;

    const x1o = cx + outerR * cos0, y1o = cy + outerR * sin0;
    const x2o = cx + outerR * cos1, y2o = cy + outerR * sin1;
    const x2i = cx + innerR * cos1, y2i = cy + innerR * sin1;
    const x1i = cx + innerR * cos0, y1i = cy + innerR * sin0;

    paths.push({
      color: slice.color,
      name: slice.name,
      d: [
        `M ${x1o} ${y1o}`,
        `A ${outerR} ${outerR} 0 ${large} 1 ${x2o} ${y2o}`,
        `L ${x2i} ${y2i}`,
        `A ${innerR} ${innerR} 0 ${large} 0 ${x1i} ${y1i}`,
        'Z',
      ].join(' '),
    });

    // Advance by full fraction (gap is "eaten" from the drawn arc, not the rotation)
    startAngle += fraction * 2 * Math.PI;
  });

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} />
        ))}
      </svg>

      {centerLabel && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          {centerLabel}
        </div>
      )}
    </div>
  );
}
