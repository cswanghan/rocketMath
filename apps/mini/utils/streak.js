// 每日打卡 (连续学习 streak)。移植自 Web 端 src/ui/streak.ts, localStorage → wx.storage。
// 按 studentId 隔离, 与 Web 端 key 语义一致 (`rm.streak.<studentId>`), 便于日后云同步对账。

const MILESTONES = [3, 7, 14, 30];
const CHECKIN_XP = 5;
const MAX_DAYS = 60;
// 周一为起点 —— 与 Web 端首页的周历一致
const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

const keyFor = (studentId) => `rm.streak.${studentId}`;

/** 本地日期 YYYY-MM-DD。不用 UTC, 否则跨时区会把"今天"算错。 */
function localDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayBefore(date) {
  const parts = date.split('-').map(Number);
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  dt.setDate(dt.getDate() - 1);
  return localDate(dt);
}

function read(studentId) {
  try {
    return wx.getStorageSync(keyFor(studentId)) || null;
  } catch (e) {
    return null;
  }
}

function write(studentId, rec) {
  try {
    wx.setStorageSync(keyFor(studentId), rec);
  } catch (e) {
    /* 存储满 —— 打卡丢一次不影响做题 */
  }
}

/** 答题时调用。按天幂等: 同一天多次只在首次返回 firstToday=true。 */
function recordCheckIn(studentId, now) {
  const today = localDate(now || new Date());
  const rec = read(studentId) || { current: 0, longest: 0, lastDate: '', days: [], celebrated: 0 };
  if (rec.lastDate === today) return { firstToday: false, current: rec.current };

  rec.current = rec.lastDate === dayBefore(today) ? rec.current + 1 : 1;
  rec.lastDate = today;
  rec.longest = Math.max(rec.longest || 0, rec.current);
  rec.days = (rec.days || []).filter((d) => d !== today).concat(today).slice(-MAX_DAYS);
  write(studentId, rec);
  return { firstToday: true, current: rec.current };
}

/** 首页展示用视图: 连续天数 / 今日是否已打卡 / 本周七个点 / 已解锁徽章。 */
function readStreak(studentId, now) {
  const today = localDate(now || new Date());
  const rec = read(studentId);
  if (!rec) {
    return {
      current: 0,
      longest: 0,
      doneToday: false,
      week: WEEK_LABELS.map((l) => ({ label: l, on: false })),
      badges: [],
    };
  }
  // 昨天之前就断了 → current 归零展示 (存量不动, 下次打卡自然重算)
  const alive = rec.lastDate === today || rec.lastDate === dayBefore(today);
  const base = now || new Date();
  // 周一为一周起点: getDay() 里周日是 0, 换算成 6
  const offsetToMonday = (base.getDay() + 6) % 7;
  const days = rec.days || [];
  const week = WEEK_LABELS.map((label, i) => {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - offsetToMonday + i);
    return { label: label, on: days.indexOf(localDate(d)) >= 0 };
  });
  return {
    current: alive ? rec.current : 0,
    longest: rec.longest || 0,
    doneToday: rec.lastDate === today,
    week: week,
    badges: MILESTONES.filter((m) => (rec.longest || 0) >= m),
  };
}

/** 取一次"本轮新达成的里程碑"用于庆祝, 取走即清 (幂等)。 */
function takeNewMilestone(studentId) {
  const rec = read(studentId);
  if (!rec) return null;
  const hit = MILESTONES.filter((m) => rec.current >= m && m > (rec.celebrated || 0));
  if (hit.length === 0) return null;
  const top = hit[hit.length - 1];
  rec.celebrated = top;
  write(studentId, rec);
  return top;
}

module.exports = { MILESTONES, CHECKIN_XP, localDate, recordCheckIn, readStreak, takeNewMilestone };
