// Milestone race: pool = all learned facts, score = correct/min. NO voice
// (App Store lesson §7), no correction loop. The player first picks a speed
// (less time = faster pace = harder); the engine tallies until time runs out.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StorageAdapter } from '../storage';
import { Numpad } from './Numpad';
import { pack } from './pack';
import { useGame } from './useGame';

const SPEEDS = pack.engine_config.milestone_races.speeds ?? [
  { id: 'standard', label: '标准', emoji: '🚀', seconds: pack.engine_config.milestone_races.duration_seconds },
];

function fmtSeconds(s: number): string {
  return s % 60 === 0 ? `${s / 60} 分钟` : `${s} 秒`;
}

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
  const [chosenMs, setChosenMs] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  const { view } = game;

  // kick off the race once a speed is chosen and the engine is ready
  useEffect(() => {
    if (chosenMs !== null && game.ready && !startedRef.current) {
      startedRef.current = true;
      game.startRace(chosenMs);
    }
  }, [game, chosenMs]);

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

  // ---- speed picker (before the race starts) ----
  if (chosenMs === null) {
    return (
      <div className="play">
        <header className="play-head">
          <button className="ghost" onClick={onExit}>
            ← 返回
          </button>
          <span className="phase-badge">🚀 竞速</span>
        </header>
        <div className="speed-pick">
          <h2 className="title">选择速度</h2>
          <p className="subtitle">时间越短,挑战越大 💪</p>
          {SPEEDS.map((s) => (
            <button
              key={s.id}
              className="speed-card"
              onClick={() => {
                setRemaining(s.seconds * 1000);
                setChosenMs(s.seconds * 1000);
              }}
            >
              <span className="speed-emoji">{s.emoji}</span>
              <span className="speed-label">{s.label}</span>
              <span className="speed-time">{fmtSeconds(s.seconds)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const secs = Math.ceil(remaining / 1000);
  const timeLabel = secs >= 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : `${secs}s`;

  return (
    <div className="play">
      <header className="play-head">
        <button className="ghost" onClick={onExit}>
          ← 返回
        </button>
        <div className="status">
          <span className="phase-badge">🚀 竞速</span>
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
