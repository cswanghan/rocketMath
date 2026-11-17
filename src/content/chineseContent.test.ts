// @ts-ignore Node types are not installed (test-only import).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import legacy from './__fixtures__/chinese_legacy_characters.json';

type Char = { c: string; p: string; word?: string; mean: string; struct: string; rad: string | null; parts: { g: string; l: string; rad?: string }[] };
type Question = { id: string; skill: string; prompt: string; choices: { id: string; label: string }[]; answer: string; evidence: string; explanation: string };
type Passage = { id: string; grade: number; title: string; text: string; questions: Question[] };
const html = readFileSync('public/chinese-characters.html', 'utf8') as string;
const readingHtml = readFileSync('public/chinese-reading.html', 'utf8') as string;
const readingSource = readFileSync('public/chinese-reading-data.js', 'utf8') as string;
const library = new Function('window', readingSource + '\nreturn window.CHINESE_READING_LIBRARY;')({}) as { source: string; passages: Passage[] };
const chars = new Function('return ' + html.match(/const CHARS = (\[[\s\S]*?\n\]);/)![1])() as Char[];
const radicals = new Function('return ' + html.match(/const RAD = (\{[\s\S]*?\n\});/)![1])() as Record<string, { name: string; story: string }>;
const groups = new Function('return ' + html.match(/const GROUPS = (\[[\s\S]*?\n\]);/)![1])() as { rad: string | null }[];

// Execute the production quiz builder with an independent deterministic random source.
function quizFactory() {
  let seed = 17;
  const randomMath = Object.create(Math);
  randomMath.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const code = html.slice(html.indexOf('const PINYINS ='), html.indexOf('function startQuiz()'));
  return new Function('CHARS', 'RAD', 'Math', 'let quiz;\n' + code + '\nreturn { build: () => {buildQuiz(); return quiz;}, makeQ };')(chars, radicals, randomMath);
}

class Element {
  textContent = '';
  className = '';
  hidden = false;
  disabled = false;
  type = '';
  dataset: Record<string, string> = {};
  children: Element[] = [];
  classes = new Set<string>();
  classList = { add: (name: string) => this.classes.add(name) };
  onclick?: () => void;
  constructor(public tag: string) {}
  append(...els: Element[]) { this.children.push(...els); }
  appendChild(el: Element) { this.append(el); }
  replaceChildren() { this.children = []; }
  setAttribute() { /* accessibility attributes do not affect the answer state */ }
  querySelectorAll(tag: string): Element[] {
    return this.children.flatMap(c => [...(c.tag === tag ? [c] : []), ...c.querySelectorAll(tag)]);
  }
}

