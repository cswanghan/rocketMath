// Practice 引擎黄金对拍：Swift 侧必须逐步复现 TS 端 practiceStep 的动作与状态，
// 洗牌顺序（order）尤其要逐位一致——它依赖 mulberry32。
// 用例由 tools/export-practice-golden.ts 生成，改引擎后跑 npm run golden:practice。

import Foundation
import Testing
@testable import Xingya

private final class BundleAnchor {}

private struct PGolden: Decodable {
    let packVersion: String
    let scenarios: [PScenario]
}

private struct PScenario: Decodable {
    let name: String
    let setId: String
    let seed: UInt32
    let records: [PRecord]
}

private struct PRecord: Decodable {
    let i: Int
    let event: PEvent
    let action: PAction
    let state: PState
}

private struct PEvent: Decodable {
    let type: String
    let responseKind: String?
}

private struct PAction: Decodable {
    let kind: String
    let problemId: String?
    let firstTry: Bool?
    let tries: Int?
    let firstTryCorrect: Int?
    let total: Int?
}

private struct PState: Decodable {
    let index: Int
    let tries: Int
    let firstTryCorrect: Int
    let status: String
    let order: [Int]
}

private func loadPracticeGolden() throws -> PGolden {
    let bundle = Bundle(for: BundleAnchor.self)
    guard let url = bundle.url(forResource: "practice_golden", withExtension: "json") else {
        throw ContentPackError.notLoaded("测试 bundle 里找不到 practice_golden.json")
    }
    return try JSONDecoder().decode(PGolden.self, from: Data(contentsOf: url))
}

private func loadPracticePack() throws -> PracticePack {
    let bundle = Bundle.main
    guard let url = bundle.url(forResource: "grade3_practice_pack", withExtension: "json", subdirectory: "content")
        ?? bundle.url(forResource: "grade3_practice_pack", withExtension: "json") else {
        throw ContentPackError.notLoaded("bundle 里找不到 grade3_practice_pack.json")
    }
    return try JSONDecoder().decode(PracticePack.self, from: Data(contentsOf: url))
}

private func describe(_ action: PracticeAction) -> (kind: String, problemId: String?, firstTry: Bool?, tries: Int?, ftc: Int?, total: Int?) {
    switch action {
    case .present(let p): return ("PRESENT", p.id, nil, nil, nil, nil)
    case .correct(let p, let ft): return ("CORRECT", p.id, ft, nil, nil, nil)
    case .wrong(let p, let t): return ("WRONG", p.id, nil, t, nil, nil)
    case .reveal(let p): return ("REVEAL", p.id, nil, nil, nil, nil)
    case .setComplete(let ftc, let total): return ("SET_COMPLETE", nil, nil, nil, ftc, total)
    }
}

/// 按黄金记录里的 action.kind 回放对应事件。作答对错由 kind 决定，无需存完整 response。
private func replayEvent(_ rec: PRecord, problem: Problem?) -> PracticeEvent {
    if rec.event.type == "NEXT" { return .next }
    // ANSWER：这一步的目标 action 决定答对还是答错
    let wantCorrect = rec.action.kind == "CORRECT"
    guard let problem else { return .answer(.value("__x__")) }
    return .answer(wantCorrect ? correctResponse(problem) : wrongResponse(problem))
}

private func correctResponse(_ p: Problem) -> PracticeResponse {
    switch p.type {
    case .mc:
        return .choice(p.choices?.first(where: \.correct)?.id ?? p.choices?.first?.id ?? "a")
    case .fill:
        return .value(p.answer?.display ?? "")
    case .steps:
        var values: [String: String] = [:]
        for (i, f) in (p.fields ?? []).enumerated() {
            values[f.id.isEmpty ? "f\(i)" : f.id] = f.answer.display
        }
        return .fields(values)
    }
}

private func wrongResponse(_ p: Problem) -> PracticeResponse {
    switch p.type {
    case .mc: return .choice(p.choices?.first(where: { !$0.correct })?.id ?? "zzz")
    case .fill: return .value("__nope__")
    case .steps: return .fields([:])
    }
}

@Test("Practice 引擎逐步复现 TS 端行为（真实 practice pack）")
func practiceParity() throws {
    let golden = try loadPracticeGolden()
    let pack = try loadPracticePack()
    #expect(pack.version == golden.packVersion, "practice pack 版本与黄金用例不符，请重跑 npm run golden:practice")
    #expect(!golden.scenarios.isEmpty)

    for scenario in golden.scenarios {
        guard let set = pack.set(id: scenario.setId) else {
            Issue.record("pack 里找不到题集 \(scenario.setId)")
            continue
        }
        let ctx = PracticeContext(set: set, rng: Mulberry32(seed: scenario.seed), now: { 0 })
        var state = PracticeEngine.initialState(set: set, rng: ctx.rng)

        // 首条是 NEXT
        var result = PracticeEngine.step(state, .next, ctx)
        var divergence: String? = compare(scenario.records[0], result, scenario.name)
        state = result.state

        var idx = 1
        while divergence == nil && idx < scenario.records.count {
            let rec = scenario.records[idx]
            let currentProblem = state.index >= 0 && state.index < state.order.count
                ? set.problems[state.order[state.index]] : nil
            result = PracticeEngine.step(state, replayEvent(rec, problem: currentProblem), ctx)
            divergence = compare(rec, result, scenario.name)
            state = result.state
            idx += 1
        }
        #expect(divergence == nil, "\(divergence ?? "")")
    }
}

private func compare(_ rec: PRecord, _ result: PracticeStepResult, _ name: String) -> String? {
    let got = describe(result.action)
    let want = rec.action
    if got.kind != want.kind {
        return "\(name) 第 \(rec.i) 步 action 不符：期望 \(want.kind)，实得 \(got.kind)"
    }
    if let pid = want.problemId, got.problemId != pid {
        return "\(name) 第 \(rec.i) 步题目不符：期望 \(pid)，实得 \(got.problemId ?? "nil")（洗牌顺序依赖 RNG）"
    }
    if let ft = want.firstTry, got.firstTry != ft {
        return "\(name) 第 \(rec.i) 步 firstTry 不符：期望 \(ft)，实得 \(String(describing: got.firstTry))"
    }
    if let t = want.tries, got.tries != t {
        return "\(name) 第 \(rec.i) 步 tries 不符：期望 \(t)，实得 \(String(describing: got.tries))"
    }
    let s = result.state
    let w = rec.state
    if s.index != w.index || s.tries != w.tries || s.firstTryCorrect != w.firstTryCorrect || s.status.rawValue != w.status {
        return "\(name) 第 \(rec.i) 步状态不符：期望 index=\(w.index) tries=\(w.tries) ftc=\(w.firstTryCorrect) status=\(w.status)，实得 index=\(s.index) tries=\(s.tries) ftc=\(s.firstTryCorrect) status=\(s.status.rawValue)"
    }
    if s.order != w.order {
        return "\(name) 第 \(rec.i) 步洗牌顺序不符（mulberry32 未逐位复现）：期望 \(w.order)，实得 \(s.order)"
    }
    return nil
}
