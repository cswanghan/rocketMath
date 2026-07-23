// 学习报告（糖果乐园）。KPI（总题数/正确率/经验等级）+ 最近 7 天柱状图 + 薄弱知识点。
// 数据来自本地事件日志与练习记录，纯读取、不写入。

import SwiftUI

struct ReportView: View {
    let content: AppContent
    let storage: any StorageAdapter
    let studentId: String

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    kpiRow
                    weeklyCard
                    weakCard
                }
                .padding(Theme.pad)
                .padding(.bottom, 24)
            }
            .background(Theme.pageBackground.ignoresSafeArea())
            .navigationTitle("📈 学习报告")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.large)
            #endif
        }
    }

    // ----- 数据 --------------------------------------------------------------

    private var events: [AnswerEventRecord] { storage.events(studentId: studentId, limit: 2000) }

    private var totalAnswered: Int {
        events.filter { ["hit", "miss", "retest_pass", "retest_fail"].contains($0.outcome) }.count
    }
    private var hits: Int { events.filter { $0.outcome == "hit" || $0.outcome == "retest_pass" }.count }
    private var accuracy: Int {
        totalAnswered == 0 ? 0 : Int((Double(hits) / Double(totalAnswered) * 100).rounded())
    }
    private var levelInfo: LevelInfo { levelFromXp(storage.student(id: studentId)?.xp ?? 0) }

    /// 最近 7 天每天答题数（今天在最右）
    private var weeklyCounts: [Int] {
        let dayMs = 86_400_000
        let now = Int(Date().timeIntervalSince1970 * 1000)
        let todayStart = now - (now % dayMs)
        var buckets = Array(repeating: 0, count: 7)
        for e in events {
            let daysAgo = (todayStart - (e.ts - (e.ts % dayMs))) / dayMs
            if daysAgo >= 0, daysAgo < 7 { buckets[6 - daysAgo] += 1 }
        }
        return buckets
    }

    /// 薄弱知识点：掌握度最低的几项（口算按完成关数，练习按一次答对率）
    private struct Weak: Identifiable { let id: String; let title: String; let ratio: Double }
    private var weakItems: [Weak] {
        var out: [Weak] = []
        for track in content.fluencyPack.tracks where track.enabled {
            let done = storage.trackState(studentId: studentId, trackId: track.trackId)?.completedLevels.count ?? 0
            let r = track.levels.isEmpty ? 0 : Double(done) / Double(track.levels.count)
            if r < 1 { out.append(Weak(id: track.trackId, title: track.name, ratio: r)) }
        }
        for set in content.practicePack.sets {
            if let rec = storage.practiceRecord(studentId: studentId, setId: set.id), rec.total > 0 {
                let r = Double(rec.bestFirstTryCorrect) / Double(rec.total)
                if r < 0.9 { out.append(Weak(id: set.id, title: set.title, ratio: r)) }
            }
        }
        return Array(out.sorted { $0.ratio < $1.ratio }.prefix(3))
    }

    // ----- 视图 --------------------------------------------------------------

    private var kpiRow: some View {
        HStack(spacing: 12) {
            kpi("\(totalAnswered)", "总题数")
            kpi("\(accuracy)%", "正确率")
            kpi("Lv.\(levelInfo.level)", "等级")
        }
    }

    private func kpi(_ num: String, _ label: String) -> some View {
        VStack(spacing: 4) {
            Text(num)
                .font(.system(size: 24, weight: .heavy, design: .rounded))
                .foregroundStyle(Theme.brand)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            Text(label)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.sub)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .cardStyle(radius: Theme.rMd, padding: 0)
    }

    private var weeklyCard: some View {
        let counts = weeklyCounts
        let maxV = max(counts.max() ?? 1, 1)
        return VStack(alignment: .leading, spacing: 12) {
            Text("最近练习").font(.system(size: 16, weight: .heavy, design: .rounded)).foregroundStyle(Theme.ink)
            HStack(alignment: .bottom, spacing: 8) {
                ForEach(Array(counts.enumerated()), id: \.offset) { _, v in
                    VStack {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Theme.brandGradient)
                            .frame(height: max(6, CGFloat(v) / CGFloat(maxV) * 96))
                    }
                    .frame(maxWidth: .infinity, alignment: .bottom)
                }
            }
            .frame(height: 100)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle(radius: Theme.rLg, padding: 16)
    }

    private var weakCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("薄弱知识点").font(.system(size: 16, weight: .heavy, design: .rounded)).foregroundStyle(Theme.ink)
            let items = weakItems
            if items.isEmpty {
                Text("暂无，继续加油 🎉")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(Theme.sub)
            } else {
                ForEach(items) { w in
                    HStack(spacing: 12) {
                        Text(w.title)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(1)
                        Spacer()
                        BrandProgress(value: w.ratio, height: 8, fill: Theme.warnGradient)
                            .frame(width: 120)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle(radius: Theme.rLg, padding: 16)
    }
}
