import Foundation
import Testing
@testable import Xingya

@Suite("Grade 4 oral-math variety")
@MainActor
struct Grade4FluencyTests {
    @Test(arguments: ["zh-Hans", "en"])
    func bundledSkillsHaveVariedAnswers(language: String) throws {
        let pack = try AppContent.load(grade: 4, language: language).fluencyPack
        #expect(pack.tracks.count == 4)
        for track in pack.tracks {
            #expect(track.levels.map(\.level) == ["A", "B", "C", "D"])
            for level in track.levels {
                let counts = Dictionary(grouping: level.newFacts, by: \.answer).mapValues(\.count)
                #expect(level.newFacts.count >= 16)
                #expect(counts.count >= 6)
                #expect((counts.values.max() ?? 0) * 4 <= level.newFacts.count)
            }
        }
    }

    @Test(arguments: ["zh-Hans", "en"])
    func fullLevelProgressionUsesVariedAnswers(language: String) throws {
        let pack = try AppContent.load(grade: 4, language: language).fluencyPack
        for track in pack.tracks {
            for seed: UInt32 in [0, 1, 42, 20261117] {
                let context = EngineContext(pack: pack, latencyGateMs: 3000, now: { 1000 }, rng: Mulberry32(seed: seed))
                var result = try Engine.step(Engine.initialState(trackId: track.trackId), .next, context)
                var answers: [Int] = []
                for _ in 0..<72 {
                    guard case .prompt(let fact) = result.action else {
                        Issue.record("Expected a prompt during level A"); return
                    }
                    answers.append(fact.answer)
                    result = try Engine.step(result.state, .answer(factId: fact.id, value: fact.answer, elapsedMs: 100), context)
                    if case .phaseComplete = result.action {
                        result = try Engine.step(result.state, .next, context)
                    }
                }
                #expect(result.action == .levelComplete("A"))
                #expect(result.state.currentLevel == "B")
                #expect(result.state.completedLevels == ["A"])
                #expect(Set(answers).count >= 6)
                let counts = Dictionary(grouping: answers, by: { $0 }).mapValues(\.count)
                #expect((counts.values.max() ?? 0) < 36)
            }
        }
    }

    @Test(arguments: ["zh-Hans", "en"])
    func savedProgressAndOriginalPendingRetestSurviveExpansion(language: String) throws {
        let pack = try AppContent.load(grade: 4, language: language).fluencyPack
        var saved = Engine.initialState(trackId: "div_tens_oral", startLevel: "D")
        saved.phase = .orbit
        saved.attempts = 7
        saved.errors = 1
        saved.completedLevels = ["A", "B", "C"]
        saved.pendingRetest = "dto_630d90"
        saved.factStats = ["dto_630d90": FactStat(seen: 3, correct: 2, lastMissAt: 900)]
        let restored = try JSONDecoder().decode(TrackState.self, from: JSONEncoder().encode(saved))
        let context = EngineContext(pack: pack, latencyGateMs: 3000, now: { 1000 }, rng: Mulberry32(seed: 42))
        let result = try Engine.step(restored, .next, context)
        guard case .prompt(let fact) = result.action else {
            Issue.record("Saved correction must resume"); return
        }
        #expect(fact.id == "dto_630d90")
        #expect(fact.prompt == "630 ÷ 90")
        #expect(fact.answer == 7)
        let next = try Engine.step(result.state, .answer(factId: fact.id, value: 7, elapsedMs: 100), context)
        #expect(next.state.pendingRetest == nil)
        #expect(next.state.completedLevels == saved.completedLevels)
        #expect(next.state.currentLevel == "D")
        #expect(next.state.phase == .orbit)
        #expect(next.state.attempts == 7)
        #expect(next.state.errors == 1)
        #expect(next.state.factStats[fact.id] == FactStat(seen: 4, correct: 3, lastMissAt: nil))
    }
}
