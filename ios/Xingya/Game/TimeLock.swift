// 时间锁护栏（SPEC §7）：连续玩满 play_minutes 后强制歇 break_minutes。
// 纯 reducer 在这里，持久化 + SwiftUI 包装在 TimeLockService。状态跨重启保留，
// 孩子重开 App 也躲不掉休息。对应 Web 端 src/ui/timelock.ts。

import Foundation

struct LockState: Codable, Equatable {
    var playedMs: Int = 0        // 朝当前时限累计的活跃游玩时间
    var lockUntil: Int?          // 休息结束的时刻（epoch ms），nil = 未锁

    static let initial = LockState()
}

enum TimeLockGate {
    static func isLocked(_ s: LockState, now: Int) -> Bool {
        guard let until = s.lockUntil else { return false }
        return now < until
    }

    /// 用 deltaMs 的活跃游玩推进锁状态。
    static func tick(_ s: LockState, deltaMs: Int, now: Int, config: TimeLockConfig?) -> LockState {
        guard let config, config.enabled else { return s }

        if let until = s.lockUntil {
            // 正在（或刚结束）休息
            if now >= until { return LockState(playedMs: 0, lockUntil: nil) }
            return s
        }

        let playedMs = s.playedMs + max(0, deltaMs)
        if playedMs >= config.playMinutes * 60000 {
            return LockState(playedMs: playedMs, lockUntil: now + config.breakMinutes * 60000)
        }
        return LockState(playedMs: playedMs, lockUntil: nil)
    }

    /// 剩余休息时间（ms），未锁时为 0。
    static func remainingBreakMs(_ s: LockState, now: Int) -> Int {
        guard isLocked(s, now: now) else { return 0 }
        return max(0, (s.lockUntil ?? 0) - now)
    }
}

/// 时间锁的运行态封装：持久化到 UserDefaults（跨重启保留），供界面观察。
@MainActor
@Observable
final class TimeLockService {
    private static let key = "xingya.timelock"

    private(set) var state: LockState
    private let config: TimeLockConfig?

    init(config: TimeLockConfig?) {
        self.config = config
        if let data = UserDefaults.standard.data(forKey: Self.key),
           let restored = try? JSONDecoder().decode(LockState.self, from: data) {
            self.state = restored
        } else {
            self.state = .initial
        }
    }

    private func now() -> Int { Int(Date().timeIntervalSince1970 * 1000) }

    var isLocked: Bool { TimeLockGate.isLocked(state, now: now()) }

    var remainingBreakMs: Int { TimeLockGate.remainingBreakMs(state, now: now()) }

    /// 推进 deltaMs 活跃游玩，返回推进后是否处于锁定。
    @discardableResult
    func tick(deltaMs: Int) -> Bool {
        state = TimeLockGate.tick(state, deltaMs: deltaMs, now: now(), config: config)
        persist()
        return isLocked
    }

    /// 休息结束时清零（锁到点后调用一次即可回到可玩）。
    func refreshIfBreakOver() {
        if state.lockUntil != nil, !isLocked {
            state = TimeLockGate.tick(state, deltaMs: 0, now: now(), config: config)
            persist()
        }
    }

    private func persist() {
        if let data = try? JSONEncoder().encode(state) {
            UserDefaults.standard.set(data, forKey: Self.key)
        }
    }
}
