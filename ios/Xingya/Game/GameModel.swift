// 引擎 ↔ SwiftUI 的绑定层。对应 Web 端 src/ui/useGame.ts。
//
// 职责边界：引擎保持纯函数；这里注入 now()/rng()、量 elapsedMs、把结果 action
// 翻译成界面状态，并在每一步之后落盘（快照 + append-only 事件日志）。
// 任何游戏规则都不许写在这里——规则只在 Engine 里，否则两端就会漂移。

import Foundation
import Observation

/// 答对一题的经验值，与 Web 端 FLUENCY_XP 保持一致。
let fluencyXP = 8

@MainActor
@Observable
final class GameModel {

    enum ViewState: Equatable {
        case loading
        case prompt(fact: Fact, isRetest: Bool)
        case correction(Fact)
        case phaseDone(Phase)
        case levelDone(String)
        case raceResult(correctPerMin: Double)
        case failed(String)
    }

    private(set) var viewState: ViewState = .loading
    private(set) var trackState: TrackState?
    /// 每出一道新题 +1，驱动倒计时环重置与输入框清空
    private(set) var promptSeq = 0
    private(set) var sessionXP = 0

    let track: Track
    let latencyGateMs: Int
    let mastery: Mastery

    private let pack: ContentPack
    private let storage: any StorageAdapter
    private let studentId: String
    private let context: EngineContext
    private var promptStartedAt = Date()

    init(
        trackId: String,
        pack: ContentPack,
        storage: any StorageAdapter,
        studentId: String,
        seed: UInt32 = UInt32.random(in: 0...UInt32.max)
    ) throws {
        self.pack = pack
        self.storage = storage
        self.studentId = studentId
        self.track = try pack.track(trackId)
        self.mastery = pack.engineConfig.mastery

        let student = storage.student(id: studentId)
        let gate = student?.latencyGateMs ?? Int(pack.engineConfig.latencyGateSeconds * 1000)
        self.latencyGateMs = gate
        self.context = EngineContext(
            pack: pack,
            latencyGateMs: gate,
            now: { Int(Date().timeIntervalSince1970 * 1000) },
            rng: Mulberry32(seed: seed)
        )

        // 恢复上次进度（SPEC §9：刷新/重开不丢进度），没有则从 A 关起飞
        let restored = storage.trackState(studentId: studentId, trackId: trackId)
            ?? Engine.initialState(trackId: trackId)
        apply(try Engine.step(restored, .next, context), previous: restored, event: .next)
    }

    // ----- 对外动作 ----------------------------------------------------------

    func submit(_ value: Int) {
        guard case .prompt(let fact, _) = viewState else { return }
        dispatch(.answer(factId: fact.id, value: value, elapsedMs: elapsedMs()))
    }

    /// 倒计时归零：按超时记一次失误（value 用一个必然错的哨兵值，elapsed 超过门）
    func timeoutMiss() {
        guard case .prompt(let fact, _) = viewState else { return }
        dispatch(.answer(factId: fact.id, value: Int.min, elapsedMs: latencyGateMs + 1))
    }

    func next() {
        dispatch(.next)
    }

    func startRace(durationMs: Int) {
        dispatch(.startRace(durationMs: durationMs))
    }

    // ----- 内部 --------------------------------------------------------------

    private func elapsedMs() -> Int {
        max(0, Int(Date().timeIntervalSince(promptStartedAt) * 1000))
    }

    private func dispatch(_ event: Event) {
        guard let previous = trackState else { return }
        do {
            let result = try Engine.step(previous, event, context)
            apply(result, previous: previous, event: event)
        } catch {
            viewState = .failed("\(error)")
        }
    }

    private func apply(_ result: StepResult, previous: TrackState, event: Event) {
        trackState = result.state
        viewState = Self.viewState(for: result.action, pendingRetest: result.state.pendingRetest)
        if case .prompt = result.action {
            promptStartedAt = Date()
            promptSeq += 1
        }
        persist(result: result, previous: previous, event: event)
    }

    private static func viewState(for action: Action, pendingRetest: String?) -> ViewState {
        switch action {
        case .prompt(let fact):
            return .prompt(fact: fact, isRetest: pendingRetest == fact.id)
        case .correction(let fact):
            return .correction(fact)
        case .phaseComplete(let phase):
            return .phaseDone(phase)
        case .levelComplete(let level):
            return .levelDone(level)
        case .raceResult(let cpm):
            return .raceResult(correctPerMin: cpm)
        }
    }

    private func persist(result: StepResult, previous: TrackState, event: Event) {
        storage.putTrackState(result.state, studentId: studentId)

        guard case .answer(let factId, let value, let elapsedMs) = event else { return }
        let outcome = AnswerOutcome.classify(previous: previous, action: result.action)
        if outcome == .hit {
            sessionXP += fluencyXP
            storage.addXp(studentId, fluencyXP)
        }
        storage.appendEvent(AnswerEventRecord(
            studentId: studentId,
            trackId: track.trackId,
            ts: context.now(),
            level: previous.currentLevel,
            phase: previous.phase.rawValue,
            factId: factId,
            value: value == Int.min ? nil : value, // Int.min 是超时哨兵，不是孩子填的数
            elapsedMs: elapsedMs,
            outcome: outcome.rawValue
        ))
    }
}
