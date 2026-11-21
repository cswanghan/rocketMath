import AVFoundation
import Foundation
import Testing
@testable import Xingya

@MainActor
private final class AudioStub: SpeechAudioSession {
    var activations = 0, deactivations = 0
    var fail = false
    func activate() throws {
        activations += 1
        if fail { throw URLError(.unknown) }
    }
    func deactivate() { deactivations += 1 }
}

@MainActor
private final class SpeechStub: SpeechOutput {
    var onCompletion: ((UUID) -> Void)?
    var requests: [(text: String, language: String, id: UUID)] = []
    var fail = false, finishImmediately = false
    var beforeSpeak: (() -> Void)?
    func speak(_ text: String, language: String, id: UUID) throws {
        beforeSpeak?()
        if fail { throw URLError(.unknown) }
        requests.append((text, language, id))
        if finishImmediately { onCompletion?(id) }
    }
    func stop() {}
}

@Suite("Explicit question reading")
@MainActor
struct SpeechServiceTests {
    private func fixture(muted: Bool = false) -> (SpeechService, SpeechStub, AudioStub, UserDefaults, String) {
        let name = "speech-test-\(UUID())", output = SpeechStub(), audio = AudioStub()
        let defaults = UserDefaults(suiteName: name)!
        defaults.set(muted, forKey: "xingya.muted")
        return (SpeechService(output: output, audio: audio, defaults: defaults), output, audio, defaults, name)
    }

    @Test("Manual reading bypasses an invisible legacy mute; automatic reading still respects it")
    func manualReading() {
        let (service, output, audio, defaults, name) = fixture(muted: true)
        defer { defaults.removePersistentDomain(forName: name) }
        service.speak("2 × 3", language: "en")
        #expect(output.requests.isEmpty && audio.activations == 0)
        output.beforeSpeak = { #expect(audio.activations == 1) }
        service.speak("2 × 3", userInitiated: true, language: "en")
        #expect(service.isSpeaking && service.isMuted)
        #expect(output.requests.first?.text == "2 times 3")
        #expect(output.requests.first?.language == "en")
        service.cancel()
        #expect(audio.deactivations == 1)
    }

    @Test("A late callback from an old question cannot stop new reading")
    func lateCompletion() throws {
        let (service, output, audio, defaults, name) = fixture()
        defer { defaults.removePersistentDomain(forName: name) }
        service.speak("第一题")
        let first = try #require(output.requests.last?.id)
        service.speak("第二题")
        let second = try #require(output.requests.last?.id)
        output.onCompletion?(first)
        #expect(service.isSpeaking && audio.deactivations == 1)
        output.onCompletion?(second)
        #expect(!service.isSpeaking && audio.deactivations == 2)
        output.onCompletion?(second); service.cancel()
        #expect(audio.deactivations == 2)
    }

    @Test("Leaving or interrupting reading invalidates pending completion")
    func cancel() throws {
        let (service, output, audio, defaults, name) = fixture()
        defer { defaults.removePersistentDomain(forName: name) }
        service.speak("第一题")
        let id = try #require(output.requests.last?.id)
        service.cancel(); service.cancel(); output.onCompletion?(id)
        #expect(!service.isSpeaking && audio.deactivations == 1)
    }

    @Test("Activation and voice failures show a retryable error and release the session", arguments: [true, false])
    func failures(activation: Bool) {
        let (service, output, audio, defaults, name) = fixture()
        defer { defaults.removePersistentDomain(forName: name) }
        audio.fail = activation; output.fail = !activation
        service.speak("第一题")
        #expect(!service.isSpeaking && service.errorMessage != nil)
        #expect(output.requests.isEmpty && audio.deactivations == 1)
        audio.fail = false; output.fail = false
        service.speak("第二题")
        #expect(service.isSpeaking && service.errorMessage == nil)
        service.cancel()
    }

    @Test("Synchronous completion and empty input do not leave a playing indicator")
    func immediateCompletion() {
        let (service, output, audio, defaults, name) = fixture()
        defer { defaults.removePersistentDomain(forName: name) }
        output.finishImmediately = true
        service.speak("  \n ")
        #expect(audio.activations == 0)
        service.speak("第一题")
        #expect(!service.isSpeaking && audio.deactivations == 1)
    }

    @Test("Explicit reading uses media playback, not the silent-switch-sensitive default")
    func playbackCategory() throws {
        let audio = SystemSpeechAudioSession()
        defer { audio.deactivate() }
        try audio.activate()
        #expect(AVAudioSession.sharedInstance().category == .playback)
        #expect(AVAudioSession.sharedInstance().categoryOptions.contains(.duckOthers))
    }
}
