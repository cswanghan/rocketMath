import AVFoundation
import SwiftUI

struct ReadAloudButton: View {
    let prompt: String?
    @Environment(SpeechService.self) private var speech
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Button {
            if speech.isSpeaking { speech.cancel() }
            else if let prompt { speech.speak(prompt, userInitiated: true) }
        } label: {
            Image(systemName: speech.isSpeaking ? "stop.circle.fill" : "speaker.wave.2")
                .frame(width: 44, height: 44)
        }
        .buttonStyle(.plain)
        .foregroundStyle(Theme.ink)
        .disabled(prompt == nil)
        .accessibilityIdentifier("read-aloud")
        .accessibilityLabel(L10n.text(speech.isSpeaking ? "停止朗读" : "听一听"))
        .onChange(of: prompt) { _, _ in speech.cancel() }
        .onChange(of: scenePhase) { _, phase in if phase != .active { speech.cancel() } }
        .onReceive(NotificationCenter.default.publisher(for: AVAudioSession.interruptionNotification)) { notification in
            if notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt == AVAudioSession.InterruptionType.began.rawValue {
                speech.cancel()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: AVAudioSession.routeChangeNotification)) { notification in
            if notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue {
                speech.cancel()
            }
        }
        .alert(L10n.text("无法播放朗读"), isPresented: Binding(
            get: { speech.errorMessage != nil },
            set: { if !$0 { speech.errorMessage = nil } }
        )) {
            Button(L10n.text("好")) { speech.errorMessage = nil }
        } message: { Text(speech.errorMessage ?? "") }
    }
}
