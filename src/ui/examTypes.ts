// 考试日历数据类型。数据源: content/exam_calendar.json
// series = 考试系列(稳定的背景信息), sessions = 具体场次(日期/报名窗口)

export type ExamSubject = 'math' | 'english' | 'chinese' | 'science_coding';

export type ExamColor = 'blue' | 'peach' | 'mint' | 'lavender' | 'teal' | 'pink';

// exact: 精确到日; month: 只确定到月; tbd: 未官宣, value 为预估月份;
// rolling: 常年滚动报名(如朗思机考), 无固定考期, value 仅占位
export interface DateSpec {
  type: 'exact' | 'month' | 'tbd' | 'rolling';
  value: string; // "YYYY-MM-DD" | "YYYY-MM"
}

// 备考知识点联动(下期实现跳转): 引用 knowledge_map 的 Topic.id
export interface PrepTopic {
  grade: number;
  topicId: string;
  label: string;
}

// 英语考试联动到背单词模块(下期实现跳转)
export interface VocabLink {
  module: 'english_vocab';
  level: string; // e.g. "ket" | "pet"
}

export interface ExamSeries {
  id: string;
  name: string;
  subject: ExamSubject;
  color: ExamColor;
  description: string;
  format: string;
  gradeRange: { min: number; max: number };
  officialUrl: string;
  prepTopics: PrepTopic[];
  vocabLink: VocabLink | null;
}

export interface ExamSession {
  id: string;
  seriesId: string;
  label: string;
  examDate: DateSpec;
  registrationStart: DateSpec | null;
  registrationEnd: DateSpec | null;
  notes: string | null;
}

export interface ExamCalendarData {
  version: string;
  series: ExamSeries[];
  sessions: ExamSession[];
}

export interface SessionWithSeries extends ExamSession {
  series: ExamSeries;
}

export const EXAM_SUBJECT_CN: Record<ExamSubject, string> = {
  math: '数学',
  english: '英语',
  chinese: '语文',
  science_coding: '科学·编程',
};
