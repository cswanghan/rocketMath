import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { appleSignInFixture } from './test-support/apple-sign-in-fixture';
import { SQLiteD1 } from './test-support/sqlite-d1';
import { acquireAppleLock, APPLE_CHALLENGE_LIFETIME_SECONDS, appleNonceHash, verifyAppleIdentity } from './apple-sign-in';
import { hashPassword, signJWT, verifyJWT, verifyPassword } from './auth';
import { getRequestUser } from './request-auth';
import { onRequestPost as challenge } from '../functions/api/auth/apple-challenge';
import { onRequestPost as appleLogin } from '../functions/api/auth/apple';
import { onRequestPost as deleteAccount } from '../functions/api/auth/delete-account';
import { onRequestPost as passwordLogin } from '../functions/api/auth/login';
import { onRequestGet as me } from '../functions/api/auth/me';
import { resolveGoogleLogin } from '../functions/api/auth/_googleLogin';
// @ts-ignore Node types are not installed in this repository.
import { readFileSync } from 'node:fs';

let fixture: Awaited<ReturnType<typeof appleSignInFixture>>;
let db: SQLiteD1;
const jwtSecret = 'test-only-session-secret';
const env = () => ({ DB: db, JWT_SECRET: jwtSecret, ...fixture.env });
function context(body: unknown, session?: string, override: Record<string, unknown> = {}): any {
  return { env: { ...env(), ...override }, request: new Request('https://unit.invalid/api/auth/apple', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}) },
    body: JSON.stringify(body),
  }) };
}
const row = (sql: string) => db.sqlite.prepare(sql).get();
const count = (table: string) => row(`SELECT count(*) n FROM ${table}`).n;
async function authorization(overrides: Record<string, unknown> = {}) {
  const rawNonce = fixture.rawNonce();
  const nonceHash = await appleNonceHash(rawNonce);
  const challengeResponse = await challenge(context({ nonceHash }));
  expect(challengeResponse.status).toBe(200);
  const { challengeId } = await challengeResponse.json() as { challengeId: string };
  const identityToken = await fixture.token(rawNonce, overrides);
  const authorizationCode = crypto.randomUUID();
  fixture.codeTokens.set(authorizationCode, identityToken);
  return { rawNonce, challengeId, identityToken, authorizationCode };
}
async function login(overrides: Record<string, unknown> = {}) {
  const response = await appleLogin(context(await authorization(overrides)));
  expect(response.status).toBe(200);
  return await response.json() as { token: string; user: { id: number; username: string } };
}
function seedMembership() {
  db.sqlite.exec(`INSERT INTO users(id,username,password,email) VALUES (1,'original','!','owner@example.invalid');
    INSERT INTO native_subscription_accounts VALUES (1,'fixture-account-binding');
    INSERT INTO native_subscription_bindings VALUES (1,'Sandbox','fixture-original-transaction');`);
}
beforeAll(async () => { fixture = await appleSignInFixture(); });
beforeEach(() => {
  db = new SQLiteD1();
  fixture.setRevoke(200); fixture.setExchange(200); fixture.substituteExchange('');
  fixture.setRefreshToken(true); fixture.codeTokens.clear();
  fixture.calls.length = 0; fixture.issuedRefreshTokens.length = 0; fixture.revoked.length = 0;
  vi.stubGlobal('fetch', fixture.fetcher);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { db.sqlite.close(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Apple identity signature and claims', () => {
  it('accepts an RSA-signed fixture from the pinned Apple JWKS', async () => {
    const nonce = fixture.rawNonce();
    const identity = await verifyAppleIdentity(await fixture.token(nonce), await appleNonceHash(nonce));
    expect(identity.sub).toBe('fixture-apple-subject');
  });
  it.each([
    ['issuer', { iss: 'https://attacker.invalid' }], ['audience', { aud: 'another.app' }],
    ['expired', { exp: 1 }], ['missing expiry', { exp: undefined }], ['missing nonce', { nonce: undefined }],
    ['wrong nonce', { nonce: 'wrong' }], ['missing sub', { sub: undefined }],
    ['future issue time', { iat: 9999999999 }], ['invalid issue time', { iat: 0 }],
    ['malformed verified email', { email: 'invalid-address' }],
  ])('rejects %s', async (_, overrides) => {
    const nonce = fixture.rawNonce();
    await expect(verifyAppleIdentity(await fixture.token(nonce, overrides), await appleNonceHash(nonce)))
      .rejects.toThrow('apple_invalid');
  });
  it('rejects a bad signature and algorithm confusion', async () => {
    const nonce = fixture.rawNonce();
    const hash = await appleNonceHash(nonce);
    const token = await fixture.token(nonce);
    const parts = token.split('.');
    parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
    await expect(verifyAppleIdentity(parts.join('.'), hash)).rejects.toThrow('apple_invalid');
    await expect(verifyAppleIdentity(await fixture.token(nonce, {}, undefined, { alg: 'none' }), hash)).rejects.toThrow('apple_invalid');
  });
});

describe('Apple nonce lifecycle and configuration', () => {
  it('accepts a challenge once, including concurrent requests; cannot re-register its hash', async () => {
    const body = await authorization();
    const responses = await Promise.all([appleLogin(context(body)), appleLogin(context(body))]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 400]);
    expect((await challenge(context({ nonceHash: await appleNonceHash(body.rawNonce) }))).status).toBe(400);
    expect(count('users')).toBe(1);
  });
  it('rejects expired, absent, and mismatched challenges without issuing a session', async () => {
    const body = await authorization();
    expect((await appleLogin(context({ ...body, challengeId: 'absent' }))).status).toBe(400);
    expect((await appleLogin(context({ ...body, rawNonce: fixture.rawNonce() }))).status).toBe(400);
    db.sqlite.exec('UPDATE apple_sign_in_challenges SET expires_at = 1');
    expect((await appleLogin(context(body))).status).toBe(400);
    expect(count('users')).toBe(0);
  });
  it('fails closed without configuration, without the app JWT secret, or with StoreKit-only configuration', async () => {
    for (const key of Object.keys(fixture.env).concat('JWT_SECRET')) {
      const response = await challenge(context({ nonceHash: 'a'.repeat(64) }, undefined, { [key]: undefined }));
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ code: 'apple_unavailable' });
    }
    const response = await appleLogin({ request: context({}).request, env: { DB: db, JWT_SECRET: jwtSecret,
      APPLE_KEY_ID: 'storekit-only', APPLE_PRIVATE_KEY: 'storekit-only' } as any });
    expect(response.status).toBe(503);
    expect(count('users')).toBe(0);
  });
  it('rejects an exchanged token for another subject', async () => {
    const body = await authorization();
    fixture.substituteExchange(await fixture.token(body.rawNonce, { sub: 'different-sub' }));
    expect((await appleLogin(context(body))).status).toBe(400);
    expect(count('users')).toBe(0);
  });
  it('does not create an account when Apple code exchange fails', async () => {
    fixture.setExchange(400);
    expect((await appleLogin(context(await authorization()))).status).toBe(503);
    expect(count('users')).toBe(0);
  });
  it.each([false, true])('fails closed on a missing refresh token (existing account: %s)', async existing => {
    if (existing) await login();
    fixture.setRefreshToken(false);
    const body = await authorization();
    const response = await appleLogin(context(body));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'apple_unavailable' });
    expect(count('users')).toBe(existing ? 1 : 0);
    expect(count('apple_sign_in_tokens')).toBe(existing ? 1 : 0);
    expect((await appleLogin(context(body))).status).toBe(400);
  });
  it.each([
    ['missing nonce', { nonce: undefined }], ['wrong nonce', { nonce: 'wrong' }],
    ['wrong audience', { aud: 'another.app' }], ['expired', { exp: 1 }],
  ])('rejects exchanged identity with %s and revokes the issued grant', async (_, overrides) => {
    const body = await authorization();
    fixture.substituteExchange(await fixture.token(body.rawNonce, overrides));
    expect((await appleLogin(context(body))).status).toBe(400);
    expect(count('users')).toBe(0);
    expect(fixture.revoked.length).toBe(1);
  });
  it('a fresh authorization succeeds after a failed exchange, while replay stays rejected', async () => {
    const body = await authorization();
    fixture.setExchange(400);
    expect((await appleLogin(context(body))).status).toBe(503);
    fixture.setExchange(200);
    expect((await appleLogin(context(body))).status).toBe(400);
    await login();
    expect(count('users')).toBe(1);
  });
  it('a fresh authorization succeeds after a rolled-back DB write and compensation', async () => {
    const body = await authorization();
    db.sqlite.exec("CREATE TRIGGER fail_token BEFORE INSERT ON apple_sign_in_tokens BEGIN SELECT RAISE(ABORT,'fixture failure'); END;");
    expect((await appleLogin(context(body))).status).toBe(503);
    db.sqlite.exec('DROP TRIGGER fail_token');
    expect((await appleLogin(context(body))).status).toBe(400);
    await login();
    expect(count('users')).toBe(1);
    expect(fixture.revoked.length).toBe(1);
  });
  it('revokes the issued grant if token storage fails, with no account or session created', async () => {
    const body = await authorization();
    db.sqlite.exec("CREATE TRIGGER fail_token BEFORE INSERT ON apple_sign_in_tokens BEGIN SELECT RAISE(ABORT,'fixture failure'); END;");
    const response = await appleLogin(context(body));
    expect(response.status).toBe(503);
    const result = await response.json() as any;
    expect(result.token === undefined).toBe(true);
    expect(count('users')).toBe(0);
    expect(count('apple_sign_in_tokens')).toBe(0);
    expect(fixture.revoked.length).toBe(1);
  });
  it('rejects malformed bodies with sanitized responses and no credential logs', async () => {
    const spies = ['log', 'error', 'info', 'debug'].map(method => vi.spyOn(console, method as 'log'));
    for (const body of [null, [], {}, { rawNonce: 'invalid', identityToken: 'fixture-identity', authorizationCode: 'fixture-code' }]) {
      const response = await appleLogin(context(body));
      expect(response.status).toBe(400);
      expect((await response.text()).includes('fixture-identity')).toBe(false);
    }
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(4);
    for (const call of vi.mocked(console.warn).mock.calls) {
      expect(call).toEqual(['apple_sign_in_failed', {
        stage: 'request', reason: 'request_invalid', code: 'apple_invalid',
      }]);
    }
  });
});