describe('Chinese learning content', () => {
  it('preserves every legacy character and adds complete cards across all radical groups', () => {
    expect(chars.length).toBeGreaterThanOrEqual(140);
    expect(new Set(chars.map(c => c.c)).size).toBe(chars.length);
    for (const old of legacy) expect(chars.find(c => c.c === old.c)).toMatchObject(old);
    for (const c of chars) {
      expect(c.c).toMatch(/^[\u4e00-\u9fff]$/);
      expect(c.p).toMatch(/^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+$/);
      expect(c.mean.length).toBeGreaterThan(0);
      if (c.word) expect(c.word).toContain(c.c);
      if (c.rad) expect(radicals[c.rad]).toBeDefined();
      if (c.struct !== '独体') expect(c.parts.length).toBeGreaterThanOrEqual(2);
      if (!legacy.some(old => old.c === c.c)) expect(c.word).toBeTruthy();
    }
    for (const rad of Object.keys(radicals)) {
      expect(groups.some(g => g.rad === rad)).toBe(true);
      expect(chars.filter(c => c.rad === rad && c.struct !== '独体').length).toBeGreaterThanOrEqual(5);
    }
  });

  it('keeps reviewed graphic components distinct from lookalikes and regional variants', () => {
    // CNS11643 U+5B9A: ⿱宀𤴓, not 宀+疋. CHISE: 愿 ⿸原心, 宫 ⿱宀吕.
    // The cards describe modern graphic parts, not a guessed etymology.
    const ding = chars.find(c => c.c === '定')!;
    expect(ding.struct).toBe('上下');
    expect(ding.parts.map(p => p.g)).toEqual(['宀', '𤴓']);
    expect(ding.parts.some(p => p.g === '疋')).toBe(false);
    const yuan = chars.find(c => c.c === '愿')!;
    expect(yuan.struct).toBe('半包围');
    expect(yuan.parts.map(p => p.g)).toEqual(['原', '心']);
    const gong = chars.find(c => c.c === '宫')!;
    expect(gong.struct).toBe('上下');
    expect(gong.parts.map(p => p.g)).toEqual(['宀', '吕']);
  });

  it('uses context for polyphonic cards and never emits duplicate or missing quiz choices', () => {
    const factory = quizFactory();
    for (const word of ['给', '好', '绿', '过', '结', '喝', '咳', '吐', '荷', '宁']) {
      const c = chars.find(entry => entry.c === word)!;
      const q = factory.makeQ('pinyin', c);
      expect(q.prompt).toContain(c.word);
      expect(q.correct).toBe(c.p);
      expect(q.explanation).toContain(c.p);
    }
    for (let i = 0; i < 100; i++) {
      const quiz = factory.build();
      expect(new Set(quiz.map((q: { char: string }) => q.char)).size).toBe(10);
      for (const q of quiz) {
        expect(q.opts.length).toBe(4);
        expect(new Set(q.opts).size).toBe(4);
        expect(q.opts.filter((o: string) => o === q.correct).length).toBe(1);
        expect(q.explanation.length).toBeGreaterThan(5);
      }
    }
  });

  it('covers grades 1–6 with original passages, varied skills, evidence and balanced answer positions', () => {
    expect(library.source).toContain('原创');
    expect(library.source).toContain('不对应指定教材');
    expect(readingHtml).not.toContain('Grade-level character data (人教版)');
    const ids = new Set<string>();
    const prompts = new Set<string>();
    const answerCounts = { a: 0, b: 0, c: 0, d: 0 };
    for (let g = 1; g <= 6; g++) expect(library.passages.filter(p => p.grade === g).length).toBeGreaterThanOrEqual(2);
    for (const p of library.passages) {
      expect(ids.has(p.id)).toBe(false); ids.add(p.id);
      expect(p.text.length).toBeGreaterThan(50);
      expect(p.questions.length).toBe(3);
      for (const q of p.questions) {
        expect(ids.has(q.id)).toBe(false); ids.add(q.id);
        expect(prompts.has(q.prompt)).toBe(false); prompts.add(q.prompt);
        expect(q.choices.map(c => c.id)).toEqual(['a', 'b', 'c', 'd']);
        expect(new Set(q.choices.map(c => c.label)).size).toBe(4);
        expect(q.choices.filter(c => c.id === q.answer).length).toBe(1);
        expect(p.text).toContain(q.evidence);
        expect(q.evidence.length).toBeGreaterThan(3);
        expect(q.explanation.length).toBeGreaterThan(15);
        answerCounts[q.answer as keyof typeof answerCounts]++;
      }
    }
    expect(new Set(library.passages.flatMap(p => p.questions.map(q => q.skill))).size).toBeGreaterThanOrEqual(7);
    expect(Math.max(...Object.values(answerCounts))).toBeLessThanOrEqual(12);
    expect(Math.min(...Object.values(answerCounts))).toBeGreaterThanOrEqual(6);
  });

  it('recovers a failed reading asset through Retry without changing the pasted article', () => {
    const list = new Element('div');
    const article = { value: '保留我自己粘贴的文章' };
    const browser: { CHINESE_READING_LIBRARY?: typeof library } = {};
    const scripts: any[] = [];
    let timeoutCallback: (() => void) | undefined;
    const document = {
      getElementById: (id: string) => id === 'readingLibrary' ? list : article,
      createElement: (tag: string) => Object.assign(new Element(tag), { remove: () => {} }),
      head: { appendChild: (script: unknown) => scripts.push(script) },
    };
    const code = readingHtml.slice(readingHtml.indexOf('function renderReadingLibrary()'), readingHtml.indexOf('function chooseReadingPassage(id)'));
    const api = new Function('document', 'window', 'setTimeout', 'clearTimeout',
      'let READING_LIBRARY = null; let readingLibraryLoading = false; const currentGrade = 4; function chooseReadingPassage() {}\n' + code + '\nreturn { renderReadingLibrary, retryReadingLibrary };')(
      document, browser, (callback: () => void) => { timeoutCallback = callback; return 1; }, () => {},
    );
    api.renderReadingLibrary();
    expect(list.children[0].textContent).toContain('未能加载');
    expect(list.children[0].textContent).toContain('仍可粘贴文章');
    list.querySelectorAll('button')[0].onclick!();
    expect(scripts.length).toBe(1);
    expect(scripts[0].src).toMatch(/^\/chinese-reading-data\.js\?retry=/);
    expect(list.querySelectorAll('button')[0].disabled).toBe(true);
    api.retryReadingLibrary();
    expect(scripts.length).toBe(1);
    scripts[0].onerror();
    expect(list.querySelectorAll('button')[0].disabled).toBe(false);
    list.querySelectorAll('button')[0].onclick!();
    expect(scripts.length).toBe(2);
    browser.CHINESE_READING_LIBRARY = library;
    scripts[1].onload();
    expect(list.querySelectorAll('button').map(b => b.textContent)).toEqual(
      library.passages.filter(p => p.grade === 4).map(p => p.title + ' · 3 道理解题'),
    );
    // A stale timeout cannot replace a successfully loaded library with an error.
    timeoutCallback!();
    expect(list.querySelectorAll('button').length).toBe(2);
    expect(article.value).toBe('保留我自己粘贴的文章');
  });

  it('offers Retry again if the reading asset request never completes', () => {
    const list = new Element('div');
    let timeoutCallback: (() => void) | undefined;
    const document = {
      getElementById: () => list,
      createElement: (tag: string) => Object.assign(new Element(tag), { remove: () => {} }),
      head: { appendChild: () => {} },
    };
    const code = readingHtml.slice(readingHtml.indexOf('function renderReadingLibrary()'), readingHtml.indexOf('function chooseReadingPassage(id)'));
    new Function('document', 'window', 'setTimeout', 'clearTimeout',
      'let READING_LIBRARY = null; let readingLibraryLoading = false; const currentGrade = 3; function chooseReadingPassage() {}\n' + code + '\nretryReadingLibrary();')(
      document, {}, (callback: () => void, milliseconds: number) => { expect(milliseconds).toBe(10000); timeoutCallback = callback; return 1; }, () => {},
    );
    timeoutCallback!();
    expect(list.children[0].textContent).toContain('未能加载');
    expect(list.querySelectorAll('button')[0].disabled).toBe(false);
  });

  it('shows correct answer and textual evidence on Web, locks an answered item and clears custom-text questions', () => {
    const panel = new Element('section');
    const document = { getElementById: () => panel, createElement: (tag: string) => new Element(tag) };
    const code = readingHtml.slice(readingHtml.indexOf('function renderReadingQuestions()'), readingHtml.indexOf('function setScope(s)'));
    const render = new Function('document', 'selectedPassage', code + '\nrenderReadingQuestions();');
    const p = library.passages.find(p => p.grade === 4)!;
    render(document, p);
    expect(panel.hidden).toBe(false);
    expect(panel.children.length).toBe(4);
    const section = panel.children[1];
    const buttons = section.querySelectorAll('button');
    const wrong = buttons.find(b => b.dataset.choiceId !== p.questions[0].answer)!;
    wrong.onclick!();
    expect(buttons.every(b => b.disabled)).toBe(true);
    expect(wrong.classes.has('wrong')).toBe(true);
    expect(buttons.find(b => b.dataset.choiceId === p.questions[0].answer)!.classes.has('correct')).toBe(true);
    const feedback = section.children[2].textContent;
    expect(feedback).toContain(p.questions[0].evidence);
    expect(feedback).toContain(p.questions[0].explanation);
    buttons[0].onclick!();
    expect(section.children[2].textContent).toBe(feedback);
    render(document, null);
    expect(panel.hidden).toBe(true);
    expect(panel.children.length).toBe(0);
  });

  it('mini reading selects all grades, grades once, and removes old questions when text is edited', () => {
    let page: any;
    const wx = { getStorageSync: () => [] };
    const deps: Record<string, unknown> = {
      '../../content/chinese.js': { GRADE_CHARS: { 1: '小猫水', 4: '桥' }, READING_LIBRARY: library },
      '../../../../utils/family.js': { currentStudentId: () => 'test' },
      '../../../../utils/track.js': { track: () => {} },
      '../../../../utils/speech.js': { available: () => false, cancel: () => {} },
    };
    new Function('require', 'Page', 'wx', readFileSync('apps/mini/packages/lang/pages/reading/reading.js', 'utf8'))(
      (id: string) => { if (!(id in deps)) throw Error(id); return deps[id]; },
      (definition: unknown) => { page = definition; }, wx,
    );
    page.setData = (data: Record<string, unknown>) => Object.assign(page.data, data);
    page.onLoad();
    for (let grade = 1; grade <= 6; grade++) {
      page.onPickGrade({ currentTarget: { dataset: { g: grade } } });
      expect(page.data.library.length).toBe(2);
      page.onChoosePassage({ currentTarget: { dataset: { id: page.data.library[0].id } } });
      expect(page.data.readingQuestions.length).toBe(3);
      const q = page.selectedPassage.questions[0];
      const event = { currentTarget: { dataset: { qid: q.id, choice: q.answer } } };
      page.onReadingAnswer(event);
      expect(page.data.readingQuestions[0].feedback).toContain('答对了');
      expect(page.data.readingQuestions[0].feedback).toContain(q.evidence);
      const first = page.data.readingQuestions[0].feedback;
      event.currentTarget.dataset.choice = q.choices.find((c: { id: string }) => c.id !== q.answer).id;
      page.onReadingAnswer(event);
      expect(page.data.readingQuestions[0].feedback).toBe(first);
    }
    page.onTextInput({ detail: { value: '自写文章' } });
    expect(page.selectedPassage).toBeNull();
    expect(page.data.readingQuestions).toEqual([]);
  });
});
