import { getJwtSecret } from '../../../src/env';
import { verifyGoogleIdToken } from '../../../src/google';
import { resolveGoogleLogin } from './_googleLogin';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const clientId = context.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return json({ error: 'Google 登录未配置' }, 500);
  }

  let body: { credential?: string };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const credential = body.credential;
  if (!credential) {
    return json({ error: '缺少 credential' }, 400);
  }

  let payload;
  try {
    payload = await verifyGoogleIdToken(credential, clientId);
  } catch (e: any) {
    return json({ error: 'Google 凭证校验失败: ' + (e.message || 'unknown') }, 401);
  }

  const result = await resolveGoogleLogin(context.env.DB, payload, getJwtSecret(context.env));
  if (!result.ok) return json({ error: result.error }, result.status);

  return json({ token: result.token, user: result.user, needsUsername: result.needsUsername });
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
