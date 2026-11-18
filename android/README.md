# 星芽 Android 三科体验版

本工程使用 Capacitor 8 将现有 React 学习界面、三科题库和汉字笔顺一起打进 APK，首次启动无需联网。Android 包名 `com.hanwang.xingya`，版本 `1.0.0 (1)`，最低 Android 7 / API 24，目标 API 36。

## 内容和交互

- 数学：三至九年级现有全部题库；口算停输约 1 秒自动判题，选择题点选即判，数值填空使用固定数字键盘（支持小数、负号、退格）。非口算填空保留提交步骤。
- 语文：143 张生字卡，笔顺/临摹、拼音、偏旁、生字本；一至六年级 12 篇原创短文、36 道阅读理解。全部笔顺数据本地可用。
- 英语：516 个 A2/B1 词汇，4 组共 128 道阅读/语法题；本地练习和词汇进度。
- 安卓返回键逐层退出练习/科目；首页返回时将应用放入后台。
- 账号可选，离线练习不受网页版试用次数限制。仅明确的 401/403 清除登录；断网或服务故障保留缓存账号、当前孩子和本地进度。
- 使用系统已安装的离线中文/英语语音。缺少对应语音包时显示安装提示，后台或离开页面停止朗读。未接入语音识别。
- 家长错题分析使用本地规则。首版没有 Google Play/其他安卓支付、Apple/Google 登录、云端 AI 分析；不展示不存在的购买入口。

可使用现有星芽用户名/密码服务，只有账号、孩子档案、英语进度与生字本等现有 API 在联网时访问固定 HTTPS 后端。数学进度仍存本机；停用安卓行为统计上传。会话和学习数据排除系统云备份及设备迁移；卸载会删除本地数据。详见应用“关于”。

## 本地构建

需要 Node 22+、JDK 21、Android SDK Platform 36 / Build Tools 36.0.0 / Platform Tools。SDK 由 [Android 官方工具](https://developer.android.com/studio)安装；Capacitor 环境要求见[官方说明](https://capacitorjs.com/docs/getting-started/environment-setup)。

```sh
npm ci
export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME=/path/to/android-sdk
npm run android:apk
```

macOS 脚本默认查找 Homebrew JDK 21 和 `~/Library/Android/sdk`；其他平台请显式设置环境变量。

APK：`android/app/build/outputs/apk/debug/app-debug.apk`。这是本地调试签名的可安装测试包，不是商店发布包。签名密钥、机器路径、构建产物均不提交。`npm run android:sync` 会从源码重新生成全部离线资源，不能省略后仅运行 Gradle。

## 回归验证

```sh
npx tsc --noEmit
npm test
npm run test:content
npm run android:test
```

使用**专用测试模拟器**运行界面测试，Gradle 会安装并卸载测试应用。先关闭该模拟器的 Wi-Fi 和移动数据，再执行：

```sh
npm run android:device-test
```

覆盖三科、离线笔顺加载、阅读答案反馈、英语即时判题、数字键盘/负号/小数、安卓返回、Activity 重建后 XP 和年级保持、模拟缓存账号/孩子离线保持、缺失语音包提示。截图输出在测试设备的 `/sdcard/Download/xingya-test/`。

恢复该模拟器联网后执行：

```sh
npm run android:network-test
```

此测试只通过 App 的原生 HTTP 桥读取无登录的 `/api/auth/me`，验证真实 401 状态及 JSON 响应，不创建账号、不写生产数据。

实际结果和未完成验收见 [验收记录](../docs/android/acceptance-2026-11-18.md)。iOS 构建、题库生成器和练习引擎未修改；本工作区独立于 iOS/TestFlight 自动化工作区。
