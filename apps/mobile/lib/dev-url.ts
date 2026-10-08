import { rewriteLoopbackUrl } from '@firebuddy/shared';
import Constants from 'expo-constants';

/**
 * In development, a `localhost` address in `.env.local` means the phone itself, so DouDou could
 * never reach the backend or Supabase on the computer. Aim it at the computer running Metro
 * instead. Release builds use their configured URLs untouched.
 */
export function devReachableUrl(url: string) {
  return __DEV__ ? rewriteLoopbackUrl(url, Constants.expoConfig?.hostUri) : url;
}
