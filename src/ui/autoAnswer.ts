import { parseIntegerInput } from './integerInput';

export const AUTO_ANSWER_DELAY_MS = 1000;
export interface PendingAnswer { value: number; answeredAt: number; promptSeq: number }

// Input scheduling belongs to the UI, not the scoring engine. Keep a token as
// well as clearTimeout: a callback may already be queued when input changes.
export function createAutoAnswer(options: {
  isCurrent: (answer: PendingAnswer) => boolean;
  submit: (answer: PendingAnswer) => void;
}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let version = 0;
  let pending: (PendingAnswer & { version: number }) | undefined;
  function cancel() {
    version += 1;
    clearTimeout(timer); timer = undefined; pending = undefined;
  }
  function consume(answer: typeof pending, deadline = Infinity) {
    if (!answer || answer !== pending || answer.version !== version || answer.answeredAt > deadline) return false;
    const valid = options.isCurrent(answer);
    cancel();
    if (valid) options.submit(answer);
    return valid;
  }
  return {
    cancel,
    edit(input: string, promptSeq: number) {
      cancel();
      const value = parseIntegerInput(input);
      if (value === null) return;
      const answer = { value, answeredAt: Date.now(), promptSeq, version };
      pending = answer;
      timer = setTimeout(() => consume(answer), AUTO_ANSWER_DELAY_MS);
    },
    flush(deadline = Infinity, promptSeq?: number) {
      if (promptSeq !== undefined && pending?.promptSeq !== promptSeq) return false;
      return consume(pending, deadline);
    },
  };
}
