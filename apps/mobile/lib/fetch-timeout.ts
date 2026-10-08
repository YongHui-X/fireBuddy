/** Thrown when a request got no answer in time, so callers can say "took too long" instead of "offline". */
export class FetchTimeoutError extends Error {
  constructor(seconds: number) {
    super(`No answer after ${seconds}s`);
    this.name = 'FetchTimeoutError';
  }
}

/**
 * fetch that gives up after `ms`. A server that is down or blocked by a firewall often never
 * answers at all, and a plain fetch then waits for minutes, freezing whatever button started it.
 * The caller's own `signal` still cancels the request early.
 */
export function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, ms = 15000): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  const outer = init.signal ?? null;
  const cancel = () => controller.abort();
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener('abort', cancel);
  }

  return fetch(input, { ...init, signal: controller.signal })
    .catch((error: unknown) => {
      if (timedOut) throw new FetchTimeoutError(ms / 1000);
      throw error;
    })
    .finally(() => {
      clearTimeout(timer);
      outer?.removeEventListener('abort', cancel);
    });
}
