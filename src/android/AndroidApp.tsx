import { useEffect, useRef, useState } from 'react';
import { createDefaultAdapter } from '../storage';
import { useAuth } from '../ui/UserBar';
import { getActiveChild, listChildren, setActiveChild, studentIdFor, type Child } from '../ui/family';
import { ChildSwitcher } from '../ui/ChildSwitcher';
import { loadGrade, type GradeContent } from '../ui/gradeLoader';
import { loadEnglishPack } from '../ui/englishLoader';
import type { PracticePack } from '../practice';
import { Play } from '../ui/Play';
import { Probe } from '../ui/Probe';
import { Race } from '../ui/Race';
import { PracticeScreen } from '../ui/PracticeScreen';
import { ParentGate } from '../ui/ParentGate';
import { ParentDashboard } from '../ui/ParentDashboard';
import { ExamCalendar } from '../ui/ExamCalendar';
import { PrepScreen } from '../ui/PrepScreen';
import { useTimeLock } from '../ui/useTimeLock';
import { LockScreen } from '../ui/LockScreen';
import { CHECKIN_XP, readStreak, recordCheckIn } from '../ui/streak';
import { useNativeBack } from '../platform/native';
import { AccountForm } from './AccountForm';
import { AppBar, Icon, Row, Sheet, type IconName } from './components';

type Tab = 'learn' | 'progress' | 'me';
type Subject = 'math' | 'chinese' | 'english';
type Route = { kind: 'home' | 'courses' | 'account' | 'parent' | 'calendar' | 'about' }
  | { kind: 'frame'; page: 'characters' | 'reading' | 'vocab' }
  | { kind: 'prep'; id: string }
  | { kind: 'session'; mode: 'probe' | 'play' | 'race' | 'practice'; id: string; title: string; subject: 'math' | 'english'; seed: number };
const SUBJECTS: { id: Subject; label: string; icon: IconName }[] = [{ id: 'math', label: '数学', icon: 'math' }, { id: 'chinese', label: '语文', icon: 'chinese' }, { id: 'english', label: '英语', icon: 'english' }];
const gradeName = (grade: number) => `${['', '一', '二', '三', '四', '五', '六', '七', '八', '九'][grade]}年级`;
const storedGrade = () => { const value = Number(localStorage.getItem('rm.grade')); return value >= 3 && value <= 9 ? value : 4; };
const frameTitles = { characters: '生字学习', reading: '阅读理解', vocab: '词汇练习' };

