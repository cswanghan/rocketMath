import { beforeEach, describe, expect, it } from 'vitest';
import { localDate, readStreak, recordCheckIn, takeNewMilestone } from './streak';

// 内存版 localStorage（vitest 环境为 node，无 localStorage）
class MemLS {
  store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

const SID = 'local';
const D = (y: number, m: number, day: number) => new Date(y, m - 1, day); // m 为 1-12

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = new MemLS();
});

describe('streak / 每日打卡', () => {
  it('当天首次返回 firstToday，再次返回 false 且连击不变', () => {
    const day = D(2026, 6, 1);
    expect(recordCheckIn(SID, day)).toEqual({ firstToday: true, current: 1 });
    expect(recordCheckIn(SID, day)).toEqual({ firstToday: false, current: 1 });
  });

  it('连续天数自增', () => {
    expect(recordCheckIn(SID, D(2026, 6, 1)).current).toBe(1);
    expect(recordCheckIn(SID, D(2026, 6, 2)).current).toBe(2);
    expect(recordCheckIn(SID, D(2026, 6, 3)).current).toBe(3);
  });

  it('断档后重置为 1', () => {
    recordCheckIn(SID, D(2026, 6, 1));
    recordCheckIn(SID, D(2026, 6, 2));
    // 跳过 6/3
    expect(recordCheckIn(SID, D(2026, 6, 4)).current).toBe(1);
  });

  it('longest 记录历史最佳', () => {
    recordCheckIn(SID, D(2026, 6, 1));
    recordCheckIn(SID, D(2026, 6, 2));
    recordCheckIn(SID, D(2026, 6, 3)); // current=3
    recordCheckIn(SID, D(2026, 6, 5)); // 断档 current=1
    expect(readStreak(SID, D(2026, 6, 5)).longest).toBe(3);
    expect(readStreak(SID, D(2026, 6, 5)).current).toBe(1);
  });

  it('readStreak: 今日已打卡 + 周历点 + 徽章按 longest', () => {
    for (let d = 1; d <= 3; d++) recordCheckIn(SID, D(2026, 6, d)); // 周一~周三 (6/1 是周一)
    const v = readStreak(SID, D(2026, 6, 3));
    expect(v.doneToday).toBe(true);
    expect(v.current).toBe(3);
    expect(v.weekDots.slice(0, 3)).toEqual([true, true, true]);
    expect(v.weekDots.slice(3)).toEqual([false, false, false, false]);
    expect(v.badges).toEqual([3]); // 达到 3 天里程碑
  });

  it('未做今天且连击已断,展示 current 归零但 longest 保留', () => {
    recordCheckIn(SID, D(2026, 6, 1));
    recordCheckIn(SID, D(2026, 6, 2)); // current=2
    const v = readStreak(SID, D(2026, 6, 10)); // 隔了很多天没打卡
    expect(v.current).toBe(0);
    expect(v.doneToday).toBe(false);
    expect(v.longest).toBe(2);
  });

  it('takeNewMilestone: 跨过即返回一次,重复返回 null', () => {
    for (let d = 1; d <= 3; d++) recordCheckIn(SID, D(2026, 6, d));
    expect(takeNewMilestone(SID, D(2026, 6, 3))).toBe(3);
    expect(takeNewMilestone(SID, D(2026, 6, 3))).toBeNull();
  });

  it('takeNewMilestone: 未达里程碑返回 null', () => {
    recordCheckIn(SID, D(2026, 6, 1));
    recordCheckIn(SID, D(2026, 6, 2)); // current=2 < 3
    expect(takeNewMilestone(SID, D(2026, 6, 2))).toBeNull();
  });

  it('断档新一轮可重新庆祝里程碑', () => {
    for (let d = 1; d <= 3; d++) recordCheckIn(SID, D(2026, 6, d));
    expect(takeNewMilestone(SID, D(2026, 6, 3))).toBe(3);
    // 断档后重新连 3 天 (6/10~6/12)
    for (let d = 10; d <= 12; d++) recordCheckIn(SID, D(2026, 6, d));
    expect(takeNewMilestone(SID, D(2026, 6, 12))).toBe(3);
  });

  it('localDate 用本地时区格式化', () => {
    expect(localDate(D(2026, 6, 5))).toBe('2026-06-05');
    expect(localDate(D(2026, 12, 31))).toBe('2026-12-31');
  });
});
