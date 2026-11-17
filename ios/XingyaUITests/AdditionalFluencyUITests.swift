import XCTest

@MainActor
final class AdditionalFluencyUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testChineseAdditionalMultiplicationAcceptsNegativeAnswer() throws { try additionalFlow(language: "zh-Hans") }
    func testEnglishAdditionalMultiplicationAcceptsNegativeAnswer() throws { try additionalFlow(language: "en") }

    private func additionalFlow(language: String) throws {
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
        let track = app.buttons["topic-additional-rational_mul_div"]
        for _ in 0..<10 { if track.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(track.isHittable)
        XCTAssertTrue(app.staticTexts[english ? "More fluency practice" : "更多口算"].exists)
        track.tap()
        let start = app.buttons[english ? "Fluency" : "口算"]
        XCTAssertTrue(start.waitForExistence(timeout: 5)); start.tap()

        var negativeAnswered = false
        // Level A has one positive anchor. The existing engine excludes the
        // previous fact, so a negative question is guaranteed within two draws.
        // Use the normal random seed and solve whichever question is displayed.
        for _ in 0..<2 {
            let question = app.staticTexts["fluency-question"]
            XCTAssertTrue(question.waitForExistence(timeout: 5))
            XCTAssertTrue(question.label.contains("×"))
            let sign = app.buttons["key-sign"]
            XCTAssertTrue(sign.exists)
            let regex = try NSRegularExpression(pattern: "-?[0-9]+")
            let text = question.label as NSString
            let values = regex.matches(in: question.label, range: NSRange(location: 0, length: text.length))
                .compactMap { Int(text.substring(with: $0.range)) }
            XCTAssertEqual(values.count, 2)
            let answer = try XCTUnwrap(values.first) * XCTUnwrap(values.last)
            if answer < 0 { sign.tap() }
            for digit in String(abs(answer)) { app.buttons[String(digit)].tap() }
            app.buttons["answer-submit"].tap()
            XCTAssertTrue(app.buttons["fluency-continue"].waitForExistence(timeout: 5))
            XCTAssertTrue(app.staticTexts[english ? "That's it!" : "对了！"].exists)
            if answer < 0 { negativeAnswered = true; break }
            app.buttons["fluency-continue"].tap()
        }
        XCTAssertTrue(negativeAnswered, "The newly reachable multiplication track accepted a calculated negative answer")
        app.terminate()
    }
}
