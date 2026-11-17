import SwiftUI

struct SessionRoute: Identifiable {
    enum Mode { case practice, fluency, race }
    let id = UUID()
    let topic: Topic
    let mode: Mode
}

struct TopicSessionView: View {
    let route: SessionRoute
    let content: AppContent
    let storage: any StorageAdapter
    let studentId: String
    var body: some View {
        NavigationStack {
            if route.mode == .practice, let id = route.topic.problemSetId,
               let set = content.practicePack.set(id: id) {
                PracticeView(model: PracticeModel(set: set, storage: storage, studentId: studentId))
            } else if let id = route.topic.fluencyTrackId {
                if route.mode == .race {
                    RaceView(trackId: id, pack: content.fluencyPack, storage: storage, studentId: studentId)
                } else if let model = try? GameModel(trackId: id, pack: content.fluencyPack, storage: storage, studentId: studentId) {
                    PlayView(model: model, pack: content.fluencyPack, storage: storage, studentId: studentId)
                } else { ContentUnavailableView("打不开", systemImage: "exclamationmark.triangle") }
            }
        }.tint(Theme.brand)
    }
}

struct KnowledgeMapView: View {
    let content: AppContent
    let storage: any StorageAdapter
    let studentId: String
    var onParent: (() -> Void)?
    var onChangeGrade: (() -> Void)?
    var onAccount: (() -> Void)?
    @AppStorage("selectedTerm") private var termValue = Term.upper.rawValue
    @State private var selectedTopic: Topic?
    @State private var session: SessionRoute?
    @State private var revision = 0
    @Environment(\.dynamicTypeSize) private var typeSize
    private var term: Term { Term(rawValue: termValue) ?? .upper }
    private var topics: [Topic] { content.map.units(term: term).flatMap { content.map.topics(in: $0) } }
    private var additionalFluencyTopics: [Topic] {
        FluencyNavigation.unmappedTopics(tracks: content.fluencyPack.tracks, mappedTopics: content.map.topics)
    }
    private var recommended: Topic? { topics.first { isReady($0) && progress($0) < 1 } ?? topics.first(where: isReady) }

