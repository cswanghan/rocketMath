import { App } from '@capacitor/app';
import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { apiTarget, BackStack } from './policy';
import type { NativeBridge } from './native';

interface SpeechPlugin {
  speak(options: { text: string; language: string; rate: number }): Promise<void>;
  stop(): Promise<void>;
}
interface Runtime extends NativeBridge {
  request: typeof fetch;
  speech: SpeechPlugin;
}
const isRequest = (value: unknown): value is Request => !!value && typeof value === 'object' && 'url' in value && 'clone' in value;
const host = window as Window & { XingyaNative?: Runtime };
const parentRuntime = window.parent !== window ? (window.parent as typeof host).XingyaNative : undefined;
if (parentRuntime || Capacitor.getPlatform() === 'android') {
  const stack = new BackStack();
  const speech = parentRuntime?.speech ?? registerPlugin<SpeechPlugin>('XingyaSpeech');
  const originalFetch = window.fetch.bind(window);
  const request: typeof fetch = async (input, init) => {
    const url = isRequest(input) ? input.url : String(input);
    const target = apiTarget(url, location.origin);
    if (!target) return originalFetch(input, init);
    const merged = isRequest(input) ? new Request(input, init) : new Request(new URL(url, location.origin), init);
    if (merged.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const headers = Object.fromEntries(merged.headers.entries());
    const body = merged.method === 'GET' || merged.method === 'HEAD' ? undefined : await merged.text();
    const response = await CapacitorHttp.request({
      url: target, method: merged.method, headers,
      data: body && headers['content-type']?.includes('application/json') ? JSON.parse(body) : body,
      responseType: 'text', connectTimeout: 10000, readTimeout: 15000, disableRedirects: true,
    });
    if (merged.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (response.status >= 300 && response.status < 400) throw new Error('接口重定向已拒绝');
    const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    return new Response([204, 205, 304].includes(response.status) ? null : data,
      { status: response.status, headers: response.headers });
  };
  const runtime: Runtime = parentRuntime ?? {
    platform: 'android', request, speech,
    registerBack: (handler, priority) => stack.add(handler, priority),
  };
  host.XingyaNative = runtime;
  window.fetch = (input, init) => {
    const url = isRequest(input) ? input.url : String(input);
    return apiTarget(url, location.origin) ? runtime.request(input, init) : originalFetch(input, init);
  };

  class Utterance {
    text = ''; lang = 'zh-CN'; rate = 1; pitch = 1; volume = 1; voice = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onstart: (() => void) | null = null;
    constructor(text = '') { this.text = text; }
  }
  let sequence = 0;
  const synthesis = {
    speaking: false, pending: false, paused: false, onvoiceschanged: null,
    getVoices: () => [],
    cancel() { sequence++; synthesis.speaking = false; void speech.stop().catch(() => {}); },
    speak(utterance: Utterance) {
      const current = ++sequence;
      synthesis.speaking = true;
      utterance.onstart?.();
      speech.speak({ text: utterance.text, language: utterance.lang || 'zh-CN', rate: utterance.rate || 1 }).then(() => {
        if (current !== sequence) return;
        synthesis.speaking = false; utterance.onend?.();
      }, () => {
        if (current !== sequence) return;
        synthesis.speaking = false; utterance.onerror?.();
        const toast = document.createElement('div');
        toast.setAttribute('role', 'alert');
        toast.textContent = '朗读不可用，请在系统文字转语音设置中安装对应的离线语音包。';
        toast.style.cssText = 'position:fixed;bottom:24px;left:16px;right:16px;padding:16px;background:#24382f;color:white;border-radius:16px;z-index:99999;font:16px sans-serif';
        document.body.append(toast); setTimeout(() => toast.remove(), 6000);
      });
    },
  };
  // Android WebView does not provide Web Speech synthesis. Keep the existing
  // learning UI while routing speech through Android's installed offline voices.
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
  Object.defineProperty(window, 'speechSynthesis', { value: synthesis, configurable: true });
  const stop = () => synthesis.cancel();
  window.addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  if (!parentRuntime) {
    void App.addListener('backButton', () => {
      if (stack.dispatch()) return;
      if (location.pathname !== '/' && location.pathname !== '/index.html') location.replace('/');
      else void App.minimizeApp();
    });
    void App.addListener('appStateChange', ({ isActive }) => { if (!isActive) stop(); });
  }
}
