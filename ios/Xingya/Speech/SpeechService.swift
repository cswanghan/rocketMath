// User-requested reading uses media playback, including when the Ring/Silent
// switch is silent. No background audio capability; views cancel on departure.
// Race mode still has no reading control; this does not add automatic speech.
import AVFoundation
import Foundation

@MainActor
protocol SpeechOutput: AnyObject {
    var onCompletion: ((UUID) -> Void)? { get set }
    func speak(_ text: String, language: String, id: UUID) throws
    func stop()
}

@MainActor
protocol SpeechAudioSession {
    func activate() throws
    func deactivate()
}

@MainActor
struct SystemSpeechAudioSession: SpeechAudioSession {
    func activate() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playback, mode: .default, options: [.duckOthers])
        try session.setActive(true)
    }
    func deactivate() {
        try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    }
}

// Delegate callbacks can arrive after cancel/replay. Consume their IDs before
// hopping to the main actor, so an old callback cannot finish a new utterance.
nonisolated private final class SpeechRequestIDs: @unchecked Sendable {
    private let lock = NSLock()
    private var values: [ObjectIdentifier: UUID] = [:]
    func insert(_ utterance: AVSpeechUtterance, id: UUID) {
        lock.lock(); defer { lock.unlock() }
        values[ObjectIdentifier(utterance)] = id
    }
    func take(_ utterance: AVSpeechUtterance) -> UUID? {
        lock.lock(); defer { lock.unlock() }
        return values.removeValue(forKey: ObjectIdentifier(utterance))
    }
    func clear() { lock.lock(); defer { lock.unlock() }; values.removeAll() }
}

@MainActor
final class SystemSpeechOutput: NSObject, SpeechOutput, AVSpeechSynthesizerDelegate {
    private let synthesizer = AVSpeechSynthesizer()
    nonisolated private let requests = SpeechRequestIDs()
    var onCompletion: ((UUID) -> Void)?

    override init() {
        super.init()
        synthesizer.delegate = self
        synthesizer.usesApplicationAudioSession = true
    }
    func speak(_ text: String, language: String, id: UUID) throws {
        guard let voice = AVSpeechSynthesisVoice(language: language.hasPrefix("en") ? "en-US" : "zh-CN") else {
            throw SpeechPlaybackError.voiceUnavailable
        }
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = voice
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.95
        requests.insert(utterance, id: id)
        synthesizer.speak(utterance)
    }
    func stop() {
        requests.clear()
        synthesizer.stopSpeaking(at: .immediate)
    }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        complete(utterance)
    }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        complete(utterance)
    }
    nonisolated private func complete(_ utterance: AVSpeechUtterance) {
        guard let id = requests.take(utterance) else { return }
        Task { @MainActor [weak self] in self?.onCompletion?(id) }
    }
}

private enum SpeechPlaybackError: Error { case voiceUnavailable }

@MainActor
@Observable
final class SpeechService {
    private static let muteKey = "xingya.muted"
    private let output: any SpeechOutput
    private let audio: any SpeechAudioSession
    private let defaults: UserDefaults
    private var activeID: UUID?
    private(set) var isSpeaking = false
    var errorMessage: String?

    var isMuted: Bool {
        didSet {
            defaults.set(isMuted, forKey: Self.muteKey)
            if isMuted { cancel() }
        }
    }

    init(output: (any SpeechOutput)? = nil, audio: (any SpeechAudioSession)? = nil,
         defaults: UserDefaults = .standard) {
        self.output = output ?? SystemSpeechOutput()
        self.audio = audio ?? SystemSpeechAudioSession()
        self.defaults = defaults
        isMuted = defaults.bool(forKey: Self.muteKey)
        self.output.onCompletion = { [weak self] id in
            guard let self, self.activeID == id else { return }
            self.activeID = nil
            self.isSpeaking = false
            self.audio.deactivate()
        }
    }

    func cancel() {
        let wasActive = activeID != nil
        activeID = nil
        isSpeaking = false
        output.stop()
        if wasActive { audio.deactivate() }
    }

    func speak(_ text: String, userInitiated: Bool = false, language: String = L10n.language) {
        // An explicit tap must not silently disappear because of a legacy mute
        // preference with no visible control. Automatic speech still respects it.
        guard userInitiated || !isMuted else { return }
        let prepared = Self.spokenText(text, language: language)
        guard !prepared.isEmpty else { return }
        cancel()
        errorMessage = nil
        let id = UUID()
        activeID = id
        do {
            try audio.activate()
            isSpeaking = true
            try output.speak(prepared, language: language, id: id)
        } catch {
            cancel()
            errorMessage = L10n.text("朗读暂不可用，请检查媒体音量和音频输出后重试。")
        }
    }

    /// Prepare the localized prompt for speech without changing the on-screen math.
    static func spokenText(_ text: String, language: String) -> String {
        let english = language.hasPrefix("en")
        var spoken = LocalizedContent.text(text, language: language) ?? text
        let replacements = english
            ? [("×", " times "), ("÷", " divided by "), ("−", " minus "), ("+", " plus "), ("=", " equals "), ("≤", " less than or equal to "), ("≥", " greater than or equal to "), ("≠", " not equal to "), ("<", " less than "), (">", " greater than ")]
            : [("×", " 乘 "), ("÷", " 除以 "), ("−", " 减 "), ("+", " 加 "), ("=", " 等于 "), ("≤", " 小于等于 "), ("≥", " 大于等于 "), ("≠", " 不等于 "), ("<", " 小于 "), (">", " 大于 ")]
        for (symbol, word) in replacements { spoken = spoken.replacingOccurrences(of: symbol, with: word) }
        return spoken.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }.joined(separator: " ")
    }

    static func sayFact(prompt: String, answer: Int, language: String = L10n.language) -> String {
        let spoken = spokenText(prompt, language: language)
        let equals = language.hasPrefix("en") ? "equals" : "等于"
        return "\(spoken) \(equals) \(answer)"
    }
}
