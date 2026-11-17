import XCTest

@MainActor
final class Grade4FluencyUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testChineseGrade4DivisionQuestionsAcceptCalculatedAnswers() throws { try divisionFlow(language: "zh-Hans") }
    func testEnglishGrade4DivisionQuestionsAcceptCalculatedAnswers() throws { try divisionFlow(language: "en") }

    private func divisionFlow(language: String) throws {
        let english = language == "en"
        let app = XCUIApplication()
        app.launchArguments = ["UITEST_MEMORY", "SUNNY_UI_TEST", "-AppleLanguages", "(\(language))",
                               "-appLanguage", language, "-selectedTerm", "upper"]
        app.launch()
        XCTAssertTrue(app.buttons["home-start"].waitForExistence(timeout: 15))
        app.buttons["grade-term-picker"].tap()
        app.buttons[english ? "Change grade" : "切换年级"].tap()
        let grade = app.buttons["grade-4"]
        XCTAssertTrue(grade.waitForExistence(timeout: 5)); grade.tap()
        XCTAssertTrue(app.buttons["home-start"].waitForExistence(timeout: 10))
        let division = app.buttons["topic-div_tens_oral"]
        for _ in 0..<20 {
            if division.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(division.isHittable); division.tap()
        let fluency = app.buttons[english ? "Fluency" : "口算"]
        XCTAssertTrue(fluency.waitForExistence(timeout: 5)); fluency.tap()
        // Distribution is tested with fixed seeds in Grade4FluencyTests. Here
        // exercise the real grade/track route, rendering, keypad and feedback.
        for index in 0..<6 {
            let question = app.staticTexts["fluency-question"]
            XCTAssertTrue(question.waitForExistence(timeout: 5))
            XCTAssertTrue(question.label.contains("÷"))
            let operands = question.label.components(separatedBy: CharacterSet.decimalDigits.inverted).compactMap(Int.init)
            XCTAssertEqual(operands.count, 2)
            let dividend = try XCTUnwrap(operands.first), divisor = try XCTUnwrap(operands.last)
            XCTAssertEqual(dividend % divisor, 0)
            for digit in String(dividend / divisor) { app.buttons[String(digit)].tap() }
            app.buttons["answer-submit"].tap()
            XCTAssertTrue(app.buttons["fluency-continue"].waitForExistence(timeout: 5))
            XCTAssertTrue(app.staticTexts[english ? "That's it!" : "对了！"].exists)
            if index < 5 { app.buttons["fluency-continue"].tap() }
        }
        app.buttons["session-close"].tap()
        XCTAssertTrue(app.buttons["home-start"].waitForExistence(timeout: 5))
        app.terminate()
    }
}
