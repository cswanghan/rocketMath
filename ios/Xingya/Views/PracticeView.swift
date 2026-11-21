import SwiftUI

struct PracticeView: View {
    @State private var model: PracticeModel
    @State private var choiceId: String?
    @State private var fillText = ""
    @State private var fieldValues: [String: String] = [:]
    @State private var focusedField: String?
    @Environment(\.dismiss) private var dismiss
    @Environment(SpeechService.self) private var speech
    init(model: PracticeModel) {
        #if DEBUG
        _model = State(initialValue: PracticeKeyboardUITestFixture.replacement() ?? model)
        #else
        _model = State(initialValue: model)
        #endif
    }
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
            ScrollViewReader { scroll in
            ScrollView {
                VStack(spacing: 20) {
                    SessionHeader(progress: Double(max(0, model.state.index + 1)) / Double(max(1, model.state.order.count)),
                                  title: L10n.format("第 %@ 题 / 共 %@ 题", L10n.number(max(1, model.state.index + 1)), L10n.number(model.state.order.count)), close: { focusedField = nil; dismiss() })
                    HStack {
                        Text(L10n.text(model.currentTier?.rawValue ?? "练习")).font(.subheadline.bold()).padding(9)
                            .background(Theme.leafSoft, in: .rect(cornerRadius: 10))
                        Text(L10n.text(model.set.title)).font(.subheadline).foregroundStyle(Theme.sub)
                        Spacer(minLength: 0)
                        ReadAloudButton(prompt: problem.map { L10n.text($0.prompt) })
                    }
                    if let problem {
                        Spacer(minLength: 0)
                        Text(L10n.text(problem.prompt)).font(Theme.titleFont(34, weight: .bold))
                            .multilineTextAlignment(.center).frame(maxWidth: .infinity, minHeight: 130)
                            .accessibilityLabel(L10n.format("题目 %@", L10n.text(problem.prompt))).accessibilityIdentifier("practice-question")
                        if let illustration = PracticeIllustration.forProblem(problem) {
                            PracticeIllustrationView(illustration: illustration)
                        }
                        if feedback {
                            Text(L10n.text(correctText(problem))).font(Theme.numberFont(44))
                                .padding(22).background(correct ? Theme.leafSoft : Theme.sunlight, in: .rect(cornerRadius: 22))
                            Spacer(minLength: 24)
                            FeedbackBand(correct: correct, title: correct ? "对了！" : "看一下正确答案",
                                         detail: L10n.text(problem.explanation ?? ""), identifier: "practice-continue", detailIdentifier: "practice-explanation") { model.next() }
                                .id("practice-feedback")
                        } else {
                            input(problem)
                            if case .wrong = model.viewState {
                                if problem.type == .mc {
                                    FeedbackBand(correct: false, title: "差一点，再试一次。",
                                                 detail: [problem.hint, problem.explanation].compactMap { $0 }.map { L10n.text($0) }.joined(separator: "\n"),
                                                 buttonTitle: "再试一次", identifier: "practice-retry", detailIdentifier: "practice-explanation") {
                                        choiceId = nil
                                        model.retryChoice()
                                        withAnimation { scroll.scrollTo("practice-choices", anchor: .center) }
                                    }
                                    .accessibilityIdentifier("practice-incorrect")
                                    .id("practice-feedback")
                                } else {
                                    BrandNotice(message: L10n.text(problem.hint ?? "差一点，再试一次。"), symbol: "arrow.counterclockwise", isError: true)
                                        .accessibilityIdentifier("practice-incorrect")
                                }
                            } else { Text("慢慢算，不着急").font(.footnote).foregroundStyle(Theme.sub) }
                            if problem.type != .mc {
                                Spacer(minLength: 12)
                                BrandPrimaryButton("检查答案") { submit(problem) }
                                    .disabled(!canSubmit(problem)).accessibilityIdentifier("practice-submit")
                            }
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
            .onChange(of: model.choiceFeedbackPending) { _, pending in
                if pending { withAnimation { scroll.scrollTo("practice-feedback", anchor: .bottom) } }
            }
            .onChange(of: focusedField) { _, id in
                if let id { withAnimation { scroll.scrollTo(id, anchor: .center) } }
            }
            }
        }.foregroundStyle(Theme.ink).background(Theme.pageBg.ignoresSafeArea()).toolbar(.hidden, for: .navigationBar)
            .onChange(of: model.problemSeq, initial: true) { _, _ in
                speech.cancel()
                focusedField = nil; choiceId = nil; fillText = ""; fieldValues = [:]
                focusedField = firstFieldID
            }
            .onChange(of: feedback) { _, showing in if showing { focusedField = nil } }
            .sensoryFeedback(.success, trigger: correct)
            .onDisappear { focusedField = nil; speech.cancel() }
    }
    @ViewBuilder private func input(_ p: Problem) -> some View {
        switch p.type {
        case .mc:
            VStack(spacing: 10) {
                ForEach(p.choices ?? []) { choice in
                    Button {
                        guard !model.choiceFeedbackPending else { return }
                        choiceId = choice.id
                        model.answerChoice(choice.id, for: p.id)
                    } label: {
                        HStack {
                            Image(systemName: choiceId == choice.id ? (model.choiceFeedbackPending ? "xmark.circle.fill" : "checkmark.circle.fill") : "circle")
                            Text(L10n.text(choice.label)).font(.headline).multilineTextAlignment(.leading)
                            Spacer(minLength: 0)
                        }.padding(16).frame(minHeight: 52).background(choiceId == choice.id ? (model.choiceFeedbackPending ? Theme.sunlight : Theme.leafSoft) : Theme.card, in: .rect(cornerRadius: 18))
                            .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(choiceId == choice.id ? (model.choiceFeedbackPending ? Theme.warn : Theme.brand) : Theme.line))
                    }.buttonStyle(.plain).disabled(model.choiceFeedbackPending)
                        .accessibilityAddTraits(choiceId == choice.id ? .isSelected : [])
                        .accessibilityIdentifier("practice-choice-\(choice.id)")
                }
            }.id("practice-choices")
        case .fill:
            answerField(text: $fillText, answer: p.answer, key: "fill", label: L10n.text("答案"), identifier: "practice-answer") {
                focusedField = nil
            }
        case .steps:
            ForEach(Array((p.fields ?? []).enumerated()), id: \.element.id) { index, field in
                VStack(alignment: .leading, spacing: 8) {
                    Text(L10n.text(field.label)).font(.headline)
                    let key = fieldKey(field, index: index)
                    let next = (p.fields ?? []).indices.contains(index + 1) ? index + 1 : nil
                    answerField(text: binding(key), answer: field.answer, key: key, label: L10n.text(field.label),
                                identifier: "practice-field-\(key)", hasNext: next != nil) {
                        if let next, let nextField = p.fields?[next] {
                            focusedField = focusID(fieldKey(nextField, index: next))
                        } else { focusedField = nil }
                    }
                }
            }
        }
    }

    private func answerField(text: Binding<String>, answer: AnswerValue?, key: String, label: String,
                             identifier: String, hasNext: Bool = false, onAdvance: @escaping () -> Void) -> some View {
        let id = focusID(key)
        return PracticeAnswerField(text: text, focusedField: $focusedField, fieldID: id,
                                   mode: PracticeAnswerInput.mode(for: answer), label: label,
                                   identifier: identifier, hasNext: hasNext, onAdvance: onAdvance)
            .padding(.horizontal, 16).frame(height: 60)
            .background(Theme.sky2.opacity(0.55), in: .rect(cornerRadius: Theme.rSm))
            .overlay(RoundedRectangle(cornerRadius: Theme.rSm)
                .strokeBorder(focusedField == id ? Theme.brand : Theme.line, lineWidth: focusedField == id ? 2 : 1))
            .id(id)
    }

    private func focusID(_ key: String) -> String { "\(model.problemSeq):\(key)" }
    private func fieldKey(_ field: Field, index: Int) -> String { field.id.isEmpty ? "f\(index)" : field.id }
    private var firstFieldID: String? {
        guard !feedback, let problem else { return nil }
        switch problem.type {
        case .fill: return focusID("fill")
        case .steps: return problem.fields?.first.map { focusID(fieldKey($0, index: 0)) }
        case .mc: return nil
        }
    }
    private func binding(_ key: String) -> Binding<String> { Binding(get: { fieldValues[key] ?? "" }, set: { fieldValues[key] = $0 }) }
    private func canSubmit(_ p: Problem) -> Bool {
        switch p.type {
        case .mc: false // Choice taps submit directly; there is no separate check button.
        case .fill: PracticeAnswerInput.isComplete(fillText, mode: PracticeAnswerInput.mode(for: p.answer))
        case .steps: (p.fields ?? []).enumerated().allSatisfy { i, f in
            PracticeAnswerInput.isComplete(fieldValues[fieldKey(f, index: i)] ?? "", mode: PracticeAnswerInput.mode(for: f.answer))
        }
        }
    }
    private func submit(_ p: Problem) {
        guard canSubmit(p) else { return }
        let editing = focusedField
        focusedField = nil
        switch p.type {
        case .mc: if let choiceId { model.answer(.choice(choiceId)) }
        case .fill: model.answer(.value(fillText))
        case .steps: model.answer(.fields(fieldValues))
        }
        if case .wrong = model.viewState { focusedField = editing ?? firstFieldID }
    }
}
