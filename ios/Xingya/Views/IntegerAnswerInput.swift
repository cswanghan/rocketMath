// UI-only integer entry. Engine rules and correctness checks stay unchanged.
nonisolated enum IntegerAnswerInput {
    static let maximumDigits = 5

    static func supportsNegativeAnswers(in track: Track) -> Bool {
        track.levels.contains { level in level.newFacts.contains { $0.answer < 0 } }
    }

    static func appending(_ digit: Int, to input: String) -> String {
        guard (0...9).contains(digit), validBuffer(input), digits(in: input).count < maximumDigits else { return input }
        return input + String(digit)
    }

    static func togglingSign(in input: String, allowed: Bool) -> String {
        guard allowed, validBuffer(input) else { return input }
        return input.hasPrefix("-") ? String(input.dropFirst()) : "-" + input
    }

    static func value(of input: String) -> Int? {
        guard validBuffer(input), !digits(in: input).isEmpty else { return nil }
        return Int(input)
    }

    private static func digits(in input: String) -> Substring {
        input.hasPrefix("-") ? input.dropFirst() : input[...]
    }

    private static func validBuffer(_ input: String) -> Bool {
        let content = digits(in: input)
        return content.count <= maximumDigits && content.allSatisfy { "0123456789".contains($0) }
    }
}
