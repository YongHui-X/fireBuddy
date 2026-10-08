import { useState } from 'react';

/**
 * Runs `reset` during render whenever `key` changes to a truthy value: a sheet's `open` flag, so
 * its form starts fresh each time it opens, or a route param that should reseed screen state. This is React's "adjust state when a prop changes" pattern:
 * unlike a reset inside useEffect, the stale form never paints and no second render cascades.
 * `reset` may only set state owned by the calling component.
 */
export function useResetWhen(key: unknown, reset: () => void) {
  const [seen, setSeen] = useState<unknown>(null);
  if (key !== seen) {
    setSeen(key);
    if (key) reset();
  }
}
