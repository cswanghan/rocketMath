import XCTest

@MainActor
final class PracticeKeyboardUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }
    override func tearDownWithError() throws {
        if (testRun?.failureCount ?? 0) > 0 {
            let app = XCUIApplication()
            let screenshot = XCTAttachment(screenshot: app.screenshot())
            screenshot.name = "keyboard-failure-screen"
            screenshot.lifetime = .keepAlways; add(screenshot)
            let hierarchy = XCTAttachment(string: app.debugDescription)
            hierarchy.name = "keyboard-failure-accessibility-tree"
            hierarchy.lifetime = .keepAlways; add(hierarchy)
        }
    }

    private func open(_ fixture: String, language: String = "zh-Hans") -> XCUIApplication {
        let app = XCUIApplication(), english = language == "en"
        app.launchArguments = ["UITEST_MEMORY", "SUNNY_UI_TEST", "PRACTICE_KEYBOARD_FIXTURE", fixture,
                               "-AppleLanguages", "(\(language))", "-appLanguage", language, "-selectedTerm", "upper"]
        app.launch()
        waitUntilHittable(app.buttons["home-start"], timeout: 15)
        let picker = app.buttons["grade-term-picker"]
        waitUntilHittable(picker); picker.tap()
        let changeGrade = app.buttons[english ? "Change grade" : "切换年级"]
        waitUntilHittable(changeGrade); changeGrade.tap()
        let grade = app.buttons["grade-4"]
        waitUntilHittable(grade); grade.tap()
        waitUntilHittable(app.buttons["home-start"], timeout: 15)
        let topic = app.buttons["topic-large_num_read"]
        reveal(topic, app: app); waitUntilHittable(topic); topic.tap()
        let practice = app.buttons[english ? "Practice" : "练习"]
        waitUntilHittable(practice); practice.tap()
        XCTAssertTrue(app.staticTexts["practice-question"].waitForExistence(timeout: 5))
        return app
    }

    private func waitUntilHittable(_ element: XCUIElement, timeout: TimeInterval = 10,
                                  file: StaticString = #filePath, line: UInt = #line) {
        let ready = XCTNSPredicateExpectation(predicate: NSPredicate(format: "hittable == true"), object: element)
        XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: timeout), .completed,
                       "Navigation target must be hittable before tapping: \(element.identifier)", file: file, line: line)
    }

    private func reveal(_ item: XCUIElement, app: XCUIApplication) {
        for _ in 0..<15 { if item.isHittable { return }; app.swipeUp() }
        XCTAssertTrue(item.isHittable)
    }
    private func enter(_ value: String, app: XCUIApplication) {
        for character in value {
            let key = character == "-" ? "sign" : character == "." ? "decimal" : String(character)
            app.buttons["practice-key-\(key)"].tap()
        }
    }
    private func assertFixedKeyboard(_ app: XCUIApplication) {
        XCTAssertTrue(app.buttons["practice-key-1"].waitForExistence(timeout: 5), "Numeric keyboard must open without first tapping the field")
        XCTAssertTrue(app.buttons["practice-key-decimal"].exists)
        XCTAssertTrue(app.buttons["practice-key-sign"].exists)
        XCTAssertFalse(app.keyboards.keys["q"].exists)
        XCTAssertFalse(app.keyboards.keys["Q"].exists)
        for key in (0...9).map(String.init) + ["decimal", "sign", "delete"] {
            XCTAssertTrue(app.buttons["practice-key-\(key)"].isHittable,
                          "A system keyboard popover must not block any fixed-pad key")
        }
        capture(app, "fixed-keyboard-ready-before-first-key")
    }
    private func check(_ app: XCUIApplication) {
        if app.buttons["practice-keyboard-done"].exists { app.buttons["practice-keyboard-done"].tap() }
        let button = app.buttons["practice-submit"]
        reveal(button, app: app); XCTAssertTrue(button.isEnabled); button.tap()
    }
    private func assertCorrect(_ app: XCUIApplication) {
        XCTAssertTrue(app.buttons["practice-continue"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["practice-key-1"].exists, "Feedback must dismiss the old numeric input")
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }

    func testChineseLargeNumbersRetryNextQuestionAndExit() {
        let app = open("large")
        assertFixedKeyboard(app)
        XCTAssertTrue(app.staticTexts["practice-question"].label.contains("两千零三十六万零五百"))
        app.buttons["practice-key-sign"].tap()
        XCTAssertFalse(app.buttons["practice-submit"].isEnabled)
        app.buttons["practice-key-delete"].tap()
        enter("20360509", app: app)
        let field = app.textFields["practice-answer"]
        XCTAssertEqual(field.value as? String, "20360509")
        check(app)
        XCTAssertTrue(app.descendants(matching: .any)["practice-incorrect"].firstMatch.waitForExistence(timeout: 5))
        assertFixedKeyboard(app)
        XCTAssertEqual(field.value as? String, "20360509")
        app.buttons["practice-key-delete"].tap(); app.buttons["practice-key-0"].tap()
        XCTAssertEqual(field.value as? String, "20360500")
        capture(app, "zh-fixed-keyboard-eight-digit-retry")
        check(app); assertCorrect(app)
        app.buttons["practice-continue"].tap()
        assertFixedKeyboard(app)
        XCTAssertTrue(app.staticTexts["practice-question"].label.contains("六十亿零三千"))
        XCTAssertEqual(field.value as? String, "答案")
        enter("6000003000", app: app)
        XCTAssertEqual(field.value as? String, "6000003000")
        capture(app, "zh-fixed-keyboard-ten-digit-next-question")
        // Leaving while editing must dismiss the input view and old responder.
        for _ in 0..<10 { if app.buttons["session-close"].isHittable { break }; app.swipeDown() }
        app.buttons["session-close"].tap()
        XCTAssertTrue(app.buttons["home-start"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["practice-key-1"].exists)
        app.terminate()
    }

    func testEnglishDecimalTextKeepsTrailingZeroAndRejectsSecondPoint() {
        let app = open("decimal", language: "en")
        assertFixedKeyboard(app)
        enter("4.08", app: app)
        app.buttons["practice-key-decimal"].tap() // No malformed second decimal separator.
        let field = app.textFields["practice-answer"]
        XCTAssertEqual(field.value as? String, "4.08")
        app.buttons["practice-key-0"].tap()
        app.buttons["practice-key-sign"].tap(); app.buttons["practice-key-sign"].tap()
        XCTAssertEqual(field.value as? String, "4.080")
        XCTAssertEqual(app.buttons["practice-keyboard-done"].label, "Done")
        capture(app, "en-fixed-keyboard-decimal-trailing-zero")
        check(app); assertCorrect(app)
        app.terminate()
    }

    func testStepKeyboardAdvancesFocusAndKeepsEveryFieldVisible() {
        let app = open("steps")
        assertFixedKeyboard(app)
        for (index, value) in ["9", "-1", "36", "41"].enumerated() {
            let field = app.textFields["practice-field-rmo_x1_f\(index + 1)"]
            XCTAssertTrue(field.waitForExistence(timeout: 5))
            XCTAssertTrue(field.isHittable, "The focused field must scroll above the keyboard")
            enter(value, app: app)
            XCTAssertEqual(field.value as? String, value)
            if index < 3 {
                XCTAssertFalse(app.buttons["practice-submit"].isEnabled)
                app.buttons["practice-keyboard-next"].tap()
                assertFixedKeyboard(app)
            }
        }
        capture(app, "zh-fixed-keyboard-fourth-step-visible")
        check(app); assertCorrect(app)
        app.terminate()
    }

    func testFractionAnswerRetainsTheSystemTextKeyboard() {
        let app = open("fraction", language: "en")
        let field = app.textFields["practice-answer"]
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["practice-key-1"].exists)
        field.typeText("3/9")
        XCTAssertEqual(field.value as? String, "3/9")
        capture(app, "en-fraction-system-keyboard")
        check(app); assertCorrect(app)
        app.terminate()
    }

    func testAngleIllustrationsKeepImmediateChoiceGrading() {
        let app = open("angles")
        var seen = Set<String>()
        for _ in 0..<3 {
            let question = app.staticTexts["practice-question"].label
            let answer = question.contains("周角") ? "360°" : question.contains("直角") ? "90°" : "180°"
            seen.insert(answer)
            let diagram = app.descendants(matching: .any)["practice-illustration"].firstMatch
            reveal(diagram, app: app)
            XCTAssertTrue(diagram.exists)
            capture(app, "angle-\(answer)-before-answer")
            XCTAssertTrue(app.buttons["read-aloud"].exists)
            XCTAssertFalse(app.buttons["practice-submit"].exists)
            let choice = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label CONTAINS %@", "practice-choice-", answer)).firstMatch
            reveal(choice, app: app); choice.tap()
            XCTAssertTrue(app.buttons["practice-continue"].waitForExistence(timeout: 5))
            XCTAssertFalse(app.buttons["practice-retry"].exists)
            let next = app.buttons["practice-continue"]
            reveal(next, app: app); next.tap()
        }
        XCTAssertEqual(seen, Set(["90°", "180°", "360°"]))
        app.terminate()
    }
}
