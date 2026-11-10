// Runtime split between the Cloudflare Pages site and the Capacitor iOS shell.
// The learning engines stay the same. Only the shell's network policy changes.

export const PRODUCTION_ORIGIN = 'https://rocket-learning.pages.dev';

export interface CapacitorProbe {
  isNativePlatform?: () => boolean;
}

export interface NativeWindow {
  Capacitor?: CapacitorProbe;
}

/** What the iOS binary is allowed to do. The website keeps its current behavior. */
export interface ShellPolicy {
  native: boolean;
  /** First-party /api/track uploads. Trial counters stay local either way. */
  uploadAnalytics: boolean;
  /** Parent summary via DeepSeek. Local summary stays available. */
  remoteSummary: boolean;
  /** 闲鱼 / 支付宝 links inside the installed app. */
  externalCommerce: boolean;
  /** Google Identity Services. It does not run inside WKWebView. */
  googleSignIn: boolean;
  /** fonts.googleapis.com */
  remoteFonts: boolean;
  /** jsDelivr stroke JSON and Hanzi Writer / cnchar script tags. */
  thirdPartyStrokeCdn: boolean;
  /** Web Speech Recognition. Typing remains available. */
  speechRecognition: boolean;
}

export function isNativeApp(win: NativeWindow | undefined = globalThis as NativeWindow): boolean {
  try {
    const cap = win?.Capacitor;
    return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  } catch {
    return false;
  }
}

export function shellPolicy(native = isNativeApp()): ShellPolicy {
  return {
    native,
    uploadAnalytics: !native,
    remoteSummary: !native,
    externalCommerce: !native,
    googleSignIn: !native,
    remoteFonts: !native,
    thirdPartyStrokeCdn: !native,
    speechRecognition: !native,
  };
}

/** Empty string on the website so existing relative /api calls stay on the page origin. */
export function apiOrigin(win?: NativeWindow): string {
  return isNativeApp(win) ? PRODUCTION_ORIGIN : '';
}

export function apiUrl(path: string, win?: NativeWindow): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return apiOrigin(win) + normalized;
}
