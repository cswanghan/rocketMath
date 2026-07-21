// 数字键盘。孩子用的按键：够大、按下有触感反馈、不弹系统键盘遮挡题干。

import SwiftUI

struct NumpadView: View {
    var onDigit: (Int) -> Void
    var onDelete: () -> Void
    var onSubmit: () -> Void
    var submitDisabled: Bool = false

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 3)

    var body: some View {
        LazyVGrid(columns: columns, spacing: 10) {
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
                .font(role == .primary ? .title3.weight(.semibold) : .title.weight(.medium))
                .frame(maxWidth: .infinity)
                .frame(height: 56)
        }
        .buttonStyle(.bordered)
        .buttonBorderShape(.roundedRectangle(radius: 14))
        .tint(role == .primary ? .accentColor : (role == .secondary ? .secondary : .primary))
        .accessibilityLabel(accessibilityLabel ?? label)
        .sensoryFeedback(.impact(weight: .light), trigger: label.isEmpty)
    }
}

#Preview {
    NumpadView(onDigit: { _ in }, onDelete: {}, onSubmit: {})
        .padding()
}
