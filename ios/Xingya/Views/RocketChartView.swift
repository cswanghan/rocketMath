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
