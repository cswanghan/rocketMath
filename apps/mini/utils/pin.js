// 家长区 4 位 PIN。移植自 Web 端 src/ui/pin.ts。
//
// 这是"防孩子误入"的门闩, 不是安全机制 —— 明文存在本地。真正的隐私边界由
// 登录态和后端鉴权把守。

const KEY = 'rm.parentPin';

function hasPin() {
  try {
    return !!wx.getStorageSync(KEY);
  } catch (e) {
    return false;
  }
}

function setPin(pin) {
  try {
    wx.setStorageSync(KEY, String(pin));
  } catch (e) {
    /* ignore */
  }
}

function checkPin(pin) {
  try {
    return wx.getStorageSync(KEY) === String(pin);
  } catch (e) {
    return false;
  }
}

module.exports = { hasPin, setPin, checkPin };
