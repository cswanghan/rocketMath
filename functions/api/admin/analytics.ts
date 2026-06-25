// 使用分析看板数据 (仅管理员): 漏斗 / 学科 / 时段 / 活跃留存。
import { getRequestUser } from '../../../src/request-auth';

interface Env { DB: D1Database; JWT_SECRET: string; }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = await getRequestUser(context.request, context.env);
  if (!user?.userId || user.role !== 'admin') return json({ error: '无权访问' }, 403);
  const db = context.env.DB;

  const [funnel, subjects, hours, daily, login, methods] = await Promise.all([
    // 访客漏斗 (按设备 anon_id)
    db.prepare(`SELECT
        (SELECT COUNT(DISTINCT anon_id) FROM events) devices,
        (SELECT COUNT(DISTINCT anon_id) FROM events WHERE event='subject_select') tried,
        (SELECT COUNT(DISTINCT anon_id) FROM events WHERE event='login_prompt_shown') wall,
        (SELECT COUNT(DISTINCT anon_id) FROM events WHERE event='login_success') logged_in`).first<any>(),
    // 学科热度
    db.prepare(`SELECT json_extract(props,'$.subject') subject,
        COUNT(*) total,
        SUM(CASE WHEN json_extract(props,'$.authed')=1 THEN 1 ELSE 0 END) authed
        FROM events WHERE event='subject_select' AND json_extract(props,'$.subject') IS NOT NULL
        GROUP BY subject ORDER BY total DESC`).all<any>(),
    // 活跃时段 (北京时间整点)
    db.prepare(`SELECT CAST(strftime('%H', datetime(created_at,'+8 hours')) AS INTEGER) hour, COUNT(*) c
        FROM events GROUP BY hour ORDER BY hour`).all<any>(),
    // 每日活跃 + 新增/回访 (设备)
    db.prepare(`WITH firsts AS (
          SELECT anon_id, MIN(date(created_at,'+8 hours')) fd FROM events WHERE anon_id IS NOT NULL GROUP BY anon_id),
        day_anon AS (
          SELECT DISTINCT date(created_at,'+8 hours') day, anon_id FROM events WHERE anon_id IS NOT NULL)
        SELECT da.day,
          COUNT(*) devices,
          SUM(CASE WHEN f.fd = da.day THEN 1 ELSE 0 END) new_devices,
          SUM(CASE WHEN f.fd < da.day THEN 1 ELSE 0 END) returning_devices
        FROM day_anon da JOIN firsts f ON f.anon_id = da.anon_id
        GROUP BY da.day ORDER BY da.day DESC LIMIT 14`).all<any>(),
    // 登录/注册转化
    db.prepare(`SELECT
        (SELECT COUNT(*) FROM events WHERE event='login_submit') login_submit,
        (SELECT COUNT(*) FROM events WHERE event='login_success') login_success,
        (SELECT COUNT(*) FROM events WHERE event='login_fail') login_fail,
        (SELECT COUNT(*) FROM events WHERE event='register_submit') register_submit,
        (SELECT COUNT(*) FROM events WHERE event='register_success') register_success`).first<any>(),
    // 登录成功方式
    db.prepare(`SELECT json_extract(props,'$.method') method, COUNT(*) c
        FROM events WHERE event='login_success' GROUP BY method`).all<any>(),
  ]);

  return json({
    funnel: funnel || { devices: 0, tried: 0, wall: 0, logged_in: 0 },
    subjects: subjects.results || [],
    hours: hours.results || [],
    daily: daily.results || [],
    login: login || {},
    methods: methods.results || [],
  });
};
