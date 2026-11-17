// @ts-ignore Node types are not installed (test-only import).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Reading = { index: number; char: string; pinyin: string; word: string };
type Passage = { id: string; grade: number; text: string; readings: Reading[] };
const source = readFileSync('public/chinese-reading-data.js', 'utf8');
const library = new Function('window', source + '\nreturn window.CHINESE_READING_LIBRARY;')({}) as { passages: Passage[] };
const html = readFileSync('public/chinese-reading.html', 'utf8') as string;
const passage = (id: string) => library.passages.find(p => p.id === id)!;

// Run the production helpers with deliberately wrong single-character defaults.
// This catches a regression back to a global character cache, even if cnchar changes.
function webReader(offline = false) {
  const cnchar = { spell: (char: string) => ({ 场: 'Cháng', 还: 'Hái', 空: 'Kōng', 重: 'Zhòng', 处: 'Chù', 长: 'Cháng' }[char] || char) };
  const code = html.slice(html.indexOf('function getPinyin(ch)'), html.indexOf('function startReading()'));
  return new Function('window', 'cnchar', `let articleReadings = [], foundChars = [];
    ${code}
    return {
      prepare(text, passage) {
        articleReadings = getArticleReadings(text, passage);
        foundChars = collectReadingCharacters(articleReadings, new Set(text));
        return { occurrences: articleReadings, chars: foundChars };
      }, detail: readingDetail
    };`)(offline ? {} : { cnchar }, cnchar);
}

function atWord(p: Passage, word: string, offset: number) {
  const start = p.text.indexOf(word);
  expect(start, `${p.id}: ${word}`).toBeGreaterThanOrEqual(0);
  return start + offset;
}

function miniReader() {
  let page: any;
  const stored: Record<string, unknown> = {};
  const spoken: string[] = [];
  // Keep all characters selectable so the test focuses on reading handlers,
  // independently of the grade's current/cumulative reference-character scope.
  const gradeChars = Object.fromEntries([1, 2, 3, 4, 5, 6].map(g => [g, library.passages.map(p => p.text).join('')]));
  const deps: Record<string, unknown> = {
    '../../content/chinese.js': { GRADE_CHARS: gradeChars, READING_LIBRARY: library },
    '../../../../utils/family.js': { currentStudentId: () => 'pronunciation-test' },
    '../../../../utils/track.js': { track: () => {} },
    '../../../../utils/speech.js': { available: () => true, cancel: () => {}, speak: (text: string) => spoken.push(text) },
  };
  new Function('require', 'Page', 'wx', readFileSync('apps/mini/packages/lang/pages/reading/reading.js', 'utf8'))(
    (id: string) => { if (!(id in deps)) throw Error(id); return deps[id]; },
    (definition: unknown) => { page = definition; },
    { getStorageSync: (key: string) => stored[key], setStorageSync: (key: string, value: unknown) => { stored[key] = value; } },
  );
  page.setData = (updates: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(updates)) {
      const path = key.split('.');
      let target = page.data;
      for (const segment of path.slice(0, -1)) target = target[segment];
      target[path[path.length - 1]] = value;
    }
  };
  page.onLoad();
  const open = (char: string, index?: number) => page.onOpenChar({ currentTarget: { dataset: { c: char, index } } });
  const choose = (id: string) => {
    page.onPickGrade({ currentTarget: { dataset: { g: passage(id).grade } } });
    page.onChoosePassage({ currentTarget: { dataset: { id } } });
  };
  return { page, stored, spoken, open, choose };
}

