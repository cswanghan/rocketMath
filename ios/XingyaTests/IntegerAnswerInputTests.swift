import Testing
@testable import Xingya

@Suite("Signed oral-math answer entry")
@MainActor
struct IntegerAnswerInputTests {
    @Test func signCanBeEnteredBeforeOrAfterDigits() {
        #expect(IntegerAnswerInput.togglingSign(in: "", allowed: true) == "-")
        #expect(IntegerAnswerInput.togglingSign(in: "-", allowed: true) == "")
        #expect(IntegerAnswerInput.togglingSign(in: "12", allowed: true) == "-12")
        #expect(IntegerAnswerInput.togglingSign(in: "-12", allowed: true) == "12")
        #expect(IntegerAnswerInput.togglingSign(in: "12", allowed: false) == "12")
    }

    @Test func signDoesNotConsumeAnyOfTheFiveDigitPlaces() {
        for prefix in ["", "-"] {
            var input = prefix
            for digit in [1, 2, 3, 4, 5, 6] { input = IntegerAnswerInput.appending(digit, to: input) }
            #expect(input == prefix + "12345")
            #expect(IntegerAnswerInput.value(of: input) == (prefix.isEmpty ? 12345 : -12345))
            _ = input.popLast()
            input = IntegerAnswerInput.appending(9, to: input)
            #expect(input == prefix + "12349")
        }
        #expect(IntegerAnswerInput.appending(-1, to: "") == "")
        #expect(IntegerAnswerInput.appending(10, to: "") == "")
    }

    @Test func incompleteOrMalformedAnswersCannotBeSubmitted() {
        for input in ["", "-", "--1", "+1", "1.5", "1-2", "12x", "999999", "-999999"] {
            #expect(IntegerAnswerInput.value(of: input) == nil)
        }
        #expect(IntegerAnswerInput.value(of: "0") == 0)
        #expect(IntegerAnswerInput.value(of: "-0") == 0)
        #expect(IntegerAnswerInput.value(of: "-4096") == -4096)
    }

    @Test func signKeyUsesWholeTrackRatherThanCurrentQuestion() throws {
        let positive = Fact(id: "positive", prompt: "2 + 3", answer: 5, learningType: .pattern)
        let negative = Fact(id: "negative", prompt: "2 - 3", answer: -1, learningType: .pattern)
        let mixed = Track(trackId: "mixed", name: "Mixed", enabled: true, levels: [
            Level(level: "A", newFacts: [positive]), Level(level: "B", newFacts: [negative])
        ])
        #expect(IntegerAnswerInput.supportsNegativeAnswers(in: mixed))
        let grade3 = try AppContent.load(grade: 3).fluencyPack
        #expect(grade3.tracks.allSatisfy { !IntegerAnswerInput.supportsNegativeAnswers(in: $0) })
        let grade7 = try AppContent.load(grade: 7).fluencyPack
        #expect(grade7.tracks.allSatisfy { IntegerAnswerInput.supportsNegativeAnswers(in: $0) })
    }

    @Test func negativeEntryReachesExistingGameModelAndPersistsSignedValue() throws {
        let content = try AppContent.load(grade: 7)
        let storage = InMemoryStorage()
        var tested = false
        for seed: UInt32 in 0..<50 {
            let model = try GameModel(trackId: "rational_add_sub", pack: content.fluencyPack,
                                      storage: storage, studentId: "signed-entry", seed: seed)
            guard case .prompt(let fact, _) = model.viewState, fact.answer < 0 else { continue }
            var input = IntegerAnswerInput.togglingSign(in: "", allowed: true)
            for digit in String(abs(fact.answer)) { input = IntegerAnswerInput.appending(Int(String(digit))!, to: input) }
            let answer = try #require(IntegerAnswerInput.value(of: input))
            model.submit(answer)
            #expect(model.viewState == .correct(fact))
            #expect(storage.events(studentId: "signed-entry", limit: 10).first?.value == fact.answer)
            tested = true
            break
        }
        #expect(tested)
    }
}
