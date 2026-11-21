// Native member-only AI endpoint. Never fall back to the anonymous Web API.

import Foundation

@MainActor
enum SummarizeClient {
    struct Payload: Encodable {
        var selectedGrade: Int?
        var language: String
        var total: Int
        var wrongTotal: Int
        var slowTotal: Int
        var topics: [Topic]
        var slowest: [Slow]

        struct Topic: Encodable {
            var topic: String
            var wrong: Int
            var slow: Int
            var byDifficulty: [String: Int]
            var avgSeconds: Double?
            var maxSeconds: Double?
            var examples: [Example]
        }

        struct Example: Encodable {
            var prompt: String
            var yourAnswer: String
            var correctAnswer: String
            var seconds: Double?
            var slow: Bool?
        }

        struct Slow: Encodable {
            var topic: String
            var prompt: String
            var seconds: Double
        }
    }

    static func payload(from s: MistakeSummaryData, selectedGrade: Int? = nil, language: String = L10n.language) -> Payload {
        Payload(
            selectedGrade: selectedGrade.flatMap { (3...9).contains($0) ? $0 : nil },
            language: language.hasPrefix("en") ? "en" : "zh-Hans",
            total: s.total,
            wrongTotal: s.wrongTotal,
            slowTotal: s.slowTotal,
            topics: s.topics.prefix(8).map { t in
                Payload.Topic(
                    topic: t.topicTitle,
                    wrong: t.wrong,
                    slow: t.slow,
                    byDifficulty: t.byDifficulty,
                    avgSeconds: t.avgMs > 0 ? Double(t.avgMs) / 1000 : nil,
                    maxSeconds: t.maxMs > 0 ? Double(t.maxMs) / 1000 : nil,
                    examples: t.examples.map {
                        Payload.Example(
                            prompt: $0.prompt,
                            yourAnswer: $0.yourAnswer,
                            correctAnswer: $0.correctAnswer,
                            seconds: $0.elapsedMs.map { Double($0) / 1000 },
                            slow: $0.slow
                        )
                    }
                )
            },
            slowest: s.slowest.map {
                Payload.Slow(
                    topic: $0.topicTitle,
                    prompt: $0.prompt,
                    seconds: Double($0.elapsedMs) / 1000
                )
            }
        )
    }

    /// Only a valid remote response produces "AI"; all other sources are free local analysis.
    static func sourceLabel(_ source: String) -> String {
        source == "AI" ? "远程 AI 家长总结" : "本地免费分析"
    }

    /// 远程成功返回 (text, "AI")；失败保留明确的本地来源，不冒充会员云端结果。
    static func summarize(
        _ data: MistakeSummaryData,
        auth: AuthSession,
        studentId: String,
        selectedGrade: Int? = nil,
        language: String = L10n.language,
        transport: APIClient.Transport = APIClient.send
    ) async -> (text: String, source: String) {
        let local = localSummaryText(data)
        guard data.total > 0 else { return (local, "本地") }

        do {
            guard let token = auth.token, let userID = auth.user?.id, !auth.isBusy else { throw APIError.notAuthenticated }
            try auth.syncOwnership.requireOwner(userId: userID, studentId: studentId)
            let membership = try await MembershipClient.status(token: token, transport: transport)
            guard membership.isActive(), auth.token == token, auth.user?.id == userID, !auth.isBusy else {
                return (local, "本地（会员未验证）")
            }
            try auth.syncOwnership.requireOwner(userId: userID, studentId: studentId)
            let body = payload(from: data, selectedGrade: selectedGrade, language: language)
            let responseData = try await APIClient.request(
                "/api/native/summarize",
                method: "POST",
                token: token,
                body: body,
                transport: transport
            )
            guard auth.token == token, auth.user?.id == userID, !auth.isBusy else { return (local, "本地") }
            struct Resp: Decodable { var summary: String? }
            let resp = try APIClient.decode(Resp.self, from: responseData)
            if let s = resp.summary, !s.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return (s, "AI")
            }
        } catch {
            // fall through
        }
        return (local, "本地（AI 暂不可用）")
    }
}
