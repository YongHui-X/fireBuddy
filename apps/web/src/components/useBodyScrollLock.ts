import { useEffect } from 'react';

/**
 * Stop the page behind a sheet or dialog from scrolling.
 *
 * `overflow: hidden` on the body is not enough on iOS, which happily scrolls it anyway, so the
 * body is pinned with `position: fixed` at its current offset and put back afterwards. Locks are
 * reference counted because sheets nest — the add-transaction sheet opens the category sheet on
 * top of itself, and closing the inner one must not release the outer one's lock.
 */

let lockCount = 0;
let savedScrollY = 0;
let savedStyles: { position: string; top: string; width: string; overflow: string } | null = null;

function applyLock() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    const { style } = document.body;
    savedStyles = {
      position: style.position,
      top: style.top,
      width: style.width,
      overflow: style.overflow,
    };
    style.position = 'fixed';
    style.top = `-${savedScrollY}px`;
    style.width = '100%';
    style.overflow = 'hidden';
  }

  lockCount += 1;
}

function releaseLock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0 || !savedStyles) return;

  const { style } = document.body;
  style.position = savedStyles.position;
  style.top = savedStyles.top;
  style.width = savedStyles.width;
  style.overflow = savedStyles.overflow;
  savedStyles = null;

  // jsdom has no scrollTo, and a failure here must not take the dialog's teardown with it.
  try {
    window.scrollTo(0, savedScrollY);
  } catch {
    /* no-op */
  }
}

export function useBodyScrollLock(isActive = true) {
  useEffect(() => {
    if (!isActive) return undefined;

    applyLock();
    return releaseLock;
  }, [isActive]);
}

/** Test seam: the number of sheets currently holding the page still. */
export function getBodyScrollLockCount() {
  return lockCount;
}
