import { getRequestUser } from '../../../src/request-auth';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const jwtUser = await getRequestUser(context.request, context.env);

  if (!jwtUser?.userId) {
    return json({ error: '未登录' }, 401);
  }

  const dbUser = await context.env.DB.prepare(
    'SELECT id, username, role, status FROM users WHERE id = ?'
  ).bind(jwtUser.userId).first<any>();

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
