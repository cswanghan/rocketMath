// 用户行为埋点上报。匿名可用；登录用户通过 Authorization 头或 body.token 归因。
// 设计为"尽量成功、永不报错阻塞前端"：任何异常都返回 200。
import { verifyJWT } from '../../src/auth';
import { getJwtSecret } from '../../src/env';
import { getRequestUser } from '../../src/request-auth';

interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function ok(body: object = { ok: true }) {
  return new Response(JSON.stringify(body), { status: 200, headers: JSON_HEADERS });
}

function clip(v: unknown, n: number): string {
  if (v == null) return '';
  const s = typeof v === 'string' ? v : String(v);
  return s.length > n ? s.slice(0, n) : s;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const body: any = await request.json().catch(() => ({}));
    const events: any[] = Array.isArray(body?.events) ? body.events.slice(0, 50) : [];
    if (!events.length) return ok();

    // resolve user: prefer Authorization header (fetch path), fall back to body.token (sendBeacon path)
    let userId: number | null = null;
    try {
      const fromHeader = await getRequestUser(request, env);
      if (fromHeader?.userId) {
        userId = Number(fromHeader.userId) || null;
      } else if (body?.token) {
        const payload = await verifyJWT(String(body.token), getJwtSecret(env));
        if (payload?.userId) userId = Number(payload.userId) || null;
      }
    } catch {
      /* anonymous */
    }

    const anon = clip(body?.anonId, 64);
    const ua = clip(request.headers.get('User-Agent'), 256);
    const childId = Number.isFinite(body?.childId) ? Number(body.childId) : null;

    const stmts = events.map((e) =>
      env.DB.prepare(
        'INSERT INTO events (user_id, anon_id, child_id, event, props, path, ua) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).bind(
        userId,
        anon,
        childId,
        clip(e?.event, 64) || 'unknown',
        clip(typeof e?.props === 'string' ? e.props : JSON.stringify(e?.props ?? {}), 2000),
        clip(e?.path, 256),
        ua,
      ),
    );

    await env.DB.batch(stmts);
    return ok({ ok: true, n: stmts.length });
  } catch {
    // never block the client on analytics failure
    return ok({ ok: false });
  }
};
