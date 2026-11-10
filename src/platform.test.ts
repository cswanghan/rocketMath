import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_ORIGIN,
  apiOrigin,
  apiUrl,
  isNativeApp,
  shellPolicy,
} from './platform';

describe('platform shell', () => {
  it('treats a normal browser as the website', () => {
    expect(isNativeApp({})).toBe(false);
    expect(isNativeApp({ Capacitor: { isNativePlatform: () => false } })).toBe(false);
    expect(apiOrigin({})).toBe('');
    expect(apiUrl('/api/auth/me', {})).toBe('/api/auth/me');
  });

  it('points the iOS shell at the Pages origin and tightens the network policy', () => {
    const win = { Capacitor: { isNativePlatform: () => true } };
    expect(isNativeApp(win)).toBe(true);
    expect(apiOrigin(win)).toBe(PRODUCTION_ORIGIN);
    expect(apiUrl('/api/family/children', win)).toBe(`${PRODUCTION_ORIGIN}/api/family/children`);
    expect(apiUrl('api/track', win)).toBe(`${PRODUCTION_ORIGIN}/api/track`);
    expect(apiUrl('https://example.com/x', win)).toBe('https://example.com/x');

    const policy = shellPolicy(true);
    expect(policy.uploadAnalytics).toBe(false);
    expect(policy.remoteSummary).toBe(false);
    expect(policy.externalCommerce).toBe(false);
    expect(policy.googleSignIn).toBe(false);
    expect(policy.remoteFonts).toBe(false);
    expect(policy.thirdPartyStrokeCdn).toBe(false);
    expect(policy.speechRecognition).toBe(false);
    expect(shellPolicy(false).uploadAnalytics).toBe(true);
  });

  it('does not throw if the native bridge throws', () => {
    const win = {
      Capacitor: {
        isNativePlatform: () => {
          throw new Error('bridge');
        },
      },
    };
    expect(isNativeApp(win)).toBe(false);
  });

  it('keeps the vanilla platform.js origin in lockstep', () => {
    const js = readFileSync('public/platform.js', 'utf8');
    expect(js).toContain(PRODUCTION_ORIGIN);
    expect(js).toContain('RM_NATIVE');
    expect(js).toContain('rmApi');
  });
});
