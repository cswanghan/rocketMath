import { useState } from 'react';
import { Home } from './Home';
import { packError } from './pack';
import { Play } from './Play';

interface Session {
  trackId: string;
  seed: number;
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);

  if (packError) {
    return (
      <div className="error-screen">
        <h2>内容包校验失败</h2>
        <pre>{packError}</pre>
      </div>
    );
  }

  if (!session) {
    // seed is fixed per session; engine RNG stays deterministic within a run.
    return <Home onStart={(trackId) => setSession({ trackId, seed: Date.now() & 0xffffffff })} />;
  }

  return (
    <Play
      key={session.seed}
      trackId={session.trackId}
      seed={session.seed}
      onExit={() => setSession(null)}
    />
  );
}
