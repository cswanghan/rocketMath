import { validatePack, type ContentPack } from '../engine';
import type { KnowledgeMap } from '../map/types';
import type { PracticePack, ProblemSet } from '../practice';

export interface GradeContent {
  grade: number;
  pack: ContentPack;
  practicePack: PracticePack;
  knowledgeMap: KnowledgeMap;
}

const cache = new Map<number, GradeContent>();

export async function loadGrade(grade: number): Promise<GradeContent> {
  const cached = cache.get(grade);
  if (cached) return cached;

  let fluency: ContentPack;
  let practice: PracticePack;
  let map: KnowledgeMap;

  switch (grade) {
    case 3: {
      const [f, p, m] = await Promise.all([
        import('../../content/grade3_math_fluency_pack.json'),
        import('../../content/grade3_practice_pack.json'),
        import('../../content/grade3_knowledge_map.json'),
      ]);
      fluency = f.default as unknown as ContentPack;
      practice = p.default as unknown as PracticePack;
      map = m.default as unknown as KnowledgeMap;
      break;
    }
    case 4: {
      const [f, p, m] = await Promise.all([
        import('../../content/grade4_math_fluency_pack.json'),
        import('../../content/grade4_practice_pack.json'),
        import('../../content/grade4_knowledge_map.json'),
      ]);
      fluency = f.default as unknown as ContentPack;
      practice = p.default as unknown as PracticePack;
      map = m.default as unknown as KnowledgeMap;
      break;
    }
    case 5: {
      const [f, p, m] = await Promise.all([
        import('../../content/grade5_math_fluency_pack.json'),
        import('../../content/grade5_practice_pack.json'),
        import('../../content/grade5_knowledge_map.json'),
      ]);
      fluency = f.default as unknown as ContentPack;
      practice = p.default as unknown as PracticePack;
      map = m.default as unknown as KnowledgeMap;
      break;
    }
    case 6: {
      const [f, p, m] = await Promise.all([
        import('../../content/grade6_math_fluency_pack.json'),
        import('../../content/grade6_practice_pack.json'),
        import('../../content/grade6_knowledge_map.json'),
      ]);
      fluency = f.default as unknown as ContentPack;
      practice = p.default as unknown as PracticePack;
      map = m.default as unknown as KnowledgeMap;
      break;
    }
    default:
      throw new Error(`Unsupported grade: ${grade}`);
  }

  validatePack(fluency);
  const content: GradeContent = { grade, pack: fluency, practicePack: practice, knowledgeMap: map };
  cache.set(grade, content);
  return content;
}

export function getSetFromPack(pack: PracticePack, id: string): ProblemSet | undefined {
  return pack.sets.find((s) => s.id === id);
}
