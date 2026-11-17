import type { Database } from './server-types';

const ISSUER = 'https://appleid.apple.com';
const CLIENT_ID = 'com.hanwang.xingya';
const encoder = new TextEncoder();
const now = () => Math.floor(Date.now() / 1000);

// Deliberately separate from every StoreKit / App Store Server API credential.
export interface AppleSignInEnvironment {
  APPLE_SIGN_IN_TEAM_ID?: string;
  APPLE_SIGN_IN_CLIENT_ID?: string;
  APPLE_SIGN_IN_KEY_ID?: string;
  APPLE_SIGN_IN_PRIVATE_KEY?: string;
  APPLE_SIGN_IN_TOKEN_ENCRYPTION_KEY?: string;
}

export class AppleSignInError extends Error {
  constructor(public code: 'apple_unavailable' | 'apple_invalid' | 'apple_email_conflict' | 'apple_account_unavailable',
    public status = 503) { super(code); }
}
const invalid = () => new AppleSignInError('apple_invalid', 400);
const unavailable = () => new AppleSignInError('apple_unavailable');

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
function encodeJSON(value: unknown): string { return base64url(encoder.encode(JSON.stringify(value))); }
export async function appleNonceHash(rawNonce: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(rawNonce))))
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function encryptionKey(env: AppleSignInEnvironment): Promise<CryptoKey> {
  try {
    const bytes = decode(env.APPLE_SIGN_IN_TOKEN_ENCRYPTION_KEY || '');
    if (bytes.length !== 32) throw unavailable();
    return await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  } catch { throw unavailable(); }
}

export async function appleClientSecret(env: AppleSignInEnvironment): Promise<string> {
  if (env.APPLE_SIGN_IN_TEAM_ID !== 'QY29J9ZMPU' || env.APPLE_SIGN_IN_CLIENT_ID !== CLIENT_ID
      || !env.APPLE_SIGN_IN_KEY_ID || !env.APPLE_SIGN_IN_PRIVATE_KEY) throw unavailable();
  try {
    const pem = env.APPLE_SIGN_IN_PRIVATE_KEY.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '');
    const key = await crypto.subtle.importKey('pkcs8', decode(pem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    const input = `${encodeJSON({ alg: 'ES256', kid: env.APPLE_SIGN_IN_KEY_ID })}.${encodeJSON({
      iss: env.APPLE_SIGN_IN_TEAM_ID, sub: CLIENT_ID, aud: ISSUER, iat: now(), exp: now() + 300,
    })}`;
    const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(input));
    return `${input}.${base64url(new Uint8Array(signature))}`;
  } catch { throw unavailable(); }
}

export async function requireAppleSignInConfig(env: AppleSignInEnvironment) {
  await encryptionKey(env);
  await appleClientSecret(env);
}

export interface AppleIdentity {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  nonce: string;
}
type AppleJWK = JsonWebKey & { kid: string };

// Only Apple's fixed HTTPS JWKS is consulted; no token-supplied key/URL is used.
// Fetch per authorization (also handles key rotation without stale kid caches).
export async function verifyAppleIdentity(token: string, nonceHash: string): Promise<AppleIdentity> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || token.length > 16384 || !/^[a-f0-9]{64}$/.test(nonceHash)) throw invalid();
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.crit) throw invalid();
    const response = await fetch(`${ISSUER}/auth/keys`, { signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!response.ok) throw unavailable();
    const jwks = await response.json() as { keys: AppleJWK[] };
    const jwk = jwks.keys.find(k => k.kid === header.kid && k.kty === 'RSA' && k.alg === 'RS256' && k.use === 'sig');
    if (!jwk) throw invalid();
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`))) throw invalid();
    const claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    if (claims.iss !== ISSUER || claims.aud !== CLIENT_ID || !Number.isSafeInteger(claims.exp) || claims.exp <= now()
        || !Number.isSafeInteger(claims.iat) || claims.iat > now() + 30 || claims.iat < now() - 600
        || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255
        || claims.nonce !== nonceHash) throw invalid();
    // Apple's Managed Apple Accounts can have an empty or unverified email.
    // Identity is the signed sub, never email. Omit unverified profile data so it
    // cannot collide with, link to, or overwrite an existing account's email.
    const verifiedEmail = claims.email_verified === true || claims.email_verified === 'true';
    let email: string | undefined;
    if (verifiedEmail && claims.email !== undefined && claims.email !== '') {
      if (typeof claims.email !== 'string' || claims.email.length > 254
          || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)) throw invalid();
      email = claims.email;
    }
    return { sub: claims.sub, nonce: claims.nonce, email };
  } catch (error) {
    if (error instanceof AppleSignInError) throw error;
    throw invalid();
  }
}

export async function createAppleChallenge(db: Database, hash: string) {
  if (!/^[a-f0-9]{64}$/.test(hash)) throw invalid();
  // Tombstones outlive both the five-minute challenge and accepted token age.
  await db.prepare('DELETE FROM apple_sign_in_challenges WHERE expires_at < ?').bind(now() - 86400).run();
  const id = crypto.randomUUID();
  const expiresAt = now() + 300;
  const inserted = await db.prepare(`INSERT INTO apple_sign_in_challenges (id, nonce_hash, created_at, expires_at)
    VALUES (?, ?, ?, ?) ON CONFLICT(nonce_hash) DO NOTHING RETURNING id`)
    .bind(id, hash, now(), expiresAt).first();
  if (!inserted) throw invalid();
  return { challengeId: id, expiresAt };
}

export async function consumeAppleChallenge(db: Database, challengeId: string, hash: string) {
  const consumed = await db.prepare(`UPDATE apple_sign_in_challenges SET consumed_at = ?
    WHERE id = ? AND nonce_hash = ? AND consumed_at IS NULL AND expires_at > ? RETURNING id`)
    .bind(now(), challengeId, hash, now()).first();
  if (!consumed) throw invalid();
}

async function applePost(env: AppleSignInEnvironment, endpoint: 'token' | 'revoke', fields: Record<string, string>) {
  return fetch(`${ISSUER}/auth/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: await appleClientSecret(env), ...fields }),
    signal: AbortSignal.timeout(10000), redirect: 'error',
  });
}

