# Shared layouts — 星芽 iOS

App shell is `XingyaApp` → `RootView`. After grade + probe, a `TabView` with three tabs: 首页, 报告, 我的. Account and parent screens replace the tab root (not a sheet in current RootView). HomeView.swift is an older fluency-track list, not the current tab home.
## XingyaApp
- File path: `ios/Xingya/XingyaApp.swift`
- Description: App entry; opens SwiftData, injects Speech/Auth/StoreKit, shows RootView or storage-failure empty state.

```swift
import SwiftData
import SwiftUI

@main
struct XingyaApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @State private var speech = SpeechService()
    @State private var auth = AuthSession()
    @State private var store = StoreKitService()

    @State private var container: ModelContainer?
    @State private var openingFailed = false

    private func openStore() {
        let inMemory = ProcessInfo.processInfo.arguments.contains("UITEST_MEMORY")
        let schema = Schema(SwiftDataStorage.schema)
        let result = StoreOpening.attempt {
            if inMemory {
                return try ModelContainer(
                    for: schema,
                    configurations: ModelConfiguration(isStoredInMemoryOnly: true)
                )
            }
            return try ModelContainer(for: schema)
        }
        switch result {
        case .success(let opened):
            container = opened
            openingFailed = false
        case .failure:
            openingFailed = true
        }
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if let container {
                    RootView()
                        .environment(speech)
                        .environment(auth)
                        .environment(store)
                        .modelContainer(container)
                } else if openingFailed {
                    ContentUnavailableView {
                        Label("学习数据暂时无法打开", systemImage: "externaldrive.badge.exclamationmark")
                    } description: {
                        Text(StoreOpening.recoveryMessage)
                    } actions: {
                        Button("重试", action: openStore)
                            .accessibilityIdentifier("storage-retry")
                    }
                } else {
                    ProgressView("正在打开学习数据…")
                }
            }
            .task { if container == nil && !openingFailed { openStore() } }
            .task(id: auth.token) { await store.connect(auth) }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { Task { await store.refresh() } }
            }
        }
    }
}
```
## RootView (app shell + tab bar)
- File path: `ios/Xingya/Views/RootView.swift`
- Description: Grade picker → load content → probe → TabView (KnowledgeMap / Report / Profile). Also branches to ParentGate/ParentDashboard and AccountView. Tab tint is Theme.brand.

