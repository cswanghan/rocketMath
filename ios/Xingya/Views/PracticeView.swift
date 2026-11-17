import SwiftUI

struct PracticeView: View {
    @State private var model: PracticeModel
    @State private var choiceId: String?
    @State private var fillText = ""
    @State private var fieldValues: [String: String] = [:]
    @Environment(\.dismiss) private var dismiss
    @Environment(SpeechService.self) private var speech
    init(model: PracticeModel) { _model = State(initialValue: model) }
    private var problem: Problem? {
        switch model.viewState {
        case .present(let p), .wrong(let p, _), .correct(let p, _), .reveal(let p): p
        default: nil
        }
    }
    private var feedback: Bool {
        switch model.viewState { case .correct, .reveal: true; default: false }
    }
    private var correct: Bool { if case .correct = model.viewState { return true }; return false }
    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                VStack(spacing: 20) {
                    SessionHeader(progress: Double(max(0, model.state.index + 1)) / Double(max(1, model.state.order.count)),
                                  title: L10n.format("第 %@ 题 / 共 %@ 题", L10n.number(max(1, model.state.index + 1)), L10n.number(model.state.order.count)), close: { dismiss() })
                    HStack {
                        Text(L10n.text(model.currentTier?.rawValue ?? "练习")).font(.subheadline.bold()).padding(9)
                            .background(Theme.leafSoft, in: .rect(cornerRadius: 10))
                        Text(L10n.text(model.set.title)).font(.subheadline).foregroundStyle(Theme.sub)
                        Spacer(minLength: 0)
                        Button { if let problem { speech.speak(L10n.text(problem.prompt)) } } label: {
                            Image(systemName: "speaker.wave.2").frame(width: 44, height: 44)
                        }.accessibilityLabel(L10n.text("听一听"))
                    }
                    if let problem {
                        Spacer(minLength: 0)
                        Text(L10n.text(problem.prompt)).font(Theme.titleFont(34, weight: .bold))
                            .multilineTextAlignment(.center).frame(maxWidth: .infinity, minHeight: 130)
                            .accessibilityLabel(L10n.format("题目 %@", L10n.text(problem.prompt))).accessibilityIdentifier("practice-question")
                        if feedback {
                            Text(L10n.text(correctText(problem))).font(Theme.numberFont(44))
                                .padding(22).background(correct ? Theme.leafSoft : Theme.sunlight, in: .rect(cornerRadius: 22))
                            Spacer(minLength: 24)
                            FeedbackBand(correct: correct, title: correct ? "对了！" : "看一下正确答案",
                                         detail: L10n.text(problem.explanation ?? ""), identifier: "practice-continue") { model.next() }
                        } else {
                            input(problem)
                            if case .wrong = model.viewState {
                                BrandNotice(message: L10n.text(problem.hint ?? "差一点，再试一次。"), symbol: "arrow.counterclockwise", isError: true)
                                    .accessibilityIdentifier("practice-incorrect")
                            } else { Text("慢慢算，不着急").font(.footnote).foregroundStyle(Theme.sub) }
                            Spacer(minLength: 12)
                            BrandPrimaryButton("检查答案") { submit(problem) }
                                .disabled(!canSubmit(problem)).accessibilityIdentifier("practice-submit")
                        }
                    } else if case .complete(let count, let total) = model.viewState {
                        Spacer()
                        SunSprout().frame(width: 100, height: 100)
                        Text("这一套练完啦").font(.title.bold())
                        Text(L10n.format("一次答对 %@ / %@ 题", L10n.number(count), L10n.number(total))).font(.headline)
                        Spacer()
                        BrandPrimaryButton("返回") { dismiss() }
                    } else { ProgressView("载入中…") }
                }
                .padding(20).frame(maxWidth: 720).frame(minHeight: geometry.size.height).frame(maxWidth: .infinity)
            }
        }.foregroundStyle(Theme.ink).background(Theme.pageBg.ignoresSafeArea()).toolbar(.hidden, for: .navigationBar)
            .onChange(of: model.problemSeq) { choiceId = nil; fillText = ""; fieldValues = [:] }
            .sensoryFeedback(.success, trigger: correct).onDisappear { speech.cancel() }
    }
    @ViewBuilder private func input(_ p: Problem) -> some View {
        switch p.type {
        case .mc:
            VStack(spacing: 10) {
                ForEach(p.choices ?? []) { choice in
                    Button { choiceId = choice.id } label: {
                        HStack {
                            Image(systemName: choiceId == choice.id ? "checkmark.circle.fill" : "circle")
                            Text(L10n.text(choice.label)).font(.headline).multilineTextAlignment(.leading)
                            Spacer(minLength: 0)
                        }.padding(16).frame(minHeight: 52).background(choiceId == choice.id ? Theme.leafSoft : Theme.card, in: .rect(cornerRadius: 18))
                            .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(choiceId == choice.id ? Theme.brand : Theme.line))
                    }.buttonStyle(.plain).accessibilityAddTraits(choiceId == choice.id ? .isSelected : [])
                        .accessibilityIdentifier("practice-choice-\(choice.id)")
                }
            }
        case .fill:
            TextField(L10n.text("答案"), text: $fillText).brandField().keyboardType(.numbersAndPunctuation)
                .font(Theme.numberFont(34)).multilineTextAlignment(.center).accessibilityIdentifier("practice-answer")
                .submitLabel(.done).onSubmit { if canSubmit(p) { submit(p) } }
        case .steps:
            ForEach(Array((p.fields ?? []).enumerated()), id: \.element.id) { index, field in
                VStack(alignment: .leading, spacing: 8) {
                    Text(L10n.text(field.label)).font(.headline)
                    TextField(L10n.text("答案"), text: binding(field.id.isEmpty ? "f\(index)" : field.id))
                        .brandField().keyboardType(.numbersAndPunctuation).accessibilityLabel(L10n.text(field.label))
                }
            }
        }
    }
    private func binding(_ key: String) -> Binding<String> { Binding(get: { fieldValues[key] ?? "" }, set: { fieldValues[key] = $0 }) }
    private func canSubmit(_ p: Problem) -> Bool {
        switch p.type {
        case .mc: choiceId != nil
        case .fill: !fillText.trimmingCharacters(in: .whitespaces).isEmpty
        case .steps: (p.fields ?? []).enumerated().allSatisfy { i, f in !(fieldValues[f.id.isEmpty ? "f\(i)" : f.id] ?? "").trimmingCharacters(in: .whitespaces).isEmpty }
        }
    }
    private func submit(_ p: Problem) {
        guard canSubmit(p) else { return }
        switch p.type {
        case .mc: if let choiceId { model.answer(.choice(choiceId)) }
        case .fill: model.answer(.value(fillText))
        case .steps: model.answer(.fields(fieldValues))
        }
    }
}
