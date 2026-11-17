// 选题。MVP 策略（SPEC §5）：在当前池内随机，但给「最近答错」的题更高权重。
// 这里留了钩子，将来换 FSRS/SM-2 只替换 pickFact，不动 reducer——MVP 阶段不要在这里
// 实现间隔重复评分。
//
// 权重求和与减法的**顺序**必须与 Web 端 src/engine/select.ts 完全一致：两端都是
// IEEE754 double，同序运算才能得到同一道题。

import Foundation

nonisolated struct SelectContext {
    let rng: RandomSource
    let recentMissWeight: Double
}

nonisolated enum FactSelector {
    private static func weight(of stat: FactStat?, recentMissWeight: Double) -> Double {
        // 基础权重 1；最近失误且尚未赎回的题加权，让它更快回锅。
        var w = 1.0
        if stat?.lastMissAt != nil { w += recentMissWeight }
        return w
    }

    /// 按 recent-miss 加权随机选一题。池里多于一题时避开 excludeId（通常是刚答过的
    /// 那题），防止连续出同一道。
    static func pick(
        from pool: [Fact],
        state: TrackState,
        context: SelectContext,
        excluding excludeId: String? = nil
    ) throws -> Fact {
        guard !pool.isEmpty else {
            throw ContentPackError.invalid("pickFact: 题池为空")
        }
        if pool.count == 1 { return pool[0] }

        let candidates = excludeId.map { id in pool.filter { $0.id != id } } ?? pool
        let usable = candidates.isEmpty ? pool : candidates

        let weights = usable.map { weight(of: state.factStats[$0.id], recentMissWeight: context.recentMissWeight) }
        let total = weights.reduce(0, +)
        var r = context.rng.next() * total
        for i in usable.indices {
            r -= weights[i]
            if r < 0 { return usable[i] }
        }
        return usable[usable.count - 1] // 浮点舍入兜底
    }
}
