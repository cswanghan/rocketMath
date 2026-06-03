// Mistake analytics: groups the 错题本 into per-topic stats, produces a local
// deterministic summary (always available, offline), and a compact payload for
// the LLM summary endpoint.
import type { MistakeRecord } from '../storage';

const DIFF_LABEL: Record<string, string> = {
  basic: '基础',
  consolidate: '夯实',
  challenge: '拔高',
};

export interface TopicStat {
  topicTitle: string;
  count: number;
  byDifficulty: Record<string, number>;
  examples: { prompt: string; yourAnswer: string; correctAnswer: string }[];
}

export interface MistakeSummary {
  total: number;
  topics: TopicStat[]; // sorted by count desc
}

export function summarize(mistakes: MistakeRecord[]): MistakeSummary {
  const active = mistakes.filter((m) => !m.corrected);
  const byTopic = new Map<string, TopicStat>();
  for (const m of active) {
    let t = byTopic.get(m.topicTitle);
    if (!t) {
      t = { topicTitle: m.topicTitle, count: 0, byDifficulty: {}, examples: [] };
      byTopic.set(m.topicTitle, t);
    }
    t.count++;
    const d = m.difficulty ?? 'fluency';
    t.byDifficulty[d] = (t.byDifficulty[d] ?? 0) + 1;
    if (t.examples.length < 3) {
      t.examples.push({ prompt: m.prompt, yourAnswer: m.yourAnswer, correctAnswer: m.correctAnswer });
    }
  }
  const topics = [...byTopic.values()].sort((a, b) => b.count - a.count);
  return { total: active.length, topics };
}

/** Deterministic, offline parent summary — also the fallback when the LLM
 *  endpoint is unavailable. */
export function localSummaryText(s: MistakeSummary): string {
  if (s.total === 0) return '太棒了!目前没有未订正的错题。继续保持 👍';
  const lines: string[] = [];
  lines.push(`共有 ${s.total} 道待订正错题。`);
  const top = s.topics.slice(0, 3);
  lines.push('');
  lines.push('📌 最需要加强的知识点:');
  for (const t of top) {
    const diffs = Object.entries(t.byDifficulty)
      .map(([d, n]) => `${DIFF_LABEL[d] ?? d} ${n} 题`)
      .join('、');
    lines.push(`• ${t.topicTitle}:错 ${t.count} 题(${diffs})`);
  }
  lines.push('');
  lines.push('💡 建议:针对上面的薄弱点,先和孩子一起把错题重新做一遍,弄懂方法,再用对应知识点的「基础关」巩固,最后挑战「拔高关」。');
  return lines.join('\n');
}

/** Compact, privacy-light payload for the LLM (no PII, just topic + samples). */
export function llmPayload(s: MistakeSummary) {
  return {
    total: s.total,
    topics: s.topics.slice(0, 8).map((t) => ({
      topic: t.topicTitle,
      wrong: t.count,
      byDifficulty: t.byDifficulty,
      examples: t.examples,
    })),
  };
}
