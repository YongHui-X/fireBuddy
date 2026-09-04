interface MarkProps {
  className?: string;
  size?: number;
}

/** Render FireBuddy's flame and upward-growth mark using the active brand palette. */
export function FireBuddyMark({ className = '', size = 36 }: MarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="40" height="40" rx="12" fill="var(--brand-mark-fill, #163300)" />
      <path
        d="M20.2 7.8c1.2 5.2-3.2 7.1-3.2 11.2 0 1.3.6 2.5 1.7 3.2-.1-2.8 1.7-4.5 3.6-6.4.2 3.2 3.8 5 3.8 9.2 0 4.2-2.9 7.2-7.1 7.2-4.4 0-7.5-3.2-7.5-7.6 0-6.2 5.2-9.8 8.7-16.8Z"
        fill="var(--brand-mark-flame, #9fe870)"
      />
      <path d="m17.2 27.2 3-3 2.1 2.1 4.2-5" stroke="var(--brand-mark-detail, #ffffff)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23.8 21.3h2.7V24" stroke="var(--brand-mark-detail, #ffffff)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Render Ember's guided spark as a distinct but related AI sub-brand. */
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
      <rect width="28" height="28" rx="9" fill="var(--ember-mark-fill, #e0f4d3)" />
      <path
        d="M13.7 5.2c.7 4.5 2.9 6.7 7.4 7.5-4.5.7-6.7 3-7.4 7.4-.8-4.4-3-6.7-7.5-7.4 4.5-.8 6.7-3 7.5-7.5Z"
        fill="var(--ember-mark-symbol, #163300)"
      />
      <circle cx="20.7" cy="7.2" r="1.7" fill="var(--ember-mark-accent, #5f9f3d)" />
      <circle cx="7.2" cy="20.6" r="1.15" fill="var(--ember-mark-accent, #5f9f3d)" />
    </svg>
  );
}
