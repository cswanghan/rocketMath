import SwiftUI

/// Illustration-only metadata. Problem text, choices and grading stay in the
/// bundled content pack; question IDs work in both supported languages.
enum PracticeIllustration: Equatable {
    case angle(Int)

    static let angles: [String: Int] = [
        "ant_b1": 90, "ant_c0": 45, "ant_c1": 120, "ant_c2": 180,
        "ant_eb2": 360, "ant_ec_cl0": 75, "ant_ec_cl1": 160,
    ]
    static func forProblem(_ problem: Problem) -> Self? {
        angles[problem.id].map(Self.angle)
    }
    var accessibilityDescription: String {
        switch self {
        case .angle(360): "一条射线绕端点转一圈回到原位。"
        case .angle(180): "两条射线从同一端点向相反方向延伸。"
        case .angle(90): "两条射线从同一端点出发，互相垂直。"
        case .angle: "按题干所述角度绘制的示意图。"
        }
    }
}

struct PracticeIllustrationView: View {
    let illustration: PracticeIllustration
    var body: some View {
        Canvas { context, size in
            if case .angle(let degrees) = illustration {
                let center = CGPoint(x: size.width / 2, y: size.height * 0.63)
                let radius = min(size.width * 0.34, size.height * 0.47)
                func point(_ degrees: Double, radius: Double) -> CGPoint {
                    let radians = degrees * .pi / 180
                    return CGPoint(x: center.x + cos(radians) * radius, y: center.y - sin(radians) * radius)
                }
                var rays = Path()
                rays.move(to: center); rays.addLine(to: point(0, radius: radius))
                if degrees < 360 {
                    rays.move(to: center); rays.addLine(to: point(Double(degrees), radius: radius))
                }
                context.stroke(rays, with: .color(Theme.ink), style: StrokeStyle(lineWidth: 4, lineCap: .round))
                let arcRadius = radius * 0.6
                var arc = Path()
                arc.move(to: point(0, radius: arcRadius))
                for step in 1...90 {
                    arc.addLine(to: point(Double(degrees) * Double(step) / 90, radius: arcRadius))
                }
                context.stroke(arc, with: .color(Theme.brand), style: StrokeStyle(lineWidth: 3, lineCap: .round))
                let end = point(Double(degrees), radius: arcRadius)
                let angle = Double(degrees) * .pi / 180
                let direction = CGPoint(x: -sin(angle), y: -cos(angle))
                var arrow = Path()
                arrow.move(to: end)
                arrow.addLine(to: CGPoint(x: end.x - direction.x * 11 - direction.y * 5,
                                         y: end.y - direction.y * 11 + direction.x * 5))
                arrow.addLine(to: CGPoint(x: end.x - direction.x * 11 + direction.y * 5,
                                         y: end.y - direction.y * 11 - direction.x * 5))
                arrow.closeSubpath()
                context.fill(arrow, with: .color(Theme.brand))
                context.fill(Path(ellipseIn: CGRect(x: center.x - 4, y: center.y - 4, width: 8, height: 8)), with: .color(Theme.ink))
            }
        }
        .frame(maxWidth: 300).frame(height: 154)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(L10n.text(illustration.accessibilityDescription))
        .accessibilityIdentifier("practice-illustration")
    }
}
