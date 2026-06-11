import type { ExamCalendarData } from './examTypes';

let cache: ExamCalendarData | null = null;

export async function loadExamCalendar(): Promise<ExamCalendarData> {
  if (cache) return cache;
  const mod = await import('../../content/exam_calendar.json');
  cache = mod.default as unknown as ExamCalendarData;
  return cache;
}
