// 口算答题循环 —— Web 端 src/ui/useGame.ts 的小程序移植。
//
// 那边是 React hook, 这里是一个可订阅对象: 页面 onLoad 时 createGame(), 在
// onChange 里 setData。职责完全一致 ——
//   · 注入 now()/rng(), 测量 elapsedMs, 让引擎保持纯函数
//   · 每步之后持久化快照 + 追加事件日志
//   · 答对给经验、答错记错题本、当天首次答题记打卡
//
// 引擎本身 (vendor/engine) 一行没改, 是从 src/engine 编译来的同一份代码。

const {
  factById,
  getTrack,
  initTrackState,
  mulberry32,
  step,
} = require('../vendor/engine');
const { FLUENCY_XP } = require('../vendor/practice');
const { classifyOutcome } = require('../vendor/storage/outcome.js');
const { CHECKIN_XP, recordCheckIn } = require('./streak.js');
const trial = require('./trial.js');
const track = require('./track.js');

function viewOf(action, pendingRetest) {
  switch (action.kind) {
    case 'PROMPT':
      return { mode: 'prompt', fact: action.fact, isRetest: pendingRetest === action.fact.id };
    case 'CORRECTION':
      return { mode: 'correction', fact: action.fact };
    case 'PHASE_COMPLETE':
      return { mode: 'phase_done', phase: action.phase };
    case 'LEVEL_COMPLETE':
      return { mode: 'level_done', level: action.level };
    case 'RACE_RESULT':
      return { mode: 'race_result', correctPerMin: action.correctPerMin };
    default:
      return { mode: 'loading' };
  }
}

/**
 * @param {object} opts
 * @param {string} opts.trackId
 * @param {object} opts.pack       流畅度 content pack
 * @param {object} opts.adapter    StorageAdapter
 * @param {string} opts.studentId
 * @param {number} opts.seed       可复现的随机种子
 * @param {number} [opts.gateMsOverride]  探针页用: 强制时限
 * @param {(api) => void} opts.onChange   每次状态变化回调, 页面在这里 setData
 * @param {() => void} [opts.onTrialBlocked] 免费体验用尽
 */
