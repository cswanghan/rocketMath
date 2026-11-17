import SwiftUI
import UIKit

/// A real text field with a fixed numeric inputView, including on iPad. The same
/// keys are offered for every numeric answer; sign/precision never reveal its value.
struct PracticeAnswerField: UIViewRepresentable {
    @Binding var text: String
    @Binding var focusedField: String?
    let fieldID: String
    let mode: PracticeAnswerInput.Mode
    let label: String
    let identifier: String
    var hasNext = false
    var onAdvance: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> UITextField {
        let field = UITextField()
        field.delegate = context.coordinator
        field.addTarget(context.coordinator, action: #selector(Coordinator.changed(_:)), for: .editingChanged)
        field.placeholder = L10n.text("答案")
        field.font = UIFontMetrics(forTextStyle: .title1).scaledFont(for: .systemFont(ofSize: 30, weight: .semibold))
        field.adjustsFontForContentSizeCategory = true
        field.adjustsFontSizeToFitWidth = true
        field.minimumFontSize = 16
        field.textAlignment = .center
        field.textColor = UIColor(Theme.ink)
        field.tintColor = UIColor(Theme.brand)
        field.autocorrectionType = .no
        field.spellCheckingType = .no
        field.autocapitalizationType = .none
        field.smartDashesType = .no
        field.smartQuotesType = .no
        field.setContentHuggingPriority(.defaultLow, for: .horizontal)
        field.accessibilityIdentifier = identifier
        field.accessibilityLabel = label
        context.coordinator.configureKeyboard(field)
        return field
    }

    func updateUIView(_ field: UITextField, context: Context) {
        let old = context.coordinator.parent
        context.coordinator.parent = self
        if old.mode != mode || old.hasNext != hasNext { context.coordinator.configureKeyboard(field) }
        if field.text != text { field.text = text }
        field.accessibilityIdentifier = identifier
        field.accessibilityLabel = label
        let coordinator = context.coordinator
        if focusedField == fieldID, !field.isFirstResponder {
            DispatchQueue.main.async { [weak field, weak coordinator] in
                guard let field, let coordinator, coordinator.attached, field.window != nil,
                      coordinator.parent.focusedField == coordinator.parent.fieldID else { return }
                field.becomeFirstResponder()
            }
        } else if focusedField != fieldID, field.isFirstResponder {
            field.resignFirstResponder()
        }
    }

    static func dismantleUIView(_ field: UITextField, coordinator: Coordinator) {
        coordinator.attached = false
        field.delegate = nil
        field.resignFirstResponder()
    }

    final class Coordinator: NSObject, UITextFieldDelegate {
        var parent: PracticeAnswerField
        var attached = true
        init(_ parent: PracticeAnswerField) { self.parent = parent }

        func configureKeyboard(_ field: UITextField) {
            field.keyboardType = parent.mode == .numeric ? .decimalPad : .default
            // iPadOS 26 can place its system number-pad popover above a custom
            // inputView. It blocks our keys/fields and consumes the first tap.
            // This field already supplies its full numeric keyboard; text fields
            // retain UIKit's normal behavior, and no app-wide setting is changed.
            if #available(iOS 26.0, *) { field.allowsNumberPadPopover = parent.mode != .numeric }
            field.returnKeyType = parent.hasNext ? .next : .done
            field.inputAssistantItem.leadingBarButtonGroups = []
            field.inputAssistantItem.trailingBarButtonGroups = []
            if parent.mode == .numeric {
                field.inputView = PracticeNumberKeyboard { [weak self, weak field] key in
                    guard let self, let field, self.attached, field.isFirstResponder,
                          self.parent.focusedField == self.parent.fieldID else { return }
                    switch key {
                    case "delete": self.deleteSelection(in: field)
                    case "sign":
                        let value = PracticeAnswerInput.togglingSign(in: field.text ?? "")
                        self.apply(value, caret: value.utf16.count, to: field)
                    default: self.replaceSelection(with: key, in: field)
                    }
                }
            } else { field.inputView = nil }
            let toolbar = UIToolbar(frame: CGRect(x: 0, y: 0, width: 320, height: 44))
            let advance = UIBarButtonItem(title: L10n.text(parent.hasNext ? "继续" : "完成"),
                                          style: .done, target: self, action: #selector(Coordinator.advance))
            advance.accessibilityIdentifier = parent.hasNext ? "practice-keyboard-next" : "practice-keyboard-done"
            toolbar.items = [UIBarButtonItem(systemItem: .flexibleSpace), advance]
            field.inputAccessoryView = toolbar
            if field.isFirstResponder { field.reloadInputViews() }
        }

        @objc func changed(_ field: UITextField) { parent.text = field.text ?? "" }
        @objc func advance() { parent.onAdvance() }
        func textFieldDidBeginEditing(_ field: UITextField) { parent.focusedField = parent.fieldID }
        func textFieldDidEndEditing(_ field: UITextField) {
            if parent.focusedField == parent.fieldID { parent.focusedField = nil }
        }
        func textFieldShouldReturn(_ field: UITextField) -> Bool { advance(); return false }

        func replaceSelection(with replacement: String, in field: UITextField) {
            let range = selectedRange(in: field)
            guard let value = PracticeAnswerInput.replacing(field.text ?? "", range: range, with: replacement, mode: parent.mode) else { return }
            apply(value, caret: range.location + replacement.utf16.count, to: field)
        }

        func deleteSelection(in field: UITextField) {
            var range = selectedRange(in: field)
            if range.length == 0 {
                guard range.location > 0 else { return }
                range.location -= 1; range.length = 1 // Fixed keyboard buffers contain normalized ASCII only.
            }
            guard let value = PracticeAnswerInput.replacing(field.text ?? "", range: range, with: "", mode: parent.mode) else { return }
            apply(value, caret: range.location, to: field)
        }

        private func selectedRange(in field: UITextField) -> NSRange {
            guard let selection = field.selectedTextRange else { return NSRange(location: (field.text ?? "").utf16.count, length: 0) }
            return NSRange(location: field.offset(from: field.beginningOfDocument, to: selection.start),
                           length: field.offset(from: selection.start, to: selection.end))
        }

        private func apply(_ value: String, caret: Int, to field: UITextField) {
            field.text = value
            changed(field)
            if let position = field.position(from: field.beginningOfDocument, offset: min(value.utf16.count, caret)) {
                field.selectedTextRange = field.textRange(from: position, to: position)
            }
        }

        func textField(_ field: UITextField, shouldChangeCharactersIn range: NSRange, replacementString replacement: String) -> Bool {
            guard let value = PracticeAnswerInput.replacing(field.text ?? "", range: range, with: replacement, mode: parent.mode) else { return false }
            let original = (field.text as NSString? ?? "").replacingCharacters(in: range, with: replacement)
            if value == original { return true }
            // Normalizing full-width digits must preserve the whole replacement,
            // selection and existing decimal trailing zeros, never parse/format it.
            apply(value, caret: range.location + replacement.utf16.count, to: field)
            return false
        }
    }
}

private final class PracticeNumberKeyboard: UIInputView {
    init(press: @escaping (String) -> Void) {
        super.init(frame: CGRect(x: 0, y: 0, width: 320, height: 264), inputViewStyle: .keyboard)
        autoresizingMask = [.flexibleWidth]
        accessibilityIdentifier = "practice-number-keyboard"
        let rows = UIStackView()
        rows.axis = .vertical; rows.spacing = 8; rows.distribution = .fillEqually
        rows.translatesAutoresizingMaskIntoConstraints = false
        addSubview(rows)
        NSLayoutConstraint.activate([
            rows.centerXAnchor.constraint(equalTo: centerXAnchor),
            rows.widthAnchor.constraint(lessThanOrEqualToConstant: 520),
            rows.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 12),
            rows.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -12),
            rows.widthAnchor.constraint(equalTo: widthAnchor, constant: -24).withPriority(.defaultHigh),
            rows.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            rows.bottomAnchor.constraint(equalTo: safeAreaLayoutGuide.bottomAnchor, constant: -8)
        ])
        for keys in [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["sign", "0", ".", "delete"]] {
            let row = UIStackView(); row.axis = .horizontal; row.spacing = 8; row.distribution = .fillEqually
            for key in keys {
                let button = UIButton(type: .system)
                var configuration = UIButton.Configuration.filled()
                configuration.baseBackgroundColor = .secondarySystemGroupedBackground
                configuration.baseForegroundColor = .label
                configuration.cornerStyle = .medium
                if key == "delete" { configuration.image = UIImage(systemName: "delete.left") }
                else { configuration.title = key == "sign" ? "±" : key }
                button.configuration = configuration
                button.titleLabel?.font = .preferredFont(forTextStyle: .title2)
                button.accessibilityIdentifier = "practice-key-\(key == "." ? "decimal" : key)"
                button.accessibilityLabel = key == "sign" ? L10n.text("切换正负号") : key == "delete" ? L10n.text("删除") : key
                button.addAction(UIAction { _ in press(key) }, for: .touchUpInside)
                row.addArrangedSubview(button)
            }
            rows.addArrangedSubview(row)
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}

private extension NSLayoutConstraint {
    func withPriority(_ priority: UILayoutPriority) -> NSLayoutConstraint { self.priority = priority; return self }
}
