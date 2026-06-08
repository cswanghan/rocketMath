import { useState } from 'react';

type ChineseMode = 'characters' | 'reading' | null;

interface Props {
  onBack: () => void;
}

export function ChineseCharacters({ onBack }: Props) {
  const [mode, setMode] = useState<ChineseMode>(null);

  if (mode === 'characters') {
    return (
      <div className="chinese-wrap">
        <button className="back-btn" onClick={() => setMode(null)}>← 返回</button>
        <iframe src="/chinese-characters.html" className="chinese-iframe" title="生字小课堂" />
      </div>
    );
  }

  if (mode === 'reading') {
    return (
      <div className="chinese-wrap">
        <button className="back-btn" onClick={() => setMode(null)}>← 返回</button>
        <iframe src="/chinese-reading.html" className="chinese-iframe" title="阅读识字" />
      </div>
    );
  }

  return (
    <div className="chinese-portal">
      <button className="map-back" onClick={onBack}>← 返回</button>
      <h1 className="portal-title">语文</h1>
      <p className="portal-subtitle">选择学习模式</p>
      <div className="portal-grid">
        <button className="portal-card portal-char" onClick={() => setMode('characters')}>
          <span className="portal-icon">✍️</span>
          <span className="portal-label">生字学习</span>
          <span className="portal-desc">笔顺 · 拼音 · 偏旁</span>
        </button>
        <button className="portal-card portal-read" onClick={() => setMode('reading')}>
          <span className="portal-icon">📄</span>
          <span className="portal-label">阅读识字</span>
          <span className="portal-desc">粘贴文章 · 提取生字</span>
        </button>
      </div>
    </div>
  );
}
