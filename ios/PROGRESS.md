
### P4 上架工程配置（2026-07-21）
- **隐私清单** `PrivacyInfo.xcprivacy`：Apple 2024 起强制。当前全本地运行 → 不追踪、不收集离设备数据；仅声明 UserDefaults(CA92.1，存静音/时间锁)。P3 接账号后需更新。
- **加密合规声明**：`INFOPLIST_KEY_ITSAppUsesNonExemptEncryption = NO`，免去每次上传的出口合规弹窗。
- **类目**：`LSApplicationCategoryType = public.app-category.education`（教育）。
- **App 图标**：`tools/render-icon.swift`（CoreGraphics 渲染 1024×1024，蓝紫渐变 + 火箭 + 星 + 火焰），无 alpha 无圆角，符合 App Store 要求。已编译进 Assets.car。
- 真机架构（generic/platform=iOS，arm64）不签名编译通过。
- **签名 + archive + 上传需 Apple ID 在本机 Xcode 登录**（无法代劳）：见下方操作清单。

### P4 待用户操作（签名相关，本机 Xcode）
- bundle id `com.xingya.app` 需在 App Store Connect 注册，或改成用户可注册的唯一 id。
- 年龄分级建议 4+，**暂不进 Kids 类目**（Kids 类目要隐私政策 URL + COPPA，等 P3 有账号再评估）。
