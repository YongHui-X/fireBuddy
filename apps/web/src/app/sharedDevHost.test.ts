import { describe, expect, it } from 'vitest';
import { lanHostFromHostUri, rewriteLoopbackUrl } from '@firebuddy/shared';

describe('lanHostFromHostUri', () => {
  it('extracts an address with a port', () => {
    expect(lanHostFromHostUri('192.168.1.5:8081')).toBe('192.168.1.5');
  });

  it('accepts an address without a port', () => {
    expect(lanHostFromHostUri('10.0.0.7')).toBe('10.0.0.7');
  });

  it('extracts an address with an Expo scheme', () => {
    expect(lanHostFromHostUri('exp://192.168.1.5:8081')).toBe('192.168.1.5');
  });

  it('returns null for missing or empty input', () => {
    expect(lanHostFromHostUri(null)).toBeNull();
    expect(lanHostFromHostUri(undefined)).toBeNull();
    expect(lanHostFromHostUri('')).toBeNull();
  });

  it('returns null for a tunnel hostname', () => {
    expect(lanHostFromHostUri('abc-anonymous-8081.exp.direct:80')).toBeNull();
  });

  it('returns null for loopback and unspecified addresses', () => {
    expect(lanHostFromHostUri('127.0.0.1:8081')).toBeNull();
    expect(lanHostFromHostUri('0.0.0.0:8081')).toBeNull();
  });

  it('returns null for an out of range address', () => {
    expect(lanHostFromHostUri('300.1.1.1:8081')).toBeNull();
  });
});

describe('rewriteLoopbackUrl', () => {
  const hostUri = '192.168.1.5:8081';

  it('rewrites localhost and preserves the port', () => {
    expect(rewriteLoopbackUrl('http://localhost:8000', hostUri)).toBe('http://192.168.1.5:8000');
  });

  it('rewrites the IPv4 loopback address', () => {
    expect(rewriteLoopbackUrl('http://127.0.0.1:54321', hostUri)).toBe('http://192.168.1.5:54321');
  });

  it('rewrites the unspecified address and preserves the path and query', () => {
    expect(rewriteLoopbackUrl('http://0.0.0.0:8000/api?x=1', hostUri)).toBe('http://192.168.1.5:8000/api?x=1');
  });

  it('rewrites the IPv6 loopback address', () => {
    expect(rewriteLoopbackUrl('http://[::1]:8000', hostUri)).toBe('http://192.168.1.5:8000');
  });

  it('matches localhost regardless of case', () => {
    expect(rewriteLoopbackUrl('http://LOCALHOST:8000', hostUri)).toBe('http://192.168.1.5:8000');
  });

  it('preserves HTTPS without adding a port', () => {
    expect(rewriteLoopbackUrl('https://localhost', hostUri)).toBe('https://192.168.1.5');
  });

  it('leaves a nonloopback URL unchanged', () => {
    expect(rewriteLoopbackUrl('https://api.firebuddy.app', hostUri)).toBe('https://api.firebuddy.app');
  });

  it('leaves a lookalike hostname unchanged', () => {
    expect(rewriteLoopbackUrl('http://localhost.example.com:8000', hostUri)).toBe('http://localhost.example.com:8000');
  });

  it('leaves an empty URL unchanged', () => {
    expect(rewriteLoopbackUrl('', hostUri)).toBe('');
  });

  it('leaves the URL unchanged for a missing host or tunnel hostname', () => {
    expect(rewriteLoopbackUrl('http://localhost:8000', null)).toBe('http://localhost:8000');
    expect(rewriteLoopbackUrl('http://localhost:8000', 'abc-anonymous-8081.exp.direct:80')).toBe('http://localhost:8000');
  });
});
