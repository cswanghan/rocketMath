import type { ReactNode } from 'react';

interface Props {
  onBack: () => void;
  /** 深链到某个等级（vocab.html 的 ?level= 取值，如 a2-key / b1-preliminary） */
  level?: string;
  /** 深链到某个主题（vocab.html 的 ?topic= 取值） */
  topic?: string;
  /** 顶部插槽(返回按钮下方、iframe 上方)，用于导流欢迎条等覆盖层内容 */
  banner?: ReactNode;
}

// 英语背单词模块 (迁移自 ket-online)。作为同源 iframe 嵌入,复用 localStorage 里的
// token 做云端进度同步;外层套星芽自己的返回按钮。支持 level/topic 深链(备考联动)。
// 注意: .chinese-wrap 是 fixed 全屏覆盖,所以 banner 必须渲染在 wrap 内部才可见。
export function EnglishVocab({ onBack, level, topic, banner }: Props) {
  const params = new URLSearchParams();
  if (level) params.set('level', level);
  if (topic) params.set('topic', topic);
  const qs = params.toString();
  const src = qs ? `/vocab.html?${qs}` : '/vocab.html';
  return (
    <div className="chinese-wrap">
      <button className="back-btn" onClick={onBack}>← 返回</button>
      {banner}
      <iframe src={src} className="chinese-iframe" title="英语背单词" />
    </div>
  );
}
