// 答题主界面：倒计时环 + 题干 + 数字键盘，纠错/过关用浮层。
// 交互契约照搬 Web 端 Play.tsx（倒计时归零算超时失误、纠错朗读答案、
// 纠错与过关都要孩子主动点「继续」），视觉走 iOS 原生。

import SwiftUI

struct PlayView: View {
    @State private var model: GameModel
    @State private var input = ""
    @State private var ringProgress: Double = 1
    @State private var lastPromptAt = Date()
    @Environment(SpeechService.self) private var speech
    @Environment(TimeLockService.self) private var timeLock
    @Environment(\.dismiss) private var dismiss

    private let pack: ContentPack
    private let storage: any StorageAdapter
    private let studentId: String

    init(model: GameModel, pack: ContentPack, storage: any StorageAdapter, studentId: String) {
        _model = State(initialValue: model)
        self.pack = pack
        self.storage = storage
        self.studentId = studentId
    }

    private var gateSeconds: Double { Double(model.latencyGateMs) / 1000 }

    var body: some View {
        VStack(spacing: 16) {
            header
            RocketChartView(
                levels: model.track.levels.map(\.level),
                completed: model.trackState?.completedLevels ?? [],
                current: model.trackState?.currentLevel ?? "A",
                compact: true
            )
            LevelBar(info: model.levelInfo)
            Spacer(minLength: 0)
            stage
            Spacer(minLength: 0)
        }
        .padding()
        .background(Theme.pageBackground.ignoresSafeArea())
        .navigationTitle(model.track.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink {
                    RaceView(trackId: model.track.trackId, pack: pack, storage: storage, studentId: studentId)
                } label: {
                    Image(systemName: "flag.checkered")
                }
                .accessibilityLabel("竞速")
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    speech.isMuted.toggle()
                } label: {
                    Image(systemName: speech.isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                }
                .accessibilityLabel(speech.isMuted ? "开启语音" : "关闭语音")
            }
        }
        .overlay { overlay }
        .overlay { if timeLock.isLocked { lockCover } }
        // 每出一道新题：累计活跃时间到时间锁、清空输入、重置倒计时环、到点判超时
        .task(id: model.promptSeq) {
            let now = Date()
            timeLock.tick(deltaMs: Int(now.timeIntervalSince(lastPromptAt) * 1000))
            lastPromptAt = now

            input = ""
            guard case .prompt = model.viewState else { return }
            ringProgress = 1
            withAnimation(.linear(duration: gateSeconds)) { ringProgress = 0 }
            try? await Task.sleep(for: .milliseconds(model.latencyGateMs))
            guard !Task.isCancelled else { return }
            model.timeoutMiss()
        }
    }

    private var lockCover: some View {
        ZStack {
            Rectangle().fill(.regularMaterial).ignoresSafeArea()
            LockView()
        }
    }

    // ----- 顶部进度 ----------------------------------------------------------

    private var header: some View {
        HStack {
            if let state = model.trackState {
                Label(phaseLabel(state.phase), systemImage: phaseIcon(state.phase))
                    .font(.subheadline.weight(.medium))
                    .labelStyle(.titleAndIcon)
                Spacer()
                Text(progressText(state))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
        }
    }

    private func progressText(_ state: TrackState) -> String {
        if state.phase == .takeOff {
            return "连对 \(state.streak)/\(model.mastery.takeOff.consecutiveCorrectWithinGate)"
        }
        let window = state.phase == .orbit ? model.mastery.orbit : model.mastery.universe
        return "\(state.attempts)/\(window.windowAttempts) 题 · 错 \(state.errors)/\(window.maxErrors)"
    }

    private func phaseLabel(_ phase: Phase) -> String {
        switch phase {
        case .takeOff: "起飞 Take-Off"
        case .orbit: "环绕 Orbit"
        case .universe: "宇宙 Universe"
        }
    }

    private func phaseIcon(_ phase: Phase) -> String {
        switch phase {
        case .takeOff: "airplane.departure"
        case .orbit: "circle.dashed"
        case .universe: "sparkles"
        }
    }

    // ----- 答题区 ------------------------------------------------------------

    @ViewBuilder
    private var stage: some View {
        switch model.viewState {
        case .prompt(let fact, let isRetest):
            VStack(spacing: 20) {
                ZStack {
                    Circle()
                        .fill(Theme.card)
                        .shadow(color: Theme.shadowColor.opacity(0.18), radius: 14, y: 8)
                    Circle()
                        .stroke(Theme.track, lineWidth: 14)
                    Circle()
                        .trim(from: 0, to: ringProgress)
                        .stroke(
                            AngularGradient(colors: [Theme.brand2, Theme.brand], center: .center),
                            style: StrokeStyle(lineWidth: 14, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                    Text(fact.prompt)
                        .font(.system(size: 60, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.ink)
                        .monospacedDigit()
                        .minimumScaleFactor(0.5)
                        .padding(.horizontal, 24)
                }
                .frame(width: 220, height: 220)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("题目 \(fact.prompt)")

                if isRetest {
                    Label("再试一次", systemImage: "arrow.clockwise")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.orange)
                }

                Text(input.isEmpty ? " " : input)
                    .font(.system(size: 44, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.ink)
                    .monospacedDigit()
                    .frame(maxWidth: .infinity)
                    .frame(height: 64)
                    .background(Theme.card, in: .rect(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(.white, lineWidth: 2))
                    .shadow(color: Theme.shadowColor.opacity(0.12), radius: 8, y: 4)
                    .accessibilityLabel(input.isEmpty ? "还没输入答案" : "你的答案 \(input)")

                NumpadView(
                    onDigit: { digit in
                        guard input.count < 4 else { return }
                        input.append(String(digit))
                    },
                    onDelete: { _ = input.popLast() },
                    onSubmit: submit,
                    submitDisabled: input.isEmpty
                )
            }

        case .loading:
            ProgressView("载入中…")

        case .failed(let message):
            ContentUnavailableView("出错了", systemImage: "exclamationmark.triangle", description: Text(message))

        default:
            // 纠错 / 过关等都由 overlay 承载，底层保持题面骨架不跳动
            Color.clear.frame(height: 1)
        }
    }

    private func submit() {
        guard let value = Int(input) else { return }
        model.submit(value)
    }

    // ----- 浮层 --------------------------------------------------------------

    @ViewBuilder
    private var overlay: some View {
        switch model.viewState {
        case .correction(let fact):
            card {
                Text("再看一遍 👀").font(.headline)
                Text("\(fact.prompt) = \(fact.answer)")
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .monospacedDigit()
                if fact.learningType == .pattern {
                    Text("先想口诀，再添 0").font(.subheadline).foregroundStyle(.secondary)
                }
                Button("我记住了，再来一次") { model.next() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }
            .task(id: fact.id) {
                speech.speak(SpeechService.sayFact(prompt: fact.prompt, answer: fact.answer))
            }

        case .phaseDone(let phase):
            card {
                Text("🎉 \(phaseLabel(phase)) 通过！").font(.title3.weight(.semibold))
                Button("继续") { model.next() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }

        case .levelDone(let level):
            card {
                Text("🚀 第 \(level) 关全部通过！").font(.title3.weight(.semibold))
                Button("下一关") { model.next() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }

        case .raceResult(let cpm):
            card {
                Text("竞速结束").font(.headline)
                Text("每分钟 \(Int(cpm.rounded())) 题")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                Button("继续") { model.next() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }

        default:
            EmptyView()
        }
    }

    @ViewBuilder
    private func card<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        ZStack {
            Rectangle().fill(.ultraThinMaterial).ignoresSafeArea()
            VStack(spacing: 20, content: content)
                .padding(28)
                .background(Theme.card, in: .rect(cornerRadius: 26))
                .overlay(RoundedRectangle(cornerRadius: 26).strokeBorder(.white, lineWidth: 2))
                .shadow(color: Theme.shadowColor.opacity(0.3), radius: 24, y: 10)
                .padding(32)
        }
        .transition(.opacity)
    }
}
