// 邮箱推广 (仅管理员): 受众统计 / 历史 / 发送 (Resend 通道)。
// POST { subject, html, test } — test=true 只发给当前管理员自己 (用于无域名阶段联调:
// Resend 未验证域名时只能发到账号本人邮箱)。正式发送遍历有邮箱且未退订的用户,
// 每封注入个性化一键退订链接, 逐封记录 email_log。
import { getRequestUser } from '../../../src/request-auth';
import { unsubscribeToken } from '../../../src/email-token';
import { getJwtSecret } from '../../../src/env';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string; // e.g. "星芽 <hello@yourdomain.com>"; 默认 Resend 测试发件人
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

const DEFAULT_FROM = '星芽 <onboarding@resend.dev>';

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>(\s*)/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function sendViaResend(
  apiKey: string, from: string, to: string, subject: string, html: string,
): Promise<{ ok: boolean; error?: string }> {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, text: htmlToText(html) }),
  });
  if (resp.ok) return { ok: true };
  let msg = `HTTP ${resp.status}`;
  try {
    const body = await resp.json<any>();
    if (body?.message) msg = `${msg}: ${body.message}`;
  } catch { /* keep status-only message */ }
  return { ok: false, error: msg };
}

// GET: 受众统计 + 推广历史
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = await getRequestUser(context.request, context.env);
  if (!user?.userId || user.role !== 'admin') return json({ error: '无权访问' }, 403);
  const db = context.env.DB;

  const [audience, campaigns] = await Promise.all([
    db.prepare(`SELECT
        COUNT(*) total,
        SUM(CASE WHEN email IS NOT NULL AND email != '' AND email_optout = 0 THEN 1 ELSE 0 END) sendable,
        SUM(CASE WHEN email_optout = 1 THEN 1 ELSE 0 END) optout
      FROM users WHERE status = 'approved'`).first<any>(),
    db.prepare(`SELECT id, subject, is_test, sent_count, fail_count, skip_count, created_at
      FROM email_campaigns ORDER BY id DESC LIMIT 20`).all<any>(),
  ]);

  return json({
    audience,
    configured: !!context.env.RESEND_API_KEY,
    from: context.env.EMAIL_FROM || DEFAULT_FROM,
    campaigns: campaigns.results ?? [],
  });
};

// POST: 发送 (test=true 仅发给操作者)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = await getRequestUser(context.request, context.env);
  if (!user?.userId || user.role !== 'admin') return json({ error: '无权访问' }, 403);
  const apiKey = context.env.RESEND_API_KEY;
  if (!apiKey) return json({ error: '未配置 RESEND_API_KEY,先在 Pages 项目里添加这个 secret' }, 500);

  const { subject, html, test } = await context.request.json<{
    subject: string; html: string; test?: boolean;
  }>();
  if (!subject?.trim() || !html?.trim()) return json({ error: '主题和内容不能为空' }, 400);

  const db = context.env.DB;
  const from = context.env.EMAIL_FROM || DEFAULT_FROM;
  const secret = getJwtSecret(context.env);
  const origin = new URL(context.request.url).origin;

  // 受众: 测试 = 只发操作管理员自己; 正式 = 全部有邮箱且未退订
  let recipients: { id: number; email: string; username: string }[];
  if (test) {
    const me = await db.prepare('SELECT id, email, username FROM users WHERE id = ?')
      .bind(user.userId).first<any>();
    if (!me?.email) return json({ error: '你的账号没有邮箱,无法测试发送' }, 400);
    recipients = [me];
  } else {
    const rows = await db.prepare(`SELECT id, email, username FROM users
      WHERE status = 'approved' AND email IS NOT NULL AND email != '' AND email_optout = 0
      ORDER BY id`).all<any>();
    recipients = rows.results ?? [];
  }
  if (recipients.length === 0) return json({ error: '没有可发送的用户' }, 400);

  const campaign = await db.prepare(
    'INSERT INTO email_campaigns (subject, html, is_test, created_by) VALUES (?, ?, ?, ?)',
  ).bind(subject, html, test ? 1 : 0, user.userId).run();
  const campaignId = campaign.meta.last_row_id;

  let sent = 0; let failed = 0;
  const results: { email: string; status: string; error?: string }[] = [];
  for (const r of recipients) {
    const token = await unsubscribeToken(r.id, r.email, secret);
    const unsubUrl = `${origin}/api/email/unsubscribe?u=${r.id}&t=${token}`;
    const personalized = html
      .replaceAll('{{USERNAME}}', r.username || '同学')
      .replaceAll('{{UNSUB_URL}}', unsubUrl);
    const out = await sendViaResend(apiKey, from, r.email, subject, personalized);
    if (out.ok) sent++; else failed++;
    results.push({ email: r.email, status: out.ok ? 'sent' : 'failed', error: out.error });
    await db.prepare(
      'INSERT INTO email_log (campaign_id, user_id, email, status, error) VALUES (?, ?, ?, ?, ?)',
    ).bind(campaignId, r.id, r.email, out.ok ? 'sent' : 'failed', out.error ?? null).run();
    // Resend 免费档限速 2 req/s
    if (recipients.length > 1) await new Promise((res) => setTimeout(res, 600));
  }

  await db.prepare('UPDATE email_campaigns SET sent_count = ?, fail_count = ? WHERE id = ?')
    .bind(sent, failed, campaignId).run();

  return json({ campaignId, sent, failed, results });
};