export function AndroidApp() {
  const [adapter] = useState(createDefaultAdapter);
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>('learn');
  const [subject, setSubject] = useState<Subject>('math');
  const [grade, setGrade] = useState(storedGrade);
  const [readingGrade, setReadingGrade] = useState(() => Number(localStorage.getItem('android.readingGrade')) || 3);
  const [content, setContent] = useState<GradeContent | null>(null);
  const [english, setEnglish] = useState<PracticePack | null>(null);
  const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0);
  const [route, setRoute] = useState<Route>({ kind: 'home' });
  const [gradeOpen, setGradeOpen] = useState(false); const [exitOpen, setExitOpen] = useState(false); const [logoutOpen, setLogoutOpen] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false); const [children, setChildren] = useState<Child[]>([]);
  const [activeChild, setChild] = useState(getActiveChild);
  const [stats, setStats] = useState({ xp: 0, mistakes: 0 });
  const [revision, setRevision] = useState(0); const [courseFilter, setCourseFilter] = useState<'all' | 'oral' | 'practice'>('all');
  const [launching, setLaunching] = useState(false); const launchRef = useRef(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const studentId = studentIdFor(activeChild);
  const active = route.kind === 'session' && route.mode !== 'probe';
  const { locked, remainingMs } = useTimeLock(active, content?.pack.engine_config);
  const streak = readStreak(studentId);

  useEffect(() => {
    let alive = true;
    setContent(null); setError(''); localStorage.setItem('rm.grade', String(grade));
    loadGrade(grade).then(value => { if (alive) setContent(value); }, () => { if (alive) setError('题库加载失败，请重试。你的学习进度仍保存在本机。'); });
    return () => { alive = false; };
  }, [grade, attempt]);
  useEffect(() => {
    let alive = true;
    loadEnglishPack().then(value => { if (alive) setEnglish(value); }, () => { if (alive) setError('英语题库加载失败，请重试。'); });
    return () => { alive = false; };
  }, [attempt]);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const existing = await adapter.getStudent(studentId);
      if (!existing) await adapter.putStudent({ id: studentId, createdAt: Date.now() });
      const mistakes = await adapter.listMistakes(studentId);
      if (alive) setStats({ xp: existing?.xp ?? 0, mistakes: mistakes.filter(m => !m.corrected).length });
    })();
    return () => { alive = false; };
  }, [adapter, studentId, tab, route.kind, revision]);
  useEffect(() => { setActiveChild(activeChild); }, [activeChild]);
  useEffect(() => {
    if (!user) { setChildren([]); return; }
    let alive = true;
    listChildren().then(items => {
      if (!alive) return;
      setChildren(items);
      if (activeChild && !items.some(item => item.id === activeChild.id)) { setChild(null); setActiveChild(null); }
    }).catch(() => { /* A connection failure must not switch the local learner. */ });
    return () => { alive = false; };
  }, [user]);
  useEffect(() => {
    const onActivity = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.source === 'xingya-android' && event.data?.type === 'account') { setRoute({ kind: 'account' }); return; }
      if (event.data?.source !== 'rm' || event.data?.type !== 'activity') return;
      const result = recordCheckIn(studentId);
      if (result.firstToday) void adapter.addXp(studentId, CHECKIN_XP);
      setRevision(value => value + 1);
    };
    window.addEventListener('message', onActivity);
    return () => window.removeEventListener('message', onActivity);
  }, [adapter, studentId]);
  useEffect(() => {
    document.title = `${route.kind === 'frame' ? frameTitles[route.page] : tab === 'learn' ? '学习' : tab === 'progress' ? '学习进度' : '我的'} · 星芽`;
    document.querySelector<HTMLElement>('.a-appbar h1, .play-head button')?.focus({ preventScroll: true });
  }, [route.kind, tab]);

  const home = () => { setRoute({ kind: 'home' }); setRevision(value => value + 1); };
  const exitSession = () => { setExitOpen(false); setRoute({ kind: 'home' }); setRevision(value => value + 1); };
  const back = () => {
    if (route.kind === 'session') { if (route.mode !== 'practice' || document.querySelector('.celebrate')) exitSession(); else setExitOpen(true); return; }
    if (route.kind === 'frame') {
      const win = frame.current?.contentWindow as (Window & { closeSheet?: () => void; closeReview?: () => void; closeOverlay?: () => void; backToInput?: () => void }) | null;
      const doc = win?.document;
      const dialog = doc?.querySelector<HTMLDialogElement>('dialog[open]');
      if (dialog) { dialog.close(); return; }
      if (doc?.querySelector('#rev-overlay.show')) { win?.closeReview?.(); return; }
      if (doc?.querySelector('#overlay.show')) { win?.closeSheet?.(); return; }
      if (doc?.querySelector('#detailOverlay.has-char')) { win?.closeOverlay?.(); return; }
      if (doc?.querySelector('#readingView.active')) { win?.backToInput?.(); return; }
    }
    home();
  };
  useNativeBack(() => {
    if (gradeOpen) setGradeOpen(false);
    else if (exitOpen) setExitOpen(false);
    else if (logoutOpen) setLogoutOpen(false);
    else if (familyOpen) setFamilyOpen(false);
    else if (locked) return false;
    else if (route.kind !== 'home') back();
    else if (tab !== 'learn') setTab('learn');
    else return false;
    return true;
  });
  const selectSubject = (value: Subject) => { setSubject(value); setCourseFilter('all'); home(); };
  const startMath = async (id: string, title: string, mode: 'play' | 'race' | 'practice') => {
    if (!content || launchRef.current) return;
    launchRef.current = true; setLaunching(true);
    try {
      const student = await adapter.getStudent(studentId);
      const actualMode = mode === 'play' && !student?.latencyGateMs ? 'probe' : mode;
      setRoute({ kind: 'session', mode: actualMode, id, title, subject: 'math', seed: Date.now() >>> 0 });
    } catch { setError('无法读取学习记录，请重试。'); } finally { launchRef.current = false; setLaunching(false); }
  };
  const startTopic = (topic: GradeContent['knowledgeMap']['topics'][number]) => {
    if (topic.problemSetId) void startMath(topic.problemSetId, topic.title, 'practice');
    else if (topic.fluencyTrackId) void startMath(topic.fluencyTrackId, topic.title, 'play');
  };
  const firstTrack = content?.pack.tracks.find(track => track.enabled);

  if (locked) return <div className="a-session"><LockScreen remainingMs={remainingMs}/></div>;
  if (route.kind === 'account') return <AccountForm onBack={home} onSuccess={() => { refreshUser(); home(); setTab('me'); }}/>;
  let body;
  let title = tab === 'learn' ? '星芽' : tab === 'progress' ? '学习进度' : '我的';
  if (route.kind === 'session') {
    const sessionProps = { adapter, studentId, seed: route.seed, onExit: exitSession, onBack: back };
    body = route.mode === 'practice'
      ? <PracticeScreen {...sessionProps} setId={route.id} exitLabel="返回学习" practicePack={route.subject === 'english' ? english! : content!.practicePack}/>
      : route.mode === 'probe' ? <><AppBar title="口算准备" back={back}/><Probe pack={content!.pack} adapter={adapter} studentId={studentId} onDone={() => setRoute({ ...route, mode: 'play' })}/></>
      : route.mode === 'race' ? <Race {...sessionProps} pack={content!.pack} trackId={route.id}/>
      : <Play {...sessionProps} pack={content!.pack} trackId={route.id}/>;
    return <div className="a-session">{body}{exitOpen && <Sheet title="退出本次练习？" onClose={() => setExitOpen(false)}><p>已获得的经验和错题会保留。未完成的题目下次重新练习。</p><div className="a-dialog-actions"><button className="a-outlined" onClick={() => setExitOpen(false)}>继续练习</button><button className="a-filled" onClick={exitSession}>退出练习</button></div></Sheet>}</div>;
  }
  if (route.kind === 'parent') return <div className="a-legacy"><ParentGate onCancel={home}><ParentDashboard adapter={adapter} studentId={studentId} onExit={home}/></ParentGate></div>;
  if (route.kind === 'calendar') return <div className="a-legacy"><ExamCalendar onBack={home} onStartPrep={id => setRoute({ kind: 'prep', id })}/></div>;
  if (route.kind === 'prep') return <div className="a-legacy"><PrepScreen seriesId={route.id} adapter={adapter} studentId={studentId} onBack={() => setRoute({ kind: 'calendar' })}/></div>;
  if (route.kind === 'frame') {
    const src = route.page === 'characters' ? '/chinese-characters.html' : route.page === 'reading' ? '/chinese-reading.html' : '/vocab.html';
    return <section className="a-app a-embedded"><AppBar title={frameTitles[route.page]} back={back}/><iframe ref={frame} src={src} title={frameTitles[route.page]} onLoad={() => {
      if (route.page === 'reading') [...(frame.current?.contentDocument?.querySelectorAll<HTMLButtonElement>('#gradeBar button') ?? [])].find(button => button.textContent === `${readingGrade}年级`)?.click();
    }}/></section>;
  }
  if (route.kind === 'about') {
    title = '关于星芽';
    body = <><div className="a-about-mark"><Icon name="book"/></div><h2>每天进步一点点</h2><p className="a-supporting">星芽 Android · 1.0.0 (2)</p><section className="a-surface"><h3>离线学习</h3><p>数学三至九年级；语文生字、一至六年级阅读；英语 A2/B1 词汇与练习。题库随安装包提供，无需登录即可学习。</p><h3>本机数据</h3><p>数学进度、错题和家长 PIN 保存在本机。断网保留已有登录；卸载或清除应用数据会删除本地记录。系统备份及设备迁移已关闭。</p><h3>账号与语音</h3><p>选择登录后，支持的孩子档案、英语进度及生字本通过 HTTPS 同步。朗读使用系统离线语音包；当前没有安卓订阅支付和 Apple/Google 快捷登录。</p><a href="mailto:cswanghan@gmail.com">联系开发者与数据删除</a></section><a className="a-text-button" href="/android-about.html">查看隐私说明与开源许可</a></>;
  } else if (route.kind === 'courses') {
    title = `${gradeName(grade)}数学`;
    const topics = content?.knowledgeMap.topics ?? [];
    body = <><div className="a-segments" aria-label="练习类型">{(['all','oral','practice'] as const).map((value, index) => <button key={value} aria-pressed={courseFilter === value} onClick={() => setCourseFilter(value)}>{['全部','口算','知识练习'][index]}</button>)}</div>
      {content?.knowledgeMap.units.map(unit => {
        const entries = topics.filter(topic => unit.topicIds.includes(topic.id) && (courseFilter === 'all' || (courseFilter === 'oral' ? !!topic.fluencyTrackId : !!topic.problemSetId)));
        if (!entries.length) return null;
        return <section key={unit.id} className="a-course-unit"><h2><span>{unit.term === 'upper' ? '上册' : '下册'} · {unit.index}</span>{unit.title}</h2><div className="a-list">{entries.map(topic => <Row key={topic.id} title={topic.title} detail={topic.status !== 'ready' ? '内容准备中' : topic.problemSetId ? '知识练习 · 含答案解析' : '口算 · 停输自动判题'} disabled={topic.status !== 'ready' || launching} icon={topic.problemSetId ? 'book' : 'math'} onClick={() => startTopic(topic)}/>)}</div></section>;
      })}</>;
  } else if (tab === 'learn') {
    body = <><div className="a-subjects" aria-label="选择学科">{SUBJECTS.map(item => <button key={item.id} aria-pressed={subject === item.id} onClick={() => selectSubject(item.id)}><Icon name={item.icon}/>{item.label}</button>)}</div>
      <div className="a-section-heading"><h2>{subject === 'math' ? `${gradeName(grade)}数学` : subject === 'chinese' ? '读写之间，认识世界' : '每天一点英语'}</h2>{subject !== 'english' && <button className="a-grade" onClick={() => setGradeOpen(true)}>{subject === 'math' ? '换年级' : `${gradeName(readingGrade)}`}<Icon name="down"/></button>}</div>
      {error ? <div className="a-error" role="alert">{error}<button className="a-outlined" onClick={() => setAttempt(value => value + 1)}>重试</button></div> : !content || !english ? <div className="a-loading" role="status">正在准备题库…</div> : subject === 'math' ? <>
        <section className="a-focus-card"><div className="a-eyebrow"><Icon name="math"/>口算训练</div><h3>动动脑，练一组口算</h3><p>{firstTrack?.name} · 停止输入约 1 秒后自动判断</p><button className="a-filled" disabled={launching} onClick={() => firstTrack && void startMath(firstTrack.trackId, firstTrack.name, 'play')}>开始练习<Icon name="next"/></button></section>
        <h3 className="a-section-label">更多练习</h3><div className="a-list"><Row icon="book" title="按知识点练习" detail={`${content.knowledgeMap.topics.filter(topic => topic.status === 'ready').length} 个知识点 · 上下册`} onClick={() => { setCourseFilter('all'); setRoute({ kind: 'courses' }); }}/><Row icon="timer" title="限时挑战" detail="用熟悉的口算题，挑战自己的速度" onClick={() => firstTrack && void startMath(firstTrack.trackId, firstTrack.name, 'race')}/></div>
      </> : subject === 'chinese' ? <>
        <section className="a-focus-card a-chinese-focus"><div className="a-eyebrow"><Icon name="chinese"/>阅读理解</div><h3>读一篇短文，想一想</h3><p>{gradeName(readingGrade)} · 原创短文与逐题解析</p><button className="a-filled" onClick={() => setRoute({ kind: 'frame', page: 'reading' })}>开始阅读<Icon name="next"/></button></section>
        <h3 className="a-section-label">生字与书写</h3><div className="a-list"><Row icon="chinese" title="生字学习" detail="143 个常用字 · 笔顺、拼音与偏旁" onClick={() => setRoute({ kind: 'frame', page: 'characters' })}/></div>
      </> : <>
        <section className="a-focus-card a-english-focus"><div className="a-eyebrow"><Icon name="english"/>词汇练习</div><h3>认识单词，也学会使用</h3><p>A2 / B1 · 词卡、拼写、听写与例句</p><button className="a-filled" onClick={() => setRoute({ kind: 'frame', page: 'vocab' })}>开始练词<Icon name="next"/></button></section>
        <h3 className="a-section-label">阅读与语法</h3><div className="a-list">{english.sets.map(set => <Row key={set.id} icon="book" title={set.title} detail={`${set.problems.length} 题 · 点选即可判断`} onClick={() => setRoute({ kind: 'session', mode: 'practice', id: set.id, title: set.title, subject: 'english', seed: Date.now() >>> 0 })}/>)}</div>
      </>}
      <div className="a-today-strip"><span className={`a-today-dot${streak.doneToday ? ' done' : ''}`}><Icon name="check"/></span><div><strong>{streak.doneToday ? '今天已完成学习' : '做完第一题，点亮今天'}</strong><span>{streak.current ? `已连续学习 ${streak.current} 天` : '从一小步开始，慢慢积累'}</span></div><button className="a-icon-button" aria-label="查看学习进度" onClick={() => setTab('progress')}><Icon name="next"/></button></div>
      <p className="a-offline-note"><Icon name="offline"/>题库已就绪，离线也能练习</p></>;
  } else if (tab === 'progress') {
    body = <><div className="a-section-heading"><h2>{activeChild ? `${activeChild.name}的学习` : '每一步，都算数'}</h2></div><section className="a-progress-card"><span className="a-eyebrow">本周学习</span><div className="a-week">{streak.weekDots.map((done, index) => <div key={index}><span className={done ? 'done' : ''}>{done ? <Icon name="check"/> : ['一','二','三','四','五','六','日'][index]}</span><small>{done ? '已学' : '待学'}</small></div>)}</div><div className="a-stats"><div><strong>{streak.current}<small>天</small></strong><span>连续学习</span></div><div><strong>{stats.xp}<small>XP</small></strong><span>累计经验</span></div></div></section>
      <h3 className="a-section-label">复习与回顾</h3><div className="a-list"><Row icon="book" title="错题回顾" detail={stats.mistakes ? `${stats.mistakes} 道待复习 · 需要家长验证` : '还没有待复习的错题 · 继续保持'} onClick={() => setRoute({ kind: 'parent' })}/><Row icon="shield" title="家长学习分析" detail="查看本地报告，管理练习记录" onClick={() => setRoute({ kind: 'parent' })}/></div>
      {!streak.doneToday && <button className="a-filled a-wide" onClick={() => setTab('learn')}>去完成今天的练习<Icon name="next"/></button>}<p className="a-footnote">进度保存在这台设备。不同孩子使用各自的学习档案。</p></>;
  } else {
    body = <><section className="a-profile"><span className="a-avatar"><Icon name="person"/></span><div><h2>{user?.username ?? '开始你的学习旅程'}</h2><p>{user ? activeChild ? `当前学习者：${activeChild.name}` : '当前学习者：本机默认档案' : '无需登录，也能学习三科内容'}</p></div></section>{!user && <button className="a-filled a-wide" onClick={() => setRoute({ kind: 'account' })}>登录 / 注册</button>}
      <h3 className="a-section-label">学习设置</h3><div className="a-list">{user && <Row icon="person" title="孩子档案" detail={activeChild?.name ?? '添加或切换学习者'} onClick={() => setFamilyOpen(true)}/>}<Row icon="math" title="数学年级" detail={gradeName(grade)} onClick={() => { setSubject('math'); setGradeOpen(true); }}/><Row icon="shield" title="家长区" detail="错题、学习分析与记录管理" onClick={() => setRoute({ kind: 'parent' })}/><Row icon="book" title="考试与备考" detail="查看考试日历与备考知识点" onClick={() => setRoute({ kind: 'calendar' })}/></div>
      <h3 className="a-section-label">应用</h3><div className="a-list"><Row icon="offline" title="离线与数据说明" detail="了解本地进度、账号和系统朗读" onClick={() => setRoute({ kind: 'about' })}/><Row icon="settings" title="关于星芽" detail="版本 1.0.0 (2)" onClick={() => setRoute({ kind: 'about' })}/></div>{user && <button className="a-text-button a-wide" onClick={() => setLogoutOpen(true)}>退出登录</button>}</>;
  }

  return <section className="a-app"><AppBar title={title} subtitle={route.kind === 'home' && tab === 'learn' ? '每天进步一点点' : undefined} back={route.kind !== 'home' ? back : undefined}/>
    <main className="a-body" key={`${route.kind}-${tab}-${subject}`}>{body}</main>
    {route.kind === 'home' && <nav className="a-navigation" aria-label="主导航">{([{ id: 'learn', title: '学习', icon: 'book' }, { id: 'progress', title: '进度', icon: 'chart' }, { id: 'me', title: '我的', icon: 'person' }] as const).map(item => <button key={item.id} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}><span><Icon name={item.icon}/></span>{item.title}</button>)}</nav>}
    {gradeOpen && <Sheet title={subject === 'chinese' ? '选择阅读年级' : '选择数学年级'} onClose={() => setGradeOpen(false)}><p className="a-supporting">切换年级不会清除已完成的学习记录。</p><div className="a-grade-grid">{(subject === 'chinese' ? [1,2,3,4,5,6] : [3,4,5,6,7,8,9]).map(value => <button className="a-outlined" key={value} aria-pressed={(subject === 'chinese' ? readingGrade : grade) === value} onClick={() => { if (subject === 'chinese') { setReadingGrade(value); localStorage.setItem('android.readingGrade', String(value)); } else setGrade(value); setGradeOpen(false); }}>{gradeName(value)}{(subject === 'chinese' ? readingGrade : grade) === value && <Icon name="check"/>}</button>)}</div></Sheet>}
    {logoutOpen && <Sheet title="退出星芽账号？" onClose={() => setLogoutOpen(false)}><p>本机学习记录会保留。重新登录并选择原孩子档案后可继续查看。</p><div className="a-dialog-actions"><button className="a-outlined" onClick={() => setLogoutOpen(false)}>取消</button><button className="a-filled" onClick={() => { logout(); setChild(null); setActiveChild(null); setLogoutOpen(false); }}>退出登录</button></div></Sheet>}
    {familyOpen && <Sheet title="孩子档案" onClose={() => setFamilyOpen(false)}><div className="a-legacy a-family"><ChildSwitcher childrenList={children} active={activeChild} onPick={value => { setChild(value); setActiveChild(value); }} onChange={setChildren} onClose={() => setFamilyOpen(false)}/></div></Sheet>}
  </section>;
}
