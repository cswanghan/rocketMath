/* 星芽 · 轻量行为埋点客户端 (vanilla, 适用于 React 应用与静态页)
 * 用法: window.rmTrack('event_name', { ...props })
 * - 匿名用户用 localStorage 里的稳定 anon_id 归因
 * - 登录用户附带 token, 服务端校验后归因到 user_id
 * - 批量缓冲, 定时 flush + 页面隐藏/卸载时用 sendBeacon 兜底
 * - 任何失败都静默, 绝不影响页面
 */
(function () {
  if (window.rmTrack) return; // 防重复加载
  var ENDPOINT = '/api/track';
  var ANON_KEY = 'rm.anon';
  var FLUSH_EVERY = 15000;
  var MAX_BATCH = 12;

  function anonId() {
    try {
      var a = localStorage.getItem(ANON_KEY);
      if (!a) {
        a = 'a_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem(ANON_KEY, a);
      }
      return a;
    } catch (e) { return ''; }
  }
  function token() { try { return localStorage.getItem('token') || ''; } catch (e) { return ''; } }
  function userId() {
    try { var u = JSON.parse(localStorage.getItem('user') || 'null'); return u && u.id ? u.id : null; }
    catch (e) { return null; }
  }
  function childId() {
    try { var c = JSON.parse(localStorage.getItem('rm.child') || 'null'); return c && c.id ? c.id : null; }
    catch (e) { return null; }
  }

  var queue = [];

  function send(payload, beacon) {
    var body = JSON.stringify(payload);
    try {
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
        return;
      }
    } catch (e) {}
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  function flush(beacon) {
    if (!queue.length) return;
    var batch = queue.splice(0, queue.length);
    send({ anonId: anonId(), userId: userId(), childId: childId(), token: token(), events: batch }, beacon);
  }

  function track(event, props) {
    try {
      queue.push({
        event: String(event || '').slice(0, 64),
        props: props || {},
        path: (location.pathname + location.hash).slice(0, 256),
        ts: Date.now(),
      });
      if (queue.length >= MAX_BATCH) flush(false);
      maybeTrial(event);
      // 在 iframe(语文/英语)里学习时,通知主应用记一次每日打卡(streak 单一源在 React 侧)
      if (window.top !== window.self && OP_EVENTS[event]) {
        try { window.parent.postMessage({ source: 'rm', type: 'activity', event: event }, location.origin); } catch (e) {}
      }
    } catch (e) {}
  }

  // "先试再登录": 未登录用户每科目可免费体验 TRIAL_LIMIT 次操作, 到上限就引导登录
  var TRIAL_LIMIT = 10;
  var OP_EVENTS = {
    fluency_answer: 1, practice_answer: 1, topic_open: 1,
    char_quiz_answer: 1, char_view: 1, char_stroke: 1, char_trace: 1,
    reading_generate: 1, shengziben_add: 1, vocab_op: 1,
  };
  function loggedIn() { try { return !!localStorage.getItem('token'); } catch (e) { return false; } }
  function trialSubject() { try { return localStorage.getItem('rm.trialSubject') || ''; } catch (e) { return ''; } }
  function maybeTrial(event) {
    if (loggedIn() || !OP_EVENTS[event]) return;
    var subj = trialSubject();
    if (!subj) return;
    var k = 'rm.trial.' + subj;
    var n = (parseInt(localStorage.getItem(k) || '0', 10) || 0) + 1;
    localStorage.setItem(k, String(n));
    if (n >= TRIAL_LIMIT) {
      flush(true);
      if (window.top === window.self) {
        // 主应用 (数学): 通知 React 弹登录
        window.dispatchEvent(new CustomEvent('rm-trial-block', { detail: { subject: subj } }));
      } else {
        // iframe (语文/英语): 整页跳登录
        try { window.top.location.href = '/login.html?redirect=' + encodeURIComponent('/?go=' + subj); }
        catch (e) { location.href = '/login.html?redirect=' + encodeURIComponent('/?go=' + subj); }
      }
    }
  }

  window.rmTrack = track;
  window.rmFlush = flush;

  // 周期性 flush
  try { setInterval(function () { flush(false); }, FLUSH_EVERY); } catch (e) {}

  // 页面隐藏/卸载兜底
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush(true);
  });
  window.addEventListener('pagehide', function () { flush(true); });

  // 自动: 页面访问 + 停留时长
  var t0 = Date.now();
  track('page_view', { title: document.title, ref: document.referrer || '' });
  window.addEventListener('pagehide', function () {
    track('page_leave', { dwell_ms: Date.now() - t0 });
    flush(true);
  });
})();
