interface MarkProps {
  className?: string;
  size?: number;
}

/** Render FireBuddy's original flame and upward-growth brand mark. */
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
      <rect width="40" height="40" rx="12" fill="var(--brand-mark-fill, #3c8a61)" />
      <path
        d="M20.2 7.8c1.2 5.2-3.2 7.1-3.2 11.2 0 1.3.6 2.5 1.7 3.2-.1-2.8 1.7-4.5 3.6-6.4.2 3.2 3.8 5 3.8 9.2 0 4.2-2.9 7.2-7.1 7.2-4.4 0-7.5-3.2-7.5-7.6 0-6.2 5.2-9.8 8.7-16.8Z"
        fill="white"
        fillOpacity=".96"
      />
      <path d="m17.2 27.2 3-3 2.1 2.1 4.2-5" stroke="#25543D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23.8 21.3h2.7V24" stroke="#25543D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Render Ember's restrained spark symbol as a related sub-brand. */
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
      <rect width="28" height="28" rx="9" fill="var(--ember-mark-fill, #3c8a61)" />
      <path d="M14.2 5.3c.7 3.5-2.5 4.8-2.5 7.8 0 .9.4 1.7 1.2 2.2 0-1.8 1.2-3 2.5-4.2.1 2.1 2.5 3.4 2.5 6.2 0 2.9-2 5-4.9 5-3 0-5.1-2.2-5.1-5.2 0-4.3 3.6-6.8 6.3-11.8Z" fill="white" />
      <path d="m17.7 6.1.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5.5-1.3Z" fill="#CBEA63" />
    </svg>
  );
}
