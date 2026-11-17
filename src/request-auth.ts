import type { Database } from './server-types';
import { verifyJWT } from './auth';
import { getJwtSecret } from './env';

// Identity alone is insufficient for access. Only the idempotent deletion route
// uses this to finish/retry cleanup of an already-deleted account.
export async function getRequestIdentity(request: Request, env: { JWT_SECRET?: string }) {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const payload = await verifyJWT(header.slice(7), getJwtSecret(env));
  if (!Number.isSafeInteger(payload?.userId) || payload!.userId <= 0) return null;
  return payload;
}

export async function getRequestUser(
  request: Request,
  env: { JWT_SECRET?: string; DB: Database },
) {
  const identity = await getRequestIdentity(request, env);
  if (!identity) return null;
  // Fail closed, including unknown statuses. Never fall back to JWT-only access
  // when the database is unavailable. Use current role/name, not stale claims.
  const user = await env.DB.prepare('SELECT id, username, role, status FROM users WHERE id = ?')
    .bind(identity.userId).first<{ id: number; username: string; role: string; status: string }>();
  if (!user || user.status !== 'approved') return null;
  return { ...identity, userId: user.id, username: user.username, role: user.role };
}
