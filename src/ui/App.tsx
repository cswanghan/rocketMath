import { useEffect, useRef, useState } from 'react';
import { createDefaultAdapter, LOCAL_STUDENT_ID, type StorageAdapter } from '../storage';
import { Home } from './Home';
import { packError } from './pack';
import { Play } from './Play';

interface Session {
  trackId: string;
  seed: number;
}

export function App() {
  const adapterRef = useRef<StorageAdapter | null>(null);
  if (adapterRef.current === null) adapterRef.current = createDefaultAdapter();
  const adapter = adapterRef.current;

  const [session, setSession] = useState<Session | null>(null);

  // ensure the local student row exists
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

  if (!session) {
    return (
      <Home
        adapter={adapter}
        studentId={LOCAL_STUDENT_ID}
        onStart={(trackId) => setSession({ trackId, seed: Date.now() & 0xffffffff })}
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
