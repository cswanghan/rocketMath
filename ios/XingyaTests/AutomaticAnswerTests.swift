import Foundation
import Testing
@testable import Xingya

@Suite("Automatic integer answers preserve reaction time and deadlines", .serialized)
@MainActor
struct AutomaticAnswerTests {
    private final class Clock {
        var date = Date(timeIntervalSinceReferenceDate: 1_000)
        func advance(_ seconds: TimeInterval) { date.addTimeInterval(seconds) }
    }

    private func makeModel(clock: Clock, gate: Int = 1000) throws -> (GameModel, InMemoryStorage) {
        let content = try AppContent.load(grade: 7)
        let storage = InMemoryStorage()
        storage.putStudent(StudentRecord(id: "auto", createdAt: 0, latencyGateMs: gate, xp: 0))
        let model = try GameModel(trackId: "rational_mul_div", pack: content.fluencyPack,
                                  storage: storage, studentId: "auto", seed: 42, now: { clock.date })
        return (model, storage)
    }

    private func fact(_ model: GameModel) throws -> Fact {
        guard case .prompt(let fact, _) = model.viewState else { throw MissingPrompt() }
        return fact
    }
    private struct MissingPrompt: Error {}

    @Test func editReplacesPrefixesAndOnlyLatestTokenCanSubmit() throws {
        let clock = Clock(), (model, storage) = try makeModel(clock: clock, gate: 5000)
        model.queueAutomaticAnswer("1")
        let prefix = try #require(model.pendingAnswer)
        clock.advance(0.5)
        model.queueAutomaticAnswer("12")
        let full = try #require(model.pendingAnswer)
        model.submitAutomaticAnswer(prefix)
        #expect(storage.events(studentId: "auto", limit: 20).isEmpty)
        #expect(model.pendingAnswer == full)
        clock.advance(1)
        model.submitAutomaticAnswer(full)
        let event = try #require(storage.events(studentId: "auto", limit: 20).first)
        #expect(event.value == 12)
        #expect(event.elapsedMs == 500)
        model.submitAutomaticAnswer(full)
        #expect(storage.events(studentId: "auto", limit: 20).count == 1)
    }

    @Test func deletionSignEditsAndEmptyBuffersInvalidatePendingTokens() throws {
        let clock = Clock(), (model, storage) = try makeModel(clock: clock, gate: 5000)
        model.queueAutomaticAnswer("12")
        let initial = try #require(model.pendingAnswer)
        clock.advance(0.25)
        model.queueAutomaticAnswer("1") // Delete restarts debounce even for a valid prefix.
        let deleted = try #require(model.pendingAnswer)
        clock.advance(0.25)
        model.queueAutomaticAnswer("-1")
        let signed = try #require(model.pendingAnswer)
        #expect(initial.id != deleted.id && deleted.id != signed.id)
        #expect(signed.editedAt == clock.date)
        for empty in ["-", "", "--1"] {
            model.queueAutomaticAnswer(empty)
            #expect(model.pendingAnswer == nil)
            model.submitAutomaticAnswer(signed)
        }
        #expect(storage.events(studentId: "auto", limit: 20).isEmpty)
    }

    @Test func lastEditTimeExcludesTheDebounceAndDeadlineFlushesOnce() throws {
        let clock = Clock(), (model, storage) = try makeModel(clock: clock)
        let question = try fact(model)
        clock.advance(0.75)
        model.queueAutomaticAnswer(String(question.answer))
        let pending = try #require(model.pendingAnswer)
        clock.advance(0.25)
        model.timeoutMiss() // Timer wins over the pending one-second callback.
        #expect(model.viewState == .correct(question))
        #expect(storage.events(studentId: "auto", limit: 20).first?.elapsedMs == 750)
        #expect(storage.events(studentId: "auto", limit: 20).first?.value == question.answer)
        clock.advance(1)
        model.submitAutomaticAnswer(pending)
        model.timeoutMiss()
        #expect(storage.events(studentId: "auto", limit: 20).count == 1)
        #expect(storage.listMistakes(studentId: "auto").isEmpty)
    }

    @Test func debounceCallbackWinningAfterGateStillUsesLastEditTime() throws {
        let clock = Clock(), (model, storage) = try makeModel(clock: clock)
        let question = try fact(model)
        clock.advance(0.75)
        model.queueAutomaticAnswer(String(question.answer))
        let pending = try #require(model.pendingAnswer)
        clock.advance(1)
        model.submitAutomaticAnswer(pending)
        model.timeoutMiss()
        #expect(model.viewState == .correct(question))
        #expect(storage.events(studentId: "auto", limit: 20).count == 1)
        #expect(storage.events(studentId: "auto", limit: 20).first?.elapsedMs == 750)
    }

    @Test func exactFluencyGateRemainsAcceptedAndLateEditCannotReplaceEarlierInput() throws {
        let clock = Clock(), (model, storage) = try makeModel(clock: clock)
        let question = try fact(model)
        clock.advance(1)
        model.queueAutomaticAnswer(String(question.answer))
        #expect(model.pendingAnswer != nil)
        clock.advance(0.25)
        model.queueAutomaticAnswer("99999")
        #expect(model.viewState == .correct(question))
        #expect(storage.events(studentId: "auto", limit: 20).first?.elapsedMs == 1000)
        #expect(storage.events(studentId: "auto", limit: 20).first?.value == question.answer)
    }

