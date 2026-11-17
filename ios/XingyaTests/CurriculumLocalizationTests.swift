import Foundation
import Testing
@testable import Xingya

@Suite("Complete bilingual curriculum", .serialized)
@MainActor
struct CurriculumLocalizationTests {
    private func containsCJK(_ string: String) -> Bool {
        string.unicodeScalars.contains { (0x3400...0x9FFF).contains($0.value) || (0xF900...0xFAFF).contains($0.value) }
    }
    private func strings(_ value: Any) -> [String] {
        if let text = value as? String { return [text] }
        if let array = value as? [Any] { return array.flatMap(strings) }
        if let object = value as? [String: Any] { return object.values.flatMap(strings) }
        return []
    }

    @Test(arguments: 3...9)
    func completeEnglishContentAndSpeech(grade: Int) throws {
        let content = try AppContent.load(grade: grade, language: "en")
        for suffix in ["knowledge_map", "math_fluency_pack", "practice_pack"] {
            let data = try LocalizedContent.data("grade\(grade)_\(suffix)", language: "en")
            let values = strings(try JSONSerialization.jsonObject(with: data))
            #expect(!values.isEmpty)
            #expect(values.allSatisfy { !containsCJK($0) })
        }
        for set in content.practicePack.sets {
            for problem in set.problems {
                #expect(!containsCJK(SpeechService.spokenText(problem.prompt, language: "en")))
                #expect(!containsCJK(correctText(problem)))
                if let choice = problem.choices?.first(where: \.correct) {
                    #expect(PracticeCheck.isCorrect(problem, .choice(choice.id)))
                }
            }
        }
        for track in content.fluencyPack.tracks {
            for level in track.levels {
                for fact in level.newFacts {
                    #expect(!containsCJK(SpeechService.sayFact(prompt: fact.prompt, answer: fact.answer, language: "en")))
                }
            }
        }
    }

    @Test(arguments: 3...9)
    func sameQuestionsAnswersAndRoutesInBothLanguages(grade: Int) throws {
        let zh = try AppContent.load(grade: grade, language: "zh-Hans")
        let en = try AppContent.load(grade: grade, language: "en")
        #expect(zh.map.topics.map(\.id) == en.map.topics.map(\.id))
        #expect(zh.map.units.map(\.topicIds) == en.map.units.map(\.topicIds))
        #expect(zh.practicePack.sets.map(\.id) == en.practicePack.sets.map(\.id))
        for (original, translated) in zip(zh.practicePack.sets, en.practicePack.sets) {
            #expect(original.problems.map(\.id) == translated.problems.map(\.id))
            for (a, b) in zip(original.problems, translated.problems) {
                #expect(a.type == b.type && a.difficulty == b.difficulty)
                #expect(a.choices?.map(\.id) == b.choices?.map(\.id))
                #expect(a.choices?.map(\.correct) == b.choices?.map(\.correct))
                if case .number = a.answer { #expect(a.answer == b.answer) }
                if case .text(let text) = a.answer, !containsCJK(text) { #expect(a.answer == b.answer) }
                for (f, g) in zip(a.fields ?? [], b.fields ?? []) {
                    #expect(f.id == g.id)
                    if case .number = f.answer { #expect(f.answer == g.answer) }
                    if case .text(let text) = f.answer, !containsCJK(text) { #expect(f.answer == g.answer) }
                }
            }
        }
        for (a, b) in zip(zh.fluencyPack.tracks, en.fluencyPack.tracks) {
            #expect(a.trackId == b.trackId && a.enabled == b.enabled)
            #expect(a.levels.map(\.level) == b.levels.map(\.level))
            let originals = a.levels.flatMap(\.newFacts), translations = b.levels.flatMap(\.newFacts)
            #expect(originals.map(\.id) == translations.map(\.id))
            #expect(originals.map(\.answer) == translations.map(\.answer))
        }
        #expect(containsCJK(zh.map.textbook))
    }

    @Test func missingEnglishPackThrows() {
        #expect(throws: (any Error).self) { try LocalizedContent.data("missing_curriculum", language: "en") }
    }

    @Test func gradeAndTermLabelsHaveEnglish() {
        let previous = UserDefaults.standard.string(forKey: "appLanguage")
        defer { UserDefaults.standard.set(previous, forKey: "appLanguage") }
        UserDefaults.standard.set("en", forKey: "appLanguage")
        for grade in Grades.all {
            for label in [grade.label, grade.desc, grade.tag] {
                #expect(!containsCJK(L10n.text(label)))
            }
        }
        for term in [Term.upper, Term.lower] { #expect(!containsCJK(L10n.text(term.label))) }
    }

    @Test func speechOperatorsAndSavedContentFollowLocale() throws {
        #expect(SpeechService.spokenText("2 × 5 + 3 = 13", language: "en") == "2 times 5 plus 3 equals 13")
        #expect(SpeechService.sayFact(prompt: "12 ÷ 3", answer: 4, language: "en") == "12 divided by 3 equals 4")
        #expect(SpeechService.sayFact(prompt: "12 ÷ 3", answer: 4, language: "zh-Hans") == "12 除以 3 等于 4")
        let original = try AppContent.load(grade: 3, language: "zh-Hans")
        let english = try AppContent.load(grade: 3, language: "en")
        let a = try #require(original.practicePack.set(id: "read_clock"))
        let b = try #require(english.practicePack.set(id: "read_clock"))
        #expect(LocalizedContent.text(a.problems[0].prompt, language: "en") == b.problems[0].prompt)
        #expect(!containsCJK(SpeechService.spokenText(a.problems[0].prompt, language: "en")))
    }
}
