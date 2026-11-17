import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appleAuthorization, APP_BUNDLE, verifyAppleMembership, withAppleEnvironment } from './apple-subscriptions';
import type { AppleEnvironment } from './apple-subscriptions';
import { fixtureAppleEnvironment, fixtureAppleResponse, fixtureAppleFetch, fixtureAccountToken, fixturePublicKey } from './test-support/apple-fixture';
import { SQLiteD1 } from './test-support/sqlite-d1';
import { signJWT } from './auth';
import { onRequestGet as status, onRequestPost as bind } from '../functions/api/native/membership';
import { onRequestPost as nativeAI } from '../functions/api/native/summarize';
import { onRequestGet as pull, onRequestPost as sync } from '../functions/api/progress/sync';
// @ts-expect-error Existing Pages JS handler has no declaration file.
import { onRequestPost as webAI } from '../functions/api/summarize.js';

let env: AppleEnvironment;
let db: SQLiteD1;
let session: string;
const secret = 'test-only-native-membership';
beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  env = await fixtureAppleEnvironment();
  db = new SQLiteD1();
  db.sqlite.exec("INSERT INTO users (id,username,password) VALUES (1,'a','test'),(2,'b','test')");
  session = await signJWT({ userId: 1, username: 'a', role: 'user' }, secret);
  db.sqlite.prepare('INSERT INTO native_subscription_accounts VALUES (?,?)').run(1, fixtureAccountToken);
  vi.stubGlobal('fetch', vi.fn(fixtureAppleFetch()));
});
afterEach(() => { db.sqlite.close(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function ctx(method = 'GET', body: unknown = undefined) {
  return { env: { ...env, DB: db, JWT_SECRET: secret }, request: new Request('https://unit.invalid/api', {
    method, headers: { Authorization: `Bearer ${session}`, 'Content-Type': 'application/json' },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  }) };
}
const proof = { transactionId: '1002' };
const serviceUnavailable = '会员验证服务暂不可用，请稍后重试；请勿重复购买。';
const subscriptionNotFound = '未找到可验证的订阅；本地模拟购买不授予云端会员。';

function expectNoAppleLogs() { expect(console.log).not.toHaveBeenCalled(); }
async function expectAppleFailure(response: Response, status: number, error: string) {
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(Object.keys(body).sort()).toEqual(['error', 'ok']);
  expectNoAppleLogs();
  expect(body.ok).toBe(false);
  // Compare values as booleans so even a regression cannot print credentials
  // or the full upstream body in test failure output. Keys must match exactly.
  expect(body.error === error).toBe(true);
}

describe('non-enumerable Pages bindings', () => {
  const production = 'https://api.storekit.apple.com/inApps/v1/subscriptions/';
  const sandbox = 'https://api.storekit-sandbox.apple.com/inApps/v1/subscriptions/';
  beforeEach(() => { env.APPLE_IAP_ENVIRONMENT = 'Production'; });

  function pagesContext(method = 'GET', body: unknown = undefined) {
    const context = ctx(method, body);
    const bindings = context.env; // Plain, in-memory fixtures only.
    const pagesEnv = Object.create(null) as typeof bindings;
    for (const key of Object.keys(bindings) as (keyof typeof bindings)[]) {
      Object.defineProperty(pagesEnv, key, {
        enumerable: false,
        get() {
          if (this !== pagesEnv) throw new Error('Fixture binding requires the original env receiver');
          return bindings[key];
        },
      });
    }
    // Lock in the regression fixture: neither copying mechanism retains any
    // Apple credentials, environment, DB or JWT_SECRET. Never print their values.
    expect(Reflect.ownKeys({ ...pagesEnv })).toEqual([]);
    expect(Reflect.ownKeys(Object.assign({}, pagesEnv))).toEqual([]);
    return { ...context, env: pagesEnv };
  }

  it('copies only IAP fields into a plain object using the original non-enumerable getters', () => {
    const original = pagesContext().env;
    const extraBinding = Symbol('fixture binding');
    const extraValue = {};
    Object.defineProperty(original, extraBinding, { value: extraValue, enumerable: false });
    const overridden = withAppleEnvironment(original, 'Sandbox');
    expect(Object.getPrototypeOf(overridden) === Object.prototype).toBe(true);
    expect(Reflect.ownKeys(overridden)).toEqual([
      'APPLE_IAP_ISSUER_ID', 'APPLE_IAP_KEY_ID', 'APPLE_IAP_PRIVATE_KEY',
      'APPLE_IAP_BUNDLE_ID', 'APPLE_IAP_ENVIRONMENT',
    ]);
    expect(overridden.APPLE_IAP_ENVIRONMENT).toBe('Sandbox');
    expect(original.APPLE_IAP_ENVIRONMENT).toBe('Production');
    for (const key of ['APPLE_IAP_ISSUER_ID', 'APPLE_IAP_KEY_ID', 'APPLE_IAP_PRIVATE_KEY', 'APPLE_IAP_BUNDLE_ID'] as const) {
      // Compare booleans so a failure cannot print credential values.
      expect(overridden[key] === original[key]).toBe(true);
      expect(Object.getOwnPropertyDescriptor(overridden, key)?.get).toBeUndefined();
    }
    expect('DB' in overridden).toBe(false);
    expect('JWT_SECRET' in overridden).toBe(false);
    expect(extraBinding in overridden).toBe(false);
    const frozen = Object.freeze({ APPLE_IAP_ENVIRONMENT: 'Production' });
    expect(withAppleEnvironment(frozen, 'Sandbox').APPLE_IAP_ENVIRONMENT).toBe('Sandbox');
    expect(frozen.APPLE_IAP_ENVIRONMENT).toBe('Production');
  });

  it.each([401, 404, 'fetch'] as const)('returns 403 after Production %s then Sandbox exact not-found', async productionStatus => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = String(input); urls.push(url);
      if (url === production + '1002') {
        if (productionStatus === 'fetch') throw new TypeError('Fixture offline');
        return productionStatus === 401 ? new Response('', { status: 401 })
          : Response.json({ errorCode: 4040010 }, { status: 404 });
      }
      if (url === sandbox + '1002') return Response.json({ errorCode: 4040010 }, { status: 404 });
      throw new Error('Unexpected URL in fixture; live network is forbidden');
    });
    const context = pagesContext('POST', proof);
    const response = await bind(context);
    await expectAppleFailure(response, 403, subscriptionNotFound);
    expect(urls).toEqual([production + '1002', sandbox + '1002']);
    expect(db.sqlite.prepare('SELECT count(*) AS n FROM native_subscription_bindings').get().n).toBe(0);
    expect(context.env.APPLE_IAP_ENVIRONMENT).toBe('Production');
  });

  it.each([401, 404])('binds sandbox_test after Production %s without changing the configured environment', async productionStatus => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = String(input); urls.push(url);
      if (url === production + '1002') return productionStatus === 401
        ? new Response('', { status: 401 }) : Response.json({ errorCode: 4040010 }, { status: 404 });
      if (url === sandbox + '1002') return Response.json(fixtureAppleResponse());
      throw new Error('Unexpected URL in fixture; live network is forbidden');
    });
    const context = pagesContext('POST', proof);
    const response = await bind(context);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true, active: true, environment: 'Sandbox', entitlement: 'sandbox_test',
    });
    expect(urls).toEqual([production + '1002', sandbox + '1002']);
    expect(db.sqlite.prepare('SELECT user_id,environment,original_transaction_id FROM native_subscription_bindings').get())
      .toMatchObject({ user_id: 1, environment: 'Sandbox', original_transaction_id: '1001' });
    expect(context.env.APPLE_IAP_ENVIRONMENT).toBe('Production');
    expect(env.APPLE_IAP_ENVIRONMENT).toBe('Production');
  });

  for (const environment of ['Production', 'Sandbox'] as const) {
    it(`uses the original env for stored ${environment} status/refresh, restore and paid access`, async () => {
      db.sqlite.prepare('INSERT INTO native_subscription_bindings VALUES (?,?,?)').run(1, environment, '1001');
      const urls: string[] = [];
      vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
        const url = String(input); urls.push(url);
        if (url !== (environment === 'Production' ? production : sandbox) + '1001') {
          throw new Error('Unexpected URL in fixture; live network is forbidden');
        }
        return Response.json(fixtureAppleResponse({}, 1, {}, environment));
      });
      const context = pagesContext();
      const response = await status(context);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        active: true, environment, entitlement: environment === 'Production' ? 'production_paid' : 'sandbox_test',
      });
      // Reuse the same original env for authentication, binding reads and writes.
      const restoreContext = { ...ctx('POST', { transactionId: '1001' }), env: context.env };
      expect((await bind(restoreContext)).status).toBe(200);
      expect((await pull(context)).status).toBe(200);
      expect(urls).toEqual(Array(3).fill((environment === 'Production' ? production : sandbox) + '1001'));
      expect(db.sqlite.prepare('SELECT user_id,environment,original_transaction_id FROM native_subscription_bindings').get())
        .toMatchObject({ user_id: 1, environment, original_transaction_id: '1001' });
      expect(context.env.APPLE_IAP_ENVIRONMENT).toBe('Production');
    });

    it.each([401, 404])(`fails closed on stored ${environment} HTTP %s without rediscovery`, async httpStatus => {
      db.sqlite.prepare('INSERT INTO native_subscription_bindings VALUES (?,?,?)').run(1, environment, '1001');
      const urls: string[] = [];
      vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
        urls.push(String(input));
        return httpStatus === 401 ? new Response('', { status: 401 })
          : Response.json({ errorCode: 4040005 }, { status: 404 });
      });
      expect((await status(pagesContext())).status).toBe(503);
      expect((await bind(pagesContext('POST', { transactionId: '1001' }))).status).toBe(503);
      expect((await pull(pagesContext())).status).toBe(503);
      expect(urls).toEqual(Array(3).fill((environment === 'Production' ? production : sandbox) + '1001'));
      expect(db.sqlite.prepare('SELECT count(*) AS n FROM native_subscription_bindings').get().n).toBe(1);
    });
  }
});

