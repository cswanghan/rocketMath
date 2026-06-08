import { hashPassword } from '../../../src/auth';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { username, password, email, phone } = await context.request.json<{
    username: string; password: string; email: string; phone?: string;
  }>();

  if (!username || !password || !email) {
    return json({ error: '用户名、密码和邮箱不能为空' }, 400);
  }

  if (username.length < 3 || username.length > 20) {
    return json({ error: '用户名长度 3-20 字符' }, 400);
  }

  if (password.length < 6) {
    return json({ error: '密码至少 6 位' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: '邮箱格式不正确' }, 400);
  }

  const existingUser = await context.env.DB.prepare(
    'SELECT id FROM users WHERE username = ?'
  ).bind(username).first();

  if (existingUser) {
    return json({ error: '用户名已存在' }, 409);
  }

  const existingEmail = await context.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first();

  if (existingEmail) {
    return json({ error: '该邮箱已被注册' }, 409);
  }

  const hashedPassword = await hashPassword(password);

  await context.env.DB.prepare(
    'INSERT INTO users (username, password, email, phone, status) VALUES (?, ?, ?, ?, ?)'
  ).bind(username, hashedPassword, email, phone || null, 'approved').run();

  return json({ message: '注册成功，可直接登录' });
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
