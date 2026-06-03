// Knowledge-map types. The map is the navigation layer above the two engines:
// fluency topics route to the timed-drill engine, everything else to Practice.
export type Pedagogy = 'fluency' | 'procedure' | 'formula' | 'concept' | 'logic' | 'data';
export type TopicStatus = 'ready' | 'coming_soon';
export type Term = 'upper' | 'lower';

export interface Topic {
  id: string;
  unitId: string;
  title: string;
  pedagogy: Pedagogy;
  dependsOn: string[];
  status: TopicStatus;
  fluencyTrackId?: string; // pedagogy === 'fluency'
  problemSetId?: string; // other pedagogies (P0b+)
}

export interface Unit {
  id: string;
  term: Term;
  index: number;
  title: string;
  topicIds: string[];
}

export interface KnowledgeMap {
  textbook: string;
  grade: number;
  units: Unit[];
  topics: Topic[];
}