describe('Apple API authority (mock HTTPS responses, not Apple signatures)', () => {
  it('signs an ES256 API JWT with bundle, audience and short expiry', async () => {
    const jwt = await appleAuthorization(env, 1700000000000);
    const [header, payload, signature] = jwt.split('.');
    const decode = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    expect(JSON.parse(new TextDecoder().decode(decode(header)))).toMatchObject({ alg: 'ES256', kid: 'test-key-id' });
    expect(JSON.parse(new TextDecoder().decode(decode(payload)))).toMatchObject({ bid: APP_BUNDLE, aud: 'appstoreconnect-v1', exp: 1700000300 });
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, fixturePublicKey(), decode(signature),
      new TextEncoder().encode(`${header}.${payload}`))).toBe(true);
  });
  it.each(['APPLE_IAP_PRIVATE_KEY', 'APPLE_IAP_ISSUER_ID', 'APPLE_IAP_KEY_ID', 'APPLE_IAP_BUNDLE_ID', 'APPLE_IAP_ENVIRONMENT'] as const)
    ('denies missing %s without network', async key => {
      delete env[key];
      await expect(verifyAppleMembership(env, '1002', fixtureAccountToken)).rejects.toMatchObject({ status: 503 });
      await expectAppleFailure(await bind(ctx('POST', proof)), 503, serviceUnavailable);
      expect(fetch).not.toHaveBeenCalled();
    });
  it('denies invalid key, unknown environment and client-selected transaction URL', async () => {
    await expect(verifyAppleMembership({ ...env, APPLE_IAP_PRIVATE_KEY: 'invalid' }, '1002', fixtureAccountToken)).rejects.toMatchObject({ status: 503 });
    await expect(verifyAppleMembership({ ...env, APPLE_IAP_ENVIRONMENT: 'Xcode' }, '1002', fixtureAccountToken)).rejects.toMatchObject({ status: 503 });
    await expect(verifyAppleMembership(env, '../attacker', fixtureAccountToken)).rejects.toMatchObject({ status: 400 });
    await expectAppleFailure(await bind(ctx('POST', { transactionId: '../attacker' })), 400, '交易编号无效');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('uses a fixed TLS host and manual redirects', async () => {
    await verifyAppleMembership(env, '1002', fixtureAccountToken);
    const [input, init] = vi.mocked(fetch).mock.calls[0];
    expect(new URL(String(input)).origin === 'https://api.storekit-sandbox.apple.com').toBe(true);
    expect(init?.redirect).toBe('manual');
  });
  it.each([2, 3, 5, 99])('rejects non-entitled status %s', async value => {
    vi.stubGlobal('fetch', fixtureAppleFetch(fixtureAppleResponse({}, value)));
    await expect(verifyAppleMembership(env, '1002', fixtureAccountToken)).rejects.toMatchObject({ status: 403 });
  });
  it.each([{ expiresDate: 1 }, { revocationDate: 1 }, { isUpgraded: true }, { productId: 'another.product' }])
    ('rejects expired, revoked, upgraded and non-whitelisted product: %j', async transaction => {
      vi.stubGlobal('fetch', fixtureAppleFetch(fixtureAppleResponse(transaction)));
      await expect(verifyAppleMembership(env, '1002', fixtureAccountToken)).rejects.toMatchObject({ status: 403 });
    });
  it('honors current paid term after cancellation and eligible grace only until its deadline', async () => {
    vi.stubGlobal('fetch', fixtureAppleFetch(fixtureAppleResponse({}, 1, { autoRenewStatus: 0 })));
    expect((await verifyAppleMembership(env, '1002', fixtureAccountToken)).expiresAt).toBeGreaterThan(Date.now());
    vi.stubGlobal('fetch', fixtureAppleFetch(fixtureAppleResponse({ expiresDate: 1 }, 4)));
    expect((await verifyAppleMembership(env, '1002', fixtureAccountToken)).expiresAt).toBeGreaterThan(Date.now());
    vi.stubGlobal('fetch', fixtureAppleFetch(fixtureAppleResponse({ expiresDate: 1 }, 4, { gracePeriodExpiresDate: 1 })));
    await expect(verifyAppleMembership(env, '1002', fixtureAccountToken)).rejects.toMatchObject({ status: 403 });
  });
  it.each([{ bundleId: 'other.app' }, { environment: 'Production' }, { inAppOwnershipType: 'FAMILY_SHARED' }])
    ('rejects mismatched app/environment/ownership: %j', async transaction => {
      vi.stubGlobal('fetch', fixtureAppleFetch(fixtureAppleResponse(transaction)));
      await expect(verifyAppleMembership(env, '1002', fixtureAccountToken)).rejects.toMatchObject({ status: 503 });
    });
  it.each([{ appAccountToken: null }, { appAccountToken: 'different-account' }])
    ('does not auto-claim legacy or foreign tokens: %j', async transaction => {
      vi.stubGlobal('fetch', fixtureAppleFetch(fixtureAppleResponse(transaction)));
      expect((await bind(ctx('POST', proof))).status).toBe(409);
      expect(db.sqlite.prepare('SELECT count(*) AS n FROM native_subscription_bindings').get().n).toBe(0);
    });
  it('fails closed on network, malformed Apple response and upstream error', async () => {
    expect(env.APPLE_IAP_ENVIRONMENT).toBe('Sandbox');
    for (const response of [new Response('HTML'), new Response('', { status: 401 }), Response.json({})]) {
      const urls: string[] = [];
      vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
        urls.push(String(input));
        return response;
      });
      expect((await bind(ctx('POST', proof))).status).toBe(503);
      expect(urls).toEqual(['https://api.storekit-sandbox.apple.com/inApps/v1/subscriptions/1002']);
    }
    vi.stubGlobal('fetch', async () => { throw new Error('offline'); });
    expect((await bind(ctx('POST', proof))).status).toBe(503);
  });
});

