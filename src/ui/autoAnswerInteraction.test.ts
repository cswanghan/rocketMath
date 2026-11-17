// @ts-ignore Test-only Node import; this repository does not install Node typings.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as engine from '../engine';
import { makePack, baseEngineConfig } from '../engine/__fixtures__/packs';
import { classifyOutcome, type StorageAdapter } from '../storage';
import { FLUENCY_XP } from '../practice';
import { createAutoAnswer } from './autoAnswer';

const hooks = vi.hoisted(() => ({ slots: [] as any[], index: 0, effects: [] as (() => void)[] }));
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useRef: (initial: unknown) => hooks.slots[hooks.index++] ??= { current: initial },
  useState: (initial: unknown) => {
    const slot = hooks.slots[hooks.index++] ??= { value: initial };
    return [slot.value, (next: any) => { slot.value = typeof next === 'function' ? next(slot.value) : next; }];
  },
  useReducer: (reducer: any, initial: unknown) => {
    const slot = hooks.slots[hooks.index++] ??= { value: initial };
    return [slot.value, (action: unknown) => { slot.value = reducer(slot.value, action); }];
  },
  useMemo: (calculate: () => unknown) => calculate(),
  useCallback: (callback: unknown) => callback,
  useEffect: (callback: () => any, deps: unknown[]) => {
    const i = hooks.index++; const prior = hooks.slots[i];
    if (!prior || deps.some((d, j) => !Object.is(d, prior.deps[j]))) {
      hooks.slots[i] = { deps };
      hooks.effects.push(() => { prior?.cleanup?.(); hooks.slots[i].cleanup = callback(); });
    }
  },
}));
vi.mock('../track', () => ({ track: vi.fn() }));
vi.mock('./streak', () => ({ CHECKIN_XP: 5, recordCheckIn: () => ({ firstToday: false }) }));
vi.mock('./speech', () => ({ cancel: vi.fn(), isMuted: () => true, sayFact: () => '', setMuted: vi.fn(), speak: vi.fn() }));
import { Play } from './Play';
import { Race } from './Race';
import { useGame } from './useGame';

