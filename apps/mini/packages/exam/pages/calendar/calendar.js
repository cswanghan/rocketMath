// 考试日历 —— 对应 Web 端 src/ui/ExamCalendar.tsx。
// 月历 + 本月考试 + 本月报名截止 + 详情浮层, 逻辑逐条对齐, 视图模型全部预算好
// (WXML 不能调函数)。
//
// 相对 Web 端的取舍:
//   · 官网链接不能直接跳 (小程序打不开任意外链) → 复制到剪贴板, 让用户自己去浏览器开

const DATA = require('../../content/exam_calendar.js');
const family = require('../../../../utils/family.js');
const prep = require('../../../../utils/prep.js');
const track = require('../../../../utils/track.js');

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

const SUBJECT_CN = {
  math: '数学',
  english: '英语',
  chinese: '语文',
  science_coding: '科学·编程',
};

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'math', label: '数学' },
  { key: 'english', label: '英语' },
  { key: 'chinese', label: '语文' },
  { key: 'science_coding', label: '科学·编程' },
];

const SERIES_BY_ID = {};
DATA.series.forEach((s) => (SERIES_BY_ID[s.id] = s));

/** "YYYY-MM-DD" | "YYYY-MM" → { year, month(0起), day|null } */
function parseSpec(spec) {
  const parts = spec.value.split('-').map(Number);
  return { year: parts[0], month: parts[1] - 1, day: spec.type === 'exact' ? parts[2] : null };
}

function specInMonth(spec, year, month) {
  if (spec.type === 'rolling') return true; // 常年可约, 每个月都展示
  const p = parseSpec(spec);
  return p.year === year && p.month === month;
}

function formatSpec(spec) {
  if (!spec) return '待官宣';
  if (spec.type === 'rolling') return '常年可约（滚动报名）';
  const p = parseSpec(spec);
  if (spec.type === 'exact') return `${p.year}年${p.month + 1}月${p.day}日`;
  if (spec.type === 'month') return `${p.year}年${p.month + 1}月（具体日期见官网）`;
  return `待官宣（预计 ${p.year}年${p.month + 1}月）`;
}

/** 列表行左侧的日期列 */
function dateCol(spec) {
  if (spec.type === 'rolling') return '随时';
  if (spec.type === 'tbd') return '待定';
  const p = parseSpec(spec);
  if (spec.type === 'month') return `${p.month + 1}月内`;
  return `${String(p.month + 1).padStart(2, '0')}/${String(p.day).padStart(2, '0')}`;
}

/** 考试是否已结束 (exact 按日, month/tbd 按月, rolling 永不过期) */
function isPast(spec, today) {
  if (spec.type === 'rolling') return false;
  const p = parseSpec(spec);
  if (p.year !== today.getFullYear()) return p.year < today.getFullYear();
  if (p.month !== today.getMonth()) return p.month < today.getMonth();
  return p.day !== null && p.day < today.getDate();
}

/** 距报名截止天数 (只有 exact 能算); null = 不适用 */
function daysUntil(spec, today) {
  if (!spec || spec.type !== 'exact') return null;
  const p = parseSpec(spec);
  const end = new Date(p.year, p.month, p.day);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((end.getTime() - base.getTime()) / 86400000);
}

/** 周一起头的月历格子; day=null 是补位空格 */
function buildCalDays(year, month) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

