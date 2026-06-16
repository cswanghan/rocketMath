import { useEffect, useRef, useState } from 'react';
import { createDefaultAdapter, type StorageAdapter } from '../storage';
import { ChildSwitcher } from './ChildSwitcher';
import { getActiveChild, listChildren, setActiveChild, studentIdFor, type Child } from './family';
import { setTrialSubject, trialExceeded } from '../trial';
import { ChineseCharacters } from './ChineseCharacters';
import { EnglishVocab } from './EnglishVocab';
import { ExamCalendar } from './ExamCalendar';
import { GradePicker } from './GradePicker';
import { loadGrade, type GradeContent } from './gradeLoader';
import { track } from '../track';
import { KnowledgeMap } from './KnowledgeMap';
import { LockScreen } from './LockScreen';
import { ParentDashboard } from './ParentDashboard';
import { ParentGate } from './ParentGate';
import { Play } from './Play';
import { Portal } from './Portal';
import { PracticeScreen } from './PracticeScreen';
import { PrepScreen } from './PrepScreen';
import { Probe } from './Probe';
import { Race } from './Race';
import { loadExamCalendar } from './examLoader';
import { readPrepTarget, savePrepTarget } from './prep';
import { CHECKIN_XP, readStreak, recordCheckIn, takeNewMilestone } from './streak';
import { useTimeLock } from './useTimeLock';
import { UserBar, useAuth } from './UserBar';