function cjs(file: string, deps: Record<string, unknown> = {}) {
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', readFileSync(file, 'utf8'))(
    (id: string) => { if (!(id in deps)) throw Error('Unexpected require: ' + id); return deps[id]; }, module, module.exports,
  );
  return module.exports;
}
const miniInteger = cjs('apps/mini/utils/integerInput.js');
const miniAuto = cjs('apps/mini/utils/autoAnswer.js', { './integerInput.js': miniInteger }).createAutoAnswer;
const miniGame = cjs('apps/mini/utils/game.js', {
  '../vendor/engine': engine, '../vendor/practice': { FLUENCY_XP },
  '../vendor/storage/outcome.js': { classifyOutcome },
  './streak.js': { CHECKIN_XP: 5, recordCheckIn: () => ({ firstToday: false }) },
  './trial.js': { bump: () => false }, './track.js': { track: vi.fn() },
}).createGame;
function pack(answer = 12) {
  return makePack([{ trackId: 'test', name: 'Test', enabled: true, levels: [{ level: 'A', new_facts: [
    { id: 'fact', prompt: '6 + 6', answer, learningType: 'fact_recall' },
  ] }] }], { ...baseEngineConfig, milestone_races: { duration_seconds: 3, positions_percent: [50, 100] } });
}
function adapter() {
  return { getStudent: vi.fn(async () => ({ latencyGateMs: 3000 })), getTrackState: vi.fn(async () => undefined),
    putTrackState: vi.fn(), addXp: vi.fn(), appendEvent: vi.fn(), appendMistake: vi.fn(), putRaceResult: vi.fn() };
}
function nodes(node: any): any[] {
  if (node == null || typeof node === 'boolean') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (typeof node !== 'object') return [node];
  if (typeof node.type === 'function') return nodes(node.type(node.props));
  return [node, ...nodes(node.props?.children)];
}
function text(node: any) { return nodes(node).filter(n => typeof n === 'string' || typeof n === 'number').join(''); }
let documentEvents: Map<string, Set<() => void>>;
let windowEvents: Map<string, Set<(e?: any) => void>>;
function eventTarget(listeners: Map<string, Set<any>>) {
  return { addEventListener: (type: string, fn: any) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type)!.add(fn); },
    removeEventListener: (type: string, fn: any) => listeners.get(type)?.delete(fn) };
}
function hide(hidden: boolean) {
  (document as any).hidden = hidden;
  [...(documentEvents.get('visibilitychange') ?? [])].forEach(fn => fn());
}
function unmount() { hooks.slots.forEach(s => s?.cleanup?.()); hooks.slots = []; hooks.effects = []; }
beforeEach(() => {
  hooks.slots = []; hooks.index = 0; hooks.effects = [];
  vi.useFakeTimers(); vi.setSystemTime(10000);
  documentEvents = new Map(); windowEvents = new Map();
  vi.stubGlobal('document', { hidden: false, ...eventTarget(documentEvents) });
  vi.stubGlobal('window', { ...eventTarget(windowEvents), setTimeout, clearTimeout, setInterval, clearInterval });
});
afterEach(() => { unmount(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

for (const [name, create] of [['Web', createAutoAnswer], ['mini', miniAuto]] as const) describe(name + ' cancellable debounce', () => {
  it('waits one second after the last edit, includes sign/zero, and submits only once', () => {
    const submit = vi.fn(); const auto = create({ isCurrent: () => true, submit });
    auto.edit('1', 3); vi.advanceTimersByTime(700); auto.edit('12', 3);
    vi.advanceTimersByTime(999); expect(submit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); auto.flush();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0]).toMatchObject({ value: 12, answeredAt: 10700, promptSeq: 3 });
    auto.edit('-0', 4); vi.advanceTimersByTime(1000); expect(submit.mock.calls[1][0].value).toBe(-0);
  });
  it('empty/minus cancels pending input, backspace and sign restart the delay', () => {
    const submit = vi.fn(); const auto = create({ isCurrent: () => true, submit });
    auto.edit('12', 1); vi.advanceTimersByTime(500); auto.edit('-', 1);
    vi.advanceTimersByTime(1200); expect(submit).not.toHaveBeenCalled();
    auto.edit('-12', 1); vi.advanceTimersByTime(400); auto.edit('-1', 1);
    vi.advanceTimersByTime(999); expect(submit).not.toHaveBeenCalled();
    auto.edit('', 1); vi.advanceTimersByTime(1000); expect(submit).not.toHaveBeenCalled();
  });
  it('rejects a queued obsolete callback and cancels on teardown or changed prompt', () => {
    const queued: (() => void)[] = [];
    const original = setTimeout;
    vi.stubGlobal('setTimeout', (fn: () => void, ms: number) => { queued.push(fn); return original(fn, ms); });
    const submit = vi.fn(); let seq = 1;
    const auto = create({ isCurrent: (a: any) => a.promptSeq === seq, submit });
    auto.edit('1', 1); auto.edit('12', 1); queued[0](); expect(submit).not.toHaveBeenCalled();
    auto.cancel(); queued[1](); expect(submit).not.toHaveBeenCalled();
    auto.edit('12', 1); seq = 2; vi.advanceTimersByTime(1000); expect(submit).not.toHaveBeenCalled();
  });
  it('an old prompt deadline cannot flush the next prompt before its debounce', () => {
    const submit = vi.fn(); const auto = create({ isCurrent: () => true, submit });
    auto.edit('12', 2);
    expect(auto.flush(Infinity, 1)).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0].promptSeq).toBe(2);
  });
});

async function web(kind: 'play' | 'race', answer = 12) {
  const storage = adapter(); const content = pack(answer); let tree: any[] = [];
  const draw = () => {
    hooks.index = 0;
    tree = nodes((kind === 'play' ? Play : Race)({ trackId: 'test', pack: content,
      adapter: storage as unknown as StorageAdapter, studentId: 'child', seed: 1, onExit: unmount }));
    hooks.effects.splice(0).forEach(fn => fn());
  };
  const button = (label: string) => {
    const b = tree.find(n => n.type === 'button' && text(n) === label);
    if (!b) throw Error('Missing ' + label + ': ' + tree.filter(n => n.type === 'button').map(text).join(', '));
    return b;
  };
  draw(); await Promise.resolve(); await Promise.resolve(); draw(); draw();
  if (kind === 'race') { tree.find(n => n.props?.className === 'speed-card').props.onClick(); draw(); draw(); }
  return { storage, draw, button, text: () => tree.filter(n => typeof n === 'string').join(''),
    tap: (label: string) => { button(label).props.onClick(); draw(); } };
}

