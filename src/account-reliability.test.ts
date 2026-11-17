import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureAppleEnvironment, fixtureAppleFetch, fixtureAccountToken } from './test-support/apple-fixture';
import type { AppleEnvironment } from './apple-subscriptions';
import { SQLiteD1 } from './test-support/sqlite-d1';
import { signJWT } from './auth';
import { getRequestUser } from './request-auth';
import { onRequestPost as deleteAccount } from '../functions/api/auth/delete-account';
import { onRequestGet as pull, onRequestPost as sync } from '../functions/api/progress/sync';
import { onRequestPost as track } from '../functions/api/track';

let db: SQLiteD1;
let token: string;
let appleEnv: AppleEnvironment;
// Ephemeral test-only material, never a production credential.
const testSecret = 'unit-test-only';
const snapshot = {
  studentId: 'local', student: { xp: 20, latencyGateMs: 2000, updatedAt: 10 },
  tracks: [{ trackId: 't', payload: '{}', updatedAt: 10 }],
  practices: [{ setId: 'p', bestFirstTryCorrect: 4, total: 5, completedAt: 10 }],
  mistakes: [{ clientKey: 'm', source: 'practice', topicId: 'p', topicTitle: 'math',
    problemId: 'q', prompt: '1+1', yourAnswer: '3', correctAnswer: '2', ts: 1 }],
};
const tables = ['math_student', 'math_track_state', 'math_practice', 'math_mistake'];
function context(method = 'POST', body: unknown = snapshot, credential = token): any {
  return { env: { DB: db, JWT_SECRET: testSecret, ...appleEnv }, request: new Request('https://unit.invalid/api', {
    method, headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  }) };
}
function row(sql: string): any { return db.sqlite.prepare(sql).get(); }
function count(table: string) { return row(`SELECT count(*) AS n FROM ${table}`).n; }

beforeEach(async () => {
  db = new SQLiteD1();
  db.sqlite.exec(`INSERT INTO users (id,username,password,email,phone,google_sub) VALUES
    (1,'a','test-hash','a@example.invalid','test-phone','test-sub'),
    (2,'b','test-hash','b@example.invalid',NULL,NULL)`);
  token = await signJWT({ userId: 1, username: 'stale-name', role: 'admin' }, testSecret);
  appleEnv = await fixtureAppleEnvironment();
  vi.stubGlobal('fetch', fixtureAppleFetch());
  db.sqlite.prepare('INSERT INTO native_subscription_accounts VALUES (?,?)').run(1, fixtureAccountToken);
  db.sqlite.exec("INSERT INTO native_subscription_bindings VALUES (1,'Sandbox','1001')");
});
afterEach(() => { db.sqlite.close(); vi.unstubAllGlobals(); });

describe('atomic account deletion', () => {
  async function seed() {
    expect((await sync(context())).status).toBe(200);
    db.sqlite.exec(`INSERT INTO children (id,parent_id,name) VALUES (10,1,'test');
      INSERT INTO events (user_id,child_id,event) VALUES (1,NULL,'one'),(NULL,10,'child'),(2,NULL,'other'),(NULL,NULL,'anonymous');
      INSERT INTO email_campaigns (id,subject,html,created_by) VALUES (1,'test','test',1);
      INSERT INTO email_log (campaign_id,user_id,email,status) VALUES
        (1,1,'a@example.invalid','sent'),(1,NULL,'A@example.invalid','sent'),
        (1,2,'b@example.invalid','sent'),(1,2,'A@example.invalid','sent');
      INSERT INTO vocab_progress (user_id,word_key,word,topic) VALUES (1,'a','a','test');
      INSERT INTO shengzi_notebook (user_id,data,updated_at) VALUES (1,'[]',1);
      INSERT INTO auth_codes VALUES ('fixture-code','fixture-token','{"id":1}',0,9999999999999);`);
  }
  it('commits the documented cleanup and tombstone, preserving other users and anonymous events', async () => {
    await seed();
    const response = await deleteAccount(context());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(row('SELECT * FROM users WHERE id=1')).toMatchObject({ status: 'deleted', email: null,
      phone: null, google_sub: null, password: '!', role: 'user' });
    for (const table of [...tables, 'children', 'vocab_progress', 'shengzi_notebook', 'auth_codes']) expect(count(table)).toBe(0);
    expect(count('events')).toBe(2);
    expect(count('email_log')).toBe(2);
    // Opaque Apple bindings remain on the tombstone, but approved checks deny use.
    expect(count('native_subscription_accounts')).toBe(1);
    expect(count('native_subscription_bindings')).toBe(1);
    expect(row('SELECT created_by FROM email_campaigns')).toMatchObject({ created_by: null });
    expect(row('SELECT status FROM users WHERE id=2').status).toBe('approved');
    expect((await pull(context('GET'))).status).toBe(401);
    expect((await sync(context())).status).toBe(401);
    expect(count('math_student')).toBe(0);
    // Lost successful responses can be retried, with cleanup repeated.
    expect((await deleteAccount(context())).status).toBe(200);
  });
  it.each(['math_practice', 'users'])('rolls back earlier cleanup if %s fails', async table => {
    await seed();
    db.sqlite.exec(`CREATE TRIGGER fail_cleanup BEFORE ${table === 'users' ? 'UPDATE' : 'DELETE'} ON ${table}
      BEGIN SELECT RAISE(ABORT, 'injected failure'); END;`);
    const response = await deleteAccount(context());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false });
    for (const table of tables) expect(count(table)).toBe(1);
    expect(count('children')).toBe(1);
    expect(count('email_log')).toBe(4);
    expect(row('SELECT status,email FROM users WHERE id=1')).toEqual({ status: 'approved', email: 'a@example.invalid' });
  });
  it('skips optional modules only if schema confirms absence', async () => {
    db.sqlite.exec('DROP TABLE shengzi_notebook; DROP TABLE auth_codes');
    expect((await deleteAccount(context())).status).toBe(200);
  });
  it('fails closed when required native schema is missing', async () => {
    db.sqlite.exec('DROP TABLE math_mistake');
    expect((await deleteAccount(context())).status).toBe(503);
    expect(db.batches).toBe(0);
    expect(row('SELECT status FROM users WHERE id=1').status).toBe('approved');
  });
  it('does not mistake a malformed optional table for a missing table', async () => {
    await seed();
    db.sqlite.exec('ALTER TABLE email_log RENAME COLUMN email TO broken_column');
    expect((await deleteAccount(context())).status).toBe(503);
    expect(count('math_student')).toBe(1);
    expect(row('SELECT status FROM users WHERE id=1').status).toBe('approved');
  });
  it('does not claim success for an unconfirmed batch result', async () => {
    db.batch = async () => [{ success: false, results: [], meta: {} }];
    const response = await deleteAccount(context());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false });
    expect(row('SELECT status FROM users WHERE id=1').status).toBe('approved');
  });
  it('returns explicit failure on a database outage', async () => {
    db.failReads = true;
    expect((await deleteAccount(context())).status).toBe(503);
    expect(db.batches).toBe(0);
  });
});

