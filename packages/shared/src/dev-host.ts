/**
 * Development-only address fix for the phone. `.env.local` often says `localhost` for the
 * backend and Supabase, which on a phone means the phone itself, so DouDou could never connect.
 * When the app runs from a dev server on the computer's LAN address, loopback hosts in a URL are
 * swapped for that address. Anything else, including tunnel hostnames, is left untouched.
 */

const LOOPBACK_URL = /^(https?:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?=[:/?#]|$)/i;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** The IPv4 address in an Expo `hostUri` such as `192.168.1.5:8081`, or null for anything else. */
export function lanHostFromHostUri(hostUri: string | null | undefined): string | null {
  if (!hostUri) return null;
  const host = hostUri.trim().replace(/^[a-z]+:\/\//i, '').split(/[/:]/)[0] ?? '';
  const match = IPV4.exec(host);
  if (!match || match.slice(1).some((part) => Number(part) > 255)) return null;
  if (match[1] === '127' || host === '0.0.0.0') return null;
  return host;
}

/** Point a loopback URL at the dev computer's LAN address, keeping scheme, port and path. */
export function rewriteLoopbackUrl(url: string, hostUri: string | null | undefined): string {
  const lanHost = lanHostFromHostUri(hostUri);
  if (!url || !lanHost) return url;
  return url.replace(LOOPBACK_URL, `$1${lanHost}`);
}
