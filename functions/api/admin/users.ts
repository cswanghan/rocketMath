import { getRequestUser } from '../../../src/request-auth';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = await getRequestUser(context.request, context.env);
  if (!user?.userId || user.role !== 'admin') {
    return json({ error: '无权访问' }, 403);
  }

  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const size = Math.min(100, Math.max(1, parseInt(url.searchParams.get('size') || '50')));
  const search = url.searchParams.get('q') || '';
  const offset = (page - 1) * size;

  let countQuery = 'SELECT COUNT(*) as total FROM users';
  let listQuery = 'SELECT id, username, email, phone, role, status, google_sub, created_at, updated_at FROM users';
  const bindings: any[] = [];

  if (search) {
    const where = ' WHERE username LIKE ? OR email LIKE ?';
    const pattern = `%${search}%`;
    countQuery += where;
    listQuery += where;
    bindings.push(pattern, pattern);
  }

  listQuery += ' ORDER BY id DESC LIMIT ? OFFSET ?';

  const countResult = await context.env.DB.prepare(countQuery)
    .bind(...bindings).first<any>();
  const total = countResult?.total || 0;

  const listResult = await context.env.DB.prepare(listQuery)
    .bind(...bindings, size, offset).all<any>();

  return json({
    users: listResult.results || [],
    total,
    page,
    size,
    pages: Math.ceil(total / size),
  });
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
