import Foundation
import SwiftUI
import UIKit
import Testing
@testable import Xingya

@Suite("Practice answer UIKit field and fixed keyboard bridge", .serialized)
@MainActor
struct PracticeAnswerFieldTests {
    private final class State {
        var text: String
        var focused: String?
        var advances = 0

        init(text: String, focused: String? = "answer") {
            self.text = text
            self.focused = focused
        }
    }

    private struct Fixture {
        let state: State
        let field: UITextField
        let coordinator: PracticeAnswerField.Coordinator
    }

    private func wrapper(_ state: State, mode: PracticeAnswerInput.Mode = .numeric,
                         fieldID: String = "answer", hasNext: Bool = false) -> PracticeAnswerField {
        PracticeAnswerField(
            text: Binding(get: { state.text }, set: { state.text = $0 }),
            focusedField: Binding(get: { state.focused }, set: { state.focused = $0 }),
            fieldID: fieldID, mode: mode, label: "Answer", identifier: "practice-answer", hasNext: hasNext,
            onAdvance: {
                state.advances += 1
                state.focused = hasNext ? "next-answer" : nil
            })
    }

    private func makeField(text: String = "", mode: PracticeAnswerInput.Mode = .numeric,
                           hasNext: Bool = false) -> Fixture {
        let state = State(text: text)
        let coordinator = PracticeAnswerField.Coordinator(wrapper(state, mode: mode, hasNext: hasNext))
        let field = UITextField()
        field.text = text
        field.delegate = coordinator
        coordinator.configureKeyboard(field)
        return Fixture(state: state, field: field, coordinator: coordinator)
    }

    private func select(_ range: NSRange, in field: UITextField) throws {
        let start = try #require(field.position(from: field.beginningOfDocument, offset: range.location))
        let end = try #require(field.position(from: start, offset: range.length))
        field.selectedTextRange = try #require(field.textRange(from: start, to: end))
    }

    private func selectedRange(_ field: UITextField) -> NSRange? {
        guard let selection = field.selectedTextRange else { return nil }
        return NSRange(location: field.offset(from: field.beginningOfDocument, to: selection.start),
                       length: field.offset(from: selection.start, to: selection.end))
    }

    private func buttonIdentifiers(in view: UIView) -> Set<String> {
        var identifiers = Set<String>()
        if view is UIButton, let id = view.accessibilityIdentifier { identifiers.insert(id) }
        for child in view.subviews { identifiers.formUnion(buttonIdentifiers(in: child)) }
        return identifiers
    }

    @Test func realFieldReceivesEightAndTenDigitAnswersWithoutTruncation() throws {
        for answer in ["20260500", "20360500", "6000003000", "-6000003000"] {
            let f = makeField()
            try select(NSRange(location: 0, length: 0), in: f.field)
            for digit in answer {
                f.coordinator.replaceSelection(with: String(digit), in: f.field)
            }
            #expect(f.field.text == answer)
            #expect(f.state.text == answer)
            #expect(selectedRange(f.field) == NSRange(location: answer.utf16.count, length: 0))
        }
    }

    @Test func decimalTrailingZerosSurviveEditingAndASecondPointIsRejected() throws {
        let f = makeField(text: "4.08")
        try select(NSRange(location: 4, length: 0), in: f.field)
        f.coordinator.replaceSelection(with: "0", in: f.field)
        #expect(f.field.text == "4.080")
        #expect(f.state.text == "4.080")
        #expect(AnswerValue.text("4.080").matches(f.state.text))

        let beforeSelection = selectedRange(f.field)
        f.coordinator.replaceSelection(with: ".", in: f.field)
        #expect(f.field.text == "4.080")
        #expect(f.state.text == "4.080")
        #expect(selectedRange(f.field) == beforeSelection)
        f.coordinator.deleteSelection(in: f.field)
        #expect(f.field.text == "4.08")
        #expect(f.state.text == "4.08")
        f.coordinator.replaceSelection(with: "0", in: f.field)
        #expect(f.state.text == "4.080")
    }

    @Test func selectionDeletionAndBackspaceUpdateFieldBindingAndCaretTogether() throws {
        let f = makeField(text: "20260500")
        try select(NSRange(location: 2, length: 2), in: f.field)
        f.coordinator.deleteSelection(in: f.field)
        #expect(f.field.text == "200500")
        #expect(f.state.text == "200500")
        #expect(selectedRange(f.field) == NSRange(location: 2, length: 0))

        f.coordinator.deleteSelection(in: f.field)
        #expect(f.field.text == "20500")
        #expect(f.state.text == "20500")
        #expect(selectedRange(f.field) == NSRange(location: 1, length: 0))

        try select(NSRange(location: 0, length: 5), in: f.field)
        f.coordinator.deleteSelection(in: f.field)
        f.coordinator.deleteSelection(in: f.field) // Empty backspace is a no-op.
        #expect(f.field.text == "")
        #expect(f.state.text == "")
        #expect(selectedRange(f.field) == NSRange(location: 0, length: 0))
    }