describe('active account authorization and sync invariants', () => {
  it.each(['deleted', 'softdeleted', 'revoked', 'rejected', 'pending', 'unknown'])('rejects %s on both read and write', async status => {
    db.sqlite.prepare('UPDATE users SET status=? WHERE id=1').run(status);
    expect((await sync(context())).status).toBe(401);
    expect((await pull(context('GET'))).status).toBe(401);
    expect(db.batches).toBe(0);
    expect(count('math_student')).toBe(0);
  });
  it('rejects a missing user and invalid JWT', async () => {
    db.sqlite.exec('DELETE FROM native_subscription_bindings WHERE user_id=1; DELETE FROM native_subscription_accounts WHERE user_id=1');
    db.sqlite.exec('DELETE FROM users WHERE id=1');
    expect((await sync(context())).status).toBe(401);
    expect((await sync(context('POST', snapshot, 'invalid'))).status).toBe(401);
  });
  it('uses the current DB role instead of the token role', async () => {
    const ctx = context();
    expect(await getRequestUser(ctx.request, ctx.env)).toMatchObject({ userId: 1, role: 'user', username: 'a' });
  });
  it('fails closed on status query failure', async () => {
    db.failReads = true;
    expect((await sync(context())).status).toBe(503);
    expect((await pull(context('GET'))).status).toBe(503);
    expect(db.batches).toBe(0);
  });
  it('does not recreate data if deletion wins the race after JWT/status verification', async () => {
    db.beforeBatch = () => db.sqlite.exec("UPDATE users SET status='deleted' WHERE id=1");
    expect((await sync(context())).status).toBe(401);
    for (const table of tables) expect(count(table)).toBe(0);
  });
  it('preserves max XP/best practice, track timestamps and corrected mistakes', async () => {
    expect((await sync(context())).status).toBe(200);
    const second = structuredClone(snapshot);
    second.student.xp = 5;
    second.tracks[0] = { trackId: 't', payload: '{"old":true}', updatedAt: 1 };
    second.practices[0].bestFirstTryCorrect = 1;
    (second.mistakes[0] as any).corrected = true;
    const response = await sync(context('POST', second));
    expect(response.status).toBe(200);
    const result = await response.json() as any;
    expect(result.student.xp).toBe(20);
    expect(result.tracks[0].payload).toBe('{}');
    expect(result.practices[0].bestFirstTryCorrect).toBe(4);
    expect(result.mistakes[0].corrected).toBe(true);
  });
  it('rolls back a partially failed sync', async () => {
    db.sqlite.exec("CREATE TRIGGER fail_sync BEFORE INSERT ON math_practice BEGIN SELECT RAISE(ABORT, 'failure'); END;");
    expect((await sync(context())).status).toBe(503);
    for (const table of tables) expect(count(table)).toBe(0);
  });
  it('does not attribute events to a deleted session via header or beacon fallback', async () => {
    db.sqlite.exec("UPDATE users SET status='deleted' WHERE id=1");
    expect((await track(context('POST', { events: [{ event: 'test' }] }))).status).toBe(401);
    const ctx = context('POST', { token, events: [{ event: 'test' }] });
    ctx.request.headers.delete('Authorization');
    expect((await track(ctx)).status).toBe(401);
    expect(count('events')).toBe(0);
  });
});
