// In-memory StorageAdapter. Used by tests and as a fallback when IndexedDB is
// unavailable. Deep-clones on the way in/out so callers can't mutate stored
// snapshots by reference.
import type { TrackState } from '../engine';
import type { GameEvent, PracticeRecord, RaceResult, StorageAdapter, Student } from './types';

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export class MemoryAdapter implements StorageAdapter {
  private students = new Map<string, Student>();
  private trackStates = new Map<string, TrackState>();
  private events: GameEvent[] = [];
  private races: RaceResult[] = [];
  private raceSeq = 0;
  private practice = new Map<string, PracticeRecord>();

  private key(studentId: string, trackId: string): string {
    return `${studentId}::${trackId}`;
  }

  async getStudent(id: string): Promise<Student | null> {
    const s = this.students.get(id);
    return s ? clone(s) : null;
  }

  async putStudent(student: Student): Promise<void> {
    this.students.set(student.id, clone(student));
  }

  async getTrackState(studentId: string, trackId: string): Promise<TrackState | null> {
    const s = this.trackStates.get(this.key(studentId, trackId));
    return s ? clone(s) : null;
  }

  async putTrackState(studentId: string, trackId: string, state: TrackState): Promise<void> {
    this.trackStates.set(this.key(studentId, trackId), clone(state));
  }

  async appendEvent(event: GameEvent): Promise<void> {
    this.events.push({ ...clone(event), id: this.events.length + 1 });
  }

  async putRaceResult(result: RaceResult): Promise<void> {
    this.races.push({ ...clone(result), id: ++this.raceSeq });
  }

  async listRaceResults(studentId: string, trackId: string): Promise<RaceResult[]> {
    return this.races
      .filter((r) => r.studentId === studentId && r.trackId === trackId)
      .map(clone);
  }

  async getPractice(studentId: string, setId: string): Promise<PracticeRecord | null> {
    const r = this.practice.get(this.key(studentId, setId));
    return r ? clone(r) : null;
  }

  async putPractice(record: PracticeRecord): Promise<void> {
    this.practice.set(this.key(record.studentId, record.setId), clone(record));
  }

  // test-only introspection
  _allEvents(): GameEvent[] {
    return this.events.map(clone);
  }
}
