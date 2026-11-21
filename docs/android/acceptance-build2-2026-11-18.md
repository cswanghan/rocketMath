# Android Build 2 设计改版验收

版本 1.0.0 (2)，包名 `com.hanwang.xingya`。独立工作区与分支 `codex/android-client`；旧 Build 1 和 iOS 工作区均保留。

## 改版结果

- Android 专用首页：学习 / 进度 / 我的底部导航，数学 / 语文 / 英语标签，统一 AppBar、48dp 最小主要操作区域、年级选择底部面板。
- 数学知识点列表、专注答题布局、清晰的数字键盘和答案反馈；知识练习顶部返回与系统返回使用同一退出确认。口算、竞速保留实时训练逻辑及直接退出，避免确认等待被记录成超时答题。
- 语文生字选择置于可展开面板；原创阅读置前，自定义文章收起；英语等级/主题/每日计划/释义设置进入模态面板，核心词卡与操作置前。保留全部原有学习模式及本地数据键。
- 登录/注册留在应用内；离线失败显示中文说明并保留输入。注册成功按后端契约提示用户登录，不假定注册会返回会话。
- 统一系统字体、绿色操作色、浅色/深色主题、平板宽度及系统大字体适配。进度显示实际本机 XP 与学习日期；家长报告继续要求 PIN。

实现为 React/Capacitor 的 Android 专用界面与原生适配，并非 Kotlin/Compose 重写。没有修改题库、数学/练习引擎、iOS 源码或后端。

## 实际验证

- TypeScript 检查通过；20 个 Vitest 文件、546 项回归通过；5 项内容测试通过；英语 128 题与语文 12 篇/36 题检查通过。
- Android APK 构建、Java 单元测试任务、Android Lint 通过。Lint 为 **0 errors / 9 warnings**，剩余为现有依赖更新提示、未使用模板资源与 monochrome 图标提示。
- Android 16 / API 36 / ARM64 模拟器关闭 Wi-Fi 与数据后，原生 ConnectivityManager 确认无活动网络。三科入口、离线笔顺、阅读反馈、英语点选即时反馈、数字键盘 `-1.1`、退出确认、导航返回、Activity 重建后 XP/年级保持通过。
- 年级面板的模态焦点与返回恢复通过；英语工具面板关闭后仍留在词汇页。离线登录错误、缓存测试账号/孩子档案保持、缺失语音包提示通过。缓存使用隔离测试数据，不代表真实用户登录验收。
- 普通手机、320 CSS px 小屏、1280 × 800 CSS px 横屏、系统 200% 字体、系统深色模式布局用例通过，检查页面横向溢出、主要操作尺寸并保存实际截图。大字体周历换行问题已修正；深色生字笔顺实际加载后复核。
- 联网原生 HTTP 桥只读请求 `/api/auth/me` 返回真实 401 和 JSON，测试通过，未写生产数据。
- Web 生产构建通过；APK `apksigner verify` 通过；versionCode=2、minSdk=24、targetSdk=36。Build 1 与 Build 2 签名证书相同；包内未发现 `.env`、`.p8`、`.p12`、`.jks` 或 `.keystore` 文件。

截图：[学习首页](build2-screenshots/build2-home.png)、[英语词卡](build2-screenshots/build2-layout-default-vocab.png)、[深色首页](build2-screenshots/build2-layout-dark.png)、[数字键盘](build2-screenshots/build2-math-keypad.png)。这是模拟器截图，不是真机验收记录。

## 尚未验收 / 未实施

- 无 Android 真机；厂商系统、Android 7–15、物理键盘/软键盘、返回手势、TalkBack 朗读顺序、实际 TTS 听感、减少动态效果设置仍待设备验收。
- 真实账号注册/登录与家庭档案、跨设备英语/生字本同步，未使用真实凭据完成验收。
- 未接入安卓订阅支付、Apple/Google 快捷登录；未创建正式商店签名或商店发布包，未部署后端、未更改 iOS 提审。

## 安装包

- 文件：`xingya-android-1.0.0-build2-test.apk`（本机 Downloads 和忽略的 android-artifacts 目录）。
- 大小：21449845 bytes。
- SHA-256：`dfde49d246c3fb2041145785d995b7f3996531b75bbf48115ad2aa7b5408da5e`。
- 本机调试签名，仅用于测试分发。已有 Build 1 请覆盖安装；不要卸载或清除应用数据。