type Subject = 'math' | 'chinese' | 'english';

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
  // 考试日历: 跨学科资讯入口, 不走 subject 体系 (无 trial/grade/content 副作用)
  const [examCal, setExamCal] = useState(false);
  // 我要备考: 进入某考试系列的备考清单 (自包含子导航, 不走全局 session)
  const [prepSeriesId, setPrepSeriesId] = useState<string | null>(null);
  // 首页「继续备考」胶囊用的已存目标 (名称从 exam_calendar 解析)
  const [prepResume, setPrepResume] = useState<
    { seriesId: string; name: string; masteredCount?: number; total?: number } | null
  >(null);
  // 每日打卡: 本轮新达成的里程碑天数 (回首页时取一次,庆祝用)
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const [authPromptFor, setAuthPromptFor] = useState<Subject | null>(null);
  // a logged-out user who clicked a subject is sent to login.html?redirect=/?go=<subject>;
  // on return we auto-open that subject once auth is confirmed.
  const [pendingGo] = useState<string | null>(() => new URLSearchParams(location.search).get('go'));
  // 统一 header 的「家长」入口可从其它页(如管理后台)深链进入: /?parent=1
  const [pendingParent] = useState<boolean>(() => new URLSearchParams(location.search).get('parent') === '1');
  // ket-online 导流: /?from=ket → 落英语背单词 + 显示欢迎条 + 埋点来源
  const [pendingFrom] = useState<string | null>(() => new URLSearchParams(location.search).get('from'));
  const [fromKet, setFromKet] = useState<boolean>(() => new URLSearchParams(location.search).get('from') === 'ket');

  // 家庭/孩子档案: 当前在学的孩子 (null = 家长本人)
  const [activeChild, setActiveChildState] = useState<Child | null>(() => getActiveChild());
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const studentId = studentIdFor(activeChild);
  const pickChild = (c: Child | null) => { setActiveChild(c); setActiveChildState(c); };

  const active =
    session?.mode === 'play' || session?.mode === 'race' || session?.mode === 'practice';
  const { locked, remainingMs } = useTimeLock(active, content?.pack.engine_config);

  useEffect(() => {
    (async () => {
      const existing = await adapter.getStudent(studentId);
      if (!existing) await adapter.putStudent({ id: studentId, createdAt: Date.now() });
    })();
  }, [adapter, studentId]);

  // sync the active child to the global tracker (per-child 埋点)
  useEffect(() => { setActiveChild(activeChild); }, [activeChild]);

  // 数学免费体验用完 → /track.js 派发事件,弹登录
  useEffect(() => {
    function onBlock(e: Event) {
      const s = ((e as CustomEvent).detail?.subject || 'math') as Subject;
      setSession(null);
      setSubject(null);
      setAuthPromptFor(s);
    }
    window.addEventListener('rm-trial-block', onBlock);
    return () => window.removeEventListener('rm-trial-block', onBlock);
  }, []);

  // load this parent's children; prompt "谁在学习?" the first time after login
  useEffect(() => {
    if (!user) { setChildrenList([]); return; }
    let alive = true;
    listChildren().then((cs) => {
      if (!alive) return;
      setChildrenList(cs);
      if (activeChild && !cs.some((c) => c.id === activeChild.id)) pickChild(null);
      if (cs.length > 0 && !getActiveChild()) setShowSwitcher(true);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!pendingParent) return;
    setParent(true);
    const u = new URL(location.href);
    u.searchParams.delete('parent');
    window.history.replaceState({}, '', u.pathname + u.search + u.hash);
  }, [pendingParent]);

  useEffect(() => {
    if (!user || !pendingGo) return;
    if (pendingGo === 'math' || pendingGo === 'chinese' || pendingGo === 'english') {
      setSubject(pendingGo);
      setAuthPromptFor(null);
      const u = new URL(location.href);
      u.searchParams.delete('go');
      window.history.replaceState({}, '', u.pathname + u.search + u.hash);
    }
  }, [user, pendingGo]);

  // ket-online 导流入站: 落英语背单词(匿名也可,走 trial),埋点来源,清洗 URL
  useEffect(() => {
    if (pendingFrom !== 'ket') return;
    track('inbound', { from: 'ket', go: 'english' });
    setSubject('english');
    const u = new URL(location.href);
    u.searchParams.delete('from');
    u.searchParams.delete('go');
    window.history.replaceState({}, '', u.pathname + u.search + u.hash);
  }, [pendingFrom]);

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

  // 「继续备考」胶囊: 读 localStorage 目标并从 exam_calendar 解析名称。
  // prepSeriesId 变化时重查 → 离开备考页后完成度即时刷新。
  useEffect(() => {
    let alive = true;
    const target = readPrepTarget(studentId);
    if (!target) { setPrepResume(null); return; }
    loadExamCalendar().then((d) => {
      if (!alive) return;
      const s = d.series.find((x) => x.id === target.seriesId);
      setPrepResume(
        s ? { seriesId: s.id, name: s.name, masteredCount: target.masteredCount, total: target.total } : null,
      );
    });
    return () => { alive = false; };
  }, [studentId, prepSeriesId]);

  // 语文/英语 iframe 学习时,track.js 会 postMessage 过来 → 记一次每日打卡
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const d = e.data;
      if (!d || d.source !== 'rm' || d.type !== 'activity') return;
      const r = recordCheckIn(studentId);
      if (r.firstToday) void adapter.addXp(studentId, CHECKIN_XP);
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [studentId, adapter]);

  // 是否停留在首页(无锁屏/家长/备考/日历/学科)
  const onHome = !locked && !parent && !prepSeriesId && !examCal && !subject;
  // 回到首页时取一次新里程碑(side-effect);StrictMode 双跑时不把已取到的覆盖为 null
  useEffect(() => {
    if (!onHome) { setCelebrate(null); return; }
    const m = takeNewMilestone(studentId);
    if (m != null) setCelebrate(m);
  }, [onHome, studentId]);

  const userBar = (
    <UserBar
      user={user}
      onLogout={logout}
      onLogin={login}
      activeChild={activeChild}
      onSwitchChild={() => setShowSwitcher(true)}
      onParent={user ? () => setParent(true) : undefined}
    />
  );
  const switcherEl = showSwitcher ? (
    <ChildSwitcher
      childrenList={childrenList}
      active={activeChild}
      onPick={pickChild}
      onChange={setChildrenList}
      onClose={() => setShowSwitcher(false)}
    />
  ) : null;

  // 从 ket-online 过来的欢迎条 (落在英语/首页时显示, 可关闭)
  const fromKetWelcome = fromKet ? (
    <div className="from-ket-welcome">
      <span>👋 欢迎从 KET 练习过来！星芽还有袋鼠数学 · 汉字 · 每日打卡</span>
      <button className="fkw-explore" onClick={() => { setFromKet(false); setSubject(null); }}>看看全部 →</button>
      <button className="fkw-x" aria-label="关闭" onClick={() => setFromKet(false)}>×</button>
    </div>
  ) : null;

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
        <ParentDashboard adapter={adapter} studentId={studentId} onExit={() => setParent(false)} />
      </ParentGate>
    );
  }

  if (prepSeriesId) {
    return (
      <>
        {userBar}
        {switcherEl}
        <PrepScreen
          seriesId={prepSeriesId}
          adapter={adapter}
          studentId={studentId}
          onBack={() => setPrepSeriesId(null)}
        />
      </>
    );
  }

  if (examCal) {
    const startPrep = (seriesId: string) => {
      savePrepTarget(studentId, seriesId);
      setExamCal(false);
      setPrepSeriesId(seriesId);
    };
    return (
      <>
        {userBar}
        {switcherEl}
        <ExamCalendar onBack={() => setExamCal(false)} onStartPrep={startPrep} />
      </>
    );
  }

  if (!subject) {
    // homepage open to all. Logged-out users get a free trial (10 ops/subject)
    // before the login prompt — lowers the barrier to try.
    const choose = (s: Subject) => {
      track('subject_select', { subject: s, authed: !!user });
      if (user) { setTrialSubject(null); setSubject(s); return; }
      if (trialExceeded(s)) {
        track('login_prompt_shown', { subject: s, reason: 'trial_over' });
        setAuthPromptFor(s);
      } else {
        setTrialSubject(s);
        setSubject(s); // 进入免费体验
      }
    };
    return (
      <>
        {userBar}
        {switcherEl}
        {fromKetWelcome}
        <Portal
          onSelect={choose}
          onExamCal={() => setExamCal(true)}
          resumePrep={prepResume}
          onResumePrep={prepResume ? () => setPrepSeriesId(prepResume.seriesId) : undefined}
          streak={readStreak(studentId)}
          celebrate={celebrate}
        />
        {authPromptFor && (
          <LoginPrompt subject={authPromptFor} onClose={() => setAuthPromptFor(null)} />
        )}
      </>
    );
  }

  if (subject === 'chinese') {
    return (
      <>
        {userBar}
        {switcherEl}
        <ChineseCharacters onBack={() => setSubject(null)} />
      </>
    );
  }

  if (subject === 'english') {
    return (
      <>
        {userBar}
        {switcherEl}
        <EnglishVocab onBack={() => setSubject(null)} banner={fromKetWelcome} />
      </>
    );
  }

  // Math subject — need grade selection
  if (!grade || !content) {
    return (
      <>
        {userBar}
        {switcherEl}
        {grade && !content ? (
          <div className="portal"><p className="portal-subtitle">加载中...</p></div>
        ) : (
          <GradePicker
            onSelect={(g) => { track('grade_select', { grade: g }); setGrade(g); }}
            onBack={() => setSubject(null)}
          />
        )}
      </>
    );
  }

  const { pack, practicePack, knowledgeMap } = content;
  const newSeed = () => Date.now() & 0xffffffff;

  if (!session) {
    return (
      <>
      {userBar}
        {switcherEl}
      <KnowledgeMap
        pack={pack}
        knowledgeMap={knowledgeMap}
        adapter={adapter}
        studentId={studentId}
        onPlay={async (trackId) => {
          track('topic_open', { kind: 'play', trackId, grade });
          const student = await adapter.getStudent(studentId);
          const mode = student?.latencyGateMs ? 'play' : 'probe';
          setSession({ mode, trackId, seed: newSeed() });
        }}
        onRace={(trackId) => { track('topic_open', { kind: 'race', trackId, grade }); setSession({ mode: 'race', trackId, seed: newSeed() }); }}
        onPractice={(setId) => { track('topic_open', { kind: 'practice', setId, grade }); setSession({ mode: 'practice', setId, seed: newSeed() }); }}
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
        studentId={studentId}
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
        studentId={studentId}
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
        studentId={studentId}
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
      studentId={studentId}
      seed={session.seed}
      onExit={() => setSession(null)}
    />
  );
}

function LoginPrompt({ subject, onClose }: { subject: Subject; onClose: () => void }) {
  const name = subject === 'math' ? '数学' : subject === 'chinese' ? '语文' : '英语';
  const go = () => {
    track('login_prompt_click', { subject });
    window.location.href = '/login.html?redirect=' + encodeURIComponent('/?go=' + subject);
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: '3rem' }}>🌱</div>
        <div className="card-title">免费体验结束啦</div>
        <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
          {name}的试用次数用完了。登录 / 注册后无限畅学，还能保存学习进度、经验值和错题本，换设备也能继续。
        </p>
        <button className="primary" onClick={go}>登录 / 注册,继续学{name}</button>
        <button className="ghost" onClick={onClose}>再看看</button>
      </div>
    </div>
  );
}
