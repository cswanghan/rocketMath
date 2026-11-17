// Sunny v3 · 向阳生长. Semantic colors adapt to appearance and increased contrast.
import SwiftUI
import UIKit

extension Color {
    init(hex: UInt32) {
        self.init(.sRGB, red: Double((hex >> 16) & 255) / 255,
                  green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255, opacity: 1)
    }
}

enum Theme {
    nonisolated static func adaptive(_ light: UInt32, _ dark: UInt32) -> Color {
        Color(uiColor: UIColor { traits in
            let hex = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: CGFloat((hex >> 16) & 255) / 255,
                           green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1)
        })
    }
    static let brand = adaptive(0x176B4A, 0x8AD7AD)
    static let button = Color(hex: 0x176B4A)
    static let buttonBase = Color(hex: 0x0F4D35)
    static let brand2 = brand
    static let accent = brand
    static let warn = adaptive(0x8C5800, 0xFFD174)
    static let danger = adaptive(0xB23A26, 0xFFA694)
    static let gold = Color(hex: 0xFFC53D)
    static let tangerine = Color(hex: 0xF26B2A)
    static let ink = adaptive(0x17324D, 0xF5F3E8)
    static let sub = adaptive(0x536A7A, 0xBBCED6)
    static let line = adaptive(0xE4D8C3, 0x53636A)
    static let card = adaptive(0xFFFDF7, 0x20333D)
    static let pageBg = adaptive(0xFFF9EA, 0x14252E)
    static let sky1 = adaptive(0xC9EDF8, 0x244852)
    static let sky2 = adaptive(0xEAF8FC, 0x203D48)
    static let sunlight = adaptive(0xFFF3D4, 0x423B26)
    static let leafSoft = adaptive(0xE7F6EC, 0x223F35)
    static let track = line
    static let pillBg = sunlight
    static let pillInk = warn
    static let tabInactive = sub
    static let rLg: CGFloat = 28
    static let rMd: CGFloat = 24
    static let rSm: CGFloat = 16
    static let pad: CGFloat = 24
    static let brandGradient = LinearGradient(colors: [button, button], startPoint: .top, endPoint: .bottom)
    static let skyGradient = LinearGradient(colors: [sky2, sky1], startPoint: .topLeading, endPoint: .bottomTrailing)
    static let warnGradient = LinearGradient(colors: [warn, warn], startPoint: .top, endPoint: .bottom)
    static let pageBackground = LinearGradient(colors: [pageBg, pageBg], startPoint: .top, endPoint: .bottom)
    static let shadowColor = buttonBase
    // Compatibility for older subflows: one palette, no subject-specific candy colors.
    static func candyColors(for pedagogy: Pedagogy) -> (Color, Color) { (sky1, sky1) }
    static func candyGradient(for pedagogy: Pedagogy) -> LinearGradient { skyGradient }
}

struct CardStyle: ViewModifier {
    var radius: CGFloat = Theme.rMd
    var padding: CGFloat = 16
    @Environment(\.colorSchemeContrast) private var contrast
    func body(content: Content) -> some View {
        content.padding(padding)
            .background(Theme.card, in: .rect(cornerRadius: radius))
            .overlay(RoundedRectangle(cornerRadius: radius).strokeBorder(contrast == .increased ? Theme.sub : Theme.line, lineWidth: 1))
    }
}
extension View {
    func cardStyle(radius: CGFloat = Theme.rMd, padding: CGFloat = 16) -> some View {
        modifier(CardStyle(radius: radius, padding: padding))
    }
}
struct BrandProgress: View {
    var value: Double
    var height: CGFloat = 6
    var fill: LinearGradient = Theme.brandGradient
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.track)
                Capsule().fill(fill).frame(width: max(0, min(1, value)) * geo.size.width)
            }
        }.frame(height: height).accessibilityHidden(true)
    }
}
