interface Props {
  onSelect: (grade: number) => void;
  onBack: () => void;
}

const GRADES = [
  { grade: 3, label: '三年级', desc: '乘除法·周长面积·分数初步' },
  { grade: 4, label: '四年级', desc: '大数·角度·小数·运算定律' },
  { grade: 5, label: '五年级', desc: '方程·多边形面积·因数倍数' },
  { grade: 6, label: '六年级', desc: '分数运算·百分数·圆·比例' },
];

export function GradePicker({ onSelect, onBack }: Props) {
  return (
    <div className="portal">
      <h1 className="portal-title">选择年级</h1>
      <p className="portal-subtitle">选择你正在学习的年级</p>
      <div className="grade-grid">
        {GRADES.map((g) => (
          <button key={g.grade} className="grade-card" onClick={() => onSelect(g.grade)}>
            <span className="grade-num">{g.grade}</span>
            <span className="grade-label">{g.label}</span>
            <span className="grade-desc">{g.desc}</span>
          </button>
        ))}
      </div>
      <button className="map-back" onClick={onBack} style={{ marginTop: 24 }}>← 返回</button>
    </div>
  );
}
