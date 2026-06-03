import { useCallback, useEffect, useState } from 'react';
import { levelFromXp } from '../practice';
import type { MistakeRecord, StorageAdapter } from '../storage';
import { llmPayload, localSummaryText, summarize } from './summary';

interface Props {
  adapter: StorageAdapter;
  studentId: string;
  onExit: () => void;
}

const DIFF_LABEL: Record<string, string> = { basic: '基础', consolidate: '夯实', challenge: '拔高' };

export function ParentDashboard({ adapter, studentId, onExit }: Props) {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [xp, setXp] = useState(0);
  const [summaryText, setSummaryText] = useState('');
  const [summarySource, setSummarySource] = useState('');
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    const [ms, student] = await Promise.all([
      adapter.listMistakes(studentId),
      adapter.getStudent(studentId),
    ]);
    setMistakes(ms);
    setXp(student?.xp ?? 0);
  }, [adapter, studentId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const active = mistakes.filter((m) => !m.corrected);
  const summaryData = summarize(mistakes);
  const lvl = levelFromXp(xp);

  const generate = useCallback(async () => {
    setLoading(true);
    setSummarySource('');
    const payload = llmPayload(summaryData);
    try {
      const resp = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(String(resp.status));
      const j = (await resp.json()) as { summary?: string };
      if (!j.summary) throw new Error('empty');
      setSummaryText(j.summary);
      setSummarySource('AI');
    } catch {
      setSummaryText(localSummaryText(summaryData));
      setSummarySource('本地');
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mistakes]);

  const correct = useCallback(
    async (id?: number) => {
      if (id == null) return;
      await adapter.markMistakeCorrected(studentId, id);
      await reload();
    },
    [adapter, studentId, reload],
  );

  // group active mistakes by topic
  const byTopic = new Map<string, MistakeRecord[]>();
  for (const m of active) {
    const arr = byTopic.get(m.topicTitle) ?? [];
    arr.push(m);
    byTopic.set(m.topicTitle, arr);
  }
  const groups = [...byTopic.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="map parent">
      <header className="play-head">
        <button className="ghost" onClick={onExit}>
          ← 返回
        </button>
        <span className="phase-badge">👨‍👧 家长 · 错题本</span>
      </header>

      <div className="level-panel">
        <div className="level-row">
          <span className="lv-badge">Lv.{lvl.level}</span>
          <span className="xp-text">⭐ {xp} 经验</span>
          <span className="xp-next">待订正错题 {active.length} 道</span>
        </div>
      </div>

      <div className="summary-box">
        <button className="primary" onClick={generate} disabled={loading || active.length === 0}>
          {loading ? '正在生成…' : '✨ 一键总结'}
        </button>
        {summaryText && (
          <div className="summary-text">
            {summarySource && <span className="summary-src">{summarySource === 'AI' ? '🤖 AI 分析' : '📊 本地分析'}</span>}
            <pre>{summaryText}</pre>
          </div>
        )}
      </div>

      {active.length === 0 && <p className="empty">🎉 暂无待订正的错题。</p>}

      {groups.map(([topic, items]) => (
        <div key={topic} className="mistake-group">
          <div className="unit-title">
            {topic} · {items.length} 题
          </div>
          {items.map((m) => (
            <div key={m.id} className="mistake-card">
              <div className="mistake-head">
                {m.difficulty && <span className={`ped ped-${m.difficulty === 'challenge' ? 'formula' : m.difficulty === 'basic' ? 'concept' : 'procedure'}`}>{DIFF_LABEL[m.difficulty] ?? m.difficulty}</span>}
                <span className="mistake-prompt">{m.prompt}</span>
              </div>
              <div className="mistake-answers">
                <span className="ans-wrong">孩子答:{m.yourAnswer}</span>
                <span className="ans-right">正确:{m.correctAnswer}</span>
              </div>
              <button className="ghost mark-corrected" onClick={() => correct(m.id)}>
                ✓ 标为已订正
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
