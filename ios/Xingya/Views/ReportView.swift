import SwiftUI

struct ReportView: View {
    let content: AppContent
    let storage: any StorageAdapter
    let studentId: String
    @State private var session: SessionRoute?
    @State private var revision = 0
    @Environment(\.dynamicTypeSize) private var typeSize
    private var week: DateInterval { Calendar.current.dateInterval(of: .weekOfYear, for: Date())! }
    private var events: [AnswerEventRecord] {
        _ = revision
        return storage.events(studentId: studentId, limit: 2000).filter {
            week.contains(Date(timeIntervalSince1970: Double($0.ts) / 1000)) && ["hit", "miss", "retest_pass", "retest_fail"].contains($0.outcome)
        }
    }
    private var hits: Int { events.filter { $0.outcome == "hit" || $0.outcome == "retest_pass" }.count }
    private var accuracy: Double { events.isEmpty ? 0 : Double(hits) / Double(events.count) }
    private var seconds: Double { Double(events.reduce(0) { $0 + $1.elapsedMs }) / 1000 }
    private var nextTopic: Topic? {
        let mistakes = storage.listMistakes(studentId: studentId).filter { !$0.corrected }
        return content.map.topics.first { topic in mistakes.contains { $0.topicId == topic.problemSetId || $0.topicId == topic.fluencyTrackId } }
            ?? content.map.topics.first { if case .comingSoon = content.route(for: $0) { return false }; return true }
    }
    var body: some View {
        NavigationStack {
            SunnyPage {
                VStack(alignment: .leading, spacing: 6) {
                    Text("报告").font(Theme.titleFont(34, weight: .heavy))
                    Text("\(L10n.text("本周")) · \(date(week.start)) – \(date(week.end.addingTimeInterval(-1)))")
                        .font(.subheadline).foregroundStyle(Theme.sub)
                }
                summary
                if events.isEmpty && storage.listPracticeRecords(studentId: studentId).isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("从一次练习开始").font(.title2.bold())
                        Text("完成练习后，这里会记录你的成长。").foregroundStyle(Theme.sub)
                    }.accessibilityIdentifier("report-empty")
                }
                if let topic = nextTopic {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("下一步").font(.subheadline.bold()).foregroundStyle(Theme.sub)
                        Text(L10n.text(topic.title)).font(.title.bold())
                        Text("每次专注一个知识点，按自己的节奏练习。").font(.subheadline).foregroundStyle(Theme.sub)
                        BrandPrimaryButton("开始练习") { session = SessionRoute(topic: topic, mode: topic.pedagogy == .fluency ? .fluency : .practice) }
                    }.padding(18).background(Theme.sky2, in: .rect(cornerRadius: 24))
                        .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(Theme.sky1))
                }
                Text("最近练习").font(.title2.bold())
                ForEach(content.fluencyPack.tracks.filter { track in events.contains { $0.trackId == track.trackId } }, id: \.trackId) { track in
                    let trackEvents = events.filter { $0.trackId == track.trackId }
                    let correct = trackEvents.filter { $0.outcome == "hit" || $0.outcome == "retest_pass" }.count
                    let value = Double(correct) / Double(max(1, trackEvents.count))
                    progressRow(L10n.text(track.name), value: value)
                }
                ForEach(storage.listPracticeRecords(studentId: studentId), id: \.setId) { record in
                    if let set = content.practicePack.set(id: record.setId) {
                        progressRow(L10n.text(set.title), value: Double(record.bestFirstTryCorrect) / Double(max(1, record.total)))
                    }
                }
                Divider()
                Label {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("在家试一试").font(.headline)
                        Text("请孩子说一说：这道题是怎么算出来的？").font(.subheadline).foregroundStyle(Theme.sub)
                    }
                } icon: { Image(systemName: "sparkle").foregroundStyle(Theme.warn).padding(12).background(Theme.sunlight, in: .rect(cornerRadius: 12)) }
                Label("分析保存在本机 · 离线可用", systemImage: "checkmark.shield")
                    .font(.footnote).foregroundStyle(Theme.sub).frame(maxWidth: .infinity)
            }.toolbar(.hidden, for: .navigationBar)
                .fullScreenCover(item: $session, onDismiss: { revision += 1 }) { route in
                    TopicSessionView(route: route, content: content, storage: storage, studentId: studentId)
                }
        }
    }
    private func date(_ value: Date) -> String {
        value.formatted(.dateTime.month(.abbreviated).day().locale(L10n.locale))
    }
    private var summary: some View {
        Group {
            if typeSize.isAccessibilitySize { VStack(spacing: 22) { Text(events.isEmpty ? "—" : L10n.percent(accuracy)).font(.largeTitle.bold()); Text("正确率").font(.headline); metrics } }
            else { HStack(spacing: 22) { gauge; metrics } }
        }.padding(20).frame(maxWidth: .infinity).background(Theme.sunlight, in: .rect(cornerRadius: 26))
    }
    private var gauge: some View {
        ZStack {
            ForEach(0..<12) { index in
                Capsule().fill(Theme.gold).frame(width: 3, height: 9).offset(y: -61).rotationEffect(.degrees(Double(index) * 30))
            }
            Circle().stroke(Theme.line, lineWidth: 9).frame(width: 96, height: 96)
            Circle().trim(from: 0, to: accuracy).stroke(Theme.brand, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                .frame(width: 96, height: 96).rotationEffect(.degrees(-90))
            VStack(spacing: 4) {
                Text(events.isEmpty ? "—" : L10n.percent(accuracy)).font(.title.bold()).accessibilityIdentifier("report-accuracy")
                Text("正确率").font(.caption.bold())
            }
        }.frame(width: 138, height: 138).accessibilityElement(children: .combine)
    }
    private var metrics: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L10n.duration(seconds)).font(.title2.bold())
            Text("口算用时").font(.footnote).foregroundStyle(Theme.sub)
            Divider()
            Text(events.isEmpty ? "—" : L10n.duration(seconds / Double(events.count))).font(.title2.bold())
            Text("平均用时").font(.footnote).foregroundStyle(Theme.sub)
            Text(L10n.questions(events.count)).accessibilityIdentifier("report-total").font(.caption).foregroundStyle(Theme.sub)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    private func progressRow(_ title: String, value: Double) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack { Text(title).font(.headline); Spacer(); Text(L10n.percent(value)).font(.headline).foregroundStyle(Theme.brand) }
            BrandProgress(value: value)
        }.padding(.vertical, 6)
    }
}
