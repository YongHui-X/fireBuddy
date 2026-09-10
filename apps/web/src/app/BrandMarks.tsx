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

/** Keep Ember's small glowing coal subordinate to the FireBuddy identity. */
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
        d="M15 4c1 5-5 6-5 10 0 1 .4 2 1.2 2.7C11 13 15 12 17 9c.2 3.6 5 6.2 5 10a8 8 0 0 1-16 0C6 12 12 10 15 4Z"
        fill="var(--ember-mark-symbol, #b6532b)"
      />
    </svg>
  );
}
