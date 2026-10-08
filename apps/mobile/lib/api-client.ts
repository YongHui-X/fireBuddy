import { devReachableUrl } from '@/lib/dev-url';
import { FetchTimeoutError, fetchWithTimeout } from '@/lib/fetch-timeout';
import { getAccessToken, refreshAccessToken } from '@/lib/supabase';

/**
 * The phone's only path to FastAPI, used by DouDou alone. It attaches the anonymous session's
 * bearer token, renews it once on a 401, and turns failures into plain-language errors. It never
 * logs request or response bodies.
 */

export const API_BASE_URL = devReachableUrl(process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '');

export class ApiError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(message: string, status: number, retryable = status >= 500 || status === 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryable = retryable;
  }
}

/** Read a FastAPI error body (`detail` or `message`), falling back to a generic line. */
export async function readApiError(response: Response, fallback: string) {
  let message = fallback;
  try {
    const payload = (await response.json()) as { detail?: unknown; message?: unknown };
    const detail = typeof payload.detail === 'string' ? payload.detail : typeof payload.message === 'string' ? payload.message : null;
    if (detail) message = detail;
  } catch {
    // Keep the fallback when the body is not JSON.
  }
  return new ApiError(message, response.status, response.status === 429 || response.status >= 500);
}

/**
 * Authenticated request to FastAPI. Returns the response, ok or not; throws only when nothing could
 * be sent or no answer came within `timeoutMs` (15s by default; answers to questions get longer).
 */
export async function apiFetch(path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  if (!API_BASE_URL) throw new ApiError('DouDou is not set up in this version of the app.', 0, false);
  let token = await getAccessToken();
  if (!token) throw new ApiError('DouDou is not connected on this phone. Turn DouDou on in Profile.', 0, false);

  const send = (bearer: string) => fetchWithTimeout(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers ?? {}), Authorization: `Bearer ${bearer}` },
  }, timeoutMs);

  try {
    let response = await send(token);
    if (response.status === 401) {
      token = await refreshAccessToken();
      if (token) response = await send(token);
    }
    return response;
  } catch (error) {
    if (error instanceof FetchTimeoutError) throw new ApiError('DouDou took too long to answer. Check your connection and try again.', 0, true);
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError('Could not reach FireBuddy. Check your connection and try again.', 0, true);
  }
}
