// 人类可读的答案文本（揭示答案 / 错题本）。纯函数。对应 Web 端 src/practice/answerText.ts。

import Foundation

/// 一道题的正确答案文本。
func correctText(_ problem: Problem) -> String {
    switch problem.type {
    case .mc:
        return problem.choices?.first(where: \.correct)?.label ?? ""
    case .fill:
        return problem.answer?.display ?? ""
    case .steps:
        return (problem.fields ?? []).map { "\($0.label) \($0.answer.display)" }.joined(separator: " , ")
    }
}

/// 孩子作答的文本（错题本用）。
func responseText(_ problem: Problem, _ response: PracticeResponse) -> String {
    switch response {
    case .choice(let id):
        return problem.choices?.first { $0.id == id }?.label ?? id
    case .value(let v):
        return v
    case .fields(let values):
        if let fields = problem.fields {
            return fields.enumerated()
                .map { i, f in "\(f.label) \(values[f.id.isEmpty ? "f\(i)" : f.id] ?? "?")" }
                .joined(separator: " , ")
        }
        return values.values.joined(separator: " , ")
    }
}
