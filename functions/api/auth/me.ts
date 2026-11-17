import { getRequestIdentity } from '../../../src/request-auth';
import type { Database, PagesHandler } from '../../../src/server-types';

interface Env { DB: Database; JWT_SECRET: string; }

export const onRequestGet: PagesHandler<Env> = async (context) => {
  const jwtUser = await getRequestIdentity(context.request, context.env);

  if (!jwtUser?.userId) {
    return json({ error: '未登录' }, 401);
  }

  const dbUser = await context.env.DB.prepare(
    'SELECT id, username, role, status FROM users WHERE id = ?'
  ).bind(jwtUser.userId).first<any>();

  if (dbUser?.status === 'deleting') {
    // Preserve the device's deletion credential across relaunch/network retries.
    // Every data/membership API still rejects this non-approved account.
    return json({ error: '账号删除尚未完成，请在账号页面重试删除。', code: 'account_deletion_pending' }, 409);
  }
  if (!dbUser || dbUser.status !== 'approved') {
    return json({ error: '账号不可用' }, 401);
  }

  return json({ user: { id: dbUser.id, username: dbUser.username, role: dbUser.role } });
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
