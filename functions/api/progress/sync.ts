import type { Database, PagesHandler, PreparedStatement } from '../../../src/server-types';
// GET  /api/progress/sync?studentId=local  — 拉取云端进度
// POST /api/progress/sync                   — 推送本地进度（与云端 last-write-wins 合并后回写）
// Native math sync: approved account + freshly verified Apple monthly membership.
// No Web/mini-program caller found in this repository; no platform-header bypass.

import { getRequestUser } from '../../../src/request-auth';
import { requireNativeMember, membershipFailure } from '../../../src/native-membership';
import type { MembershipEnvironment } from '../../../src/native-membership';

type Env = MembershipEnvironment;

interface StudentPayload {
  xp?: number;
  latencyGateMs?: number | null;
  updatedAt?: number;
}

interface TrackPayload {
  trackId: string;
  payload: string; // JSON string of TrackState
  updatedAt: number;
}

interface PracticePayload {
  setId: string;
  bestFirstTryCorrect: number;
  total: number;
  completedAt: number;
}

interface MistakePayload {
  clientKey: string;
  source: string;
  topicId: string;
  topicTitle: string;
  problemId: string;
  prompt: string;
  difficulty?: string | null;
  yourAnswer: string;
  correctAnswer: string;
  elapsedMs?: number | null;
  slow?: boolean;
  ts: number;
  corrected?: boolean;
}

interface SyncBody {
  studentId?: string;
  student?: StudentPayload;
  tracks?: TrackPayload[];
  practices?: PracticePayload[];
  mistakes?: MistakePayload[];
}

export const onRequestGet: PagesHandler<Env> = async (context) => {
  try {
    const user = await requireNativeMember(context.request, context.env);
    const url = new URL(context.request.url);
    const studentId = sanitizeStudentId(url.searchParams.get('studentId') || 'local');
    const data = await loadAll(context.env.DB, user.userId, studentId);
    if (!await getRequestUser(context.request, context.env)) return json({ error: '账号不可用' }, 401);
    return json({ studentId, ...data, syncedAt: Date.now() });
  } catch (error) {
    return membershipFailure(error);
  }
};

export const onRequestPost: PagesHandler<Env> = async (context) => {
  try {
    const user = await requireNativeMember(context.request, context.env);
    let body: SyncBody;
    try {
      body = await context.request.json() as SyncBody;
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('bad body');
    } catch {
      return json({ error: 'bad json' }, 400);
    }
    const studentId = sanitizeStudentId(body.studentId || 'local');
    const userId = user.userId as number;
    const db = context.env.DB;
    const statements: PreparedStatement[] = [];
    // Every write checks status inside the write transaction, closing the race
    // where deletion commits after the request's initial authentication.
    const active = "EXISTS (SELECT 1 FROM users WHERE id = ? AND status = 'approved')";
    if (body.student) {
      const xp = Math.max(0, Math.floor(body.student.xp ?? 0));
      const at = Math.max(0, Math.floor(body.student.updatedAt ?? Date.now()));
      statements.push(db.prepare(`INSERT INTO math_student (user_id, student_id, xp, latency_gate_ms, updated_at)
        SELECT ?, ?, ?, ?, ? WHERE ${active}
        ON CONFLICT(user_id, student_id) DO UPDATE SET
          xp = max(math_student.xp, excluded.xp),
          latency_gate_ms = CASE WHEN excluded.updated_at >= math_student.updated_at
            THEN coalesce(excluded.latency_gate_ms, math_student.latency_gate_ms)
            ELSE coalesce(math_student.latency_gate_ms, excluded.latency_gate_ms) END,
          updated_at = max(math_student.updated_at, excluded.updated_at)
      `).bind(userId, studentId, xp, body.student.latencyGateMs ?? null, at, userId));
    }
    for (const t of (body.tracks || []).slice(0, 200)) {
      if (!t.trackId || !t.payload) continue;
      statements.push(db.prepare(`INSERT INTO math_track_state (user_id, student_id, track_id, payload, updated_at)
        SELECT ?, ?, ?, ?, ? WHERE ${active}
        ON CONFLICT(user_id, student_id, track_id) DO UPDATE SET
          payload = excluded.payload, updated_at = excluded.updated_at
        WHERE excluded.updated_at >= math_track_state.updated_at
      `).bind(userId, studentId, t.trackId, t.payload, Math.max(0, Math.floor(t.updatedAt || 0)), userId));
    }
    for (const p of (body.practices || []).slice(0, 500)) {
      if (!p.setId) continue;
      statements.push(db.prepare(`INSERT INTO math_practice (user_id, student_id, set_id, best_first_try, total, completed_at)
        SELECT ?, ?, ?, ?, ?, ? WHERE ${active}
        ON CONFLICT(user_id, student_id, set_id) DO UPDATE SET
          best_first_try = excluded.best_first_try, total = excluded.total, completed_at = excluded.completed_at
        WHERE excluded.best_first_try > math_practice.best_first_try
      `).bind(userId, studentId, p.setId, Math.max(0, Math.floor(p.bestFirstTryCorrect || 0)),
        Math.max(0, Math.floor(p.total || 0)), Math.max(0, Math.floor(p.completedAt || 0)), userId));
    }
    for (const m of (body.mistakes || []).slice(0, 1000)) {
      if (!m.clientKey || !m.problemId) continue;
      statements.push(db.prepare(`INSERT INTO math_mistake (
        user_id, student_id, client_key, source, topic_id, topic_title, problem_id,
        prompt, difficulty, your_answer, correct_answer, elapsed_ms, slow, ts, corrected)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${active}
        ON CONFLICT(user_id, student_id, client_key) DO UPDATE SET
          corrected = max(math_mistake.corrected, excluded.corrected)
      `).bind(userId, studentId, m.clientKey.slice(0, 200), m.source || 'practice', m.topicId || '',
        m.topicTitle || '', m.problemId, m.prompt || '', m.difficulty ?? null, m.yourAnswer || '',
        m.correctAnswer || '', m.elapsedMs ?? null, m.slow ? 1 : 0, Math.floor(m.ts || 0),
        m.corrected ? 1 : 0, userId));
    }
    if (statements.length) {
      const results = await db.batch(statements);
      if (results.some(r => !r.success)) throw new Error('sync failed');
    }
    const data = await loadAll(db, userId, studentId);
    if (!await getRequestUser(context.request, context.env)) return json({ error: '账号不可用' }, 401);
    return json({ studentId, ...data, syncedAt: Date.now() });
  } catch (error) {
    return membershipFailure(error);
  }
};