describe('Web production Play/Race handlers', () => {
  it('automatically grades multi-digit oral answers without a check button or debounce time penalty', async () => {
    const p = await web('play');
    expect(p.text()).not.toContain('✓');
    vi.advanceTimersByTime(500); p.tap('1'); vi.advanceTimersByTime(200); p.tap('2');
    vi.advanceTimersByTime(999); expect(p.storage.appendEvent).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); p.draw();
    expect(p.storage.appendEvent.mock.calls[0][0]).toMatchObject({ value: 12, elapsedMs: 700, outcome: 'hit' });
    expect(p.storage.addXp).toHaveBeenCalledTimes(1);
  });
  it('counts completed input at the oral deadline before a timeout can consume it', async () => {
    const p = await web('play'); vi.advanceTimersByTime(2800); p.tap('1'); p.tap('2');
    vi.advanceTimersByTime(200); p.draw();
    expect(p.storage.appendEvent.mock.calls[0][0]).toMatchObject({ value: 12, elapsedMs: 2800, outcome: 'hit' });
    vi.advanceTimersByTime(800); expect(p.storage.appendEvent).toHaveBeenCalledTimes(1);
  });
  it('preserves the earlier valid input if a late key arrives before the deadline callback', async () => {
    const p = await web('play'); vi.setSystemTime(12800); p.tap('1'); p.tap('2');
    vi.setSystemTime(13100); p.tap('3'); p.draw();
    expect(p.storage.appendEvent.mock.calls[0][0]).toMatchObject({ value: 12, elapsedMs: 2800 });
    expect(p.storage.appendEvent).toHaveBeenCalledTimes(1);
  });
  it('cancels on background/exit; resume gives the same fact fresh timing and input', async () => {
    const p = await web('play', -12); p.tap('+/−'); p.tap('1'); p.tap('2');
    hide(true); p.draw(); vi.advanceTimersByTime(4000); expect(p.storage.appendEvent).not.toHaveBeenCalled();
    hide(false); p.draw(); p.draw();
    p.tap('+/−'); p.tap('1'); p.tap('2'); vi.advanceTimersByTime(1000); p.draw();
    expect(p.storage.appendEvent.mock.calls[0][0]).toMatchObject({ value: -12, elapsedMs: 0, outcome: 'hit' });
    p.tap('1'); p.tap('← 返回'); vi.advanceTimersByTime(5000);
    expect(p.storage.appendEvent).toHaveBeenCalledTimes(1);
  });
  it('pauses oral timing when the window loses focus while the document remains visible', async () => {
    const p = await web('play'); p.tap('1'); p.tap('2');
    [...(windowEvents.get('blur') ?? [])].forEach(fn => fn()); p.draw();
    vi.advanceTimersByTime(4000); expect(document.hidden).toBe(false);
    expect(p.storage.appendEvent).not.toHaveBeenCalled();
    [...(windowEvents.get('focus') ?? [])].forEach(fn => fn()); p.draw(); p.draw();
    p.tap('1'); p.tap('2'); vi.advanceTimersByTime(1000);
    expect(p.storage.appendEvent.mock.calls[0][0]).toMatchObject({ value: 12, elapsedMs: 0, outcome: 'hit' });
  });
  it('does not extend the answer delay or reaction time for a rejected sixth digit', async () => {
    const p = await web('play', 12345);
    for (const d of '12345') p.tap(d);
    vi.advanceTimersByTime(500); p.tap('6'); vi.advanceTimersByTime(500);
    expect(p.storage.appendEvent.mock.calls[0][0]).toMatchObject({ value: 12345, elapsedMs: 0, outcome: 'hit' });
  });
  it('counts a pre-deadline race answer once, then finishes using real time', async () => {
    const p = await web('race'); vi.advanceTimersByTime(2800); p.tap('1'); p.tap('2');
    vi.advanceTimersByTime(200); p.draw();
    expect(p.storage.appendEvent.mock.calls[0][0]).toMatchObject({ value: 12, elapsedMs: 2800, outcome: 'race' });
    expect(p.storage.putRaceResult.mock.calls[0][0]).toMatchObject({ correctPerMin: 20, durationMs: 3000 });
    vi.advanceTimersByTime(1000); expect(p.storage.putRaceResult).toHaveBeenCalledTimes(1);
  });
  it('rejects race input at the deadline and cancels pending input on background', async () => {
    const p = await web('race'); p.tap('1'); p.tap('2'); hide(true); p.draw();
    vi.advanceTimersByTime(3000); p.draw();
    expect(p.storage.appendEvent).not.toHaveBeenCalled();
    expect(p.storage.putRaceResult.mock.calls[0][0]).toMatchObject({ correctPerMin: 0 });
  });
});

