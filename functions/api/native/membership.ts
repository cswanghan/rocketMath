import { getRequestUser } from '../../../src/request-auth';
import { MembershipError, validTransactionId } from '../../../src/apple-subscriptions';
import { membershipAccount, currentMembership, bindMembership, membershipJSON, membershipFailure } from '../../../src/native-membership';
import type { MembershipEnvironment } from '../../../src/native-membership';
import type { PagesHandler } from '../../../src/server-types';

const handle: PagesHandler<MembershipEnvironment> = async ({ request, env }) => {
  try {
    const user = await getRequestUser(request, env);
    if (!user) throw new MembershipError(401, '账号不可用或未登录');
    const accountToken = await membershipAccount(env, user.userId);
    let membership;
    if (request.method === 'POST') {
      let body: { transactionId?: unknown };
      try { body = await request.json(); } catch { throw new MembershipError(400, '请求格式无效'); }
      if (!body || !validTransactionId(body.transactionId)) throw new MembershipError(400, '交易编号无效');
      membership = await bindMembership(env, user.userId, accountToken, body.transactionId);
    } else {
      membership = await currentMembership(env, user.userId, accountToken);
    }
    if (!await getRequestUser(request, env)) throw new MembershipError(401, '账号不可用');
    return new Response(JSON.stringify(membershipJSON(accountToken, membership)), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) { return membershipFailure(error); }
};
export const onRequestGet = handle;
export const onRequestPost = handle;
