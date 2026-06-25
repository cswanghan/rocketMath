// GSI redirect 模式回调: Google 把 ID token 以表单 POST 到这里 (login_uri)。
// 校验 CSRF(双提交 cookie) + 校验凭证 → 签发 token → 存一次性 code → 302 回登录页带 ?gcode=。
import { getJwtSecret } from '../../../src/env';
import { verifyGoogleIdToken } from '../../../src/google';
import { resolveGoogleLogin } from './_googleLogin';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
}

function redirectTo(request: Request, query: string) {
  return Response.redirect(new URL('/login.html' + query, request.url).toString(), 302);
}
const err = (request: Request, msg: string) => redirectTo(request, '?gerror=' + encodeURIComponent(msg));

function cookie(request: Request, name: string): string {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : '';
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const clientId = env.GOOGLE_CLIENT_ID;
    if (!clientId) return err(request, 'Google 登录未配置');

    const form = await request.formData();
    const credential = String(form.get('credential') || '');
    const bodyCsrf = String(form.get('g_csrf_token') || '');
    const cookieCsrf = cookie(request, 'g_csrf_token');

    if (!credential) return err(request, '缺少凭证');
    if (!bodyCsrf || bodyCsrf !== cookieCsrf) return err(request, '安全校验失败，请重试');

    let payload;
    try {
      payload = await verifyGoogleIdToken(credential, clientId);
    } catch (e: any) {
      return err(request, 'Google 凭证校验失败');
    }

    const result = await resolveGoogleLogin(env.DB, payload, getJwtSecret(env));
    if (!result.ok) return err(request, result.error);

    // 一次性 code (不把 token 放进 URL)
    const code = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = Date.now() + 5 * 60 * 1000;
    await env.DB.prepare(
      'INSERT INTO auth_codes (code, token, user_json, needs_username, expires_at) VALUES (?, ?, ?, ?, ?)',
    ).bind(code, result.token, JSON.stringify(result.user), result.needsUsername ? 1 : 0, expiresAt).run();

    return redirectTo(request, '?gcode=' + code);
  } catch {
    return err(request, 'Google 登录失败，请重试');
  }
};
