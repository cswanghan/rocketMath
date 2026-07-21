// 经验值与等级。对应 Web 端 src/practice/xp.ts。纯函数、确定性，流畅度与 Practice 共用。
// 具体数值必须与 Web 端一致（两端同一个孩子换设备后等级不能跳变）。

import Foundation

/// 答对一道流畅度题的经验（限时训练无难度分档）。与 Web 端 FLUENCY_XP 一致。
let fluencyXP = 8

private let baseXP: [Difficulty: Int] = [.basic: 5, .consolidate: 10, .challenge: 20]

/// 答对一道 Practice 题的经验，一次答对翻倍。对应 Web 端 xpForCorrect。
func xpForCorrect(difficulty: Difficulty?, firstTry: Bool) -> Int {
    let base = baseXP[difficulty ?? .consolidate] ?? 10
    return firstTry ? base * 2 : base
}

struct LevelInfo: Equatable {
    let level: Int
    let intoLevel: Int   // 当前等级内已累计
    let span: Int        // 当前等级跨度（intoLevel / span = 进度）
    let toNext: Int      // 距下一级还差多少
}

/// 达到第 n 级所需的累计经验（n>=1）。三角曲线：L1=0/L2=100/L3=300/L4=600…
func xpToReachLevel(_ level: Int) -> Int {
    guard level > 1 else { return 0 }
    return 100 * (level - 1) * level / 2
}

func levelFromXp(_ xp: Int) -> LevelInfo {
    let x = max(0, xp)
    var level = 1
    while xpToReachLevel(level + 1) <= x { level += 1 }
    let start = xpToReachLevel(level)
    let end = xpToReachLevel(level + 1)
    return LevelInfo(level: level, intoLevel: x - start, span: end - start, toNext: end - x)
}
