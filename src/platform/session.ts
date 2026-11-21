export interface CachedUser { id: number; username: string; role: string }
export type SessionResult = { kind: 'valid'; user: CachedUser } | { kind: 'expired' } | { kind: 'unavailable' };

export async function validateSession(token: string, request: typeof fetch = fetch): Promise<SessionResult> {
  try {
    const response = await request('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401 || response.status === 403) return { kind: 'expired' };
    if (!response.ok) return { kind: 'unavailable' };
    const { user } = await response.json();
    if (!user || typeof user.id !== 'number' || typeof user.username !== 'string') return { kind: 'unavailable' };
    return { kind: 'valid', user };
  } catch { return { kind: 'unavailable' }; }
}
