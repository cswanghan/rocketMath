// Milestone race (SPEC §5/§7): 1 minute, pool = all learned facts, score =
// correct/min. NO voice (App Store lesson §7), no correction loop — the engine
// race path just tallies and re-prompts until time runs out.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StorageAdapter } from '../storage';
import { Numpad } from './Numpad';
import { pack } from './pack';
import { useGame } from './useGame';

// race length is data-driven from the content pack (engine_config.milestone_races)
const DURATION_MS = pack.engine_config.milestone_races.duration_seconds * 1000;

interface Props {
  trackId: string;
  adapter: StorageAdapter;
  studentId: string;
  seed: number;
  onExit: () => void;
}

export function Race({ trackId, adapter, studentId, seed, onExit }: Props) {
  const game = useGame(trackId, adapter, studentId, seed);
  const [input, setInput] = useState('');
  const inputRef = useRef('');
  inputRef.current = input;
  const startedRef = useRef(false);
  const [remaining, setRemaining] = useState(DURATION_MS);

  const { view } = game;

  // kick off the race once the engine is ready
  useEffect(() => {
    if (game.ready && !startedRef.current) {
      startedRef.current = true;
      game.startRace(DURATION_MS);
    }
  }, [game]);

  // global countdown; when it hits 0, flush the engine to a RACE_RESULT
  useEffect(() => {
    if (!startedRef.current || view.mode === 'race_result') return;
    const end = Date.now() + remaining;
    const iv = window.setInterval(() => {
      const left = end - Date.now();
      if (left <= 0) {
        window.clearInterval(iv);
        setRemaining(0);
        game.next(); // now() >= endsAt -> RACE_RESULT
      } else {
        setRemaining(left);
      }
    }, 200);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.mode]);

  const doSubmit = useCallback(() => {
    if (view.mode !== 'prompt') return;
    if (inputRef.current === '') return;
    game.submit(Number(inputRef.current));
    setInput('');
  }, [game, view.mode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (view.mode !== 'prompt') return;
      if (/^[0-9]$/.test(e.key)) setInput((s) => (s + e.key).slice(0, 4));
      else if (e.key === 'Backspace') setInput((s) => s.slice(0, -1));
      else if (e.key === 'Enter') doSubmit();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view.mode, doSubmit]);

  const secs = Math.ceil(remaining / 1000);
  const timeLabel = secs >= 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : `${secs}s`;

  return (
    <div className="play">
      <header className="play-head">
        <button className="ghost" onClick={onExit}>
          ← 返回
        </button>
        <div className="status">
          <span className="phase-badge">🚀 一分钟竞速</span>
          <span className={`prog timer ${secs <= 10 ? 'timer-low' : ''}`}>⏱ {timeLabel}</span>
        </div>
      </header>

      {view.mode === 'prompt' && (
        <div className="stage">
          <div className="prompt">{view.fact.prompt}</div>
          <div className="answer-box">{input || ' '}</div>
          <Numpad
            onDigit={(d) => setInput((s) => (s + d).slice(0, 4))}
            onClear={() => setInput((s) => s.slice(0, -1))}
            onEnter={doSubmit}
          />
        </div>
      )}

      {view.mode === 'race_result' && (
        <div className="overlay">
          <div className="card celebrate">
            <div className="card-title">🏁 时间到！</div>
            <div className="big-fact">
              <b>{Math.round(view.correctPerMin)}</b> 题 / 分钟
            </div>
            <button className="primary" onClick={onExit}>
              回首页
            </button>
          </div>
        </div>
      )}

      {(view.mode === 'loading' || (!startedRef.current && view.mode !== 'race_result')) && (
        <div className="loading">准备竞速…</div>
      )}
    </div>
  );
}