async function loadAll(db: Database, userId: number, studentId: string) {
  const student = await db
    .prepare('SELECT xp, latency_gate_ms, updated_at FROM math_student WHERE user_id = ? AND student_id = ?')
    .bind(userId, studentId)
    .first<{ xp: number; latency_gate_ms: number | null; updated_at: number }>();

  const tracks = await db
    .prepare(
      'SELECT track_id, payload, updated_at FROM math_track_state WHERE user_id = ? AND student_id = ?',
    )
    .bind(userId, studentId)
    .all<{ track_id: string; payload: string; updated_at: number }>();

  const practices = await db
    .prepare(
      'SELECT set_id, best_first_try, total, completed_at FROM math_practice WHERE user_id = ? AND student_id = ?',
    )
    .bind(userId, studentId)
    .all<{ set_id: string; best_first_try: number; total: number; completed_at: number }>();

  const mistakes = await db
    .prepare(
      `SELECT client_key, source, topic_id, topic_title, problem_id, prompt, difficulty,
              your_answer, correct_answer, elapsed_ms, slow, ts, corrected
       FROM math_mistake WHERE user_id = ? AND student_id = ?
       ORDER BY ts DESC LIMIT 1000`,
    )
    .bind(userId, studentId)
    .all<any>();

  return {
    student: student
      ? {
          xp: student.xp,
          latencyGateMs: student.latency_gate_ms,
          updatedAt: student.updated_at,
        }
      : { xp: 0, latencyGateMs: null, updatedAt: 0 },
    tracks: (tracks.results || []).map((t) => ({
      trackId: t.track_id,
      payload: t.payload,
      updatedAt: t.updated_at,
    })),
    practices: (practices.results || []).map((p) => ({
      setId: p.set_id,
      bestFirstTryCorrect: p.best_first_try,
      total: p.total,
      completedAt: p.completed_at,
    })),
    mistakes: (mistakes.results || []).map((m) => ({
      clientKey: m.client_key,
      source: m.source,
      topicId: m.topic_id,
      topicTitle: m.topic_title,
      problemId: m.problem_id,
      prompt: m.prompt,
      difficulty: m.difficulty,
      yourAnswer: m.your_answer,
      correctAnswer: m.correct_answer,
      elapsedMs: m.elapsed_ms,
      slow: Boolean(m.slow),
      ts: m.ts,
      corrected: Boolean(m.corrected),
    })),
  };
}

function sanitizeStudentId(raw: string): string {
  const s = raw.trim().slice(0, 64);
  if (!s || !/^[a-zA-Z0-9_.-]+$/.test(s)) return 'local';
  return s;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
