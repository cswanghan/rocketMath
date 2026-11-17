import type { Database } from './server-types';

const ISSUER = 'https://appleid.apple.com';
const CLIENT_ID = 'com.hanwang.xingya';
const encoder = new TextEncoder();
const now = () => Math.floor(Date.now() / 1000);
// Starts before Apple's authorization sheet, which may require a slow first-time
// consent/2FA flow. Apple's token expiry and one-use code remain authoritative.
export const APPLE_CHALLENGE_LIFETIME_SECONDS = 30 * 60;

// Deliberately separate from every StoreKit / App Store Server API credential.
export interface AppleSignInEnvironment {
  APPLE_SIGN_IN_TEAM_ID?: string;
  APPLE_SIGN_IN_CLIENT_ID?: string;
  APPLE_SIGN_IN_KEY_ID?: string;
  APPLE_SIGN_IN_PRIVATE_KEY?: string;
  APPLE_SIGN_IN_TOKEN_ENCRYPTION_KEY?: string;
}

type AppleFailureReason =
  | 'configuration' | 'request_invalid' | 'token_malformed' | 'algorithm_invalid'
  | 'jwks_network' | 'jwks_timeout' | 'jwks_http' | 'jwks_malformed' | 'signing_key_unknown'
  | 'signature_invalid' | 'issuer_invalid' | 'audience_invalid' | 'token_expired'
  | 'token_time_invalid' | 'subject_invalid' | 'nonce_invalid' | 'email_invalid'
  | 'challenge_duplicate' | 'challenge_missing' | 'challenge_nonce_mismatch'
  | 'challenge_expired' | 'challenge_consumed' | 'challenge_rejected'
  | 'exchange_network' | 'exchange_timeout' | 'exchange_rejected' | 'exchange_malformed'
  | 'exchange_subject_mismatch' | 'token_storage' | 'account_busy' | 'account_unavailable'
  | 'email_conflict' | 'revocation_failed' | 'internal_error';
type AppleOAuthError = 'invalid_request' | 'invalid_client' | 'invalid_grant'
  | 'unauthorized_client' | 'unsupported_grant_type' | 'invalid_scope' | 'server_error'
  | 'temporarily_unavailable' | 'unknown';
export type AppleSignInStage = 'configuration' | 'request' | 'challenge_create' | 'identity'
  | 'challenge' | 'account_lock' | 'account' | 'code_exchange' | 'token_storage' | 'session';

