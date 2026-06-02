import { useEffect, useRef, useState } from 'react';
import { createDefaultAdapter, LOCAL_STUDENT_ID, type StorageAdapter } from '../storage';
import { Home } from './Home';
import { packError } from './pack';
import { Play } from './Play';
import { Probe } from './Probe';
import { Race } from './Race';

type Session =
  | { mode: 'probe'; trackId: string; seed: number }
  | { mode: 'play'; trackId: string; seed: number }
  | { mode: 'race'; trackId: string; seed: number };

export function App() {
  const adapterRef = useRef<StorageAdapter | null>(null);
  if (adapterRef.current === null) adapterRef.current = createDefaultAdapter();
  const adapter = adapterRef.current;

  const [session, setSession] = useState<Session | null>(null);

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

  const newSeed = () => Date.now() & 0xffffffff;

  if (!session) {
    return (
      <Home
        adapter={adapter}
        studentId={LOCAL_STUDENT_ID}
        onStart={async (trackId) => {
          // first-ever run with no individualized gate -> baseline probe first
          const student = await adapter.getStudent(LOCAL_STUDENT_ID);
          const mode = student?.latencyGateMs ? 'play' : 'probe';
          setSession({ mode, trackId, seed: newSeed() });
        }}
        onRace={(trackId) => setSession({ mode: 'race', trackId, seed: newSeed() })}
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
