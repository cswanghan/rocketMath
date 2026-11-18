# 星芽 Android 三科体验版

本工程使用 Capacitor 8 将现有 React 学习界面、三科题库和汉字笔顺一起打进 APK，首次启动无需联网。Android 包名 `com.hanwang.xingya`，版本 `1.0.0 (2)`，最低 Android 7 / API 24，目标 API 36。

## 安卓界面与安装

Build 2 使用独立的 Android 界面：学习 / 进度 / 我的底部导航、科目标签、年级底部面板、应用内登录注册、统一的题目和反馈布局，以及系统深色模式和字体大小。语文生字选择、英语词汇筛选集中到工具面板，原有学习模式与数据保持兼容。实现仍为 React/Capacitor，并非 Kotlin/Compose 重写。

下载目录中的 `xingya-android-1.0.0-build2-test.apk` 可发给其他安卓测试用户。已有 Build 1 可直接覆盖安装，两版使用相同包名和本机调试签名；不要先卸载，以免删除本机记录。此为测试分发包，尚未发布安卓商店。

需要账号时进入 **我的 → 登录 / 注册**，使用星芽用户名和密码。无需更改手机系统账号，无需登录也能练习三科。

## 内容和交互

- 数学：三至九年级现有全部题库；口算停输约 1 秒自动判题，选择题点选即判，数值填空使用固定数字键盘（支持小数、负号、退格）。非口算填空保留提交步骤。
- 语文：143 张生字卡，笔顺/临摹、拼音、偏旁、生字本；一至六年级 12 篇原创短文、36 道阅读理解。全部笔顺数据本地可用。
- 英语：516 个 A2/B1 词汇，4 组共 128 道阅读/语法题；本地练习和词汇进度。
- 安卓返回键先关闭当前面板，再返回上层；未完成的知识练习退出前确认，口算/限时训练直接结束本次练习；首页返回时将应用放入后台。
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

实际结果和未完成验收见 [Build 2 验收记录](../docs/android/acceptance-build2-2026-11-18.md)；首版历史记录见 [Build 1](../docs/android/acceptance-2026-11-18.md)。iOS 构建、题库生成器和练习引擎未修改；本工作区独立于 iOS/TestFlight 自动化工作区。

## 布局复验

在专用模拟器设定屏幕、字体和深色模式后，可仅执行布局用例（截图文件带标签）：

```sh
sh scripts/android-gradle.sh :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=com.hanwang.xingya.OfflineLearningTest#layoutAtConfiguredDisplay \
  -Pandroid.testInstrumentationRunnerArguments.layoutLabel=custom
```

Build 2 已测 320 CSS px 小屏、1280 × 800 CSS px 横屏、系统 font_scale=2.0 和系统深色模式。改变模拟器配置后应恢复原有 size/density/font_scale/night 设置。Android 真机、TalkBack 和各厂商键盘仍需另行验收。
