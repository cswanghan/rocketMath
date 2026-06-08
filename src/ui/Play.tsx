import { useCallback, useEffect, useRef, useState } from 'react';
import { getTrack, type ContentPack } from '../engine';
import type { StorageAdapter } from '../storage';
import { Numpad } from './Numpad';
import { RocketChart } from './RocketChart';
import { cancel, isMuted, sayFact, setMuted as persistMuted, speak } from './speech';
import { useGame } from './useGame';

const PHASE_LABEL: Record<string, string> = {
  take_off: '起飞 Take-Off',
  orbit: '环绕 Orbit',
  universe: '宇宙 Universe',
};

const CIRC = 2 * Math.PI * 54; // ring circumference for r=54

interface Props {
  trackId: string;
  pack: ContentPack;
  adapter: StorageAdapter;
  studentId: string;
  seed: number;
  onExit: () => void;
}

export function Play({ trackId, pack, adapter, studentId, seed, onExit }: Props) {
  const game = useGame(trackId, pack, adapter, studentId, seed);
  const [input, setInput] = useState('');
  const inputRef = useRef('');
  inputRef.current = input;
  const [muted, setMuted] = useState(isMuted());
  const lastSpokeRef = useRef('');

  const mastery = pack.engine_config.mastery;
  const { state, view } = game;
  const levels = getTrack(pack, trackId).levels.map((l) => l.level);

  useEffect(() => {
    setInput('');
  }, [game.promptSeq]);

  // per-prompt countdown -> timeout miss when the ring empties
  useEffect(() => {
    if (view.mode !== 'prompt') return;
    const t = window.setTimeout(() => game.timeout(), game.latencyGateMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.promptSeq, view.mode]);

  // speak the answer during a correction (learning phase only; never in race)
  useEffect(() => {
    if (view.mode !== 'correction') return;
    if (lastSpokeRef.current === view.fact.id) return;
    lastSpokeRef.current = view.fact.id;
    if (!muted) speak(sayFact(view.fact.prompt, view.fact.answer));
  }, [view, muted]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      persistMuted(next);
      if (next) cancel();
      return next;
    });
  }, []);

  const doSubmit = useCallback(() => {
    if (view.mode !== 'prompt') return;
    if (inputRef.current === '') return;
    lastSpokeRef.current = ''; // allow re-speaking on the next correction
    game.submit(Number(inputRef.current));
  }, [game, view.mode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (view.mode === 'prompt') {
        if (/^[0-9]$/.test(e.key)) setInput((s) => (s + e.key).slice(0, 4));
        else if (e.key === 'Backspace') setInput((s) => s.slice(0, -1));
        else if (e.key === 'Enter') doSubmit();
        else if (e.key === 'Escape') setInput('');
      } else if (view.mode !== 'loading' && view.mode !== 'race_result' && e.key === 'Enter') {
        game.next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view.mode, doSubmit, game]);

  if (!game.ready || !state) {
    return <div className="play loading">载入中…</div>;
  }

  return (
    <div className="play">
      <header className="play-head">
        <button className="ghost" onClick={onExit}>
          ← 返回
        </button>
        <div className="status">
          <button className="ghost mute" onClick={toggleMute} title="语音开关">
            {muted ? '🔇' : '🔊'}
          </button>
          <span className="prog xp">⭐ {game.sessionXp}</span>
          <span className="phase-badge">{PHASE_LABEL[state.phase]}</span>
          {state.phase === 'take_off' ? (
            <span className="prog">
              连对 {state.streak}/{mastery.take_off.consecutive_correct_within_gate}
            </span>
          ) : (
            <span className="prog">
              {state.attempts}/{mastery[state.phase].window_attempts} 题 · 错{' '}
              {state.errors}/{mastery[state.phase].max_errors}
            </span>
          )}
        </div>
      </header>

      <RocketChart levels={levels} completed={state.completedLevels} current={state.currentLevel} compact />

      {view.mode === 'prompt' && (
        <div className="stage">
          <div className="ring-wrap">
            <svg className="ring" viewBox="0 0 120 120">
              <circle className="ring-bg" cx="60" cy="60" r="54" />
              <circle
                key={game.promptSeq}
                className="ring-prog"
                cx="60"
                cy="60"
                r="54"
                style={{
                  strokeDasharray: CIRC,
                  ['--circ' as string]: `${CIRC}`,
                  animationDuration: `${game.latencyGateMs}ms`,
                }}
              />
            </svg>
            <div className="prompt">{view.fact.prompt}</div>
          </div>
          {view.isRetest && <div className="retest-hint">再试一次 💪</div>}
          <div className="answer-box">{input || ' '}</div>
          <Numpad
            onDigit={(d) => setInput((s) => (s + d).slice(0, 4))}
            onClear={() => setInput((s) => s.slice(0, -1))}
            onEnter={doSubmit}
          />
        </div>
      )}

      {view.mode === 'correction' && (
        <div className="overlay">
          <div className="card">
            <div className="card-title">再看一遍 👀</div>
            <div className="big-fact">
              {view.fact.prompt} = <b>{view.fact.answer}</b>
            </div>
            {view.fact.learningType === 'pattern' && (
              <div className="hint">先想口诀，再添 0 🔢</div>
            )}
            <button className="primary" onClick={game.next}>
              我记住了，再来一次
            </button>
          </div>
        </div>
      )}

      {view.mode === 'phase_done' && (
        <div className="overlay">
          <div className="card celebrate">
            <div className="card-title">🎉 {PHASE_LABEL[view.phase]} 通过！</div>
            <button className="primary" onClick={game.next}>
              继续
            </button>
          </div>
        </div>
      )}

      {view.mode === 'level_done' && (
        <div className="overlay">
          <div className="card celebrate">
            <div className="card-title">🚀 Level {view.level} 全部通过！</div>
            <button className="primary" onClick={game.next}>
              下一关
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
