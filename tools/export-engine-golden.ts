// 导出「黄金用例」：用真实 content pack 驱动 TS 引擎，逐步记录 event → action + 状态，
// 供 Swift 侧引擎逐步对拍。两端行为不一致时，diff 会精确指到第几步、哪个字段。
//
// 运行：npm run golden
// 产物：ios/XingyaTests/Golden/engine_golden.json（提交进 git，它是两端之间的契约）
//
// 注意：这个文件是**生成器**，不要手改产物 JSON。改引擎行为 → 重跑本脚本 → Swift 测试
// 会立刻告诉你哪些行为变了，是有意还是回归。

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEnabledTracks, validatePack } from '../src/engine/contentPack';
import { initTrackState, step, type StepResult } from '../src/engine/engine';
import { mulberry32 } from '../src/engine/rng';
import type { ContentPack, EngineContext, Event, TrackState } from '../src/engine/types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK_PATH = resolve(ROOT, 'content/grade3_math_fluency_pack.json');
const OUT_PATH = resolve(ROOT, 'ios/XingyaTests/Golden/engine_golden.json');

const GATE_MS = 3000;
const CLOCK_START = 1_700_000_000_000;

// ---- factStats 摘要 ---------------------------------------------------------
// 全量记录 factStats 会让产物膨胀到几十 MB。改为 FNV-1a 32 位摘要：Swift 侧用
// UInt32 同样实现即可逐位复现（Math.imul ↔ &* 溢出语义一致）。

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function digestFactStats(state: TrackState): string {
  const ids = Object.keys(state.factStats).sort();
  const parts = ids.map((id) => {
    const st = state.factStats[id];
    return `${id}:${st.seen}:${st.correct}:${st.lastMissAt ?? -1}`;
  });
  return fnv1a(parts.join('|')).toString(16).padStart(8, '0');
}

// ---- 序列化 -----------------------------------------------------------------

interface StateSnapshot {
  currentLevel: string;
  phase: string;
  streak: number;
  attempts: number;
  errors: number;
  pendingRetest: string | null;
  completedLevels: string[];
  factStatsDigest: string;
  factStatsCount: number;
  race: { endsAt: number; correct: number; answered: number; durationMs: number } | null;
}

function snapshot(s: TrackState): StateSnapshot {
  return {
    currentLevel: s.currentLevel,
    phase: s.phase,
    streak: s.streak,
    attempts: s.attempts,
    errors: s.errors,
    pendingRetest: s.pendingRetest,
    completedLevels: s.completedLevels,
    factStatsDigest: digestFactStats(s),
    factStatsCount: Object.keys(s.factStats).length,
    race: s.race
      ? {
          endsAt: s.race.endsAt,
          correct: s.race.correct,
          answered: s.race.answered,
          durationMs: s.race.durationMs,
        }
      : null,
  };
}

function serializeAction(a: StepResult['action']) {
  switch (a.kind) {
    case 'PROMPT':
    case 'CORRECTION':
      return { kind: a.kind, factId: a.fact.id, prompt: a.fact.prompt, answer: a.fact.answer };
    case 'PHASE_COMPLETE':
      return { kind: a.kind, phase: a.phase };
    case 'LEVEL_COMPLETE':
      return { kind: a.kind, level: a.level };
    case 'RACE_RESULT':
      return { kind: a.kind, correctPerMin: a.correctPerMin };
  }
}

// ---- 答题策略 ---------------------------------------------------------------
// 用独立种子的 RNG 决定「答对 / 答错 / 超时」，保证脚本本身确定性，同时覆盖
// 纠错回路、窗口失败重置、掌握晋级等分支。

type AnswerPlan = { value: number; elapsedMs: number };

/** mixed：高错误率，密集覆盖纠错回路与窗口失败重置。
 *  strong：低错误率，能真正打穿 take_off→orbit→universe→LEVEL_COMPLETE。 */
type Policy = 'mixed' | 'strong';

function planAnswer(correctAnswer: number, roll: number, policy: Policy): AnswerPlan {
  if (policy === 'strong') {
    if (roll < 0.9) return { value: correctAnswer, elapsedMs: 900 }; // 门内答对
    if (roll < 0.95) return { value: correctAnswer, elapsedMs: GATE_MS }; // 卡在门上（边界：<= 算 hit）
    if (roll < 0.98) return { value: correctAnswer + 1, elapsedMs: 1200 }; // 答错
    return { value: correctAnswer, elapsedMs: GATE_MS + 500 }; // 超时（算 miss）
  }
  if (roll < 0.62) return { value: correctAnswer, elapsedMs: 900 };
  if (roll < 0.78) return { value: correctAnswer, elapsedMs: GATE_MS + 500 };
  if (roll < 0.9) return { value: correctAnswer + 1, elapsedMs: 1200 };
  return { value: correctAnswer, elapsedMs: GATE_MS };
}