    @Test func wrongPendingAnswerProducesOnlyOneMistakeAndStaleRetestTokenIsIgnored() throws {
        let clock = Clock(), (model, storage) = try makeModel(clock: clock)
        let question = try fact(model)
        model.queueAutomaticAnswer(String(question.answer + 1))
        let pending = try #require(model.pendingAnswer)
        clock.advance(1)
        model.timeoutMiss()
        #expect(model.viewState == .correction(question))
        #expect(storage.events(studentId: "auto", limit: 20).count == 1)
        #expect(storage.listMistakes(studentId: "auto").count == 1)
        model.next() // Same fact ID, different prompt sequence.
        #expect(try fact(model).id == question.id)
        model.submitAutomaticAnswer(pending)
        #expect(storage.events(studentId: "auto", limit: 20).count == 1)
        #expect(model.pendingAnswer == nil)
    }

    @Test func cancelledBackgroundOrDepartureInputCannotSubmitAfterReturn() throws {
        let clock = Clock(), (model, storage) = try makeModel(clock: clock)
        model.queueAutomaticAnswer(String(try fact(model).answer))
        let pending = try #require(model.pendingAnswer)
        model.cancelPendingAnswer()
        clock.advance(0.5)
        model.submitAutomaticAnswer(pending)
        #expect(storage.events(studentId: "auto", limit: 20).isEmpty)
        #expect(model.pendingAnswer == nil)
    }

    @Test func noValidInputAtDeadlineRecordsOneTimeout() throws {
        let clock = Clock(), (model, storage) = try makeModel(clock: clock)
        model.queueAutomaticAnswer("-")
        clock.advance(1)
        model.timeoutMiss(); model.timeoutMiss()
        #expect(storage.events(studentId: "auto", limit: 20).count == 1)
        #expect(storage.events(studentId: "auto", limit: 20).first?.value == nil)
    }

    @Test func foregroundResumeClearsOldInputWithoutChangingProgressOrRaceDeadline() throws {
        let clock = Clock(), (model, storage) = try makeModel(clock: clock)
        let question = try fact(model), state = model.trackState, sequence = model.promptSeq
        model.queueAutomaticAnswer(String(question.answer))
        let old = try #require(model.pendingAnswer)
        model.cancelPendingAnswer()
        clock.advance(20)
        model.resumePromptTiming()
        model.submitAutomaticAnswer(old)
        #expect(model.trackState == state)
        #expect(model.promptSeq == sequence)
        #expect(model.promptRemainingMs == 1000)
        #expect(storage.events(studentId: "auto", limit: 20).isEmpty)
        model.startRace(durationMs: 1000)
        let endsAt = model.trackState?.race?.endsAt
        clock.advance(2)
        model.resumePromptTiming()
        #expect(model.trackState?.race?.endsAt == endsAt)
        #expect(model.finishRaceIfNeeded())
        #expect(model.viewState == .raceResult(correctPerMin: 0))
    }

    @Test(arguments: [true, false])
    func raceDeadlineAndDebounceOrderBothPreserveTheFinalAnswer(timerFirst: Bool) throws {
        let clock = Clock(), (model, storage) = try makeModel(clock: clock)
        model.startRace(durationMs: 1000)
        let question = try fact(model)
        clock.advance(0.75)
        model.queueAutomaticAnswer(String(question.answer))
        let pending = try #require(model.pendingAnswer)
        clock.advance(1)
        if timerFirst { #expect(model.finishRaceIfNeeded()) }
        model.submitAutomaticAnswer(pending)
        _ = model.finishRaceIfNeeded()
        #expect(model.viewState == .raceResult(correctPerMin: 60))
        #expect(model.trackState?.race == nil)
        #expect(storage.events(studentId: "auto", limit: 20).count == 1)
        #expect(storage.events(studentId: "auto", limit: 20).first?.elapsedMs == 750)
    }

    @Test func raceRejectsEditsAtDeadlineButConsumesAnEarlierPendingAnswer() throws {
        let clock = Clock(), (model, storage) = try makeModel(clock: clock)
        model.startRace(durationMs: 1000)
        let question = try fact(model)
        clock.advance(0.5)
        model.queueAutomaticAnswer(String(question.answer))
        clock.advance(0.5)
        model.queueAutomaticAnswer("99999")
        #expect(model.viewState == .raceResult(correctPerMin: 60))
        #expect(storage.events(studentId: "auto", limit: 20).first?.value == question.answer)

        model.startRace(durationMs: 1000)
        clock.advance(1)
        model.queueAutomaticAnswer(String(try fact(model).answer))
        #expect(model.viewState == .raceResult(correctPerMin: 0))
        #expect(storage.events(studentId: "auto", limit: 20).count == 1)
    }

    @Test func raceKeepsOriginalDeadlineAndStartsNextReactionClockAtRealTime() throws {
        let clock = Clock(), (model, storage) = try makeModel(clock: clock)
        model.startRace(durationMs: 60000)
        let endsAt = model.trackState?.race?.endsAt
        clock.advance(0.5)
        model.queueAutomaticAnswer(String(try fact(model).answer))
        let first = try #require(model.pendingAnswer)
        clock.advance(1)
        model.submitAutomaticAnswer(first)
        #expect(model.trackState?.race?.endsAt == endsAt)
        #expect(model.trackState?.race?.correct == 1)
        let sequence = model.promptSeq
        model.submitAutomaticAnswer(first)
        #expect(model.promptSeq == sequence)
        clock.advance(0.25)
        model.queueAutomaticAnswer(String(try fact(model).answer))
        let second = try #require(model.pendingAnswer)
        clock.advance(1)
        model.submitAutomaticAnswer(second)
        #expect(model.trackState?.race?.correct == 2)
        #expect(storage.events(studentId: "auto", limit: 20).contains { $0.elapsedMs == 250 })
    }
}
