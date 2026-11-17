// 「我的」—— Web 端顶部 UserBar + ChildSwitcher 浮层的小程序版。
// 小程序有 tabBar, 与其做浮层不如给账号/档案一个常驻页面, 手指够得着。
const api = require('../../utils/api.js');
const family = require('../../utils/family.js');
const content = require('../../utils/content.js');
const streakUtil = require('../../utils/streak.js');
const track = require('../../utils/track.js');
const { createDefaultAdapter } = require('../../utils/storage.js');
const { levelFromXp } = require('../../vendor/practice');

const AVATARS = ['🐣', '🦊', '🐼', '🐯', '🦁', '🐸', '🐙', '🦄', '🐶', '🐱', '🐵', '🐨'];

const GRADE_LABEL = {
  3: '三年级',
  4: '四年级',
  5: '五年级',
  6: '六年级',
  7: '初一',
  8: '初二',
  9: '初三',
};

Page({
  data: {
    user: null,
    userInitial: '星',
    children: [],
    activeChild: null,
    gradeLabel: '',
    level: null, // {level, intoLevel, span, toNext}
    xp: 0,
    streak: null,
    // 添加孩子表单
    adding: false,
    avatars: AVATARS,
    newName: '',
    newAvatar: AVATARS[0],
    busy: false,
  },

  onShow() {
    const grade = content.getGrade();
    const user = api.getUser();
    this.setData({
      user: user,
      userInitial: user && user.username ? user.username.charAt(0).toUpperCase() : '星',
      activeChild: family.getActiveChild(),
      gradeLabel: grade ? GRADE_LABEL[grade] || `${grade} 年级` : '',
      streak: streakUtil.readStreak(family.currentStudentId()),
    });
    this.refreshXp();
    if (api.getToken()) this.refreshChildren();
  },

  refreshXp() {
    createDefaultAdapter()
      .getStudent(family.currentStudentId())
      .then((s) => {
        const xp = (s && s.xp) || 0;
        this.setData({ xp: xp, level: levelFromXp(xp) });
      });
  },

  refreshChildren() {
    family.listChildren().then((list) => {
      this.setData({ children: list });
      // 后端删了当前孩子 → 本地也要跟着回到"家长"
      const active = this.data.activeChild;
      if (active && !list.some((c) => c.id === active.id)) {
        family.setActiveChild(null);
        this.setData({ activeChild: null });
        this.refreshXp();
      }
    });
  },

  // ---- 登录 -----------------------------------------------------------------

  onLogin() {
    wx.showLoading({ title: '登录中' });
    api
      .wechatLogin()
      .then(() => {
        wx.hideLoading();
        const u = api.getUser();
        this.setData({
          user: u,
          userInitial: u && u.username ? u.username.charAt(0).toUpperCase() : '星',
        });
        this.refreshChildren();
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

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '本机的学习进度会保留，重新登录后可以继续同步。',
      success: (r) => {
        if (!r.confirm) return;
        api.clearAuth();
        family.setActiveChild(null);
        this.setData({ user: null, children: [], activeChild: null });
        this.refreshXp();
      },
    });
  },

  // ---- 孩子档案 -------------------------------------------------------------

  onPickChild(e) {
    const id = e.currentTarget.dataset.id;
    const c = id ? this.data.children.filter((x) => x.id === id)[0] || null : null;
    family.setActiveChild(c);
    track.track('child_switch', { toParent: !c });
    this.setData({
      activeChild: c,
      streak: streakUtil.readStreak(family.studentIdFor(c)),
    });
    this.refreshXp();
  },

  onToggleAdd() {
    this.setData({ adding: !this.data.adding, newName: '', newAvatar: AVATARS[0] });
  },

  onNameInput(e) {
    this.setData({ newName: e.detail.value });
  },

  onPickAvatar(e) {
    this.setData({ newAvatar: e.currentTarget.dataset.avatar });
  },

  onAddChild() {
    const name = (this.data.newName || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入孩子的名字', icon: 'none' });
      return;
    }
    this.setData({ busy: true });
    family
      .createChild({ name: name, avatar: this.data.newAvatar })
      .then((c) => {
        this.setData({
          busy: false,
          adding: false,
          newName: '',
          children: this.data.children.concat([c]),
        });
        track.track('child_create', {});
      })
      .catch((err) => {
        this.setData({ busy: false });
        wx.showModal({
          title: '添加失败',
          content: (err && err.message) || '请稍后再试',
          showCancel: false,
        });
      });
  },

  onDeleteChild(e) {
    const id = e.currentTarget.dataset.id;
    const c = this.data.children.filter((x) => x.id === id)[0];
    if (!c) return;
    wx.showModal({
      title: '删除档案',
      content: `删除「${c.name}」的档案？学习记录会保留但不再显示。`,
      success: (r) => {
        if (!r.confirm) return;
        family.deleteChild(id).then(() => {
          const next = this.data.children.filter((x) => x.id !== id);
          this.setData({ children: next });
          const active = this.data.activeChild;
          if (active && active.id === id) {
            family.setActiveChild(null);
            this.setData({ activeChild: null });
            this.refreshXp();
          }
        });
      },
    });
  },

  // ---- 其它入口 -------------------------------------------------------------

  onChangeGrade() {
    wx.navigateTo({ url: '/pages/grade/grade' });
  },

  onParent() {
    wx.navigateTo({ url: '/packages/parent/pages/dashboard/dashboard' });
  },

  onExamCal() {
    wx.navigateTo({ url: '/packages/exam/pages/calendar/calendar' });
  },

  onReset() {
    const studentId = family.currentStudentId();
    wx.showModal({
      title: '清空学习进度',
      content: '这会把当前学习者的口算进度、练习进度和经验值清零，且无法恢复。错题本会保留。',
      confirmText: '确认清空',
      confirmColor: '#f0564a',
      success: (r) => {
        if (!r.confirm) return;
        createDefaultAdapter()
          .resetProgress(studentId)
          .then(() => {
            this.refreshXp();
            wx.showToast({ title: '已清空', icon: 'success' });
          });
      },
    });
  },
});
