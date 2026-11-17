import SwiftUI

struct PlayView: View {
    @State private var model: GameModel
    @State private var input = ""
    @State private var remaining = 0
    @State private var timedOut = false
    @Environment(SpeechService.self) private var speech
    @Environment(TimeLockService.self) private var timeLock
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let pack: ContentPack
    private let storage: any StorageAdapter
    private let studentId: String

    init(model: GameModel, pack: ContentPack, storage: any StorageAdapter, studentId: String) {
        _model = State(initialValue: model)
        self.pack = pack; self.storage = storage; self.studentId = studentId
    }
    private var allowsNegativeAnswers: Bool { IntegerAnswerInput.supportsNegativeAnswers(in: model.track) }
    private var isPrompt: Bool { if case .prompt = model.viewState { return true }; return false }
    private var fact: Fact? {
        switch model.viewState {
        case .prompt(let fact, _), .correct(let fact), .correction(let fact): fact
        default: nil
        }
    }
    private var isCorrect: Bool { if case .correct = model.viewState { return true }; return false }
    private var progress: Double {
        guard let state = model.trackState else { return 0 }
        return min(1, Double(state.streak) / Double(max(1, model.mastery.takeOff.consecutiveCorrectWithinGate)))
    }
    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                VStack(spacing: 20) {
                    SessionHeader(progress: progress, title: L10n.format("第 %@ 题", L10n.number(max(1, model.promptSeq))),
                                  seconds: remaining, paused: !isPrompt, close: { dismiss() })
                    HStack(alignment: .center) {
                        Text("口算").font(.subheadline.bold()).padding(9).background(Theme.leafSoft, in: .rect(cornerRadius: 10))
                        Text(L10n.text(model.track.name)).font(.subheadline).foregroundStyle(Theme.sub)
                        Spacer(minLength: 0)
                        Button { if let fact { speech.speak(L10n.text(fact.prompt)) } } label: {
                            Image(systemName: "speaker.wave.2").frame(width: 44, height: 44)
                        }.buttonStyle(.plain).foregroundStyle(Theme.ink)
                            .background(Theme.card, in: .rect(cornerRadius: 14))
                            .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.sky1))
                            .accessibilityLabel(L10n.text("听一听"))
                    }
                    if let fact {
                        Spacer(minLength: 0)
                        mathStage(fact).frame(minHeight: isPrompt ? 210 : 330)
                        Spacer(minLength: 0)
                    }
                    controls
                }
                .padding(20).frame(maxWidth: 720)
                .frame(minHeight: geometry.size.height).frame(maxWidth: .infinity)
            }
        }
        .foregroundStyle(Theme.ink).background(Theme.pageBg.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .overlay { if timeLock.isLocked { Theme.pageBg.ignoresSafeArea(); LockView() } }
        .task(id: model.promptSeq) {
            guard isPrompt else { return }
            input = ""; timedOut = false
            let start = Date()
            remaining = Int(ceil(Double(model.latencyGateMs) / 1000))
            while !Task.isCancelled && isPrompt {
                let elapsed = Date().timeIntervalSince(start)
                remaining = max(0, Int(ceil(Double(model.latencyGateMs) / 1000 - elapsed)))
                if remaining == 0 { timedOut = true; model.timeoutMiss(); break }
                try? await Task.sleep(for: .milliseconds(100))
            }
            timeLock.tick(deltaMs: min(model.latencyGateMs, Int(Date().timeIntervalSince(start) * 1000)))
        }
        .sensoryFeedback(.success, trigger: isCorrect) { _, correct in correct }
        .onDisappear { speech.cancel() }
    }
    private func mathStage(_ fact: Fact) -> some View {
        VStack(spacing: 16) {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 12) { equation(fact); answer }
                VStack(spacing: 20) { equation(fact); answer }
            }.environment(\.layoutDirection, .leftToRight)
            if isPrompt {
                Text("慢慢算，不着急").font(.footnote.weight(.medium)).foregroundStyle(Theme.sub)
            }
        }
        .frame(maxWidth: .infinity).padding(.vertical, 40)
        .background { Circle().stroke(Theme.sky1.opacity(0.55), style: StrokeStyle(lineWidth: 1.5, dash: [3, 3])).frame(width: 270, height: 270) }
    }
    private func equation(_ fact: Fact) -> some View {
        Text("\(fact.prompt) =")
            .font(typeSize.isAccessibilitySize ? .largeTitle.bold() : Theme.numberFont(48)).fixedSize(horizontal: false, vertical: true).monospacedDigit()
            .accessibilityLabel(L10n.format("题目 %@", fact.prompt)).accessibilityIdentifier("fluency-question")
    }
    private var answer: some View {
        Text(isPrompt ? (input.isEmpty ? "?" : input) : String(fact?.answer ?? 0))
            .font(Theme.numberFont(48)).padding(.horizontal, 16).padding(.vertical, 14)
            .frame(minWidth: 92)
            .background(isCorrect ? Theme.leafSoft : Theme.card, in: .rect(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).strokeBorder(isCorrect ? Theme.brand : Theme.sky1, lineWidth: 2))
            .accessibilityLabel(L10n.format(isPrompt ? "你的答案 %@" : "正确答案 %@", isPrompt ? input : String(fact?.answer ?? 0)))
            .accessibilityIdentifier("fluency-answer")
    }
    @ViewBuilder private var controls: some View {
        switch model.viewState {
        case .prompt(_, let retest):
            if retest { Text("再试一次").font(.footnote).foregroundStyle(Theme.warn) }
            NumpadView(
                onDigit: { input = IntegerAnswerInput.appending($0, to: input) },
                onDelete: { _ = input.popLast() },
                onSubmit: { if let value = IntegerAnswerInput.value(of: input) { model.submit(value) } },
                submitDisabled: IntegerAnswerInput.value(of: input) == nil,
                onToggleSign: allowsNegativeAnswers ? {
                    input = IntegerAnswerInput.togglingSign(in: input, allowed: allowsNegativeAnswers)
                } : nil
            )
        case .correct(let fact):
            FeedbackBand(correct: true, title: "对了！", detail: "\(fact.prompt) = \(fact.answer)", identifier: "fluency-continue") { model.next() }
                .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
        case .correction(let fact):
            FeedbackBand(correct: false, title: timedOut ? "时间到了，再试一次" : "差一点，再看一遍", detail: "\(fact.prompt) = \(fact.answer)",
                         buttonTitle: "继续", identifier: "fluency-retry") { model.next() }
        case .phaseDone:
            FeedbackBand(correct: true, title: "这一阶段完成了", detail: "", identifier: "fluency-continue") { model.next() }
        case .levelDone:
            FeedbackBand(correct: true, title: "这一关完成了", detail: "", identifier: "fluency-next-level") { model.next() }
        case .raceResult:
            BrandPrimaryButton("继续") { model.next() }
        case .loading: ProgressView("载入中…")
        case .failed:
            ContentUnavailableView("出错了", systemImage: "exclamationmark.triangle", description: Text("请返回并重新打开练习"))
            BrandPrimaryButton("返回") { dismiss() }
        }
    }
}
