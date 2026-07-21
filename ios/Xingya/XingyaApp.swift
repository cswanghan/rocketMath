import SwiftData
import SwiftUI

@main
struct XingyaApp: App {
    @State private var speech = SpeechService()

    private let container: ModelContainer = {
        do {
            return try ModelContainer(for: Schema(SwiftDataStorage.schema))
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
