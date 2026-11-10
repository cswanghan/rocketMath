import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('iOS release config', () => {
  it('names the shell 星芽 and keeps the web build local', () => {
    const config = read('capacitor.config.ts');
    expect(config).toContain("appId: 'app.xingya.learn'");
    expect(config).toContain("appName: '星芽'");
    expect(config).toContain("webDir: 'dist'");
    expect(config).toContain("scheme: 'capacitor'");
    expect(config).not.toContain('server:');
  });

  it('does not request camera, location, tracking, or microphone', () => {
    const plist = read('ios/App/App/Info.plist');
    expect(plist).toContain('<key>ITSAppUsesNonExemptEncryption</key>');
    expect(plist).toMatch(/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
    expect(plist).toContain('<string>星芽</string>');
    for (const key of [
      'NSCameraUsageDescription',
      'NSMicrophoneUsageDescription',
      'NSSpeechRecognitionUsageDescription',
      'NSLocationWhenInUseUsageDescription',
      'NSUserTrackingUsageDescription',
      'NSPhotoLibraryUsageDescription',
    ]) {
      expect(plist).not.toContain(key);
    }
    const privacy = read('ios/App/App/PrivacyInfo.xcprivacy');
    expect(privacy).toMatch(/<key>NSPrivacyTracking<\/key>\s*<false\/>/);
    expect(privacy).toContain('NSPrivacyCollectedDataTypeEmailAddress');
    expect(privacy).toContain('NSPrivacyCollectedDataTypeOtherUserContent');
    expect(privacy).not.toContain('NSPrivacyCollectedDataTypePurposeAdvertising');
  });

  it('keeps commerce pages out of the native sync step and analytics off the shell', () => {
    const strip = read('scripts/strip-ios-commerce.mjs');
    expect(strip).toContain('support.html');
    expect(strip).toContain('admin.html');
    const track = read('public/track.js');
    expect(track).toContain('if (window.RM_NATIVE) return;');
    const login = read('public/login.html');
    expect(login).toContain('/platform.js');
    expect(login).not.toMatch(/fetch\(\s*['"]\/api\//);
    expect(login).toContain('iOS 版请使用用户名和密码');
  });
});
