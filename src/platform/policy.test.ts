import { describe, expect, it, vi } from 'vitest';
import { apiTarget, API_ORIGIN, BackStack } from './policy';
import { validateSession } from './session';

describe('Android API boundary', () => {
  it('maps only bundled API calls to the existing HTTPS service', () => {
    expect(apiTarget('/api/auth/me', 'https://localhost')).toBe(`${API_ORIGIN}/api/auth/me`);
    expect(apiTarget('https://localhost/api/vocab/progress?a=1', 'https://localhost')).toBe(`${API_ORIGIN}/api/vocab/progress?a=1`);
  });
  it.each(['https://other.example/api/auth/me', '//other.example/api/auth/me', '/vendor/一.json', '/api/../admin', 'javascript:alert(1)', 'https://user:pass@localhost/api/auth/me'])('does not forward credentials for %s', path => {
    expect(apiTarget(path, 'https://localhost')).toBeNull();
  });
});

describe('native Back', () => {
  it('closes nested practice before its subject regardless of effect order', () => {
    const stack = new BackStack(); const parent = vi.fn(() => true); const child = vi.fn(() => true);
    const remove = stack.add(child, 20); stack.add(parent, 0);
    expect(stack.dispatch()).toBe(true); expect(parent).not.toHaveBeenCalled();
    remove(); expect(stack.dispatch()).toBe(true); expect(parent).toHaveBeenCalledOnce();
  });
  it('falls back to home/minimize when no view consumes Back', () => {
    const stack = new BackStack(); stack.add(() => false, 0); expect(stack.dispatch()).toBe(false);
  });
});

describe('offline account preservation', () => {
  const request = (response: Response) => vi.fn().mockResolvedValue(response);
  it.each([401, 403])('expires only explicitly rejected sessions (%i)', async status => {
    expect(await validateSession('test-only', request(new Response('', { status })))).toEqual({ kind: 'expired' });
  });
  it.each([429, 500, 503])('keeps the cached account on service error %i', async status => {
    expect(await validateSession('test-only', request(new Response('', { status })))).toEqual({ kind: 'unavailable' });
  });
  it('keeps the cached account when offline', async () => {
    expect(await validateSession('test-only', vi.fn().mockRejectedValue(new TypeError('offline')))).toEqual({ kind: 'unavailable' });
  });
  it('keeps the cached account on invalid JSON or missing user', async () => {
    for (const body of ['not json', '{}', '{"user":{}}']) {
      expect(await validateSession('test-only', request(new Response(body)))).toEqual({ kind: 'unavailable' });
    }
  });
  it('accepts a valid profile and sends authorization only as a header', async () => {
    const user = { id: 1, username: 'test-profile', role: 'user' };
    const fetcher = request(Response.json({ user }));
    expect(await validateSession('test-only', fetcher)).toEqual({ kind: 'valid', user });
    expect(fetcher).toHaveBeenCalledWith('/api/auth/me', { headers: { Authorization: 'Bearer test-only' } });
  });
});
