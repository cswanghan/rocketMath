// All key material is generated in memory for this test process. Nothing here
// is an Apple credential; no key, JWT, or request body is printed to logs.
import { appleNonceHash, type AppleSignInEnvironment } from '../apple-sign-in';

function b64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)); }
function url64(bytes: Uint8Array) { return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
const encoder = new TextEncoder();
const encode = (value: unknown) => url64(encoder.encode(JSON.stringify(value)));

export async function appleSignInFixture() {
  const signing = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const client = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publicJWK = { ...await crypto.subtle.exportKey('jwk', signing.publicKey), kid: 'fixture-signing-key', use: 'sig', alg: 'RS256' };
  const env: AppleSignInEnvironment = {
    APPLE_SIGN_IN_TEAM_ID: 'QY29J9ZMPU', APPLE_SIGN_IN_CLIENT_ID: 'com.hanwang.xingya',
    APPLE_SIGN_IN_KEY_ID: 'fixture-client-key',
    APPLE_SIGN_IN_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\n${b64(new Uint8Array(await crypto.subtle.exportKey('pkcs8', client.privateKey)))}\n-----END PRIVATE KEY-----`,
    APPLE_SIGN_IN_TOKEN_ENCRYPTION_KEY: b64(crypto.getRandomValues(new Uint8Array(32))),
  };
  const rawNonce = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  async function token(nonce: string, overrides: Record<string, unknown> = {}, key = signing.privateKey,
    header: Record<string, unknown> = {}) {
    const now = Math.floor(Date.now() / 1000);
    const input = `${encode({ alg: 'RS256', kid: publicJWK.kid, ...header })}.${encode({
      iss: 'https://appleid.apple.com', aud: 'com.hanwang.xingya', sub: 'fixture-apple-subject',
      iat: now, exp: now + 300, nonce: await appleNonceHash(nonce),
      email: 'fixture@privaterelay.appleid.com', email_verified: 'true', ...overrides,
    })}`;
    return `${input}.${url64(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(input))))}`;
  }
  const codeTokens = new Map<string, string>();
  const calls: string[] = [];
  let revokeStatus = 200;
  let revokeBody = '';
  let exchangeStatus = 200;
  let exchangeError = 'fixture-exchange-error';
  let exchangeDescription = '';
  let includeRefreshToken = true;
  let exchangeSubstitution: string | undefined;
  const issuedRefreshTokens: string[] = [];
  const revoked: string[] = [];
  let clientSecretValid = false;
  let nativeParametersValid = false;
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push(url);
    if (url === 'https://appleid.apple.com/auth/keys') return Response.json({ keys: [publicJWK] });
    const form = new URLSearchParams(String(init?.body));
    const clientSecret = form.get('client_secret') || '';
    const [head, body, signature] = clientSecret.split('.');
    const parse = (part: string) => JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    const claims = parse(body);
    clientSecretValid = parse(head).alg === 'ES256' && parse(head).kid === env.APPLE_SIGN_IN_KEY_ID
      && claims.sub === env.APPLE_SIGN_IN_CLIENT_ID && claims.iss === env.APPLE_SIGN_IN_TEAM_ID
      && claims.aud === 'https://appleid.apple.com' && claims.exp > claims.iat
      && await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, client.publicKey,
        Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)), encoder.encode(`${head}.${body}`));
    nativeParametersValid = form.get('client_id') === env.APPLE_SIGN_IN_CLIENT_ID && !form.has('redirect_uri')
      && init?.method === 'POST' && (init.headers as Record<string, string>)['Content-Type'] === 'application/x-www-form-urlencoded';
    if (url === 'https://appleid.apple.com/auth/token') {
      if (exchangeStatus !== 200) return Response.json({ error: exchangeError, error_description: exchangeDescription }, { status: exchangeStatus });
      const idToken = exchangeSubstitution || codeTokens.get(form.get('code') || '');
      if (!idToken || form.get('grant_type') !== 'authorization_code') return new Response('', { status: 400 });
      codeTokens.delete(form.get('code') || '');
      if (!includeRefreshToken) return Response.json({ id_token: idToken, access_token: 'fixture-access-not-persisted' });
      const refresh = `fixture-refresh-${crypto.randomUUID()}`;
      issuedRefreshTokens.push(refresh);
      return Response.json({ id_token: idToken, refresh_token: refresh, access_token: 'fixture-access-not-persisted' });
    }
    if (url === 'https://appleid.apple.com/auth/revoke') {
      if (form.get('token_type_hint') !== 'refresh_token') return new Response('', { status: 400 });
      revoked.push(form.get('token') || '');
      return new Response(revokeBody, { status: revokeStatus });
    }
    throw new Error('unexpected fixture endpoint');
  };
  return { env, rawNonce, token, codeTokens, calls, fetcher, issuedRefreshTokens, revoked,
    get clientSecretValid() { return clientSecretValid; }, get nativeParametersValid() { return nativeParametersValid; },
    setRevoke(status: number, body = '') { revokeStatus = status; revokeBody = body; },
    setExchange(status: number, error = 'fixture-exchange-error', description = '') {
      exchangeStatus = status; exchangeError = error; exchangeDescription = description;
    },
    setRefreshToken(included: boolean) { includeRefreshToken = included; },
    substituteExchange(value: string) { exchangeSubstitution = value; },
  };
}
