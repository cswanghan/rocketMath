// Sunny v3 shared controls. Native input, accessible targets, tactile leaf buttons.
import SwiftUI

extension Theme {
    static func titleFont(_ size: CGFloat = 24, weight: Font.Weight = .semibold) -> Font {
        .system(size >= 30 ? .largeTitle : size >= 23 ? .title2 : size >= 19 ? .title3 : .headline,
                design: .rounded, weight: weight)
    }
    static func numberFont(_ size: CGFloat = 34) -> Font {
        .system(size: UIFontMetrics(forTextStyle: .title1).scaledValue(for: size), weight: .bold, design: .rounded).monospacedDigit()
    }
    static let bodyFont = Font.system(.body, design: .rounded, weight: .regular)
    static let captionFont = Font.system(.footnote, design: .rounded, weight: .regular)
    static let buttonFont = Font.system(.body, design: .rounded, weight: .semibold)
}

struct BrandPressStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
            .opacity(configuration.isPressed ? 0.88 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct BrandPrimaryStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.buttonFont)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 54)
            .padding(.horizontal, 16)
            .background {
                RoundedRectangle(cornerRadius: 18).fill(Theme.button)
                    .shadow(color: Theme.buttonBase, radius: 0, y: configuration.isPressed ? 1 : 4)
            }
            .padding(.bottom, 4)
            .opacity(isEnabled ? 1 : 0.45)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct BrandSecondaryStyle: ButtonStyle {
    var destructive = false
    @Environment(\.isEnabled) private var isEnabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.buttonFont)
            .foregroundStyle(destructive ? Theme.danger : Theme.ink)
            .frame(maxWidth: .infinity, minHeight: 48)
            .padding(.horizontal, 12)
            .background((destructive ? Theme.danger : Theme.sky2).opacity(destructive ? 0.07 : 1),
                        in: .rect(cornerRadius: Theme.rMd))
            .overlay(RoundedRectangle(cornerRadius: Theme.rMd)
                .strokeBorder(destructive ? Theme.danger.opacity(0.25) : Theme.line))
            .opacity(isEnabled ? (configuration.isPressed ? 0.75 : 1) : 0.45)
    }
}

struct BrandTextStyle: ButtonStyle {
    var destructive = false
    @Environment(\.isEnabled) private var isEnabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.captionFont.weight(.medium))
            .foregroundStyle(destructive ? Theme.danger : Theme.ink)
            .padding(.vertical, 10)
            .contentShape(Rectangle())
            .opacity(isEnabled ? (configuration.isPressed ? 0.65 : 1) : 0.45)
    }
}

struct BrandPrimaryButton: View {
    let title: String
    var isLoading = false
    var action: () -> Void
    init(_ title: String, isLoading: Bool = false, action: @escaping () -> Void) {
        self.title = title; self.isLoading = isLoading; self.action = action
    }
    var body: some View {
        Button(action: action) {
            ZStack {
                Text(L10n.text(title)).opacity(isLoading ? 0 : 1)
                if isLoading { ProgressView().tint(.white) }
            }
        }
        .buttonStyle(BrandPrimaryStyle())
        .accessibilityLabel(L10n.text(title))
    }
}

struct BrandSecondaryButton: View {
    let title: String
    var action: () -> Void
    init(_ title: String, action: @escaping () -> Void) { self.title = title; self.action = action }
    var body: some View { Button(L10n.text(title), action: action).buttonStyle(BrandSecondaryStyle()) }
}

struct BrandTextButton: View {
    let title: String
    var action: () -> Void
    init(_ title: String, action: @escaping () -> Void) { self.title = title; self.action = action }
    var body: some View { Button(L10n.text(title), action: action).buttonStyle(BrandTextStyle()) }
}

/// 应用于原生 TextField / SecureField，保留输入类型、提交行为与辅助功能标识。
struct BrandFieldStyle: ViewModifier {
    @FocusState private var focused: Bool
    func body(content: Content) -> some View {
        content
            .focused($focused)
            .font(Theme.bodyFont)
            .foregroundStyle(Theme.ink)
            .padding(.horizontal, 16)
            .frame(minHeight: 56)
            .background(Theme.sky2.opacity(0.55), in: .rect(cornerRadius: Theme.rSm))
            .overlay(RoundedRectangle(cornerRadius: Theme.rSm)
                .strokeBorder(focused ? Theme.brand : Theme.line, lineWidth: focused ? 2 : 1))
    }
}
extension View {
    func brandField() -> some View { modifier(BrandFieldStyle()) }
}

struct BrandTextField: View {
    let title: String
    @Binding var text: String
    init(_ title: String, text: Binding<String>) { self.title = title; _text = text }
    var body: some View { TextField(L10n.text(title), text: $text).brandField() }
}
struct BrandSecureField: View {
    let title: String
    @Binding var text: String
    init(_ title: String, text: Binding<String>) { self.title = title; _text = text }
    var body: some View { SecureField(L10n.text(title), text: $text).brandField() }
}

struct BrandSectionTitle: View {
    let title: String
    init(_ title: String) { self.title = title }
    var body: some View { Text(L10n.text(title)).font(Theme.titleFont(18)).foregroundStyle(Theme.ink) }
}

struct BrandCard<Content: View>: View {
    var title: String? = nil
    @ViewBuilder var content: () -> Content
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let title { BrandSectionTitle(title) }
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle(radius: Theme.rLg, padding: 18)
    }
}

struct BrandNotice: View {
    let message: String
    var symbol = "info.circle.fill"
    var isError = false
    var body: some View {
        Label {
            Text(L10n.text(message)).fixedSize(horizontal: false, vertical: true)
        } icon: {
            Image(systemName: symbol).foregroundStyle(isError ? Theme.danger : Theme.sub)
        }
        .font(Theme.captionFont)
        .foregroundStyle(isError ? Theme.danger : Theme.ink)
    }
}
