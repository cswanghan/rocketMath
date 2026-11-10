import type { CapacitorConfig } from '@capacitor/cli';

// Bundle id is a placeholder. Replace it with the id registered to the
// Apple Developer team before creating the App Store record. Do not use a
// Rocket Math / Cambridge bundle id.
const config: CapacitorConfig = {
  appId: 'app.xingya.learn',
  appName: '星芽',
  webDir: 'dist',
  backgroundColor: '#fcfbf9',
  ios: {
    contentInset: 'never',
    scheme: 'capacitor',
    backgroundColor: '#fcfbf9',
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#fcfbf9',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'native',
    },
  },
};

export default config;
