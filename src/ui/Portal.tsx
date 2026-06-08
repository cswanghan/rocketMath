interface Props {
  onSelect: (subject: 'math' | 'chinese') => void;
}

export function Portal({ onSelect }: Props) {
  return (
    <div className="portal">
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
      <div className="portal-grid">
        <button className="pcard portal-card portal-math" onClick={() => onSelect('math')}>
          <span className="pill pill-blue">学科</span>
          <span className="portal-icon">🚀</span>
          <span className="portal-label">数学</span>
          <span className="portal-desc">计算流畅度训练</span>
        </button>
        <button className="pcard portal-card portal-chinese" onClick={() => onSelect('chinese')}>
          <span className="pill pill-peach">学科</span>
          <span className="portal-icon">📖</span>
          <span className="portal-label">语文</span>
          <span className="portal-desc">生字学习</span>
        </button>
      </div>
    </div>
  );
}
