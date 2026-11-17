// 家长区 4 位 PIN 门。首次进入设置密码，之后每次验证。对应 Web 端 ParentGate.tsx。

import SwiftUI

struct ParentGateView: View {
    let onCancel: () -> Void
    let onUnlocked: () -> Void

    private let mode: Mode = ParentPin.hasPin ? .enter : .set
    @State private var pin = ""
    @State private var confirm = ""
    @State private var error = ""

    private enum Mode { case set, enter }

    var body: some View {
        ScrollView { VStack(spacing: 24) {
            HStack {
                Button("返回", action: onCancel)
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                Spacer()
            }
            .padding(.horizontal)

            Spacer()

            Image(systemName: "lock.fill")
                .font(.system(size: 40))
                .foregroundStyle(Theme.brand)
                .accessibilityHidden(true)

            Text(L10n.text(mode == .set ? "设置家长密码" : "家长验证"))
                .font(.title2.bold())

            Text(L10n.text(mode == .set ? "第一次进入，请设置一个 4 位数字密码" : "请输入 4 位家长密码"))
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            pinField(title: "输入4位数字", text: $pin)
            if mode == .set {
                pinField(title: "再输一次", text: $confirm)
            }

            if !error.isEmpty {
                Text(L10n.text(error))
                    .font(.footnote)
                    .foregroundStyle(Theme.danger)
                    .accessibilityIdentifier("parent-gate-error")
            }

            Button(L10n.text(mode == .set ? "设置并进入" : "进入")) {
                submit()
            }
            .buttonStyle(BrandPrimaryStyle())
            .disabled(pin.count < 4)
            .accessibilityIdentifier("parent-gate-submit")

            Spacer()
        }
        .padding().frame(maxWidth: 520).frame(maxWidth: .infinity)
        }
        .background(Theme.pageBackground.ignoresSafeArea())
    }

    private func pinField(title: String, text: Binding<String>) -> some View {
        SecureField(L10n.text(title), text: text)
            .keyboardType(.numberPad)
            .textContentType(.oneTimeCode)
            .multilineTextAlignment(.center)
            .font(.title3.monospacedDigit())
            .padding()
            .background(Theme.card, in: .rect(cornerRadius: Theme.rSm))
            .overlay(RoundedRectangle(cornerRadius: Theme.rSm).strokeBorder(Theme.line))
            .frame(maxWidth: 220)
            .onChange(of: text.wrappedValue) { _, new in
                let digits = new.filter(\.isNumber)
                text.wrappedValue = String(digits.prefix(4))
                error = ""
            }
            .accessibilityIdentifier(title)
    }

    private func submit() {
        switch mode {
        case .set:
            guard pin.count == 4 else { error = "请输入 4 位数字"; return }
            guard pin == confirm else { error = "两次输入不一致"; return }
            ParentPin.set(pin)
            onUnlocked()
        case .enter:
            if ParentPin.check(pin) {
                onUnlocked()
            } else {
                error = "密码错误"
                pin = ""
            }
        }
    }
}
