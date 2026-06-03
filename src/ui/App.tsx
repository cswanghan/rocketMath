import { useEffect, useRef, useState } from 'react';
import { createDefaultAdapter, LOCAL_STUDENT_ID, type StorageAdapter } from '../storage';
import { KnowledgeMap } from './KnowledgeMap';
import { LockScreen } from './LockScreen';
import { packError } from './pack';
import { ParentDashboard } from './ParentDashboard';
import { ParentGate } from './ParentGate';
import { Play } from './Play';
import { PracticeScreen } from './PracticeScreen';
import { Probe } from './Probe';
import { Race } from './Race';
import { useTimeLock } from './useTimeLock';

type Session =
  | { mode: 'probe'; trackId: string; seed: number }
  | { mode: 'play'; trackId: string; seed: number }
  | { mode: 'race'; trackId: string; seed: number }
  | { mode: 'practice'; setId: string; seed: number };

export function App() {
  const adapterRef = useRef<StorageAdapter | null>(null);
  if (adapterRef.current === null) adapterRef.current = createDefaultAdapter();
  const adapter = adapterRef.current;

  const [session, setSession] = useState<Session | null>(null);
  const [parent, setParent] = useState(false);

  // accumulate active study time during play/race/practice; break runs realtime
  const active =
    session?.mode === 'play' || session?.mode === 'race' || session?.mode === 'practice';
  const { locked, remainingMs } = useTimeLock(active);

  useEffect(() => {
    (async () => {
      const existing = await adapter.getStudent(LOCAL_STUDENT_ID);
      if (!existing) await adapter.putStudent({ id: LOCAL_STUDENT_ID, createdAt: Date.now() });
    })();
  }, [adapter]);

  if (packError) {
    return (
      <div className="error-screen">
        <h2>内容包校验失败</h2>
        <pre>{packError}</pre>
      </div>
    );
  }

  // global guardrail: a forced break blocks everything until it elapses
  if (locked) return <LockScreen remainingMs={remainingMs} />;

  if (parent) {
    return (
      <ParentGate onCancel={() => setParent(false)}>
        <ParentDashboard adapter={adapter} studentId={LOCAL_STUDENT_ID} onExit={() => setParent(false)} />
      </ParentGate>
    );
  }

  const newSeed = () => Date.now() & 0xffffffff;

  if (!session) {
    return (
      <KnowledgeMap
        adapter={adapter}
        studentId={LOCAL_STUDENT_ID}
        onPlay={async (trackId) => {
          // first-ever run with no individualized gate -> baseline probe first
          const student = await adapter.getStudent(LOCAL_STUDENT_ID);
          const mode = student?.latencyGateMs ? 'play' : 'probe';
          setSession({ mode, trackId, seed: newSeed() });
        }}
        onRace={(trackId) => setSession({ mode: 'race', trackId, seed: newSeed() })}
        onPractice={(setId) => setSession({ mode: 'practice', setId, seed: newSeed() })}
        onParent={() => setParent(true)}
      />
    );
  }

  if (session.mode === 'probe') {
    return (
      <Probe
        adapter={adapter}
        studentId={LOCAL_STUDENT_ID}
        onDone={() => setSession({ mode: 'play', trackId: session.trackId, seed: session.seed })}
      />
    );
  }

  if (session.mode === 'race') {
    return (
      <Race
        key={'race' + session.seed}
        trackId={session.trackId}
        adapter={adapter}
        studentId={LOCAL_STUDENT_ID}
        seed={session.seed}
        onExit={() => setSession(null)}
      />
    );
  }

  if (session.mode === 'practice') {
    return (
      <PracticeScreen
        key={'practice' + session.setId + session.seed}
        setId={session.setId}
        adapter={adapter}
        studentId={LOCAL_STUDENT_ID}
        seed={session.seed}
        onExit={() => setSession(null)}
      />
    );
  }

  return (
    <Play
      key={session.trackId + session.seed}
      trackId={session.trackId}
      adapter={adapter}
      studentId={LOCAL_STUDENT_ID}
      seed={session.seed}
      onExit={() => setSession(null)}
    />
  );
}
