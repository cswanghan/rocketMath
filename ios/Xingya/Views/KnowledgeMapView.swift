// 知识地图首页：上册/下册 → 单元 → topic 卡片。对应 Web 端 KnowledgeMap.tsx。
// fluency topic 进限时训练，其他 ready topic 进 Practice，未上线的显示锁。

import SwiftUI

struct KnowledgeMapView: View {
    let content: AppContent
    let storage: any StorageAdapter
    let studentId: String

    @State private var term: Term = .upper

    var body: some View {
        NavigationStack {
            List {
                ForEach(content.map.units(term: term)) { unit in
                    Section(unit.title) {
                        ForEach(content.map.topics(in: unit)) { topic in
                            topicRow(topic)
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("星芽 · \(content.map.grade) 年级")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Picker("学期", selection: $term) {
                        Text("上册").tag(Term.upper)
                        Text("下册").tag(Term.lower)
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 160)
                }
            }
        }
    }

    @ViewBuilder
    private func topicRow(_ topic: Topic) -> some View {
        switch content.route(for: topic) {
        case .fluency(let trackId):
            NavigationLink {
                fluencyDestination(trackId: trackId)
            } label: {
                topicLabel(topic, done: fluencyDone(trackId))
            }

        case .practice(let setId):
            NavigationLink {
                PracticeView(model: PracticeModel(set: content.practicePack.set(id: setId)!, storage: storage, studentId: studentId))
            } label: {
                topicLabel(topic, done: practiceDone(setId))
            }

        case .comingSoon:
            topicLabel(topic, done: nil, locked: true)
        }
    }

    @ViewBuilder
    private func fluencyDestination(trackId: String) -> some View {
        if let model = try? GameModel(trackId: trackId, pack: content.fluencyPack, storage: storage, studentId: studentId) {
            PlayView(model: model, pack: content.fluencyPack, storage: storage, studentId: studentId)
        } else {
            ContentUnavailableView("打不开", systemImage: "exclamationmark.triangle")
        }
    }

    private func topicLabel(_ topic: Topic, done: String?, locked: Bool = false) -> some View {
        HStack(spacing: 12) {
            Image(systemName: locked ? "lock.fill" : topic.pedagogy.systemImage)
                .foregroundStyle(locked ? AnyShapeStyle(.tertiary) : AnyShapeStyle(Color.accentColor))
                .frame(width: 26)
            VStack(alignment: .leading, spacing: 2) {
                Text(topic.title)
                    .foregroundStyle(locked ? .secondary : .primary)
                Text(topic.pedagogy.label)
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            Spacer()
            if locked {
                Text("即将上线").font(.caption).foregroundStyle(.tertiary)
            } else if let done {
                Text(done).font(.caption).foregroundStyle(.secondary).monospacedDigit()
            }
        }
    }

    // ----- 掌握度标注 --------------------------------------------------------

    private func fluencyDone(_ trackId: String) -> String? {
        guard let state = storage.trackState(studentId: studentId, trackId: trackId),
              let track = content.fluencyPack.tracks.first(where: { $0.trackId == trackId }) else { return nil }
        return "\(state.completedLevels.count)/\(track.levels.count) 关"
    }

    private func practiceDone(_ setId: String) -> String? {
        guard let rec = storage.practiceRecord(studentId: studentId, setId: setId) else { return nil }
        return "✓ \(rec.bestFirstTryCorrect)/\(rec.total)"
    }
}
