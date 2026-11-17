import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { extraFluencyTracks, FluencyTrackCard, TopicCard } from './KnowledgeMap';
import type { ContentPack } from '../engine';
import type { KnowledgeMap } from '../map/types';
import grade3Pack from '../../content/grade3_math_fluency_pack.json';
import grade4Pack from '../../content/grade4_math_fluency_pack.json';
import grade5Pack from '../../content/grade5_math_fluency_pack.json';
import grade6Pack from '../../content/grade6_math_fluency_pack.json';
import grade7Pack from '../../content/grade7_math_fluency_pack.json';
import grade8Pack from '../../content/grade8_math_fluency_pack.json';
import grade9Pack from '../../content/grade9_math_fluency_pack.json';
import grade3Map from '../../content/grade3_knowledge_map.json';
import grade4Map from '../../content/grade4_knowledge_map.json';
import grade5Map from '../../content/grade5_knowledge_map.json';
import grade6Map from '../../content/grade6_knowledge_map.json';
import grade7Map from '../../content/grade7_knowledge_map.json';
import grade8Map from '../../content/grade8_knowledge_map.json';
import grade9Map from '../../content/grade9_knowledge_map.json';

const grades = [
  [3, grade3Pack, grade3Map], [4, grade4Pack, grade4Map], [5, grade5Pack, grade5Map],
  [6, grade6Pack, grade6Map], [7, grade7Pack, grade7Map], [8, grade8Pack, grade8Map],
  [9, grade9Pack, grade9Map],
] as const;

type Button = ReactElement<{ children?: ReactNode; className?: string; 'aria-label'?: string; onClick: () => void }>;
function buttons(node: ReactNode): Button[] {
  if (Array.isArray(node)) return node.flatMap(buttons);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  if (node.type === 'button') return [node as Button];
  return buttons(node.props.children);
}

// Call the real stateless cards and invoke the callbacks attached to their
// rendered buttons. This catches the former early return hiding oral routes.
describe('knowledge-map practice / oral route coexistence', () => {
  it.each(grades)('grade %i keeps every enabled track reachable without changing map data', (_grade, rawPack, rawMap) => {
    const pack = rawPack as ContentPack;
    const map = rawMap as KnowledgeMap;
    const mapped = map.topics.filter(topic => topic.status === 'ready' && topic.fluencyTrackId)
      .map(topic => topic.fluencyTrackId!);
    const extra = extraFluencyTracks(pack, map).map(track => track.trackId);
    const reachable = new Set([...mapped, ...extra]);
    expect([...reachable].sort()).toEqual(pack.tracks.filter(track => track.enabled).map(track => track.trackId).sort());
    expect(extra).toEqual(map.grade === 7 ? ['rational_mul_div'] : []);
  });

  it.each(grades.slice(3))('grade %i dual cards route practice, oral and race independently', (grade, rawPack, rawMap) => {
    const pack = rawPack as ContentPack;
    const map = rawMap as KnowledgeMap;
    const dual = map.topics.filter(topic => topic.status === 'ready' && topic.problemSetId && topic.fluencyTrackId);
    const expected: Record<number, number> = { 6: 4, 7: 3, 8: 5, 9: 5 };
    expect(dual).toHaveLength(expected[grade]);
    for (const topic of dual) {
      const onPractice = vi.fn(), onPlay = vi.fn(), onRace = vi.fn();
      const rendered = TopicCard({ topic, pack, prog: { completed: ['A'], current: 'B' },
        prac: { completed: true, bestFirstTry: 8, total: 10 }, onPractice, onPlay, onRace });
      const controls = buttons(rendered);
      expect(controls).toHaveLength(3);
      const primary = controls.find(button => button.props.className === 'topic-main')!;
      primary.props.onClick();
      expect(onPractice).toHaveBeenCalledTimes(1);
      expect(onPractice).toHaveBeenCalledWith(topic.problemSetId);
      expect(onPlay).not.toHaveBeenCalled();
      expect(onRace).not.toHaveBeenCalled();
      controls.find(button => button.props['aria-label']?.endsWith('口算练习'))!.props.onClick();
      expect(onPlay).toHaveBeenCalledTimes(1);
      expect(onPlay).toHaveBeenCalledWith(topic.fluencyTrackId);
      expect(onPractice).toHaveBeenCalledTimes(1);
      controls.find(button => button.props['aria-label']?.endsWith('竞速'))!.props.onClick();
      expect(onRace).toHaveBeenCalledTimes(1);
      expect(onRace).toHaveBeenCalledWith(topic.fluencyTrackId);
    }
  });

  it('routes the unmapped rational multiplication track through the same oral/race callbacks', () => {
    const [track] = extraFluencyTracks(grade7Pack as ContentPack, grade7Map as KnowledgeMap);
    const onPlay = vi.fn(), onRace = vi.fn();
    const controls = buttons(FluencyTrackCard({ track, prog: { completed: ['A'], current: 'B' }, onPlay, onRace }));
    expect(controls).toHaveLength(2);
    controls[0].props.onClick();
    controls[1].props.onClick();
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledWith('rational_mul_div');
    expect(onRace).toHaveBeenCalledTimes(1);
    expect(onRace).toHaveBeenCalledWith('rational_mul_div');
  });

  it('does not expose disabled tracks as extras or secondary actions', () => {
    const pack = structuredClone(grade7Pack) as ContentPack;
    pack.tracks.forEach(track => { track.enabled = false; });
    expect(extraFluencyTracks(pack, grade7Map as KnowledgeMap)).toEqual([]);
    const topic = (grade7Map as KnowledgeMap).topics.find(item => item.problemSetId && item.fluencyTrackId)!;
    const onPractice = vi.fn(), onPlay = vi.fn(), onRace = vi.fn();
    const controls = buttons(TopicCard({ topic, pack, onPractice, onPlay, onRace }));
    expect(controls).toHaveLength(1);
    controls[0].props.onClick();
    expect(onPractice).toHaveBeenCalledTimes(1);
    expect(onPractice).toHaveBeenCalledWith(topic.problemSetId);
    expect(onPlay).not.toHaveBeenCalled();
    expect(onRace).not.toHaveBeenCalled();
  });
});
