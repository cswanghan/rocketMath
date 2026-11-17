import type { Database, PagesHandler, PreparedStatement } from '../../../src/server-types';
// POST /api/auth/delete-account. No deployment is implied by this source.
// One D1 batch transaction: linked-data cleanup + de-identifying soft deletion.
import { getRequestIdentity } from '../../../src/request-auth';
import { acquireAppleLock, requireAppleSignInConfig, revokeAppleRefreshToken,
  type AppleSignInEnvironment } from '../../../src/apple-sign-in';

interface Env extends AppleSignInEnvironment { DB: Database; JWT_SECRET: string }

export const onRequestPost: PagesHandler<Env> = async (context) => {
  let appleLock: Awaited<ReturnType<typeof acquireAppleLock>> | undefined;
  try {
    const identity = await getRequestIdentity(context.request, context.env);
    if (!identity) return json({ ok: false, error: '未登录' }, 401);
    const db = context.env.DB;
    const userId = identity.userId as number;
    let user = await db.prepare('SELECT id, status, apple_sub FROM users WHERE id = ?').bind(userId)
      .first<{ id: number; status: string; apple_sub: string | null }>();
    // Allow retry after a committed deletion whose response was lost. Repeat
    // cleanup even for legacy tombstones; status alone is not proof of cleanup.
    if (!user || !['approved', 'deleting', 'deleted'].includes(user.status)) {
      return json({ ok: false, error: '账号不可用' }, 401);
    }

    const catalog = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all<{ name: string }>();
    if (!catalog.success) throw new Error('schema unavailable');
    const tables = new Set(catalog.results.map(row => row.name));
    // Native progress is a deployment prerequisite. Never silently skip it.
    const required = ['users', 'math_student', 'math_track_state', 'math_practice', 'math_mistake'];
    if (required.some(table => !tables.has(table))) throw new Error('native schema incomplete');
    const statements: PreparedStatement[] = [];
    const add = (sql: string, ...values: (string | number)[]) => {
      statements.push(db.prepare(sql).bind(...values));
    };
    for (const table of ['math_mistake', 'math_practice', 'math_track_state', 'math_student', 'vocab_progress', 'shengzi_notebook']) {
      // Only a positive schema lookup may skip an optional module. SQL errors
      // (permissions, bad columns, constraints, outages) abort the whole batch.
      if (tables.has(table)) add(`DELETE FROM ${table} WHERE user_id = ?`, userId);
    }
    if (tables.has('events')) {
      const columns = await db.prepare('PRAGMA table_info(events)').all<{ name: string }>();
      if (!columns.success) throw new Error('event schema unavailable');
      const hasChild = tables.has('children') && columns.results.some(c => c.name === 'child_id');
      add(hasChild
        ? 'DELETE FROM events WHERE user_id = ? OR child_id IN (SELECT id FROM children WHERE parent_id = ?)'
        : 'DELETE FROM events WHERE user_id = ?', ...(hasChild ? [userId, userId] : [userId]));
    }
    if (tables.has('children')) add('DELETE FROM children WHERE parent_id = ?', userId);
    if (tables.has('email_log')) {
      add(`DELETE FROM email_log WHERE user_id = ? OR (user_id IS NULL AND lower(email) IN
           (SELECT lower(email) FROM users WHERE id = ? AND email IS NOT NULL))`, userId, userId);
    }
    if (tables.has('email_campaigns')) add('UPDATE email_campaigns SET created_by = NULL WHERE created_by = ?', userId);
    if (tables.has('auth_codes')) add("DELETE FROM auth_codes WHERE json_extract(user_json, '$.id') = ?", userId);
    add(`UPDATE users SET username = ?, email = NULL, phone = NULL, google_sub = NULL, apple_sub = NULL, apple_name = NULL,
         password = '!', role = 'user', status = 'deleted', updated_at = datetime('now') WHERE id = ?`,
      `deleted_${userId}_${Date.now()}`, userId);
    add('SELECT status FROM users WHERE id = ?', userId);

    if (user.apple_sub) {
      await requireAppleSignInConfig(context.env);
      appleLock = await acquireAppleLock(db, user.apple_sub);
      // Re-read after locking: another deletion may have just completed.
      user = await db.prepare('SELECT id, status, apple_sub FROM users WHERE id = ?').bind(userId)
        .first<{ id: number; status: string; apple_sub: string | null }>();
      if (!user) throw new Error('account unavailable');
      if (user.apple_sub) {
        const tokens = await db.prepare('SELECT id, encrypted_token FROM apple_sign_in_tokens WHERE user_id = ?')
          .bind(userId).all<{ id: string; encrypted_token: string }>();
        if (!tokens.success || (tokens.results.length === 0 && user.status !== 'deleting')) {
          throw new Error('revocation credential unavailable');
        }
        // Durable retry state: all access checks already require approved.
        // Keep the client's session so the same delete request can finish.
        const pending = await db.prepare("UPDATE users SET status = 'deleting' WHERE id = ? AND apple_sub = ? RETURNING id")
          .bind(userId, user.apple_sub).first();
        if (!pending) throw new Error('deletion retry state unavailable');
        for (const token of tokens.results) {
          await appleLock.renew();
          await revokeAppleRefreshToken(context.env, user.apple_sub, token.encrypted_token);
          await appleLock.renew();
          // Remove only after Apple's explicit success. Lost responses retry the
          // same token; Apple's revoke endpoint is idempotent.
          const removed = await db.prepare('DELETE FROM apple_sign_in_tokens WHERE id = ? AND user_id = ?')
            .bind(token.id, userId).run();
          if (!removed.success) throw new Error('revocation cleanup unavailable');
        }
        await appleLock.renew();
      }
    }

    // D1 batch() executes sequentially in one transaction and rolls back on SQL
    // failure. Do not replace this with separate run() calls or catch per table.
    if (appleLock) statements.unshift(appleLock.fence());
    const results = await db.batch<{ status?: string }>(statements);
    if (results.length !== statements.length || results.some(r => !r.success)
        || results.at(-1)?.results?.[0]?.status !== 'deleted') {
      throw new Error('deletion not confirmed');
    }
    return json({ ok: true, message: '账号已停用，约定范围的关联数据已清理' });
  } catch {
    // Do not return SQL details, identifiers, email, or credentials to clients/logs.
    return json({ ok: false, error: '账号删除未能确认完成，请保留登录并稍后重试。' }, 503);
  } finally {
    await appleLock?.release().catch(() => {});
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
