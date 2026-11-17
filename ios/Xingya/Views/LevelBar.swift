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
