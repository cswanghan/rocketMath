// @ts-ignore Node types are not installed in this repository (test-only import).
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageAdapter } from '../storage';
import type { PracticePack, Problem, ProblemSet } from '../practice';
import { correctText, practiceInit, practiceStep, responseText, xpForCorrect } from '../practice';
import { mulberry32 } from '../engine';

// Lightweight scheduler for the actual production hooks/component handlers. It
// keeps refs and React state across renders and lets us deliver multiple taps
// before a render, reproducing the event race that a screenshot cannot catch.
const hooks = vi.hoisted(() => ({ slots: [] as any[], index: 0, effects: [] as (() => void)[] }));
vi.mock('react', async (original) => ({
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
    const i = hooks.index++;
    const prior = hooks.slots[i];
    if (!prior || deps.some((d, j) => !Object.is(d, prior.deps[j]))) {
      hooks.slots[i] = { deps };
      hooks.effects.push(() => { prior?.cleanup?.(); hooks.slots[i].cleanup = callback(); });
    }
  },
}));
vi.mock('../track', () => ({ track: vi.fn() }));
vi.mock('./streak', () => ({ CHECKIN_XP: 5, recordCheckIn: () => ({ firstToday: false }) }));
import { PracticeScreen } from './PracticeScreen';

const mc: Problem = {
  id: 'mc', type: 'mc', difficulty: 'basic', prompt: 'Choose the correct answer.',
  choices: [{ id: 'a', label: 'Correct choice', correct: true }, { id: 'b', label: 'Wrong choice', correct: false }],
  hint: 'Read the subject.', explanation: 'The singular subject takes this form.',
};
const fill: Problem = { id: 'fill', type: 'fill', difficulty: 'consolidate', prompt: '2 + 3 = ?', answer: 5, hint: 'Count on.', explanation: 'Two plus three is five.' };
const steps: Problem = { id: 'steps', type: 'steps', difficulty: 'basic', prompt: '13 ÷ 4', fields: [{ id: 'q', label: '商', answer: 3 }, { id: 'r', label: '余数', answer: 1 }], explanation: '13 = 4 × 3 + 1.' };
function setOf(problems: Problem[]): ProblemSet { return { id: 'test-set', title: 'Practice', pedagogy: 'concept', maxTries: 2, problems }; }
function adapter() {
  return { getPractice: vi.fn(async () => undefined), addXp: vi.fn(async () => undefined), appendMistake: vi.fn(async () => undefined), putPractice: vi.fn(async (_record: unknown) => undefined) };
}
function treeNodes(node: any): any[] {
  if (node == null || typeof node === 'boolean') return [];
  if (Array.isArray(node)) return node.flatMap(treeNodes);
  if (typeof node !== 'object') return [node];
  if (typeof node.type === 'function') return treeNodes(node.type(node.props));
  return [node, ...treeNodes(node.props?.children)];
}
function nodeText(node: any): string { return treeNodes(node).filter(n => typeof n === 'string' || typeof n === 'number').join(''); }
async function web(problems: Problem[]) {
  const storage = adapter();
  const pack: PracticePack = { version: 'test', sets: [setOf(problems)] };
  let nodes: any[] = [];
  const render = () => {
    hooks.index = 0;
    nodes = treeNodes(PracticeScreen({ setId: 'test-set', practicePack: pack, adapter: storage as unknown as StorageAdapter, studentId: 'child', seed: 1, onExit: () => {} }));
    hooks.effects.splice(0).forEach(effect => effect());
  };
  const button = (label: string) => {
    const result = nodes.find(n => n.type === 'button' && nodeText(n) === label);
    if (!result) throw Error('Missing button ' + label + ': ' + nodes.filter(n => n.type === 'button').map(nodeText).join(', '));
    return result;
  };
  render(); await Promise.resolve(); render();
  return { storage, render, button, nodes: () => nodes, text: () => nodes.filter(n => typeof n === 'string').join('') };
}