async function mini(kind: 'play' | 'race', answer = 12) {
  const storage = adapter(); const content = pack(answer); let page: any;
  const deps: Record<string, unknown> = {
    '../../../../utils/content.js': { loadGrade: () => ({ pack: content }), getGrade: () => 3 },
    '../../../../utils/family.js': { currentStudentId: () => 'child' },
    '../../../../utils/speech.js': { isMuted: () => true, cancel: vi.fn(), speak: vi.fn(), sayFact: () => '' },
    '../../../../utils/storage.js': { createDefaultAdapter: () => storage },
    '../../../../utils/game.js': { createGame: miniGame }, '../../../../vendor/engine': engine,
    '../../../../utils/integerInput.js': miniInteger, '../../../../utils/autoAnswer.js': { createAutoAnswer: miniAuto },
  };
  new Function('require', 'Page', 'wx', readFileSync(`apps/mini/packages/math/pages/${kind}/${kind}.js`, 'utf8'))(
    (id: string) => { if (!(id in deps)) throw Error(id); return deps[id]; },
    (definition: any) => { page = definition; }, { setNavigationBarTitle: vi.fn(), showToast: vi.fn(), navigateBack: vi.fn() },
  );
  page.setData = (patch: any, cb?: () => void) => { Object.assign(page.data, patch); cb?.(); };
  page.onLoad({ grade: 3, trackId: 'test' }); await Promise.resolve();
  if (kind === 'race') page.onPickSpeed({ currentTarget: { dataset: { seconds: 3 } } });
  return { page, storage, digit: (d: string) => page.onDigit({ currentTarget: { dataset: { d } } }) };
}

