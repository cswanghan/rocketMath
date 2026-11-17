// Trust boundary: only JSON fetched directly over authenticated HTTPS from the
// allowed Apple Server API origins is decoded here. Never decode a client JWS as
// proof. Only one checked redirect; no client-selected host or offline fallback.
export const MONTHLY_PRODUCT = 'com.hanwang.xingya.premium.monthly';
export const APP_BUNDLE = 'com.hanwang.xingya';
export type AppleStoreEnvironment = 'Production' | 'Sandbox';
export interface AppleEnvironment {
  APPLE_IAP_ISSUER_ID?: string;
  APPLE_IAP_KEY_ID?: string;
  APPLE_IAP_PRIVATE_KEY?: string;
  APPLE_IAP_BUNDLE_ID?: string;
  APPLE_IAP_ENVIRONMENT?: string;
}
export function withAppleEnvironment(env: AppleEnvironment, environment: AppleStoreEnvironment): AppleEnvironment {
  // Read IAP bindings directly from the original Pages env: they may be
  // non-enumerable, and wrapping the host env in a Proxy can still lose access.
  return {
    APPLE_IAP_ISSUER_ID: env.APPLE_IAP_ISSUER_ID,
    APPLE_IAP_KEY_ID: env.APPLE_IAP_KEY_ID,
    APPLE_IAP_PRIVATE_KEY: env.APPLE_IAP_PRIVATE_KEY,
    APPLE_IAP_BUNDLE_ID: env.APPLE_IAP_BUNDLE_ID,
    APPLE_IAP_ENVIRONMENT: environment,
  };
}
export class MembershipError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const unavailable = () => new MembershipError(503, '会员验证服务暂不可用，请稍后重试；请勿重复购买。');
export function appleConfiguration(env: AppleEnvironment): {
  issuer: string; keyId: string; privateKey: string; environment: AppleStoreEnvironment; origin: string;
} {
  const environment = env.APPLE_IAP_ENVIRONMENT;
  if (!env.APPLE_IAP_ISSUER_ID || !env.APPLE_IAP_KEY_ID || !env.APPLE_IAP_PRIVATE_KEY
      || env.APPLE_IAP_BUNDLE_ID !== APP_BUNDLE
      || (environment !== 'Production' && environment !== 'Sandbox')) throw unavailable();
  return {
    issuer: env.APPLE_IAP_ISSUER_ID, keyId: env.APPLE_IAP_KEY_ID,
    privateKey: env.APPLE_IAP_PRIVATE_KEY, environment,
    origin: environment === 'Production'
      ? 'https://api.storekit.apple.com' : 'https://api.storekit-sandbox.apple.com',
  };
}
function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function encode(value: unknown) { return base64url(new TextEncoder().encode(JSON.stringify(value))); }
export async function appleAuthorization(env: AppleEnvironment, now = Date.now()) {
  const c = appleConfiguration(env);
  try {
    const pem = c.privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
    const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), x => x.charCodeAt(0)),
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    const iat = Math.floor(now / 1000);
    const input = `${encode({ alg: 'ES256', kid: c.keyId, typ: 'JWT' })}.${encode({
      iss: c.issuer, iat, exp: iat + 300, aud: 'appstoreconnect-v1', bid: APP_BUNDLE,
    })}`;
    const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(input));
    return `${input}.${base64url(new Uint8Array(signature))}`;
  } catch { throw unavailable(); }
}
type JSONRecord = Record<string, unknown>;
function object(value: unknown): JSONRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw unavailable();
  return value as JSONRecord;
}
// Private: input is exclusively a field in Apple's HTTPS response, not the
// request body. Authenticity comes from the authenticated Apple API/TLS, not
// from this base64 decoder. We do not offer a standalone JWS verification API.
function applePayload(value: unknown): JSONRecord {
  if (typeof value !== 'string' || value.length > 50000) throw unavailable();
  const parts = value.split('.');
  if (parts.length !== 3 || parts.some(p => !p || !/^[\w-]+$/.test(p))) throw unavailable();
  try {
    const decode = (s: string) => JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
    if (object(decode(parts[0])).alg !== 'ES256') throw unavailable();
    return object(decode(parts[1]));
  } catch { throw unavailable(); }
}
export interface AppleMembership {
  originalTransactionId: string;
  expiresAt: number;
  environment: AppleStoreEnvironment;
}
export function validTransactionId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{1,30}$/.test(value);
}
function allowedAppleRedirect(location: string | null): string | null {
  // No base URL: relative/malformed locations fail closed. Do not expose any
  // part of Location to clients, including paths, queries or userinfo.
  if (!location || !/^https:\/\/[^/?#\\]/i.test(location) || /[\s\\\u0000-\u001f\u007f]/.test(location)) return null;
  try {
    const url = new URL(location);
    if (url.username || url.password || (url.origin !== 'https://api.storekit.apple.com'
        && url.origin !== 'https://api.storekit-sandbox.apple.com')) return null;
    return url.href;
  } catch { return null; }
}
export async function verifyAppleMembership(
  env: AppleEnvironment, transactionId: string, accountToken: string,
  expectedOriginal?: string, fetcher: typeof fetch = fetch, now = Date.now(),
): Promise<AppleMembership> {
  const config = appleConfiguration(env);
  if (!validTransactionId(transactionId)) throw new MembershipError(400, '交易编号无效');
  const authorization = await appleAuthorization(env, now);
  const discovery = config.environment === 'Production' && expectedOriginal === undefined;
  let response: Response;
  let requestURL = `${config.origin}/inApps/v1/subscriptions/${transactionId}`;
  for (let redirects = 0; ; redirects++) {
    try {
      response = await fetcher(requestURL, {
        headers: { Authorization: `Bearer ${authorization}`, Accept: 'application/json' },
        redirect: 'manual', signal: AbortSignal.timeout(10000),
      });
    } catch {
      // Pre-release compatibility only: a known binding never moves environments
      // on a transport failure, even if a checked redirect preceded that failure.
      if (discovery) {
        return verifyAppleMembership(withAppleEnvironment(env, 'Sandbox'),
          transactionId, accountToken, undefined, fetcher, now);
      }
      throw unavailable();
    }
    if (![301, 302, 307, 308].includes(response.status)) break;
    const location = allowedAppleRedirect(response.headers.get('Location'));
    if (redirects !== 0 || !location) throw unavailable();
    requestURL = location; // Transport only; config.environment remains authoritative.
  }
  // Read once and reuse for verification. An empty or invalid body must not
  // prevent the existing discovery-only 401 fallback.
  let body: JSONRecord | undefined;
  try { body = object(await response.json()); } catch { /* No usable JSON object. */ }
  const rawErrorCode = body?.errorCode;
  const transactionNotFound = response.status === 404 && (rawErrorCode === 4040010 || rawErrorCode === '4040010');
  const fellBackToSandbox = discovery && (transactionNotFound || response.status === 401);
  if (response.status === 404) {
    // Apple's documented 404 discovery requires TransactionIdNotFoundError. A known
    // original/environment binding must never move environments on a failure.
    // https://developer.apple.com/documentation/appstoreserverapi
    if (!transactionNotFound) throw unavailable();
    if (fellBackToSandbox) {
      return verifyAppleMembership(withAppleEnvironment(env, 'Sandbox'),
        transactionId, accountToken, undefined, fetcher, now);
    }
    throw new MembershipError(403, '未找到可验证的订阅；本地模拟购买不授予云端会员。');
  }
  // Never-published apps can receive Production 401 with an empty body. Only
  // discovery may try Sandbox; a known binding must fail closed. Do not depend
  // on the 401 body or treat this response as proof of a valid subscription.
  if (response.status === 401 && fellBackToSandbox) {
    return verifyAppleMembership(withAppleEnvironment(env, 'Sandbox'),
      transactionId, accountToken, undefined, fetcher, now);
  }
  if (!response.ok || !body) throw unavailable();
  if (body.bundleId !== APP_BUNDLE || body.environment !== config.environment || !Array.isArray(body.data)) throw unavailable();
  let bindingMismatch = false;
  for (const groupValue of body.data) {
    const group = object(groupValue);
    if (!Array.isArray(group.lastTransactions)) throw unavailable();
    for (const value of group.lastTransactions) {
      const item = object(value);
      const t = applePayload(item.signedTransactionInfo);
      if (t.productId !== MONTHLY_PRODUCT) continue;
      if (t.bundleId !== APP_BUNDLE || t.environment !== config.environment
          || t.type !== 'Auto-Renewable Subscription' || t.inAppOwnershipType !== 'PURCHASED'
          || !validTransactionId(t.originalTransactionId)
          || item.originalTransactionId !== t.originalTransactionId) throw unavailable();
      if (expectedOriginal && t.originalTransactionId !== expectedOriginal) continue;
      if (typeof t.appAccountToken !== 'string' || t.appAccountToken.toLowerCase() !== accountToken.toLowerCase()) {
        bindingMismatch = true;
        continue;
      }
      if (t.revocationDate != null || t.isUpgraded === true) continue;
      let expiresAt = t.expiresDate;
      if (item.status === 4) {
        const renewal = applePayload(item.signedRenewalInfo);
        if (renewal.originalTransactionId !== t.originalTransactionId || renewal.productId !== MONTHLY_PRODUCT
            || renewal.environment !== config.environment) throw unavailable();
        expiresAt = renewal.gracePeriodExpiresDate;
      } else if (item.status !== 1) continue; // expired, billing retry without grace, revoked, unknown
      // autoRenewStatus == 0 is NOT immediate revocation: the paid period remains valid.
      if (typeof expiresAt !== 'number' || !Number.isSafeInteger(expiresAt) || expiresAt <= now) continue;
      return { originalTransactionId: t.originalTransactionId, expiresAt, environment: config.environment };
    }
  }
  if (bindingMismatch) throw new MembershipError(409, '购买未关联当前账号。请使用原购买账号恢复；无账号标记的历史购买需人工核验，请勿重新付费。');
  throw new MembershipError(403, '云同步与 AI 家长总结需要有效月度会员。');
}
