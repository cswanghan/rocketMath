// 引擎类型契约。对应 Web 端 src/engine/types.ts，字段逐一对齐——两端行为由
// XingyaTests/EngineGoldenTests.swift 用黄金用例逐步对拍保证一致。
//
// 硬约束（SPEC §1）：引擎必须是确定性纯函数，零 UI、零网络、零 LLM。
// 这里的所有类型都是 nonisolated + Sendable，可在任意线程使用。

import Foundation

nonisolated enum Phase: String, Codable, Sendable, CaseIterable {
    case takeOff = "take_off"
    case orbit
    case universe
}

nonisolated enum LearningType: String, Codable, Sendable {
    case factRecall = "fact_recall"
    case pattern
}

nonisolated struct Fact: Codable, Sendable, Equatable, Identifiable {
    let id: String
    let prompt: String
    let answer: Int
    let learningType: LearningType
}

nonisolated struct FactStat: Codable, Sendable, Equatable {
    var seen: Int = 0
    var correct: Int = 0
    /// 最近一次「尚未被干净答对赎回」的失误时刻（ctx.now()）。驱动选题的
    /// recent-miss 加权；之后干净答对时清除。
    var lastMissAt: Int?
}

/// 竞速子状态。SPEC §5 的 TrackState 只列核心字段，race 叠加在上层，因为
/// START_RACE / RACE_RESULT 走同一个 reducer。非竞速期间为 nil。
nonisolated struct RaceState: Codable, Sendable, Equatable {
    var endsAt: Int
    var correct: Int
    var answered: Int
    var durationMs: Int
}

nonisolated struct TrackState: Codable, Sendable, Equatable {
    var trackId: String
    var currentLevel: String        // 'A'..'R'
    var phase: Phase
    var streak: Int                 // take_off：门内连续答对数
    var attempts: Int               // orbit/universe：本窗口已答题数
    var errors: Int                 // orbit/universe：本窗口错误数
    var pendingRetest: String?      // 失误后待立即重测的 factId
    var factStats: [String: FactStat]
    var completedLevels: [String]   // 供 Rocket Chart
    var race: RaceState?
}

nonisolated enum Event: Sendable, Equatable {
    case answer(factId: String, value: Int, elapsedMs: Int)
    case next
    case startRace(durationMs: Int)
}

nonisolated enum Action: Sendable, Equatable {
    case prompt(Fact)
    case correction(Fact)           // 重教：显示 + 朗读答案
    case phaseComplete(Phase)
    case levelComplete(String)
    case raceResult(correctPerMin: Double)
}

// ----- content pack ---------------------------------------------------------

nonisolated struct Level: Codable, Sendable {
    let level: String
    let newFacts: [Fact]

    enum CodingKeys: String, CodingKey {
        case level
        case newFacts = "new_facts"
    }
}

nonisolated struct Track: Codable, Sendable {
    let trackId: String
    let name: String
    let enabled: Bool
    let levels: [Level]
}

nonisolated struct MasteryTakeOff: Codable, Sendable {
    let consecutiveCorrectWithinGate: Int
    enum CodingKeys: String, CodingKey {
        case consecutiveCorrectWithinGate = "consecutive_correct_within_gate"
    }
}

nonisolated struct MasteryWindow: Codable, Sendable {
    let windowAttempts: Int
    let maxErrors: Int
    enum CodingKeys: String, CodingKey {
        case windowAttempts = "window_attempts"
        case maxErrors = "max_errors"
    }
}

nonisolated struct Mastery: Codable, Sendable {
    let takeOff: MasteryTakeOff
    let orbit: MasteryWindow
    let universe: MasteryWindow
    enum CodingKeys: String, CodingKey {
        case takeOff = "take_off"
        case orbit, universe
    }
}

nonisolated struct CorrectionLoop: Codable, Sendable {
    let triggerOn: [String]
    let immediateReteach: Bool
    let immediateRetest: Bool
    enum CodingKeys: String, CodingKey {
        case triggerOn = "trigger_on"
        case immediateReteach = "immediate_reteach"
        case immediateRetest = "immediate_retest"
    }
}

nonisolated struct InterleaveRules: Codable, Sendable {
    let takeOffPool: String
    let orbitPool: String
    let universePool: String
    let recentMissWeight: Double
    enum CodingKeys: String, CodingKey {
        case takeOffPool = "take_off_pool"
        case orbitPool = "orbit_pool"
        case universePool = "universe_pool"
        case recentMissWeight = "recent_miss_weight"
    }
}

nonisolated struct RaceSpeed: Codable, Sendable, Identifiable {
    let id: String
    let label: String
    let emoji: String
    let seconds: Int
}

nonisolated struct MilestoneRaces: Codable, Sendable {
    let durationSeconds: Int
    let speeds: [RaceSpeed]?
    let positionsPercent: [Int]
    enum CodingKeys: String, CodingKey {
        case durationSeconds = "duration_seconds"
        case speeds
        case positionsPercent = "positions_percent"
    }
}

nonisolated struct IndividualizedGoal: Codable, Sendable {
    let probeProblemCount: Int
    let latencyMultiplier: Double
    let minGateSeconds: Double
    let maxGateSeconds: Double
    enum CodingKeys: String, CodingKey {
        case probeProblemCount = "probe_problem_count"
        case latencyMultiplier = "latency_multiplier"
        case minGateSeconds = "min_gate_seconds"
        case maxGateSeconds = "max_gate_seconds"
    }
}

nonisolated struct TimeLockConfig: Codable, Sendable {
    let enabled: Bool
    let playMinutes: Int
    let breakMinutes: Int
    enum CodingKeys: String, CodingKey {
        case enabled
        case playMinutes = "play_minutes"
        case breakMinutes = "break_minutes"
    }
}

nonisolated struct EngineConfig: Codable, Sendable {
    let latencyGateSeconds: Double
    let mastery: Mastery
    let correctionLoop: CorrectionLoop
    let interleaveRules: InterleaveRules
    let milestoneRaces: MilestoneRaces
    let individualizedGoal: IndividualizedGoal
    let timeLock: TimeLockConfig?

    enum CodingKeys: String, CodingKey {
        case latencyGateSeconds = "latency_gate_seconds"
        case mastery
        case correctionLoop = "correction_loop"
        case interleaveRules = "interleave_rules"
        case milestoneRaces = "milestone_races"
        case individualizedGoal = "individualized_goal"
        case timeLock = "time_lock"
    }

    func window(for phase: Phase) -> MasteryWindow? {
        switch phase {
        case .takeOff: return nil
        case .orbit: return mastery.orbit
        case .universe: return mastery.universe
        }
    }
}

nonisolated struct ContentPack: Codable, Sendable {
    let version: String
    let grade: Int
    let subject: String
    let engineConfig: EngineConfig
    let tracks: [Track]
    let nonDrillTopics: [String]

    enum CodingKeys: String, CodingKey {
        case version, grade, subject, tracks
        case engineConfig = "engine_config"
        case nonDrillTopics = "non_drill_topics"
    }
}

/// 引擎运行上下文。now/rng 都被注入，保证引擎可测且确定性。
nonisolated struct EngineContext {
    let pack: ContentPack
    let latencyGateMs: Int          // 个性化时限
    let now: () -> Int              // 毫秒时间戳
    let rng: RandomSource           // 可注入的可复现随机源（引用语义：连续取值会推进内部状态）
}
