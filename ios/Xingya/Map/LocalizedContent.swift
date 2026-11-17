import Foundation

/// Content is localized before decoding, so rendering, answer reveal, storage and
/// speech share the same language. English has its own complete pack directory.
/// Missing locale resources are an error, never a fallback to Chinese questions.
nonisolated enum LocalizedContent {
    static func data(_ fileName: String, language: String, bundle: Bundle = .main) throws -> Data {
        let directory = language.hasPrefix("en") ? "content/en" : "content"
        guard let url = bundle.url(forResource: fileName, withExtension: "json", subdirectory: directory) else {
            throw ContentPackError.notLoaded("Missing \(directory)/\(fileName).json")
        }
        return try Data(contentsOf: url)
    }
}

/// Exact curriculum strings for persisted mistakes. The packs themselves are
/// localized independently of this lookup, including all answer and source fields.
@MainActor
extension LocalizedContent {
    private struct TextLookup: Decodable {
        let strings: [String: String]
        let fieldLabels: [String: String]
    }
    private static let lookup: TextLookup? = {
        guard let data = try? data("strings", language: "en") else { return nil }
        return try? JSONDecoder().decode(TextLookup.self, from: data)
    }()
    private static let reverse: [String: String] = {
        var result: [String: String] = [:]
        for (zh, en) in (lookup?.strings ?? [:]).sorted(by: { $0.key < $1.key }) {
            // Bare counts have no language. Do not turn a numeric answer into
            // an arbitrary Chinese classifier when viewing historical records.
            if en.range(of: "[A-Za-z]", options: .regularExpression) != nil, result[en] == nil { result[en] = zh }
        }
        return result
    }()

    static func text(_ value: String, language: String) -> String? {
        let english = language.hasPrefix("en")
        let dictionary = english ? lookup?.strings ?? [:] : reverse
        if let translated = dictionary[value] { return translated }
        // Stored step responses contain a bank-owned label followed by user input.
        // Translate only that label; preserve the child's actual answer.
        let labels = (lookup?.fieldLabels ?? [:]).map { english ? ($0.key, $0.value) : ($0.value, $0.key) }
            .sorted { $0.0.count > $1.0.count }
        var changed = false
        let parts = value.components(separatedBy: " , ").map { part in
            for (source, target) in labels where part.hasPrefix(source + " ") {
                changed = true
                let answer = String(part.dropFirst(source.count + 1))
                return target + " " + (dictionary[answer] ?? answer)
            }
            return dictionary[part] ?? part
        }
        return changed ? parts.joined(separator: " , ") : nil
    }
}
