// 客户端用一次性 code 换取登录 token (配合 google-callback 的 redirect 流程)。
interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body: any = await context.request.json().catch(() => ({}));
  const code = String(body?.code || '');
  if (!code) return json({ error: '缺少 code' }, 400);

  const row = await context.env.DB.prepare(
    'SELECT token, user_json, needs_username, expires_at FROM auth_codes WHERE code = ?',
  ).bind(code).first<any>();

  // single-use: delete regardless of validity
  await context.env.DB.prepare('DELETE FROM auth_codes WHERE code = ?').bind(code).run();

  if (!row) return json({ error: '无效或已使用的登录码' }, 400);
  if (Number(row.expires_at) < Date.now()) return json({ error: '登录已过期，请重试' }, 400);

  return json({
    token: row.token,
    user: JSON.parse(row.user_json),
    needsUsername: !!row.needs_username,
  });
};
