import { useParallax } from './useParallax';

interface Props {
  onSelect: (grade: number) => void;
  onBack: () => void;
}

const GRADES = [
  { grade: 3, label: '三年级', desc: '乘除法·周长面积·分数初步', tag: '小学', color: 'blue' },
  { grade: 4, label: '四年级', desc: '大数·角度·小数·运算定律', tag: '小学', color: 'peach' },
  { grade: 5, label: '五年级', desc: '方程·多边形面积·因数倍数', tag: '小学', color: 'mint' },
  { grade: 6, label: '六年级', desc: '分数运算·百分数·圆·比例', tag: '小学', color: 'lavender' },
  { grade: 7, label: '初一', desc: '有理数·整式·方程·几何', tag: '初中', color: 'blue' },
  { grade: 8, label: '初二', desc: '全等·因式分解·函数·勾股', tag: '初中', color: 'peach' },
  { grade: 9, label: '初三', desc: '二次方程·二次函数·圆·相似', tag: '初中', color: 'mint' },
] as const;

export function GradePicker({ onSelect, onBack }: Props) {
  const { ref, onPointerMove, onPointerLeave } = useParallax<HTMLDivElement>();
  return (
    <div className="portal" ref={ref} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <span className="scrawl" style={{ top: '14%', right: '12%', transform: 'rotate(7deg)' }}>
        选你的关卡
      </span>
      <span className="scrawl" style={{ bottom: '16%', left: '10%', transform: 'rotate(-6deg)' }}>
        从这里出发 →
      </span>

      <h1 className="portal-title">你在几年级？</h1>
      <p className="portal-subtitle">选择你正在学习的年级</p>
      <div className="grade-grid">
        {GRADES.map((g) => (
          <button
            key={g.grade}
            className={`pcard grade-card pc-${g.color}`}
            onClick={() => onSelect(g.grade)}
          >
            <span className={`pill pill-${g.color}`}>{g.tag}</span>
            <span className="grade-num">{g.grade}</span>
            <span className="grade-label">{g.label}</span>
            <span className="grade-desc">{g.desc}</span>
          </button>
        ))}
      </div>
      <button className="cta" onClick={onBack} style={{ marginTop: 36 }}>
        <span className="cta-arrow">←</span>
        返回
      </button>
    </div>
  );
}
