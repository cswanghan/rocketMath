import SwiftUI

struct NumpadView: View {
    var onDigit: (Int) -> Void
    var onDelete: () -> Void
    var onSubmit: () -> Void
    var submitDisabled = false
    var showSubmit = true
    @State private var taps = 0
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 9), count: 3)
    var body: some View {
        VStack(spacing: 14) {
            LazyVGrid(columns: columns, spacing: 9) {
                ForEach(1...9, id: \.self) { digit in key(String(digit)) { onDigit(digit) } }
                Color.clear.frame(height: 44).accessibilityHidden(true)
                key("0") { onDigit(0) }
                Button { taps += 1; onDelete() } label: {
                    Image(systemName: "delete.left").font(.title2).frame(maxWidth: .infinity, minHeight: 50)
                        .background(Theme.sky2, in: .rect(cornerRadius: 16))
                }.buttonStyle(BrandPressStyle()).accessibilityLabel(L10n.text("删除")).accessibilityIdentifier("key-delete")
            }.environment(\.layoutDirection, .leftToRight)
            if showSubmit {
                BrandPrimaryButton("检查答案", action: onSubmit).disabled(submitDisabled).accessibilityIdentifier("answer-submit")
            }
        }.sensoryFeedback(.selection, trigger: taps)
    }
    private func key(_ title: String, action: @escaping () -> Void) -> some View {
        Button { taps += 1; action() } label: {
            Text(title).font(.title2.bold()).monospacedDigit().foregroundStyle(Theme.ink)
                .frame(maxWidth: .infinity, minHeight: 50)
                .background {
                    RoundedRectangle(cornerRadius: 16).fill(Theme.card)
                        .shadow(color: Theme.line, radius: 0, y: 2)
                }
                .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.line))
        }.buttonStyle(BrandPressStyle()).accessibilityIdentifier(title)
    }
}
