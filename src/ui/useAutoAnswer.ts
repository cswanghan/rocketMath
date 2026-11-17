import { useEffect, useRef, useState } from 'react';
import type { GameApi } from './useGame';
import { createAutoAnswer } from './autoAnswer';

export function useAutoAnswer(game: GameApi, enabled = true, beforeSubmit?: () => void) {
  const [input, setInput] = useState('');
  const inputRef = useRef('');
  const latest = useRef({ game, enabled, beforeSubmit });
  latest.current = { game, enabled, beforeSubmit };
  const controller = useRef<ReturnType<typeof createAutoAnswer>>();
  if (!controller.current) controller.current = createAutoAnswer({
    isCurrent: answer => latest.current.enabled && !document.hidden &&
      latest.current.game.view.mode === 'prompt' && latest.current.game.promptSeq === answer.promptSeq,
    submit: answer => {
      latest.current.beforeSubmit?.();
      latest.current.game.submit(answer.value, answer);
      inputRef.current = ''; setInput('');
    },
  });
  const current = controller.current;
  function reset() { current.cancel(); inputRef.current = ''; setInput(''); }
  useEffect(() => { reset(); }, [game.promptSeq, game.view.mode, enabled]);
  useEffect(() => {
    const hide = () => { if (document.hidden) reset(); };
    const blur = () => reset();
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('blur', blur);
    return () => {
      current.cancel();
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('blur', blur);
    };
  }, []);
  return {
    input,
    edit(change: (input: string) => string) {
      if (!enabled || game.view.mode !== 'prompt' || document.hidden) return;
      const next = change(inputRef.current);
      if (next === inputRef.current) return;
      inputRef.current = next; setInput(next);
      current.edit(next, game.promptSeq);
    },
    flush: current.flush,
    cancel: current.cancel,
    reset,
  };
}
