// 首次进入的基线探针（SPEC §5）：约 10 次「按下你看到的数字」，量的是**手速**
// 不是算术。中位反应时 × 倍率 = 这个孩子的答题时限，避免用统一时限压慢手的孩子。

import SwiftUI

struct ProbeView: View {
    let pack: ContentPack
    let storage: any StorageAdapter
    let studentId: String
    var onDone: (Int) -> Void

    @State private var trial = 0
    @State private var times: [Int] = []
    @State private var startedAt = Date()

    private var trials: Int { pack.engineConfig.individualizedGoal.probeProblemCount }
    /// 与 Web 端同一套确定性目标序列（热身不需要随机）
    private var target: Int { ((trial * 7 + 3) % 9) + 1 }

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text("热身 🖐️").font(.title2.weight(.semibold))
                Text("按下你看到的数字，越快越好")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                ProgressView(value: Double(trial), total: Double(trials))
                    .frame(maxWidth: 220)
                Text("\(trial + 1) / \(trials)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }

            Text("\(target)")
                .font(.system(size: 96, weight: .bold, design: .rounded))
                .monospacedDigit()
                .contentTransition(.numericText())
                .accessibilityLabel("请按 \(target)")

            NumpadView(
                onDigit: tap,
                onDelete: {},
                onSubmit: {},
                submitDisabled: true
            )
            .padding(.horizontal)
        }
        .padding()
        .onAppear { startedAt = Date() }
    }

    private func tap(_ digit: Int) {
        guard digit == target else { return } // 只有按对才计时，避免乱按拉低时限
        times.append(max(0, Int(Date().timeIntervalSince(startedAt) * 1000)))
        if trial + 1 >= trials {
            let gate = LatencyGate.compute(probeTimesMs: times, config: pack.engineConfig)
            let now = Int(Date().timeIntervalSince1970 * 1000)
            var student = storage.student(id: studentId)
                ?? StudentRecord(id: studentId, createdAt: now, latencyGateMs: nil, xp: 0)
            student.latencyGateMs = gate
            storage.putStudent(student)
            onDone(gate)
        } else {
            withAnimation { trial += 1 }
            startedAt = Date()
        }
    }
}
