// 一键退订 (邮件 footer 链接, 无需登录): /api/email/unsubscribe?u=<userId>&t=<hmac>
// 校验通过则置 users.email_optout = 1, 返回浅色主题确认页。
import { verifyUnsubscribeToken } from '../../../src/email-token';
import { getJwtSecret } from '../../../src/env';

interface Env { DB: D1Database; JWT_SECRET: string; }

function page(title: string, body: string, status = 200) {
  return new Response(`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title} · 星芽</title>
<style>
  body{font-family:system-ui,-apple-system,'PingFang SC',sans-serif;background:#faf8f4;color:#1d1b18;
    display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
  .card{background:#fff;border-radius:22px;box-shadow:0 14px 36px rgba(40,38,60,.10);
    padding:40px 44px;max-width:420px;text-align:center;}
  .em{font-size:2.6rem;}h1{font-size:1.3rem;margin:12px 0 8px;}
  p{color:#94908a;line-height:1.7;margin:0;}
  a{color:#2f9be0;text-decoration:none;font-weight:600;}
</style></head><body><div class="card">${body}</div></body></html>`, {
    status, headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const userId = Number(url.searchParams.get('u'));
  const token = url.searchParams.get('t') || '';
  if (!Number.isInteger(userId) || userId <= 0 || !token) {
    return page('链接无效', '<div class="em">🤔</div><h1>退订链接无效</h1><p>链接不完整,请使用邮件底部的原始链接。</p>', 400);
  }

  const db = context.env.DB;
  const user = await db.prepare('SELECT id, email FROM users WHERE id = ?').bind(userId).first<any>();
  if (!user?.email) {
    return page('链接无效', '<div class="em">🤔</div><h1>退订链接无效</h1><p>账号不存在或没有绑定邮箱。</p>', 400);
  }

  const valid = await verifyUnsubscribeToken(userId, user.email, token, getJwtSecret(context.env));
  if (!valid) {
    return page('链接无效', '<div class="em">🚫</div><h1>退订链接校验失败</h1><p>请使用邮件底部的原始链接,不要修改其中的参数。</p>', 403);
  }

  await db.prepare('UPDATE users SET email_optout = 1 WHERE id = ?').bind(userId).run();
  return page('退订成功',
    `<div class="em">🌱</div><h1>退订成功</h1>
     <p>不会再给 <b>${user.email}</b> 发送推广邮件了。<br>账号相关的重要通知不受影响。<br><br>
     <a href="/">回星芽首页</a></p>`);
};
