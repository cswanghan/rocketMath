# Shared UI primitives — 星芽 iOS (SwiftUI)
Framework is native SwiftUI, not React. There is no `src/components/ui` catalog. Shared primitives live in `Theme.swift`, mid-flight `ThemeComponents.swift` (incomplete Codex rewrite, may not compile; do not treat as shipped UI), plus small reusable views.
**Important:** `AccountView.swift`, `AuthView.swift`, and `MembershipSection.swift` on disk were mid-flight rewritten around 2026-11-11 08:49–08:50 Asia/Shanghai and may not compile (`L10n` referenced, no catalog). Reproduction of the user-reviewed UI must follow the device-reviewed baseline in this folder's narrative and the pre-rewrite source blocks at the end of this file — not the incomplete mid-flight code as ground truth.
## Theme + CardStyle + BrandProgress
- File path: `ios/Xingya/Theme.swift`
- Description: 糖果乐园 design tokens, Color(hex:), card modifier, brand progress bar.

```swift
// 设计系统 —— 「糖果乐园」方案（用户选定）。温暖干净、厚白卡片、每个学科一个专属
// 糖果色。所有屏从这里取值，不散落硬编码。符号名保持稳定，改值即可全局换肤。

import SwiftUI

extension Color {
    /// 从 0xRRGGBB 构造
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: 1
        )
    }
}

enum Theme {
    // 主色（糖果粉）
    static let brand = Color(hex: 0xff6b9d)
    static let brand2 = Color(hex: 0xff8fb1)
    static let accent = Color(hex: 0x28d3a7)
    static let warn = Color(hex: 0xff9f45)
    static let danger = Color(hex: 0xff6b6b)
    static let gold = Color(hex: 0xffb92e)      // 星级金黄
    static let ink = Color(hex: 0x3a2b5c)        // 主文字（深紫）
    static let sub = Color(hex: 0x9b8fb5)        // 次文字
    static let line = Color(hex: 0xf0e6f5)       // 分隔线/进度底槽
    static let card = Color.white
    static let pageBg = Color(hex: 0xf2f6ff)
    static let sky1 = Color(hex: 0xeaf1ff)
    static let sky2 = Color(hex: 0xf6f2ff)
    static let track = Color(hex: 0xf0e6f5)      // 进度条底槽
    static let pillBg = Color(hex: 0xffe3ef)     // 年级 pill 底
    static let pillInk = Color(hex: 0xff5c8a)    // 年级 pill 字
    static let tabInactive = Color(hex: 0xb7a9c9)

    // 圆角
    static let rLg: CGFloat = 22
    static let rMd: CGFloat = 18
    static let rSm: CGFloat = 12
    static let pad: CGFloat = 16

    // 渐变
    static let brandGradient = LinearGradient(
        colors: [brand2, brand], startPoint: .topLeading, endPoint: .bottomTrailing
    )
    static let skyGradient = LinearGradient(
        colors: [sky1, sky2], startPoint: .top, endPoint: .bottom
    )
    static let warnGradient = LinearGradient(
        colors: [warn, danger], startPoint: .leading, endPoint: .trailing
    )
    /// 页面背景（糖果浅粉 → 浅蓝）
    static let pageBackground = LinearGradient(
        colors: [Color(hex: 0xfff7fb), Color(hex: 0xf4f2ff), pageBg],
        startPoint: .top, endPoint: .bottom
    )

    static let shadowColor = Color(hex: 0x7850a0)  // 柔和紫阴影

    // ----- 学科专属糖果色（糖果乐园精髓：每个 pedagogy 一个颜色）--------------

    /// 每个学科的糖果色 (起点, 终点)
    static func candyColors(for pedagogy: Pedagogy) -> (Color, Color) {
        switch pedagogy {
        case .fluency:   return (Color(hex: 0x8fd6ff), Color(hex: 0x5b8cff)) // 蓝
        case .procedure: return (Color(hex: 0x8affc0), Color(hex: 0x28d3a7)) // 青绿
        case .formula:   return (Color(hex: 0xffd36b), Color(hex: 0xff9f45)) // 橙黄
        case .concept:   return (Color(hex: 0xc3a0ff), Color(hex: 0x8a7bff)) // 紫
        case .logic:     return (Color(hex: 0xffa9c7), Color(hex: 0xff6b9d)) // 粉
        case .data:      return (Color(hex: 0x8fe9ff), Color(hex: 0x3bc9db)) // 青
        }
    }

    static func candyGradient(for pedagogy: Pedagogy) -> LinearGradient {
        let (a, b) = candyColors(for: pedagogy)
        return LinearGradient(colors: [a, b], startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

// ----- 通用修饰符 ------------------------------------------------------------

/// 糖果卡片：白底 + 大圆角 + 2px 白边 + 柔和紫阴影（厚实、浮起）。
struct CardStyle: ViewModifier {
    var radius: CGFloat = Theme.rMd
    var padding: CGFloat = 12
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Theme.card, in: .rect(cornerRadius: radius))
            .overlay(RoundedRectangle(cornerRadius: radius).strokeBorder(.white, lineWidth: 2))
            .shadow(color: Theme.shadowColor.opacity(0.12), radius: 12, x: 0, y: 8)
    }
}

extension View {
    func cardStyle(radius: CGFloat = Theme.rMd, padding: CGFloat = 12) -> some View {
        modifier(CardStyle(radius: radius, padding: padding))
    }
}

/// 进度条：圆头底槽 + 渐变填充（默认品牌，可传学科色）。
struct BrandProgress: View {
    var value: Double
    var height: CGFloat = 8
    var fill: LinearGradient = Theme.brandGradient
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.track)
                Capsule().fill(fill)
                    .frame(width: max(0, min(1, value)) * geo.size.width)
            }
        }
        .frame(height: height)
    }
}
```

