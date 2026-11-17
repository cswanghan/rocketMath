// HTTP fixtures only, NOT Apple-signed transactions or a Sandbox integration.
// Ephemeral signing key generated in memory for testing our outbound ES256 JWT.
import type { AppleEnvironment, AppleStoreEnvironment } from '../apple-subscriptions';
import { APP_BUNDLE, MONTHLY_PRODUCT } from '../apple-subscriptions';
export const fixtureAccountToken = '11111111-1111-4111-8111-111111111111';
let keys: CryptoKeyPair | undefined;
export async function fixtureAppleEnvironment(): Promise<AppleEnvironment> {
  keys ??= await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const bytes = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keys.privateKey));
  return { APPLE_IAP_ISSUER_ID: 'test-issuer', APPLE_IAP_KEY_ID: 'test-key-id',
    APPLE_IAP_BUNDLE_ID: APP_BUNDLE, APPLE_IAP_ENVIRONMENT: 'Sandbox',
    APPLE_IAP_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...bytes))}\n-----END PRIVATE KEY-----` };
}
export function fixturePublicKey() { return keys!.publicKey; }
function segment(value: unknown) { return btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
export function fixtureJWS(value: unknown) { return `${segment({ alg: 'ES256' })}.${segment(value)}.unsigned-fixture`; }
export function fixtureAppleResponse(transaction: Record<string, unknown> = {}, status = 1,
                                     renewal: Record<string, unknown> = {}, environment: AppleStoreEnvironment = 'Sandbox') {
  return { environment, bundleId: APP_BUNDLE, data: [{ lastTransactions: [{
    originalTransactionId: '1001', status,
    signedTransactionInfo: fixtureJWS({ originalTransactionId: '1001', transactionId: '1002',
      bundleId: APP_BUNDLE, productId: MONTHLY_PRODUCT, type: 'Auto-Renewable Subscription',
      environment, inAppOwnershipType: 'PURCHASED', appAccountToken: fixtureAccountToken,
      expiresDate: Date.now() + 3600000, ...transaction }),
    signedRenewalInfo: fixtureJWS({ originalTransactionId: '1001', productId: MONTHLY_PRODUCT,
      environment, autoRenewStatus: 1, gracePeriodExpiresDate: Date.now() + 3600000, ...renewal }),
  }] }] };
}
export function fixtureAppleFetch(body = fixtureAppleResponse()): typeof fetch {
  return async input => {
    if (!String(input).startsWith('https://api.storekit-sandbox.apple.com/inApps/v1/subscriptions/')) {
      throw new Error('Unexpected URL in mock; live network is forbidden');
    }
    return Response.json(body);
  };
}
