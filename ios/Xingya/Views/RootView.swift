// 根视图：加载 content pack → 没做过基线探针就先热身 → 进首页。
// content pack 校验失败要**响亮报错**（SPEC §4），绝不静默降级成空界面。

import SwiftData
import SwiftUI

struct RootView: View {
    @Environment(\.modelContext) private var modelContext

    @State private var pack: ContentPack?
    @State private var loadError: String?
    @State private var storage: (any StorageAdapter)?
    @State private var needsProbe = false

    /// 单机单人：MVP 固定一个本地学生 id，P3 接账号后换成真实用户
    private let studentId = "local"

    var body: some View {
        Group {
            if let error = loadError {
                ContentUnavailableView(
                    "内容包加载失败",
                    systemImage: "shippingbox.badge.exclamationmark",
                    description: Text(error)
                )
            } else if let pack, let storage {
                if needsProbe {
                    ProbeView(pack: pack, storage: storage, studentId: studentId) { _ in
                        withAnimation { needsProbe = false }
                    }
                } else {
                    HomeView(pack: pack, storage: storage, studentId: studentId)
                }
            } else {
                ProgressView("载入中…")
            }
        }
        .task {
            guard pack == nil else { return }
            let store = SwiftDataStorage(context: modelContext)
            storage = store
            do {
                let loaded = try ContentPackLoader.load("grade3_math_fluency_pack")
                pack = loaded
                needsProbe = store.student(id: studentId)?.latencyGateMs == nil
            } catch {
                loadError = "\(error)"
            }
        }
    }
}
