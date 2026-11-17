// Practice 引擎类型——流畅度引擎的**非限时**对应物。用于竖式/公式/概念/推理/数据
// 这类给孩子计时反而有害的知识点（SPEC §2）。同样纪律：纯函数、确定性、零网络/LLM。
// 答案/干扰项/提示/解析全在 content 里。对应 Web 端 src/practice/types.ts。

import Foundation

nonisolated enum ProblemType: String, Codable, Sendable {
    case mc, fill, steps
}

/// 难度分档（topic 内的「关卡」）：basic 基础 → consolidate 夯实 → challenge 拔高。
nonisolated enum Difficulty: String, Codable, Sendable, CaseIterable {
    case basic, consolidate, challenge
}

/// 出题顺序：按此三档排列，每档内 seedable 洗牌，难度沿 topic 递增。
nonisolated let difficultyOrder: [Difficulty] = [.basic, .consolidate, .challenge]

nonisolated struct Choice: Codable, Sendable, Equatable, Identifiable {
    let id: String
    let label: String
    let correct: Bool
}

/// fill 的答案或 steps 的某一格答案：可能是数字或字符串，统一保留原始文本比对。
nonisolated enum AnswerValue: Codable, Sendable, Equatable {
    case number(Double)
    case text(String)

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let d = try? c.decode(Double.self) {
            self = .number(d)
        } else {
            self = .text(try c.decode(String.self))
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .number(let d): try c.encode(d)
        case .text(let s): try c.encode(s)
        }
    }

    /// 与孩子输入的字符串比对（对应 Web 端 valueEq）。
    func matches(_ got: String) -> Bool {
        switch self {
        case .number(let expected):
            let v = Double(got.trimmingCharacters(in: .whitespaces))
            return v != nil && v!.isFinite && v! == expected
        case .text(let expected):
            return expected.trimmingCharacters(in: .whitespaces) == got.trimmingCharacters(in: .whitespaces)
        }
    }

    /// 展示用文本（错题本/揭示答案）。
    var display: String {
        switch self {
        case .number(let d): return d == d.rounded() ? String(Int(d)) : String(d)
        case .text(let s): return s
        }
    }
}

nonisolated struct Field: Codable, Sendable, Equatable, Identifiable {
    let id: String
    let label: String
    let answer: AnswerValue
}

nonisolated struct ProblemSource: Codable, Sendable, Equatable {
    let edition: String
    let grade: Int
    let gradeLabel: String
    let unit: String?
    let topic: String?
    let label: String
}

nonisolated struct Problem: Codable, Sendable, Equatable, Identifiable {
    let id: String
    let type: ProblemType
    let prompt: String        // 可能多行（竖式布局），渲染时保留换行
    let difficulty: Difficulty?
    let choices: [Choice]?
    let answer: AnswerValue?
    let fields: [Field]?
    let hint: String?
    let explanation: String?
    let source: ProblemSource?

    var tier: Difficulty { difficulty ?? .consolidate }
}

nonisolated struct ProblemSet: Codable, Sendable, Identifiable {
    let id: String
    let title: String
    let pedagogy: String
    let maxTries: Int?
    let problems: [Problem]

    var maxTriesOrDefault: Int { maxTries ?? 2 }
}

nonisolated struct PracticePack: Codable, Sendable {
    let version: String
    let sets: [ProblemSet]

    func set(id: String) -> ProblemSet? { sets.first { $0.id == id } }
}

/// 孩子作答的响应。
nonisolated enum PracticeResponse: Sendable, Equatable {
    case choice(String)
    case value(String)
    case fields([String: String])
}

nonisolated struct PracticeState: Codable, Sendable, Equatable {
    let setId: String
    var order: [Int]           // 洗牌后的题目下标
    var index: Int             // 首次 PRESENT 前为 -1
    var tries: Int             // 当前题已错次数
    var firstTryCorrect: Int
    var status: Status

    enum Status: String, Codable, Sendable {
        case active, complete
    }
}

nonisolated enum PracticeEvent: Sendable, Equatable {
    case next
    case answer(PracticeResponse)
}

nonisolated enum PracticeAction: Sendable, Equatable {
    case present(Problem)
    case correct(Problem, firstTry: Bool)
    case wrong(Problem, tries: Int)
    case reveal(Problem)                        // 超过 maxTries 后揭示答案
    case setComplete(firstTryCorrect: Int, total: Int)
}

nonisolated struct PracticeContext {
    let set: ProblemSet
    let rng: RandomSource
    let now: () -> Int
}
