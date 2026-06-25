// 家庭孩子档案 CRUD。家长鉴权后只能管理自己名下(parent_id)的孩子。
import { getRequestUser } from '../../../src/request-auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const MAX_CHILDREN = 8;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

async function parent(context: { request: Request; env: Env }) {
  const u = await getRequestUser(context.request, context.env);
  return u?.userId ? Number(u.userId) : null;
}

function clean(v: unknown, n: number): string {
  return (typeof v === 'string' ? v : '').trim().slice(0, n);
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const pid = await parent(context);
  if (!pid) return json({ error: '未登录' }, 401);
  const rows = await context.env.DB.prepare(
    'SELECT id, name, avatar, grade, created_at FROM children WHERE parent_id = ? ORDER BY id ASC',
  ).bind(pid).all<any>();
  return json({ children: rows.results || [] });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const pid = await parent(context);
  if (!pid) return json({ error: '未登录' }, 401);

  const body: any = await context.request.json().catch(() => ({}));
  const name = clean(body?.name, 20);
  if (!name) return json({ error: '请填写孩子的名字' }, 400);
  const avatar = clean(body?.avatar, 8) || '🐣';
  const grade = Number.isFinite(body?.grade) ? Math.max(1, Math.min(6, Math.floor(body.grade))) : null;

  const countRow = await context.env.DB.prepare('SELECT COUNT(*) as c FROM children WHERE parent_id = ?')
    .bind(pid).first<any>();
  if ((countRow?.c || 0) >= MAX_CHILDREN) return json({ error: `最多添加 ${MAX_CHILDREN} 个孩子` }, 400);

  const res = await context.env.DB.prepare(
    'INSERT INTO children (parent_id, name, avatar, grade) VALUES (?, ?, ?, ?)',
  ).bind(pid, name, avatar, grade).run();

  return json({ id: res.meta.last_row_id, name, avatar, grade });
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const pid = await parent(context);
  if (!pid) return json({ error: '未登录' }, 401);
  const body: any = await context.request.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!id) return json({ error: '缺少孩子 id' }, 400);

  const owned = await context.env.DB.prepare('SELECT id FROM children WHERE id = ? AND parent_id = ?')
    .bind(id, pid).first<any>();
  if (!owned) return json({ error: '无权修改' }, 403);

  const name = clean(body?.name, 20);
  const avatar = clean(body?.avatar, 8);
  const grade = Number.isFinite(body?.grade) ? Math.max(1, Math.min(6, Math.floor(body.grade))) : null;

  await context.env.DB.prepare(
    `UPDATE children SET
       name   = COALESCE(NULLIF(?, ''), name),
       avatar = COALESCE(NULLIF(?, ''), avatar),
       grade  = COALESCE(?, grade)
     WHERE id = ? AND parent_id = ?`,
  ).bind(name, avatar, grade, id, pid).run();

  return json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const pid = await parent(context);
  if (!pid) return json({ error: '未登录' }, 401);
  const body: any = await context.request.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!id) return json({ error: '缺少孩子 id' }, 400);
  await context.env.DB.prepare('DELETE FROM children WHERE id = ? AND parent_id = ?').bind(id, pid).run();
  return json({ ok: true });
};
