# 星芽商店/审核截图索引（2026-11-11，Asia/Shanghai）

全部来自本机 Simulator 真实 UI 测试附件，首次写入受权目录：

- iPhone：`ios/sim-shots-sunny/english-hardening-iphone/`（iPhone 17 Pro 原生 **1206×2622**，Dynamic Island 中屏必需尺寸）
- iPad：`ios/sim-shots-sunny/english-hardening-ipad/`（iPad Pro 13-inch M5 原生 **2064×2752**，13 英寸必需尺寸）

未使用、未复制 `/tmp/xingya-codex-v3/` 或任何被拒临时文件。未使用旧蓝紫营销成片。

## 建议上传（已按语言和尺寸整理）

| ASC 位置 | 路径 | 尺寸 | 说明 |
| --- | --- | --- | --- |
| iPhone with Dynamic Island (**medium**, 必需) | `iphone-dynamic-island-medium-1206x2622/{zh-Hans,en-US}/` | 1206×2622 原生 | 优先上传这套 |
| iPhone with Dynamic Island (**large**, 可选，用于替换现有 5 张旧图) | `iphone-dynamic-island-large-1320x2868/{zh-Hans,en-US}/` | 1320×2868 | **同一组 17 Pro 真机界面图**，仅官方比例缩放到大屏尺寸（1206/2622 ≈ 1320/2868）。不是 17 Pro Max 再拍的新画面 |
| iPad 13-inch（若支持 iPad 则必需） | `ipad-13-2064x2752/{zh-Hans,en-US}/` | 2064×2752 原生 | |
| 订阅商品审核图 | `subscription-review/{zh-Hans,en-US}/05-membership-paywall.png` | 来自账号页截图 | **上传前请目视确认**是否完整露出商品名、StoreKit 价格、订阅/恢复。本轮未单独跑 PaywallScreenshotUITests |

完整按测试名命名的源文件在 `named-source/`。不要上传 dark-mode/AX5、空报告或超时图作为商店主图。

中英商店文案和审核备注在上一级目录的 Markdown 文件中。


## 目视核验（2026-11-11 12:47 Asia/Shanghai）

已抽看 iPhone 中屏：

- `zh-Hans/01-home-knowledge-map.png`、`en-US/01-home-knowledge-map.png`：向阳实现，中英界面分离，适合作为商店主图。
- **不要把账号/会员图直接作为商店或订阅审核终稿。** `05-account-membership.png` 与 `subscription-review/*/05-membership-paywall.png` 顶部有红字「无法访问安全登录存储，请解锁设备后重试…」。该提示在英文账号页仍为中文。订阅按钮因未登录呈禁用。价格为模拟器 StoreKit 返回的 `$18.00`，是本地示例 `displayPrice`，**不能**当作已验证 Sandbox/正式目录或已批准售价。中文页商品名显示为英文 `Xingya Premium Monthly`（来自本地 StoreKit 配置）。

建议商店先上传首页、练习、报告（及英文的竖式/家长图）。会员审核图需另拍一张无钥匙串错误、尽量露出完整续订说明的画面后再传。本轮未再跑 `PaywallScreenshotUITests`，也未在 17 Pro Max 上重拍大屏（大屏目录仅为中屏原图按官方尺寸缩放）。