describe('native account binding and route boundaries', () => {
  it('stable token, verified bind, then access; revocation is checked on the next request', async () => {
    const inactive = await status(ctx());
    expect(inactive.status).toBe(200);
    const inactiveBody = await inactive.json();
    expect(inactiveBody).toMatchObject({ ok: true, active: false, accountToken: fixtureAccountToken });
    expect(inactiveBody).not.toHaveProperty('appleDebug');
    const bound = await bind(ctx('POST', proof));
    expect(bound.status).toBe(200);
    const boundBody = await bound.json();
    expect(boundBody).toMatchObject({ ok: true, active: true });
    expect(boundBody).not.toHaveProperty('appleDebug');
    const refreshed = await status(ctx());
    expect(refreshed.status).toBe(200);
    const refreshedBody = await refreshed.json();
    expect(refreshedBody).toMatchObject({ ok: true, active: true });
    expect(refreshedBody).not.toHaveProperty('appleDebug');
    expect((await pull(ctx())).status).toBe(200);
    vi.stubGlobal('fetch', fixtureAppleFetch(fixtureAppleResponse({}, 5)));
    expect((await pull(ctx())).status).toBe(403);
    expect((await sync(ctx('POST', { student: { xp: 999 } }))).status).toBe(403);
    expect(db.sqlite.prepare('SELECT count(*) AS n FROM math_student').get().n).toBe(0);
  });
  it('rejects forged membership headers/body and does not upload data', async () => {
    const context = ctx('POST', { isPremium: true, active: true, student: { xp: 10 } });
    context.request.headers.set('X-Is-Premium', 'true');
    context.request.headers.set('X-Platform', 'web');
    expect((await sync(context)).status).toBe(403);
    expect((await nativeAI(ctx('POST', { active: true }))).status).toBe(403);
    expect((await bind(ctx('POST', { signedTransactionInfo: 'untrusted', active: true }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('prevents account B from claiming A purchase without altering A data', async () => {
    await bind(ctx('POST', proof));
    session = await signJWT({ userId: 2, username: 'b', role: 'user' }, secret);
    expect((await bind(ctx('POST', proof))).status).toBe(409);
    expect(db.sqlite.prepare('SELECT user_id FROM native_subscription_bindings').get().user_id).toBe(1);
  });
  it('refreshes a persisted Sandbox binding as test entitlement under Production configuration', async () => {
    await bind(ctx('POST', proof));
    env.APPLE_IAP_ENVIRONMENT = 'Production';
    expect(await (await status(ctx())).json()).toMatchObject({
      active: true, environment: 'Sandbox', entitlement: 'sandbox_test',
    });
    expect((await pull(ctx())).status).toBe(200);
  });
  it('does not let legacy account lists or client flags skip Production discovery', async () => {
    env.APPLE_IAP_ENVIRONMENT = 'Production';
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return Response.json(fixtureAppleResponse({}, 1, {}, 'Production'));
    });
    const context = ctx('POST', { ...proof, environment: 'Sandbox', sandbox: true });
    context.request.headers.set('X-Apple-Environment', 'Sandbox');
    // Legacy fixture only: never write any deployment environment variable.
    const legacyEnv = { ...context.env, APPLE_IAP_SANDBOX_USER_IDS: '1' };
    expect(await (await bind({ ...context, env: legacyEnv })).json()).toMatchObject({
      active: true, environment: 'Production', entitlement: 'production_paid',
    });
    expect(urls).toEqual(['https://api.storekit.apple.com/inApps/v1/subscriptions/1002']);
  });
  it('preserves approved checks and rejects missing migration/config', async () => {
    db.sqlite.exec("UPDATE users SET status='deleted' WHERE id=1");
    expect((await bind(ctx('POST', proof))).status).toBe(401);
    expect((await nativeAI(ctx('POST', {}))).status).toBe(401);
    db.sqlite.exec("UPDATE users SET status='approved' WHERE id=1; DROP TABLE native_subscription_accounts");
    expect((await status(ctx())).status).toBe(503);
    delete env.APPLE_IAP_PRIVATE_KEY;
    expect((await sync(ctx('POST', {}))).status).toBe(503);
  });
  it('rechecks deletion after Apple response before writing a binding', async () => {
    vi.stubGlobal('fetch', async () => {
      db.sqlite.exec("UPDATE users SET status='deleted' WHERE id=1");
      return Response.json(fixtureAppleResponse());
    });
    expect((await bind(ctx('POST', proof))).status).toBe(401);
    expect(db.sqlite.prepare('SELECT count(*) AS n FROM native_subscription_bindings').get().n).toBe(0);
  });
  it('keeps anonymous Web AI behavior while native AI denies without validation config', async () => {
    delete env.APPLE_IAP_PRIVATE_KEY;
    const web = ctx('POST', {});
    web.request.headers.delete('Authorization');
    // Existing Web behavior with missing AI-provider configuration: 501, not a membership paywall.
    expect((await webAI(web)).status).toBe(501);
    expect((await nativeAI(ctx('POST', {}))).status).toBe(503);
    expect((await nativeAI(web)).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('serves verified native AI; anonymous Web AI remains independent of Apple configuration', async () => {
    await bind(ctx('POST', proof));
    let appleCalls = 0;
    let aiCalls = 0;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      if (String(input).startsWith('https://api.storekit-sandbox.apple.com/')) {
        appleCalls++;
        return Response.json(fixtureAppleResponse());
      }
      if (String(input) === 'https://api.deepseek.com/chat/completions') {
        aiCalls++;
        return Response.json({ choices: [{ message: { content: 'test summary' } }] });
      }
      throw new Error('unexpected network in test');
    });
    const context = ctx('POST', {});
    const result = await nativeAI({ ...context, env: { ...context.env, DEEPSEEK_API_KEY: 'test-only-placeholder' } });
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ summary: 'test summary' });
    expect(appleCalls).toBe(1);
    delete env.APPLE_IAP_PRIVATE_KEY;
    const web = ctx('POST', {});
    web.request.headers.delete('Authorization');
    expect((await webAI({ ...web, env: { ...web.env, DEEPSEEK_API_KEY: 'test-only-placeholder' } })).status).toBe(200);
    expect(appleCalls).toBe(1);
    expect(aiCalls).toBe(2);
  });
});

describe('safe fetch errors and manual Apple redirects', () => {
  const production = 'https://api.storekit.apple.com';
  const sandbox = 'https://api.storekit-sandbox.apple.com';
  const transactionId = '9'.repeat(16); // Synthetic identifier, never printed.
  beforeEach(() => { env.APPLE_IAP_ENVIRONMENT = 'Production'; });

  it.each([4040010, '4040010'])('returns 403 after a Production fetch error then Sandbox %s', async errorCode => {
    const origins: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = new URL(String(input)); origins.push(url.origin);
      if (url.origin === production) throw new TypeError(`Fixture offline ${input} ${transactionId}`);
      return Response.json({ errorCode }, { status: 404 });
    });

    await expectAppleFailure(await bind(ctx('POST', { transactionId })), 403, subscriptionNotFound);
    expect(origins).toEqual([production, sandbox]);
    expectNoAppleLogs();
    expect(db.sqlite.prepare('SELECT count(*) AS n FROM native_subscription_bindings').get().n).toBe(0);
  });

  it('binds sandbox_test after a Production fetch error with no diagnostics in the 200 response', async () => {
    const origins: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = new URL(String(input)); origins.push(url.origin);
      if (url.origin === production) throw new TypeError('Fixture offline');
      return Response.json(fixtureAppleResponse());
    });
    const response = await bind(ctx('POST', proof));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).not.toHaveProperty('appleDebug');
    expect(body.environment === 'Sandbox' && body.entitlement === 'sandbox_test').toBe(true);
    expect(origins).toEqual([production, sandbox]);
    expect(env.APPLE_IAP_ENVIRONMENT).toBe('Production');
  });

  it.each(['network', 'timeout', 'abort'])('never rediscovers a bound Production subscription after %s failure', async kind => {
    db.sqlite.prepare('INSERT INTO native_subscription_bindings VALUES (?,?,?)').run(1, 'Production', transactionId);
    db.sqlite.prepare('INSERT INTO native_subscription_bindings VALUES (?,?,?)').run(1, 'Sandbox', transactionId);
    const origins: string[] = [];
    const errorName = kind === 'network' ? 'TypeError' : kind === 'timeout' ? 'TimeoutError' : 'AbortError';
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      origins.push(new URL(String(input)).origin);
      if (kind === 'network') throw new TypeError('Fixture offline');
      throw new DOMException('Fixture offline', errorName);
    });

    for (const response of [await status(ctx()), await bind(ctx('POST', { transactionId })), await pull(ctx())]) {
      await expectAppleFailure(response, 503, serviceUnavailable);
    }
    expect(origins).toEqual([production, production, production]);
    expectNoAppleLogs();
  });

  const unsafeErrors: readonly [string, () => unknown, string | null, string | null][] = [
    ['URL and identifiers', () => new TypeError(`Fixture offline ${production}/${transactionId} ${transactionId} ${fixtureAccountToken}`), 'TypeError', 'Fixture offline'],
    ['authorization', () => new TypeError(`Fixture offline Authorization: Bearer ${session}`), 'TypeError', 'Fixture offline'],
    ['bearer', () => new TypeError(`Fixture offline Bearer ${session}`), 'TypeError', 'Fixture offline'],
    ['JWT without label', () => new TypeError(`Fixture offline ${session}`), 'TypeError', 'Fixture offline'],
    ['secret label', () => new TypeError(`Fixture offline JWT_SECRET=${session}`), 'TypeError', 'Fixture offline'],
    ['API key label', () => new TypeError('Fixture offline DEEPSEEK_API_KEY=fixture-credential'), 'TypeError', 'Fixture offline'],
    ['private key label', () => new TypeError(`Fixture offline APPLE_IAP_PRIVATE_KEY=${env.APPLE_IAP_PRIVATE_KEY}`), 'TypeError', 'Fixture offline'],
    ['p8 label', () => new TypeError('Fixture offline p8=fixture-credential'), 'TypeError', 'Fixture offline'],
    ['user info', () => new TypeError('Fixture offline username=fixture-user'), 'TypeError', 'Fixture offline'],
    ['PEM block', () => new TypeError(`Fixture offline ${env.APPLE_IAP_PRIVATE_KEY}`), 'TypeError', 'Fixture offline'],
    ['bare PEM fragment', () => new TypeError(`Fixture offline ${env.APPLE_IAP_PRIVATE_KEY!.split('\n')[1]}`), 'TypeError', 'Fixture offline'],
    ['embedded stack', () => new TypeError('Fixture offline\n at fixture-private-stack'), 'TypeError', 'Fixture offline'],
    ['empty after cleaning', () => new TypeError(`${production}/${transactionId}`), 'TypeError', null],
    ['unknown name', () => ({ name: `${production}/${transactionId}`, message: 'Fixture offline' }), null, 'Fixture offline'],
    ['no error properties', () => ({}), null, null],
    ['unreadable error properties', () => ({ get message() { throw new Error('Fixture unreadable'); } }), null, null],
  ];
  it.each(unsafeErrors)('omits %s from failure JSON and logs; configured Sandbox never retries', async (_name, error) => {
    env.APPLE_IAP_ENVIRONMENT = 'Sandbox';
    let calls = 0;
    vi.stubGlobal('fetch', async () => { calls++; throw error(); });

    await expectAppleFailure(await bind(ctx('POST', { transactionId })), 503, serviceUnavailable);
    expectNoAppleLogs();
    expect(calls).toBe(1);
  });

  for (const origin of [production, sandbox]) {
    it.each([301, 302, 307, 308])(`follows HTTP %s once at ${new URL(origin).host} with manual requests and unchanged validation environment`, async httpStatus => {
      const requests: { origin: string; redirect: RequestRedirect | undefined }[] = [];
      vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ origin: new URL(String(input)).origin, redirect: init?.redirect });
        return requests.length === 1
          ? new Response(null, { status: httpStatus, headers: { Location: `${origin}/fixture/${transactionId}` } })
          : Response.json(fixtureAppleResponse({}, 1, {}, 'Production'));
      });
      const response = await bind(ctx('POST', proof));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).not.toHaveProperty('appleDebug');
      expect(body.environment).toBe('Production');
      expect(requests).toEqual([{ origin: production, redirect: 'manual' }, { origin, redirect: 'manual' }]);
      expectNoAppleLogs();
    });
  }

  it.each([
    ['other host', 'https://fixture.invalid/'], ['http', 'http://api.storekit.apple.com/'],
    ['missing', null], ['relative', '/fixture/'], ['protocol relative', '//api.storekit.apple.com/'],
    ['malformed', 'https://[invalid/'], ['missing authority', 'https:///api.storekit.apple.com/'],
    ['other port', 'https://api.storekit.apple.com:444/'], ['lookalike host', 'https://api.storekit.apple.com.fixture.invalid/'],
    ['userinfo', 'https://fixture@api.storekit.apple.com/'], ['backslash', 'https://api.storekit.apple.com\\fixture/'],
  ])('rejects %s Location without following or discovery fallback', async (_name, location) => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => {
      calls++;
      return new Response(null, { status: 302, ...(location === null ? {} : { headers: { Location: location + transactionId } }) });
    });

    await expectAppleFailure(await bind(ctx('POST', proof)), 503, serviceUnavailable);
    expectNoAppleLogs();
    expect(calls).toBe(1);
  });

  it.each([301, 302, 307, 308])('refuses a second HTTP %s redirect without diagnostics', async httpStatus => {
    let calls = 0;
    vi.stubGlobal('fetch', async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls++;
      expect(init?.redirect).toBe('manual');
      return new Response(null, { status: calls === 1 ? 302 : httpStatus, headers: { Location: `${production}/fixture/${transactionId}` } });
    });

    await expectAppleFailure(await bind(ctx('POST', proof)), 503, serviceUnavailable);
    expectNoAppleLogs();
    expect(calls).toBe(2);
  });

  it('rejects a Sandbox payload reached via redirect while configured for Production', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => ++calls === 1
      ? new Response(null, { status: 302, headers: { Location: `${sandbox}/fixture/${transactionId}` } })
      : Response.json(fixtureAppleResponse()));
    await expectAppleFailure(await bind(ctx('POST', proof)), 503, serviceUnavailable);
    expect(calls).toBe(2);
  });

  it('does not follow other 3xx statuses or treat them as discovery', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => {
      calls++;
      return new Response(null, { status: 303, headers: { Location: `${sandbox}/fixture/${transactionId}` } });
    });
    await expectAppleFailure(await bind(ctx('POST', proof)), 503, serviceUnavailable);
    expect(calls).toBe(1);
  });

  it('keeps a bound Production refresh closed if the followed fetch throws', async () => {
    db.sqlite.prepare('INSERT INTO native_subscription_bindings VALUES (?,?,?)').run(1, 'Production', transactionId);
    let calls = 0;
    vi.stubGlobal('fetch', async () => {
      if (++calls === 1) return new Response(null, { status: 302, headers: { Location: `${sandbox}/fixture/${transactionId}` } });
      throw new TypeError('Fixture offline');
    });
    await expectAppleFailure(await status(ctx()), 503, serviceUnavailable);
    expect(calls).toBe(2);
  });

  it.each(['401', 'numeric not found', 'string not found', 'fetch error'])('uses explicit discovery after redirected %s', async failure => {
    const origins: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      origins.push(new URL(String(input)).origin);
      expect(init?.redirect).toBe('manual');
      if (origins.length === 1) return new Response(null, { status: 302, headers: { Location: `${sandbox}/fixture/${transactionId}` } });
      if (origins.length === 2) {
        if (failure === 'fetch error') throw new TypeError('Fixture offline');
        return failure === '401' ? new Response(null, { status: 401 })
          : Response.json({ errorCode: failure === 'numeric not found' ? 4040010 : '4040010' }, { status: 404 });
      }
      return Response.json({ errorCode: 4040010 }, { status: 404 });
    });

    await expectAppleFailure(await bind(ctx('POST', proof)), 403, subscriptionNotFound);
    expectNoAppleLogs();
    expect(origins).toEqual([production, sandbox, sandbox]);
  });
});

