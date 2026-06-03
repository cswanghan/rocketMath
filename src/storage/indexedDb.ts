// IndexedDB StorageAdapter — the primary persistence backend (SPEC §3).
// Verified in the browser (CDP reload-restore); node unit tests cover the
// adapter contract via MemoryAdapter instead, to avoid a fake-indexeddb dep.
import type { TrackState } from '../engine';
import { MemoryAdapter } from './memory';
import type { GameEvent, PracticeRecord, RaceResult, StorageAdapter, Student } from './types';

const DB_NAME = 'rocket-math';
const DB_VERSION = 2;
const STORE_STUDENTS = 'students';
const STORE_TRACK_STATES = 'trackStates';
const STORE_EVENTS = 'events';
const STORE_RACES = 'raceResults';
const STORE_PRACTICE = 'practiceStates';

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class IndexedDbAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = new Promise((resolve, reject) => {
      const open = indexedDB.open(DB_NAME, DB_VERSION);
      open.onupgradeneeded = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains(STORE_STUDENTS)) {
          db.createObjectStore(STORE_STUDENTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_TRACK_STATES)) {
          db.createObjectStore(STORE_TRACK_STATES, { keyPath: ['studentId', 'trackId'] });
        }
        if (!db.objectStoreNames.contains(STORE_EVENTS)) {
          const ev = db.createObjectStore(STORE_EVENTS, { keyPath: 'id', autoIncrement: true });
          ev.createIndex('byStudentTrack', ['studentId', 'trackId']);
        }
        if (!db.objectStoreNames.contains(STORE_RACES)) {
          const rc = db.createObjectStore(STORE_RACES, { keyPath: 'id', autoIncrement: true });
          rc.createIndex('byStudentTrack', ['studentId', 'trackId']);
        }
        if (!db.objectStoreNames.contains(STORE_PRACTICE)) {
          db.createObjectStore(STORE_PRACTICE, { keyPath: ['studentId', 'setId'] });
        }
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
  }

  private async tx(store: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.dbPromise;
    return db.transaction(store, mode).objectStore(store);
  }

  async getStudent(id: string): Promise<Student | null> {
    const store = await this.tx(STORE_STUDENTS, 'readonly');
    return (await reqToPromise(store.get(id))) ?? null;
  }

  async putStudent(student: Student): Promise<void> {
    const store = await this.tx(STORE_STUDENTS, 'readwrite');
    await reqToPromise(store.put(student));
  }

  async addXp(studentId: string, amount: number): Promise<number> {
    const store = await this.tx(STORE_STUDENTS, 'readwrite');
    const existing = (await reqToPromise(store.get(studentId))) as Student | undefined;
    const s: Student = existing ?? { id: studentId, createdAt: Date.now() };
    const xp = (s.xp ?? 0) + amount;
    await reqToPromise(store.put({ ...s, xp }));
    return xp;
  }

  async getTrackState(studentId: string, trackId: string): Promise<TrackState | null> {
    const store = await this.tx(STORE_TRACK_STATES, 'readonly');
    const row = await reqToPromise<{ state: TrackState } | undefined>(
      store.get([studentId, trackId]) as IDBRequest<{ state: TrackState } | undefined>,
    );
    return row?.state ?? null;
  }

  async putTrackState(studentId: string, trackId: string, state: TrackState): Promise<void> {
    const store = await this.tx(STORE_TRACK_STATES, 'readwrite');
    await reqToPromise(store.put({ studentId, trackId, state, updatedAt: Date.now() }));
  }

  async appendEvent(event: GameEvent): Promise<void> {
    const store = await this.tx(STORE_EVENTS, 'readwrite');
    await reqToPromise(store.add(event));
  }

  async putRaceResult(result: RaceResult): Promise<void> {
    const store = await this.tx(STORE_RACES, 'readwrite');
    await reqToPromise(store.add(result));
  }

  async listRaceResults(studentId: string, trackId: string): Promise<RaceResult[]> {
    const store = await this.tx(STORE_RACES, 'readonly');
    const idx = store.index('byStudentTrack');
    return await reqToPromise(idx.getAll([studentId, trackId]));
  }

  async getPractice(studentId: string, setId: string): Promise<PracticeRecord | null> {
    const store = await this.tx(STORE_PRACTICE, 'readonly');
    return (await reqToPromise(store.get([studentId, setId]))) ?? null;
  }

  async putPractice(record: PracticeRecord): Promise<void> {
    const store = await this.tx(STORE_PRACTICE, 'readwrite');
    await reqToPromise(store.put(record));
  }
}

/** Pick the best available adapter: IndexedDB when present, else an in-memory
 *  fallback (progress won't survive a refresh, but the app still runs). */
export function createDefaultAdapter(): StorageAdapter {
  if (typeof indexedDB !== 'undefined') return new IndexedDbAdapter();
  // eslint-disable-next-line no-console
  console.warn('IndexedDB unavailable — progress will not persist this session.');
  return new MemoryAdapter();
}
