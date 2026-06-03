import mapJson from '../../content/grade3_knowledge_map.json';
import type { KnowledgeMap, Pedagogy, Topic, Unit } from './types';

export const knowledgeMap = mapJson as unknown as KnowledgeMap;

export const PEDAGOGY_LABEL: Record<Pedagogy, string> = {
  fluency: '口算',
  procedure: '竖式',
  formula: '公式',
  concept: '概念',
  logic: '推理',
  data: '数据',
};

export function unitsByTerm(map: KnowledgeMap, term: Unit['term']): Unit[] {
  return map.units.filter((u) => u.term === term).sort((a, b) => a.index - b.index);
}

export function topicsOf(map: KnowledgeMap, unit: Unit): Topic[] {
  return unit.topicIds
    .map((id) => map.topics.find((t) => t.id === id))
    .filter((t): t is Topic => Boolean(t));
}

export function topicById(map: KnowledgeMap, id: string): Topic | undefined {
  return map.topics.find((t) => t.id === id);
}
