// 行为埋点数据看板 (仅管理员)。返回总览 + 事件分布 + 最近事件 + 每日趋势。
import { getRequestUser } from '../../../src/request-auth';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = await getRequestUser(context.request, context.env);
  if (!user?.userId || user.role !== 'admin') {
    return json({ error: '无权访问' }, 403);
  }
  const db = context.env.DB;

  const [totalR, todayR, weekR, usersR, anonR] = await Promise.all([
    db.prepare('SELECT COUNT(*) as c FROM events').first<any>(),
    db.prepare("SELECT COUNT(*) as c FROM events WHERE created_at >= datetime('now','-1 day')").first<any>(),
    db.prepare("SELECT COUNT(*) as c FROM events WHERE created_at >= datetime('now','-7 days')").first<any>(),
    db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM events WHERE user_id IS NOT NULL').first<any>(),
    db.prepare('SELECT COUNT(DISTINCT anon_id) as c FROM events WHERE anon_id IS NOT NULL').first<any>(),
  ]);

  const byEvent = await db.prepare(
    'SELECT event, COUNT(*) as c FROM events GROUP BY event ORDER BY c DESC LIMIT 30'
  ).all<any>();

  const daily = await db.prepare(
    "SELECT substr(created_at,1,10) as day, COUNT(*) as c FROM events WHERE created_at >= datetime('now','-14 days') GROUP BY day ORDER BY day DESC"
  ).all<any>();

  // recent events joined with username
  const recent = await db.prepare(
    `SELECT e.id, e.event, e.props, e.path, e.created_at, e.anon_id, u.username
     FROM events e LEFT JOIN users u ON u.id = e.user_id
     ORDER BY e.id DESC LIMIT 60`
  ).all<any>();

  return json({
    total: totalR?.c || 0,
    today: todayR?.c || 0,
    week: weekR?.c || 0,
    users: usersR?.c || 0,
    anons: anonR?.c || 0,
    byEvent: byEvent.results || [],
    daily: daily.results || [],
    recent: recent.results || [],
  });
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
