import { useEffect, useMemo, useState } from 'react';
import { track } from '../track';
import { loadExamCalendar } from './examLoader';
import {
  EXAM_SUBJECT_CN,
  type DateSpec,
  type ExamCalendarData,
  type ExamSubject,
  type SessionWithSeries,
} from './examTypes';

interface Props {
  onBack: () => void;
  /** 「开始备考」：进入该考试系列的备考清单 */
  onStartPrep?: (seriesId: string) => void;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

const FILTERS: { key: ExamSubject | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'math', label: '数学' },
  { key: 'english', label: '英语' },
  { key: 'chinese', label: '语文' },
  { key: 'science_coding', label: '科学·编程' },
];

// "YYYY-MM-DD" | "YYYY-MM" → { year, month(0-based), day | null }
function parseSpec(spec: DateSpec): { year: number; month: number; day: number | null } {
  const [y, m, d] = spec.value.split('-').map(Number);
  return { year: y, month: m - 1, day: spec.type === 'exact' ? d : null };
}

function specInMonth(spec: DateSpec, year: number, month: number): boolean {
  if (spec.type === 'rolling') return true; // 常年可约, 每个月都展示
  const p = parseSpec(spec);
  return p.year === year && p.month === month;
}

function formatSpec(spec: DateSpec | null): string {
  if (!spec) return '待官宣';
  if (spec.type === 'rolling') return '常年可约（滚动报名）';
  const p = parseSpec(spec);
  if (spec.type === 'exact') return `${p.year}年${p.month + 1}月${p.day}日`;
  if (spec.type === 'month') return `${p.year}年${p.month + 1}月（具体日期见官网）`;
  return `待官宣（预计 ${p.year}年${p.month + 1}月）`;
}

// 列表行左侧的日期列文字
function dateCol(spec: DateSpec): string {
  if (spec.type === 'rolling') return '随时';
  if (spec.type === 'tbd') return '待定';
  const p = parseSpec(spec);
  if (spec.type === 'month') return `${p.month + 1}月内`;
  return `${String(p.month + 1).padStart(2, '0')}/${String(p.day).padStart(2, '0')}`;
}