describe('slow authorization and safe failure diagnostics', () => {
  it('accepts first authorization completed after 11 minutes in the Apple sheet', async () => {
    const started = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(started);
    const body = await authorization();
    expect(row('SELECT expires_at-created_at lifetime FROM apple_sign_in_challenges').lifetime)
      .toBe(APPLE_CHALLENGE_LIFETIME_SECONDS);
    clock.mockReturnValue(started + 11 * 60_000);
    // Apple issues the code/token when the user finishes authorization, not when
    // our challenge was requested before showing the sheet.
    body.identityToken = await fixture.token(body.rawNonce);
    fixture.codeTokens.set(body.authorizationCode, body.identityToken);
    const response = await appleLogin(context({ ...body, fullName: { givenName: 'First authorization' } }));
    expect(response.status).toBe(200);
    expect(row('SELECT apple_name FROM users').apple_name).toBe('First authorization');
    expect(console.warn).not.toHaveBeenCalled();
    expect((await appleLogin(context(body))).status).toBe(400);
    expect(console.warn).toHaveBeenLastCalledWith('apple_sign_in_failed', {
      stage: 'challenge', reason: 'challenge_consumed', code: 'apple_invalid',
    });
  });
  it('uses the signed expiry for a delayed callback, without a separate 10-minute issued-at limit', async () => {
    const started = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(started);
    const body = await authorization({ exp: Math.floor(started / 1000) + 1800 });
    clock.mockReturnValue(started + 12 * 60_000);
    // The code exchange fixture succeeds; a real expired code is still rejected
    // by Apple. This test covers our identity/challenge gate, not Apple code TTL.
    expect((await appleLogin(context(body))).status).toBe(200);
  });
  it('still rejects an expired challenge even when a fresh, signed Apple token is supplied', async () => {
    const started = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(started);
    const body = await authorization();
    clock.mockReturnValue(started + (APPLE_CHALLENGE_LIFETIME_SECONDS + 1) * 1000);
    body.identityToken = await fixture.token(body.rawNonce);
    fixture.codeTokens.set(body.authorizationCode, body.identityToken);
    expect((await appleLogin(context(body))).status).toBe(400);
    expect(console.warn).toHaveBeenLastCalledWith('apple_sign_in_failed', {
      stage: 'challenge', reason: 'challenge_expired', code: 'apple_invalid',
    });
    expect(fixture.issuedRefreshTokens).toHaveLength(0);
  });
  it('distinguishes missing challenge and a challenge bound to a different valid nonce', async () => {
    const first = await authorization();
    const second = await authorization();
    expect((await appleLogin(context({ ...first, challengeId: 'missing' }))).status).toBe(400);
    expect(console.warn).toHaveBeenLastCalledWith('apple_sign_in_failed', {
      stage: 'challenge', reason: 'challenge_missing', code: 'apple_invalid',
    });
    expect((await appleLogin(context({ ...first, challengeId: second.challengeId }))).status).toBe(400);
    expect(console.warn).toHaveBeenLastCalledWith('apple_sign_in_failed', {
      stage: 'challenge', reason: 'challenge_nonce_mismatch', code: 'apple_invalid',
    });
    expect((await appleLogin(context(first))).status).toBe(200);
  });
  it.each([
    ['audience_invalid', { aud: 'other.app' }], ['token_expired', { exp: 1 }],
    ['nonce_invalid', { nonce: 'other-nonce' }], ['issuer_invalid', { iss: 'https://example.invalid' }],
  ])('records exact identity rejection %s without exposing claims', async (reason, claims) => {
    const body = await authorization(claims);
    const response = await appleLogin(context(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: 'apple_invalid', error: '无法验证 Apple 登录，请重新使用 Apple 登录。' });
    expect(console.warn).toHaveBeenLastCalledWith('apple_sign_in_failed', { stage: 'identity', reason, code: 'apple_invalid' });
    const logs = JSON.stringify(vi.mocked(console.warn).mock.calls);
    for (const secret of [body.identityToken, body.authorizationCode, body.rawNonce, body.challengeId, 'fixture-apple-subject']) {
      expect(logs).not.toContain(secret);
    }
  });
  it.each([
    ['network', new Error('secret token or request in transport error')],
    ['timeout', new DOMException('secret in timeout text', 'TimeoutError')],
  ])('classifies JWKS %s outages as retryable availability failures, not expired credentials', async (suffix, error) => {
    const body = await authorization();
    vi.stubGlobal('fetch', async () => { throw error; });
    const response = await appleLogin(context(body));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'apple_unavailable' });
    expect(console.warn).toHaveBeenLastCalledWith('apple_sign_in_failed', {
      stage: 'identity', reason: `jwks_${suffix}`, code: 'apple_unavailable',
    });
  });
  it.each([
    ['invalid_grant', 400, 'apple_invalid'], ['invalid_client', 503, 'apple_unavailable'],
    ['invalid_request', 503, 'apple_unavailable'], ['secret-unrecognized-error', 503, 'apple_unavailable'],
  ])('logs only the allowlisted Apple exchange code (%s), never descriptions or credentials', async (error, status, code) => {
    const body = await authorization();
    fixture.setExchange(400, String(error), `secret description ${body.authorizationCode} ${body.identityToken}`);
    const response = await appleLogin(context(body));
    expect(response.status).toBe(status);
    const payload = await response.json();
    expect(payload).toMatchObject({ code });
    expect(console.warn).toHaveBeenLastCalledWith('apple_sign_in_failed', {
      stage: 'code_exchange', reason: 'exchange_rejected', code, upstreamStatus: 400,
      upstreamError: error === 'secret-unrecognized-error' ? 'unknown' : error,
    });
    const output = JSON.stringify([vi.mocked(console.warn).mock.calls, payload]);
    for (const secret of [body.identityToken, body.authorizationCode, body.rawNonce,
      String(fixture.env.APPLE_SIGN_IN_PRIVATE_KEY), 'secret description', 'secret-unrecognized-error']) {
      expect(output).not.toContain(secret);
    }
    expect(count('users')).toBe(0);
  });
  it('records code-exchange network failures without logging an exception message', async () => {
    const body = await authorization();
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/auth/token')) throw new Error(body.authorizationCode);
      return fixture.fetcher(input, init);
    });
    expect((await appleLogin(context(body))).status).toBe(503);
    expect(console.warn).toHaveBeenLastCalledWith('apple_sign_in_failed', {
      stage: 'code_exchange', reason: 'exchange_network', code: 'apple_unavailable',
    });
  });
  it('records malformed JWKS as an upstream failure', async () => {
    const body = await authorization();
    vi.stubGlobal('fetch', async () => new Response('not-json', { status: 200 }));
    expect((await appleLogin(context(body))).status).toBe(503);
    expect(console.warn).toHaveBeenLastCalledWith('apple_sign_in_failed', {
      stage: 'identity', reason: 'jwks_malformed', code: 'apple_unavailable',
    });
  });
});

