// "先试再登录": 未登录用户每个科目可免费体验 TRIAL_LIMIT 次操作。
// 计数在 /track.js 里完成 (它在主应用和各 iframe 都跑、共享 localStorage),
// 这里只读计数做"进入科目时"的拦截判断。
export const TRIAL_LIMIT = 10;

export function trialCount(subject: string): number {
  try {
    return parseInt(localStorage.getItem('rm.trial.' + subject) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function trialExceeded(subject: string): boolean {
  return trialCount(subject) >= TRIAL_LIMIT;
}

// 告诉 /track.js 当前在体验哪个科目 (iframe 内的 track.js 也读这个)
export function setTrialSubject(subject: string | null): void {
  try {
    if (subject) localStorage.setItem('rm.trialSubject', subject);
    else localStorage.removeItem('rm.trialSubject');
  } catch {
    /* ignore */
  }
}
