// Content pack 的加载、校验与**派生**题池。对应 Web 端 src/engine/contentPack.ts。
//
// 引擎对「教什么」一无所知，只认 pack（SPEC §4）：
//  - 加载时必须校验（结构 + 每个 fact 的 answer 可由 prompt 推算），失败要响亮地报错；
//  - orbit / universe 题池在这里由 interleave_rules **推导**，绝不在 JSON 里枚举。

import Foundation

nonisolated enum ContentPackError: Error, CustomStringConvertible, Equatable {
    case notLoaded(String)
    case invalid(String)

    var description: String {
        switch self {
        case .notLoaded(let m): return "content pack 加载失败: \(m)"
        case .invalid(let m): return "content pack 校验失败: \(m)"
        }
    }
}

nonisolated enum ContentPackLoader {
    /// 从 App bundle 的 content/ 目录读取内容包（蓝色文件夹引用，与仓库 content/ 同源）。
    static func load(_ fileName: String, bundle: Bundle = .main, language: String = "zh-Hans") throws -> ContentPack {
        try decode(LocalizedContent.data(fileName, language: language, bundle: bundle))
    }

    static func decode(_ data: Data) throws -> ContentPack {
        let pack: ContentPack
        do {
            pack = try JSONDecoder().decode(ContentPack.self, from: data)
        } catch {
            throw ContentPackError.notLoaded("JSON 解码失败: \(error)")
        }
        try validate(pack)
        return pack
    }

    // ----- 校验 --------------------------------------------------------------

    static func validate(_ pack: ContentPack) throws {
        guard !pack.tracks.isEmpty else {
            throw ContentPackError.invalid("pack.tracks 不能为空")
        }
        var seenFactIds = Set<String>()
        for track in pack.tracks {
            guard !track.trackId.isEmpty else {
                throw ContentPackError.invalid("有 track 缺 trackId")
            }
            guard !track.levels.isEmpty else {
                throw ContentPackError.invalid("track \(track.trackId) 没有关卡")
            }
            var seenLevels = Set<String>()
            for level in track.levels {
                guard !level.level.isEmpty else {
                    throw ContentPackError.invalid("track \(track.trackId) 有关卡缺名字")
                }
                guard seenLevels.insert(level.level).inserted else {
                    throw ContentPackError.invalid("track \(track.trackId) 关卡 \(level.level) 重复")
                }
                guard !level.newFacts.isEmpty else {
                    throw ContentPackError.invalid("track \(track.trackId) 关卡 \(level.level) 没有 new_facts")
                }
                for fact in level.newFacts {
                    try validate(fact: fact, track: track, level: level.level, seen: &seenFactIds)
                }
            }
        }
    }

    private static func validate(
        fact: Fact,
        track: Track,
        level: String,
        seen: inout Set<String>
    ) throws {
        let mark = "\(track.trackId)/\(level)"
        guard !fact.id.isEmpty else {
            throw ContentPackError.invalid("\(mark): fact 缺 id")
        }
        guard seen.insert(fact.id).inserted else {
            throw ContentPackError.invalid("\(mark): fact id \(fact.id) 重复")
        }
        if let computed = computeFromPrompt(fact.prompt), computed != fact.answer {
            throw ContentPackError.invalid(
                "\(mark): fact \(fact.id) 声明答案 \(fact.answer) 与 \"\(fact.prompt)\" 推算值 \(computed) 不符"
            )
        }
    }

    /// 解析 "6 × 7" / "42 ÷ 6" / "70 + 20" 这类题干并算出结果，用来交叉校验声明的答案。
    /// 无法解析时返回 nil（例如 pattern 型题干），不视为错误。
    static func computeFromPrompt(_ prompt: String) -> Int? {
        let trimmed = prompt.trimmingCharacters(in: .whitespaces)
        var lhs = ""
        var op: Character?
        var rhs = ""
        for ch in trimmed {
            if ch.isWhitespace { continue }
            if ch.isNumber {
                if op == nil { lhs.append(ch) } else { rhs.append(ch) }
            } else if op == nil, lhs.isEmpty == false, "×x*÷/+-−".contains(ch) {
                op = ch
            } else {
                return nil // 多个运算符 / 非法字符 → 不是可推算的算式
            }
        }
        guard let op, let a = Int(lhs), let b = Int(rhs) else { return nil }
        switch op {
        case "×", "x", "*":
            return a * b
        case "÷", "/":
            guard b != 0, a % b == 0 else { return nil } // 口诀题必须整除
            return a / b
        case "+":
            return a + b
        case "-", "−":
            guard a >= b else { return nil }             // 三年级口算不出负数
            return a - b
        default:
            return nil
        }
    }
}