Page({
  data: {
    weekdays: WEEKDAYS,
    filters: [],
    filter: 'all',
    monthLabel: '',
    metaText: '',
    cells: [],
    monthList: [],
    regList: [],
    emptyText: '',
    detail: null,
  },

  onLoad() {
    this.studentId = family.currentStudentId();
    this.today = new Date();
    this.viewYear = this.today.getFullYear();
    this.viewMonth = this.today.getMonth();
    this.setData({
      metaText: `收录 ${DATA.series.length} 项考试 · ${DATA.sessions.length} 个场次 · 日期经官网核验 · 未官宣场次以预估月份标注`,
    });
    this.render();
    track.track('exam_cal_open', {});
  },

  /** series join + 学科筛选 */
  sessions() {
    const filter = this.data.filter;
    return DATA.sessions
      .map((s) => Object.assign({}, s, { series: SERIES_BY_ID[s.seriesId] }))
      .filter((s) => s.series && (filter === 'all' || s.series.subject === filter));
  },

  /** 一个场次 → 列表卡片的视图模型 */
  cardVM(s) {
    const past = isPast(s.examDate, this.today);
    const regLeft = daysUntil(s.registrationEnd, this.today);
    const regClosed = regLeft !== null && regLeft < 0;
    const regClosing = !past && regLeft !== null && regLeft >= 0 && regLeft <= 14;
    let meta = `适合 ${s.series.gradeRange.min}-${s.series.gradeRange.max} 年级`;
    if (s.registrationEnd && !past) {
      meta += ` · 报名截止 ${formatSpec(s.registrationEnd)}${regClosed ? '（已截止）' : ''}`;
    }
    return {
      id: s.id,
      dateCol: dateCol(s.examDate),
      label: s.label,
      subject: s.series.subject,
      subjectCN: SUBJECT_CN[s.series.subject],
      tbd: s.examDate.type === 'tbd',
      past: past,
      regClosing: regClosing,
      regClosed: regClosed,
      meta: meta,
    };
  },

  render() {
    const today = this.today;
    const year = this.viewYear;
    const month = this.viewMonth;
    const all = this.sessions();

    // 当月考试, 已结束的沉底
    const monthSessions = all
      .filter((s) => specInMonth(s.examDate, year, month))
      .sort((a, b) => {
        const pastDiff = Number(isPast(a.examDate, today)) - Number(isPast(b.examDate, today));
        if (pastDiff !== 0) return pastDiff;
        const day = (s) => (s.examDate.type === 'rolling' ? 99 : parseSpec(s.examDate).day || 1);
        return day(a) - day(b);
      });

    // 考试在别的月、但报名截止落在本月 —— 本月需要行动
    const regClosingSessions = all.filter(
      (s) =>
        s.registrationEnd &&
        specInMonth(s.registrationEnd, year, month) &&
        !specInMonth(s.examDate, year, month) &&
        !isPast(s.examDate, today),
    );

    // 日历圆点: day → 当日考试 (month/tbd 挂 1 号, rolling 不打点)
    const dots = {};
    monthSessions.forEach((s) => {
      if (s.examDate.type === 'rolling') return;
      const d = parseSpec(s.examDate).day || 1;
      if (!dots[d]) dots[d] = [];
      dots[d].push(s);
    });

    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
    const todayStamp = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const cells = buildCalDays(year, month).map((day, i) => {
      if (day === null) return { key: 'pad-' + i, empty: true };
      const exams = dots[day] || [];
      const isToday = isCurrentMonth && day === today.getDate();
      return {
        key: 'd' + day,
        empty: false,
        day: day,
        isToday: isToday,
        past: new Date(year, month, day).getTime() < todayStamp && !isToday,
        sessionId: exams.length ? exams[0].id : '',
        dots: exams.slice(0, 3).map((e) => ({
          id: e.id,
          cls: e.examDate.type === 'exact' ? 'dot-' + e.series.color : 'dot-vague',
        })),
      };
    });

    this.setData({
      filters: FILTERS.map((f) => ({ key: f.key, label: f.label, active: f.key === this.data.filter })),
      monthLabel: `${year}-${String(month + 1).padStart(2, '0')}`,
      cells: cells,
      monthList: monthSessions.map((s) => this.cardVM(s)),
      regList: regClosingSessions.map((s) => this.cardVM(s)),
      emptyText:
        this.data.filter === 'all'
          ? '本月暂无考试安排'
          : `本月暂无${SUBJECT_CN[this.data.filter]}考试`,
    });
  },

  onNav(e) {
    const dir = e.currentTarget.dataset.dir;
    const next = new Date(this.viewYear, this.viewMonth + (dir === 'next' ? 1 : -1), 1);
    this.viewYear = next.getFullYear();
    this.viewMonth = next.getMonth();
    this.render();
    track.track('exam_cal_month_nav', {
      year: this.viewYear,
      month: this.viewMonth + 1,
      direction: dir,
    });
  },

  onToday() {
    this.viewYear = this.today.getFullYear();
    this.viewMonth = this.today.getMonth();
    this.render();
  },

  onPickFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.key });
    this.render();
    track.track('exam_cal_filter', { subject: this.data.filter });
  },

  onOpenSession(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    this.openDetail(id, e.currentTarget.dataset.source || 'list');
  },

  openDetail(sessionId, source) {
    const s = this.sessions().filter((x) => x.id === sessionId)[0];
    if (!s) return;
    const series = s.series;
    const past = isPast(s.examDate, this.today);
    const topicLabels = (series.prepTopics || []).map((t) => t.label);
    let prepHint = '';
    if (topicLabels.length) prepHint += `可在数学练习中巩固「${topicLabels.join('、')}」。`;
    if (series.vocabLink) prepHint += '可在英语背单词模块中积累词汇。';

    this.setData({
      detail: {
        sessionId: s.id,
        seriesId: series.id,
        name: series.name,
        // 场次名和系列名一样时不重复显示
        sessionLabel: s.label === series.name ? '' : s.label,
        subject: series.subject,
        subjectCN: SUBJECT_CN[series.subject],
        gradeText: `适合 ${series.gradeRange.min}-${series.gradeRange.max} 年级`,
        past: past,
        description: series.description,
        format: series.format,
        examTime: formatSpec(s.examDate),
        regWindow: `${formatSpec(s.registrationStart)} ~ ${formatSpec(s.registrationEnd)}`,
        notes: s.notes || '',
        prepHint: prepHint,
        hasPrep: topicLabels.length > 0 || !!series.vocabLink,
        officialUrl: series.officialUrl,
      },
    });
    track.track('exam_cal_detail_open', {
      sessionId: s.id,
      seriesId: s.seriesId,
      subject: series.subject,
      source: source,
    });
  },

  onCloseDetail() {
    this.setData({ detail: null });
  },

  onStartPrep() {
    const d = this.data.detail;
    if (!d || !d.hasPrep) return;
    track.track('prep_start', { seriesId: d.seriesId, from: 'exam_detail' });
    prep.savePrepTargetWithName(this.studentId, d.seriesId, d.name);
    this.setData({ detail: null });
    wx.navigateTo({ url: `/packages/exam/pages/prep/prep?seriesId=${d.seriesId}` });
  },

  /** 小程序打不开任意外链, 复制官网地址让用户去浏览器打开。 */
  onCopyUrl() {
    const d = this.data.detail;
    if (!d) return;
    wx.setClipboardData({
      data: d.officialUrl,
      success: () => wx.showToast({ title: '官网地址已复制', icon: 'none' }),
    });
    track.track('exam_cal_official_url', { seriesId: d.seriesId, url: d.officialUrl });
  },

  onExit() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/portal/portal' }) });
  },

  noop() {},
});
