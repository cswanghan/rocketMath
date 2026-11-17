import XCTest

@MainActor
final class SunnyUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testChineseFlowAndScreenshots() throws { try mainFlow("zh-Hans", prefix: "zh") }
    func testEnglishFlowAndScreenshots() throws { try mainFlow("en", prefix: "en") }

    private func launch(_ lang: String, extra: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["UITEST_MEMORY", "SUNNY_UI_TEST", "-AppleLanguages", "(\(lang))", "-appLanguage", lang,
                               "-appAppearance", "light", "-selectedTerm", "upper", "-xingya.parentPin", ""] + extra
        app.launch()
        XCTAssertTrue(app.buttons["home-start"].waitForExistence(timeout: 15))
        return app
    }
    private func mainFlow(_ lang: String, prefix: String) throws {
        let app = launch(lang)
        capture(app, "\(prefix)-home")
        XCTAssertTrue(app.staticTexts[lang == "en" ? "Times tables" : "乘法口诀"].firstMatch.exists)
        app.buttons["home-start"].tap()
        XCTAssertTrue(app.staticTexts["fluency-question"].waitForExistence(timeout: 8))
        XCTAssertFalse(app.buttons["answer-submit"].exists)
        capture(app, "\(prefix)-practice-unanswered")
        let answer = try answerForQuestion(app, id: "fluency-question")
        digits(answer, app)
        XCTAssertFalse(app.buttons["answer-submit"].exists)
        XCTAssertTrue(app.buttons["fluency-continue"].waitForExistence(timeout: 5))
        capture(app, "\(prefix)-practice-correct")
        let timer = app.descendants(matching: .any)["session-timer"].firstMatch.label
        let progress = app.staticTexts["session-progress"].label
        Thread.sleep(forTimeInterval: 2) // proves feedback has no automatic advance or running countdown
        XCTAssertEqual(app.descendants(matching: .any)["session-timer"].firstMatch.label, timer)
        XCTAssertEqual(app.staticTexts["session-progress"].label, progress)
        app.buttons["fluency-continue"].tap()
        XCTAssertTrue(app.buttons["0"].waitForExistence(timeout: 5))
        XCTAssertNotEqual(app.staticTexts["session-progress"].label, progress)
        let nextTimer = app.descendants(matching: .any)["session-timer"].firstMatch.label
        Thread.sleep(forTimeInterval: 2)
        XCTAssertNotEqual(app.descendants(matching: .any)["session-timer"].firstMatch.label, nextTimer)
        let next = try answerForQuestion(app, id: "fluency-question")
        digits(next + 1, app)
        XCTAssertFalse(app.buttons["answer-submit"].exists)
        XCTAssertTrue(app.buttons["fluency-retry"].waitForExistence(timeout: 5))
        capture(app, "\(prefix)-practice-incorrect")
        app.buttons["fluency-retry"].tap()
        XCTAssertTrue(app.buttons["0"].waitForExistence(timeout: 5))
        XCTAssertEqual(try answerForQuestion(app, id: "fluency-question"), next)
        app.buttons["session-close"].tap()
        XCTAssertTrue(app.buttons["tab-1"].waitForExistence(timeout: 5))
        app.buttons["tab-1"].tap()
        XCTAssertTrue(app.staticTexts["report-total"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["report-total"].label.contains("2"))
        capture(app, "\(prefix)-report")
        app.buttons["tab-2"].tap()
        app.buttons["profile-account"].tap()
        XCTAssertTrue(app.buttons["account-login"].waitForExistence(timeout: 5))
        capture(app, "\(prefix)-account")
        XCTAssertFalse(app.buttons["membership-purchase"].isEnabled)
        app.buttons["account-login"].tap()
        XCTAssertTrue(app.buttons["auth-submit"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["auth-submit"].isEnabled)
        capture(app, "\(prefix)-auth")
        app.terminate()
    }
    func testPracticeWrongRevealAndParentGate() throws {
        let app = launch("en")
        let topic = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'topic-' AND label CONTAINS '3-digit column addition'")).firstMatch
        reveal(topic, app)
        topic.tap()
        XCTAssertTrue(app.buttons["Practice"].waitForExistence(timeout: 5))
        app.buttons["Practice"].tap()
        XCTAssertTrue(app.textFields["practice-answer"].waitForExistence(timeout: 5))
        let answer = try answerForQuestion(app, id: "practice-question")
        let field = app.textFields["practice-answer"]
        field.tap(); field.typeText(String(answer + 1))
        app.buttons["practice-submit"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["practice-incorrect"].firstMatch.waitForExistence(timeout: 5))
        app.buttons["practice-submit"].tap()
        XCTAssertTrue(app.buttons["practice-continue"].waitForExistence(timeout: 5))
        let progress = app.staticTexts["session-progress"].label
        Thread.sleep(forTimeInterval: 1)
        XCTAssertEqual(app.staticTexts["session-progress"].label, progress)
        capture(app, "en-practice-reveal")
        app.buttons["practice-continue"].tap()
        XCTAssertTrue(app.textFields["practice-answer"].waitForExistence(timeout: 5))
        let second = try answerForQuestion(app, id: "practice-question")
        field.tap(); field.typeText(String(second))
        app.buttons["practice-submit"].tap()
        XCTAssertTrue(app.buttons["practice-continue"].waitForExistence(timeout: 5))
        capture(app, "en-column-correct")
        app.buttons["session-close"].tap()
        app.buttons["tab-2"].tap()
        app.buttons["profile-parent"].tap()
        XCTAssertTrue(app.secureTextFields["输入4位数字"].waitForExistence(timeout: 5))
        app.secureTextFields["输入4位数字"].tap(); app.secureTextFields["输入4位数字"].typeText("1234")
        app.secureTextFields["再输一次"].tap(); app.secureTextFields["再输一次"].typeText("1234")
        app.buttons["parent-gate-submit"].tap()
        XCTAssertTrue(app.buttons["parent-summary"].waitForExistence(timeout: 5))
        capture(app, "en-parent")
        app.terminate()
    }
    func testRaceAndEmptyReport() throws {
        let app = launch("en")
        app.buttons["tab-1"].tap()
        XCTAssertTrue(app.staticTexts["report-total"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["report-total"].label, "0 questions")
        capture(app, "en-report-empty")
        app.buttons["tab-0"].tap()
        let topic = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'topic-' AND label CONTAINS 'Times tables'")).firstMatch
        reveal(topic, app); topic.tap()
        XCTAssertTrue(app.buttons["Race"].waitForExistence(timeout: 5)); app.buttons["Race"].tap()
        XCTAssertTrue(app.buttons["race-speed-standard"].waitForExistence(timeout: 5))
        app.buttons["race-speed-standard"].tap()
        XCTAssertTrue(app.buttons["0"].waitForExistence(timeout: 5))
        digits(try answerForQuestion(app, id: "race-question"), app)
        XCTAssertFalse(app.buttons["answer-submit"].exists)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "identifier == 'race-correct-count' AND label CONTAINS '1'")).firstMatch.waitForExistence(timeout: 4))
        capture(app, "en-race")
        app.buttons["session-close"].tap()
        XCTAssertTrue(app.buttons["home-start"].waitForExistence(timeout: 5))
        app.terminate()
    }
    func testAccessibilitySizeAndDarkAppearance() {
        let app = launch("en", extra: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL", "-appAppearance", "dark"])
        capture(app, "en-home-ax5-dark")
        app.buttons["tab-1"].tap()
        let count = app.staticTexts["report-total"]
        reveal(count, app)
        XCTAssertTrue(count.isHittable)
        capture(app, "en-report-ax5-dark")
        app.buttons["tab-2"].tap()
        let account = app.buttons["profile-account"]
        reveal(account, app); account.tap()
        XCTAssertTrue(app.buttons["account-login"].waitForExistence(timeout: 5))
        capture(app, "en-account-ax5-dark")
        app.terminate()
    }
    func testLanguageSelectionPersistsAfterRelaunch() {
        let app = XCUIApplication()
        app.launchArguments = ["UITEST_MEMORY", "SUNNY_UI_TEST", "-appAppearance", "light"]
        app.launch()
        XCTAssertTrue(app.buttons["tab-2"].waitForExistence(timeout: 15))
        app.buttons["tab-2"].tap()
        let picker = app.buttons["language-picker"]
        reveal(picker, app); picker.tap()
        app.buttons["English"].tap()
        XCTAssertTrue(app.buttons["tab-0"].waitForExistence(timeout: 5))
        app.buttons["tab-0"].tap()
        XCTAssertTrue(app.staticTexts["Learning path"].waitForExistence(timeout: 5))
        app.terminate(); app.launch()
        XCTAssertTrue(app.staticTexts["Learning path"].waitForExistence(timeout: 15))
        app.buttons["tab-2"].tap()
        reveal(picker, app); picker.tap(); app.buttons["简体中文"].tap()
        app.buttons["tab-0"].tap()
        XCTAssertTrue(app.staticTexts["学习路径"].waitForExistence(timeout: 5))
        app.terminate()
    }
    func testTimeoutStopsAndWaitsForContinue() {
        let app = launch("en")
        app.buttons["home-start"].tap()
        XCTAssertTrue(app.buttons["fluency-retry"].waitForExistence(timeout: 36))
        let timer = app.descendants(matching: .any)["session-timer"].firstMatch.label
        XCTAssertTrue(timer.contains("0"))
        capture(app, "en-practice-timeout")
        Thread.sleep(forTimeInterval: 1)
        XCTAssertTrue(app.buttons["fluency-retry"].exists)
        XCTAssertEqual(app.descendants(matching: .any)["session-timer"].firstMatch.label, timer)
        app.buttons["fluency-retry"].tap()
        XCTAssertTrue(app.buttons["0"].waitForExistence(timeout: 5))
        app.terminate()
    }
    private func answerForQuestion(_ app: XCUIApplication, id: String) throws -> Int {
        let item = app.descendants(matching: .any).matching(identifier: id).firstMatch
        XCTAssertTrue(item.waitForExistence(timeout: 5))
        let numbers = item.label.components(separatedBy: CharacterSet.decimalDigits.inverted).compactMap(Int.init)
        XCTAssertEqual(numbers.count, 2, item.label)
        let a = try XCTUnwrap(numbers.first), b = try XCTUnwrap(numbers.last)
        if item.label.contains("×") { return a * b }
        if item.label.contains("÷") { return a / b }
        if item.label.contains("+") { return a + b }
        return a - b
    }
    private func digits(_ value: Int, _ app: XCUIApplication) {
        for digit in String(value) { app.buttons[String(digit)].tap() }
    }
    private func reveal(_ item: XCUIElement, _ app: XCUIApplication) {
        for _ in 0..<18 { if item.isHittable { return }; app.swipeUp() }
        XCTAssertTrue(item.isHittable)
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