describe('Apple accounts stay isolated', () => {
  it.each([false, 'false', undefined, 'TRUE', 1])('authenticates by sub without storing an unverified email (%s)', async verified => {
    seedMembership();
    const first = await login({ email: 'owner@example.invalid', email_verified: verified });
    expect(first.user.id).not.toBe(1);
    expect(row('SELECT email FROM users WHERE id=2').email).toBeNull();
    const again = await login({ email: '', email_verified: verified });
    expect(again.user.id).toBe(first.user.id);
    expect(count('users')).toBe(2);
    expect(row('SELECT user_id FROM native_subscription_bindings').user_id).toBe(1);
  });
  it.each([true, 'true'])('stores a verified private relay email (%s)', async verified => {
    await login({ email_verified: verified });
    expect(row('SELECT email FROM users').email).toBe('fixture@privaterelay.appleid.com');
  });
  it('accepts the empty email of a Managed Apple Account', async () => {
    await login({ email: '', email_verified: 'false' });
    expect(row('SELECT email FROM users').email).toBeNull();
  });
  it('creates a new sub, preserves relay email and first name; same sub returns the same user without requiring name', async () => {
    seedMembership();
    const response = await appleLogin(context({ ...await authorization(),
      email: 'attacker@example.invalid', fullName: { givenName: '测试', familyName: 'Family' } }));
    expect(response.status).toBe(200);
    const first = await response.json() as any;
    expect(first.user.id).not.toBe(1);
    expect(row('SELECT email,apple_name,password FROM users WHERE id=2')).toMatchObject({
      email: 'fixture@privaterelay.appleid.com', apple_name: '测试 Family', password: '!',
    });
    const again = await login({ email: undefined, email_verified: undefined });
    expect(again.user.id).toBe(first.user.id);
    expect(row('SELECT apple_name FROM users WHERE id=2').apple_name).toBe('测试 Family');
    expect(count('users')).toBe(2);
    expect(row('SELECT user_id FROM native_subscription_bindings').user_id).toBe(1);
    expect(row('SELECT user_id FROM native_subscription_accounts').user_id).toBe(1);
    expect(fixture.clientSecretValid).toBe(true);
    expect(fixture.nativeParametersValid).toBe(true);
    const saved = db.sqlite.prepare('SELECT encrypted_token FROM apple_sign_in_tokens').all();
    expect(saved.length).toBe(2);
    expect(saved.every((r: any) => r.encrypted_token.startsWith('v1.'))).toBe(true);
    expect(saved.some((r: any) => fixture.issuedRefreshTokens.includes(r.encrypted_token))).toBe(false);
    expect((await verifyJWT(first.token, jwtSecret))?.userId).toBe(first.user.id);
  });
  it('fails closed for an existing email, including case differences, and never changes membership ownership', async () => {
    seedMembership();
    const response = await appleLogin(context(await authorization({ email: 'OWNER@example.invalid' })));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'apple_email_conflict' });
    expect(row('SELECT apple_sub FROM users WHERE id=1').apple_sub).toBeNull();
    expect(count('users')).toBe(1);
    expect(row('SELECT user_id FROM native_subscription_bindings').user_id).toBe(1);
    expect(fixture.issuedRefreshTokens.length).toBe(0);
  });
  it('also blocks the legacy Google email-link path from taking over an Apple account', async () => {
    await login();
    const result = await resolveGoogleLogin(db as any, { sub: 'new-google-sub', email: 'fixture@privaterelay.appleid.com' }, jwtSecret);
    expect(result.ok).toBe(false);
    expect(row('SELECT google_sub FROM users').google_sub).toBeNull();
  });
  it('supports a verified Apple subject with no email, and a different sub creates a distinct user', async () => {
    const first = await login({ email: undefined, email_verified: undefined });
    const second = await login({ sub: 'different-sub', email: undefined, email_verified: undefined });
    expect(first.user.id).not.toBe(second.user.id);
    expect(count('users')).toBe(2);
  });
  it('a disabled OAuth password can never authenticate, while password login still works', async () => {
    const apple = await login();
    for (const password of ['!', '!apple-oauth!', 'password', '']) {
      expect(await verifyPassword(password, '!')).toBe(false);
      expect((await passwordLogin(context({ username: apple.user.username, password: password || 'test' }))).status).toBe(401);
    }
    const hash = await hashPassword('fixture-password-only');
    db.sqlite.prepare('INSERT INTO users(username,password) VALUES (?,?)').run('password-user', hash);
    expect((await passwordLogin(context({ username: 'password-user', password: 'fixture-password-only' }))).status).toBe(200);
    expect((await passwordLogin(context({ username: 'password-user', password: 'incorrect' }))).status).toBe(401);
  });
});

