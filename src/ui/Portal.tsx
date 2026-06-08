interface Props {
  onSelect: (subject: 'math' | 'chinese') => void;
}

export function Portal({ onSelect }: Props) {
  return (
    <div className="portal">
      <h1 className="portal-title">今天学什么？</h1>
      <p className="portal-subtitle">选择一个学科开始吧</p>
      <div className="portal-grid">
        <button className="portal-card portal-math" onClick={() => onSelect('math')}>
          <span className="portal-icon">🚀</span>
          <span className="portal-label">数学</span>
          <span className="portal-desc">计算流畅度训练</span>
        </button>
        <button className="portal-card portal-chinese" onClick={() => onSelect('chinese')}>
          <span className="portal-icon">📖</span>
          <span className="portal-label">语文</span>
          <span className="portal-desc">生字学习</span>
        </button>
      </div>
    </div>
  );
}
