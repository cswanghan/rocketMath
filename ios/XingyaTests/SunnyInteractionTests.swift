import Foundation
import Testing
@testable import Xingya

@Suite("Sunny feedback contracts", .serialized)
@MainActor
struct SunnyInteractionTests {
    @Test func fluencyWaitsForContinueAndPersistsOnlyOnce() throws {
        let content = try AppContent.load(grade: 3)
        let storage = InMemoryStorage()
        let track = try #require(content.fluencyPack.enabledTracks.first)
        let model = try GameModel(trackId: track.trackId, pack: content.fluencyPack, storage: storage, studentId: "test", seed: 42)
        guard case .prompt(let fact, _) = model.viewState else { Issue.record("Expected prompt"); return }
        let sequence = model.promptSeq
        model.submit(fact.answer)
        #expect(model.viewState == .correct(fact))
        #expect(model.promptSeq == sequence)
        #expect(storage.events(studentId: "test", limit: 100).count == 1)
        model.timeoutMiss()
        model.submit(fact.answer)
        #expect(model.viewState == .correct(fact))
        #expect(storage.events(studentId: "test", limit: 100).count == 1)
        model.next()
        #expect(model.promptSeq == sequence + 1)
        #expect(storage.events(studentId: "test", limit: 100).count == 1)
    }
    @Test func timeoutRequiresManualRetest() throws {
        let content = try AppContent.load(grade: 3)
        let storage = InMemoryStorage()
        let track = try #require(content.fluencyPack.enabledTracks.first)
        let model = try GameModel(trackId: track.trackId, pack: content.fluencyPack, storage: storage, studentId: "test", seed: 4)
        guard case .prompt(let fact, _) = model.viewState else { Issue.record("Expected prompt"); return }
        model.timeoutMiss()
        #expect(model.viewState == .correction(fact))
        #expect(storage.events(studentId: "test", limit: 100).first?.value == nil)
        model.timeoutMiss()
        #expect(storage.events(studentId: "test", limit: 100).count == 1)
        model.next()
        #expect(model.viewState == .prompt(fact: fact, isRetest: true))
    }
    @Test func practiceFeedbackRejectsDuplicateSubmission() throws {
        let content = try AppContent.load(grade: 3)
        let set = try #require(content.practicePack.sets.first { $0.problems.allSatisfy { $0.type == .mc } })
        let storage = InMemoryStorage()
        let model = PracticeModel(set: set, storage: storage, studentId: "test", seed: 42)
        guard case .present(let problem) = model.viewState else { Issue.record("Expected prompt"); return }
        let choice = try #require(problem.choices?.first { $0.correct })
        let sequence = model.problemSeq
        model.answer(.choice(choice.id))
        let xp = model.sessionXP
        model.answer(.choice(choice.id))
        #expect(model.sessionXP == xp)
        #expect(model.problemSeq == sequence)
        model.next()
        #expect(model.problemSeq == sequence + 1)
    }
    @Test func allMapTitlesTranslateAndPluralRulesWork() throws {
        let old = UserDefaults.standard.string(forKey: "appLanguage")
        defer { UserDefaults.standard.set(old, forKey: "appLanguage") }
        UserDefaults.standard.set("en", forKey: "appLanguage")
        #expect(L10n.questions(1) == "1 question")
        #expect(L10n.questions(8) == "8 questions")
        for grade in 3...9 {
            let content = try AppContent.load(grade: grade)
            for title in content.map.topics.map(\.title) + content.map.units.map(\.title) {
                #expect(title.range(of: "[\\u3400-\\u9FFF]", options: .regularExpression) == nil, "Missing English title: \(title)")
            }
        }
        UserDefaults.standard.set("zh-Hans", forKey: "appLanguage")
        #expect(L10n.questions(1) == "1 道题")
    }
}
