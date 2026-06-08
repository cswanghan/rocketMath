import { getRequestUser } from '../../../src/request-auth';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = await getRequestUser(context.request, context.env);
  if (!user?.userId || user.role !== 'admin') {
    return json({ error: '无权访问' }, 403);
  }

  const db = context.env.DB;

  const [totalR, approvedR, todayR, weekR, googleR] = await Promise.all([
    db.prepare('SELECT COUNT(*) as c FROM users').first<any>(),
    db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'approved'").first<any>(),
    db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now', '-1 day')").first<any>(),
    db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now', '-7 days')").first<any>(),
    db.prepare('SELECT COUNT(*) as c FROM users WHERE google_sub IS NOT NULL').first<any>(),
  ]);

  const recentUsers = await db.prepare(
    'SELECT id, username, email, role, status, created_at FROM users ORDER BY id DESC LIMIT 10'
  ).all<any>();

  return json({
    total: totalR?.c || 0,
    approved: approvedR?.c || 0,
    today: todayR?.c || 0,
    week: weekR?.c || 0,
    google: googleR?.c || 0,
    recentUsers: recentUsers.results || [],
  });
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
