// 可复现随机源。引擎里所有随机都必须走注入的 RandomSource（SPEC §3、§10）。
//
// mulberry32 与 Web 端 src/engine/rng.ts 必须**逐位**一致，否则同一 seed 下两端
// 选出的题会分叉，黄金用例立刻失败。JS 的 Math.imul / >>> 对应 Swift UInt32 的
// &* / >>：都是 32 位环绕语义，可精确复现。

import Foundation

nonisolated protocol RandomSource: AnyObject {
    /// 返回 [0, 1) 内的下一个随机数
    func next() -> Double
}

nonisolated final class Mulberry32: RandomSource {
    private var a: UInt32

    init(seed: UInt32) {
        self.a = seed
    }

    func next() -> Double {
        a = a &+ 0x6d2b_79f5
        var t = (a ^ (a >> 15)) &* (1 | a)
        t = (t &+ ((t ^ (t >> 7)) &* (61 | t))) ^ t
        return Double(t ^ (t >> 14)) / 4_294_967_296.0
    }
}

/// 非确定性随机源，用于真实游玩（每次会话不同的出题顺序）。
nonisolated final class SystemRandomSource: RandomSource {
    func next() -> Double {
        Double.random(in: 0..<1)
    }
}