## ThemeComponents (MID-FLIGHT, incomplete)
- File path: `ios/Xingya/ThemeComponents.swift`
- Description: Unfinished shared buttons/fields/cards from a stopped Codex session. Not in pbxproj. Not the user-seen UI.

```swift
// 共享的糖果乐园控件。布局、禁用和按压反馈在这里统一。
import SwiftUI

extension Theme {
    static func titleFont(_ size: CGFloat = 24, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }
    static func numberFont(_ size: CGFloat = 34) -> Font {
        .system(size: size, weight: .bold, design: .rounded).monospacedDigit()
    }
    static let bodyFont = Font.system(.body, design: .default, weight: .regular)
    static let captionFont = Font.system(.footnote, design: .default, weight: .regular)
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
            .frame(maxWidth: .infinity, minHeight: 52)
            .padding(.horizontal, 16)
            .background(Theme.brandGradient, in: .rect(cornerRadius: Theme.rMd))
            .shadow(color: Theme.brand.opacity(0.18), radius: 8, y: 4)
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
                Text(title).opacity(isLoading ? 0 : 1)
                if isLoading { ProgressView().tint(.white) }
            }
        }
        .buttonStyle(BrandPrimaryStyle())
        .accessibilityLabel(title)
    }
}

struct BrandSecondaryButton: View {
    let title: String
    var action: () -> Void
    init(_ title: String, action: @escaping () -> Void) { self.title = title; self.action = action }
    var body: some View { Button(title, action: action).buttonStyle(BrandSecondaryStyle()) }
}

struct BrandTextButton: View {
    let title: String
    var action: () -> Void
    init(_ title: String, action: @escaping () -> Void) { self.title = title; self.action = action }
    var body: some View { Button(title, action: action).buttonStyle(BrandTextStyle()) }
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
    var body: some View { TextField(title, text: $text).brandField() }
}
struct BrandSecureField: View {
    let title: String
    @Binding var text: String
    init(_ title: String, text: Binding<String>) { self.title = title; _text = text }
    var body: some View { SecureField(title, text: $text).brandField() }
}

struct BrandSectionTitle: View {
    let title: String
    init(_ title: String) { self.title = title }
    var body: some View { Text(title).font(Theme.titleFont(18)).foregroundStyle(Theme.ink) }
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
            Text(message).fixedSize(horizontal: false, vertical: true)
        } icon: {
            Image(systemName: symbol).foregroundStyle(isError ? Theme.danger : Theme.sub)
        }
        .font(Theme.captionFont)
        .foregroundStyle(isError ? Theme.danger : Theme.ink)
    }
}
```

