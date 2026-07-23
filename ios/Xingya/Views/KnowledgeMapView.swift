// 知识地图首页 —— 糖果乐园视觉。单元分组 + 糖果卡片（学科专属色图标 + 进度条 + 金星）。
// 保留多年级、家长/账号/切换年级菜单、上下册切换等全部接口，只重塑视觉。

import SwiftUI

struct KnowledgeMapView: View {
    let content: AppContent
    let storage: any StorageAdapter
    let studentId: String
    var onParent: (() -> Void)?
    var onChangeGrade: (() -> Void)?
    var onAccount: (() -> Void)?

    @State private var term: Term = .upper

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 4, pinnedViews: []) {
                    termPicker
                    ForEach(content.map.units(term: term)) { unit in
                        unitSection(unit)
                    }
                }
                .padding(.horizontal, Theme.pad)
                .padding(.bottom, 24)
            }
            .background(Theme.pageBackground.ignoresSafeArea())
            .navigationTitle("星芽 · \(Grades.label(for: content.map.grade))")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.large)
            #endif
            .toolbar {
                ToolbarItem(placement: .automatic) {
                    Menu {
                        if let onAccount {
                            Button("账号", systemImage: "person.crop.circle", action: onAccount)
                        }
                        if let onParent {
                            Button("家长", systemImage: "person.2.fill", action: onParent)
                        }
                        if let onChangeGrade {
                            Button("切换年级", systemImage: "arrow.left.arrow.right", action: onChangeGrade)
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle.fill")
                            .foregroundStyle(Theme.brand)
                    }
                    .accessibilityIdentifier("home-menu")
                    .accessibilityLabel("更多")
                }
            }
        }
    }

    private var termPicker: some View {
        Picker("学期", selection: $term) {
            Text("上册").tag(Term.upper)
            Text("下册").tag(Term.lower)
        }
        .pickerStyle(.segmented)
        .padding(.top, 4)
        .padding(.bottom, 6)
    }

    // ----- 单元 --------------------------------------------------------------

    private func unitSection(_ unit: Unit) -> some View {
        let topics = content.map.topics(in: unit)
        return VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 7) {
                Text("✳️")
                Text(unit.title)
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.ink)
                Spacer()
                Text("\(topics.count) 课")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.sub)
            }
            .padding(.horizontal, 4)
            .padding(.top, 10)

            ForEach(topics) { topic in
                topicCard(topic)
            }
        }
    }

    // ----- 卡片 --------------------------------------------------------------

    @ViewBuilder
    private func topicCard(_ topic: Topic) -> some View {
        switch content.route(for: topic) {
        case .fluency(let trackId):
            NavigationLink { fluencyDestination(trackId: trackId) } label: {
                cardBody(topic, progress: fluencyProgress(trackId), locked: false)
            }
            .buttonStyle(.plain)
        case .practice(let setId):
            NavigationLink {
                PracticeView(model: PracticeModel(set: content.practicePack.set(id: setId)!, storage: storage, studentId: studentId))
            } label: {
                cardBody(topic, progress: practiceProgress(setId), locked: false)
            }
            .buttonStyle(.plain)
        case .comingSoon:
            cardBody(topic, progress: 0, locked: true)
        }
    }

    private func cardBody(_ topic: Topic, progress: Double, locked: Bool) -> some View {
        let (c1, c2) = Theme.candyColors(for: topic.pedagogy)
        return HStack(spacing: 12) {
            Text(locked ? "🔒" : topic.pedagogy.emoji)
                .font(.system(size: 24))
                .frame(width: 48, height: 48)
                .background(
                    locked ? AnyShapeStyle(Theme.track) : AnyShapeStyle(Theme.candyGradient(for: topic.pedagogy)),
                    in: .rect(cornerRadius: 14)
                )
                .shadow(color: (locked ? Color.clear : c2).opacity(0.4), radius: 6, y: 4)

            VStack(alignment: .leading, spacing: 2) {
                Text(topic.title)
                    .font(.system(size: 16, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.ink)
                Text(topic.pedagogy.label)
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.sub)
                    .padding(.bottom, 6)
                if locked {
                    Text("即将上线")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(Theme.sub)
                } else {
                    BrandProgress(
                        value: progress, height: 7,
                        fill: LinearGradient(colors: [c1, c2], startPoint: .leading, endPoint: .trailing)
                    )
                }
            }

            Spacer(minLength: 6)

            if !locked {
                Text(stars(progress))
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundStyle(Theme.gold)
            }
        }
        .cardStyle()
        .opacity(locked ? 0.62 : 1)
    }

    private func stars(_ p: Double) -> String {
        let filled = p >= 0.8 ? 3 : (p >= 0.4 ? 2 : (p > 0 ? 1 : 0))
        return String(repeating: "★", count: filled) + String(repeating: "☆", count: 3 - filled)
    }

    // ----- 目标 & 进度 -------------------------------------------------------

    @ViewBuilder
    private func fluencyDestination(trackId: String) -> some View {
        if let model = try? GameModel(trackId: trackId, pack: content.fluencyPack, storage: storage, studentId: studentId) {
            PlayView(model: model, pack: content.fluencyPack, storage: storage, studentId: studentId)
        } else {
            ContentUnavailableView("打不开", systemImage: "exclamationmark.triangle")
        }
    }

    private func fluencyProgress(_ trackId: String) -> Double {
        guard let state = storage.trackState(studentId: studentId, trackId: trackId),
              let track = content.fluencyPack.tracks.first(where: { $0.trackId == trackId }),
              !track.levels.isEmpty else { return 0 }
        return Double(state.completedLevels.count) / Double(track.levels.count)
    }

    private func practiceProgress(_ setId: String) -> Double {
        guard let rec = storage.practiceRecord(studentId: studentId, setId: setId), rec.total > 0 else { return 0 }
        return Double(rec.bestFirstTryCorrect) / Double(rec.total)
    }
}