// ---- 场景驱动 ---------------------------------------------------------------

interface Scenario {
  name: string;
  trackId: string;
  seed: number;
  steps: number;
  policy: Policy;
  raceAtStep?: number;
  raceDurationMs?: number;
}

function runScenario(pack: ContentPack, sc: Scenario) {
  let clock = CLOCK_START;
  const ctx: EngineContext = {
    pack,
    latencyGateMs: GATE_MS,
    now: () => clock,
    rng: mulberry32(sc.seed),
  };
  const policy = mulberry32(sc.seed ^ 0x5f5f5f5f);

  const records: unknown[] = [];
  let state = initTrackState(sc.trackId);
  let res: StepResult = step(state, { type: 'NEXT' }, ctx);
  // now 显式记录：Swift 侧直接回放时钟，避免两端各自推演时钟规则而漂移
  records.push({ i: 0, now: clock, event: { type: 'NEXT' }, action: serializeAction(res.action), state: snapshot(res.state) });

  for (let i = 1; i <= sc.steps; i++) {
    let event: Event;

    if (sc.raceAtStep !== undefined && i === sc.raceAtStep) {
      event = { type: 'START_RACE', durationMs: sc.raceDurationMs ?? 8000 };
    } else if (res.action.kind === 'PROMPT') {
      const fact = res.action.fact;
      const plan = planAnswer(fact.answer, policy(), sc.policy);
      event = { type: 'ANSWER', factId: fact.id, value: plan.value, elapsedMs: plan.elapsedMs };
      clock += plan.elapsedMs;
    } else {
      // CORRECTION / PHASE_COMPLETE / LEVEL_COMPLETE / RACE_RESULT 之后都要 NEXT 取下一题
      event = { type: 'NEXT' };
      clock += 300;
    }

    res = step(res.state, event, ctx);
    records.push({ i, now: clock, event, action: serializeAction(res.action), state: snapshot(res.state) });
  }
  state = res.state;
  return {
    name: sc.name,
    trackId: sc.trackId,
    seed: sc.seed,
    policy: sc.policy,
    gateMs: GATE_MS,
    clockStart: CLOCK_START,
    records,
  };
}

// ---- RNG 黄金值 -------------------------------------------------------------
// 选题依赖 mulberry32 的逐位复现。先单独钉死 RNG，再钉引擎，排障时能一眼分清
// 是「随机数不一致」还是「状态机不一致」。

function rngGolden() {
  return [0, 1, 42, 2147483647, 4294967295].map((seed) => {
    const rng = mulberry32(seed);
    const values: number[] = [];
    for (let i = 0; i < 64; i++) values.push(rng());
    return { seed, values };
  });
}

// ---- main -------------------------------------------------------------------

const pack: ContentPack = JSON.parse(readFileSync(PACK_PATH, 'utf8'));
validatePack(pack);

const tracks = getEnabledTracks(pack);
if (tracks.length === 0) throw new Error('no enabled tracks in pack');

const scenarios: Scenario[] = [];
for (const t of tracks) {
  // mixed：打纠错回路 / 窗口重置；strong：打穿三阶段直到 LEVEL_COMPLETE 与升级
  scenarios.push({ name: `${t.trackId}-mixed-s1`, trackId: t.trackId, seed: 1, steps: 260, policy: 'mixed' });
  scenarios.push({ name: `${t.trackId}-mixed-s42`, trackId: t.trackId, seed: 42, steps: 260, policy: 'mixed' });
  scenarios.push({ name: `${t.trackId}-strong-s3`, trackId: t.trackId, seed: 3, steps: 400, policy: 'strong' });
}
// 竞速：在第 40 步进入 race，时钟推进会让它在场景内自然结束并产出 RACE_RESULT
scenarios.push({
  name: `${tracks[0].trackId}-race`,
  trackId: tracks[0].trackId,
  seed: 7,
  steps: 120,
  policy: 'mixed',
  raceAtStep: 40,
  raceDurationMs: 8000,
});

const out = {
  _comment: '由 tools/export-engine-golden.ts 生成，勿手改。改引擎后重跑 npm run golden。',
  packVersion: pack.version,
  packPath: 'content/grade3_math_fluency_pack.json',
  rng: rngGolden(),
  scenarios: scenarios.map((sc) => runScenario(pack, sc)),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(out, null, 1));

const totalRecords = out.scenarios.reduce((n, s) => n + s.records.length, 0);
console.log(`✅ ${OUT_PATH}`);
console.log(`   ${out.scenarios.length} 场景 / ${totalRecords} 步 / RNG ${out.rng.length} 种子`);
