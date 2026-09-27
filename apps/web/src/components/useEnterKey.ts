import type { KeyboardEvent } from 'react';

/**
 * Sheets are plain `<div>`s, so when one is rendered inside a page-level `<form>` (the add
 * transaction route), Enter in one of its inputs implicitly submits that outer form and the
 * sheet vanishes with the page. This claims Enter for the sheet: it never leaves the dialog,
 * and it runs the sheet's own action instead.
 */
export function onEnterInInput(action: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    event.preventDefault();
    event.stopPropagation();
    action();
  };
}