// ----- track / level helpers -------------------------------------------------

// 注意：工程设了 SWIFT_DEFAULT_ACTOR_ISOLATION=MainActor（方便写 SwiftUI），
// 所以引擎侧的 extension 必须显式 nonisolated，否则会被推到主 actor 上，
// 纯函数引擎就没法在后台线程用了。
nonisolated extension ContentPack {
    func track(_ trackId: String) throws -> Track {
        guard let t = tracks.first(where: { $0.trackId == trackId }) else {
            throw ContentPackError.invalid("未知 track \(trackId)")
        }
        return t
    }

    var enabledTracks: [Track] { tracks.filter(\.enabled) }
}

nonisolated extension Track {
    func levelIndex(_ level: String) throws -> Int {
        guard let idx = levels.firstIndex(where: { $0.level == level }) else {
            throw ContentPackError.invalid("track \(trackId) 没有关卡 \(level)")
        }
        return idx
    }

    func newFacts(_ level: String) throws -> [Fact] {
        try levels[levelIndex(level)].newFacts
    }

    /// 下一关；当前已是最后一关时返回 nil。
    func nextLevel(after level: String) throws -> String? {
        let idx = try levelIndex(level)
        return idx + 1 < levels.count ? levels[idx + 1].level : nil
    }

    func fact(id: String) -> Fact? {
        for level in levels {
            if let f = level.newFacts.first(where: { $0.id == id }) { return f }
        }
        return nil
    }

    // ----- 派生题池（SPEC §4）------------------------------------------------

    /// take_off 池 = 本关 new_facts
    func takeOffPool(_ level: String) throws -> [Fact] {
        try newFacts(level)
    }

    /// orbit 池 = 本关 new_facts ∪ 上一关 new_facts
    func orbitPool(_ level: String) throws -> [Fact] {
        let idx = try levelIndex(level)
        var facts = levels[idx].newFacts
        if idx > 0 { facts.append(contentsOf: levels[idx - 1].newFacts) }
        return Self.dedupe(facts)
    }

    /// universe 池 = A..当前关 全部 new_facts 的并集
    func universePool(_ level: String) throws -> [Fact] {
        let idx = try levelIndex(level)
        var facts: [Fact] = []
        for i in 0...idx { facts.append(contentsOf: levels[i].newFacts) }
        return Self.dedupe(facts)
    }

    /// 里程碑竞速用的「已学全部」池（SPEC §5），与当前关的 universe 池同集合。
    func learnedPool(_ level: String) throws -> [Fact] {
        try universePool(level)
    }

    func pool(for phase: Phase, level: String) throws -> [Fact] {
        switch phase {
        case .takeOff: return try takeOffPool(level)
        case .orbit: return try orbitPool(level)
        case .universe: return try universePool(level)
        }
    }

    private static func dedupe(_ facts: [Fact]) -> [Fact] {
        var seen = Set<String>()
        var out: [Fact] = []
        for f in facts where seen.insert(f.id).inserted {
            out.append(f)
        }
        return out
    }
}

// ----- 个性化时限（SPEC §5）-------------------------------------------------

nonisolated enum LatencyGate {
    /// 由敲击速度探针算个性化时限（ms）：中位数 × 倍率，再夹到 [min, max]。
    static func compute(probeTimesMs: [Int], config: EngineConfig) -> Int {
        let g = config.individualizedGoal
        let minMs = g.minGateSeconds * 1000
        let maxMs = g.maxGateSeconds * 1000
        guard !probeTimesMs.isEmpty else {
            return Int(config.latencyGateSeconds * 1000)
        }
        let sorted = probeTimesMs.sorted()
        let mid = sorted.count / 2
        let median: Double = sorted.count % 2 == 0
            ? Double(sorted[mid - 1] + sorted[mid]) / 2
            : Double(sorted[mid])
        let gate = median * g.latencyMultiplier
        return Int(min(maxMs, max(minMs, gate)))
    }
}
