import { useEffect } from 'react';

/**
 * Publish the height of the on-screen keyboard as the `--kb-inset` custom property.
 *
 * Android Chrome and iOS Safari both default to shrinking the *visual* viewport when the keyboard
 * opens while leaving the layout viewport alone, so anything anchored to the bottom of the screen
 * — the Ember composer, a sticky save bar, the add-transaction sheet — ends up underneath it.
 * Reading the gap and exposing it lets those elements lift by exactly the right amount in CSS.
 *
 * Mount once, from the app shell.
 */
export function useVisualViewportInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;

    const update = () => {
      // What the layout viewport covers but the visual viewport no longer shows, below the fold.
      const hidden = window.innerHeight - viewport.height - viewport.offsetTop;
      // Small deltas are browser chrome settling, not a keyboard.
      const inset = hidden > 120 ? Math.round(hidden) : 0;
      root.style.setProperty('--kb-inset', `${inset}px`);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      root.style.removeProperty('--kb-inset');
    };
  }, []);
}
