// Server-side account deletion plan. Statements run in this order so rows that
// point at users are removed before the user row. Anonymous events (user_id
// IS NULL) are not matched. One-time Google auth_codes have no user column.

export const ACCOUNT_DELETE_SQL = [
  'DELETE FROM vocab_progress WHERE user_id = ?',
  'DELETE FROM shengzi_notebook WHERE user_id = ?',
  'DELETE FROM children WHERE parent_id = ?',
  'DELETE FROM email_log WHERE user_id = ?',
  'UPDATE email_campaigns SET created_by = NULL WHERE created_by = ?',
  'DELETE FROM events WHERE user_id = ?',
  'DELETE FROM users WHERE id = ?',
] as const;

/** Null when the typed username matches the account. Otherwise a message for the client. */
export function deletionConfirmError(accountUsername: string, typed: unknown): string | null {
  const want = accountUsername.trim();
  const got = typeof typed === 'string' ? typed.trim() : '';
  if (!want) return '账号缺少用户名';
  if (!got) return '请输入用户名以确认';
  if (got !== want) return '用户名不一致';
  return null;
}
