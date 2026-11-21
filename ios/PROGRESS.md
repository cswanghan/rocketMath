### 当前更新（2026-11-18）

- Build 11已上传并加入TestFlight“发布验收”组；固定数字键盘修复已分发。
- 本地Build 12完成朗读、角度配图、AI错题分析入口及提示词修复，测试与Release设备构建已验证；尚未部署后端、签名上传或更换审核。
- 详细结果、StoreKit首次失败与复验、未完成的真机验收见 [反馈处理记录](../docs/testflight-feedback-log.md)。以下保留历史提交记录。

### P4 / ASC 提交（2026-07-22）— 材料齐，Archive 已出

| 项 | 状态 | 位置 |
|----|------|------|
| **提交手册** | ✅ | **`ios/ASC_SUBMIT.md`**（按序操作） |
| 版本 | ✅ | **1.0.0 (1)** |
| 隐私 / 支持 | ✅ 线上 | privacy.html · app-support.html |
| 截图成片 | ✅ | `final-iphone-6.7/` · `final-ipad-13/` |
| 审核账号 | ✅ | `appstore_review` / `[stored only in App Store Connect]` |
| 账号删除 API+UI | ✅ | POST `/api/auth/delete-account` · 账号页 |
| Release Archive | ✅ 本机已打出 | `ios/build/Xingya.xcarchive` |
| 上传 ASC | ⏳ | 需 Xcode 登录 Apple ID → Organizer → Distribute |

### 你现在要做的（约 20 分钟）
1. 打开 **`ios/ASC_SUBMIT.md`** 按第 1–6 节在 ASC 填元数据 + 截图  
2. Xcode → **Settings → Accounts** 登录有 Team `QY29J9ZMPU` 的 Apple ID  
3. **Window → Organizer** → 选 `Xingya 1.0.0` Archive → **Distribute App**  
   - 若 Organizer 没有：再跑一次 `./ios/tools/archive-for-asc.sh` 或 Product → Archive  
4. ASC 选中构建 → **提交审核**

### P3 线上验证
- 注册/登录 OK
- 进度同步 push/pull OK（D1 `math_*` 表）
- 部署命令：`npm run deploy:cf`（项目 rocket-math / branch main）
