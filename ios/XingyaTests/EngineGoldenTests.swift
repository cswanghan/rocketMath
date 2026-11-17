// 黄金用例对拍：Swift 引擎必须逐步复现 Web 端 TS 引擎的动作与状态。
//
// 用例由 tools/export-engine-golden.ts 从**真实 content pack** 驱动 TS 引擎生成
// （Golden/engine_golden.json，勿手改）。改任一端引擎行为后跑 `npm run golden`，
// 这里会精确告诉你哪个场景、第几步、哪个字段分叉了。
//
// 这是整个原生重写的安全网：内容包共用、引擎对拍，UI 才敢放心重做。

import Foundation
import Testing
@testable import Xingya

private final class BundleAnchor {}

// ----- 黄金用例文件结构 ------------------------------------------------------

private struct Golden: Decodable {
    let packVersion: String
    let rng: [RngCase]
    let scenarios: [GScenario]
}

private struct RngCase: Decodable {
    let seed: UInt32
    let values: [Double]
}

private struct GScenario: Decodable {
    let name: String
    let trackId: String
    let seed: UInt32
    let gateMs: Int
    let clockStart: Int
    let records: [GRecord]
}

private struct GRecord: Decodable {
    let i: Int
    let now: Int
    let event: GEvent
    let action: GAction
    let state: GState
}

private struct GEvent: Decodable {
    let type: String
    let factId: String?
    let value: Int?
    let elapsedMs: Int?
    let durationMs: Int?

    var asEvent: Event {
        switch type {
        case "NEXT":
            return .next
        case "START_RACE":
            return .startRace(durationMs: durationMs ?? 0)
        case "ANSWER":
            return .answer(factId: factId ?? "", value: value ?? 0, elapsedMs: elapsedMs ?? 0)
        default:
            fatalError("黄金用例里出现未知 event 类型 \(type)")
        }
    }
}

private struct GAction: Decodable {
    let kind: String
    let factId: String?
    let phase: String?
    let level: String?
    let correctPerMin: Double?
}

private struct GRace: Decodable {
    let endsAt: Int
    let correct: Int
    let answered: Int
    let durationMs: Int
}

private struct GState: Decodable {
    let currentLevel: String
    let phase: String
    let streak: Int
    let attempts: Int
    let errors: Int
    let pendingRetest: String?
    let completedLevels: [String]
    let factStatsDigest: String
    let factStatsCount: Int
    let race: GRace?
}

// ----- 辅助 ------------------------------------------------------------------

private func loadGolden() throws -> Golden {
    let bundle = Bundle(for: BundleAnchor.self)
    guard let url = bundle.url(forResource: "engine_golden", withExtension: "json") else {
        throw ContentPackError.notLoaded("测试 bundle 里找不到 engine_golden.json")
    }
    return try JSONDecoder().decode(Golden.self, from: Data(contentsOf: url))
}

/// 与 tools/export-engine-golden.ts 的 fnv1a 逐位一致（32 位环绕乘法）。
private func fnv1a(_ s: String) -> UInt32 {
    var h: UInt32 = 0x811c_9dc5
    for unit in s.utf16 {
        h ^= UInt32(unit)
        h = h &* 0x0100_0193
    }
    return h
}

private func digestFactStats(_ state: TrackState) -> String {
    let parts = state.factStats.keys.sorted().map { id -> String in
        let st = state.factStats[id]!
        return "\(id):\(st.seen):\(st.correct):\(st.lastMissAt ?? -1)"
    }
    return String(format: "%08x", fnv1a(parts.joined(separator: "|")))
}

/// 把 Swift 的 Action 压成与黄金用例可比的形状
private func describe(_ action: Action) -> (kind: String, factId: String?, phase: String?, level: String?, cpm: Double?) {
    switch action {
    case .prompt(let f): return ("PROMPT", f.id, nil, nil, nil)
    case .correction(let f): return ("CORRECTION", f.id, nil, nil, nil)
    case .phaseComplete(let p): return ("PHASE_COMPLETE", nil, p.rawValue, nil, nil)
    case .levelComplete(let l): return ("LEVEL_COMPLETE", nil, nil, l, nil)
    case .raceResult(let cpm): return ("RACE_RESULT", nil, nil, nil, cpm)
    }
}

private final class Clock {
    var value: Int
    init(_ v: Int) { value = v }
}

