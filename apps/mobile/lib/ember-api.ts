import { apiRoutes, type RagChatMessage, type RagChatRequest, type RagChatResponse } from '@firebuddy/shared';

/**
 * Ember transport for the phone. The FastAPI route verifies a Supabase JWT, and the native app has
 * no sign-in yet, so Ember is reachable only when a base URL and a bearer token are configured:
 *   EXPO_PUBLIC_API_BASE_URL      the FastAPI origin, e.g. http://192.168.1.20:8000 for a device on the LAN
 *   EXPO_PUBLIC_DEV_ACCESS_TOKEN  a development-only access token copied from a signed-in web session
 * Once Supabase auth lands on mobile, `getAccessToken` swaps to the live session and the dev token goes.
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
const DEV_ACCESS_TOKEN = process.env.EXPO_PUBLIC_DEV_ACCESS_TOKEN ?? '';

export const MAX_EMBER_HISTORY_MESSAGES = 6;
export const MAX_EMBER_QUESTION_LENGTH = 2000;

export type EmberAvailability =
  | { available: true }
  | { available: false; reason: 'no-api' | 'no-session' };

export function getEmberAvailability(): EmberAvailability {
  if (!API_BASE_URL) return { available: false, reason: 'no-api' };
  if (!getAccessToken()) return { available: false, reason: 'no-session' };
  return { available: true };
}

/** The bearer token for protected routes. Only the development override exists until sign-in ships. */
export function getAccessToken(): string | null {
  return DEV_ACCESS_TOKEN || null;
}

export class EmberRequestError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(message: string, status: number, retryable = status >= 500 || status === 0) {
    super(message);
    this.name = 'EmberRequestError';
    this.status = status;
    this.retryable = retryable;
  }
}

/** Trim whitespace and keep only the recent turns, as the web client does before every request. */
export function selectRecentHistory(messages: readonly RagChatMessage[]) {
  return messages
    .map((message) => ({ ...message, content: message.content.replace(/\s+/g, ' ').trim() }))
    .filter((message) => message.content.length > 0)
    .slice(-MAX_EMBER_HISTORY_MESSAGES);
}

async function readError(response: Response) {
  let message = `Ember could not answer (HTTP ${response.status}).`;
  try {
    const payload = (await response.json()) as { detail?: unknown; message?: unknown };
    const detail = typeof payload.detail === 'string' ? payload.detail : typeof payload.message === 'string' ? payload.message : null;
    if (detail) message = detail;
  } catch {
    // Keep the generic message when the body is not JSON.
  }
  if (response.status === 401) message = 'Your session has expired. Sign in again to keep using Ember.';
  if (response.status === 429) message = 'Ember is busy right now. Wait a moment and try again.';
  return new EmberRequestError(message, response.status, response.status === 429 || response.status >= 500);
}

/** One grounded answer from the JSON endpoint. The streaming route can replace this later without touching the screen. */
export async function askEmber(input: RagChatRequest, signal?: AbortSignal): Promise<RagChatResponse> {
  const token = getAccessToken();
  if (!API_BASE_URL || !token) throw new EmberRequestError('Ember is not connected on this device.', 0, false);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${apiRoutes.financialAdvisorChat}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...input, history: selectRecentHistory(input.history) }),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new EmberRequestError('Could not reach FireBuddy. Check your connection and try again.', 0, true);
  }
  if (!response.ok) throw await readError(response);
  return (await response.json()) as RagChatResponse;
}
