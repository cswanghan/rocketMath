import { getRequestUser } from '../../../src/request-auth';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = await getRequestUser(context.request, context.env);
  if (!user?.userId || user.role !== 'admin') {
    return json({ error: '无权访问' }, 403);
  }

  const { action, userId } = await context.request.json<{ action: string; userId: number }>();

  if (!userId || !action) {
    return json({ error: '参数缺失' }, 400);
  }

  if (userId === user.userId) {
    return json({ error: '不能操作自己的账号' }, 400);
  }

  const db = context.env.DB;

  switch (action) {
    case 'approve':
      await db.prepare("UPDATE users SET status = 'approved', updated_at = datetime('now') WHERE id = ?")
        .bind(userId).run();
      return json({ message: '已通过' });

    case 'reject':
      await db.prepare("UPDATE users SET status = 'rejected', updated_at = datetime('now') WHERE id = ?")
        .bind(userId).run();
      return json({ message: '已拒绝' });

    case 'promote':
      await db.prepare("UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE id = ?")
        .bind(userId).run();
      return json({ message: '已设为管理员' });

    case 'demote':
      await db.prepare("UPDATE users SET role = 'user', updated_at = datetime('now') WHERE id = ?")
        .bind(userId).run();
      return json({ message: '已取消管理员' });

    case 'delete':
      await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
      return json({ message: '已删除' });

    default:
      return json({ error: '未知操作' }, 400);
  }
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
