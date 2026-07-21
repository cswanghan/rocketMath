// 导出 Practice 引擎的黄金用例：用真实 practice pack 驱动 TS practiceStep，逐步记录
// event → action + 状态，供 Swift 侧逐步对拍。洗牌顺序依赖 mulberry32，两端必须逐位一致。
//
// 运行：npm run golden:practice
// 产物：ios/XingyaTests/Golden/practice_golden.json（提交进 git，两端契约）

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from '../src/engine/rng';
import { practiceInit, practiceStep, type PracticeResult } from '../src/practice/engine';
import { checkAnswer } from '../src/practice/check';
import type {
  PracticePack,
  PracticeContext,
  PracticeEvent,
  PracticeState,
  Problem,
  ProblemSet,
  Response,
} from '../src/practice/types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK_PATH = resolve(ROOT, 'content/grade3_practice_pack.json');
const OUT_PATH = resolve(ROOT, 'ios/XingyaTests/Golden/practice_golden.json');
const CLOCK = 1_700_000_000_000;

function serializeAction(a: PracticeResult['action']) {
  switch (a.kind) {
    case 'PRESENT':
      return { kind: a.kind, problemId: a.problem.id };
    case 'CORRECT':
      return { kind: a.kind, problemId: a.problem.id, firstTry: a.firstTry };
    case 'WRONG':
      return { kind: a.kind, problemId: a.problem.id, tries: a.tries };
    case 'REVEAL':
      return { kind: a.kind, problemId: a.problem.id };
    case 'SET_COMPLETE':
      return { kind: a.kind, firstTryCorrect: a.firstTryCorrect, total: a.total };
  }
}

function snapshot(s: PracticeState) {
  return {
    index: s.index,
    tries: s.tries,
    firstTryCorrect: s.firstTryCorrect,
    status: s.status,
    order: s.order, // 全量记录：洗牌顺序是对拍的核心，必须逐位一致
  };
}

// ---- 作答策略 ---------------------------------------------------------------
// 用独立 RNG 决定「一次答对 / 先错后对 / 错到揭示」，覆盖 CORRECT/WRONG/REVEAL 分支。

function correctResponse(p: Problem): Response {
  switch (p.type) {
    case 'mc': {
      const right = p.choices?.find((c) => c.correct);
      return { kind: 'choice', choiceId: right?.id ?? p.choices?.[0]?.id ?? 'a' };
    }
    case 'fill':
      return { kind: 'value', value: String(p.answer ?? '') };
    case 'steps': {
      const values: Record<string, string> = {};
      (p.fields ?? []).forEach((f, i) => {
        values[f.id || `f${i}`] = String(f.answer);
      });
      return { kind: 'fields', values };
    }
  }
}

function wrongResponse(p: Problem): Response {
  switch (p.type) {
    case 'mc': {
      const bad = p.choices?.find((c) => !c.correct);
      return { kind: 'choice', choiceId: bad?.id ?? 'zzz' };
    }
    case 'fill':
      return { kind: 'value', value: '__nope__' };
    case 'steps':
      return { kind: 'fields', values: {} };
  }
}

function planForProblem(roll: number): 'first' | 'retry' | 'reveal' {
  if (roll < 0.6) return 'first'; // 一次答对
  if (roll < 0.85) return 'retry'; // 先错一次再对
  return 'reveal'; // 一直错到揭示
}

function runScenario(set: ProblemSet, seed: number) {
  const ctx: PracticeContext = { set, rng: mulberry32(seed), now: () => CLOCK };
  const policy = mulberry32(seed ^ 0x1234_5678);

  const records: unknown[] = [];
  let state = practiceInit(set, ctx.rng);
  let res: PracticeResult = practiceStep(state, { type: 'NEXT' }, ctx);
  records.push({ i: 0, event: { type: 'NEXT' }, action: serializeAction(res.action), state: snapshot(res.state) });

  let i = 1;
  const maxSteps = set.problems.length * 6 + 10;
  while (i < maxSteps && res.action.kind !== 'SET_COMPLETE') {
    let event: PracticeEvent;
    if (res.action.kind === 'PRESENT') {
      const problem = res.action.problem;
      const plan = planForProblem(policy());
      if (plan === 'first') {
        event = { type: 'ANSWER', response: correctResponse(problem) };
      } else {
        // 先错：这一步答错，下一轮（仍是同题的 WRONG 后）再走
        event = { type: 'ANSWER', response: wrongResponse(problem) };
      }
    } else if (res.action.kind === 'WRONG') {
      // 错一次后：retry 计划答对，reveal 计划继续错
      const problem = res.action.problem;
      const plan = planForProblem(policy());
      event = { type: 'ANSWER', response: plan === 'reveal' ? wrongResponse(problem) : correctResponse(problem) };
    } else {
      // CORRECT / REVEAL 之后 → NEXT 取下一题
      event = { type: 'NEXT' };
    }
    res = practiceStep(res.state, event, ctx);
    records.push({ i, event: eventTag(event), action: serializeAction(res.action), state: snapshot(res.state) });
    i++;
  }
  return { name: `${set.id}-seed${seed}`, setId: set.id, seed, records };
}

// event 里 response 太大，只记类型标签（Swift 侧按 action 复现即可）
function eventTag(e: PracticeEvent) {
  if (e.type === 'NEXT') return { type: 'NEXT' };
  return { type: 'ANSWER', responseKind: e.response.kind };
}

const pack: PracticePack = JSON.parse(readFileSync(PACK_PATH, 'utf8'));
// 抽有代表性的题集：竖式(steps)、有 basic/consolidate/challenge 三档的、mc 多的
const pickIds = ['add_column', 'div_remainder', pack.sets[pack.sets.length - 1].id];
const chosen = pack.sets.filter((s, idx) => pickIds.includes(s.id) || idx < 6);

const scenarios = chosen.flatMap((set) => [runScenario(set, 1), runScenario(set, 42)]);

const out = {
  _comment: '由 tools/export-practice-golden.ts 生成，勿手改。改引擎后重跑 npm run golden:practice。',
  packVersion: pack.version,
  packPath: 'content/grade3_practice_pack.json',
  scenarios,
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(out, null, 1));

const total = scenarios.reduce((n, s) => n + s.records.length, 0);
const kinds: Record<string, number> = {};
for (const s of scenarios) for (const r of s.records) {
  const k = (r as { action: { kind: string } }).action.kind;
  kinds[k] = (kinds[k] ?? 0) + 1;
}
console.log(`✅ ${OUT_PATH}`);
console.log(`   ${scenarios.length} 场景 / ${total} 步`, kinds);
