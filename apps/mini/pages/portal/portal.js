// 首页「今天学什么」—— 对应 Web 端 src/ui/Portal.tsx。
const content = require('../../utils/content.js');
const family = require('../../utils/family.js');
const streakUtil = require('../../utils/streak.js');
const trial = require('../../utils/trial.js');
const track = require('../../utils/track.js');
const api = require('../../utils/api.js');
const prep = require('../../utils/prep.js');

Page({
  data: {
    streak: null,
    celebrate: null,
    childName: '',
    prepResume: null,
    loginPromptFor: '',
  },

  onShow() {
    const studentId = family.currentStudentId();
    const child = family.getActiveChild();
    this.setData({
      streak: streakUtil.readStreak(studentId),
      celebrate: streakUtil.takeNewMilestone(studentId),
      childName: child ? child.name : '',
      prepResume: prep.readResume(studentId),
    });
  },

  onSubject(e) {
    const subject = e.currentTarget.dataset.subject;
    track.track('subject_select', { subject: subject, authed: !!api.getToken() });

    if (trial.trialExceeded(subject)) {
      track.track('login_prompt_shown', { subject: subject, reason: 'trial_over' });
      this.setData({ loginPromptFor: subject });
      return;
    }

    if (subject === 'math') {
      // 已选过年级就直奔知识地图, 少一次点击
      const grade = content.getGrade();
      if (grade) {
        wx.navigateTo({ url: `/packages/math/pages/map/map?grade=${grade}` });
      } else {
        wx.navigateTo({ url: '/pages/grade/grade' });
      }
      return;
    }
    if (subject === 'chinese') {
      wx.navigateTo({ url: '/packages/lang/pages/chinese/chinese' });
      return;
    }
    if (subject === 'english') {
      wx.navigateTo({ url: '/packages/lang/pages/vocab/vocab' });
    }
  },

  // exam_cal_open 由日历页自己上报 (与 Web 端一致), 这里不重复打点
  onExamCal() {
    wx.navigateTo({ url: '/packages/exam/pages/calendar/calendar' });
  },

  onResumePrep() {
    const r = this.data.prepResume;
    if (!r) return;
    wx.navigateTo({ url: `/packages/exam/pages/prep/prep?seriesId=${r.seriesId}` });
  },

  onLogin() {
    const subject = this.data.loginPromptFor;
    track.track('login_prompt_click', { subject: subject });
    wx.showLoading({ title: '登录中' });
    api
      .wechatLogin()
      .then(() => {
        trial.resetTrials();
        wx.hideLoading();
        this.setData({ loginPromptFor: '' });
        wx.showToast({ title: '登录成功', icon: 'success' });
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showModal({
          title: '登录失败',
          content: (err && err.message) || '请稍后再试',
          showCancel: false,
        });
      });
  },

  onCloseLoginPrompt() {
    this.setData({ loginPromptFor: '' });
  },

  onDismissCelebrate() {
    this.setData({ celebrate: null });
  },

  // 浮层内容区 catchtap 到这里, 阻止冒泡到蒙层的"点外面关闭"
  noop() {},
});
