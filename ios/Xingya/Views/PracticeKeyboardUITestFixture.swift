#if DEBUG
import Foundation

/// Deterministic UI coverage using unmodified, bundled questions. This code is
/// excluded from Release and requires the existing in-memory UI-test launch mode.
enum PracticeKeyboardUITestFixture {
    static func replacement(arguments: [String] = ProcessInfo.processInfo.arguments) -> PracticeModel? {
        guard arguments.contains("UITEST_MEMORY"),
              let index = arguments.firstIndex(of: "PRACTICE_KEYBOARD_FIXTURE"),
              arguments.indices.contains(index + 1) else { return nil }
        let selection: [(Int, String)]
        switch arguments[index + 1] {
        case "large": selection = [(4, "lnr_c1"), (4, "lnr_ex1")]
        case "decimal": selection = [(4, "dpr_x1")]
        case "number-decimal": selection = [(5, "dmm_b_e5")]
        case "steps": selection = [(7, "rmo_x1")]
        case "fraction": selection = [(5, "fas_c1")]
        case "time": selection = [(3, "time_conversion_c7")]
        case "angles": selection = [(4, "ant_eb2"), (4, "ant_b1"), (4, "ant_c2")]
        default: return nil
        }
        do {
            let questions = try selection.compactMap { grade, id in
                try AppContent.load(grade: grade).practicePack.sets.flatMap(\.problems).first { $0.id == id }
            }
            guard questions.count == selection.count else { return nil }
            let set = ProblemSet(id: "keyboard-ui-fixture", title: "练习", pedagogy: "concept", maxTries: 2, problems: questions)
            let storage = InMemoryStorage()
            storage.putStudent(StudentRecord(id: "keyboard-ui", createdAt: 0, latencyGateMs: 30000, xp: 0))
            return PracticeModel(set: set, storage: storage, studentId: "keyboard-ui", seed: 42)
        } catch { return nil }
    }
}
#endif