describe('Apple deletion revokes before confirming success', () => {
  it('revokes every stored authorization via the official endpoint, erases credentials, retains opaque subscription bindings', async () => {
    const user = await login();
    await login();
    db.sqlite.prepare('INSERT INTO native_subscription_accounts VALUES (?,?)').run(user.user.id, 'fixture-membership');
    db.sqlite.prepare('INSERT INTO native_subscription_bindings VALUES (?, ?, ?)').run(user.user.id, 'Sandbox', 'original-id');
    const log = vi.spyOn(console, 'log'); const warn = vi.spyOn(console, 'warn'); const error = vi.spyOn(console, 'error');
    const response = await deleteAccount(context({}, user.token));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({ ok: true });
    expect(fixture.revoked.length).toBe(2);
    expect(fixture.revoked.every(t => fixture.issuedRefreshTokens.includes(t))).toBe(true);
    expect(fixture.calls.filter(u => u === 'https://appleid.apple.com/auth/revoke').length).toBe(2);
    expect(fixture.clientSecretValid && fixture.nativeParametersValid).toBe(true);
    expect(count('apple_sign_in_tokens')).toBe(0);
    expect(row('SELECT status,apple_sub,apple_name,email FROM users')).toMatchObject({ status: 'deleted', apple_sub: null, apple_name: null, email: null });
    expect(row('SELECT user_id FROM native_subscription_bindings').user_id).toBe(user.user.id);
    expect(log).not.toHaveBeenCalled(); expect(warn).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
    expect(fixture.issuedRefreshTokens.some(t => JSON.stringify(result).includes(t))).toBe(false);
    expect((await deleteAccount(context({}, user.token))).status).toBe(200);
    const recreated = await login();
    expect(recreated.user.id).not.toBe(user.user.id);
    expect(row('SELECT user_id FROM native_subscription_bindings').user_id).toBe(user.user.id);
  });
  it.each([['HTTP error', 400, ''], ['error body in 200', 200, '{"error":"fixture-failure"}']])
   ('does not confirm deletion on %s; retry finishes, and /me preserves the deletion session', async (_, status, body) => {
      const user = await login();
      fixture.setRevoke(status as number, body as string);
      const response = await deleteAccount(context({}, user.token));
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ ok: false });
      expect(count('apple_sign_in_tokens')).toBe(1);
      expect(row('SELECT status FROM users').status).toBe('deleting');
      expect(await getRequestUser(context({}, user.token).request, env())).toBeNull();
      expect((await me(context({}, user.token))).status).toBe(409);
      const recovered = await appleLogin(context(await authorization()));
      expect(recovered.status).toBe(200);
      expect(await recovered.json()).toMatchObject({ deletionPending: true });
      expect(row('SELECT status FROM users').status).toBe('deleting');
      fixture.setRevoke(200);
      expect((await deleteAccount(context({}, user.token))).status).toBe(200);
      expect(count('apple_sign_in_tokens')).toBe(0);
    });
  it('retries DB cleanup after successful revoke without retaining the revoked token or claiming early success', async () => {
    const user = await login();
    db.sqlite.exec("CREATE TRIGGER fail_delete BEFORE UPDATE ON users WHEN NEW.status='deleted' BEGIN SELECT RAISE(ABORT,'fixture failure'); END;");
    expect((await deleteAccount(context({}, user.token))).status).toBe(503);
    expect(row('SELECT status FROM users').status).toBe('deleting');
    expect(count('apple_sign_in_tokens')).toBe(0);
    db.sqlite.exec('DROP TRIGGER fail_delete');
    expect((await deleteAccount(context({}, user.token))).status).toBe(200);
    expect(fixture.revoked.length).toBe(1);
  });
  it('missing config or missing revocation credential never reports success', async () => {
    const user = await login();
    expect((await deleteAccount(context({}, user.token, { APPLE_SIGN_IN_PRIVATE_KEY: undefined }))).status).toBe(503);
    expect(row('SELECT status FROM users').status).toBe('approved');
    db.sqlite.exec('DELETE FROM apple_sign_in_tokens');
    expect((await deleteAccount(context({}, user.token))).status).toBe(503);
    expect(row('SELECT status FROM users').status).toBe('approved');
  });
  it('serializes login and deletion across workers; an active login prevents deletion', async () => {
    const user = await login();
    const lock = await acquireAppleLock(db, 'fixture-apple-subject');
    expect((await deleteAccount(context({}, user.token))).status).toBe(503);
    expect(fixture.revoked.length).toBe(0);
    expect(row('SELECT status FROM users').status).toBe('approved');
    await lock.release();
    expect((await deleteAccount(context({}, user.token))).status).toBe(200);
  });
  it('fences a stale worker out of the transaction after its lease was replaced', async () => {
    seedMembership();
    const lock = await acquireAppleLock(db, 'fixture-apple-subject');
    db.sqlite.exec("UPDATE apple_sign_in_locks SET owner='replacement-worker'");
    await expect(db.batch([lock.fence() as any,
      db.prepare("UPDATE users SET status='deleted' WHERE id=1")])).rejects.toThrow();
    expect(row('SELECT status FROM users').status).toBe('approved');
    expect(row('SELECT user_id FROM native_subscription_bindings').user_id).toBe(1);
  });
  it('an encrypted-token authentication failure cannot be reported as successful revocation', async () => {
    const user = await login();
    db.sqlite.exec("UPDATE apple_sign_in_tokens SET encrypted_token='v1.invalid.invalid'");
    const response = await deleteAccount(context({}, user.token));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false });
    expect(fixture.revoked.length).toBe(0);
    expect(count('apple_sign_in_tokens')).toBe(1);
  });
  it('password account deletion still succeeds without any Sign in with Apple configuration', async () => {
    seedMembership();
    const session = await signJWT({ userId: 1 }, jwtSecret);
    const noApple = Object.fromEntries(Object.keys(fixture.env).map(k => [k, undefined]));
    expect((await deleteAccount(context({}, session, noApple))).status).toBe(200);
    expect(fixture.revoked.length).toBe(0);
  });
});

it('the ALTER migration preserves existing users and membership bindings', () => {
  // Reconstruct the pre-feature schema in this disposable in-memory database.
  db.sqlite.exec('DROP TABLE apple_sign_in_challenges; DROP TABLE apple_sign_in_tokens; DROP TABLE apple_sign_in_locks; DROP TABLE users;');
  db.sqlite.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
    email TEXT UNIQUE, google_sub TEXT UNIQUE, status TEXT NOT NULL DEFAULT 'approved');`);
  seedMembership();
  const before = JSON.stringify(row('SELECT * FROM users'));
  db.sqlite.exec(readFileSync(new URL('./db/migrations/apple_sign_in.sql', import.meta.url), 'utf8'));
  expect(JSON.stringify(row('SELECT id,username,password,email,google_sub,status FROM users'))).toBe(before);
  expect(row('SELECT apple_sub FROM users').apple_sub).toBeNull();
  expect(row('SELECT user_id FROM native_subscription_bindings').user_id).toBe(1);
  expect(() => db.sqlite.exec("INSERT INTO users(id,username,password,apple_sub) VALUES(2,'x','!','one'),(3,'y','!','one')")).toThrow();
});