export class AppleSignInError extends Error {
  constructor(public code: 'apple_unavailable' | 'apple_invalid' | 'apple_email_conflict' | 'apple_account_unavailable',
    public status = 503, public reason: AppleFailureReason = 'internal_error',
    public upstreamStatus?: number, public upstreamError?: AppleOAuthError) { super(code); }
}
const invalid = (reason: AppleFailureReason = 'request_invalid') => new AppleSignInError('apple_invalid', 400, reason);
const unavailable = (reason: AppleFailureReason = 'configuration') => new AppleSignInError('apple_unavailable', 503, reason);
const isTimeout = (error: unknown) => error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name);

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
  let header: { alg?: unknown; kid?: unknown; crit?: unknown };
  let claims: Record<string, unknown>;
  let signature: Uint8Array<ArrayBuffer>;
  const parts = token.split('.');
  try {
    if (parts.length !== 3 || token.length > 16384 || !/^[a-f0-9]{64}$/.test(nonceHash)) throw invalid('token_malformed');
    header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    signature = decode(parts[2]);
    if (!header || typeof header !== 'object' || !claims || typeof claims !== 'object'
        || Array.isArray(header) || Array.isArray(claims)) throw invalid('token_malformed');
  } catch { throw invalid('token_malformed'); }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.crit) throw invalid('algorithm_invalid');
  let response: Response;
  try {
    // Workers rejects redirect: 'error' before sending the request. Manual plus
    // the status check below preserves the policy of never following redirects.
    response = await fetch(`${ISSUER}/auth/keys`, { signal: AbortSignal.timeout(10000), redirect: 'manual' });
  } catch (error) { throw unavailable(isTimeout(error) ? 'jwks_timeout' : 'jwks_network'); }
  if (!response.ok) throw new AppleSignInError('apple_unavailable', 503, 'jwks_http', response.status);
  let key: CryptoKey;
  try {
    const jwks = await response.json() as { keys: AppleJWK[] };
    if (!Array.isArray(jwks.keys)) throw unavailable('jwks_malformed');
    const jwk = jwks.keys.find(k => k.kid === header.kid && k.kty === 'RSA' && k.alg === 'RS256' && k.use === 'sig');
    if (!jwk) throw invalid('signing_key_unknown');
    key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  } catch (error) {
    if (error instanceof AppleSignInError) throw error;
    if (isTimeout(error)) throw unavailable('jwks_timeout');
    throw unavailable('jwks_malformed');
  }
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, encoder.encode(`${parts[0]}.${parts[1]}`))) {
    throw invalid('signature_invalid');
  }
  if (claims.iss !== ISSUER) throw invalid('issuer_invalid');
  if (claims.aud !== CLIENT_ID) throw invalid('audience_invalid');
  if (typeof claims.exp !== 'number' || !Number.isSafeInteger(claims.exp)) throw invalid('token_time_invalid');
  if (claims.exp <= now()) throw invalid('token_expired');
  // Do not invent a shorter lifetime than the signed exp. A delayed/backgrounded
  // callback is bound by the nonce, the one-use server challenge and Apple's code.
  if (typeof claims.iat !== 'number' || !Number.isSafeInteger(claims.iat)
      || claims.iat <= 0 || claims.iat > now() + 60 || claims.iat >= claims.exp) throw invalid('token_time_invalid');
  if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255) throw invalid('subject_invalid');
  if (claims.nonce !== nonceHash) throw invalid('nonce_invalid');
  // Apple's Managed Apple Accounts can have an empty or unverified email.
  // Identity is the signed sub, never email. Omit unverified profile data so it
  // cannot collide with, link to, or overwrite an existing account's email.
  const verifiedEmail = claims.email_verified === true || claims.email_verified === 'true';
  let email: string | undefined;
  if (verifiedEmail && claims.email !== undefined && claims.email !== '') {
    if (typeof claims.email !== 'string' || claims.email.length > 254
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)) throw invalid('email_invalid');
    email = claims.email;
  }
  return { sub: claims.sub, nonce: nonceHash, email };
}

export async function createAppleChallenge(db: Database, hash: string) {
  if (!/^[a-f0-9]{64}$/.test(hash)) throw invalid();
  // Keep consumed nonce tombstones beyond the authorization window.
  await db.prepare('DELETE FROM apple_sign_in_challenges WHERE expires_at < ?').bind(now() - 86400).run();
  const id = crypto.randomUUID();
  const expiresAt = now() + APPLE_CHALLENGE_LIFETIME_SECONDS;
  const inserted = await db.prepare(`INSERT INTO apple_sign_in_challenges (id, nonce_hash, created_at, expires_at)
    VALUES (?, ?, ?, ?) ON CONFLICT(nonce_hash) DO NOTHING RETURNING id`)
    .bind(id, hash, now(), expiresAt).first();
  if (!inserted) throw invalid('challenge_duplicate');
  return { challengeId: id, expiresAt };
}

export async function consumeAppleChallenge(db: Database, challengeId: string, hash: string) {
  const consumed = await db.prepare(`UPDATE apple_sign_in_challenges SET consumed_at = ?
    WHERE id = ? AND nonce_hash = ? AND consumed_at IS NULL AND expires_at > ? RETURNING id`)
    .bind(now(), challengeId, hash, now()).first();
  if (!consumed) {
    // The atomic UPDATE above is the only authority to accept a challenge. This
    // read is diagnostic only; concurrent requests cannot bypass the one-use gate.
    const row = await db.prepare('SELECT nonce_hash, expires_at, consumed_at FROM apple_sign_in_challenges WHERE id = ?')
      .bind(challengeId).first<{ nonce_hash: string; expires_at: number; consumed_at: number | null }>();
    if (!row) throw invalid('challenge_missing');
    if (row.nonce_hash !== hash) throw invalid('challenge_nonce_mismatch');
    if (row.consumed_at !== null) throw invalid('challenge_consumed');
    if (row.expires_at <= now()) throw invalid('challenge_expired');
    throw invalid('challenge_rejected');
  }
}

