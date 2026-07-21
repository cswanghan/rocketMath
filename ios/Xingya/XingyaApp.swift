import SwiftData
import SwiftUI

@main
struct XingyaApp: App {
    @State private var speech = SpeechService()

    private let container: ModelContainer = {
        // UI 测试传 UITEST_MEMORY 时用内存库，保证每次从干净状态跑（探针会重做、
        // 进度从 A 关起飞），断言才可复现。UserDefaults 里的时间锁另行在测试中清。
        let inMemory = ProcessInfo.processInfo.arguments.contains("UITEST_MEMORY")
        do {
            let config = ModelConfiguration(isStoredInMemoryOnly: inMemory)
            return try ModelContainer(for: Schema(SwiftDataStorage.schema), configurations: config)
        } catch {
            fatalError("SwiftData 容器创建失败：\(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(speech)
        }
        .modelContainer(container)
    }
}
