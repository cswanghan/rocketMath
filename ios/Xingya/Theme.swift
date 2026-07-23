// 设计系统 —— 「糖果乐园」方案（用户选定）。明亮撞色、厚白卡片、每个学科一个专属
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
            .shadow(color: Theme.shadowColor.opacity(0.22), radius: 12, x: 0, y: 8)
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
