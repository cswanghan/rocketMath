// 根视图：加载整年级内容（地图 + 流畅度 + 练习）→ 没做过基线探针就先热身 → 进知识地图首页。
// content 校验失败要**响亮报错**（SPEC §4），绝不静默降级成空界面。

import SwiftData
import SwiftUI

struct RootView: View {
    @Environment(\.modelContext) private var modelContext

    @State private var content: AppContent?
    @State private var loadError: String?
    @State private var storage: (any StorageAdapter)?
    @State private var needsProbe = false
    @State private var timeLock: TimeLockService?

    /// 单机单人：MVP 固定一个本地学生 id，P3 接账号后换成真实用户
    private let studentId = "local"
    /// MVP 先跑三年级，多年级 GradePicker 留后续
    private let grade = 3

    var body: some View {
        Group {
            if let error = loadError {
                ContentUnavailableView(
                    "内容加载失败",
                    systemImage: "shippingbox.badge.exclamationmark",
                    description: Text(error)
                )
            } else if let content, let storage, let timeLock {
                Group {
                    if needsProbe {
                        ProbeView(pack: content.fluencyPack, storage: storage, studentId: studentId) { _ in
                            withAnimation { needsProbe = false }
                        }
                    } else {
                        KnowledgeMapView(content: content, storage: storage, studentId: studentId)
                    }
                }
                .environment(timeLock)
            } else {
                ProgressView("载入中…")
            }
        }
        .task {
            guard content == nil else { return }
            let store = SwiftDataStorage(context: modelContext)
            storage = store
            do {
                let loaded = try AppContent.load(grade: grade)
                content = loaded
                // UI 测试（内存模式）禁用时间锁：测试墙钟本就慢，否则会中途触发休息屏挡住操作
                let uiTest = ProcessInfo.processInfo.arguments.contains("UITEST_MEMORY")
                timeLock = TimeLockService(config: uiTest ? nil : loaded.fluencyPack.engineConfig.timeLock)
                needsProbe = store.student(id: studentId)?.latencyGateMs == nil
            } catch {
                loadError = "\(error)"
            }
        }
    }
}
