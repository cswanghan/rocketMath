// 家庭/孩子档案客户端 + 当前孩子(active child)本地状态。
export interface Child {
  id: number;
  name: string;
  avatar: string;
  grade: number | null;
}

const ACTIVE_KEY = 'rm.child';

export function getActiveChild(): Child | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as Child) : null;
  } catch {
    return null;
  }
}

export function setActiveChild(c: Child | null): void {
  try {
    if (c) localStorage.setItem(ACTIVE_KEY, JSON.stringify(c));
    else localStorage.removeItem(ACTIVE_KEY);
    // expose to the global tracker (/track.js reads this for per-child 埋点)
    (window as unknown as { rmChildId?: number | null }).rmChildId = c ? c.id : null;
  } catch {
    /* ignore */
  }
}

// 学习数据(本地 IndexedDB / 云端)按孩子隔离的 student id。
// null(家长本人/未选档案)沿用旧的 'local' 常量, 保留老用户已有的本地进度。
export function studentIdFor(c: Child | null): string {
  return c ? `child_${c.id}` : 'local';
}

function headers(): Record<string, string> {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function listChildren(): Promise<Child[]> {
  try {
    const r = await fetch('/api/family/children', { headers: headers() });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.children || []) as Child[];
  } catch {
    return [];
  }
}

export async function createChild(input: { name: string; avatar?: string; grade?: number | null }): Promise<Child> {
  const r = await fetch('/api/family/children', { method: 'POST', headers: headers(), body: JSON.stringify(input) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || '创建失败');
  return d as Child;
}

export async function updateChild(input: { id: number; name?: string; avatar?: string; grade?: number | null }): Promise<void> {
  const r = await fetch('/api/family/children', { method: 'PATCH', headers: headers(), body: JSON.stringify(input) });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || '修改失败');
  }
}

export async function deleteChild(id: number): Promise<void> {
  const r = await fetch('/api/family/children', { method: 'DELETE', headers: headers(), body: JSON.stringify({ id }) });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || '删除失败');
  }
}
