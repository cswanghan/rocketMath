import { useEffect, useState, type ReactNode } from 'react';
import type { PracticePack } from '../practice';
import type { StorageAdapter } from '../storage';
import { loadEnglishPack } from './englishLoader';
import { PracticeScreen } from './PracticeScreen';

interface Props {
  onBack: () => void;
  /** 深链到某个等级（vocab.html 的 ?level= 取值，如 a2-key / b1-preliminary） */
  level?: string;
  /** 深链到某个主题（vocab.html 的 ?topic= 取值） */
  topic?: string;
  /** 顶部插槽(返回按钮下方、iframe 上方)，用于导流欢迎条等覆盖层内容 */
  banner?: ReactNode;
  practice?: { adapter: StorageAdapter; studentId: string };
}

// 英语背单词模块 (迁移自 ket-online)。作为同源 iframe 嵌入,复用 localStorage 里的
// token 做云端进度同步;外层套星芽自己的返回按钮。支持 level/topic 深链(备考联动)。
// 注意: .chinese-wrap 是 fixed 全屏覆盖,所以 banner 必须渲染在 wrap 内部才可见。
export function EnglishVocab({ onBack, level, topic, banner, practice }: Props) {
  const [pack, setPack] = useState<PracticePack | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState<{ setId: string; seed: number } | null>(null);
  const enablePractice = !!practice;
  useEffect(() => {
    if (!enablePractice) return;
    let alive = true;
    setLoadError(false);
    loadEnglishPack().then(
      value => { if (alive) setPack(value); },
      () => { if (alive) setLoadError(true); },
    );
    return () => { alive = false; };
  }, [enablePractice, attempt]);

  if (practice && pack && session) {
    return <PracticeScreen
      key={`${practice.studentId}:${session.seed}:${session.setId}`}
      practicePack={pack} setId={session.setId} seed={session.seed}
      adapter={practice.adapter} studentId={practice.studentId}
      onExit={() => setSession(null)} exitLabel="返回英语学习"
    />;
  }
  const params = new URLSearchParams();
  if (level) params.set('level', level);
  if (topic) params.set('topic', topic);
  const qs = params.toString();
  const src = qs ? `/vocab.html?${qs}` : '/vocab.html';
  return (
    <div className="chinese-wrap">
      <button className="back-btn" onClick={onBack}>← 返回</button>
      {banner}
      {enablePractice && <section className="english-practice-menu" aria-label="英语阅读与语法练习">
        <span className="english-practice-label">阅读与语法 · 原创练习</span>
        <div className="english-practice-links">
          {pack?.sets.map(set => <button className="ghost" key={set.id}
            onClick={() => setSession({ setId: set.id, seed: Date.now() >>> 0 })}>
            {set.title} · {set.problems.length} 题
          </button>)}
          {!pack && !loadError && <span role="status">题库加载中…</span>}
          {loadError && <><span role="alert">练习题库加载失败</span>
            <button className="ghost" onClick={() => setAttempt(value => value + 1)}>重试</button></>}
        </div>
      </section>}
      <iframe src={src} className="chinese-iframe" title="英语背单词" />
    </div>
  );
}
