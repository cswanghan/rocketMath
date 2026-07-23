// 数字键盘（糖果乐园）。白卡按键 + 深紫数字，确定键糖果粉。够大、按下有触感反馈。

import SwiftUI

struct NumpadView: View {
    var onDigit: (Int) -> Void
    var onDelete: () -> Void
    var onSubmit: () -> Void
    var submitDisabled: Bool = false

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 11), count: 3)

    var body: some View {
        LazyVGrid(columns: columns, spacing: 11) {
            ForEach(1...9, id: \.self) { digit in
                key(String(digit)) { onDigit(digit) }
            }
            key("⌫", role: .secondary, accessibilityLabel: "删除") { onDelete() }
            key("0") { onDigit(0) }
            key("确定", role: .primary, accessibilityLabel: "确定") { onSubmit() }
                .disabled(submitDisabled)
        }
    }

    private enum KeyRole { case digit, secondary, primary }

    @ViewBuilder
    private func key(
        _ label: String,
        role: KeyRole = .digit,
        accessibilityLabel: String? = nil,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: role == .primary ? 22 : 30, weight: .heavy, design: .rounded))
                .foregroundStyle(foreground(role))
                .frame(maxWidth: .infinity)
                .frame(height: 66)
                .background(background(role))
                .clipShape(.rect(cornerRadius: 18))
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .strokeBorder(role == .digit ? .white : .clear, lineWidth: 2)
                )
                .shadow(color: shadow(role), radius: 7, y: 4)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityLabel ?? label)
        .sensoryFeedback(.impact(weight: .light), trigger: label.isEmpty)
    }

    private func foreground(_ role: KeyRole) -> Color {
        switch role {
        case .digit: Theme.ink
        case .secondary: Theme.sub
        case .primary: .white
        }
    }

    @ViewBuilder
    private func background(_ role: KeyRole) -> some View {
        switch role {
        case .digit: Theme.card
        case .secondary: Theme.track
        case .primary:
            if submitDisabled { Theme.track } else { Theme.brandGradient }
        }
    }

    private func shadow(_ role: KeyRole) -> Color {
        switch role {
        case .primary: submitDisabled ? .clear : Theme.brand.opacity(0.4)
        case .digit: Theme.shadowColor.opacity(0.12)
        case .secondary: .clear
        }
    }
}

#Preview {
    NumpadView(onDigit: { _ in }, onDelete: {}, onSubmit: {})
        .padding()
        .background(Theme.pageBackground)
}
