import XCTest

@MainActor
final class AutomaticAnswerUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testChineseFluencyAutomaticallyChecksEditedSignedAnswers() throws { try fluency("zh-Hans") }
    func testEnglishFluencyAutomaticallyChecksEditedSignedAnswers() throws { try fluency("en") }
    func testChineseRaceAutomaticallyCountsAnswerOnce() throws { try race("zh-Hans") }
    func testEnglishRaceAutomaticallyCountsAnswerOnce() throws { try race("en") }

    private func openTrack(_ language: String, race: Bool) -> XCUIApplication {
        let app = XCUIApplication(), english = language == "en"
        app.launchArguments = ["UITEST_MEMORY", "SUNNY_UI_TEST", "-AppleLanguages", "(\(language))",
                               "-appLanguage", language, "-selectedTerm", "upper"]
        app.launch()
        XCTAssertTrue(app.buttons["home-start"].waitForExistence(timeout: 15))
        app.buttons["grade-term-picker"].tap()
        app.buttons[english ? "Change grade" : "切换年级"].tap()
        let grade = app.buttons["grade-7"]
        for _ in 0..<10 { if grade.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(grade.isHittable); grade.tap()
        let topic = app.buttons["topic-additional-rational_mul_div"]
        for _ in 0..<12 { if topic.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(topic.isHittable); topic.tap()
        let route = app.buttons[race ? (english ? "Race" : "竞速") : (english ? "Fluency" : "口算")]
        XCTAssertTrue(route.waitForExistence(timeout: 5)); route.tap()
        if race {
            XCTAssertTrue(app.buttons["race-speed-standard"].waitForExistence(timeout: 5))
            app.buttons["race-speed-standard"].tap()
        }
        XCTAssertTrue(app.buttons["key-sign"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["answer-submit"].exists)
        XCTAssertTrue(app.staticTexts[english ? "Answers check automatically after a 1-second pause." : "停止输入约 1 秒后自动检查"].exists)
        return app
    }

    private func calculate(_ app: XCUIApplication, questionId: String) throws -> Int {
        let question = app.staticTexts[questionId]
        XCTAssertTrue(question.waitForExistence(timeout: 5))
        let text = question.label as NSString
        let regex = try NSRegularExpression(pattern: "-?[0-9]+")
        let values = regex.matches(in: question.label, range: NSRange(location: 0, length: text.length))
            .compactMap { Int(text.substring(with: $0.range)) }
        XCTAssertEqual(values.count, 2)
        XCTAssertTrue(question.label.contains("×"))
        return try XCTUnwrap(values.first) * XCTUnwrap(values.last)
    }

    private func enter(_ value: Int, in app: XCUIApplication) {
        if value < 0 { app.buttons["key-sign"].tap() }
        for digit in String(abs(value)) { app.buttons[String(digit)].tap() }
    }

    private func fluency(_ language: String) throws {
        let app = openTrack(language, race: false)
        let question = app.staticTexts["fluency-question"].label
        app.buttons["key-sign"].tap()
        Thread.sleep(forTimeInterval: 1.2) // Observe a whole debounce interval for an incomplete answer.
        XCTAssertEqual(app.staticTexts["fluency-question"].label, question)
        XCTAssertTrue(app.staticTexts["fluency-answer"].label.hasSuffix("-"))
        XCTAssertFalse(app.buttons["fluency-retry"].exists)
        app.buttons["key-delete"].tap()
        app.buttons["9"].tap()
        app.buttons["key-delete"].tap()
        Thread.sleep(forTimeInterval: 1.2) // A deleted answer must not fire its old timer.
        XCTAssertFalse(app.buttons["fluency-retry"].exists)
        XCTAssertTrue(app.buttons["key-sign"].exists)

        let answer = try calculate(app, questionId: "fluency-question")
        enter(answer + 1, in: app)
        XCTAssertTrue(app.buttons["fluency-retry"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["answer-submit"].exists)
        let progress = app.staticTexts["session-progress"].label
        Thread.sleep(forTimeInterval: 1.2)
        XCTAssertTrue(app.buttons["fluency-retry"].exists)
        XCTAssertEqual(app.staticTexts["session-progress"].label, progress)
        app.buttons["fluency-retry"].tap()
        XCTAssertTrue(app.buttons["key-sign"].waitForExistence(timeout: 5))
        enter(answer, in: app)
        XCTAssertTrue(app.buttons["fluency-continue"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts[language == "en" ? "That's it!" : "对了！"].exists)
        let image = XCTAttachment(screenshot: app.screenshot())
        image.name = "\(language)-automatic-fluency"; image.lifetime = .keepAlways; add(image)
        app.terminate()
    }

    private func race(_ language: String) throws {
        let app = openTrack(language, race: true)
        app.buttons["key-sign"].tap()
        Thread.sleep(forTimeInterval: 1.2)
        XCTAssertTrue(app.staticTexts["race-correct-count"].label.contains("0"))
        app.buttons["key-delete"].tap()
        let question = app.staticTexts["race-question"].label
        enter(try calculate(app, questionId: "race-question"), in: app)
        let one = app.staticTexts.matching(NSPredicate(format: "identifier == 'race-correct-count' AND label CONTAINS '1'")).firstMatch
        XCTAssertTrue(one.waitForExistence(timeout: 5))
        XCTAssertNotEqual(app.staticTexts["race-question"].label, question)
        XCTAssertFalse(app.buttons["answer-submit"].exists)
        Thread.sleep(forTimeInterval: 1.2)
        XCTAssertTrue(one.exists, "A consumed timer cannot answer the following question again")
        XCTAssertEqual(app.staticTexts["race-answer"].label.trimmingCharacters(in: .whitespaces), "")
        let image = XCTAttachment(screenshot: app.screenshot())
        image.name = "\(language)-automatic-race"; image.lifetime = .keepAlways; add(image)
        app.buttons["session-close"].tap()
        XCTAssertTrue(app.buttons["home-start"].waitForExistence(timeout: 5))
        app.terminate()
    }
}
