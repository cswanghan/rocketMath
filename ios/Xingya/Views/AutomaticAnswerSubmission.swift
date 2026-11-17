import SwiftUI

/// UI scheduling only: reaction time and deadline consumption live in GameModel.
private struct AutomaticAnswerSubmission: ViewModifier {
    let model: GameModel
    @Environment(\.scenePhase) private var scenePhase

    func body(content: Content) -> some View {
        content
            .task(id: model.pendingAnswer) {
                guard let answer = model.pendingAnswer, scenePhase == .active else { return }
                do { try await Task.sleep(for: .seconds(1)) }
                catch { return }
                guard !Task.isCancelled, scenePhase == .active else { return }
                model.submitAutomaticAnswer(answer)
            }
            .onChange(of: scenePhase) { _, phase in
                if phase != .active { model.cancelPendingAnswer() }
            }
            .onDisappear { model.cancelPendingAnswer() }
    }
}

extension View {
    func automaticallyChecksAnswers(for model: GameModel) -> some View {
        modifier(AutomaticAnswerSubmission(model: model))
    }
}