/// 第一处分叉的描述；nil 表示整条场景逐步一致。
private func firstDivergence(in scenario: GScenario, pack: ContentPack) -> String? {
    let clock = Clock(scenario.clockStart)
    let ctx = EngineContext(
        pack: pack,
        latencyGateMs: scenario.gateMs,
        now: { clock.value },
        rng: Mulberry32(seed: scenario.seed)
    )
    var state = Engine.initialState(trackId: scenario.trackId)

    for rec in scenario.records {
        clock.value = rec.now
        let result: StepResult
        do {
            result = try Engine.step(state, rec.event.asEvent, ctx)
        } catch {
            return "\(scenario.name) 第 \(rec.i) 步抛错：\(error)"
        }
        state = result.state

        let got = describe(result.action)
        let want = rec.action
        if got.kind != want.kind {
            return "\(scenario.name) 第 \(rec.i) 步 action 类型不符：期望 \(want.kind)，实得 \(got.kind)"
        }
        if let wantId = want.factId, got.factId != wantId {
            return "\(scenario.name) 第 \(rec.i) 步选题不符：期望 \(wantId)，实得 \(got.factId ?? "nil")（选题依赖 RNG 与权重顺序）"
        }
        if let wantPhase = want.phase, got.phase != wantPhase {
            return "\(scenario.name) 第 \(rec.i) 步 phaseComplete 不符：期望 \(wantPhase)，实得 \(got.phase ?? "nil")"
        }
        if let wantLevel = want.level, got.level != wantLevel {
            return "\(scenario.name) 第 \(rec.i) 步 levelComplete 不符：期望 \(wantLevel)，实得 \(got.level ?? "nil")"
        }
        if let wantCpm = want.correctPerMin, got.cpm != wantCpm {
            let gotCpm = got.cpm.map { "\($0)" } ?? "nil"
            return "\(scenario.name) 第 \(rec.i) 步竞速成绩不符：期望 \(wantCpm)，实得 \(gotCpm)"
        }

        let w = rec.state
        if state.currentLevel != w.currentLevel || state.phase.rawValue != w.phase
            || state.streak != w.streak || state.attempts != w.attempts || state.errors != w.errors
            || state.pendingRetest != w.pendingRetest || state.completedLevels != w.completedLevels {
            return """
                \(scenario.name) 第 \(rec.i) 步状态不符：
                  期望 level=\(w.currentLevel) phase=\(w.phase) streak=\(w.streak) attempts=\(w.attempts) \
                errors=\(w.errors) pending=\(w.pendingRetest ?? "nil") completed=\(w.completedLevels)
                  实得 level=\(state.currentLevel) phase=\(state.phase.rawValue) streak=\(state.streak) \
                attempts=\(state.attempts) errors=\(state.errors) pending=\(state.pendingRetest ?? "nil") \
                completed=\(state.completedLevels)
                """
        }
        if state.factStats.count != w.factStatsCount || digestFactStats(state) != w.factStatsDigest {
            return "\(scenario.name) 第 \(rec.i) 步 factStats 不符：期望 \(w.factStatsCount) 条/\(w.factStatsDigest)，实得 \(state.factStats.count) 条/\(digestFactStats(state))"
        }
        if let wr = w.race {
            guard let r = state.race else {
                return "\(scenario.name) 第 \(rec.i) 步应处于竞速中，实得 race=nil"
            }
            if r.endsAt != wr.endsAt || r.correct != wr.correct || r.answered != wr.answered || r.durationMs != wr.durationMs {
                return "\(scenario.name) 第 \(rec.i) 步竞速状态不符：期望 \(wr)，实得 \(r)"
            }
        } else if state.race != nil {
            return "\(scenario.name) 第 \(rec.i) 步不应处于竞速中"
        }
    }
    return nil
}

// ----- 测试 ------------------------------------------------------------------

@Test("mulberry32 与 Web 端逐位一致")
func rngParity() throws {
    let golden = try loadGolden()
    #expect(!golden.rng.isEmpty)
    for c in golden.rng {
        let rng = Mulberry32(seed: c.seed)
        for (i, want) in c.values.enumerated() {
            let got = rng.next()
            #expect(got == want, "seed \(c.seed) 第 \(i) 个随机数不符：期望 \(want)，实得 \(got)")
            if got != want { break }
        }
    }
}

@Test("引擎逐步复现 TS 端行为（真实 content pack）")
func engineParity() throws {
    let golden = try loadGolden()
    let pack = try ContentPackLoader.load("grade3_math_fluency_pack")
    #expect(pack.version == golden.packVersion, "content pack 版本与黄金用例不符，请重跑 npm run golden")
    #expect(!golden.scenarios.isEmpty)

    for scenario in golden.scenarios {
        let divergence = firstDivergence(in: scenario, pack: pack)
        #expect(divergence == nil, "\(divergence ?? "")")
    }
}

@Test("content pack 能从 App bundle 加载并通过校验")
func contentPackLoads() throws {
    let pack = try ContentPackLoader.load("grade3_math_fluency_pack")
    #expect(pack.grade == 3)
    #expect(!pack.enabledTracks.isEmpty)
    try ContentPackLoader.validate(pack)
}

@Test("prompt 反推答案：与 TS computeFromPrompt 行为一致")
func computeFromPrompt() {
    #expect(ContentPackLoader.computeFromPrompt("6 × 7") == 42)
    #expect(ContentPackLoader.computeFromPrompt("42 ÷ 6") == 7)
    #expect(ContentPackLoader.computeFromPrompt("70 + 20") == 90)
    #expect(ContentPackLoader.computeFromPrompt("90 − 20") == 70)
    #expect(ContentPackLoader.computeFromPrompt("20 − 90") == nil)  // 三年级不出负数
    #expect(ContentPackLoader.computeFromPrompt("7 ÷ 2") == nil)    // 必须整除
    #expect(ContentPackLoader.computeFromPrompt("几个十") == nil)     // 非算式
}
