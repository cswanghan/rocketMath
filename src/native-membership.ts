import type { Database } from './server-types';
import { getRequestUser } from './request-auth';
import { appleAuthorization, appleConfiguration, MembershipError, verifyAppleMembership, withAppleEnvironment } from './apple-subscriptions';
import type { AppleEnvironment, AppleMembership } from './apple-subscriptions';

export interface MembershipEnvironment extends AppleEnvironment {
  DB: Database;
  JWT_SECRET?: string;
}
interface StoredBinding { environment: string; original_transaction_id: string }
function environmentForBinding(env: MembershipEnvironment, binding: StoredBinding): AppleEnvironment {
  // Validate the deployment configuration even when a stored environment exists.
  appleConfiguration(env);
  if (binding.environment !== 'Production' && binding.environment !== 'Sandbox') {
    throw new MembershipError(503, '会员验证环境配置无效');
  }
  // Only Apple verification receives this IAP-only object; storage keeps env.
  return withAppleEnvironment(env, binding.environment);
}
export async function membershipAccount(env: MembershipEnvironment, userId: number) {
  // Fail closed before creating a record if validation is not configured.
  await appleAuthorization(env);
  const result = await env.DB.prepare(`INSERT INTO native_subscription_accounts (user_id, account_token)
    SELECT ?, ? WHERE EXISTS (SELECT 1 FROM users WHERE id = ? AND status = 'approved')
    ON CONFLICT(user_id) DO NOTHING`).bind(userId, crypto.randomUUID(), userId).run();
  if (!result.success) throw new Error('membership storage unavailable');
  const row = await env.DB.prepare(`SELECT account_token FROM native_subscription_accounts
    WHERE user_id = ? AND EXISTS (SELECT 1 FROM users WHERE id = ? AND status = 'approved')`)
    .bind(userId, userId).first<{ account_token: string }>();
  if (!row) throw new MembershipError(401, '账号不可用');
  return row.account_token;
}
export async function currentMembership(env: MembershipEnvironment, userId: number, accountToken: string) {
  appleConfiguration(env);
  // Prefer a real paid binding if both exist. Failure of that binding is not
  // permission to substitute Sandbox proof. Never rediscover a bound environment.
  const binding = await env.DB.prepare(`SELECT original_transaction_id, environment FROM native_subscription_bindings
    WHERE user_id = ? ORDER BY CASE environment WHEN 'Production' THEN 0 ELSE 1 END LIMIT 1`)
    .bind(userId).first<StoredBinding>();
  if (!binding) return null;
  try {
    return await verifyAppleMembership(environmentForBinding(env, binding),
      binding.original_transaction_id, accountToken, binding.original_transaction_id);
  } catch (error) {
    if (error instanceof MembershipError && error.status === 403) return null;
    throw error; // Outages/mismatches must not masquerade as a successful empty refresh.
  }
}
export async function bindMembership(env: MembershipEnvironment, userId: number, token: string, transactionId: string) {
  // A previously stored original ID already has a trusted environment. A new
  // transaction ID still needs Production -> Sandbox discovery (exact 4040010
  // or the pre-release Production 401 / fetch-error compatibility paths).
  const binding = await env.DB.prepare(`SELECT original_transaction_id, environment FROM native_subscription_bindings
    WHERE user_id = ? AND original_transaction_id = ?
    ORDER BY CASE environment WHEN 'Production' THEN 0 ELSE 1 END LIMIT 1`)
    .bind(userId, transactionId).first<StoredBinding>();
  const membership = await verifyAppleMembership(binding ? environmentForBinding(env, binding) : env,
    transactionId, token, binding?.original_transaction_id);
  // Unique (environment, original_transaction_id) prevents concurrent cross-account
  // claims. A re-purchase by the SAME Apple-verified account token may replace an
  // expired original ID. Old IDs retain their Apple account token, never reassign it.
  const result = await env.DB.prepare(`INSERT INTO native_subscription_bindings
    (user_id, environment, original_transaction_id) SELECT ?, ?, ?
    WHERE EXISTS (SELECT 1 FROM users WHERE id = ? AND status = 'approved')
    ON CONFLICT(user_id, environment) DO UPDATE SET original_transaction_id = excluded.original_transaction_id`)
    .bind(userId, membership.environment, membership.originalTransactionId, userId).run();
  if (!result.success) throw new Error('binding not saved');
  return membership;
}
export async function requireNativeMember(request: Request, env: MembershipEnvironment) {
  const user = await getRequestUser(request, env);
  if (!user) throw new MembershipError(401, '账号不可用或未登录');
  // Each paid request revalidates with Apple. A cached client flag or header is
  // never authorization; network/configuration/schema failures always deny.
  const token = await membershipAccount(env, user.userId);
  const membership = await currentMembership(env, user.userId, token);
  if (!membership) throw new MembershipError(403, '云同步与 AI 家长总结需要有效月度会员。');
  if (!await getRequestUser(request, env)) throw new MembershipError(401, '账号不可用');
  return user;
}
export function membershipJSON(accountToken: string, membership: AppleMembership | null) {
  return { ok: true, accountToken, active: membership !== null, expiresAt: membership?.expiresAt ?? null,
    environment: membership?.environment ?? null,
    entitlement: membership ? (membership.environment === 'Production' ? 'production_paid' : 'sandbox_test') : null };
}
export function membershipFailure(error: unknown) {
  return new Response(JSON.stringify({ ok: false, error: error instanceof MembershipError
    ? error.message : '会员验证暂不可用，请稍后重试；请勿重复购买。',
  }), {
    status: error instanceof MembershipError ? error.status : 503,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