describe('reviewed Chinese readings are scoped to occurrences', () => {
  it('has auditable, aligned readings for every original passage without claiming every character is reviewed', () => {
    expect(library.passages).toHaveLength(12);
    for (const p of library.passages) {
      expect(p.readings.length).toBeGreaterThan(0);
      expect(p.readings.length).toBeLessThan(Array.from(p.text).length / 2);
      expect(new Set(p.readings.map(r => r.index)).size).toBe(p.readings.length);
      for (const r of p.readings) {
        expect(Array.from(p.text)[r.index]).toBe(r.char);
        expect(r.pinyin).toMatch(/^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+$/);
        expect(p.text).toContain(r.word);
        // The cited word must actually cover this occurrence, not just exist elsewhere.
        expect(Array.from({ length: r.word.length }, (_, offset) => p.text.slice(r.index - offset, r.index - offset + r.word.length)).includes(r.word)).toBe(true);
      }
    }
  });

  it.each([
    ['zh_g6_1', '球场', 1, 'chǎng'], ['zh_g6_1', '空地', 0, 'kòng'],
    ['zh_g6_1', '空间', 0, 'kōng'], ['zh_g6_1', '问卷', 1, 'juàn'],
    ['zh_g6_1', '长椅', 0, 'cháng'], ['zh_g6_1', '测量', 1, 'liáng'],
    ['zh_g6_1', '划出', 0, 'huà'], ['zh_g6_2', '处理', 0, 'chǔ'],
    ['zh_g3_2', '长得快', 0, 'zhǎng'], ['zh_g3_2', '量一量', 0, 'liáng'],
    ['zh_g3_2', '种了', 0, 'zhòng'], ['zh_g3_2', '数字', 0, 'shù'],
    ['zh_g4_1', '商量', 1, 'liang'], ['zh_g4_2', '当成', 0, 'dàng'],
    ['zh_g5_1', '饮水处', 2, 'chù'], ['zh_g2_1', '夹进', 0, 'jiā'],
  ])('%s %s uses the reviewed reading %s %s', (id, word, offset, expected) => {
    const p = passage(String(id));
    const reader = webReader();
    const index = atWord(p, String(word), Number(offset));
    const result = reader.prepare(p.text, p);
    expect(result.occurrences[index].pinyin).toBe(expected);
    expect(reader.detail(p.text[index], index)).toEqual({ pinyin: expected, context: `${word}：${expected}` });
  });

  it('distinguishes 还给 / 还说 and 重建 / 重要 while retaining one character identity and total count', () => {
    for (const [id, char, word1, offset1, reading1, word2, offset2, reading2] of [
      ['zh_g2_1', '还', '还给', 0, 'huán', '还说', 0, 'hái'],
      ['zh_g5_2', '重', '重建', 0, 'chóng', '重要', 0, 'zhòng'],
    ] as const) {
      const p = passage(id);
      const reader = webReader();
      const result = reader.prepare(p.text, p);
      expect(reader.detail(char, atWord(p, word1, offset1)).pinyin).toBe(reading1);
      expect(reader.detail(char, atWord(p, word2, offset2)).pinyin).toBe(reading2);
      const cards = result.chars.filter((c: { char: string }) => c.char === char);
      expect(cards).toHaveLength(1);
      expect(cards[0].count).toBe(p.text.split(char).length - 1);
      expect(reader.detail(char).pinyin).toBe(`${reading1} / ${reading2}`);
    }
  });

  it('does not carry a reviewed word into custom text, edited passages, or a mismatched index', () => {
    const p = passage('zh_g6_1');
    const reader = webReader();
    expect(reader.prepare(p.text, p).occurrences[16].pinyin).toBe('chǎng');
    expect(reader.prepare('一场雨', null).occurrences[1]).toMatchObject({ pinyin: 'cháng', reviewed: false });
    expect(reader.prepare(p.text + '自写结尾', p).occurrences[16]).toMatchObject({ pinyin: 'cháng', reviewed: false });
    const invalid = { ...p, readings: [{ index: 16, char: '还', word: '还给', pinyin: 'huán' }] };
    expect(reader.prepare(p.text, invalid).occurrences[16]).toMatchObject({ pinyin: 'cháng', reviewed: false });
  });

  it('retains reviewed pinyin when the external automatic dictionary is unavailable', () => {
    const p = passage('zh_g6_1');
    const result = webReader(true).prepare(p.text, p);
    expect(result.occurrences.filter((r: { char: string }) => r.char === '场').map((r: { pinyin: string }) => r.pinyin)).toEqual(['chǎng', 'chǎng']);
    expect(result.occurrences[0]).toMatchObject({ pinyin: '', reviewed: false });
  });

  it('mini handlers display and speak the selected occurrence, preserving master records and indices', () => {
    const { page, stored, spoken, open, choose } = miniReader();
    choose('zh_g2_1');
    const p = passage('zh_g2_1');
    const returned = atWord(p, '还给', 0);
    const also = atWord(p, '还说', 0);
    open('还', returned);
    expect(page.data.detail).toMatchObject({ char: '还', pinyin: 'huán', context: '还给：huán' });
    expect(spoken.at(-1)).toBe('还给');
    page.onToggleMastered();
    expect(stored['rm.reading_mastered.pronunciation-test']).toEqual(['还']);
    expect(page.data.segments.find((s: { index: number }) => s.index === returned)).toMatchObject({ c: '还', index: returned, mastered: true });
    open('还', also);
    expect(page.data.detail.pinyin).toBe('hái');
    open('还');
    expect(page.data.detail.pinyin).toBe('huán / hái');
    expect(spoken.at(-1)).toBe('还给，还说');
    choose('zh_g6_1');
    open('场', 16);
    expect(page.data.detail).toMatchObject({ pinyin: 'chǎng', context: '球场：chǎng' });
    page.onTextInput({ detail: { value: '一场雨' } });
    page.onStart();
    open('场', 1);
    expect(page.data.detail).toMatchObject({ pinyin: '', context: '', speechText: '场' });
    expect(spoken.at(-1)).toBe('场');
  });

  it('mini generated content includes exactly the browser-reviewed readings', () => {
    const mini = { exports: {} as { READING_LIBRARY?: unknown } };
    new Function('module', readFileSync('apps/mini/packages/lang/content/chinese.js', 'utf8'))(mini);
    expect(mini.exports.READING_LIBRARY).toEqual(library);
  });
});