// 周一起始的月历格子; null = 空白补位
function buildCalDays(year: number, month: number): (number | null)[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// 考试是否已结束 (exact 按日比较, month/tbd 按月比较, rolling 永不过期)
function isPast(spec: DateSpec, today: Date): boolean {
  if (spec.type === 'rolling') return false;
  const p = parseSpec(spec);
  if (p.year !== today.getFullYear()) return p.year < today.getFullYear();
  if (p.month !== today.getMonth()) return p.month < today.getMonth();
  return p.day !== null && p.day < today.getDate();
}

// 距报名截止的天数 (仅 exact 可算); null = 不适用
function daysUntil(spec: DateSpec | null, today: Date): number | null {
  if (!spec || spec.type !== 'exact') return null;
  const p = parseSpec(spec);
  const end = new Date(p.year, p.month, p.day as number);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((end.getTime() - base.getTime()) / 86400000);
}

export function ExamCalendar({ onBack, onStartPrep }: Props) {
  const today = new Date();
  const [data, setData] = useState<ExamCalendarData | null>(null);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [filterSubject, setFilterSubject] = useState<ExamSubject | 'all'>('all');
  const [selected, setSelected] = useState<SessionWithSeries | null>(null);

  useEffect(() => {
    track('exam_cal_open');
    loadExamCalendar().then(setData);
  }, []);

  // series join + 学科筛选
  const sessions = useMemo<SessionWithSeries[]>(() => {
    if (!data) return [];
    const byId = new Map(data.series.map((s) => [s.id, s]));
    return data.sessions
      .map((s) => ({ ...s, series: byId.get(s.seriesId)! }))
      .filter((s) => s.series && (filterSubject === 'all' || s.series.subject === filterSubject));
  }, [data, filterSubject]);

  // 当月考试, 已结束的排最后
  const monthSessions = useMemo(() => {
    const list = sessions.filter((s) => specInMonth(s.examDate, viewYear, viewMonth));
    const sortDay = (s: SessionWithSeries) =>
      s.examDate.type === 'rolling' ? 99 : parseSpec(s.examDate).day ?? 1;
    return list.sort((a, b) => {
      const pastDiff = Number(isPast(a.examDate, today)) - Number(isPast(b.examDate, today));
      if (pastDiff !== 0) return pastDiff;
      return sortDay(a) - sortDay(b);
    });
  }, [sessions, viewYear, viewMonth]);

  // 考试在他月、但报名截止落在本月的场次 (本月需要行动)
  const regClosingSessions = useMemo(
    () =>
      sessions.filter(
        (s) =>
          s.registrationEnd &&
          specInMonth(s.registrationEnd, viewYear, viewMonth) &&
          !specInMonth(s.examDate, viewYear, viewMonth) &&
          !isPast(s.examDate, today),
      ),
    [sessions, viewYear, viewMonth],
  );

  // 日历圆点: day → 当日考试 (month/tbd 类型挂在 1 号)
  const dotsByDay = useMemo(() => {
    const map = new Map<number, SessionWithSeries[]>();
    for (const s of monthSessions) {
      if (s.examDate.type === 'rolling') continue; // 无固定日期, 不打日历点
      const day = parseSpec(s.examDate).day ?? 1;
      const list = map.get(day) ?? [];
      list.push(s);
      map.set(day, list);
    }
    return map;
  }, [monthSessions]);

  const nav = (dir: 'prev' | 'next') => {
    const next = new Date(viewYear, viewMonth + (dir === 'next' ? 1 : -1), 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    track('exam_cal_month_nav', { year: next.getFullYear(), month: next.getMonth() + 1, direction: dir });
  };

  const pickFilter = (key: ExamSubject | 'all') => {
    setFilterSubject(key);
    track('exam_cal_filter', { subject: key });
  };

  const openDetail = (s: SessionWithSeries, source: 'list' | 'dot') => {
    setSelected(s);
    track('exam_cal_detail_open', {
      sessionId: s.id,
      seriesId: s.seriesId,
      subject: s.series.subject,
      source,
    });
  };

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const cells = buildCalDays(viewYear, viewMonth);

  return (
    <div className="map exam-cal">
      <button className="map-back" onClick={onBack}>
        ← 返回
      </button>
      <header className="exam-cal-header">
        <h1 className="exam-cal-title">
          考试日历 <span className="ecal-title-en">EXAM CALENDAR</span>
        </h1>
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => nav('prev')} aria-label="上一月">
            ◀
          </button>
          <span className="cal-month-label">
            {viewYear}-{String(viewMonth + 1).padStart(2, '0')}
          </span>
          <button className="cal-nav-btn" onClick={() => nav('next')} aria-label="下一月">
            ▶
          </button>
        </div>
      </header>
      <p className="ecal-meta">
        {data
          ? `收录 ${data.series.length} 项考试 · ${data.sessions.length} 个场次 · 日期经官网核验 · 未官宣场次以预估月份标注`
          : '数据加载中'}
      </p>

      <div className="cal-filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`ecal-tab ${filterSubject === f.key ? 'is-active' : ''}`}
            onClick={() => pickFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!data ? (
        <p className="exam-cal-empty">加载中…</p>
      ) : (
        <>
          <div className="cal-grid">
            {WEEKDAYS.map((w) => (
              <span key={w} className="cal-weekday">
                {w}
              </span>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <span key={`pad-${i}`} className="cal-day" />;
              const exams = dotsByDay.get(day);
              const isToday = isCurrentMonth && day === today.getDate();
              const past =
                new Date(viewYear, viewMonth, day) <
                new Date(today.getFullYear(), today.getMonth(), today.getDate());
              return (
                <span
                  key={day}
                  className={[
                    'cal-day',
                    exams ? 'has-exam' : '',
                    isToday ? 'is-today' : '',
                    past && !isToday ? 'is-past' : '',
                  ].join(' ')}
                  onClick={exams ? () => openDetail(exams[0], 'dot') : undefined}
                  title={exams?.map((e) => e.series.name).join('、')}
                >
                  <span className="cal-day-num">{day}</span>
                  {exams && (
                    <span className="cal-dots">
                      {exams.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={`exam-dot ${
                            e.examDate.type === 'exact' ? `dot-${e.series.color}` : 'dot-vague'
                          }`}
                        />
                      ))}
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          <h2 className="cal-section-title">本月考试</h2>
          <div className="cal-session-list">
            {monthSessions.length === 0 && (
              <p className="exam-cal-empty">
                {filterSubject === 'all'
                  ? '本月暂无考试安排'
                  : `本月暂无${EXAM_SUBJECT_CN[filterSubject]}考试`}
              </p>
            )}
            {monthSessions.map((s) => (
              <SessionCard key={s.id} s={s} today={today} onClick={() => openDetail(s, 'list')} />
            ))}
          </div>

          {regClosingSessions.length > 0 && (
            <>
              <h2 className="cal-section-title">本月报名截止</h2>
              <div className="cal-session-list">
                {regClosingSessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    s={s}
                    today={today}
                    onClick={() => openDetail(s, 'list')}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {selected && (
        <DetailModal
          s={selected}
          today={today}
          onClose={() => setSelected(null)}
          onStartPrep={onStartPrep}
        />
      )}
    </div>
  );
}

function SessionCard({
  s,
  today,
  onClick,
}: {
  s: SessionWithSeries;
  today: Date;
  onClick: () => void;
}) {
  const past = isPast(s.examDate, today);
  const regLeft = daysUntil(s.registrationEnd, today);
  const regClosed = regLeft !== null && regLeft < 0;
  const regClosing = !past && regLeft !== null && regLeft >= 0 && regLeft <= 14;
  return (
    <button className={`exam-card ${past ? 'is-past' : ''}`} onClick={onClick}>
      <span className="exam-card-datecol">{dateCol(s.examDate)}</span>
      <span className="exam-card-main">
        <span className="exam-card-top">
          <span className="exam-card-name">{s.label}</span>
          <span className={`ecal-tag subj-${s.series.subject}`}>
            {EXAM_SUBJECT_CN[s.series.subject]}
          </span>
          {s.examDate.type === 'tbd' && <span className="ecal-tag is-mut">待官宣</span>}
          {past && <span className="ecal-tag is-mut">已结束</span>}
          {regClosing && <span className="ecal-tag is-warn">⚠ 报名即将截止</span>}
        </span>
        <span className="exam-card-meta">
          适合 {s.series.gradeRange.min}-{s.series.gradeRange.max} 年级
          {s.registrationEnd && !past && (
            <>
              {' · '}
              <span className={regClosed ? 'is-closed' : ''}>
                报名截止 {formatSpec(s.registrationEnd)}
                {regClosed ? '（已截止）' : ''}
              </span>
            </>
          )}
        </span>
      </span>
    </button>
  );
}

function DetailModal({
  s,
  today,
  onClose,
  onStartPrep,
}: {
  s: SessionWithSeries;
  today: Date;
  onClose: () => void;
  onStartPrep?: (seriesId: string) => void;
}) {
  const past = isPast(s.examDate, today);
  const hasPrep = s.series.prepTopics.length > 0 || !!s.series.vocabLink;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card exam-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="exam-modal-name">{s.series.name}</h2>
        {s.label !== s.series.name && <div className="exam-modal-session">{s.label}</div>}
        <div className="exam-modal-pills">
          <span className={`ecal-tag subj-${s.series.subject}`}>
            {EXAM_SUBJECT_CN[s.series.subject]}
          </span>
          <span className="ecal-tag">
            适合 {s.series.gradeRange.min}-{s.series.gradeRange.max} 年级
          </span>
          {past && <span className="ecal-tag is-mut">已结束</span>}
        </div>
        <p className="exam-modal-section">{s.series.description}</p>
        <div className="exam-modal-section">
          <div className="exam-modal-row">
            <span className="exam-modal-label">考试形式</span>
            <span>{s.series.format}</span>
          </div>
          <div className="exam-modal-row">
            <span className="exam-modal-label">考试时间</span>
            <span>{formatSpec(s.examDate)}</span>
          </div>
          <div className="exam-modal-row">
            <span className="exam-modal-label">报名窗口</span>
            <span>
              {formatSpec(s.registrationStart)} ~ {formatSpec(s.registrationEnd)}
            </span>
          </div>
          {s.notes && (
            <div className="exam-modal-row">
              <span className="exam-modal-label">备注</span>
              <span>{s.notes}</span>
            </div>
          )}
        </div>
        {(s.series.prepTopics.length > 0 || s.series.vocabLink) && (
          <p className="exam-prep-hint">
            💡 备考建议：
            {s.series.prepTopics.length > 0 &&
              `可在数学练习中巩固「${s.series.prepTopics.map((t) => t.label).join('、')}」。`}
            {s.series.vocabLink && '可在英语背单词模块中积累词汇。'}
          </p>
        )}
        <div className="exam-modal-actions">
          {onStartPrep && (
            hasPrep ? (
              <button
                className="prep-cta"
                onClick={() => {
                  track('prep_start', { seriesId: s.seriesId, from: 'exam_detail' });
                  onStartPrep(s.seriesId);
                }}
              >
                开始备考 →
              </button>
            ) : (
              <span className="prep-cta is-disabled" aria-disabled>
                备考内容建设中
              </span>
            )
          )}
          <a
            className="ecal-link"
            href={s.series.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              track('exam_cal_official_url', { seriesId: s.seriesId, url: s.series.officialUrl })
            }
          >
            前往官网 ↗
          </a>
          <button className="ghost" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
