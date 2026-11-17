import XCTest

@MainActor
final class CurriculumLocalizationUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    private func launch() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["UITEST_MEMORY", "SUNNY_UI_TEST", "-AppleLanguages", "(en)", "-appLanguage", "en", "-selectedTerm", "upper"]
        app.launch()
        XCTAssertTrue(app.buttons["home-start"].waitForExistence(timeout: 15))
        return app
    }
    private func assertEnglish(_ text: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertFalse(text.unicodeScalars.contains { (0x3400...0x9FFF).contains($0.value) }, text, file: file, line: line)
    }
    private func reveal(_ item: XCUIElement, app: XCUIApplication) {
        for _ in 0..<20 { if item.isHittable { return }; app.swipeUp() }
        XCTAssertTrue(item.isHittable)
    }

    func testEnglishClockChoicesHintRevealAndReadAloud() {
        let app = launch()
        let clock = app.buttons["topic-read_clock"]
        reveal(clock, app: app); clock.tap()
        XCTAssertTrue(app.buttons["Practice"].waitForExistence(timeout: 5)); app.buttons["Practice"].tap()
        let question = app.staticTexts["practice-question"]
        XCTAssertTrue(question.waitForExistence(timeout: 5)); assertEnglish(question.label)
        XCTAssertTrue(question.label.lowercased().contains("clock") || question.label.lowercased().contains("hand"))
        let listen = app.buttons["Listen"]
        XCTAssertTrue(listen.exists); listen.tap()
        let choices = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'practice-choice-'"))
        XCTAssertGreaterThanOrEqual(choices.count, 3)
        for choice in choices.allElementsBoundByIndex { assertEnglish(choice.label) }
        // All clock questions have the correct answer at ID a; b is a distractor.
        app.buttons["practice-choice-b"].tap()
        let submit = app.buttons["practice-submit"]
        reveal(submit, app: app); submit.tap()
        XCTAssertTrue(app.descendants(matching: .any)["practice-incorrect"].firstMatch.waitForExistence(timeout: 5))
        for text in app.staticTexts.allElementsBoundByIndex { assertEnglish(text.label) }
        reveal(submit, app: app); submit.tap()
        XCTAssertTrue(app.buttons["practice-continue"].waitForExistence(timeout: 5))
        for text in app.staticTexts.allElementsBoundByIndex { assertEnglish(text.label) }
        app.buttons["practice-continue"].tap()
        XCTAssertTrue(question.waitForExistence(timeout: 5)); assertEnglish(question.label)
        app.terminate()
    }

    func testAllGradesRemainSelectableInEnglish() {
        let app = launch()
        for grade in 3...9 {
            app.buttons["grade-term-picker"].tap(); app.buttons["Change grade"].tap()
            let option = app.buttons["grade-\(grade)"]
            reveal(option, app: app); option.tap()
            XCTAssertTrue(app.buttons["home-start"].waitForExistence(timeout: 10))
            XCTAssertTrue(app.buttons["grade-term-picker"].label.contains("Grade \(grade)"))
            for text in app.staticTexts.allElementsBoundByIndex { assertEnglish(text.label) }
        }
        app.terminate()
    }
}
