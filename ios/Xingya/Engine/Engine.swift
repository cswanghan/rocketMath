// 核心 reducer：step(state, event, ctx) -> (state, action)。
// 由 Web 端 src/engine/engine.ts 逐行移植而来，行为由黄金用例逐步对拍锁死。
//
// 纯函数、确定性、零副作用（SPEC §5）。UI 这样驱动它：
//   NEXT       -> PROMPT（当前阶段的下一题，或待重测题）
//   ANSWER     -> 干净答对：PROMPT / PHASE_COMPLETE / LEVEL_COMPLETE
//                 失误：CORRECTION（重教 + 立即重测）
//   START_RACE -> PROMPT（竞速首题）；之后 ANSWER 计分，时钟越过终点产出 RACE_RESULT

import Foundation

nonisolated struct StepResult: Equatable {
    let state: TrackState
    let action: Action
}

nonisolated enum Engine {

    static func initialState(trackId: String, startLevel: String = "A") -> TrackState {
        TrackState(
            trackId: trackId,
            currentLevel: startLevel,
            phase: .takeOff,
            streak: 0,
            attempts: 0,
            errors: 0,
            pendingRetest: nil,
            factStats: [:],
            completedLevels: [],
            race: nil
        )
    }

    // ----- 公开 reducer ------------------------------------------------------

    static func step(_ state: TrackState, _ event: Event, _ ctx: EngineContext) throws -> StepResult {
        switch event {
        case .startRace(let durationMs):
            return try startRace(state, durationMs: durationMs, ctx)
        case .next:
            return try handleNext(state, ctx)
        case .answer(let factId, let value, let elapsedMs):
            return try handleAnswer(state, factId: factId, value: value, elapsedMs: elapsedMs, ctx)
        }
    }

    // ----- 统计辅助（不可变更新）---------------------------------------------

    private struct StatUpdate {
        var correct: Bool
        var missAt: Int?        // 设置 lastMissAt
        var clearMiss: Bool = false  // 干净答对，丢弃 lastMissAt
    }

    private static func recordStat(
        _ stats: [String: FactStat],
        _ id: String,
        _ u: StatUpdate
    ) -> [String: FactStat] {
        let prev = stats[id] ?? FactStat()
        var next = FactStat(seen: prev.seen + 1, correct: prev.correct + (u.correct ? 1 : 0))
        if let missAt = u.missAt {
            next.lastMissAt = missAt
        } else if !u.clearMiss, let prevMiss = prev.lastMissAt {
            next.lastMissAt = prevMiss
        }
        var out = stats
        out[id] = next
        return out
    }

    /// 命中 = 答案正确 **且** 在时限内。答错或超时都算失误。
    private static func isHit(_ fact: Fact, value: Int, elapsedMs: Int, gateMs: Int) -> Bool {
        value == fact.answer && elapsedMs <= gateMs
    }

    private static func selectContext(_ ctx: EngineContext) -> SelectContext {
        SelectContext(rng: ctx.rng, recentMissWeight: ctx.pack.engineConfig.interleaveRules.recentMissWeight)
    }

    // ----- NEXT --------------------------------------------------------------

    private static func handleNext(_ state: TrackState, _ ctx: EngineContext) throws -> StepResult {
        let track = try ctx.pack.track(state.trackId)

        if let race = state.race {
            if ctx.now() >= race.endsAt { return finishRace(state) }
            let pool = try track.learnedPool(state.currentLevel)
            let fact = try FactSelector.pick(from: pool, state: state, context: selectContext(ctx))
            return StepResult(state: state, action: .prompt(fact))
        }

        if let pending = state.pendingRetest {
            guard let fact = track.fact(id: pending) else {
                throw ContentPackError.invalid("track \(track.trackId) 找不到待重测的 fact \(pending)")
            }
            return StepResult(state: state, action: .prompt(fact))
        }

        let pool = try track.pool(for: state.phase, level: state.currentLevel)
        let fact = try FactSelector.pick(from: pool, state: state, context: selectContext(ctx))
        return StepResult(state: state, action: .prompt(fact))
    }

    // ----- ANSWER ------------------------------------------------------------

    private static func handleAnswer(
        _ state: TrackState,
        factId: String,
        value: Int,
        elapsedMs: Int,
        _ ctx: EngineContext
    ) throws -> StepResult {
        if state.race != nil {
            return try handleRaceAnswer(state, factId: factId, value: value, ctx)
        }

        let track = try ctx.pack.track(state.trackId)
        let gate = ctx.latencyGateMs

        // --- 纠错回路：有待立即重测的题 ---------------------------------------
        if let pending = state.pendingRetest {
            guard let fact = track.fact(id: pending) else {
                throw ContentPackError.invalid("track \(track.trackId) 找不到待重测的 fact \(pending)")
            }
            if isHit(fact, value: value, elapsedMs: elapsedMs, gateMs: gate) {
                // 赎回。**不**计入 streak / attempts / errors。
                var next = state
                next.factStats = recordStat(state.factStats, fact.id, StatUpdate(correct: true, missAt: nil, clearMiss: true))
                next.pendingRetest = nil
                let pool = try track.pool(for: next.phase, level: next.currentLevel)
                let picked = try FactSelector.pick(from: pool, state: next, context: selectContext(ctx), excluding: fact.id)
                return StepResult(state: next, action: .prompt(picked))
            }
            // 还是没答对：再重教一次，重测继续挂着。
            var next = state
            next.factStats = recordStat(state.factStats, fact.id, StatUpdate(correct: false, missAt: ctx.now()))
            return StepResult(state: next, action: .correction(fact))
        }

        // --- 普通作答 ---------------------------------------------------------
        guard let fact = track.fact(id: factId) else {
            throw ContentPackError.invalid("track \(track.trackId) 找不到 fact \(factId)")
        }
        if isHit(fact, value: value, elapsedMs: elapsedMs, gateMs: gate) {
            return try registerHit(state, fact: fact, track: track, ctx)
        }
        return registerMiss(state, fact: fact, ctx)
    }

    private static func registerMiss(_ state: TrackState, fact: Fact, _ ctx: EngineContext) -> StepResult {
        var next = state
        next.factStats = recordStat(state.factStats, fact.id, StatUpdate(correct: false, missAt: ctx.now()))
        next.pendingRetest = fact.id

        if state.phase == .takeOff {
            next.streak = 0 // 连对计数在失误时归零
        } else if let window = ctx.pack.engineConfig.window(for: state.phase) {
            // orbit / universe：失误计入本窗口
            var attempts = state.attempts + 1
            var errors = state.errors + 1
            if errors > window.maxErrors {
                // 本窗口失败——重开这一轮测试
                attempts = 0
                errors = 0
            }
            next.attempts = attempts
            next.errors = errors
        }
        return StepResult(state: next, action: .correction(fact))
    }

    private static func registerHit(
        _ state: TrackState,
        fact: Fact,
        track: Track,
        _ ctx: EngineContext
    ) throws -> StepResult {
        let factStats = recordStat(state.factStats, fact.id, StatUpdate(correct: true, missAt: nil, clearMiss: true))
        let mastery = ctx.pack.engineConfig.mastery

        if state.phase == .takeOff {
            let streak = state.streak + 1
            if streak >= mastery.takeOff.consecutiveCorrectWithinGate {
                // Take-Off 掌握 -> 进入 Orbit
                var next = state
                next.factStats = factStats
                next.phase = .orbit
                next.streak = 0
                next.attempts = 0
                next.errors = 0
                return StepResult(state: next, action: .phaseComplete(.takeOff))
            }
            var next = state
            next.factStats = factStats
            next.streak = streak
            return try promptNext(next, excluding: fact.id, ctx)
        }

        // orbit / universe
        guard let window = ctx.pack.engineConfig.window(for: state.phase) else {
            throw ContentPackError.invalid("阶段 \(state.phase.rawValue) 缺少掌握窗口配置")
        }
        let attempts = state.attempts + 1

        if attempts >= window.windowAttempts && state.errors <= window.maxErrors {
            if state.phase == .orbit {
                var next = state
                next.factStats = factStats
                next.phase = .universe
                next.attempts = 0
                next.errors = 0
                return StepResult(state: next, action: .phaseComplete(.orbit))
            }
            // universe 掌握 -> 过关
            var next = state
            next.factStats = factStats
            return try completeLevel(next, track: track)
        }

        var next = state
        next.factStats = factStats
        next.attempts = attempts
        return try promptNext(next, excluding: fact.id, ctx)
    }

    private static func completeLevel(_ state: TrackState, track: Track) throws -> StepResult {
        let finished = state.currentLevel
        var next = state
        if !next.completedLevels.contains(finished) {
            next.completedLevels.append(finished)
        }
        if let upcoming = try track.nextLevel(after: finished) {
            next.currentLevel = upcoming
            next.phase = .takeOff
            next.streak = 0
            next.attempts = 0
            next.errors = 0
        } else {
            // 最后一关也过了——原地不动，整条 track 掌握。
            next.attempts = 0
            next.errors = 0
        }
        return StepResult(state: next, action: .levelComplete(finished))
    }

    private static func promptNext(
        _ state: TrackState,
        excluding excludeId: String,
        _ ctx: EngineContext
    ) throws -> StepResult {
        let track = try ctx.pack.track(state.trackId)
        let pool = try track.pool(for: state.phase, level: state.currentLevel)
        let fact = try FactSelector.pick(from: pool, state: state, context: selectContext(ctx), excluding: excludeId)
        return StepResult(state: state, action: .prompt(fact))
    }

    // ----- 竞速 --------------------------------------------------------------

    private static func startRace(_ state: TrackState, durationMs: Int, _ ctx: EngineContext) throws -> StepResult {
        let track = try ctx.pack.track(state.trackId)
        var next = state
        next.race = RaceState(endsAt: ctx.now() + durationMs, correct: 0, answered: 0, durationMs: durationMs)
        let pool = try track.learnedPool(state.currentLevel)
        let fact = try FactSelector.pick(from: pool, state: next, context: selectContext(ctx))
        return StepResult(state: next, action: .prompt(fact))
    }

    private static func handleRaceAnswer(
        _ state: TrackState,
        factId: String,
        value: Int,
        _ ctx: EngineContext
    ) throws -> StepResult {
        guard let race = state.race else {
            throw ContentPackError.invalid("handleRaceAnswer: 不在竞速中")
        }
        if ctx.now() >= race.endsAt { return finishRace(state) }

        let track = try ctx.pack.track(state.trackId)
        guard let fact = track.fact(id: factId) else {
            throw ContentPackError.invalid("track \(track.trackId) 找不到 fact \(factId)")
        }
        let correct = value == fact.answer // 竞速只看对错，不看时限
        var next = state
        next.factStats = recordStat(state.factStats, fact.id, StatUpdate(correct: correct, missAt: nil))
        next.race = RaceState(
            endsAt: race.endsAt,
            correct: race.correct + (correct ? 1 : 0),
            answered: race.answered + 1,
            durationMs: race.durationMs
        )

        if ctx.now() >= next.race!.endsAt { return finishRace(next) }
        let pool = try track.learnedPool(next.currentLevel)
        let picked = try FactSelector.pick(from: pool, state: next, context: selectContext(ctx), excluding: fact.id)
        return StepResult(state: next, action: .prompt(picked))
    }

    private static func finishRace(_ state: TrackState) -> StepResult {
        let race = state.race! // 调用点已确保在竞速中
        let minutes = Double(race.durationMs) / 60000.0
        let correctPerMin = minutes > 0 ? Double(race.correct) / minutes : 0
        var next = state
        next.race = nil
        return StepResult(state: next, action: .raceResult(correctPerMin: correctPerMin))
    }
}
