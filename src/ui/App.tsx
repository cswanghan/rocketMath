import { useEffect, useRef, useState } from 'react';
import { createDefaultAdapter, LOCAL_STUDENT_ID, type StorageAdapter } from '../storage';
import { ChineseCharacters } from './ChineseCharacters';
import { GradePicker } from './GradePicker';
import { loadGrade, type GradeContent } from './gradeLoader';
import { KnowledgeMap } from './KnowledgeMap';
import { LockScreen } from './LockScreen';
import { ParentDashboard } from './ParentDashboard';
import { ParentGate } from './ParentGate';
import { Play } from './Play';
import { Portal } from './Portal';
import { PracticeScreen } from './PracticeScreen';
import { Probe } from './Probe';
import { Race } from './Race';
import { useTimeLock } from './useTimeLock';
import { UserBar, useAuth } from './UserBar';

type Subject = 'math' | 'chinese';

type Session =
  | { mode: 'probe'; trackId: string; seed: number }
  | { mode: 'play'; trackId: string; seed: number }
  | { mode: 'race'; trackId: string; seed: number }
  | { mode: 'practice'; setId: string; seed: number };

export function App() {
  const adapterRef = useRef<StorageAdapter | null>(null);
  if (adapterRef.current === null) adapterRef.current = createDefaultAdapter();
  const adapter = adapterRef.current;

  const { user, logout, login } = useAuth();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [grade, setGrade] = useState<number | null>(() => {
    const saved = localStorage.getItem('rm.grade');
    return saved ? Number(saved) : null;
  });
  const [content, setContent] = useState<GradeContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [parent, setParent] = useState(false);

  const active =
    session?.mode === 'play' || session?.mode === 'race' || session?.mode === 'practice';
  const { locked, remainingMs } = useTimeLock(active, content?.pack.engine_config);

  useEffect(() => {
    (async () => {
      const existing = await adapter.getStudent(LOCAL_STUDENT_ID);
      if (!existing) await adapter.putStudent({ id: LOCAL_STUDENT_ID, createdAt: Date.now() });
    })();
  }, [adapter]);

  useEffect(() => {
    if (grade === null) { setContent(null); return; }
    localStorage.setItem('rm.grade', String(grade));
    let cancelled = false;
    setLoadError(null);
    loadGrade(grade).then(
      (c) => { if (!cancelled) setContent(c); },
      (e) => { if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e)); },
    );
    return () => { cancelled = true; };
  }, [grade]);

  if (loadError) {
    return (
      <div className="error-screen">
        <h2>内容包加载失败</h2>
        <pre>{loadError}</pre>
        <button onClick={() => { setGrade(null); setLoadError(null); }}>返回选择年级</button>
      </div>
    );
  }

  if (locked) return <LockScreen remainingMs={remainingMs} />;

  if (parent) {
    return (
      <ParentGate onCancel={() => setParent(false)}>
        <ParentDashboard adapter={adapter} studentId={LOCAL_STUDENT_ID} onExit={() => setParent(false)} />
      </ParentGate>
    );
  }

  if (!subject) {
    return (
      <>
        <UserBar user={user} onLogout={logout} onLogin={login} />
        <Portal onSelect={setSubject} />
      </>
    );
  }

  if (subject === 'chinese') {
    return (
      <>
        <UserBar user={user} onLogout={logout} onLogin={login} />
        <ChineseCharacters onBack={() => setSubject(null)} />
      </>
    );
  }

  // Math subject — need grade selection
  if (!grade || !content) {
    return (
      <>
        <UserBar user={user} onLogout={logout} onLogin={login} />
        {grade && !content ? (
          <div className="portal"><p className="portal-subtitle">加载中...</p></div>
        ) : (
          <GradePicker onSelect={setGrade} onBack={() => setSubject(null)} />
        )}
      </>
    );
  }

  const { pack, practicePack, knowledgeMap } = content;
  const newSeed = () => Date.now() & 0xffffffff;

  if (!session) {
    return (
      <>
      <UserBar user={user} onLogout={logout} onLogin={login} />
      <KnowledgeMap
        pack={pack}
        knowledgeMap={knowledgeMap}
        adapter={adapter}
        studentId={LOCAL_STUDENT_ID}
        onPlay={async (trackId) => {
          const student = await adapter.getStudent(LOCAL_STUDENT_ID);
          const mode = student?.latencyGateMs ? 'play' : 'probe';
          setSession({ mode, trackId, seed: newSeed() });
        }}
        onRace={(trackId) => setSession({ mode: 'race', trackId, seed: newSeed() })}
        onPractice={(setId) => setSession({ mode: 'practice', setId, seed: newSeed() })}
        onParent={() => setParent(true)}
        onBack={() => { setGrade(null); setSession(null); }}
      />
      </>
    );
  }

  if (session.mode === 'probe') {
    return (
      <Probe
        pack={pack}
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
        pack={pack}
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
        practicePack={practicePack}
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
      pack={pack}
      adapter={adapter}
      studentId={LOCAL_STUDENT_ID}
      seed={session.seed}
      onExit={() => setSession(null)}
    />
  );
}
