// supabase-js builds URLs with the web URL API, which React Native only partly implements.
import 'react-native-url-polyfill/auto';
import { createClient, type SupportedStorage, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { devReachableUrl } from '@/lib/dev-url';
import { fetchWithTimeout } from '@/lib/fetch-timeout';

/**
 * Supabase on the phone exists only for DouDou's invisible anonymous session. Records never go
 * through it. The client is created lazily, so a phone with DouDou off never touches Supabase or
 * the network. The session lives in the iOS Keychain or Android Keystore via expo-secure-store.
 */

const SUPABASE_URL = devReachableUrl(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '');
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** SecureStore warns above about 2 KB per value, so longer values are split into numbered chunks. */
const CHUNK_SIZE = 1800;

function safeKey(key: string) {
  // SecureStore keys allow only letters, digits, ".", "-" and "_".
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function removeChunks(base: string) {
  const count = Number(await SecureStore.getItemAsync(`${base}.n`));
  if (Number.isFinite(count)) {
    for (let index = 0; index < count; index += 1) await SecureStore.deleteItemAsync(`${base}.${index}`);
  }
  await SecureStore.deleteItemAsync(`${base}.n`);
}

const secureStorage: SupportedStorage = {
  async getItem(key) {
    const base = safeKey(key);
    const raw = await SecureStore.getItemAsync(`${base}.n`);
    if (raw === null) return null;
    const count = Number(raw);
    let value = '';
    for (let index = 0; index < count; index += 1) {
      const part = await SecureStore.getItemAsync(`${base}.${index}`);
      if (part === null) return null;
      value += part;
    }
    return value;
  },
  async setItem(key, value) {
    const base = safeKey(key);
    await removeChunks(base);
    const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let index = 0; index < count; index += 1) await SecureStore.setItemAsync(`${base}.${index}`, value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
    await SecureStore.setItemAsync(`${base}.n`, String(count));
  },
  async removeItem(key) {
    await removeChunks(safeKey(key));
  },
};

/** expo-secure-store has no web build; the browser preview (used for testing) keeps the session in localStorage. */
const webStorage: SupportedStorage = {
  getItem: async (key) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: async (key, value) => { globalThis.localStorage?.setItem(key, value); },
  removeItem: async (key) => { globalThis.localStorage?.removeItem(key); },
};

let client: SupabaseClient | null = null;

export function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** The one client, created on first use. Null when the build has no Supabase settings. */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (!hasSupabaseConfig()) return null;
  // No background refresh timer: `getSession` renews an expiring token when DouDou actually sends a
  // question, so a session left behind by a failed turn-on or a pending delete never calls out on its own.
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { storage: Platform.OS === 'web' ? webStorage : secureStorage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
    // Give up after 15s, so an unreachable Supabase shows an error instead of freezing "Agree".
    global: { fetch: (input, init) => fetchWithTimeout(input, init, 15000) },
  });
  return client;
}

/** The current access token, without creating a session. */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Ask Supabase for a fresh access token after a 401; null when the session cannot be renewed. */
export async function refreshAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.refreshSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}
