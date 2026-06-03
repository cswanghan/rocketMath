import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { correctText, DIFFICULTY_ORDER, xpForCorrect, type Difficulty, type Problem } from '../practice';
import type { StorageAdapter } from '../storage';
import { getSet } from './practicePack';
import { usePractice, type PView } from './usePractice';

const TIER_LABEL: Record<Difficulty, string> = {
  basic: '基础',
  consolidate: '夯实',
  challenge: '拔高',
};

function StageBar({ tier }: { tier: Difficulty | null }) {
  const activeIdx = tier ? DIFFICULTY_ORDER.indexOf(tier) : 3; // all done when null
  return (
    <div className="stage-bar">
      {DIFFICULTY_ORDER.map((d, i) => {
        const state = i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'todo';
        return (
          <div key={d} className={`stage-seg stage-${state}`}>
            {state === 'done' ? '✓ ' : ''}
            {TIER_LABEL[d]}关
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  setId: string;
  adapter: StorageAdapter;
  studentId: string;
  seed: number;
  onExit: () => void;
}

export function PracticeScreen({ setId, adapter, studentId, seed, onExit }: Props) {
  const game = usePractice(setId, adapter, studentId, seed);
  const title = useMemo(() => getSet(setId)?.title ?? '练习', [setId]);
  const { view } = game;

  // input state, reset on each newly presented problem
  const [val, setVal] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  useEffect(() => {
    setVal('');
    setFields({});
  }, [game.seq]);

  const problem = view.mode === 'present' || view.mode === 'wrong' ? view.problem : null;

  const submit = useCallback(() => {
    if (!problem) return;
    if (problem.type === 'fill') {
      if (val.trim() === '') return;
      game.answer({ kind: 'value', value: val });
    } else if (problem.type === 'steps') {
      game.answer({ kind: 'fields', values: fields });
    }
  }, [problem, val, fields, game]);

  // keyboard: Enter submits (input modes) or advances (result modes)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter') return;
      if (view.mode === 'present' || view.mode === 'wrong') submit();
      else if (view.mode === 'correct' || view.mode === 'reveal') game.next();
      else if (view.mode === 'complete') onExit();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view.mode, submit, game, onExit]);

  if (!game.ready) return <div className="play loading">载入中…</div>;

  return (
    <div className="play practice">
      <header className="play-head">
        <button className="ghost" onClick={onExit}>
          ← 返回
        </button>
        <div className="status">
          <span className="prog xp">⭐ {game.sessionXp}</span>
          <span className="phase-badge">{title}</span>
          {view.mode !== 'complete' && (
            <span className="prog">
              第 {Math.min(game.position, game.total)}/{game.total} 题
            </span>
          )}
        </div>
      </header>

      {view.mode !== 'complete' && <StageBar tier={game.tier} />}

      {(view.mode === 'present' || view.mode === 'wrong') && (
        <ProblemView
          problem={view.problem}
          wrong={view.mode === 'wrong'}
          val={val}
          setVal={setVal}
          fields={fields}
          setFields={setFields}
          onSubmit={submit}
          onChoice={(choiceId) => game.answer({ kind: 'choice', choiceId })}
        />
      )}

      {(view.mode === 'correct' || view.mode === 'reveal') && (
        <>
          <div className="stage">
            <Prompt problem={view.problem} />
          </div>
          <FeedbackBar view={view} onNext={game.next} />
        </>
      )}

      {view.mode === 'complete' && (
        <div className="overlay">
          <div className="card celebrate">
            <div className="card-title">🎉 这组练习完成！</div>
            <div className="big-fact">
              一次答对 <b>{view.firstTryCorrect}</b> / {view.total}
            </div>
            <button className="primary" onClick={onExit}>
              回知识地图
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProblemView({
  problem,
  wrong,
  val,
  setVal,
  fields,
  setFields,
  onSubmit,
  onChoice,
}: {
  problem: Problem;
  wrong: boolean;
  val: string;
  setVal: (v: string) => void;
  fields: Record<string, string>;
  setFields: (f: Record<string, string>) => void;
  onSubmit: () => void;
  onChoice: (choiceId: string) => void;
}) {
  return (
    <div className="stage">
      <Prompt problem={problem} />

      {wrong && problem.hint && <div className="hint wrong-hint">💡 {problem.hint}</div>}

      {problem.type === 'fill' && (
        <>
          <input
            className="fill-input"
            inputMode="numeric"
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
            placeholder="?"
          />
          <button className="primary" onClick={onSubmit}>
            提交
          </button>
        </>
      )}

      {problem.type === 'steps' && (
        <>
          <div className="fields">
            {problem.fields?.map((f) => (
              <label key={f.id} className="field">
                <span className="field-label">{f.label}</span>
                <input
                  className="fill-input small"
                  inputMode="numeric"
                  value={fields[f.id] ?? ''}
                  onChange={(e) => setFields({ ...fields, [f.id]: e.target.value.replace(/[^\d]/g, '').slice(0, 4) })}
                  placeholder="?"
                />
              </label>
            ))}
          </div>
          <button className="primary" onClick={onSubmit}>
            提交
          </button>
        </>
      )}

      {problem.type === 'mc' && (
        <div className="choices">
          {problem.choices?.map((c) => (
            <button key={c.id} className="choice" onClick={() => onChoice(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 竖式 prompts (contain the box bar) need monospace alignment; everything else
// is prose / mc and must wrap normally instead of overflowing.
function Prompt({ problem }: { problem: Problem }) {
  return problem.prompt.includes('─') ? (
    <pre className="problem-prompt">{problem.prompt}</pre>
  ) : (
    <div className="problem-text">{problem.prompt}</div>
  );
}

// Duolingo-style outburst of stars on a correct answer (CSS-animated, no deps).
function StarBurst() {
  const stars = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const dx = Math.round(Math.cos(a) * 70);
    const dy = Math.round(Math.sin(a) * 70);
    return (
      <span key={i} className="star" style={{ ['--dx']: `${dx}px`, ['--dy']: `${dy}px` } as CSSProperties}>
        ⭐
      </span>
    );
  });
  return <span className="star-burst">{stars}</span>;
}

// Inline bottom feedback bar (no modal). Green for correct with a star/XP
// animation; amber for a revealed answer.
function FeedbackBar({
  view,
  onNext,
}: {
  view: Extract<PView, { mode: 'correct' } | { mode: 'reveal' }>;
  onNext: () => void;
}) {
  const correct = view.mode === 'correct';
  const p = view.problem;
  const firstTry = view.mode === 'correct' && view.firstTry;
  const xp = correct ? xpForCorrect(p.difficulty, firstTry) : 0;
  return (
    <div className={`feedback-bar ${correct ? 'fb-correct' : 'fb-wrong'}`}>
      <div className="fb-content">
        {correct ? (
          <div className="fb-text">
            <div className="fb-title">🎉 答对了！</div>
            <div className="xp-burst">
              <StarBurst />
              <span className="xp-pop">+{xp} ⭐{firstTry ? ' 翻倍' : ''}</span>
            </div>
          </div>
        ) : (
          <div className="fb-text">
            <div className="fb-title">正确答案:{correctText(p)}</div>
            {p.explanation && <div className="fb-hint">{p.explanation}</div>}
          </div>
        )}
        <button className="primary fb-next" onClick={onNext}>
          继续
        </button>
      </div>
    </div>
  );
}
