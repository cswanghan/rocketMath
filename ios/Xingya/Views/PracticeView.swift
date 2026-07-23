// Practice 答题界面：非限时，支持选择题(mc)/填空(fill)/多格(steps)。答错给提示可重试，
// 超 maxTries 揭示答案。顶部关卡进度条按 basic→consolidate→challenge 三档。视觉走原生 HIG。

import SwiftUI

struct PracticeView: View {
    @State private var model: PracticeModel
    @State private var choiceId: String?
    @State private var fillText = ""
    @State private var fieldValues: [String: String] = [:]
    @Environment(\.dismiss) private var dismiss

    init(model: PracticeModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        VStack(spacing: 16) {
            TierBar(current: model.currentTier)
            ScrollView {
                content.padding(.vertical, 8)
            }
        }
        .padding()
        .background(Theme.pageBackground.ignoresSafeArea())
        .navigationTitle(model.set.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Text("⭐ \(model.sessionXP)")
                    .font(.subheadline.weight(.medium))
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
        }
        .onChange(of: model.problemSeq) {
            choiceId = nil
            fillText = ""
            fieldValues = [:]
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.viewState {
        case .loading:
            ProgressView()

        case .present(let problem), .wrong(let problem, _):
            problemBody(problem, locked: false)

        case .correct(let problem, let firstTry):
            VStack(spacing: 16) {
                promptText(problem)
                Label(firstTry ? "答对了！一次就对 🎉" : "答对了 👍", systemImage: "checkmark.circle.fill")
                    .font(.headline)
                    .foregroundStyle(.green)
                if model.lastGainXP > 0 {
                    Text("+\(model.lastGainXP) 经验").font(.subheadline).foregroundStyle(.orange)
                }
                if let explanation = problem.explanation {
                    calloutText(explanation)
                }
                Button("下一题") { model.next() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }

        case .reveal(let problem):
            VStack(spacing: 16) {
                promptText(problem)
                Label("看一下正确答案", systemImage: "eye.fill")
                    .font(.headline)
                    .foregroundStyle(.orange)
                Text(correctText(problem))
                    .font(.title3.weight(.semibold))
                    .multilineTextAlignment(.center)
                if let explanation = problem.explanation {
                    calloutText(explanation)
                }
                Button("下一题") { model.next() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }

        case .complete(let ftc, let total):
            VStack(spacing: 16) {
                Text("🎓").font(.system(size: 64))
                Text("这一套练完啦").font(.title2.weight(.semibold))
                Text("一次答对 \(ftc) / \(total) 题")
                    .font(.headline)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
                Button("返回") { dismiss() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }
            .padding(.top, 40)
        }
    }

    // ----- 题目主体 ----------------------------------------------------------

    @ViewBuilder
    private func problemBody(_ problem: Problem, locked: Bool) -> some View {
        VStack(spacing: 20) {
            promptText(problem)

            if case .wrong(_, let tries) = model.viewState {
                Label(problem.hint ?? "再想想", systemImage: "lightbulb")
                    .font(.subheadline)
                    .foregroundStyle(.orange)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(Color.orange.opacity(0.12), in: .rect(cornerRadius: 12))
                Text("第 \(tries) 次尝试")
                    .font(.caption).foregroundStyle(.secondary)
            }

            switch problem.type {
            case .mc: choicesInput(problem)
            case .fill: fillInput(problem)
            case .steps: stepsInput(problem)
            }

            Button("确定") { submit(problem) }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(!canSubmit(problem))
        }
    }

    private func promptText(_ problem: Problem) -> some View {
        Text(problem.prompt)
            .font(.system(size: 40, weight: .bold, design: .monospaced))
            .foregroundStyle(Theme.ink)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
            .textSelection(.enabled)
            .padding(24)
            .background(Theme.card, in: .rect(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(.white, lineWidth: 2))
            .shadow(color: Theme.shadowColor.opacity(0.14), radius: 10, y: 6)
            .accessibilityLabel("题目 \(problem.prompt)")
    }

    private func calloutText(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 12))
    }

    // ----- 三种输入 ----------------------------------------------------------

    private func choicesInput(_ problem: Problem) -> some View {
        VStack(spacing: 12) {
            ForEach(problem.choices ?? []) { choice in
                Button {
                    choiceId = choice.id
                } label: {
                    HStack(spacing: 14) {
                        Image(systemName: choiceId == choice.id ? "largecircle.fill.circle" : "circle")
                            .font(.title2)
                            .foregroundStyle(choiceId == choice.id ? Color.accentColor : .secondary)
                        Text(choice.label)
                            .font(.title3)
                            .multilineTextAlignment(.leading)
                        Spacer()
                    }
                    .padding(18)
                    .background(
                        (choiceId == choice.id ? Color.accentColor.opacity(0.12) : Color(.secondarySystemBackground)),
                        in: .rect(cornerRadius: 14)
                    )
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(choiceId == choice.id ? [.isSelected] : [])
            }
        }
    }

    private func fillInput(_ problem: Problem) -> some View {
        TextField("答案", text: $fillText)
            .keyboardType(.numbersAndPunctuation)
            .font(.system(size: 34, weight: .heavy, design: .rounded))
            .foregroundStyle(Theme.ink)
            .multilineTextAlignment(.center)
            .padding(.vertical, 18)
            .background(Theme.card, in: .rect(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.brand.opacity(0.5), lineWidth: 2))
            .shadow(color: Theme.shadowColor.opacity(0.1), radius: 8, y: 4)
            .submitLabel(.done)
            .onSubmit { submit(problem) }
    }

    private func stepsInput(_ problem: Problem) -> some View {
        VStack(spacing: 14) {
            ForEach(Array((problem.fields ?? []).enumerated()), id: \.element.id) { i, field in
                HStack(spacing: 14) {
                    Text(field.label).font(.title3.weight(.medium))
                    TextField("", text: binding(for: field.id.isEmpty ? "f\(i)" : field.id))
                        .keyboardType(.numbersAndPunctuation)
                        .font(.system(size: 30, weight: .semibold, design: .rounded))
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 14)
                        .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: 14))
                }
            }
        }
    }

    private func binding(for key: String) -> Binding<String> {
        Binding(
            get: { fieldValues[key] ?? "" },
            set: { fieldValues[key] = $0 }
        )
    }

    // ----- 提交 --------------------------------------------------------------

    private func canSubmit(_ problem: Problem) -> Bool {
        switch problem.type {
        case .mc: return choiceId != nil
        case .fill: return !fillText.trimmingCharacters(in: .whitespaces).isEmpty
        case .steps:
            let fields = problem.fields ?? []
            return fields.enumerated().allSatisfy { i, f in
                !(fieldValues[f.id.isEmpty ? "f\(i)" : f.id] ?? "").trimmingCharacters(in: .whitespaces).isEmpty
            }
        }
    }

    private func submit(_ problem: Problem) {
        guard canSubmit(problem) else { return }
        switch problem.type {
        case .mc:
            if let choiceId { model.answer(.choice(choiceId)) }
        case .fill:
            model.answer(.value(fillText))
        case .steps:
            model.answer(.fields(fieldValues))
        }
    }
}

/// 关卡进度条：基础 → 夯实 → 拔高，点亮当前所在档。
private struct TierBar: View {
    let current: Difficulty?

    private let tiers: [(Difficulty, String)] = [
        (.basic, "基础"), (.consolidate, "夯实"), (.challenge, "拔高"),
    ]

    var body: some View {
        HStack(spacing: 6) {
            ForEach(tiers, id: \.0) { tier, label in
                Text(label)
                    .font(.caption.weight(.medium))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background(background(for: tier), in: .capsule)
                    .foregroundStyle(current == tier ? .white : .secondary)
            }
        }
    }

    private func background(for tier: Difficulty) -> some ShapeStyle {
        current == tier ? AnyShapeStyle(Color.accentColor) : AnyShapeStyle(Color(.secondarySystemFill))
    }
}