```swift
// 根视图：年级选择 → 加载整年级内容 → 热身探针 → 知识地图首页。
// content 校验失败要**响亮报错**（SPEC §4），绝不静默降级成空界面。

import SwiftData
import SwiftUI

struct RootView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(AuthSession.self) private var auth

    @State private var grade: Int?
    @State private var content: AppContent?
    @State private var loadError: String?
    @State private var storage: (any StorageAdapter)?
    @State private var needsProbe = false
    @State private var timeLock: TimeLockService?
    @State private var showParent = false
    @State private var parentUnlocked = false
    @State private var showAccount = false

    /// 保留既有本机数据；SyncOwnership 限制只有首次关联账号可导出/拉取。
    private let studentId = "local"

    init() {
        // UI 测试默认三年级，跳过选年级；生产环境读上次选择
        let uiTest = ProcessInfo.processInfo.arguments.contains("UITEST_MEMORY")
        _grade = State(initialValue: uiTest ? 3 : Grades.saved)
    }

    var body: some View {
        Group {
            if let error = loadError {
                ContentUnavailableView(
                    "内容加载失败",
                    systemImage: "shippingbox.badge.exclamationmark",
                    description: Text(error)
                )
            } else if grade == nil {
                NavigationStack {
                    GradePickerView { selected in
                        withAnimation { grade = selected }
                    }
                }
            } else if showParent, let storage {
                if parentUnlocked {
                    ParentDashboardView(storage: storage, studentId: studentId) {
                        withAnimation {
                            showParent = false
                            parentUnlocked = false
                        }
                    }
                } else {
                    ParentGateView(
                        onCancel: {
                            withAnimation {
                                showParent = false
                                parentUnlocked = false
                            }
                        },
                        onUnlocked: { withAnimation { parentUnlocked = true } }
                    )
                }
            } else if showAccount, let storage {
                AccountView(storage: storage, studentId: studentId) {
                    withAnimation { showAccount = false }
                }
            } else if let loaded = content, let storage, let timeLock {
                Group {
                    if needsProbe {
                        ProbeView(pack: loaded.fluencyPack, storage: storage, studentId: studentId) { _ in
                            withAnimation { needsProbe = false }
                        }
                    } else {
                        let goParent = { withAnimation { showParent = true } }
                        let goAccount = { withAnimation { showAccount = true } }
                        let goChangeGrade = {
                            withAnimation {
                                grade = nil
                                content = nil
                                self.timeLock = nil
                                loadError = nil
                            }
                        }
                        TabView {
                            KnowledgeMapView(
                                content: loaded, storage: storage, studentId: studentId,
                                onParent: goParent, onChangeGrade: goChangeGrade, onAccount: goAccount
                            )
                            .tabItem { Label("首页", systemImage: "house.fill") }

                            ReportView(content: loaded, storage: storage, studentId: studentId)
                                .tabItem { Label("报告", systemImage: "chart.bar.fill") }

                            ProfileView(
                                content: loaded, storage: storage, studentId: studentId,
                                onParent: goParent, onAccount: goAccount, onChangeGrade: goChangeGrade
                            )
                            .tabItem { Label("我的", systemImage: "person.fill") }
                        }
                        .tint(Theme.brand)
                    }
                }
                .environment(timeLock)
            } else {
                ProgressView("载入中…")
            }
        }
        .task {
            await auth.refreshMe()
        }
        .task(id: grade) {
            guard let grade else { return }
            // 换年级时重新加载；storage 可复用
            if storage == nil {
                storage = SwiftDataStorage(context: modelContext)
            }
            content = nil
            loadError = nil
            do {
                let loaded = try AppContent.load(grade: grade)
                content = loaded
                // UI 测试（内存模式）禁用时间锁：测试墙钟本就慢，否则会中途触发休息屏挡住操作
                let uiTest = ProcessInfo.processInfo.arguments.contains("UITEST_MEMORY")
                timeLock = TimeLockService(config: uiTest ? nil : loaded.fluencyPack.engineConfig.timeLock)
                needsProbe = storage?.student(id: studentId)?.latencyGateMs == nil
            } catch {
                loadError = "\(error)"
            }
        }
    }
}
```
## HomeView (legacy fluency list, not the tab home)
- File path: `ios/Xingya/Views/HomeView.swift`
- Description: List of fluency tracks with RocketChart; NavigationLink into PlayView. Current tab '首页' is KnowledgeMapView, not this file.

```swift
// 首页：选 track。每条 track 显示当前关与已通过关卡数（Rocket Chart 缩略）。

import SwiftUI

struct HomeView: View {
    let pack: ContentPack
    let storage: any StorageAdapter
    let studentId: String

    @State private var startError: String?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(pack.enabledTracks, id: \.trackId) { track in
                        NavigationLink {
                            playDestination(for: track)
                        } label: {
                            row(for: track)
                        }
                    }
                } header: {
                    Text("计算流畅度")
                } footer: {
                    Text("每关分三步：起飞（连对 \(pack.engineConfig.mastery.takeOff.consecutiveCorrectWithinGate) 题）→ 环绕 → 宇宙。答错会立刻重教并重测。")
                }
            }
            .navigationTitle("星芽")
            .alert("开始失败", isPresented: .constant(startError != nil)) {
                Button("好") { startError = nil }
            } message: {
                Text(startError ?? "")
            }
        }
    }

    @ViewBuilder
    private func playDestination(for track: Track) -> some View {
        if let model = try? GameModel(trackId: track.trackId, pack: pack, storage: storage, studentId: studentId) {
            PlayView(model: model, pack: pack, storage: storage, studentId: studentId)
        } else {
            ContentUnavailableView(
                "这条 track 打不开",
                systemImage: "exclamationmark.triangle",
                description: Text("内容包里没有 \(track.trackId)")
            )
        }
    }

    private func row(for track: Track) -> some View {
        let state = storage.trackState(studentId: studentId, trackId: track.trackId)
        let levels = track.levels.map(\.level)
        let done = state?.completedLevels.count ?? 0
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(track.name).font(.headline)
                Spacer()
                Text("\(done)/\(levels.count) 关")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
            RocketChartView(
                levels: levels,
                completed: state?.completedLevels ?? [],
                current: state?.currentLevel ?? levels.first ?? "A",
                compact: true
            )
        }
        .padding(.vertical, 4)
    }
}
```
