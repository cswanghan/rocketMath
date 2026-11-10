import { describe, expect, it } from 'vitest';
import { decideAuthRefresh } from './auth-session';

const user = { id: 3, username: 'ada', role: 'user' };

describe('decideAuthRefresh', () => {
  it('keeps the cached session when the network fails or the server errors', () => {
    expect(decideAuthRefresh({ status: null, user })).toEqual({ action: 'keep' });
    expect(decideAuthRefresh({ status: 500, user })).toEqual({ action: 'keep' });
    expect(decideAuthRefresh({ status: 200, user: null })).toEqual({ action: 'keep' });
  });

  it('clears the session only when the server rejects the token', () => {
    expect(decideAuthRefresh({ status: 401, user })).toEqual({ action: 'clear' });
    expect(decideAuthRefresh({ status: 403, user })).toEqual({ action: 'clear' });
  });

  it('stores a successful profile', () => {
    expect(decideAuthRefresh({ status: 200, user })).toEqual({ action: 'set', user });
  });
});