function createGame(opts) {
  const { trackId, pack, adapter, studentId, seed, onChange } = opts;

  let ctx = null;
  let game = null; // { state, action }
  let startAt = 0;
  let promptSeq = 0;
  let sessionXp = 0;
  const missedFacts = {};
  let destroyed = false;

  const api = {
    ready: false,
    state: null,
    view: { mode: 'loading' },
    latencyGateMs: pack.engine_config.latency_gate_seconds * 1000,
    promptSeq: 0,
    sessionXp: 0,
    submit: submit,
    timeout: timeoutMiss,
    next: next,
    startRace: startRace,
    destroy: () => {
      destroyed = true;
    },
  };

  function publish() {
    if (destroyed) return;
    api.ready = true;
    api.state = game ? game.state : null;
    api.view = game ? viewOf(game.action, game.state.pendingRetest) : { mode: 'loading' };
    api.latencyGateMs = ctx ? ctx.latencyGateMs : api.latencyGateMs;
    api.promptSeq = promptSeq;
    api.sessionXp = sessionXp;
    onChange(api);
  }

  // ---- 启动: 恢复快照并出第一题 ---------------------------------------------
  getTrack(pack, trackId); // trackId 非法时尽早抛错
  Promise.all([adapter.getStudent(studentId), adapter.getTrackState(studentId, trackId)]).then(
    ([student, saved]) => {
      if (destroyed) return;
      const gate =
        opts.gateMsOverride ||
        (student && student.latencyGateMs) ||
        pack.engine_config.latency_gate_seconds * 1000;
      ctx = { pack: pack, latencyGateMs: gate, now: () => Date.now(), rng: mulberry32(seed) };
      game = step(saved || initTrackState(trackId), { type: 'NEXT' }, ctx);
      startAt = ctx.now();
      promptSeq = 1;
      publish();
    },
  );

  // ---- 派发 ------------------------------------------------------------------
  function dispatch(event) {
    if (!ctx || !game || destroyed) return;
    const prev = game.state;
    const res = step(prev, event, ctx);
    game = res;
    if (res.action.kind === 'PROMPT') {
      startAt = ctx.now();
      promptSeq += 1;
    }

    if (event.type === 'ANSWER') {
      const ci = recordCheckIn(studentId);
      if (ci.firstToday) adapter.addXp(studentId, CHECKIN_XP);

      const outcome = classifyOutcome(prev, res.action);
      if (outcome === 'hit') {
        sessionXp += FLUENCY_XP;
        adapter.addXp(studentId, FLUENCY_XP);
      }

      // 错题本: 每个 fact 每个会话只记一次, 免得同一题刷屏
      if ((outcome === 'miss' || outcome === 'retest_fail') && !missedFacts[event.factId]) {
        missedFacts[event.factId] = true;
        const t = getTrack(pack, prev.trackId);
        const fact = factById(t, event.factId);
        if (fact) {
          adapter.appendMistake({
            studentId: studentId,
            source: 'fluency',
            topicId: prev.trackId,
            topicTitle: t.name,
            problemId: fact.id,
            prompt: fact.prompt,
            yourAnswer: isNaN(event.value) ? '超时未答' : String(event.value),
            correctAnswer: String(fact.answer),
            elapsedMs: event.elapsedMs,
            ts: ctx.now(),
            corrected: false,
          });
        }
      }

      adapter.appendEvent({
        studentId: studentId,
        trackId: trackId,
        ts: ctx.now(),
        level: prev.currentLevel,
        phase: prev.phase,
        factId: event.factId,
        value: event.value,
        elapsedMs: event.elapsedMs,
        outcome: outcome,
      });
      track.track('fluency_answer', {
        trackId: trackId,
        level: prev.currentLevel,
        phase: prev.phase,
        outcome: outcome,
        ms: event.elapsedMs,
      });

      // 免费体验计数 (竞速不计, 那是已解锁内容的加餐)
      if (!prev.race && opts.onTrialBlocked && trial.bump('math')) {
        opts.onTrialBlocked();
      }
    }

    if (res.action.kind === 'LEVEL_COMPLETE') {
      track.track('fluency_level_done', { trackId: trackId, level: prev.currentLevel });
    }
    if (res.action.kind === 'RACE_RESULT') {
      track.track('race_result', {
        trackId: trackId,
        level: prev.currentLevel,
        correctPerMin: res.action.correctPerMin,
      });
      adapter.putRaceResult({
        studentId: studentId,
        trackId: trackId,
        level: prev.currentLevel,
        correctPerMin: res.action.correctPerMin,
        durationMs: (prev.race && prev.race.durationMs) || 0,
        ts: ctx.now(),
      });
    }

    adapter.putTrackState(studentId, trackId, res.state);
    publish();
  }

  function submit(value) {
    if (!game) return;
    const action = game.action;
    const factId = action.kind === 'PROMPT' || action.kind === 'CORRECTION' ? action.fact.id : '';
    dispatch({ type: 'ANSWER', factId: factId, value: value, elapsedMs: ctx.now() - startAt });
  }

  /** 倒计时环走完 —— 记为一次超时未答。 */
  function timeoutMiss() {
    if (!game || game.action.kind !== 'PROMPT') return;
    dispatch({
      type: 'ANSWER',
      factId: game.action.fact.id,
      value: NaN,
      elapsedMs: ctx.latencyGateMs + 1,
    });
  }

  function next() {
    dispatch({ type: 'NEXT' });
  }

  function startRace(durationMs) {
    dispatch({ type: 'START_RACE', durationMs: durationMs });
  }

  return api;
}

module.exports = { createGame, viewOf };
