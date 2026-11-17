# Routes / screen map — 星芽 iOS (SwiftUI, no URL router)

There is no React Router / file-based web routing. Navigation is SwiftUI state in `RootView` plus NavigationStack / destination pushes.

## App flow
1. `XingyaApp` opens store → `RootView`
2. If no grade: `GradePickerView`
3. Load `AppContent` for grade; if student has no latency gate: `ProbeView`
4. Main shell `TabView`:
   - Tab "首页" (`house.fill`) → `KnowledgeMapView` (learning map; entry to practice / play / race)
   - Tab "报告" (`chart.bar.fill`) → `ReportView`
   - Tab "我的" (`person.fill`) → `ProfileView`
5. From map or profile: `onAccount` sets `showAccount` → `AccountView` (contains `MembershipSection`, can present `AuthView`)
6. From map or profile: `onParent` → `ParentGateView` then `ParentDashboardView`
7. Time lock can show `LockView` (via TimeLockService environment)
8. Practice / fluency / race are pushed from the knowledge map (not tabs)

## Screen inventory
| Screen | File | How reached | Layout |
|---|---|---|---|
| Grade picker | `ios/Xingya/Views/GradePickerView.swift` | Root when grade == nil | NavigationStack, candy grade pills |
| Probe / warmup | `ios/Xingya/Views/ProbeView.swift` | After load if no latency gate | Full screen probe |
| Knowledge map (首页) | `ios/Xingya/Views/KnowledgeMapView.swift` | Tab 首页 | Scroll + candy topic cards, `home-menu` |
| Fluency play | `ios/Xingya/Views/PlayView.swift` | Map / HomeView track | Question, timer, correction, must tap 继续 |
| Practice | `ios/Xingya/Views/PracticeView.swift` | Map practice node | Question card, numpad, 3-tier progress, must continue |
| Race | `ios/Xingya/Views/RaceView.swift` | Map race entry | Timed race + numpad |
| Report | `ios/Xingya/Views/ReportView.swift` | Tab 报告 | Charts / stats, Theme page background |
| Profile (我的) | `ios/Xingya/Views/ProfileView.swift` | Tab 我的 | Avatar/header, 账号 entry "👤 账号", parent, change grade |
| Account | `ios/Xingya/Views/AccountView.swift` | Replaces tab root | User-seen: system List; mid-flight: incomplete cards |
| Auth login/register | `ios/Xingya/Views/AuthView.swift` | Sheet/from Account | User-seen: system Form, sparse, light buttons |
| Membership | `ios/Xingya/Views/MembershipSection.swift` | Inside Account | User-seen: bilingual List section, pink text links as CTA |
| Parent gate | `ios/Xingya/Views/ParentGateView.swift` | Before parent dashboard | Math gate |
| Parent dashboard | `ios/Xingya/Views/ParentDashboardView.swift` | After gate | System List, local vs AI summary (membership) |
| Lock | `ios/Xingya/Views/LockView.swift` | Time lock | Rest / lock screen |
| Legacy fluency home | `ios/Xingya/Views/HomeView.swift` | Not the current tab home | System List of tracks |

## Product rules (must preserve in redesign)
- Oral math, practice, and local analysis are free offline; no login required for core practice.
- Monthly membership is only for cloud sync + AI parent summaries; must log in and attach the Apple purchase.
- Price comes from StoreKit `displayPrice`, never hardcode ¥18 or $2.99.
- Chinese locale must be Chinese-only on a screen; never bilingual stacked labels like "订阅月度会员 · Subscribe".
