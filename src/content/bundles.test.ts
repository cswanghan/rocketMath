// @ts-ignore Node types are not installed (test-only import).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
function mini(path: string) {
  const text = readFileSync(path, 'utf8') as string;
  const marker = 'module.exports = ';
  return JSON.parse(text.slice(text.indexOf(marker) + marker.length).trim().replace(/;$/, ''));
}

describe('published content bundle parity', () => {
  it.each([3, 4, 5, 6, 7, 8, 9])('keeps grade %i mini-program content aligned with its source', grade => {
    for (const [source, bundled] of [['math_fluency_pack', 'fluency'], ['knowledge_map', 'map']]) {
      expect(mini(`apps/mini/content/grade${grade}_${bundled}.js`)).toEqual(json(`content/grade${grade}_${source}.json`));
    }
    expect(mini(`apps/mini/packages/math/content/grade${grade}_practice.js`))
      .toEqual(json(`content/grade${grade}_practice_pack.json`));
  });

  it('ships all English questions, corrected choices and explanations to the mini-program', () => {
    expect(mini('apps/mini/content/english_practice.js')).toEqual(json('content/english_practice_pack.json'));
  });

  it('ships the same original Chinese reading passages and answer evidence to both clients', () => {
    const source = readFileSync('public/chinese-reading-data.js', 'utf8');
    const web = new Function('window', source + '\nreturn window.CHINESE_READING_LIBRARY;')({});
    expect(mini('apps/mini/packages/lang/content/chinese.js').READING_LIBRARY).toEqual(web);
  });
});