## LevelBar
- File path: `ios/Xingya/Views/LevelBar.swift`
- Description: Level / XP bar used in profile and related screens.

```swift
// 顶部等级条：Lv.X + 当前等级进度。答对时经验增长会平滑推进。

import SwiftUI

struct LevelBar: View {
    let info: LevelInfo

    private var fraction: Double {
        info.span > 0 ? Double(info.intoLevel) / Double(info.span) : 0
    }

    var body: some View {
        HStack(spacing: 10) {
            Text("Lv.\(info.level)")
                .font(.subheadline.weight(.bold))
                .monospacedDigit()
                .foregroundStyle(.accent)
            ProgressView(value: fraction)
                .tint(.accentColor)
                .animation(.easeOut, value: fraction)
            Text("还差 \(info.toNext)")
                .font(.caption2)
                .monospacedDigit()
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("等级 \(info.level)，距下一级还差 \(info.toNext) 经验")
    }
}

#Preview {
    VStack(spacing: 16) {
        LevelBar(info: levelFromXp(0))
        LevelBar(info: levelFromXp(150))
        LevelBar(info: levelFromXp(450))
    }
    .padding()
}
```

## NumpadView
- File path: `ios/Xingya/Views/NumpadView.swift`
- Description: Custom numeric keypad for practice / race / fluency answers.

```swift
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
            // 不用 .disabled()：disabled 的 .plain 自定义按钮会被 XCUITest 排除，
            // 改为按钮常在、在动作里拦截（视觉仍按 submitDisabled 变灰）。
            key("确定", role: .primary, accessibilityLabel: "确定") {
                if !submitDisabled { onSubmit() }
            }
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
        .accessibilityIdentifier(accessibilityLabel ?? label)
        .accessibilityAddTraits(.isButton)
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
```

## RocketChartView
- File path: `ios/Xingya/Views/RocketChartView.swift`
- Description: Level progress chart (rocket / stage dots) used on fluency home rows.

```swift
// Rocket Chart：A–R 关卡进度条。已过关填色、当前关高亮、未解锁灰显。

import SwiftUI

struct RocketChartView: View {
    let levels: [String]
    let completed: [String]
    let current: String
    var compact: Bool = false

    var body: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 6) {
                ForEach(levels, id: \.self) { level in
                    Text(level)
                        .font(compact ? .caption.weight(.semibold) : .headline)
                        .monospaced()
                        .frame(width: compact ? 26 : 34, height: compact ? 26 : 34)
                        .background(background(for: level), in: .rect(cornerRadius: 8))
                        .foregroundStyle(foreground(for: level))
                        .overlay {
                            if level == current {
                                RoundedRectangle(cornerRadius: 8)
                                    .strokeBorder(Color.accentColor, lineWidth: 2)
                            }
                        }
                        .accessibilityLabel(label(for: level))
                }
            }
            .padding(.horizontal, 2)
            .padding(.vertical, 4)
        }
        .scrollIndicators(.hidden)
    }

    private func isDone(_ level: String) -> Bool { completed.contains(level) }

    private func background(for level: String) -> some ShapeStyle {
        if isDone(level) { return AnyShapeStyle(Color.accentColor) }
        if level == current { return AnyShapeStyle(Color.accentColor.opacity(0.15)) }
        return AnyShapeStyle(Color(.secondarySystemFill))
    }

    private func foreground(for level: String) -> Color {
        isDone(level) ? .white : (level == current ? .accentColor : .secondary)
    }

    private func label(for level: String) -> String {
        if isDone(level) { return "第 \(level) 关，已通过" }
        if level == current { return "第 \(level) 关，当前" }
        return "第 \(level) 关，未解锁"
    }
}

#Preview {
    RocketChartView(
        levels: ["A", "B", "C", "D", "E", "F"],
        completed: ["A", "B"],
        current: "C"
    )
    .padding()
}
```

