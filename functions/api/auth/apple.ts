import type { Database, PagesHandler } from '../../../src/server-types';
import { signJWT } from '../../../src/auth';
import { acquireAppleLock, AppleSignInError, appleErrorResponse, appleJSON, appleNonceHash, appleRequestBody,
  consumeAppleChallenge, encryptAppleRefreshToken, exchangeAppleCode, requireAppleSignInConfig,
  verifyAppleIdentity, revokeAppleRefreshToken, type AppleSignInEnvironment } from '../../../src/apple-sign-in';

interface Env extends AppleSignInEnvironment { DB: Database; JWT_SECRET?: string }
interface User { id: number; username: string; role: string; status: string }

// First-authorization name is optional, user-editable profile data, never identity
// evidence. The client only sends ASAuthorizationAppleIDCredential.fullName.
function firstName(body: Record<string, unknown>): string | null {
  if (!body.fullName || typeof body.fullName !== 'object') return null;
  const name = body.fullName as Record<string, unknown>;
  const parts = [name.givenName, name.familyName].filter((p): p is string => typeof p === 'string');
  return parts.join(' ').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120) || null;
}

export const onRequestPost: PagesHandler<Env> = async ({ request, env }) => {
  try {
    await requireAppleSignInConfig(env);
    if (!env.JWT_SECRET) throw new AppleSignInError('apple_unavailable');
    const body = await appleRequestBody(request);
    if (typeof body.identityToken !== 'string' || typeof body.authorizationCode !== 'string'
        || !body.authorizationCode || body.authorizationCode.length > 4096
        || typeof body.rawNonce !== 'string' || !/^[a-f0-9]{64}$/.test(body.rawNonce)
        || typeof body.challengeId !== 'string' || body.challengeId.length > 64) {
      throw new AppleSignInError('apple_invalid', 400);
    }
    const hash = await appleNonceHash(body.rawNonce);
    const identity = await verifyAppleIdentity(body.identityToken, hash);
    await consumeAppleChallenge(env.DB, body.challengeId, hash);
    const lock = await acquireAppleLock(env.DB, identity.sub);
    try {
      const db = env.DB;
      let user = await db.prepare('SELECT id, username, role, status FROM users WHERE apple_sub = ?')
        .bind(identity.sub).first<User>();
      if (user && !['approved', 'deleting'].includes(user.status)) throw new AppleSignInError('apple_account_unavailable', 403);
      const email = identity.email || null;
      if (!user && email) {
        // Case-insensitive conflict check is stricter than SQLite's original
        // unique email column. No user lookup by email is ever used to sign in.
        const collision = await db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').bind(email).first();
        if (collision) throw new AppleSignInError('apple_email_conflict', 409);
      }
      const refreshToken = await exchangeAppleCode(env, body.authorizationCode, identity);
      const encrypted = await encryptAppleRefreshToken(env, identity.sub, refreshToken);
      const tokenId = crypto.randomUUID();
      const statements = [lock.fence()];
      if (!user) {
        statements.push(db.prepare(`INSERT INTO users (username, password, email, apple_sub, apple_name, status, role)
          VALUES (?, '!', ?, ?, ?, 'approved', 'user')`)
          .bind(`apple_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`, email, identity.sub, firstName(body)));
      }
      statements.push(db.prepare(`INSERT INTO apple_sign_in_tokens (id, user_id, encrypted_token, created_at)
        SELECT ?, id, ?, ? FROM users WHERE apple_sub = ? AND status IN ('approved', 'deleting') RETURNING id`)
        .bind(tokenId, encrypted, Math.floor(Date.now() / 1000), identity.sub));
      try {
        await lock.renew();
        const results = await db.batch(statements);
        if (results.some(r => !r.success) || results.at(-1)?.results.length !== 1) throw new AppleSignInError('apple_unavailable');
      } catch {
        // No app session is issued unless revocation storage was confirmed.
        // Compensate a failed write with revoke; a lost response can safely be
        // retried via a fresh Apple authorization. Never log either credential.
        await revokeAppleRefreshToken(env, identity.sub, encrypted).catch(() => {});
        if (email && await db.prepare('SELECT id FROM users WHERE lower(email) = lower(?) AND (apple_sub IS NULL OR apple_sub <> ?)')
          .bind(email, identity.sub).first()) throw new AppleSignInError('apple_email_conflict', 409);
        throw new AppleSignInError('apple_unavailable');
      }
      user = await db.prepare('SELECT id, username, role, status FROM users WHERE apple_sub = ?').bind(identity.sub).first<User>();
      if (!user || !['approved', 'deleting'].includes(user.status)) throw new AppleSignInError('apple_account_unavailable', 403);
      const publicUser = { id: user.id, username: user.username, role: user.role };
      const token = await signJWT({ userId: user.id, username: user.username, role: user.role }, env.JWT_SECRET);
      // A fresh, verified Apple authorization can recover a lost/expired delete
      // retry session. It never restores approved status or grants data access.
      return appleJSON({ token, user: publicUser, deletionPending: user.status === 'deleting' });
    } finally {
      // A release outage expires after 120s; never expose SQL or credential data.
      await lock.release().catch(() => {});
    }
  } catch (error) { return appleErrorResponse(error); }
};
