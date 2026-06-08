// First-run baseline probe (SPEC §5). ~10 neutral "tap the number you see"
// trials — measures tapping/pointing speed, NOT math. The median response time
// × multiplier (computeLatencyGateMs) becomes this child's latency gate.
import { useCallback, useEffect, useRef, useState } from 'react';
import { computeLatencyGateMs, type ContentPack } from '../engine';
import type { StorageAdapter } from '../storage';
import { Numpad } from './Numpad';

interface Props {
  pack: ContentPack;
  adapter: StorageAdapter;
  studentId: string;
  onDone: (gateMs: number) => void;
}

// deterministic-ish neutral targets 1..9 (no RNG dep needed for a warmup)
function targetAt(i: number): number {
  return ((i * 7 + 3) % 9) + 1;
}

export function Probe({ pack, adapter, studentId, onDone }: Props) {
  const TRIALS = pack.engine_config.individualized_goal.probe_problem_count;
  const [trial, setTrial] = useState(0);
  const timesRef = useRef<number[]>([]);
  const startRef = useRef<number>(Date.now());
  const target = targetAt(trial);

  useEffect(() => {
    startRef.current = Date.now();
  }, [trial]);

  const tap = useCallback(
    (digit: string) => {
      if (Number(digit) !== target) return; // only correct taps count
      timesRef.current.push(Date.now() - startRef.current);
      if (trial + 1 >= TRIALS) {
        const gate = computeLatencyGateMs(timesRef.current, pack.engine_config);
        (async () => {
          const s = (await adapter.getStudent(studentId)) ?? { id: studentId, createdAt: Date.now() };
          await adapter.putStudent({ ...s, latencyGateMs: gate });
          onDone(gate);
        })();
      } else {
        setTrial((t) => t + 1);
      }
    },
    [target, trial, adapter, studentId, onDone],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^[0-9]$/.test(e.key)) tap(e.key);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tap]);

  return (
    <div className="play">
      <div className="probe-head">
        <h2>热身 🖐️</h2>
        <p className="subtitle">按下你看到的数字,越快越好</p>
        <div className="prog">{trial + 1} / {TRIALS}</div>
      </div>
      <div className="stage">
        <div className="prompt probe-target">{target}</div>
        <Numpad onDigit={tap} onClear={() => {}} onEnter={() => {}} />
      </div>
    </div>
  );
}
