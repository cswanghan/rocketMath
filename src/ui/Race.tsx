// Milestone race: pool = all learned facts, score = correct/min. NO voice
// (App Store lesson §7), no correction loop. The player first picks a speed
// (less time = faster pace = harder); the engine tallies until time runs out.
import { useEffect, useMemo, useRef, useState } from 'react';
import { getTrack, type ContentPack } from '../engine';
import type { StorageAdapter } from '../storage';
import { Numpad } from './Numpad';
import { useGame } from './useGame';
import { useAutoAnswer } from './useAutoAnswer';
import { appendIntegerDigit, toggleIntegerSign } from './integerInput';

function fmtSeconds(s: number): string {
  return s % 60 === 0 ? `${s / 60} 分钟` : `${s} 秒`;
}

interface Props {
  trackId: string;
  pack: ContentPack;
  adapter: StorageAdapter;
  studentId: string;
  seed: number;
  onExit: () => void;
}

export function Race({ trackId, pack, adapter, studentId, seed, onExit }: Props) {
  const game = useGame(trackId, pack, adapter, studentId, seed);
  const SPEEDS = useMemo(() => pack.engine_config.milestone_races.speeds ?? [
    { id: 'standard', label: '标准', emoji: '🚀', seconds: pack.engine_config.milestone_races.duration_seconds },
  ], [pack]);
  const startedRef = useRef(false);
  const [chosenMs, setChosenMs] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const auto = useAutoAnswer(game, chosenMs !== null);

  const { view } = game;
  const signed = getTrack(pack, trackId).levels.some(l => l.new_facts.some(f => f.answer < 0));

  // kick off the race once a speed is chosen and the engine is ready
  useEffect(() => {
    if (chosenMs !== null && game.ready && !startedRef.current) {
      startedRef.current = true;
      game.startRace(chosenMs);
    }
  }, [game, chosenMs]);

  // Race time remains absolute, including time in the background. At the
  // deadline, a completed input from before endsAt is counted before settling.
  const endsAt = game.state?.race?.endsAt;
  useEffect(() => {
    if (endsAt === undefined || view.mode === 'race_result') return;
    let finished = false;
    const tick = () => {
      if (finished) return;
      const left = endsAt - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        finished = true;
        auto.flush(endsAt - 1);
        game.next();
      }
    };
    tick();
    const iv = window.setInterval(tick, 200);
    return () => { finished = true; window.clearInterval(iv); };
  }, [endsAt, view.mode]);

  const edit = (change: (input: string) => string) => {
    if (endsAt === undefined || view.mode !== 'prompt') return;
    if (Date.now() >= endsAt) {
      auto.flush(endsAt - 1);
      game.next();
      return;
    }
    auto.edit(change);
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (view.mode !== 'prompt') return;
      if (/^[0-9]$/.test(e.key)) edit((s) => appendIntegerDigit(s, e.key));
      else if (e.key === '-' && signed) edit(toggleIntegerSign);
      else if (e.key === 'Backspace') edit((s) => s.slice(0, -1));
      else if (e.key === 'Enter') auto.flush();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view.mode, game, signed, endsAt]);

  // ---- speed picker (before the race starts) ----
  if (chosenMs === null) {
    return (
      <div className="play">
        <header className="play-head">
          <button className="ghost" onClick={() => { auto.cancel(); onExit(); }}>
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
        <button className="ghost" onClick={() => { auto.cancel(); onExit(); }}>
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
          <div className="answer-box">{auto.input || ' '}</div>
          <div className="hint">停止输入约 1 秒后自动判断</div>
          <Numpad
            onDigit={(d) => edit((s) => appendIntegerDigit(s, d))}
            onToggleSign={signed ? () => edit(toggleIntegerSign) : undefined}
            onClear={() => edit((s) => s.slice(0, -1))}
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
            <button className="primary" onClick={() => { auto.cancel(); onExit(); }}>
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