describe('mini production game and page handlers', () => {
  for (const kind of ['play', 'race'] as const) it(kind + ' auto-grades after last digit and rejects old timer/submit tokens', async () => {
    const p = await mini(kind, -12); const seq = p.page.game.promptSeq;
    p.page.onToggleSign(); vi.advanceTimersByTime(1100); expect(p.storage.appendEvent).not.toHaveBeenCalled();
    p.digit('1'); vi.advanceTimersByTime(200); p.digit('2'); vi.advanceTimersByTime(1000);
    expect(p.storage.appendEvent.mock.calls[0][0]).toMatchObject({ value: -12, elapsedMs: 1300 });
    p.page.game.submit(-12, { answeredAt: Date.now(), promptSeq: seq });
    expect(p.storage.appendEvent).toHaveBeenCalledTimes(1); p.page.onUnload();
  });
  for (const kind of ['play', 'race'] as const) it(kind + ' deadline consumes the completed input before an obsolete timer', async () => {
    const p = await mini(kind); vi.advanceTimersByTime(2800); p.digit('1'); p.digit('2');
    vi.advanceTimersByTime(200);
    expect(p.storage.appendEvent.mock.calls[0][0]).toMatchObject({ value: 12, elapsedMs: 2800 });
    vi.advanceTimersByTime(800); expect(p.storage.appendEvent).toHaveBeenCalledTimes(1);
    if (kind === 'race') expect(p.storage.putRaceResult.mock.calls[0][0]).toMatchObject({ correctPerMin: 20 });
    p.page.onUnload();
  });
  it('keeps pre-deadline race input when a late editing event beats the timer, and records one result', async () => {
    const p = await mini('race'); vi.setSystemTime(12800); p.digit('1'); p.digit('2');
    vi.setSystemTime(13100); p.digit('3'); p.page.finishRace(13000); p.page.game.next();
    expect(p.storage.appendEvent.mock.calls[0][0]).toMatchObject({ value: 12, elapsedMs: 2800 });
    expect(p.storage.putRaceResult).toHaveBeenCalledTimes(1); p.page.onUnload();
  });
  it('settles immediately when a delayed debounce wins the race against the clock tick', async () => {
    const p = await mini('race'); p.page.stopClock();
    vi.setSystemTime(12900); p.digit('1'); p.digit('2');
    vi.setSystemTime(14000); p.page.autoAnswer.flush();
    expect(p.page.data.mode).toBe('race_result');
    expect(p.storage.appendEvent.mock.calls[0][0]).toMatchObject({ value: 12, elapsedMs: 2900 });
    expect(p.storage.putRaceResult.mock.calls[0][0]).toMatchObject({ correctPerMin: 20 });
    p.page.onUnload();
  });
  for (const kind of ['play', 'race'] as const) it(kind + ' ignores an extra digit beyond the input limit without delaying the answer', async () => {
    const p = await mini(kind, 12345);
    for (const d of '12345') p.digit(d);
    vi.advanceTimersByTime(500); p.digit('6'); vi.advanceTimersByTime(500);
    expect(p.storage.appendEvent.mock.calls[0][0]).toMatchObject({ value: 12345, elapsedMs: 0 });
    p.page.onUnload();
  });
  it('cancels background oral input, resumes the same fact with a fresh token, and cancels unload', async () => {
    const p = await mini('play'); const seq = p.page.game.promptSeq;
    p.digit('1'); p.digit('2'); p.page.onHide(); vi.advanceTimersByTime(4000);
    expect(p.storage.appendEvent).not.toHaveBeenCalled();
    p.page.onShow(); expect(p.page.game.promptSeq).toBe(seq + 1); expect(p.page.data.input).toBe('');
    p.digit('1'); p.digit('2'); p.page.onUnload(); vi.advanceTimersByTime(4000);
    expect(p.storage.appendEvent).not.toHaveBeenCalled();
  });
  it('resumes the absolute race deadline after hiding rather than leaving a frozen race', async () => {
    const p = await mini('race'); p.digit('1'); p.digit('2'); p.page.onHide(); vi.advanceTimersByTime(4000);
    p.page.onShow(); expect(p.page.data.mode).toBe('race_result');
    expect(p.storage.appendEvent).not.toHaveBeenCalled();
    expect(p.storage.putRaceResult.mock.calls[0][0]).toMatchObject({ correctPerMin: 0 });
    p.page.onShow(); expect(p.storage.putRaceResult).toHaveBeenCalledTimes(1); p.page.onUnload();
  });
  it('rejects an exact-deadline first input and keeps ordinary oral timeouts', async () => {
    const race = await mini('race'); vi.setSystemTime(13000); race.digit('1');
    expect(race.storage.appendEvent).not.toHaveBeenCalled(); expect(race.page.data.mode).toBe('race_result'); race.page.onUnload();
    const oral = await mini('play'); vi.advanceTimersByTime(3000);
    expect(oral.storage.appendEvent.mock.calls[0][0]).toMatchObject({ outcome: 'miss' });
    expect(Number.isNaN(oral.storage.appendEvent.mock.calls[0][0].value)).toBe(true); oral.page.onUnload();
  });
});

it('Web binding uses captured answer time, starts the next prompt at real time, and rejects old seq', async () => {
  const storage = adapter(); const content = pack(); let game: ReturnType<typeof useGame>;
  const draw = () => { hooks.index = 0; game = useGame('test', content, storage as unknown as StorageAdapter, 'child', 1); hooks.effects.splice(0).forEach(fn => fn()); };
  draw(); await Promise.resolve(); await Promise.resolve(); draw();
  const seq = game!.promptSeq; vi.setSystemTime(12000);
  game!.submit(12, { answeredAt: 11000, promptSeq: seq }); draw();
  expect(game!.promptStartedAt).toBe(12000);
  game!.submit(12, { answeredAt: 12000, promptSeq: seq });
  game!.timeout(seq);
  expect(storage.appendEvent).toHaveBeenCalledTimes(1);
  expect(storage.appendEvent.mock.calls[0][0].elapsedMs).toBe(1000);
  game!.startRace(3000); draw();
  const raceSeq = game!.promptSeq;
  vi.setSystemTime(15500); game!.submit(12, { answeredAt: 14900, promptSeq: raceSeq }); draw();
  expect(game!.view.mode).toBe('race_result');
  expect(storage.putRaceResult).toHaveBeenCalledTimes(1);
  const old = game!; unmount(); old.submit(12); old.timeout(); old.next();
  expect(storage.appendEvent).toHaveBeenCalledTimes(2);
  expect(storage.putRaceResult).toHaveBeenCalledTimes(1);
});
