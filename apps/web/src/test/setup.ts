import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

import { clearMediaQueryRegistry, installMatchMedia, resetViewport } from './viewport';

beforeAll(() => {
  // jsdom has none of these, and the app now depends on all three.
  installMatchMedia();

  if (!window.visualViewport) {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      writable: true,
      value: {
        height: window.innerHeight,
        width: window.innerWidth,
        offsetTop: 0,
        offsetLeft: 0,
        scale: 1,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }

  // jsdom logs "Not implemented: Window's scrollTo()" for every call; the app scrolls after saves.
  Object.defineProperty(window, 'scrollTo', { configurable: true, writable: true, value: vi.fn() });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  resetViewport();
  clearMediaQueryRegistry();
  // Planner drafts live in tab storage; keep them from leaking between tests.
  window.sessionStorage.clear();
});
