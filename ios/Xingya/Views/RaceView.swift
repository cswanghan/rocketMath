// 里程碑竞速：限时内用已学 facts 连续答题，结算每分钟答对数。
// 与答题主界面的区别（SPEC §5/§7）：全局倒计时而非单题倒计时、竞速全程不朗读、
// 只看对错不看时限。引擎 startRace/finishRace 已被黄金用例覆盖，这里只做壳。

import SwiftUI

struct RaceView: View {
    let trackId: String
    let pack: ContentPack
    let storage: any StorageAdapter
    let studentId: String

    @State private var model: GameModel?
    @State private var remainingMs = 0
    @State private var startError: String?
    @Environment(\.dismiss) private var dismiss

    private var speeds: [RaceSpeed] {
        pack.engineConfig.milestoneRaces.speeds ?? [
            RaceSpeed(id: "standard", label: "标准", emoji: "🚀", seconds: pack.engineConfig.milestoneRaces.durationSeconds)
        ]
    }

    var body: some View {
        ScrollView { Group {
            if let error = startError {
                ContentUnavailableView("开始不了", systemImage: "flag.slash", description: Text(error))
            } else if let model {
                switch model.viewState {
                case .raceResult(let cpm):
                    resultScreen(cpm: cpm)
                case .prompt(let fact, _):
                    racingScreen(model: model, fact: fact)
                default:
                    ProgressView()
                }
            } else {
                chooseScreen
            }
        }
        .padding().frame(maxWidth: 720).frame(maxWidth: .infinity)
        }
        .foregroundStyle(Theme.ink)
        .background(Theme.pageBackground.ignoresSafeArea())
        .navigationTitle("竞速")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("关闭") { dismiss() }.accessibilityIdentifier("session-close") } }
    }

    // ----- 选速度 ------------------------------------------------------------

    private var chooseScreen: some View {
        VStack(spacing: 16) {
            Text("选一个速度，看看一分钟能答对多少题")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            ForEach(speeds) { speed in
                Button {
                    start(durationSeconds: speed.seconds)
                } label: {
                    HStack {
                        Image(systemName: "timer").font(.title).foregroundStyle(Theme.brand)
                        VStack(alignment: .leading) {
                            Text(L10n.text(speed.label)).font(.headline)
                            Text(L10n.duration(Double(speed.seconds))).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right").foregroundStyle(.tertiary)
                    }
                    .padding()
                    .background(Theme.card, in: .rect(cornerRadius: 16))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("race-speed-\(speed.id)")
                .padding(.horizontal)
            }
            Spacer()
        }
        .padding(.top)
    }

    private func start(durationSeconds: Int) {
        do {
            let m = try GameModel(trackId: trackId, pack: pack, storage: storage, studentId: studentId)
            m.startRace(durationMs: durationSeconds * 1000)
            model = m
            remainingMs = durationSeconds * 1000
        } catch {
            startError = "\(error)"
        }
    }

    // ----- 竞速中 ------------------------------------------------------------

    private func racingScreen(model: GameModel, fact: Fact) -> some View {
        VStack(spacing: 24) {
            timerBar
            Spacer()
            Text(fact.prompt)
                .font(.system(size: 52, weight: .bold, design: .rounded))
                .monospacedDigit()
                .accessibilityLabel(L10n.format("题目 %@", fact.prompt))
                .accessibilityIdentifier("race-question")
            if let race = model.trackState?.race {
                Text(L10n.format("答对 %@ 题", L10n.number(race.correct)))
                    .accessibilityIdentifier("race-correct-count")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
            Spacer()
            RaceNumpad(model: model)
        }
        .padding()
        // 全局倒计时：到点主动收尾，即便孩子停手
        .task(id: model.promptSeq) {
            while !Task.isCancelled {
                guard let endsAt = model.trackState?.race?.endsAt else { return }
                let left = endsAt - Int(Date().timeIntervalSince1970 * 1000)
                remainingMs = max(0, left)
                if left <= 0 {
                    model.next() // 触发 finishRace
                    return
                }
                try? await Task.sleep(for: .milliseconds(100))
            }
        }
    }

    private var timerBar: some View {
        let total = Double((model?.trackState?.race?.durationMs ?? 1))
        let frac = total > 0 ? Double(remainingMs) / total : 0
        return VStack(spacing: 6) {
            Text(L10n.duration(ceil(Double(remainingMs) / 1000)))
                .font(.title3.weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(remainingMs <= 10000 ? .orange : .primary)
            ProgressView(value: frac)
                .tint(remainingMs <= 10000 ? .orange : .accentColor)
        }
    }

    // ----- 结果 --------------------------------------------------------------

    private func resultScreen(cpm: Double) -> some View {
        VStack(spacing: 20) {
            Spacer()
            Text("🏁").font(.system(size: 64))
            Text(L10n.format("每分钟 %@ 题", L10n.number(Int(cpm.rounded()))))
                .font(.system(size: 40, weight: .bold, design: .rounded))
            if let race = model?.trackState?.race {
                Text(L10n.format("共答对 %@ / %@ 题", L10n.number(race.correct), L10n.number(race.answered)))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(spacing: 12) {
                Button("再来一次") { model = nil }
                    .buttonStyle(BrandPrimaryStyle())
                    .controlSize(.large)
                Button("返回") { dismiss() }
                    .buttonStyle(BrandSecondaryStyle())
                    .controlSize(.large)
            }
            .padding(.horizontal)
        }
        .padding()
    }
}

/// 竞速专用键盘：检查答案后直接出下一题，不显示单题反馈。
private struct RaceNumpad: View {
    let model: GameModel
    @State private var input = ""

    var body: some View {
        VStack(spacing: 12) {
            Text(input.isEmpty ? " " : input)
                .font(.system(size: 32, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(Theme.card, in: .rect(cornerRadius: 12))

            NumpadView(
                onDigit: { input = IntegerAnswerInput.appending($0, to: input) },
                onDelete: { _ = input.popLast() },
                onSubmit: submit,
                submitDisabled: IntegerAnswerInput.value(of: input) == nil,
                onToggleSign: IntegerAnswerInput.supportsNegativeAnswers(in: model.track) ? {
                    input = IntegerAnswerInput.togglingSign(in: input, allowed: true)
                } : nil
            )
        }
        .onChange(of: model.promptSeq) { input = "" }
    }

    private func submit() {
        guard let value = IntegerAnswerInput.value(of: input) else { return }
        model.submit(value)
    }
}
