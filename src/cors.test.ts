import { describe, expect, it } from 'vitest';
import { nativeCorsHeaders } from './cors';

describe('native CORS', () => {
  it('allows only the installed shell origins', () => {
    expect(nativeCorsHeaders('capacitor://localhost')?.['Access-Control-Allow-Origin']).toBe('capacitor://localhost');
    expect(nativeCorsHeaders('ionic://localhost')?.['Access-Control-Allow-Methods']).toContain('DELETE');
    expect(nativeCorsHeaders('https://rocket-learning.pages.dev')).toBeNull();
    expect(nativeCorsHeaders('https://evil.example')).toBeNull();
    expect(nativeCorsHeaders(null)).toBeNull();
  });
});
