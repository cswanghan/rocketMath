// Meaningful line-art for the subject cards (replaces decorative emoji).
// Each illustration is a single-color hand-drawn-style SVG keyed to the card.
type Kind = 'math' | 'chinese' | 'english' | 'examCal';

const INK: Record<Kind, string> = {
  math: '#2f9be0',
  chinese: '#c2632e',
  english: '#6a47b0',
  examCal: '#19796a',
};

export function CardArt({ kind }: { kind: Kind }) {
  const c = INK[kind];
  return (
    <span className="card-art" aria-hidden="true">
      <svg viewBox="0 0 240 56" width="100%" height="56" fill="none">
        {kind === 'math' && (
          // 计算流畅度: 上升曲线 (越练越快)
          <>
            <path
              d="M10 46 C 48 45, 76 38, 110 31 S 182 14, 230 9"
              stroke={c}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="230" cy="9" r="4.5" fill={c} />
            <circle cx="110" cy="31" r="3" fill={c} opacity="0.55" />
          </>
        )}

        {kind === 'chinese' && (
          // 生字学习: 田字格 + 笔顺练习
          <>
            <rect x="6" y="8" width="40" height="40" rx="7" stroke={c} strokeWidth="2.6" />
            <path d="M26 8 V48 M6 28 H46" stroke={c} strokeWidth="1.4" strokeDasharray="3 4" opacity="0.45" />
            <path d="M66 17 C 112 11, 168 13, 232 10" stroke={c} strokeWidth="4" strokeLinecap="round" />
            <path d="M66 31 C 104 27, 152 29, 212 27" stroke={c} strokeWidth="3.2" strokeLinecap="round" opacity="0.7" />
            <path d="M66 45 C 96 43, 134 44, 186 43" stroke={c} strokeWidth="2.6" strokeLinecap="round" opacity="0.48" />
          </>
        )}

        {kind === 'examCal' && (
          // 考试日历: 台历 + 圈出的考试日 + 对勾
          <>
            <rect x="10" y="12" width="52" height="38" rx="8" stroke={c} strokeWidth="2.6" />
            <path d="M10 24 H62" stroke={c} strokeWidth="2" opacity="0.55" />
            <path d="M22 8 V16 M50 8 V16" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="44" cy="38" r="7" stroke={c} strokeWidth="2.2" opacity="0.8" />
            <circle cx="25" cy="33" r="2.2" fill={c} opacity="0.45" />
            <circle cx="34" cy="42" r="2.2" fill={c} opacity="0.45" />
            <path d="M86 30 l 7 7 l 14 -16" stroke={c} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M126 38 C 156 32, 192 30, 230 26" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
            <circle cx="230" cy="26" r="4" fill={c} />
          </>
        )}

        {kind === 'english' && (
          // 背单词: 单词卡片 + 已掌握
          <>
            <rect x="16" y="16" width="78" height="34" rx="9" stroke={c} strokeWidth="2.6" opacity="0.5"
              transform="rotate(-7 55 33)" />
            <rect x="24" y="11" width="78" height="34" rx="9" fill="#fff" stroke={c} strokeWidth="2.6" />
            <text x="40" y="34" fontFamily="system-ui, sans-serif" fontSize="17" fontWeight="700" fill={c}>Aa</text>
            <path d="M150 28 l 8 8 l 16 -18" stroke={c} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="196" cy="22" r="3.4" fill={c} />
            <circle cx="212" cy="22" r="3.4" fill={c} />
            <circle cx="228" cy="22" r="3.4" fill={c} opacity="0.4" />
          </>
        )}
      </svg>
    </span>
  );
}
