import { useSyncExternalStore } from 'react';

/**
 * Whether the launch screen is still covering the app. While it is, the launch screen owns the
 * status bar, so screens underneath (Home's forest hero) wait and set theirs once it ends.
 * Module state, because it describes this app process: the launch plays once per cold start.
 */
let active = true;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True once the launch screen has gone. */
export function useLaunchFinished() {
  return useSyncExternalStore(subscribe, () => !active);
}

/** Called once by the root layout after the launch screen has gone and the app's StatusBar has mounted. */
export function finishLaunch() {
  if (!active) return;
  active = false;
  listeners.forEach((listener) => listener());
}
