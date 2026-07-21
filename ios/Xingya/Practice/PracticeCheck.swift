// 确定性答案判定。纯函数——不碰引擎状态、无副作用。对应 Web 端 src/practice/check.ts。

import Foundation

nonisolated enum PracticeCheck {
    static func isCorrect(_ problem: Problem, _ response: PracticeResponse) -> Bool {
        switch problem.type {
        case .mc:
            guard case .choice(let choiceId) = response else { return false }
            return problem.choices?.contains { $0.id == choiceId && $0.correct } ?? false

        case .fill:
            guard case .value(let got) = response, let answer = problem.answer else { return false }
            return answer.matches(got)

        case .steps:
            guard case .fields(let values) = response, let fields = problem.fields else { return false }
            return fields.enumerated().allSatisfy { i, field in
                let key = field.id.isEmpty ? "f\(i)" : field.id
                guard let got = values[key] else { return false }
                return field.answer.matches(got)
            }
        }
    }
}
