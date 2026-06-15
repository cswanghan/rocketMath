// 每日打卡（连续学习 streak）。纯 localStorage，按 studentId 隔离（与 prep/child 一致）。
// 自动打卡：当天做过任意一道题即点亮。徽章按 longest（永久），庆祝按 current（本轮）。

export const MILESTONES = [3, 7, 14, 30] as const;
export const CHECKIN_XP = 5;

export interface StreakRecord {
  current: number;
  longest: number;
  lastDate: string; // 本地 YYYY-MM-DD
  days: string[]; // 活跃日期，去重、上限 60，用于周历点
  celebrated: number; // 本轮已庆祝到的最高里程碑
}

export interface StreakView {
  current: number;
  longest: number;
  doneToday: boolean;
  weekDots: boolean[]; // 周一→周日，7 个，true = 当天有学习
  badges: number[]; // 已解锁里程碑（longest 达到的）
}

const keyFor = (studentId: string) => `rm.streak.${studentId}`;

// 本地日期 YYYY-MM-DD（不用 UTC，避免跨时区把"今天"算错）
export function localDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayBefore(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return localDate(dt);
}

function read(studentId: string): StreakRecord | null {
  try {
    const raw = localStorage.getItem(keyFor(studentId));
    return raw ? (JSON.parse(raw) as StreakRecord) : null;
  } catch {
    return null;
  }
}

function write(studentId: string, rec: StreakRecord): void {
  try {
    localStorage.setItem(keyFor(studentId), JSON.stringify(rec));
  } catch {
    /* ignore quota / disabled */
  }
}

/** 答题时调用。按天幂等：同一天多次只在首次返回 firstToday=true。`now` 可注入用于测试。 */
export function recordCheckIn(studentId: string, now: Date = new Date()): { firstToday: boolean; current: number } {
  const today = localDate(now);
  const rec = read(studentId) ?? { current: 0, longest: 0, lastDate: '', days: [], celebrated: 0 };

  if (rec.lastDate === today) return { firstToday: false, current: rec.current };

  if (rec.lastDate === dayBefore(today)) {
    rec.current += 1;
  } else {
    rec.current = 1;
    rec.celebrated = 0; // 断档后新一轮，里程碑可重新庆祝
  }
  rec.longest = Math.max(rec.longest, rec.current);
  rec.lastDate = today;
  if (!rec.days.includes(today)) rec.days.push(today);
  if (rec.days.length > 60) rec.days = rec.days.slice(-60);

  write(studentId, rec);
  return { firstToday: true, current: rec.current };
}

/** 供首页卡片展示。`now` 可注入用于测试。 */
export function readStreak(studentId: string, now: Date = new Date()): StreakView {
  const rec = read(studentId);
  const today = localDate(now);
  if (!rec) {
    return { current: 0, longest: 0, doneToday: false, weekDots: weekDots(new Set(), now), badges: [] };
  }
  // 连击若断在昨天之前，展示时归零（仍未做今天且 lastDate 不是今天/昨天）
  let current = rec.current;
  if (rec.lastDate !== today && rec.lastDate !== dayBefore(today)) current = 0;
  return {
    current,
    longest: rec.longest,
    doneToday: rec.lastDate === today,
    weekDots: weekDots(new Set(rec.days), now),
    badges: MILESTONES.filter((m) => rec.longest >= m),
  };
}

/** 取走本轮新跨过的里程碑（取走即标记，避免重复庆祝）。`now` 可注入。 */
export function takeNewMilestone(studentId: string, now: Date = new Date()): number | null {
  const rec = read(studentId);
  if (!rec) return null;
  // 只在今天已打卡时考虑庆祝
  if (rec.lastDate !== localDate(now)) return null;
  const hit = [...MILESTONES].reverse().find((m) => rec.current >= m && rec.celebrated < m);
  if (hit == null) return null;
  rec.celebrated = hit;
  write(studentId, rec);
  return hit;
}

// 本周（周一起）7 天是否各有学习
function weekDots(days: Set<string>, now: Date): boolean[] {
  const offset = (now.getDay() + 6) % 7; // 周一=0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return days.has(localDate(d));
  });
}
