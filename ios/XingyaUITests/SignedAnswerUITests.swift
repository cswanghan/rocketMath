import XCTest

@MainActor
final class SignedAnswerUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testChineseSignedGradeSevenEntry() throws { try signedFlow(language: "zh-Hans") }
    func testEnglishSignedGradeSevenEntry() throws { try signedFlow(language: "en") }

    private func signedFlow(language: String) throws {
        let english = language == "en"
        let app = XCUIApplication()
        app.launchArguments = ["UITEST_MEMORY", "SUNNY_UI_TEST", "-AppleLanguages", "(\(language))",
                               "-appLanguage", language, "-selectedTerm", "upper"]
        app.launch()
        XCTAssertTrue(app.buttons["home-start"].waitForExistence(timeout: 15))
        app.buttons["grade-term-picker"].tap()
        app.buttons[english ? "Change grade" : "切换年级"].tap()
        let grade = app.buttons["grade-7"]
        for _ in 0..<10 { if grade.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(grade.isHittable); grade.tap()
        XCTAssertTrue(app.buttons["home-start"].waitForExistence(timeout: 10))
        let addition = app.buttons["topic-rational_mixed_ops"]
        for _ in 0..<20 { if addition.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(addition.isHittable); addition.tap()
        let start = app.buttons[english ? "Fluency" : "口算"]
        XCTAssertTrue(start.waitForExistence(timeout: 5)); start.tap()
        let sign = app.buttons["key-sign"]
        let submit = app.buttons["answer-submit"]
        XCTAssertTrue(sign.waitForExistence(timeout: 5))
        sign.tap()
        XCTAssertFalse(submit.isEnabled, "A sign without digits is not an answer")
        XCTAssertTrue(app.staticTexts["fluency-answer"].label.hasSuffix("-"))
        sign.tap()
        // Use the real selected question and an independent signed-addition
        // calculation. The key remains present for the entire signed track,
        // including any positive questions selected by the existing engine.
        for index in 0..<4 {
            let question = app.staticTexts["fluency-question"]
            XCTAssertTrue(question.waitForExistence(timeout: 5))
            XCTAssertTrue(sign.exists)
            XCTAssertTrue(question.label.contains("+"))
            let regex = try NSRegularExpression(pattern: "-?[0-9]+")
            let text = question.label as NSString
            let values = regex.matches(in: question.label, range: NSRange(location: 0, length: text.length))
                .compactMap { Int(text.substring(with: $0.range)) }
            XCTAssertEqual(values.count, 2)
            let answer = try XCTUnwrap(values.first) + XCTUnwrap(values.last)
            if answer < 0 { sign.tap() }
            for digit in String(abs(answer)) { app.buttons[String(digit)].tap() }
            XCTAssertTrue(submit.isEnabled); submit.tap()
            XCTAssertTrue(app.buttons["fluency-continue"].waitForExistence(timeout: 5))
            XCTAssertTrue(app.staticTexts[english ? "That's it!" : "对了！"].exists)
            if index < 3 { app.buttons["fluency-continue"].tap() }
        }
        app.terminate()
    }
}
