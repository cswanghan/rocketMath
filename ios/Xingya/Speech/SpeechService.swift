// 语音反馈跟随所选语言。对应 Web 端 src/ui/speech.ts。
// SPEC §7：只在学习阶段的「重教」时朗读答案，竞速界面永不朗读——那是 App Store
// 上一次被拒的教训（读题会把限时训练变成听力测试）。

import AVFoundation
import Foundation

@MainActor
@Observable
final class SpeechService {
    private static let muteKey = "xingya.muted"

    private let synthesizer = AVSpeechSynthesizer()

    var isMuted: Bool {
        didSet {
            UserDefaults.standard.set(isMuted, forKey: Self.muteKey)
            if isMuted { cancel() }
        }
    }

    init() {
        isMuted = UserDefaults.standard.bool(forKey: Self.muteKey)
    }

    func cancel() {
        synthesizer.stopSpeaking(at: .immediate)
    }

    func speak(_ text: String) {
        guard !isMuted else { return }
        synthesizer.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: Self.spokenText(text, language: L10n.language))
        utterance.voice = AVSpeechSynthesisVoice(language: L10n.language == "en" ? "en-US" : "zh-CN")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.95
        synthesizer.speak(utterance)
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
