import { CardArt } from './CardArt';
import { useParallax } from './useParallax';
import type { StreakView } from './streak';

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

interface Props {
  onSelect: (subject: 'math' | 'chinese' | 'english') => void;
  onExamCal: () => void;
  /** 有进行中的备考目标时显示「继续备考」入口 */
  resumePrep?: { name: string; masteredCount?: number; total?: number } | null;
  onResumePrep?: () => void;
  /** 每日打卡状态 */
  streak?: StreakView | null;
  /** 本轮新达成的里程碑天数（庆祝用） */
  celebrate?: number | null;
}

export function Portal({ onSelect, onExamCal, resumePrep, onResumePrep, streak, celebrate }: Props) {
  const { ref, onPointerMove, onPointerLeave } = useParallax<HTMLDivElement>();
  return (
    <div className="portal" ref={ref} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <span className="scrawl" style={{ top: '12%', left: '8%', transform: 'rotate(-8deg)' }}>
        加油鸭~
      </span>
      <span className="scrawl" style={{ top: '20%', right: '10%', transform: 'rotate(6deg)' }}>
        每天进步一点点
      </span>
      <span className="scrawl" style={{ bottom: '14%', left: '12%', transform: 'rotate(5deg)' }}>
        一起冲鸭
      </span>

      <h1 className="portal-title">今天学什么？</h1>
      <p className="portal-subtitle">选择一个学科开始吧</p>

      {streak && <StreakCard streak={streak} celebrate={celebrate ?? null} />}

      <div className="portal-grid">
        <button className="pcard portal-card portal-math" onClick={() => onSelect('math')}>
          <span className="pill pill-blue">学科</span>
          <span className="portal-label">数学</span>
          <span className="portal-desc">计算流畅度训练</span>
          <CardArt kind="math" />
        </button>
        <button className="pcard portal-card portal-chinese" onClick={() => onSelect('chinese')}>
          <span className="pill pill-peach">学科</span>
          <span className="portal-label">语文</span>
          <span className="portal-desc">生字学习</span>
          <CardArt kind="chinese" />
        </button>
        <button className="pcard portal-card portal-english" onClick={() => onSelect('english')}>
          <span className="pill pill-lavender">学科</span>
          <span className="portal-label">英语</span>
          <span className="portal-desc">KET·PET 背单词</span>
          <CardArt kind="english" />
        </button>
      </div>
      <button className="pcard portal-banner" onClick={onExamCal}>
        <span className="pill pill-teal">资讯</span>
        <span className="portal-banner-body">
          <span className="portal-banner-label">考试日历</span>
          <span className="portal-banner-desc">AMC · 袋鼠数学 · KET/PET — 竞赛证书报名时间一目了然</span>
        </span>
        <CardArt kind="examCal" />
      </button>
      {/* prep resume entry */}
      {resumePrep && onResumePrep && (
        <button className="pcard prep-resume" onClick={onResumePrep}>
          <span className="pill pill-peach">备考中</span>
          <span className="portal-banner-body">
            <span className="portal-banner-label">继续备考 · {resumePrep.name}</span>
            <span className="portal-banner-desc">
              {resumePrep.total
                ? `已掌握 ${resumePrep.masteredCount ?? 0}/${resumePrep.total} 个知识点，继续冲鸭`
                : '查看备考清单，逐个攻克知识点'}
            </span>
          </span>
          <span className="prep-resume-arrow">→</span>
        </button>
      )}
    </div>
  );
}

function StreakCard({ streak, celebrate }: { streak: StreakView; celebrate: number | null }) {
  const { current, doneToday, weekDots, badges } = streak;
  return (
    <div className={`streak-card${doneToday ? ' done' : ''}`}>
      {celebrate != null && (
        <div className="streak-celebrate">🎉 达成 {celebrate} 天连续学习！太棒啦</div>
      )}
      <div className="streak-main">
        <span className="streak-flame">{current > 0 ? '🔥' : '🌱'}</span>
        <span className="streak-text">
          <span className="streak-count">
            {current > 0 ? <>连续学习 <b>{current}</b> 天</> : '今天还没学习'}
          </span>
          <span className="streak-sub">
            {doneToday ? '今日已打卡，继续保持！' : '挑一科开始，点亮今天 ✨'}
          </span>
        </span>
      </div>
      <div className="streak-week">
        {weekDots.map((on, i) => (
          <span key={i} className={`streak-day${on ? ' on' : ''}`}>
            <span className="streak-dot" />
            <span className="streak-day-label">{WEEK_LABELS[i]}</span>
          </span>
        ))}
      </div>
      {badges.length > 0 && (
        <div className="streak-badges">
          {badges.map((b) => (
            <span key={b} className="streak-badge" title={`连续 ${b} 天`}>🏅{b}天</span>
          ))}
        </div>
      )}
    </div>
  );
}