describe('Production -> exact 4040010, pre-release 401 or fetch error -> Sandbox discovery', () => {
  const production = 'https://api.storekit.apple.com/inApps/v1/subscriptions/';
  const sandbox = 'https://api.storekit-sandbox.apple.com/inApps/v1/subscriptions/';
  const unauthorizedResponses = [
    ['empty 401', () => new Response('', { status: 401 }), null],
    ['JSON 401', () => Response.json({}, { status: 401 }), null],
    ['401 with misleading code', () => Response.json({ errorCode: 4040010 }, { status: 401 }), 4040010],
    ['HTML 401', () => new Response('<html>unauthorized</html>', { status: 401 }), null],
  ] as const;
  const discoveryResponses = [
    ['exact 4040010', () => Response.json({ errorCode: 4040010 }, { status: 404 }), 4040010],
    ['string 4040010', () => Response.json({ errorCode: '4040010', detail: 'fixture-private-response-detail' }, { status: 404 }), '4040010'],
    ...unauthorizedResponses,
  ] as const;
  beforeEach(() => { env.APPLE_IAP_ENVIRONMENT = 'Production'; });
  function mockDiscovery(body = fixtureAppleResponse(), productionResponse = discoveryResponses[0][1]) {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      if (url === production + proof.transactionId) return productionResponse();
      if (url === sandbox + proof.transactionId) return Response.json(body);
      throw new Error('Unexpected URL in fixture; live network is forbidden');
    });
    return urls;
  }
  function bindingCount() {
    return db.sqlite.prepare('SELECT count(*) AS n FROM native_subscription_bindings').get().n;
  }

  it.each(discoveryResponses)('discovers and binds sandbox_test after %s; later refresh uses Sandbox', async (_name, productionResponse, _errorCode) => {
    const urls = mockDiscovery(fixtureAppleResponse(), productionResponse);
    const response = await bind(ctx('POST', proof));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).not.toHaveProperty('appleDebug');
    expect(body).toMatchObject({
      ok: true, active: true, environment: 'Sandbox', entitlement: 'sandbox_test',
    });
    expect(urls).toEqual([production + '1002', sandbox + '1002']);
    expect(db.sqlite.prepare('SELECT user_id,environment,original_transaction_id FROM native_subscription_bindings').get())
      .toMatchObject({ user_id: 1, environment: 'Sandbox', original_transaction_id: '1001' });
    expect(env.APPLE_IAP_ENVIRONMENT).toBe('Production');
    expectNoAppleLogs();

    const refreshURLs: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      refreshURLs.push(String(input));
      return Response.json(fixtureAppleResponse());
    });
    const refreshed = await status(ctx());
    expect(refreshed.status).toBe(200);
    const refreshedBody = await refreshed.json();
    expect(refreshedBody).not.toHaveProperty('appleDebug');
    expect(refreshedBody).toMatchObject({ active: true, entitlement: 'sandbox_test' });
    expect((await sync(ctx('POST', { student: { xp: 12 } }))).status).toBe(200);
    expect(db.sqlite.prepare('SELECT xp FROM math_student').get().xp).toBe(12);
    expect(refreshURLs).toEqual([sandbox + '1001', sandbox + '1001']);
  });

  it.each([
    ['403', 403, {}],
    ['generic 404', 404, {}], ['other Apple 404', 404, { errorCode: 4040005 }, 4040005],
    ['other string error code', 404, { errorCode: '4040005' }, '4040005'],
    ['empty error code', 404, { errorCode: '' }], ['null error code', 404, { errorCode: null }],
    ['array error code', 404, { errorCode: ['4040010'] }], ['object error code', 404, { errorCode: { code: 4040010 } }],
    ['boolean error code', 404, { errorCode: true }], ['padded error code', 404, { errorCode: ' 4040010 ' }],
    ['negative error code', 404, { errorCode: -1 }], ['fractional error code', 404, { errorCode: 1.5 }],
    ['unsafe integer error code', 404, { errorCode: Number.MAX_SAFE_INTEGER + 1 }],
    ['zero error code', 404, { errorCode: 0 }, 0],
    ['largest safe integer error code', 404, { errorCode: Number.MAX_SAFE_INTEGER }, Number.MAX_SAFE_INTEGER],
    ['large digit string error code', 404, { errorCode: '9007199254740992' }, '9007199254740992'],
    ['leading zero error code', 404, { errorCode: '04040010' }, '04040010'],
    ['exponent error code', 404, { errorCode: '4.040010e6' }],
    ['arbitrary text error code', 404, { errorCode: 'fixture-private-response-detail' }],
    ['HTML 404', 404, '<html>not found</html>'],
    ['empty 404 body', 404, ''], ['null 404 body', 404, null], ['array 404 body', 404, [{ errorCode: 4040010 }]],
    ['500 with misleading code', 500, { errorCode: 4040010 }, 4040010], ['503', 503, {}],
    ['200 with error payload', 200, { errorCode: 4040010 }, 4040010],
  ])('does not fall back or bind after %s', async (_name, httpStatus, body, _errorCode?: number | string) => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return typeof body === 'string' ? new Response(body, { status: httpStatus as number })
        : Response.json(body, { status: httpStatus as number });
    });
    const response = await bind(ctx('POST', proof));
    await expectAppleFailure(response, 503, serviceUnavailable);
    expect(urls).toEqual([production + '1002']);
    expect(bindingCount()).toBe(0);
    expectNoAppleLogs();
  });

  it.each(['network', 'timeout'])('falls back once after %s failure and fails closed if Sandbox also throws', async name => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      urls.push(String(input));
      if (name === 'timeout') throw new DOMException('Fixture timeout', 'TimeoutError');
      throw new TypeError('Fixture offline');
    });

    
    await expectAppleFailure(await bind(ctx('POST', proof)), 503, serviceUnavailable);
    expect(urls.join() === [production + proof.transactionId, sandbox + proof.transactionId].join()).toBe(true);
    expect(bindingCount()).toBe(0);
    expectNoAppleLogs();
  });

  for (const [environment, discoveryStatus] of [['Production', undefined], ['Sandbox', 404], ['Sandbox', 401]] as const) {
    it.each([
      ['wrong bundle', { bundleId: 'wrong.app' }, 503],
      ['wrong account', { appAccountToken: 'foreign-fixture-account' }, 409],
      ['missing account', { appAccountToken: undefined }, 409],
      ['wrong product', { productId: 'other.product' }, 403],
      ['expired', { expiresDate: 1 }, 403],
      ['revoked', { revocationDate: 1 }, 403],
      ['upgraded', { isUpgraded: true }, 403],
      ['wrong transaction environment', { environment: environment === 'Production' ? 'Sandbox' : 'Production' }, 503],
    ])(`rejects ${environment} %s without switching again (discovery: ${discoveryStatus ?? 'none'})`, async (_name, transaction, expectedStatus) => {
      const body = fixtureAppleResponse(transaction as Record<string, unknown>, 1, {}, environment);
      const urls: string[] = [];
      vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
        const url = String(input); urls.push(url);
        if (environment === 'Sandbox' && url === production + '1002') {
          return discoveryStatus === 401 ? new Response('', { status: 401 })
            : Response.json({ errorCode: 4040010 }, { status: 404 });
        }
        return Response.json(body);
      });
      const error = expectedStatus === 503 ? serviceUnavailable : expectedStatus === 409
        ? '购买未关联当前账号。请使用原购买账号恢复；无账号标记的历史购买需人工核验，请勿重新付费。'
        : '云同步与 AI 家长总结需要有效月度会员。';
      await expectAppleFailure(await bind(ctx('POST', proof)), expectedStatus as number, error);
      expect(urls).toEqual(environment === 'Production'
        ? [production + '1002'] : [production + '1002', sandbox + '1002']);
      expect(bindingCount()).toBe(0);
    });
  }

  for (const environment of ['Production', 'Sandbox'] as const) {
    it(`refreshes and restores a known ${environment} original ID without client environment overrides`, async () => {
      db.sqlite.prepare('INSERT INTO native_subscription_bindings VALUES (?,?,?)').run(1, environment, '1001');
      const urls: string[] = [];
      vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
        urls.push(String(input));
        return Response.json(fixtureAppleResponse({}, 1, {}, environment));
      });
      const context = ctx();
      const requested = environment === 'Production' ? 'Sandbox' : 'Production';
      context.request = new Request('https://unit.invalid/api?environment=' + requested, { headers: context.request.headers });
      context.request.headers.set('X-Apple-Environment', requested);
      expect(await (await status(context)).json()).toMatchObject({
        active: true, environment, entitlement: environment === 'Production' ? 'production_paid' : 'sandbox_test',
      });
      expect((await bind(ctx('POST', { transactionId: '1001', environment: requested }))).status).toBe(200);
      expect((await pull(context)).status).toBe(200);
      expect(urls).toEqual(Array(3).fill((environment === 'Production' ? production : sandbox) + '1001'));
    });
  }

  for (const sandboxErrorCode of [4040010, '4040010']) {
    it.each(discoveryResponses)(`returns 403 without binding when %s is followed by Sandbox ${typeof sandboxErrorCode} not-found`, async (_name, productionResponse, _errorCode) => {
      const urls: string[] = [];
      vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
        const url = String(input); urls.push(url);
        return url === production + '1002' ? productionResponse()
          : Response.json({ errorCode: sandboxErrorCode }, { status: 404 });
      });
      const response = await bind(ctx('POST', proof));
      await expectAppleFailure(response, 403, subscriptionNotFound);
      expect(urls).toEqual([production + '1002', sandbox + '1002']);
      expect(bindingCount()).toBe(0);
      expectNoAppleLogs();
    });
    it.each([
      ['Production', true], ['Sandbox', true], ['Sandbox', false],
    ] as const)(`returns 403 without rediscovery on %s exact ${typeof sandboxErrorCode} not-found (bound: %s)`, async (environment, bound) => {
      env.APPLE_IAP_ENVIRONMENT = environment;
      if (bound) db.sqlite.prepare('INSERT INTO native_subscription_bindings VALUES (?,?,?)').run(1, environment, '1001');
      const urls: string[] = [];
      vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
        urls.push(String(input));
        return Response.json({ errorCode: sandboxErrorCode }, { status: 404 });
      });
      await expectAppleFailure(await bind(ctx('POST', { transactionId: bound ? '1001' : '1002' })), 403, subscriptionNotFound);
      expect(urls).toEqual([(environment === 'Production' ? production : sandbox) + (bound ? '1001' : '1002')]);
      expect(bindingCount()).toBe(bound ? 1 : 0);
      expectNoAppleLogs();
    });
  }

  it.each(unauthorizedResponses)('fails closed on configured Sandbox %s without rediscovery', async (_name, sandboxResponse, _errorCode) => {
    env.APPLE_IAP_ENVIRONMENT = 'Sandbox';
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return sandboxResponse();
    });
    await expectAppleFailure(await bind(ctx('POST', proof)), 503, serviceUnavailable);
    expect(urls).toEqual([sandbox + '1002']);
    expect(bindingCount()).toBe(0);
  });

  it.each(unauthorizedResponses)('never falls back on bound Production %s during status, restore or paid access', async (_name, productionResponse, _errorCode) => {
    db.sqlite.prepare('INSERT INTO native_subscription_bindings VALUES (?,?,?)').run(1, 'Production', '1001');
    db.sqlite.prepare('INSERT INTO native_subscription_bindings VALUES (?,?,?)').run(1, 'Sandbox', '1001');
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = String(input); urls.push(url);
      return url === production + '1001' ? productionResponse() : Response.json(fixtureAppleResponse());
    });
    for (const response of [await status(ctx()), await bind(ctx('POST', { transactionId: '1001' })), await pull(ctx())]) {
      await expectAppleFailure(response, 503, serviceUnavailable);
    }
    expect(urls).toEqual(Array(3).fill(production + '1001'));
    expect(bindingCount()).toBe(2);
  });

  for (const [productionStatus, productionErrorCode] of [[401, null], [404, 4040010], [404, '4040010']] as const) {
    it.each([
      ['generic 404', 404, null], ['other 404 code', 404, 4040005], ['other string code', 404, '4040005'],
      ['401', 401, null], ['503', 503, null], ['network', null, null], ['timeout', null, null],
      ['invalid JSON', 200, null], ['invalid nested object', 200, null], ['invalid signed payload', 200, null],
    ] as const)(`keeps both calls in 503 JSON after Production ${productionStatus}/${typeof productionErrorCode} -> Sandbox %s`, async (failure, httpStatus, errorCode) => {
      const urls: string[] = [];
      vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
        const url = String(input); urls.push(url);
        if (url === production + '1002') return Response.json({ errorCode: productionErrorCode }, { status: productionStatus });
        if (url !== sandbox + '1002') throw new Error('Unexpected URL in fixture; live network is forbidden');
        if (failure === 'network') throw new TypeError('Fixture offline');
        if (failure === 'timeout') throw new DOMException('Fixture timeout', 'TimeoutError');
        if (failure === 'invalid JSON') return new Response('<html>fixture-private-response-detail</html>');
        if (failure === 'invalid nested object') return Response.json({ environment: 'Sandbox', bundleId: APP_BUNDLE, data: [null] });
        if (failure === 'invalid signed payload') return Response.json({ environment: 'Sandbox', bundleId: APP_BUNDLE,
          data: [{ lastTransactions: [{ signedTransactionInfo: 'fixture-invalid-signed-payload' }] }] });
        return Response.json({ errorCode, detail: 'fixture-private-response-detail',
          transactionId: proof.transactionId, accountToken: fixtureAccountToken,
          Authorization: 'fixture-forbidden-header', headers: { Accept: 'application/json' },
          url, user: { id: 1 },
        }, { status: httpStatus! });
      });
      await expectAppleFailure(await bind(ctx('POST', proof)), 503, serviceUnavailable);
      expect(urls).toEqual([production + '1002', sandbox + '1002']);
      expect(bindingCount()).toBe(0);
    });
  }

  it('omits diagnostics from consecutive membership failures', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 401 }));
    await expectAppleFailure(await bind(ctx('POST', proof)), 503, serviceUnavailable);
    vi.stubGlobal('fetch', async () => new Response('', { status: 503 }));
    await expectAppleFailure(await bind(ctx('POST', proof)), 503, serviceUnavailable);
  });

  it('cannot reassign A original ID to B, including a database uniqueness collision', async () => {
    mockDiscovery();
    expect((await bind(ctx('POST', proof))).status).toBe(200);
    session = await signJWT({ userId: 2, username: 'b', role: 'user' }, secret);
    const otherAccount = '22222222-2222-4222-8222-222222222222';
    db.sqlite.prepare('INSERT INTO native_subscription_accounts VALUES (?,?)').run(2, otherAccount);
    mockDiscovery();
    expect((await bind(ctx('POST', proof))).status).toBe(409);
    // Even an inconsistent upstream fixture matching B cannot overwrite A's
    // unique (environment, original_transaction_id) record.
    mockDiscovery(fixtureAppleResponse({ appAccountToken: otherAccount }));
    expect((await bind(ctx('POST', proof))).status).toBe(503);
    expect(bindingCount()).toBe(1);
    expect(db.sqlite.prepare('SELECT user_id,environment FROM native_subscription_bindings').get())
      .toMatchObject({ user_id: 1, environment: 'Sandbox' });
  });

  it.each(['not found', 'revoked', 'upstream error'])('never substitutes a saved Sandbox binding after Production %s', async failure => {
    db.sqlite.prepare('INSERT INTO native_subscription_bindings VALUES (?,?,?)').run(1, 'Sandbox', '1001');
    db.sqlite.prepare('INSERT INTO native_subscription_bindings VALUES (?,?,?)').run(1, 'Production', '1001');
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      urls.push(String(input));
      if (failure === 'not found') return Response.json({ errorCode: 4040010 }, { status: 404 });
      if (failure === 'upstream error') return new Response('', { status: 503 });
      return Response.json(fixtureAppleResponse({}, 5, {}, 'Production'));
    });
    const response = await status(ctx());
    expect(response.status).toBe(failure === 'upstream error' ? 503 : 200);
    if (response.ok) {
      const body = await response.json();
      expect(body).toMatchObject({ active: false, environment: null, entitlement: null });
      expect(body).not.toHaveProperty('appleDebug');
    }
    expect(urls).toEqual([production + '1001']);
    expect(bindingCount()).toBe(2);
  });
});
