// 休息锁屏（SPEC §7）：玩满时限后强制休息，倒数结束才放行。孩子重开 App 也躲不掉
// （状态持久在 UserDefaults）。

import SwiftUI

struct LockView: View {
    @Environment(TimeLockService.self) private var timeLock
    @State private var remaining = 0

    var body: some View {
        VStack(spacing: 20) {
            Text("🌙").font(.system(size: 72))
            Text("休息一下眼睛")
                .font(.title2.weight(.semibold))
            Text("练了这么久，起来走走、看看远处～")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Text(timeString(remaining))
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(.orange)
                .accessibilityLabel("还需休息 \(remaining / 1000) 秒")
        }
        .padding()
        .task {
            while !Task.isCancelled {
                remaining = timeLock.remainingBreakMs
                if remaining <= 0 {
                    timeLock.refreshIfBreakOver()
                    return
                }
                try? await Task.sleep(for: .seconds(1))
            }
        }
    }

    private func timeString(_ ms: Int) -> String {
        let total = max(0, ms / 1000)
        return String(format: "%02d:%02d", total / 60, total % 60)
    }
}
