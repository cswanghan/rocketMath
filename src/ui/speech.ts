// Thin wrapper over the Web Speech API (SpeechSynthesis), zh-CN. Muting is
// persisted in localStorage. Per SPEC §7: correction voice only appears in the
// learning phases; the race screen never calls this.

const MUTE_KEY = 'rm.muted';

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (muted) cancel();
}

export function cancel(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

export function speak(text: string): void {
  if (isMuted()) return;
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 0.95;
  speechSynthesis.speak(u);
}

/** Turn a fact prompt + answer into spoken Chinese, e.g. "2 乘 5 等于 10". */
export function sayFact(prompt: string, answer: number): string {
  const spoken = prompt.replace('×', '乘').replace('÷', '除以');
  return `${spoken} 等于 ${answer}`;
}
