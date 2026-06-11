interface Props {
  onBack: () => void;
  /** 深链到某个等级（vocab.html 的 ?level= 取值，如 a2-key / b1-preliminary） */
  level?: string;
  /** 深链到某个主题（vocab.html 的 ?topic= 取值） */
  topic?: string;
}

// 英语背单词模块 (迁移自 ket-online)。作为同源 iframe 嵌入,复用 localStorage 里的
// token 做云端进度同步;外层套星芽自己的返回按钮。支持 level/topic 深链(备考联动)。
export function EnglishVocab({ onBack, level, topic }: Props) {
  const params = new URLSearchParams();
  if (level) params.set('level', level);
  if (topic) params.set('topic', topic);
  const qs = params.toString();
  const src = qs ? `/vocab.html?${qs}` : '/vocab.html';
  return (
    <div className="chinese-wrap">
      <button className="back-btn" onClick={onBack}>← 返回</button>
      <iframe src={src} className="chinese-iframe" title="英语背单词" />
    </div>
  );
}
