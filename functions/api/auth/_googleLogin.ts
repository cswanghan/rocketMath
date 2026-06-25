// 共享: 由已校验的 Google 凭证 payload 解析/创建用户并签发我们的 JWT。
// popup 模式 (google.ts) 和 redirect 模式 (google-callback.ts) 都用它, 单一来源。
import { signJWT } from '../../../src/auth';
import { randomUsernameSuffix } from '../../../src/google';

const GOOGLE_PASSWORD_PLACEHOLDER = '!google-oauth!';

export interface GooglePayload {
  sub: string;
  email: string;
  name?: string;
}

export type GoogleLoginResult =
  | { ok: true; token: string; user: { id: number; username: string; role: string }; needsUsername: boolean }
  | { ok: false; error: string; status: number };

export async function resolveGoogleLogin(
  db: D1Database,
  payload: GooglePayload,
  jwtSecret: string,
): Promise<GoogleLoginResult> {
  let user = await db
    .prepare('SELECT id, username, role, status, email, google_sub FROM users WHERE google_sub = ?')
    .bind(payload.sub)
    .first<any>();
  let needsUsername = false;

  if (!user) {
    user = await db
      .prepare('SELECT id, username, role, status, email, google_sub FROM users WHERE email = ?')
      .bind(payload.email)
      .first<any>();

    if (user) {
      await db.prepare('UPDATE users SET google_sub = ? WHERE id = ?').bind(payload.sub, user.id).run();
    } else {
      let tempUsername = `google_${randomUsernameSuffix()}`;
      for (let attempt = 0; attempt < 5; attempt++) {
        const clash = await db.prepare('SELECT id FROM users WHERE username = ?').bind(tempUsername).first();
        if (!clash) break;
        tempUsername = `google_${randomUsernameSuffix()}`;
      }
      const insert = await db
        .prepare(
          `INSERT INTO users (username, password, email, google_sub, status, role)
           VALUES (?, ?, ?, ?, 'approved', 'user')`,
        )
        .bind(tempUsername, GOOGLE_PASSWORD_PLACEHOLDER, payload.email, payload.sub)
        .run();
      const newId = (insert.meta as any)?.last_row_id;
      if (!newId) return { ok: false, error: '创建用户失败', status: 500 };
      user = { id: newId, username: tempUsername, role: 'user', status: 'approved' };
      needsUsername = true;
    }
  }

  if (user.status !== 'approved') return { ok: false, error: '账号不可用', status: 403 };

  const token = await signJWT({ userId: user.id, username: user.username, role: user.role }, jwtSecret);
  return {
    ok: true,
    token,
    user: { id: user.id, username: user.username, role: user.role },
    needsUsername,
  };
}