    var body: some View {
        NavigationStack {
            SunnyPage {
                topRow
                VStack(alignment: .leading, spacing: 6) {
                    Text(L10n.text(typeSize.isAccessibilitySize ? "你好" : greeting)).font(Theme.titleFont(33, weight: .heavy))
                    Text("今天，也算得漂亮。").font(.body).foregroundStyle(Theme.sub)
                }
                if let topic = recommended { hero(topic) }
                if !additionalFluencyTopics.isEmpty {
                    VStack(alignment: .leading, spacing: 0) {
                        Text(L10n.text("更多口算")).font(.title2.bold()).padding(.bottom, 8)
                        ForEach(additionalFluencyTopics) { topic in pathRow(topic) }
                    }
                }
                HStack {
                    Text("学习路径").font(.title2.bold())
                    Spacer()
                    Text(L10n.text(term.label)).font(.subheadline).foregroundStyle(Theme.sub)
                }
                LazyVStack(alignment: .leading, spacing: 0) {
                    ForEach(content.map.units(term: term)) { unit in
                        Text(L10n.text(unit.title)).font(.footnote.bold()).foregroundStyle(Theme.sub)
                            .padding(.top, 12).padding(.bottom, 8)
                        ForEach(content.map.topics(in: unit)) { topic in pathRow(topic) }
                    }
                }
                Label("练习与本地分析免费 · 离线可用", systemImage: "checkmark.shield")
                    .font(.footnote).foregroundStyle(Theme.sub)
            }
            .toolbar(.hidden, for: .navigationBar)
            .sheet(item: $selectedTopic) { topic in modeSheet(topic) }
            .fullScreenCover(item: $session, onDismiss: { revision += 1 }) { route in
                TopicSessionView(route: route, content: content, storage: storage, studentId: studentId)
            }
        }
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        return hour < 12 ? "早上好" : (hour < 18 ? "下午好" : "晚上好")
    }
    private var topRow: some View {
        ViewThatFits(in: .horizontal) {
            HStack { brand; Spacer(); gradeMenu; moreMenu }
            VStack(alignment: .leading) { brand; HStack { gradeMenu; Spacer(); moreMenu } }
        }
    }
    private var brand: some View {
        HStack(spacing: 8) {
            SunSprout().frame(width: 30, height: 30).padding(4).background(Theme.sunlight, in: .rect(cornerRadius: 12))
            Text("星芽").font(.title3.bold())
        }
    }
    private var gradeMenu: some View {
        Menu {
            Button("上册") { termValue = Term.upper.rawValue }
            Button("下册") { termValue = Term.lower.rawValue }
            if let onChangeGrade { Button("切换年级", action: onChangeGrade) }
        } label: {
            Text("\(L10n.text(Grades.label(for: content.map.grade))) · \(L10n.text(term.label))")
                .font(.footnote.bold()).padding(10).frame(minHeight: 44)
                .background(Theme.card, in: .rect(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Theme.line))
        }.accessibilityIdentifier("grade-term-picker")
    }
    private var moreMenu: some View {
        Menu {
            if let onAccount { Button("账号", systemImage: "person.crop.circle", action: onAccount) }
            if let onParent { Button("家长", systemImage: "person.2", action: onParent) }
            if let onChangeGrade { Button("切换年级", action: onChangeGrade) }
        } label: { Image(systemName: "ellipsis").frame(width: 44, height: 44) }
            .accessibilityLabel(L10n.text("更多")).accessibilityIdentifier("home-menu")
    }
    private func hero(_ topic: Topic) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Capsule().fill(Theme.tangerine).frame(width: 14, height: 3)
                Text("今日练习").font(.subheadline.bold())
            }
            Text(L10n.text(topic.title)).font(Theme.titleFont(32, weight: .heavy))
                .fixedSize(horizontal: false, vertical: true).padding(.trailing, 60)
            Text("按自己的节奏，一步一步来").font(.subheadline).foregroundStyle(Theme.sub)
            Spacer(minLength: 36)
            BrandPrimaryButton("开始练习") { start(topic) }.accessibilityIdentifier("home-start")
        }
        .padding(20).frame(minHeight: 258)
        .background(alignment: .topTrailing) {
            if !typeSize.isAccessibilitySize {
                SunSprout().frame(width: 88, height: 88).padding(.top, 12).padding(.trailing, 4)
            }
        }
        .background(alignment: .bottom) {
            Ellipse().fill(Theme.brand.opacity(0.13)).frame(height: 86).offset(y: 48)
        }
        .background(Theme.skyGradient, in: .rect(cornerRadius: 29))
        .clipShape(.rect(cornerRadius: 29))
    }
    private func pathRow(_ topic: Topic) -> some View {
        let current = topic.id == recommended?.id
        let value = progress(topic)
        return Button { selectedTopic = topic } label: {
            HStack(alignment: .center, spacing: 12) {
                ZStack {
                    PathRail().stroke(Theme.sky1, style: StrokeStyle(lineWidth: 2, dash: [5, 5])).padding(.vertical, -18)
                    Circle().fill(current ? Theme.gold : Theme.card).frame(width: 36, height: 36)
                    Circle().strokeBorder(current ? Theme.warn.opacity(0.6) : Theme.sky1, lineWidth: 1.5).frame(width: 36, height: 36)
                    Image(systemName: value >= 1 ? "checkmark" : (topic.id == "read_clock" ? "clock" : topic.pedagogy.systemImage))
                        .font(.body.bold()).foregroundStyle(current ? Color(hex: 0x594400) : Theme.sub)
                }.frame(width: 36)
                VStack(alignment: .leading, spacing: 4) {
                    Text(L10n.text(topic.title)).font(.headline).fixedSize(horizontal: false, vertical: true)
                    Text(L10n.text(topic.pedagogy.label)).font(.footnote).foregroundStyle(Theme.sub)
                    if typeSize.isAccessibilitySize { status(topic, value: value, current: current) }
                }
                Spacer(minLength: 0)
                if !typeSize.isAccessibilitySize { status(topic, value: value, current: current) }
            }.padding(.vertical, 14).padding(.horizontal, 10)
                .background(current ? Theme.sky2 : Color.clear, in: .rect(cornerRadius: 18))
                .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(current ? Theme.sky1 : .clear))
                .contentShape(Rectangle())
        }.buttonStyle(.plain).disabled(!isReady(topic)).accessibilityIdentifier("topic-\(topic.id)")
    }
    private func status(_ topic: Topic, value: Double, current: Bool) -> some View {
        Text(L10n.text(!isReady(topic) ? "即将上线" : value >= 1 ? "已完成" : value > 0 ? "进行中" : current ? "从这里开始" : "未开始"))
            .font(.caption.bold()).foregroundStyle(current ? Theme.warn : Theme.sub)
            .padding(7).background(current ? Theme.sunlight : .clear, in: .rect(cornerRadius: 9))
    }
    private func modeSheet(_ topic: Topic) -> some View {
        NavigationStack {
            SunnyPage {
                Text(L10n.text(topic.title)).font(.title.bold())
                Text("选择练习方式").foregroundStyle(Theme.sub)
                if let setId = topic.problemSetId, content.practicePack.set(id: setId) != nil {
                    BrandPrimaryButton("练习") { selectedTopic = nil; session = SessionRoute(topic: topic, mode: .practice) }
                }
                if topic.fluencyTrackId != nil {
                    BrandSecondaryButton("口算") { selectedTopic = nil; session = SessionRoute(topic: topic, mode: .fluency) }
                    BrandSecondaryButton("竞速") { selectedTopic = nil; session = SessionRoute(topic: topic, mode: .race) }
                }
            }.toolbar { ToolbarItem(placement: .cancellationAction) { Button("关闭") { selectedTopic = nil } } }
        }.presentationDetents([.medium, .large])
    }
    private func start(_ topic: Topic) {
        session = SessionRoute(topic: topic, mode: topic.pedagogy == .fluency ? .fluency : .practice)
    }
    private func isReady(_ topic: Topic) -> Bool { if case .comingSoon = content.route(for: topic) { return false }; return true }
    private func progress(_ topic: Topic) -> Double {
        _ = revision
        if let id = topic.fluencyTrackId, let track = content.fluencyPack.tracks.first(where: { $0.trackId == id }) {
            return Double(storage.trackState(studentId: studentId, trackId: id)?.completedLevels.count ?? 0) / Double(max(1, track.levels.count))
        }
        if let id = topic.problemSetId, let record = storage.practiceRecord(studentId: studentId, setId: id) {
            return Double(record.bestFirstTryCorrect) / Double(max(1, record.total))
        }
        return 0
    }
}

nonisolated private struct PathRail: Shape {
    func path(in rect: CGRect) -> Path {
        Path { p in p.move(to: CGPoint(x: rect.midX, y: rect.minY)); p.addLine(to: CGPoint(x: rect.midX, y: rect.maxY)) }
    }
}
