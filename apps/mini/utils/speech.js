// 语音朗读 (纠错时读出正确答案)。
//
// 小程序没有 Web 端的 SpeechSynthesis。这里走「微信同声传译」官方插件的
// textToSpeech 合成 mp3, 再用 InnerAudioContext 播放。
//
// 插件需要在小程序管理后台手动添加 (设置 → 第三方设置 → 插件管理, appid
// wx069ba97219f66d99), 并在 app.json 声明 plugins。未接入时 config.enableTTS
// 保持 false —— 所有接口静默降级为空操作, 学习流程完全不受影响。

const { enableTTS } = require('../config.js');

const MUTE_KEY = 'rm.muted';

let plugin = null;
let audio = null;

function getPlugin() {
  if (!enableTTS) return null;
  if (plugin) return plugin;
  try {
    plugin = requirePlugin('WechatSI');
  } catch (e) {
    // 后台没添加插件 / app.json 没声明 —— 降级静默, 不打扰用户
    console.warn('[speech] 同声传译插件不可用, 语音已降级', e && e.message);
    plugin = null;
  }
  return plugin;
}

function isMuted() {
  try {
    return wx.getStorageSync(MUTE_KEY) === true;
  } catch (e) {
    return false;
  }
}

function setMuted(v) {
  try {
    wx.setStorageSync(MUTE_KEY, !!v);
  } catch (e) {
    /* ignore */
  }
  if (v) cancel();
}

/** "6 × 7 = 42" → 朗读文本。与 Web 端 sayFact 一致: 用中文读符号。 */
function sayFact(prompt, answer) {
  const spoken = String(prompt)
    .replace(/×/g, '乘')
    .replace(/÷/g, '除以')
    .replace(/\+/g, '加')
    .replace(/[-−]/g, '减');
  return `${spoken} 等于 ${answer}`;
}

function synth(text, lang) {
  if (isMuted()) return;
  const p = getPlugin();
  if (!p) return;
  p.textToSpeech({
    lang: lang,
    tts: true,
    content: text,
    success(res) {
      if (!res.filename) return;
      cancel();
      audio = wx.createInnerAudioContext();
      audio.src = res.filename;
      audio.play();
    },
    fail(err) {
      console.warn('[speech] 合成失败', err);
    },
  });
}

function speak(text) {
  synth(text, 'zh_CN');
}

/**
 * 英文朗读 (背单词用)。同声传译只有 en_US, 拿不到 Web 端偏好的 en-GB 发音 ——
 * KET/PET 是英音考试, 这里是已知的口音差异, 但比没有声音强。
 */
function speakEn(text) {
  synth(text, 'en_US');
}

/** 插件是否真的可用 —— 页面据此决定要不要显示朗读按钮。 */
function available() {
  return !!getPlugin();
}

function cancel() {
  if (audio) {
    try {
      audio.stop();
      audio.destroy();
    } catch (e) {
      /* 已销毁 */
    }
    audio = null;
  }
}

module.exports = { isMuted, setMuted, sayFact, speak, speakEn, available, cancel };