beforeEach(() => {
  hooks.slots = []; hooks.effects = []; hooks.index = 0;
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe('Web practice choice handlers', () => {
  it('grades an MC tap immediately with explanation, and queued taps/Continue cannot duplicate XP or skip questions', async () => {
    const page = await web([mc, fill]);
    expect(page.nodes().some(n => n.type === 'button' && nodeText(n) === '提交')).toBe(false);
    const tap = page.button('Correct choice').props.onClick;
    tap(); tap(); page.render();
    expect(page.text()).toContain('答对了');
    expect(page.text()).toContain(mc.explanation);
    expect(page.storage.addXp.mock.calls).toEqual([['child', 10]]);
    expect(page.storage.appendMistake).not.toHaveBeenCalled();
    const next = page.button('继续').props.onClick;
    next(); next(); page.render();
    expect(page.text()).toContain(fill.prompt);
    expect(page.storage.putPractice).not.toHaveBeenCalled();
  });

  it('locks wrong MC feedback until Retry, preserves the retry score, and writes one mistake', async () => {
    const page = await web([mc]);
    const wrong = page.button('Wrong choice').props.onClick;
    const correct = page.button('Correct choice').props.onClick;
    wrong(); wrong(); correct(); page.render();
    expect(page.text()).toContain('这次选错了');
    expect(page.text()).toContain(mc.explanation);
    expect(page.storage.addXp).not.toHaveBeenCalled();
    expect(page.storage.appendMistake).toHaveBeenCalledTimes(1);
    expect(page.nodes().some(n => n.type === 'button' && nodeText(n) === 'Correct choice')).toBe(false);
    page.button('再试一次').props.onClick(); page.render();
    page.button('Correct choice').props.onClick(); page.render();
    expect(page.storage.addXp.mock.calls).toEqual([['child', 5]]);
    page.button('继续').props.onClick(); page.render();
    expect(page.storage.putPractice.mock.calls[0][0]).toMatchObject({ bestFirstTry: 0, total: 1 });
  });

  it('reveals after the original second wrong attempt without counting a double tap twice', async () => {
    const page = await web([mc]);
    page.button('Wrong choice').props.onClick(); page.render();
    page.button('再试一次').props.onClick(); page.render();
    const wrong = page.button('Wrong choice').props.onClick;
    wrong(); wrong(); page.render();
    expect(page.text()).toContain('正确答案：Correct choice');
    expect(page.storage.appendMistake).toHaveBeenCalledTimes(1);
    expect(page.storage.addXp).not.toHaveBeenCalled();
    expect(page.nodes().some(n => n.type === 'button' && nodeText(n) === '再试一次')).toBe(false);
  });

  it('keeps fill and multi-field answers behind explicit Submit', async () => {
    const page = await web([fill]);
    const input = page.nodes().find(n => n.type === 'input');
    input.props.onChange({ target: { value: '5' } }); page.render();
    expect(page.storage.addXp).not.toHaveBeenCalled();
    const submit = page.button('提交').props.onClick;
    submit(); submit(); page.render();
    expect(page.storage.addXp.mock.calls).toEqual([['child', 20]]);
    hooks.slots = []; hooks.effects = []; hooks.index = 0;
    const multi = await web([steps]);
    multi.nodes().filter(n => n.type === 'input')[0].props.onChange({ target: { value: '3' } }); multi.render();
    multi.nodes().filter(n => n.type === 'input')[1].props.onChange({ target: { value: '1' } }); multi.render();
    expect(multi.storage.addXp).not.toHaveBeenCalled();
    multi.button('提交').props.onClick(); multi.render();
    expect(multi.storage.addXp.mock.calls).toEqual([['child', 10]]);
  });
});

async function mini(problems: Problem[]) {
  const storage = adapter();
  const pack = { sets: [setOf(problems)] };
  let page: any;
  const deps: Record<string, unknown> = {
    '../../../../utils/family.js': { currentStudentId: () => 'child' },
    '../../../../utils/track.js': { track: vi.fn() },
    '../../../../utils/storage.js': { createDefaultAdapter: () => storage },
    '../../../../vendor/engine': { mulberry32 },
    '../../../../vendor/practice': { correctText, practiceInit, practiceStep, responseText, xpForCorrect },
    '../../../../utils/streak.js': { CHECKIN_XP: 5, recordCheckIn: () => ({ firstToday: false }) },
    '../../content/index.js': { practicePack: () => pack },
    '../../../../content/index.js': { englishPack: () => pack },
  };
  const wx = { setNavigationBarTitle: () => {}, showToast: () => {} };
  new Function('require', 'Page', 'wx', readFileSync('apps/mini/packages/math/pages/practice/practice.js', 'utf8'))(
    (id: string) => { if (!(id in deps)) throw Error(id); return deps[id]; },
    (definition: unknown) => { page = definition; }, wx,
  );
  page.setData = (patch: Record<string, unknown>) => Object.assign(page.data, patch);
  page.onLoad({ pack: 'english', setId: 'test-set' }); await Promise.resolve();
  return { page, storage };
}
const choice = (id: string) => ({ currentTarget: { dataset: { id } } });

describe('mini practice production handlers', () => {
  it('submits a choice once even if the rendered mode is stale, then locks wrong feedback until Retry', async () => {
    const { page, storage } = await mini([mc]);
    page.onChoice(choice('b'));
    expect(page.data.mode).toBe('retry');
    expect(page.data.explanation).toBe(mc.explanation);
    // A queued event may carry the old visual mode while setData is in flight.
    page.data.mode = 'present';
    page.onChoice(choice('b')); page.onChoice(choice('a'));
    expect(page.game.state.tries).toBe(1);
    expect(storage.appendMistake).toHaveBeenCalledTimes(1);
    expect(storage.addXp).not.toHaveBeenCalled();
    page.onRetry();
    expect(page.data.mode).toBe('wrong');
    page.onChoice(choice('a'));
    page.data.mode = 'present'; page.onChoice(choice('a'));
    expect(storage.addXp.mock.calls).toEqual([['child', 5]]);
    page.render(); expect(page.data.mode).toBe('correct');
    page.onNext(); page.onNext();
    expect(storage.putPractice).toHaveBeenCalledTimes(1);
    expect(storage.putPractice.mock.calls[0][0]).toMatchObject({ bestFirstTry: 0 });
  });

  it('retains maxTries and a single mistake after wrong, Retry, wrong', async () => {
    const { page, storage } = await mini([mc]);
    page.onChoice(choice('b')); page.onRetry(); page.onChoice(choice('b'));
    expect(page.data.mode).toBe('reveal');
    expect(page.data.correctAnswer).toBe('Correct choice');
    expect(page.data.explanation).toBe(mc.explanation);
    expect(page.game.state.tries).toBe(2);
    expect(storage.appendMistake).toHaveBeenCalledTimes(1);
    const wxml = readFileSync('apps/mini/packages/math/pages/practice/practice.wxml', 'utf8') as string;
    expect(wxml).toContain('bindtap="onChoice"');
    expect(wxml).toContain('bindtap="onRetry">再试一次');
  });

  it('keeps text entry separate from Submit and rejects duplicate Next before the next answer', async () => {
    const { page, storage } = await mini([mc, fill]);
    page.onChoice(choice('a')); page.onNext(); page.onNext();
    expect(page.game.action.problem.id).toBe('fill');
    page.onValInput({ detail: { value: '5' } });
    expect(storage.addXp).toHaveBeenCalledTimes(1);
    page.onSubmit(); page.onSubmit();
    expect(storage.addXp.mock.calls).toEqual([['child', 10], ['child', 20]]);
  });
});
