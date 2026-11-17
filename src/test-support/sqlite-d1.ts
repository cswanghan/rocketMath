// Real SQLite SQL/rollback tests, in memory only. D1's batch contract is modeled
// here; these are not remote D1 deployment/integration tests. Requires Node 22.13+.
// @ts-ignore node typings are not installed in this repository.
import { createRequire } from 'node:module';
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
// @ts-ignore node typings are not installed in this repository.
import { readFileSync } from 'node:fs';

export class SQLiteD1 {
  sqlite = new DatabaseSync(':memory:');
  batches = 0;
  beforeBatch?: () => void;
  failReads = false;

  constructor() {
    this.sqlite.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
    for (const name of ['family', 'shengzi', 'auth_codes', 'native_membership']) {
      this.sqlite.exec(readFileSync(new URL(`../db/migrations/${name}.sql`, import.meta.url), 'utf8'));
    }
  }

  prepare(sql: string) { return new Statement(this, sql); }

  async batch(statements: Statement[]) {
    this.batches++;
    this.beforeBatch?.();
    this.sqlite.exec('BEGIN');
    try {
      const results = statements.map(s => s.execute());
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }
}

class Statement {
  values: unknown[] = [];
  constructor(private db: SQLiteD1, private sql: string) {}
  bind(...values: unknown[]) { this.values = values; return this; }
  execute() {
    const results = this.db.sqlite.prepare(this.sql).all(...this.values);
    return { success: true, results, meta: {} };
  }
  async first<T>() {
    if (this.db.failReads) throw new Error('injected read failure');
    return (this.execute().results[0] ?? null) as T | null;
  }
  async all<T>() {
    if (this.db.failReads) throw new Error('injected read failure');
    return this.execute() as { success: boolean; results: T[] };
  }
  async run() { return this.execute(); }
}
