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
