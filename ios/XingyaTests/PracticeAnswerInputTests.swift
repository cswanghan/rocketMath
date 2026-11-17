import Foundation
import Testing
@testable import Xingya

@Suite("Practice numeric input preserves content and required text", .serialized)
@MainActor
struct PracticeAnswerInputTests {
    private func replaceAll(_ value: String, mode: PracticeAnswerInput.Mode = .numeric) -> String? {
        PracticeAnswerInput.replacing("", range: NSRange(location: 0, length: 0), with: value, mode: mode)
    }

    @Test func everyNumericShapeUsesTheSameModeWithoutRevealingAnswerProperties() {
        let numericAnswers: [AnswerValue] = [
            .number(0), .number(5), .number(-5), .number(1.2), .number(-0.25),
            .number(20260500), .number(6000003000),
            .text("5"), .text("-1"), .text("1.7"), .text("4.080"), .text("300.0")
        ]
        for answer in numericAnswers {
            #expect(PracticeAnswerInput.mode(for: answer) == .numeric)
        }
    }

    @Test func nonNumericAnswersRetainTheirRequiredCharactersAndTextKeyboard() {
        let answers = [
            "1/2", "12/5", "1 分 30 秒", "2 平方分米 50 平方厘米",
            "3……7", "2行2列", "6段余23厘米", "5√2", "√2", "<", ">", "=",
            "7,3", "0.72,2.07,2.070,2.7", "12 cm", "answer"
        ]
        for answer in answers {
            #expect(PracticeAnswerInput.mode(for: .text(answer)) == .text)
            #expect(replaceAll(answer, mode: .text) == answer)
            #expect(PracticeAnswerInput.isComplete(answer, mode: .text))
        }
        #expect(PracticeAnswerInput.mode(for: nil) == .text)
    }

    @Test func eightAndTenDigitNumbersAreNotLimitedByTheOralMathKeypad() {
        for expected in ["20260500", "20360500", "6000003000", "-6000003000"] {
            var input = ""
            for character in expected {
                let next = PracticeAnswerInput.replacing(
                    input, range: NSRange(location: input.utf16.count, length: 0),
                    with: String(character), mode: .numeric)
                #expect(next != nil)
                input = next ?? input
            }
            #expect(input == expected)
            #expect(PracticeAnswerInput.isComplete(input, mode: .numeric))
            #expect(AnswerValue.number(Double(expected)!).matches(input))
        }
    }

    @Test func fullWidthPasteNormalizesDigitsPointAndMinusWithoutChangingTheValue() {
        #expect(replaceAll("２０２６０５００") == "20260500")
        #expect(replaceAll("－１２．５０") == "-12.50")
        #expect(PracticeAnswerInput.replacing("12", range: NSRange(location: 2, length: 0),
                                            with: "３４", mode: .numeric) == "1234")
        #expect(PracticeAnswerInput.replacing("-12.5", range: NSRange(location: 4, length: 1),
                                            with: "７", mode: .numeric) == "-12.7")
        // Unrestricted textual answers must not be silently normalized.
        #expect(replaceAll("１２厘米", mode: .text) == "１２厘米")
    }

    @Test func mixedOrMalformedPasteIsRejectedAsAWholeRatherThanStrippedToDigits() {
        for invalid in ["abc123", "123abc", "1e3", "1/2", "12 34", "--1", "1-2", "1..2", "1,2", "１２a３", "NaN", "inf", "∞"] {
            #expect(replaceAll(invalid) == nil, "Must reject the entire replacement: \(invalid)")
            #expect(PracticeAnswerInput.replacing("12", range: NSRange(location: 0, length: 2),
                                                with: invalid, mode: .numeric) == nil)
        }
        // A point inserted into an already fractional answer must not become a
        // second separator or silently erase the child's earlier input.
        #expect(PracticeAnswerInput.replacing("1.25", range: NSRange(location: 4, length: 0),
                                            with: ".", mode: .numeric) == nil)
    }

    @Test func numericSelectionReplacementDeletionAndInsertionRespectTheRange() {
        #expect(PracticeAnswerInput.replacing("1234", range: NSRange(location: 1, length: 2),
                                            with: "00", mode: .numeric) == "1004")
        #expect(PracticeAnswerInput.replacing("-123", range: NSRange(location: 0, length: 1),
                                            with: "", mode: .numeric) == "123")
        #expect(PracticeAnswerInput.replacing("1.25", range: NSRange(location: 2, length: 1),
                                            with: "0", mode: .numeric) == "1.05")
        #expect(PracticeAnswerInput.replacing("123", range: NSRange(location: 1, length: 0),
                                            with: ".", mode: .numeric) == "1.23")
        #expect(PracticeAnswerInput.replacing("-1", range: NSRange(location: 1, length: 1),
                                            with: "", mode: .numeric) == "-")
        #expect(PracticeAnswerInput.replacing("12", range: NSRange(location: 0, length: 2),
                                            with: "", mode: .numeric) == "")
        #expect(PracticeAnswerInput.replacing("12", range: NSRange(location: 3, length: 1),
                                            with: "5", mode: .numeric) == nil)
    }

    @Test func textRangesUseUTF16AndRejectAnInvalidPartialSurrogateRange() {
        #expect(PracticeAnswerInput.replacing("甲😀乙", range: NSRange(location: 1, length: 2),
                                            with: "数", mode: .text) == "甲数乙")
        #expect(PracticeAnswerInput.replacing("甲😀乙", range: NSRange(location: 3, length: 1),
                                            with: "题", mode: .text) == "甲😀题")
        #expect(PracticeAnswerInput.replacing("甲😀乙", range: NSRange(location: 2, length: 1),
                                            with: "数", mode: .text) == nil)
    }

    @Test func numericTextKeepsTrailingZerosForTheExistingExactAnswerMatcher() {
        for expected in ["4.080", "0.700", "2.40", "5.100", "2.0", "300.0"] {
            let answer = AnswerValue.text(expected)
            #expect(PracticeAnswerInput.mode(for: answer) == .numeric)
            let entered = replaceAll(expected)
            #expect(entered == expected)
            #expect(answer.matches(entered ?? ""))
        }
        #expect(!AnswerValue.text("4.080").matches("4.08"))
    }

    @Test func incompletePrefixesAreEditableButCannotBeSubmitted() {
        for prefix in ["", "-", ".", "-."] {
            #expect(replaceAll(prefix) == prefix)
            #expect(!PracticeAnswerInput.isComplete(prefix, mode: .numeric))
        }
        for value in ["0", "-0", "20260500", "-12", "1.25", ".5", "-.5", "4.080"] {
            #expect(PracticeAnswerInput.isComplete(value, mode: .numeric))
        }
        #expect(!PracticeAnswerInput.isComplete(String(repeating: "9", count: 400), mode: .numeric))
        #expect(!PracticeAnswerInput.isComplete("NaN", mode: .numeric))
        #expect(!PracticeAnswerInput.isComplete("inf", mode: .numeric))
        #expect(!PracticeAnswerInput.isComplete("", mode: .text))
        #expect(!PracticeAnswerInput.isComplete("   ", mode: .text))
    }

    @Test func signTogglePreservesTheExactMagnitudeAndSupportsIncompleteInput() {
        for input in ["", ".", ".5", "0", "4.080", "6000003000"] {
            let negative = PracticeAnswerInput.togglingSign(in: input)
            #expect(negative == "-" + input)
            #expect(PracticeAnswerInput.togglingSign(in: negative) == input)
        }
    }
}
