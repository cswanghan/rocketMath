// 错题本分析：按知识点聚合 + 本地确定性总结（离线可用）。
// 对应 Web 端 src/ui/summary.ts。P3 接账号后再接云端 LLM 总结。

import Foundation

nonisolated func fmtSec(_ ms: Int) -> String {
    String(format: "%.1f 秒", Double(ms) / 1000)
}

nonisolated private let diffLabel: [String: String] = [
    "basic": "基础",
    "consolidate": "夯实",
    "challenge": "拔高",
    "fluency": "口算",
]

nonisolated struct TopicStat: Sendable, Equatable {
    var topicTitle: String
    var count: Int
    var wrong: Int
    var slow: Int
    var byDifficulty: [String: Int]
    var maxMs: Int
    var avgMs: Int
    var examples: [Example]

    struct Example: Sendable, Equatable {
        var prompt: String
        var yourAnswer: String
        var correctAnswer: String
        var elapsedMs: Int?
        var slow: Bool
    }
}

nonisolated struct SlowestItem: Sendable, Equatable {
    var topicTitle: String
    var prompt: String
    var elapsedMs: Int
}

nonisolated struct MistakeSummaryData: Sendable, Equatable {
    var total: Int
    var wrongTotal: Int
    var slowTotal: Int
    var topics: [TopicStat]
    var slowest: [SlowestItem]
}

nonisolated func summarizeMistakes(_ mistakes: [MistakeRecord]) -> MistakeSummaryData {
    let active = mistakes.filter { !$0.corrected }
    var byTopic: [String: (
        count: Int, wrong: Int, slow: Int,
        byDiff: [String: Int], sumMs: Int, nMs: Int, maxMs: Int,
        examples: [TopicStat.Example]
    )] = [:]

    for m in active {
        var t = byTopic[m.topicTitle] ?? (0, 0, 0, [:], 0, 0, 0, [])
        t.count += 1
        if m.slow { t.slow += 1 } else { t.wrong += 1 }
        let d = m.difficulty ?? "fluency"
        t.byDiff[d, default: 0] += 1
        if let ms = m.elapsedMs {
            t.sumMs += ms
            t.nMs += 1
            if ms > t.maxMs { t.maxMs = ms }
        }
        if t.examples.count < 3 {
            t.examples.append(.init(
                prompt: m.prompt, yourAnswer: m.yourAnswer,
                correctAnswer: m.correctAnswer, elapsedMs: m.elapsedMs, slow: m.slow
            ))
        }
        byTopic[m.topicTitle] = t
    }

    let topics = byTopic.map { title, t in
        TopicStat(
            topicTitle: title,
            count: t.count,
            wrong: t.wrong,
            slow: t.slow,
            byDifficulty: t.byDiff,
            maxMs: t.maxMs,
            avgMs: t.nMs > 0 ? t.sumMs / t.nMs : 0,
            examples: t.examples
        )
    }.sorted { $0.count > $1.count }

    let slowest = active
        .compactMap { m -> SlowestItem? in
            guard let ms = m.elapsedMs else { return nil }
            return SlowestItem(topicTitle: m.topicTitle, prompt: m.prompt, elapsedMs: ms)
        }
        .sorted { $0.elapsedMs > $1.elapsedMs }
        .prefix(5)
        .map { $0 }

    return MistakeSummaryData(
        total: active.count,
        wrongTotal: active.filter { !$0.slow }.count,
        slowTotal: active.filter(\.slow).count,
        topics: topics,
        slowest: Array(slowest)
    )
}

/// 本地确定性家长总结；云端 LLM 不可用时的 fallback。
nonisolated func localSummaryText(_ s: MistakeSummaryData) -> String {
    if s.total == 0 {
        return "太棒了!目前没有需要关注的错题或耗时偏长的题。继续保持 👍"
    }
    var lines: [String] = []
    lines.append("共有 \(s.total) 道需要关注:答错 \(s.wrongTotal) 道,答对但偏慢 \(s.slowTotal) 道。")
    lines.append("")
    lines.append("📌 最需要加强的知识点:")
    for t in s.topics.prefix(3) {
        let diffs = t.byDifficulty
            .map { "\(diffLabel[$0.key] ?? $0.key) \($0.value)" }
            .joined(separator: "、")
        let time = t.maxMs > 0 ? ",平均 \(fmtSec(t.avgMs))、最长 \(fmtSec(t.maxMs))" : ""
        lines.append("• \(t.topicTitle):错 \(t.wrong)、慢 \(t.slow)(\(diffs)\(time))")
    }
    if !s.slowest.isEmpty {
        lines.append("")
        lines.append("⏱ 耗时最长的题:")
        for x in s.slowest.prefix(3) {
            let p = x.prompt.replacingOccurrences(of: "\n", with: " ")
            lines.append("• \(x.topicTitle):\(p) —— \(fmtSec(x.elapsedMs))")
        }
    }
    lines.append("")
    lines.append("💡 建议:答错的题先弄懂方法再用「基础关」巩固;耗时偏长说明还不够熟练,可针对性多练几遍提速。")
    return lines.joined(separator: "\n")
}