export async function exchangeAppleCode(env: AppleSignInEnvironment, code: string, identity: AppleIdentity) {
  const response = await applePost(env, 'token', { code, grant_type: 'authorization_code' });
  if (!response.ok) throw unavailable(); // Never expose Apple's body (may contain credentials).
  const result = await response.json() as { id_token?: string; refresh_token?: string; error?: unknown };
  if (result.error || typeof result.id_token !== 'string' || typeof result.refresh_token !== 'string'
      || !result.refresh_token || result.refresh_token.length > 8192) throw unavailable();
  try {
    const exchanged = await verifyAppleIdentity(result.id_token, identity.nonce);
    if (exchanged.sub !== identity.sub) throw invalid();
  } catch (error) {
    await revokeRawAppleRefreshToken(env, result.refresh_token).catch(() => {});
    throw error;
  }
  return result.refresh_token;
}

export async function encryptAppleRefreshToken(env: AppleSignInEnvironment, sub: string, token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(sub) },
    await encryptionKey(env), encoder.encode(token));
  return `v1.${base64url(iv)}.${base64url(new Uint8Array(ciphertext))}`;
}

export async function revokeAppleRefreshToken(env: AppleSignInEnvironment, sub: string, encrypted: string) {
  const [version, iv, ciphertext] = encrypted.split('.');
  if (version !== 'v1' || !iv || !ciphertext) throw unavailable();
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(iv), additionalData: encoder.encode(sub) },
    await encryptionKey(env), decode(ciphertext));
  await revokeRawAppleRefreshToken(env, new TextDecoder().decode(plaintext));
}

async function revokeRawAppleRefreshToken(env: AppleSignInEnvironment, token: string) {
  const response = await applePost(env, 'revoke', { token, token_type_hint: 'refresh_token' });
  // Apple documents 200 with an empty body, also for already-invalidated tokens.
  if (response.status !== 200 || (await response.text()).trim() !== '') throw unavailable();
}

export async function acquireAppleLock(db: Database, sub: string) {
  const owner = crypto.randomUUID();
  const row = await db.prepare(`INSERT INTO apple_sign_in_locks (apple_sub, owner, expires_at) VALUES (?, ?, ?)
    ON CONFLICT(apple_sub) DO UPDATE SET owner = excluded.owner, expires_at = excluded.expires_at
    WHERE apple_sign_in_locks.expires_at < ? RETURNING owner`).bind(sub, owner, now() + 120, now()).first();
  if (!row) throw unavailable();
  return {
    // Put this first in any write batch. A lost/expired lease causes a NOT NULL
    // violation, rolling back the whole batch instead of committing stale work.
    fence() {
      return db.prepare(`INSERT INTO apple_sign_in_locks (apple_sub, owner, expires_at) VALUES (?, ?, ?)
        ON CONFLICT(apple_sub) DO UPDATE SET expires_at = CASE
          WHEN apple_sign_in_locks.owner = excluded.owner AND apple_sign_in_locks.expires_at > ?
          THEN excluded.expires_at ELSE NULL END`).bind(sub, owner, now() + 120, now());
    },
    async renew() {
      const valid = await db.prepare(`UPDATE apple_sign_in_locks SET expires_at = ?
        WHERE apple_sub = ? AND owner = ? AND expires_at > ? RETURNING owner`)
        .bind(now() + 120, sub, owner, now()).first();
      if (!valid) throw unavailable();
    },
    async release() {
      await db.prepare('DELETE FROM apple_sign_in_locks WHERE apple_sub = ? AND owner = ?').bind(sub, owner).run();
    },
  };
}

export function appleErrorResponse(error: unknown): Response {
  const known = error instanceof AppleSignInError ? error : unavailable();
  const messages = {
    apple_unavailable: 'Apple 登录未配置或暂时不可用，请稍后重试。',
    apple_invalid: 'Apple 登录验证已失效，请重新使用 Apple 登录。',
    apple_email_conflict: '此邮箱已用于其他星芽账号，请使用原来的登录方式。Apple 账号不会自动合并。',
    apple_account_unavailable: '此账号不可用或正在删除，请稍后重试。',
  };
  return appleJSON({ error: messages[known.code], code: known.code }, known.status);
}
export function appleJSON(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

export async function appleRequestBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.text();
  if (body.length > 24576) throw invalid();
  try {
    const result = JSON.parse(body);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw invalid();
    return result;
  } catch { throw invalid(); }
}
