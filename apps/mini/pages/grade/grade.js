// 年级选择 —— 对应 Web 端 src/ui/GradePicker.tsx。
// 文案与 Web 端逐字一致, 两端换着用不会有割裂感。
const content = require('../../utils/content.js');
const track = require('../../utils/track.js');

const GRADES = [
  { grade: 3, label: '三年级', desc: '乘除法·周长面积·分数初步', tag: '小学', color: 'blue' },
  { grade: 4, label: '四年级', desc: '大数·角度·小数·运算定律', tag: '小学', color: 'peach' },
  { grade: 5, label: '五年级', desc: '方程·多边形面积·因数倍数', tag: '小学', color: 'mint' },
  { grade: 6, label: '六年级', desc: '分数运算·百分数·圆·比例', tag: '小学', color: 'lavender' },
  { grade: 7, label: '初一', desc: '有理数·整式·方程·几何', tag: '初中', color: 'blue' },
  { grade: 8, label: '初二', desc: '全等·因式分解·函数·勾股', tag: '初中', color: 'peach' },
  { grade: 9, label: '初三', desc: '二次方程·二次函数·圆·相似', tag: '初中', color: 'mint' },
];

Page({
  data: {
    grades: GRADES,
    current: null,
  },

  onShow() {
    this.setData({ current: content.getGrade() });
  },

  onPick(e) {
    const grade = Number(e.currentTarget.dataset.grade);
    content.setGrade(grade);
    track.track('grade_select', { grade: grade });
    // redirectTo 而非 navigateTo: 选完年级不该还能"返回"到选择页
    wx.redirectTo({ url: `/packages/math/pages/map/map?grade=${grade}` });
  },

  onBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/portal/portal' }) });
  },
});
