import { apiRoutes, type UpdateAiPreferenceInput } from '@firebuddy/shared';

import { API_BASE_URL, ApiError, apiFetch, readApiError } from '@/lib/api-client';
import { getAccessToken, getSupabase, hasSupabaseConfig } from '@/lib/supabase';

/**
 * DouDou's invisible pass. Nobody signs in: when the person turns DouDou on, the phone creates an
 * anonymous Supabase user (random id, no email or name) and records consent on it, so the backend
 * can rate-limit this phone and check consent. Turning DouDou off deletes that user. A phone that
 * never turns DouDou on never calls anything here.
 */

export function isDoudouConfigured() {
  return Boolean(API_BASE_URL) && hasSupabaseConfig();
}

/** Create the anonymous session if there is none, and save the consent level on its profile row. */
export async function connectDoudou(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !API_BASE_URL) throw new ApiError('DouDou is not set up in this version of the app.', 0, false);

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      // Development only, and only the message: tells a "server off" apart from "anonymous sign-ins disabled".
      if (__DEV__) console.warn(`[DouDou] Anonymous sign-in failed (${error.status ?? 'no response'}): ${error.message}`);
      const unreachable = !error.status;
      throw new ApiError(
        unreachable
          ? 'Could not reach DouDou. Check your internet connection and try again.'
          : 'DouDou could not start right now. Try again in a moment.',
        error.status ?? 0,
        true,
      );
    }
  }

  const body: UpdateAiPreferenceInput = { aiPreference: 'personalised' };
  let response: Response;
  try {
    response = await apiFetch(apiRoutes.profileAiPreference, { method: 'PUT', body: JSON.stringify(body) });
  } catch (caught) {
    if (__DEV__) console.warn(`[DouDou] Backend unreachable at ${API_BASE_URL}. Is it running and listening on the network?`);
    throw caught;
  }
  if (!response.ok) throw await readApiError(response, 'Could not turn on DouDou. Try again in a moment.');
}

/** Delete the anonymous user on the server, then forget the session on this phone. */
export async function forgetDoudou(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const token = await getAccessToken();
  if (token) {
    const response = await apiFetch(apiRoutes.account, { method: 'DELETE' });
    // 404 or 401 mean the server no longer knows this pass, which is the goal.
    if (!response.ok && response.status !== 404 && response.status !== 401) {
      throw await readApiError(response, 'Could not finish turning off DouDou. FireBuddy will try again later.');
    }
  }
  await supabase.auth.signOut({ scope: 'local' });
}
