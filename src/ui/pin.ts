// Parent-area PIN. This is a kid-deterrent, NOT real security — stored in
// localStorage in the clear. Keeps children out of the 错题本 / settings.
const KEY = 'rm.parentPin';

export function hasPin(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function setPin(pin: string): void {
  try {
    localStorage.setItem(KEY, pin);
  } catch {
    /* ignore */
  }
}

export function checkPin(pin: string): boolean {
  try {
    return localStorage.getItem(KEY) === pin;
  } catch {
    return false;
  }
}
