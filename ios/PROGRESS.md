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
