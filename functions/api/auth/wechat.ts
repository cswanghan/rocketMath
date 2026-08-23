// 微信小程序登录: POST /api/auth/wechat  { code } → { token, user }
//
// 小程序端 wx.login 拿到的 code 只能在服务端换 openid (jscode2session 必须带
// AppSecret)。AppSecret 只存 Cloudflare 环境变量 WX_APPSECRET —— 与
// DEEPSEEK_API_KEY 同样的做法, 绝不进 git、绝不进任何前端产物。
//
//   npx wrangler pages secret put WX_APPSECRET --project-name=rocket-learning
//   npx wrangler pages secret put WX_APPID     --project-name=rocket-learning
//
// 用户模型复用 Web 端的 users 表 (见 src/db/migrations/wechat.sql): 一个微信
// openid 就是一个家长账号, 孩子档案照旧挂在 children 表下, 两端数据天然互通。
import { signJWT } from '../../../src/auth';
import { getJwtSecret } from '../../../src/env';
import { randomUsernameSuffix } from '../../../src/google';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  WX_APPID: string;
  WX_APPSECRET: string;
}

// google 登录用同样的手法占位: 这些账号没有密码, 任何 verifyPassword 都过不了。
const WECHAT_PASSWORD_PLACEHOLDER = '!wechat-miniprogram!';

interface Code2Session {
  openid?: string;
  unionid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.WX_APPID || !env.WX_APPSECRET) {
    return json({ error: '微信登录未配置' }, 501);
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }
  const code = (body.code || '').trim();
  if (!code) return json({ error: '缺少 code' }, 400);

  let session: Code2Session;
  try {
    const url =
      'https://api.weixin.qq.com/sns/jscode2session' +
      `?appid=${encodeURIComponent(env.WX_APPID)}` +
      `&secret=${encodeURIComponent(env.WX_APPSECRET)}` +
      `&js_code=${encodeURIComponent(code)}` +
      '&grant_type=authorization_code';
    const resp = await fetch(url);
    session = await resp.json<Code2Session>();
  } catch {
    return json({ error: '微信服务暂不可用，请稍后再试' }, 502);
  }

  // 微信这个接口永远返回 200, 失败信息在 body 里 —— 必须看 errcode。
  if (session.errcode || !session.openid) {
    return json({ error: '微信登录失败，请重新进入小程序' }, 401);
  }

  // session_key 能解密手机号/用户信息, 我们不需要, 所以到此为止不落库 —— 不存
  // 就没有泄露风险。
  const user = await resolveWechatUser(env.DB, session.openid, session.unionid);
  if (!user.ok) return json({ error: user.error }, user.status);

  const token = await signJWT(
    { userId: user.user.id, username: user.user.username, role: user.user.role },
    getJwtSecret(env),
  );
  return json({ token, user: user.user });
};

type ResolveResult =
  | { ok: true; user: { id: number; username: string; role: string } }
  | { ok: false; error: string; status: number };

async function resolveWechatUser(
  db: D1Database,
  openid: string,
  unionid?: string,
): Promise<ResolveResult> {
  let row = await db
    .prepare('SELECT id, username, role, status FROM users WHERE wx_openid = ?')
    .bind(openid)
    .first<any>();

  // openid 认不出但 unionid 认得出 = 同一个人从别的端 (公众号/App) 来过, 绑上去
  if (!row && unionid) {
    row = await db
      .prepare('SELECT id, username, role, status FROM users WHERE wx_unionid = ?')
      .bind(unionid)
      .first<any>();
    if (row) {
      await db.prepare('UPDATE users SET wx_openid = ? WHERE id = ?').bind(openid, row.id).run();
    }
  }

  if (!row) {
    // 微信不给昵称 (2022 年后 getUserProfile 已回收), 先发一个占位用户名,
    // 家长可以在「我的」里改。孩子档案里的名字才是界面上真正显示的。
    let username = `wx_${randomUsernameSuffix()}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
      if (!clash) break;
      username = `wx_${randomUsernameSuffix()}`;
    }
    const insert = await db
      .prepare(
        `INSERT INTO users (username, password, wx_openid, wx_unionid, status, role)
         VALUES (?, ?, ?, ?, 'approved', 'user')`,
      )
      .bind(username, WECHAT_PASSWORD_PLACEHOLDER, openid, unionid || null)
      .run();
    const newId = (insert.meta as any)?.last_row_id;
    if (!newId) return { ok: false, error: '创建账号失败', status: 500 };
    return { ok: true, user: { id: newId, username, role: 'user' } };
  }

  if (row.status !== 'approved') return { ok: false, error: '账号不可用', status: 403 };

  if (unionid) {
    await db.prepare('UPDATE users SET wx_unionid = ? WHERE id = ? AND wx_unionid IS NULL')
      .bind(unionid, row.id)
      .run();
  }

  return { ok: true, user: { id: row.id, username: row.username, role: row.role } };
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
