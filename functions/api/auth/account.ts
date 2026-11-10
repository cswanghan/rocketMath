// DELETE /api/auth/account
// The signed-in parent deletes their own server account. The body must repeat
// the current username. Device-local practice data is not stored here.
import { deletionConfirmError, ACCOUNT_DELETE_SQL } from '../../../src/account-deletion';
import { getRequestUser } from '../../../src/request-auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const jwtUser = await getRequestUser(context.request, context.env);
  if (!jwtUser?.userId) return json({ error: '未登录' }, 401);

  const body = await context.request.json().catch(() => ({})) as { username?: unknown };
  const dbUser = await context.env.DB.prepare('SELECT id, username FROM users WHERE id = ?')
    .bind(jwtUser.userId)
    .first<{ id: number; username: string }>();
  if (!dbUser) return json({ error: '账号不存在' }, 404);

  const confirmError = deletionConfirmError(dbUser.username, body.username);
  if (confirmError) return json({ error: confirmError }, 400);

  try {
    await context.env.DB.batch(
      ACCOUNT_DELETE_SQL.map((sql) => context.env.DB.prepare(sql).bind(dbUser.id)),
    );
  } catch (err) {
    console.error('account deletion failed', err);
    return json({ error: '删除失败，请稍后再试' }, 500);
  }

  return json({
    ok: true,
    deleted: {
      account: true,
      children: true,
      vocabProgress: true,
      shengziNotebook: true,
      accountEvents: true,
    },
  });
};