async function applePost(env: AppleSignInEnvironment, endpoint: 'token' | 'revoke', fields: Record<string, string>) {
  return fetch(`${ISSUER}/auth/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: await appleClientSecret(env), ...fields }),
    // Token exchange and revocation also reject non-success statuses below.
    signal: AbortSignal.timeout(10000), redirect: 'manual',
  });
}

export async function exchangeAppleCode(env: AppleSignInEnvironment, code: string, identity: AppleIdentity) {
  let response: Response;
  try {
    response = await applePost(env, 'token', { code, grant_type: 'authorization_code' });
  } catch (error) {
    if (error instanceof AppleSignInError) throw error;
    throw unavailable(isTimeout(error) ? 'exchange_timeout' : 'exchange_network');
  }
  // Only an allowlisted OAuth code and HTTP status may reach diagnostics. Never
  // retain/log error_description, response bodies, tokens, codes or client_secret.
  let result: { id_token?: unknown; refresh_token?: unknown; error?: unknown };
  try {
    result = await response.json();
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw unavailable('exchange_malformed');
  } catch (error) {
    if (isTimeout(error)) throw unavailable('exchange_timeout');
    throw new AppleSignInError('apple_unavailable', 503, 'exchange_malformed', response.status);
  }
  if (!response.ok || result.error) {
    const allowed: AppleOAuthError[] = ['invalid_request', 'invalid_client', 'invalid_grant', 'unauthorized_client',
      'unsupported_grant_type', 'invalid_scope', 'server_error', 'temporarily_unavailable'];
    const upstreamError = allowed.find(value => value === result.error) ?? 'unknown';
    // invalid_grant can mean expired OR already consumed OR issued to another
    // client. Preserve Apple's exact category; do not invent a specific expiry.
    throw new AppleSignInError(upstreamError === 'invalid_grant' ? 'apple_invalid' : 'apple_unavailable',
      upstreamError === 'invalid_grant' ? 400 : 503, 'exchange_rejected', response.status, upstreamError);
  }
  if (typeof result.id_token !== 'string' || typeof result.refresh_token !== 'string'
      || !result.refresh_token || result.refresh_token.length > 8192) throw unavailable('exchange_malformed');
  try {
    const exchanged = await verifyAppleIdentity(result.id_token, identity.nonce);
    if (exchanged.sub !== identity.sub) throw invalid('exchange_subject_mismatch');
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
  if (response.status !== 200 || (await response.text()).trim() !== '') throw unavailable('revocation_failed');
}

export async function acquireAppleLock(db: Database, sub: string) {
  const owner = crypto.randomUUID();
  const row = await db.prepare(`INSERT INTO apple_sign_in_locks (apple_sub, owner, expires_at) VALUES (?, ?, ?)
    ON CONFLICT(apple_sub) DO UPDATE SET owner = excluded.owner, expires_at = excluded.expires_at
    WHERE apple_sign_in_locks.expires_at < ? RETURNING owner`).bind(sub, owner, now() + 120, now()).first();
  if (!row) throw unavailable('account_busy');
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
      if (!valid) throw unavailable('account_busy');
    },
    async release() {
      await db.prepare('DELETE FROM apple_sign_in_locks WHERE apple_sub = ? AND owner = ?').bind(sub, owner).run();
    },
  };
}

export function appleErrorResponse(error: unknown, stage: AppleSignInStage): Response {
  const known = error instanceof AppleSignInError ? error : unavailable('internal_error');
  // Deliberately build the diagnostic from finite categories. Never serialize
  // the Error/request/identity, and never include account or challenge identifiers.
  console.warn('apple_sign_in_failed', {
    stage, reason: known.reason, code: known.code,
    ...(known.upstreamStatus === undefined ? {} : { upstreamStatus: known.upstreamStatus }),
    ...(known.upstreamError === undefined ? {} : { upstreamError: known.upstreamError }),
  });
  const messages = {
    apple_unavailable: 'Apple 登录未配置或暂时不可用，请稍后重试。',
    apple_invalid: '无法验证 Apple 登录，请重新使用 Apple 登录。',
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
