interface MarkProps {
  className?: string;
  size?: number;
}

/**
 * FireBuddy's primary mark: an early sun resting on the horizon.
 * FIRE stands for financial independence, retire early, so the mark shows a morning you own instead of a flame.
 * Colors come from CSS custom properties so the mark adapts to the forest sidebar, the light canvas, and dark mode.
 */
export function FireBuddyMark({ className = '', size = 36 }: MarkProps) {
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
      <rect width="48" height="48" rx="13" fill="var(--brand-mark-fill, #163a2c)" />
      <path d="M13 28a11 11 0 0 1 22 0Z" fill="var(--brand-mark-sun, #cbea63)" />
      <path d="M24 9v4M11 14l3 3M37 14l-3 3" stroke="var(--brand-mark-line, #ffffff)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M9 33h30" stroke="var(--brand-mark-line, #ffffff)" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
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
      <circle cx="39" cy="11" r="6" fill="var(--brand-mark-sun, #cbea63)" />
    </svg>
  );
}

/** Ember, the assistant, keeps a small warm spark that stays subordinate to the FireBuddy mark. */
export function EmberMark({ className = '', size = 24 }: MarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M14 3c.9 5.6 5.4 10.1 11 11-5.6.9-10.1 5.4-11 11-.9-5.6-5.4-10.1-11-11 5.6-.9 10.1-5.4 11-11Z"
        fill="var(--ember-mark-symbol, #d9782d)"
      />
    </svg>
  );
}
