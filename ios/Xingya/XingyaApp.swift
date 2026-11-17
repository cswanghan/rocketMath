import SwiftData
import SwiftUI

@main
struct XingyaApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @AppStorage("appLanguage") private var language = L10n.language
    @AppStorage("appAppearance") private var appearance = "system"
    @State private var speech = SpeechService()
    @State private var auth = AuthSession.forLaunch()
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
                    RootView().id(language)
                        .environment(speech)
                        .environment(auth)
                        .environment(store)
                        .modelContainer(container)
                } else if openingFailed {
                    ContentUnavailableView {
                        Label("学习数据暂时无法打开", systemImage: "externaldrive.badge.exclamationmark")
                    } description: {
                        Text(L10n.text(StoreOpening.recoveryMessage))
                    } actions: {
                        Button("重试", action: openStore)
                            .accessibilityIdentifier("storage-retry")
                    }
                } else {
                    ProgressView("正在打开学习数据…")
                }
            }
            .environment(\.locale, Locale(identifier: language))
            .fontDesign(.rounded)
            .tint(Theme.brand)
            .preferredColorScheme(appearance == "dark" ? .dark : appearance == "light" ? .light : nil)
            .task { if container == nil && !openingFailed { openStore() } }
            .task(id: auth.token) { await store.connect(auth) }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { Task { await store.refresh() } }
            }
        }
    }
}
