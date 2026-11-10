import { describe, expect, it } from 'vitest';
import { ACCOUNT_DELETE_SQL, deletionConfirmError } from './account-deletion';

describe('account deletion', () => {
  it('removes every user-linked table and deletes the user last', () => {
    const joined = ACCOUNT_DELETE_SQL.join('\n');
    for (const table of ['vocab_progress', 'shengzi_notebook', 'children', 'email_log', 'events', 'users']) {
      expect(joined).toContain(table);
    }
    expect(joined).toContain('UPDATE email_campaigns SET created_by = NULL');
    expect(ACCOUNT_DELETE_SQL[ACCOUNT_DELETE_SQL.length - 1]).toMatch(/^DELETE FROM users/);
    expect(joined).not.toContain('auth_codes');
  });

  it('requires the exact current username', () => {
    expect(deletionConfirmError('星芽家长', '星芽家长')).toBeNull();
    expect(deletionConfirmError(' 星芽家长 ', '星芽家长')).toBeNull();
    expect(deletionConfirmError('星芽家长', '别人')).toBe('用户名不一致');
    expect(deletionConfirmError('星芽家长', '')).toBe('请输入用户名以确认');
    expect(deletionConfirmError('星芽家长', 1)).toBe('请输入用户名以确认');
    expect(deletionConfirmError('  ', 'x')).toBe('账号缺少用户名');
  });
});
