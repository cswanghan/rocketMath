// Practice reducer：practiceStep(state, event, ctx) -> (state, action)。
// 非限时掌握循环：洗牌题集、逐题呈现；答错给提示可重试（不罚），超过 maxTries 揭示答案；
// 全部走完即完成。按「一次答对」统计掌握。对应 Web 端 src/practice/engine.ts，行为由
// 黄金用例逐步对拍锁死（洗牌顺序依赖 mulberry32 逐位复现）。

import Foundation

nonisolated struct PracticeStepResult: Equatable {
    let state: PracticeState
    let action: PracticeAction
}

nonisolated enum PracticeEngine {

    static func initialState(set: ProblemSet, rng: RandomSource) -> PracticeState {
        PracticeState(
            setId: set.id,
            order: tieredOrder(set: set, rng: rng),
            index: -1,
            tries: 0,
            firstTryCorrect: 0,
            status: .active
        )
    }

    static func step(_ state: PracticeState, _ event: PracticeEvent, _ ctx: PracticeContext) -> PracticeStepResult {
        switch event {
        case .next:
            return advance(state, ctx)
        case .answer(let response):
            return handleAnswer(state, response, ctx)
        }
    }

    // ----- 出题顺序 ----------------------------------------------------------

    /// Fisher-Yates 洗牌，与 Web 端 shuffleInPlace 逐位一致（rng()*（i+1) 向下取整）。
    private static func shuffled(_ a: [Int], _ rng: RandomSource) -> [Int] {
        var arr = a
        var i = arr.count - 1
        while i > 0 {
            let j = Int((rng.next() * Double(i + 1)).rounded(.down))
            arr.swapAt(i, j)
            i -= 1
        }
        return arr
    }

    /// basic → consolidate → challenge，每档内洗牌，难度沿 topic 递增。
    private static func tieredOrder(set: ProblemSet, rng: RandomSource) -> [Int] {
        var order: [Int] = []
        for tier in difficultyOrder {
            let idx = set.problems.enumerated()
                .filter { $0.element.tier == tier }
                .map { $0.offset }
            order.append(contentsOf: shuffled(idx, rng))
        }
        return order
    }

    // ----- reducer 分支 ------------------------------------------------------

    private static func handleAnswer(
        _ state: PracticeState,
        _ response: PracticeResponse,
        _ ctx: PracticeContext
    ) -> PracticeStepResult {
        let problem = ctx.set.problems[state.order[state.index]]
        if PracticeCheck.isCorrect(problem, response) {
            let firstTry = state.tries == 0
            var next = state
            next.firstTryCorrect += firstTry ? 1 : 0
            return PracticeStepResult(state: next, action: .correct(problem, firstTry: firstTry))
        }

        var next = state
        next.tries += 1
        if next.tries >= ctx.set.maxTriesOrDefault {
            return PracticeStepResult(state: next, action: .reveal(problem))
        }
        return PracticeStepResult(state: next, action: .wrong(problem, tries: next.tries))
    }

    private static func advance(_ state: PracticeState, _ ctx: PracticeContext) -> PracticeStepResult {
        let nextIndex = state.index + 1
        if nextIndex >= state.order.count {
            var next = state
            next.status = .complete
            return PracticeStepResult(
                state: next,
                action: .setComplete(firstTryCorrect: state.firstTryCorrect, total: state.order.count)
            )
        }
        var next = state
        next.index = nextIndex
        next.tries = 0
        return PracticeStepResult(state: next, action: .present(ctx.set.problems[state.order[nextIndex]]))
    }
}
