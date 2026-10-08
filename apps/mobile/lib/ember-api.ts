import {
  apiRoutes,
  createSseParser,
  type RagAnswerMode,
  type RagChatMessage,
  type RagChatRequest,
  type RagChatResponse,
  type RagChatSource,
  type RagDataEvidence,
} from '@firebuddy/shared';
import { fetch as streamingFetch } from 'expo/fetch';

import { API_BASE_URL, ApiError, apiFetch, readApiError } from '@/lib/api-client';
import { isDoudouConfigured } from '@/lib/ember-session';
import { getAccessToken, refreshAccessToken } from '@/lib/supabase';

/**
 * DouDou transport for the phone. The FastAPI route verifies a Supabase JWT, which comes from the
 * anonymous session created when the person turns DouDou on (`lib/ember-session.ts`). The build needs:
 *   EXPO_PUBLIC_API_BASE_URL       the FastAPI origin (HTTPS outside development)
 *   EXPO_PUBLIC_SUPABASE_URL       the Supabase project URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY  the Supabase anon key
 */

export const MAX_EMBER_HISTORY_MESSAGES = 6;
export const MAX_EMBER_QUESTION_LENGTH = 2000;

/** Kept under its old name so the hook and screen need no new import. */
export { ApiError as EmberRequestError };

export type EmberAvailability =
  | { available: true }
  | { available: false; reason: 'not-configured' };

/** Whether this build can reach DouDou at all. Consent and the session are checked separately. */
export function getEmberAvailability(): EmberAvailability {
  return isDoudouConfigured() ? { available: true } : { available: false, reason: 'not-configured' };
}

/** Trim whitespace and keep only the recent turns, as the web client does before every request. */
export function selectRecentHistory(messages: readonly RagChatMessage[]) {
  return messages
    .map((message) => ({ ...message, content: message.content.replace(/\s+/g, ' ').trim() }))
    .filter((message) => message.content.length > 0)
    .slice(-MAX_EMBER_HISTORY_MESSAGES);
}

/** One grounded answer from the JSON endpoint. The streaming route can replace this later without touching the screen. */
export async function askEmber(input: RagChatRequest, signal?: AbortSignal): Promise<RagChatResponse> {
  const response = await apiFetch(apiRoutes.financialAdvisorChat, {
    method: 'POST',
    body: JSON.stringify({ ...input, history: selectRecentHistory(input.history) }),
    signal,
  }, 60000); // Searching sources and writing an answer can take a while, so allow a full minute.
  if (!response.ok) {
    if (response.status === 401) throw new ApiError('DouDou lost its connection. Turn DouDou off and on again in Profile.', 401, false);
    if (response.status === 429) throw new ApiError('DouDou is busy right now. Wait a moment and try again.', 429, true);
    throw await readApiError(response, `DouDou could not answer (HTTP ${response.status}).`);
  }
  return (await response.json()) as RagChatResponse;
}

export interface EmberStreamHandlers {
  /** "Reading your question", "Breaking it down into steps", "Searching curated sources"… */
  onStatus: (message: string) => void;
  /** The next piece of answer text, still masked. */
  onDelta: (text: string) => void;
  onSources: (sources: RagChatSource[]) => void;
  onEvidence?: (mode: RagAnswerMode, evidence: RagDataEvidence) => void;
}

/** No byte from the server for this long means the stream has stalled. */
const STREAM_STALL_MS = 45000;

/**
 * One answer from the streaming route, so text appears as DouDou writes it instead of after the
 * whole answer is ready. Uses Expo's fetch, which can read a response body as it arrives. Same
 * auth as `apiFetch`: the anonymous session's token, renewed once on a 401.
 */
export async function streamEmber(input: RagChatRequest, handlers: EmberStreamHandlers, signal?: AbortSignal): Promise<void> {
  if (!API_BASE_URL) throw new ApiError('DouDou is not set up in this version of the app.', 0, false);
  let token = await getAccessToken();
  if (!token) throw new ApiError('DouDou is not connected on this phone. Turn DouDou on in Profile.', 0, false);

  // Our own controller, so a stalled stream can be cut off; the caller's signal still cancels it.
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', cancel);
  let stalled = false;
  let stallTimer: ReturnType<typeof setTimeout> | undefined;
  const armStallTimer = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      stalled = true;
      controller.abort();
    }, STREAM_STALL_MS);
  };

  const body = JSON.stringify({ ...input, history: selectRecentHistory(input.history) });
  const open = (bearer: string) => streamingFetch(`${API_BASE_URL}${apiRoutes.financialAdvisorChatStream}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', Authorization: `Bearer ${bearer}` },
    body,
    signal: controller.signal,
  });

  try {
    armStallTimer();
    let response = await open(token);
    if (response.status === 401) {
      token = await refreshAccessToken();
      if (token) response = await open(token);
    }
    if (!response.ok) {
      if (response.status === 401) throw new ApiError('DouDou lost its connection. Turn DouDou off and on again in Profile.', 401, false);
      if (response.status === 429) throw new ApiError('DouDou is busy right now. Wait a moment and try again.', 429, true);
      throw await readApiError(response as unknown as Response, `DouDou could not answer (HTTP ${response.status}).`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new ApiError('DouDou sent an answer this phone could not read.', 503, true);

    let finished = false;
    let failure: ApiError | null = null;
    const parser = createSseParser(({ event, data }) => {
      if (event === 'status' && typeof data.message === 'string') handlers.onStatus(data.message);
      else if (event === 'delta' && typeof data.text === 'string') handlers.onDelta(data.text);
      else if (event === 'sources' && Array.isArray(data.sources)) handlers.onSources(data.sources as RagChatSource[]);
      else if (event === 'evidence' && typeof data.mode === 'string' && data.dataEvidence) handlers.onEvidence?.(data.mode as RagAnswerMode, data.dataEvidence as RagDataEvidence);
      else if (event === 'done') finished = true;
      else if (event === 'error') {
        failure = new ApiError(
          typeof data.message === 'string' ? data.message : 'DouDou could not finish the answer.',
          typeof data.status === 'number' ? data.status : 503,
          data.retryable !== false,
        );
      }
    });
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      armStallTimer();
      if (value) parser.push(decoder.decode(value, { stream: !done }));
      if (done) break;
    }
    parser.end();
    if (failure) throw failure;
    if (!finished) throw new ApiError('DouDou stopped before finishing. Try again.', 503, true);
  } catch (error) {
    if (stalled) throw new ApiError('DouDou took too long to answer. Check your connection and try again.', 0, true);
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError('Could not reach FireBuddy. Check your connection and try again.', 0, true);
  } finally {
    if (stallTimer) clearTimeout(stallTimer);
    signal?.removeEventListener('abort', cancel);
  }
}
