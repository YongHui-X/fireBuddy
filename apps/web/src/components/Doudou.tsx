import type { CSSProperties } from 'react';
import { DOUDOU_MARK_VIEWBOX, getDoudouArt, getDoudouIcon, type DoudouPose, type DoudouShape } from '@firebuddy/shared';

export type DoudouMotion = 'none' | 'idle' | 'think' | 'celebrate' | 'grow' | 'sleep';

/** Resolves the `$` slots in the shared art to theme tokens, so Doudou follows light and dark mode. */
const SLOT_FILLS: Record<string, string> = {
  $shadow: 'var(--doudou-shadow)',
  $cover: 'var(--doudou-cover, var(--surface))',
  $line: 'var(--line)',
  $tile: 'var(--brand-mark-fill)',
};

function resolve(value?: string) {
  return value && value.startsWith('$') ? SLOT_FILLS[value] : value;
}

/** Draws one shared shape descriptor as an SVG element. */
export function DoudouShapes({ shapes }: { shapes: DoudouShape[] }) {
  return (
    <>
      {shapes.map((shape, index) => {
        const style = {
          fill: resolve(shape.fill),
          stroke: resolve(shape.stroke),
          strokeWidth: shape.strokeWidth,
          strokeLinecap: shape.stroke ? 'round' as const : undefined,
          strokeLinejoin: shape.stroke ? 'round' as const : undefined,
          opacity: shape.opacity,
          transform: shape.transform,
        };
        switch (shape.type) {
          case 'path':
            return <path key={index} d={shape.d} {...style} />;
          case 'circle':
            return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} {...style} />;
          case 'ellipse':
            return <ellipse key={index} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...style} />;
          case 'rect':
            return <rect key={index} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} {...style} />;
        }
      })}
    </>
  );
}

interface DoudouProps {
  pose?: DoudouPose;
  size?: number;
  motion?: DoudouMotion;
  /** Accessible name. Leave empty when nearby text already says what is happening. */
  label?: string;
  /** Background behind the peeking ledge. Defaults to the card surface. */
  coverColor?: string;
  className?: string;
}

/**
 * Doudou, FireBuddy's mascot, in one of its eight poses.
 * Use it for moments such as welcomes, tips, empty and error states, never beside figures in tables or charts.
 * Motion is CSS only and switches off under prefers-reduced-motion.
 */
export function Doudou({ pose = 'hello', size = 96, motion = 'none', label, coverColor, className = '' }: DoudouProps) {
  const art = getDoudouArt(pose);
  const style = coverColor ? ({ '--doudou-cover': coverColor } as CSSProperties) : undefined;

  return (
    <svg
      className={`doudou doudou-motion-${motion} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      style={style}
      overflow="visible"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <DoudouShapes shapes={art.shadow} />
      <g className="doudou-figure">
        <g transform={art.tilt ? `rotate(${art.tilt} 60 108)` : undefined}>
          <g className="doudou-leaves"><DoudouShapes shapes={art.leaves} /></g>
          <DoudouShapes shapes={art.body} />
          <g className="doudou-eyes"><DoudouShapes shapes={art.eyes} /></g>
          <DoudouShapes shapes={art.mouth} />
        </g>
      </g>
      <DoudouShapes shapes={art.cover} />
      <g className="doudou-extras"><DoudouShapes shapes={art.extras} /></g>
    </svg>
  );
}

/** Just Doudou's bean and face, cropped square, for chat avatars, nav items and launchers. Never animates. */
export function DoudouAvatar({ size = 24, className = '' }: { size?: number; className?: string }) {
  const art = getDoudouArt('hello');
  return (
    <svg className={`doudou-avatar ${className}`.trim()} width={size} height={size} viewBox={DOUDOU_MARK_VIEWBOX} aria-hidden="true" focusable="false">
      <DoudouShapes shapes={art.leaves} />
      <DoudouShapes shapes={art.body} />
      <DoudouShapes shapes={art.eyes} />
      <DoudouShapes shapes={art.mouth} />
    </svg>
  );
}

/** The app icon art: Doudou on the forest tile. */
export function DoudouIcon({ size = 36, tiny = size <= 20, className = '' }: { size?: number; tiny?: boolean; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <DoudouShapes shapes={getDoudouIcon(tiny)} />
    </svg>
  );
}
