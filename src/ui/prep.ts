// 「我要备考」目标持久化 + 词汇 level 映射。
// 备考目标按 studentId 隔离存 localStorage（与 family.ts 的多孩子体系一致）。

export interface PrepTarget {
  seriesId: string;
  startedAt: number;
  // 上次在备考页算出的完成度，供首页「继续备考」胶囊直接展示，避免在首页重算
  masteredCount?: number;
  total?: number;
}

const keyFor = (studentId: string) => `rm.prep.${studentId}`;

export function readPrepTarget(studentId: string): PrepTarget | null {
  try {
    const raw = localStorage.getItem(keyFor(studentId));
    return raw ? (JSON.parse(raw) as PrepTarget) : null;
  } catch {
    return null;
  }
}

export function savePrepTarget(studentId: string, seriesId: string): void {
  try {
    const existing = readPrepTarget(studentId);
    const next: PrepTarget =
      existing && existing.seriesId === seriesId
        ? existing
        : { seriesId, startedAt: Date.now() };
    localStorage.setItem(keyFor(studentId), JSON.stringify(next));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function updatePrepProgress(studentId: string, masteredCount: number, total: number): void {
  try {
    const existing = readPrepTarget(studentId);
    if (!existing) return;
    localStorage.setItem(
      keyFor(studentId),
      JSON.stringify({ ...existing, masteredCount, total }),
    );
  } catch {
    /* ignore */
  }
}

export function clearPrepTarget(studentId: string): void {
  try {
    localStorage.removeItem(keyFor(studentId));
  } catch {
    /* ignore */
  }
}

// vocabLink.level（"ket"/"pet"）→ vocab.html 的 ?level= 取值。
export function vocabLevelParam(level: string): string {
  if (level === 'ket') return 'a2-key';
  if (level === 'pet') return 'b1-preliminary';
  return 'all';
}
