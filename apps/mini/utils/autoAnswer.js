const integerInput = require('./integerInput.js');
const AUTO_ANSWER_DELAY_MS = 1000;

// A version check also rejects callbacks already queued before clearTimeout.
function createAutoAnswer(options) {
  let timer;
  let version = 0;
  let pending;
  function cancel() {
    version += 1;
    clearTimeout(timer); timer = undefined; pending = undefined;
  }
  function consume(answer, deadline = Infinity) {
    if (!answer || answer !== pending || answer.version !== version || answer.answeredAt > deadline) return false;
    const valid = options.isCurrent(answer);
    cancel();
    if (valid) options.submit(answer);
    return valid;
  }
  return {
    cancel,
    edit(input, promptSeq) {
      cancel();
      const value = integerInput.parse(input);
      if (value === null) return;
      const answer = { value, answeredAt: Date.now(), promptSeq, version };
      pending = answer;
      timer = setTimeout(() => consume(answer), AUTO_ANSWER_DELAY_MS);
    },
    flush(deadline = Infinity, promptSeq) {
      if (promptSeq !== undefined && (!pending || pending.promptSeq !== promptSeq)) return false;
      return consume(pending, deadline);
    },
  };
}
module.exports = { createAutoAnswer, AUTO_ANSWER_DELAY_MS };
