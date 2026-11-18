import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hanwang.xingya',
  appName: '星芽',
  loggingBehavior: 'none',
  webDir: 'dist-android',
  // Package the learning UI and all curriculum assets. Never load the live
  // website as the app or allow remote documents to access native plugins.
  server: { androidScheme: 'https', hostname: 'localhost' },
  plugins: { SystemBars: { insetsHandling: 'native', initialViewportFitValueHint: 'auto' } },
  android: { allowMixedContent: false, backgroundColor: '#f8faf8' },
};
export default config;
