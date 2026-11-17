// Input editing only; scoring and progression remain in the existing engine.
export function appendIntegerDigit(input: string, digit: string, maxDigits = 5): string {
  if (!/^\d$/.test(digit) || !/^-?\d*$/.test(input)) return input;
  return input.replace('-', '').length < maxDigits ? input + digit : input;
}

export function toggleIntegerSign(input: string): string {
  return input.startsWith('-') ? input.slice(1) : '-' + input;
}

export function parseIntegerInput(input: string): number | null {
  if (!/^-?\d+$/.test(input)) return null;
  const value = Number(input);
  return Number.isSafeInteger(value) ? value : null;
}
