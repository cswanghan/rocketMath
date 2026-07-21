// 语音反馈（zh-CN）。对应 Web 端 src/ui/speech.ts。
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
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "zh-CN")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.95
        synthesizer.speak(utterance)
    }

    /// 把题干 + 答案念成中文，例如 "2 乘 5 等于 10"。
    static func sayFact(prompt: String, answer: Int) -> String {
        let spoken = prompt
            .replacingOccurrences(of: "×", with: "乘")
            .replacingOccurrences(of: "÷", with: "除以")
            .replacingOccurrences(of: "−", with: "减")
        return "\(spoken) 等于 \(answer)"
    }
}
