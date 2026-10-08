import { DoudouAvatar, DoudouIcon } from '../components/Doudou';

interface MarkProps {
  className?: string;
  size?: number;
}

/**
 * FireBuddy's primary mark: Doudou the sprout bean on a forest tile.
 * The tile colour comes from --brand-mark-fill so it can lighten on the forest sidebar and in dark mode.
 */
export function FireBuddyMark({ className = '', size = 36 }: MarkProps) {
  return <DoudouIcon className={className} size={size} />;
}

/** Secondary "Ascent" mark kept in reserve: rising steps toward a lime landing. Uses currentColor for the steps. */
export function AscentMark({ className = '', size = 24 }: MarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 38h10V28h10V18h9" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="39" cy="11" r="6" fill="var(--lime-500, #cbea63)" />
    </svg>
  );
}

/** Doudou's face without the tile, for the AI chat avatar, navigation and the floating launcher. */
export function DoudouMark({ className = '', size = 24 }: MarkProps) {
  return <DoudouAvatar className={className} size={size} />;
}
