import { isNativeApp } from './platform';

/** Apply iOS chrome. No-ops on the website and never blocks the first paint. */
export async function bootNativeShell(): Promise<void> {
  if (!isNativeApp()) return;
  document.documentElement.classList.add('native-app');
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    /* status bar plugin is unavailable outside the iOS shell */
  }
  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
  } catch {
    /* keyboard plugin is unavailable outside the iOS shell */
  }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* splash plugin is unavailable outside the iOS shell */
  }
}
