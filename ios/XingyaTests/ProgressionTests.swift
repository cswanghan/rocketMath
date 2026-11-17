// 经验/等级与时间锁的纯逻辑测试。数值直接对照 Web 端（src/practice/xp.ts、
// src/ui/timelock.ts）——两端同一个孩子的等级与休息节奏必须一致。

import Foundation
import Testing
@testable import Xingya

@Suite("经验与等级")
struct ProgressionTests {
    @Test("三角曲线达级门槛与 Web 端一致")
    func reachThresholds() {
        #expect(xpToReachLevel(1) == 0)
        #expect(xpToReachLevel(2) == 100)
        #expect(xpToReachLevel(3) == 300)
        #expect(xpToReachLevel(4) == 600)
        #expect(xpToReachLevel(5) == 1000)
    }

    @Test("经验反推等级与进度")
    func levelFromXpValues() {
        #expect(levelFromXp(0) == LevelInfo(level: 1, intoLevel: 0, span: 100, toNext: 100))
        #expect(levelFromXp(99).level == 1)
        #expect(levelFromXp(100) == LevelInfo(level: 2, intoLevel: 0, span: 200, toNext: 200))
        #expect(levelFromXp(250) == LevelInfo(level: 2, intoLevel: 150, span: 200, toNext: 50))
        #expect(levelFromXp(300).level == 3)
        #expect(levelFromXp(-5).level == 1) // 负数夹到 0
    }
}

@Suite("时间锁")
struct TimeLockTests {
    private let cfg = TimeLockConfig(enabled: true, playMinutes: 15, breakMinutes: 20)

    @Test("未满时限不锁")
    func underLimit() {
        var s = LockState.initial
        s = TimeLockGate.tick(s, deltaMs: 10 * 60000, now: 1000, config: cfg)
        #expect(!TimeLockGate.isLocked(s, now: 1000))
        #expect(s.playedMs == 10 * 60000)
    }

    @Test("玩满 15 分钟触发 20 分钟锁")
    func triggersLock() {
        var s = LockState.initial
        let now = 1_000_000
        s = TimeLockGate.tick(s, deltaMs: 15 * 60000, now: now, config: cfg)
        #expect(TimeLockGate.isLocked(s, now: now))
        #expect(TimeLockGate.remainingBreakMs(s, now: now) == 20 * 60000)
        // 锁定期内继续 tick 不改变解锁时刻
        let before = s.lockUntil
        s = TimeLockGate.tick(s, deltaMs: 5 * 60000, now: now + 60000, config: cfg)
        #expect(s.lockUntil == before)
    }

    @Test("休息到点后自动解锁并清零")
    func unlockAfterBreak() {
        var s = LockState(playedMs: 15 * 60000, lockUntil: 2000)
        s = TimeLockGate.tick(s, deltaMs: 0, now: 2000, config: cfg)
        #expect(!TimeLockGate.isLocked(s, now: 2000))
        #expect(s.playedMs == 0)
        #expect(s.lockUntil == nil)
    }

    @Test("配置关闭时不锁")
    func disabled() {
        let off = TimeLockConfig(enabled: false, playMinutes: 15, breakMinutes: 20)
        var s = LockState.initial
        s = TimeLockGate.tick(s, deltaMs: 100 * 60000, now: 1000, config: off)
        #expect(!TimeLockGate.isLocked(s, now: 1000))
    }
}
