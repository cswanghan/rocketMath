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
    @State private var selectedTab = 0

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
                ContentUnavailableView {
                    Label("内容加载失败", systemImage: "shippingbox.badge.exclamationmark")
                } description: {
                    Text(L10n.text(error))
                } actions: {
                    Button("重试") { loadError = nil; grade = nil }
                }
            } else if grade == nil {
                NavigationStack {
                    GradePickerView { selected in
                        withAnimation { grade = selected }
                    }
                }
            } else if showParent, let storage {
                if parentUnlocked {
                    ParentDashboardView(storage: storage, studentId: studentId, selectedGrade: grade) {
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
                        VStack(spacing: 0) {
                            Group {
                                switch selectedTab {
                                case 1: ReportView(content: loaded, storage: storage, studentId: studentId)
                                case 2: ProfileView(content: loaded, storage: storage, studentId: studentId,
                                                    onParent: goParent, onAccount: goAccount, onChangeGrade: goChangeGrade)
                                default: KnowledgeMapView(content: loaded, storage: storage, studentId: studentId,
                                                          onParent: goParent, onChangeGrade: goChangeGrade, onAccount: goAccount)
                                }
                            }.frame(maxWidth: .infinity, maxHeight: .infinity)
                            HStack(spacing: 0) {
                                tab("首页", symbol: "house", index: 0)
                                tab("报告", symbol: "chart.bar", index: 1)
                                tab("我的", symbol: "person", index: 2)
                            }
                            .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
                            .padding(.top, 10).background(Theme.card)
                            .overlay(alignment: .top) { Rectangle().fill(Theme.line).frame(height: 1) }
                        }.background(Theme.card).tint(Theme.brand)
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
                #if DEBUG
                if uiTest && ProcessInfo.processInfo.arguments.contains("SUNNY_UI_TEST") {
                    storage?.putStudent(StudentRecord(id: studentId, createdAt: Int(Date().timeIntervalSince1970 * 1000), latencyGateMs: 30000, xp: 0))
                    needsProbe = false
                }
                #endif
            } catch {
                loadError = "\(error)"
            }
        }
    }
    private func tab(_ title: String, symbol: String, index: Int) -> some View {
        Button { selectedTab = index } label: {
            VStack(spacing: 5) {
                Image(systemName: symbol).font(.title2)
                Text(L10n.text(title)).font(.caption.bold())
            }.foregroundStyle(selectedTab == index ? Theme.brand : Theme.sub)
                .frame(maxWidth: .infinity, minHeight: 48).contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityIdentifier("tab-\(index)")
            .accessibilityAddTraits(selectedTab == index ? .isSelected : [])
    }
}
