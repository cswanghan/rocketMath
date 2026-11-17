import Testing
@testable import Xingya

@Suite("Choice taps submit once and keep feedback visible")
@MainActor
struct ImmediateChoiceTests {
    private func problem(_ id: String, type: ProblemType = .mc) -> Problem {
        Problem(id: id, type: type, prompt: "2 + 3 = ?", difficulty: .basic,
                choices: type == .mc ? [Choice(id: "yes", label: "5", correct: true), Choice(id: "no", label: "6", correct: false)] : nil,
                answer: type == .fill ? .number(5) : nil, fields: nil,
                hint: "Add two and three.", explanation: "2 + 3 = 5.", source: nil)
    }
    private func makeModel(type: ProblemType = .mc) -> (PracticeModel, InMemoryStorage) {
        let storage = InMemoryStorage()
        storage.putStudent(StudentRecord(id: "tap", createdAt: 0, latencyGateMs: nil, xp: 0))
        let set = ProblemSet(id: "choice-tap", title: "Choice tap", pedagogy: "concept", maxTries: 2,
                             problems: [problem("one", type: type), problem("two", type: type)])
        return (PracticeModel(set: set, storage: storage, studentId: "tap", seed: 42), storage)
    }

    @Test func correctTapImmediatelyScoresOnceAndRepeatedCallbacksCannotAdvance() throws {
        let (model, storage) = makeModel()
        guard case .present(let p) = model.viewState else { Issue.record("Missing prompt"); return }
        model.answerChoice("yes", for: p.id)
        #expect(model.viewState == .correct(p, firstTry: true))
        let xp = model.sessionXP, sequence = model.problemSeq
        #expect(xp > 0)
        model.answerChoice("yes", for: p.id)
        model.answer(.choice("no"))
        model.retryChoice()
        #expect(model.sessionXP == xp)
        #expect(storage.student(id: "tap")?.xp == xp)
        #expect(model.state.firstTryCorrect == 1)
        #expect(model.problemSeq == sequence)
        #expect(model.viewState == .correct(p, firstTry: true))
        model.next()
        let nextSequence = model.problemSeq
        model.next() // A late second Continue callback cannot skip the new question.
        model.answerChoice("yes", for: p.id) // Stale old-question callback.
        #expect(model.problemSeq == nextSequence)
        #expect(model.state.tries == 0)
        #expect(model.sessionXP == xp)
    }

    @Test func wrongTapLocksEveryChoiceUntilExplicitRetryWithoutDoubleCounting() throws {
        let (model, storage) = makeModel()
        guard case .present(let p) = model.viewState else { Issue.record("Missing prompt"); return }
        model.answerChoice("no", for: p.id)
        #expect(model.viewState == .wrong(p, tries: 1))
        #expect(model.choiceFeedbackPending)
        #expect(p.explanation == "2 + 3 = 5.")
        for _ in 0..<3 {
            model.answerChoice("no", for: p.id)
            model.answerChoice("yes", for: p.id)
            model.answer(.choice("yes"))
        }
        #expect(model.state.tries == 1)
        #expect(model.sessionXP == 0)
        #expect(storage.listMistakes(studentId: "tap").count == 1)
        model.retryChoice()
        #expect(model.viewState == .present(p))
        #expect(!model.choiceFeedbackPending)
        #expect(model.state.tries == 1)
        model.answerChoice("yes", for: p.id)
        #expect(model.viewState == .correct(p, firstTry: false))
        #expect(model.state.firstTryCorrect == 0)
        #expect(storage.listMistakes(studentId: "tap").count == 1)
    }

    @Test func secondWrongChoiceRevealsAndCannotBeRetriedOrScoredAgain() {
        let (model, storage) = makeModel()
        guard case .present(let p) = model.viewState else { Issue.record("Missing prompt"); return }
        model.answerChoice("no", for: p.id)
        model.retryChoice()
        model.answerChoice("no", for: p.id)
        #expect(model.viewState == .reveal(p))
        #expect(model.state.tries == 2)
        model.retryChoice(); model.answer(.choice("yes")); model.answerChoice("yes", for: p.id)
        #expect(model.viewState == .reveal(p))
        #expect(model.sessionXP == 0)
        #expect(storage.listMistakes(studentId: "tap").count == 1)
    }

    @Test func invalidOrWrongQuestionChoicesAreIgnored() {
        let (model, _) = makeModel()
        guard case .present(let p) = model.viewState else { Issue.record("Missing prompt"); return }
        model.answerChoice("yes", for: "not-current")
        model.answerChoice("unknown", for: p.id)
        model.answer(.value("5"))
        #expect(model.viewState == .present(p))
        #expect(!model.choiceFeedbackPending)
        #expect(model.state.tries == 0)
    }

    @Test func fillResponsesRetainExplicitConfirmationAndExistingRetrySemantics() {
        let (model, _) = makeModel(type: .fill)
        guard case .present(let p) = model.viewState else { Issue.record("Missing prompt"); return }
        model.answerChoice("yes", for: p.id)
        #expect(model.viewState == .present(p))
        model.answer(.value("6"))
        #expect(model.viewState == .wrong(p, tries: 1))
        #expect(!model.choiceFeedbackPending)
        model.answer(.value("5"))
        #expect(model.viewState == .correct(p, firstTry: false))
    }
}
