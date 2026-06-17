import { getRequestUser } from '../../../src/request-auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

// 生字本云端：整本 JSON 存取，按 user + child 隔离，最新为准。
function childKey(v: unknown): string {
  const s = String(v ?? '').trim();
  return s && s !== 'null' && s !== 'undefined' ? s.slice(0, 32) : '0';
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = await getRequestUser(context.request, context.env);
  if (!user?.userId) return json({ error: '未登录' }, 401);
  const url = new URL(context.request.url);
  const ck = childKey(url.searchParams.get('child'));
  const row = await context.env.DB.prepare(
    'SELECT data, updated_at FROM shengzi_notebook WHERE user_id = ? AND child_key = ?',
  ).bind(user.userId, ck).first<any>();

  let data: unknown[] = [];
  if (row?.data) { try { data = JSON.parse(row.data); } catch { data = []; } }
  return json({ data: Array.isArray(data) ? data : [], updatedAt: row?.updated_at || 0 });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = await getRequestUser(context.request, context.env);
  if (!user?.userId) return json({ error: '未登录' }, 401);
  const body = await context.request.json<{ data?: unknown[]; updatedAt?: number; child?: unknown }>();
  const data = Array.isArray(body.data) ? body.data : [];
  if (data.length > 2000) return json({ error: '生字本过大（上限 2000 字）' }, 400);
  const ck = childKey(body.child);
  const updatedAt = Number.isFinite(body.updatedAt) ? Number(body.updatedAt) : Date.now();

  await context.env.DB.prepare(
    `INSERT INTO shengzi_notebook (user_id, child_key, data, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, child_key) DO UPDATE SET
       data = excluded.data,
       updated_at = excluded.updated_at`,
  ).bind(user.userId, ck, JSON.stringify(data), updatedAt).run();

  return json({ saved: data.length, updatedAt, syncedAt: new Date().toISOString() });
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
