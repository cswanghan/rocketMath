import Foundation

/// Input affordances only. Answers remain strings and the practice engine judges them.
nonisolated enum PracticeAnswerInput {
    enum Mode: Equatable { case numeric, text }

    static func mode(for answer: AnswerValue?) -> Mode {
        switch answer {
        case .number: return .numeric
        case .text(let text): return isComplete(text, mode: .numeric) ? .numeric : .text
        case nil: return .text
        }
    }

    static func replacing(_ current: String, range: NSRange, with replacement: String, mode: Mode) -> String? {
        let units = Array(current.utf16)
        guard range.location >= 0, range.length >= 0, range.location <= units.count,
              range.length <= units.count - range.location else { return nil }
        func isScalarBoundary(_ offset: Int) -> Bool {
            guard offset > 0, offset < units.count else { return true }
            return !(0xD800...0xDBFF).contains(units[offset - 1]) || !(0xDC00...0xDFFF).contains(units[offset])
        }
        guard isScalarBoundary(range.location), isScalarBoundary(range.location + range.length) else { return nil }
        guard let swiftRange = Range(range, in: current) else { return nil }
        let inserted = mode == .numeric ? normalizeWidth(replacement) : replacement
        let candidate = current.replacingCharacters(in: swiftRange, with: inserted)
        return mode == .text || isNumericBuffer(candidate) ? candidate : nil
    }

    static func isComplete(_ input: String, mode: Mode) -> Bool {
        if mode == .text { return !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        return isNumericBuffer(input) && Double(input)?.isFinite == true
    }

    static func togglingSign(in input: String) -> String {
        guard isNumericBuffer(input) else { return input }
        return input.hasPrefix("-") ? String(input.dropFirst()) : "-" + input
    }

    private static func isNumericBuffer(_ input: String) -> Bool {
        // Deliberately exclude exponent notation and mixed pasted content rather
        // than silently dropping letters. There is no answer-length-based limit.
        let unsigned = input.hasPrefix("-") ? input.dropFirst() : input[...]
        return unsigned.allSatisfy { "0123456789.".contains($0) }
            && unsigned.filter { $0 == "." }.count <= 1
    }

    private static func normalizeWidth(_ input: String) -> String {
        String(String.UnicodeScalarView(input.unicodeScalars.map { scalar in
            if (0xFF10...0xFF19).contains(scalar.value) { return UnicodeScalar(scalar.value - 0xFEE0)! }
            if scalar.value == 0xFF0E { return UnicodeScalar(0x2E)! }
            if scalar.value == 0xFF0D || scalar.value == 0x2212 { return UnicodeScalar(0x2D)! }
            return scalar
        }))
    }
}
