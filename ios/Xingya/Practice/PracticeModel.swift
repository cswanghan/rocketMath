// Practice 引擎 ↔ SwiftUI 绑定层。对应 Web 端 src/ui/usePractice.ts。
// 规则只在 PracticeEngine 里；这里注入 rng、把 action 翻成界面状态、完成时落盘 + 记经验。

import Foundation
import Observation

@MainActor
@Observable
final class PracticeModel {

    enum ViewState: Equatable {
        case loading
        case present(Problem)
        case correct(Problem, firstTry: Bool)
        case wrong(Problem, tries: Int)
        case reveal(Problem)
        case complete(firstTryCorrect: Int, total: Int)
    }

    private(set) var viewState: ViewState = .loading
    private(set) var state: PracticeState
    private(set) var sessionXP = 0
    private(set) var lastGainXP = 0
    /// 每呈现一题 +1，驱动输入清空
    private(set) var problemSeq = 0

    let set: ProblemSet
    /// 当前题在三档中的位置，驱动关卡进度条
    var currentTier: Difficulty? {
        guard state.index >= 0, state.index < state.order.count else { return nil }
        return set.problems[state.order[state.index]].tier
    }

    private let storage: any StorageAdapter
    private let studentId: String
    private let context: PracticeContext
    private var recorded = false

    init(set: ProblemSet, storage: any StorageAdapter, studentId: String, seed: UInt32 = UInt32.random(in: 0...UInt32.max)) {
        self.set = set
        self.storage = storage
        self.studentId = studentId
        let rng = Mulberry32(seed: seed)
        self.context = PracticeContext(set: set, rng: rng, now: { Int(Date().timeIntervalSince1970 * 1000) })
        self.state = PracticeEngine.initialState(set: set, rng: rng)
        apply(PracticeEngine.step(state, .next, context))
    }

    // ----- 对外动作 ----------------------------------------------------------

    func answer(_ response: PracticeResponse) {
        apply(PracticeEngine.step(state, .answer(response), context))
    }

    func next() {
        apply(PracticeEngine.step(state, .next, context))
    }

    // ----- 内部 --------------------------------------------------------------

    private func apply(_ result: PracticeStepResult) {
        state = result.state

        switch result.action {
        case .present(let p):
            viewState = .present(p)
            problemSeq += 1
            lastGainXP = 0
        case .correct(let p, let firstTry):
            // 答对给经验并停在庆祝态，等孩子点「下一题」（与 Web 端一致，让反馈可见）
            let gain = xpForCorrect(difficulty: p.difficulty, firstTry: firstTry)
            sessionXP += gain
            lastGainXP = gain
            storage.addXp(studentId, gain)
            viewState = .correct(p, firstTry: firstTry)
        case .wrong(let p, let tries):
            viewState = .wrong(p, tries: tries)
        case .reveal(let p):
            viewState = .reveal(p)
        case .setComplete(let ftc, let total):
            viewState = .complete(firstTryCorrect: ftc, total: total)
            recordCompletion(firstTryCorrect: ftc, total: total)
        }
    }

    private func recordCompletion(firstTryCorrect: Int, total: Int) {
        guard !recorded else { return }
        recorded = true
        storage.putPracticeRecord(
            PracticeRecord(
                setId: set.id,
                bestFirstTryCorrect: firstTryCorrect,
                total: total,
                completedAt: context.now()
            ),
            studentId: studentId
        )
    }
}
