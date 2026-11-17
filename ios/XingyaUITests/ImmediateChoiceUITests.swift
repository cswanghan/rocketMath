import XCTest

@MainActor
final class ImmediateChoiceUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testChineseChoiceTapShowsFeedbackWithoutSubmitting() { choiceFlow(language: "zh-Hans") }
    func testEnglishChoiceTapShowsFeedbackWithoutSubmitting() { choiceFlow(language: "en") }

    private func reveal(_ element: XCUIElement, app: XCUIApplication) {
        for _ in 0..<15 { if element.isHittable { return }; app.swipeUp() }
        XCTAssertTrue(element.isHittable)
    }

    private func choiceFlow(language: String) {
        let english = language == "en"
        let app = XCUIApplication()
        app.launchArguments = ["UITEST_MEMORY", "SUNNY_UI_TEST", "-AppleLanguages", "(\(language))",
                               "-appLanguage", language, "-selectedTerm", "upper"]
        app.launch()
        XCTAssertTrue(app.buttons["home-start"].waitForExistence(timeout: 15))
        let clock = app.buttons["topic-read_clock"]
        reveal(clock, app: app); clock.tap()
        let practice = app.buttons[english ? "Practice" : "练习"]
        XCTAssertTrue(practice.waitForExistence(timeout: 5)); practice.tap()
        let correctChoice = app.buttons["practice-choice-a"]
        XCTAssertTrue(correctChoice.waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["practice-submit"].exists)
        reveal(correctChoice, app: app); correctChoice.tap()
        let next = app.buttons["practice-continue"]
        XCTAssertTrue(next.waitForExistence(timeout: 5), "The choice tap itself must judge the answer")
        XCTAssertTrue(app.staticTexts[english ? "That's it!" : "对了！"].exists)
        XCTAssertTrue(app.staticTexts["practice-explanation"].exists)
        XCTAssertFalse(app.staticTexts["practice-explanation"].label.isEmpty)
        XCTAssertFalse(app.buttons["practice-submit"].exists)
        reveal(next, app: app); next.tap()

        let wrongChoice = app.buttons["practice-choice-b"]
        XCTAssertTrue(wrongChoice.waitForExistence(timeout: 5))
        reveal(wrongChoice, app: app); wrongChoice.doubleTap()
        let incorrect = app.descendants(matching: .any)["practice-incorrect"].firstMatch
        XCTAssertTrue(incorrect.waitForExistence(timeout: 5), "Rapid taps must consume only one attempt")
        XCTAssertTrue(app.staticTexts[english ? "Not quite. Try once more." : "差一点，再试一次。"].exists)
        XCTAssertTrue(app.staticTexts["practice-explanation"].exists)
        XCTAssertFalse(app.staticTexts["practice-explanation"].label.isEmpty)
        XCTAssertFalse(app.buttons["practice-submit"].exists)
        XCTAssertFalse(app.buttons["practice-continue"].exists)
        let choices = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'practice-choice-'"))
        for choice in choices.allElementsBoundByIndex { XCTAssertFalse(choice.isEnabled) }
        let retry = app.buttons["practice-retry"]
        XCTAssertEqual(retry.label, english ? "Try again" : "再试一次")
        reveal(retry, app: app); retry.tap()
        XCTAssertTrue(correctChoice.waitForExistence(timeout: 5)); XCTAssertTrue(correctChoice.isEnabled)
        reveal(correctChoice, app: app); correctChoice.tap()
        XCTAssertTrue(next.waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts[english ? "That's it!" : "对了！"].exists)
        app.terminate()
    }
}
