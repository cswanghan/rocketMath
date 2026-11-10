// Decide what a session refresh is allowed to do.
// A dropped network must not log the learner out; a rejected token must.

export interface SessionUser {
  id: number;
  username: string;
  role: string;
}

export type AuthRefresh =
  | { action: 'set'; user: SessionUser }
  | { action: 'clear' }
  | { action: 'keep' };

export function decideAuthRefresh(input: {
  /** null means the request never completed (offline, DNS, CORS). */
  status: number | null;
  user?: SessionUser | null;
}): AuthRefresh {
  if (input.status === null) return { action: 'keep' };
  if (input.status === 401 || input.status === 403) return { action: 'clear' };
  if (input.status >= 200 && input.status < 300 && input.user && input.user.username) {
    return { action: 'set', user: input.user };
  }
  return { action: 'keep' };
}
