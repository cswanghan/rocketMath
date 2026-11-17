import Foundation

/// Saved language is shared by SwiftUI's environment and dynamic content-pack strings.
enum L10n {
    nonisolated static var language: String {
        let saved = UserDefaults.standard.string(forKey: "appLanguage")
        if let saved, ["en", "zh-Hans"].contains(saved) { return saved }
        return Locale.preferredLanguages.first?.hasPrefix("en") == true ? "en" : "zh-Hans"
    }
    static var locale: Locale { Locale(identifier: language) }
    static func text(_ key: String) -> String {
        if language == "en", let content = LocalizedContent.text(key, language: language) { return content }
        return catalogText(key)
    }
    /// Foundation-only lookup is safe for LocalizedError's nonisolated requirement.
    nonisolated static func catalogText(_ key: String) -> String {
        guard let path = Bundle.main.path(forResource: language, ofType: "lproj"),
              let bundle = Bundle(path: path) else { return key }
        return bundle.localizedString(forKey: key, value: key, table: "Localizable")
    }
    static func format(_ key: String, _ arguments: CVarArg...) -> String {
        String(format: text(key), locale: locale, arguments: arguments)
    }
    static func number(_ value: Int) -> String { value.formatted(.number.locale(locale)) }
    static func percent(_ value: Double) -> String { value.formatted(.percent.precision(.fractionLength(0)).locale(locale)) }
    static func duration(_ seconds: Double) -> String {
        let formatter = DateComponentsFormatter()
        var calendar = Calendar.current; calendar.locale = locale
        formatter.calendar = calendar
        formatter.allowedUnits = seconds >= 60 ? [.minute] : [.second]
        formatter.unitsStyle = .abbreviated
        return formatter.string(from: max(0, seconds)) ?? number(0)
    }
}

extension L10n {
    static func questions(_ count: Int) -> String { format("question_count", count) }
    static func localSummary(_ data: MistakeSummaryData) -> String {
        guard language == "en" else { return localSummaryText(data) }
        var lines = [format("待关注 %@ 道", number(data.total)), format("答错 %@ · 偏慢 %@", number(data.wrongTotal), number(data.slowTotal))]
        for topic in data.topics.prefix(3) {
            lines.append("\(text(topic.topicTitle)): \(questions(topic.count)) · \(duration(Double(topic.avgMs) / 1000))")
        }
        lines.append(text("先理解方法，再慢慢练熟。"))
        return lines.joined(separator: "\n\n")
    }
}