    @Test func hardwareOrPasteCannotSilentlyConvertMixedTextToANumericAnswer() throws {
        let f = makeField(text: "45.00")
        let range = NSRange(location: 0, length: 5)
        try select(range, in: f.field)
        for replacement in ["ABC123", "1e3", "1..2", "12/5", "１２a３"] {
            let shouldApply = f.coordinator.textField(f.field, shouldChangeCharactersIn: range,
                                                      replacementString: replacement)
            #expect(!shouldApply)
            #expect(f.field.text == "45.00")
            #expect(f.state.text == "45.00")
            #expect(selectedRange(f.field) == range)
        }
    }

    @Test func fullWidthPasteIsAppliedOnceWithNormalizedTextAndCorrectSelection() throws {
        let f = makeField(text: "12.00")
        try select(NSRange(location: 0, length: 5), in: f.field)
        let allowed = f.coordinator.textField(f.field, shouldChangeCharactersIn: NSRange(location: 0, length: 5),
                                              replacementString: "－２０２６０５００．００")
        #expect(!allowed, "The coordinator applied normalized text; UIKit must not insert it a second time")
        #expect(f.field.text == "-20260500.00")
        #expect(f.state.text == "-20260500.00")
        #expect(selectedRange(f.field) == NSRange(location: 12, length: 0))

        try select(NSRange(location: 1, length: 8), in: f.field)
        #expect(!f.coordinator.textField(f.field, shouldChangeCharactersIn: NSRange(location: 1, length: 8),
                                         replacementString: "６０００００３０００"))
        #expect(f.field.text == "-6000003000.00")
        #expect(f.state.text == "-6000003000.00")
        #expect(selectedRange(f.field) == NSRange(location: 11, length: 0))
    }

    @Test func numericKeyboardHasFixedKeysAndTextModeRestoresTheSystemKeyboard() throws {
        let f = makeField()
        let keyboard = try #require(f.field.inputView)
        #expect(keyboard.accessibilityIdentifier == "practice-number-keyboard")
        var expected = Set((0...9).map { "practice-key-\($0)" })
        expected.formUnion(["practice-key-sign", "practice-key-decimal", "practice-key-delete"])
        #expect(buttonIdentifiers(in: keyboard) == expected)
        #expect(f.field.keyboardType == .decimalPad)
        if #available(iOS 26.0, *) { #expect(!f.field.allowsNumberPadPopover) }
        #expect(f.field.inputAssistantItem.leadingBarButtonGroups.isEmpty)
        #expect(f.field.inputAssistantItem.trailingBarButtonGroups.isEmpty)

        f.coordinator.parent = wrapper(f.state, mode: .text)
        f.coordinator.configureKeyboard(f.field)
        #expect(f.field.inputView == nil)
        #expect(f.field.keyboardType == .default)
        if #available(iOS 26.0, *) { #expect(f.field.allowsNumberPadPopover) }
        #expect(f.field.inputAccessoryView is UIToolbar)
        #expect(f.coordinator.textField(f.field, shouldChangeCharactersIn: NSRange(location: 0, length: 0),
                                        replacementString: "1 分 30 秒"))
    }

    @Test func configuredToolbarAndReturnAdvanceFocusWithoutOldFieldClearingIt() throws {
        let f = makeField(hasNext: true)
        #expect(f.field.returnKeyType == .next)
        let toolbar = try #require(f.field.inputAccessoryView as? UIToolbar)
        let next = try #require(toolbar.items?.first { $0.accessibilityIdentifier == "practice-keyboard-next" })
        let action = try #require(next.action)
        #expect(UIApplication.shared.sendAction(action, to: next.target, from: next, for: nil))
        #expect(f.state.advances == 1)
        #expect(f.state.focused == "next-answer")
        f.coordinator.textFieldDidEndEditing(f.field)
        #expect(f.state.focused == "next-answer", "Ending the previous field must not erase the new field's focus")

        f.coordinator.parent = wrapper(f.state, fieldID: "next-answer", hasNext: false)
        f.coordinator.configureKeyboard(f.field)
        #expect(f.field.returnKeyType == .done)
        #expect(!f.coordinator.textFieldShouldReturn(f.field))
        #expect(f.state.advances == 2)
        #expect(f.state.focused == nil)
    }

    @Test func editingFocusAndDismantlingAreScopedToTheCurrentField() {
        let f = makeField()
        f.state.focused = nil
        f.coordinator.textFieldDidBeginEditing(f.field)
        #expect(f.state.focused == "answer")
        f.coordinator.textFieldDidEndEditing(f.field)
        #expect(f.state.focused == nil)
        PracticeAnswerField.dismantleUIView(f.field, coordinator: f.coordinator)
        #expect(!f.coordinator.attached)
        #expect(f.field.delegate == nil)
    }
}
