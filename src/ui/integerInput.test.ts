import { describe, expect, it } from 'vitest';
import { appendIntegerDigit, parseIntegerInput, toggleIntegerSign } from './integerInput';

describe('signed answer input', () => {
  it('lets a learner type a negative answer, correct its sign and backspace it', () => {
    let input = toggleIntegerSign('');
    expect(parseIntegerInput(input)).toBeNull();
    input = appendIntegerDigit(input, '1');
    input = appendIntegerDigit(input, '2');
    expect(parseIntegerInput(input)).toBe(-12);
    expect(parseIntegerInput(toggleIntegerSign(input))).toBe(12);
    expect(parseIntegerInput(input.slice(0, -1))).toBe(-1);
  });
  it('counts digits independently of the optional sign', () => {
    for (const sign of ['', '-']) {
      let input = sign;
      for (const digit of '123456') input = appendIntegerDigit(input, digit);
      expect(input).toBe(sign + '12345');
    }
  });
  it('rejects empty, partial, malformed and unsafe answers without counting a mistake', () => {
    for (const input of ['', '-', '+', '12x', '--2', '1.5', 'NaN', '9007199254740993']) {
      expect(parseIntegerInput(input)).toBeNull();
    }
    expect(appendIntegerDigit('-12', 'x')).toBe('-12');
    expect(parseIntegerInput('0')).toBe(0);
    expect(parseIntegerInput('4096')).toBe(4096);
  });
});
