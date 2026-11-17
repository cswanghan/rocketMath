// Full native playthrough migrated to Sunny v3. Uses real motor calibration,
// real answers, explicit Continue and the actual model's phase transition.
import XCTest

@MainActor
final class PlaythroughUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }
    func testFullPlaythrough() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UITEST_MEMORY", "-AppleLanguages", "(zh-Hans)", "-appLanguage", "zh-Hans",
                               "-appAppearance", "light", "-selectedTerm", "upper", "-xingya.parentPin", ""]
        app.launch()
        XCTAssertTrue(app.staticTexts["热身 🖐️"].waitForExistence(timeout: 15))
        for trial in 1...10 {
            let targets = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH '请按 '"))
            XCTAssertEqual(targets.count, 1)
            let target = try XCTUnwrap(targets.firstMatch.label.split(separator: " ").last)
            Thread.sleep(forTimeInterval: 3) // measured calibration cadence, not a readiness wait
            app.buttons[String(target)].tap()
            if trial < 10 { XCTAssertTrue(app.staticTexts["\(trial + 1) / 10"].waitForExistence(timeout: 3)) }
        }
        XCTAssertTrue(app.buttons["home-start"].waitForExistence(timeout: 5))
        attach(app, "calibrated-home")
        app.buttons["home-start"].tap()
        XCTAssertTrue(app.buttons["fluency-retry"].waitForExistence(timeout: 10)) // actual timeout
        attach(app, "calibrated-timeout")
        app.buttons["fluency-retry"].tap()
        try solve(app)
        XCTAssertTrue(app.buttons["fluency-continue"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.staticTexts["对了！"].exists)
        app.buttons["fluency-continue"].tap()
        var phaseCompleted = false
        for _ in 0..<14 {
            try solve(app)
            XCTAssertTrue(app.buttons["fluency-continue"].waitForExistence(timeout: 3))
            XCTAssertTrue(app.staticTexts["对了！"].exists)
            app.buttons["fluency-continue"].tap()
            if app.staticTexts["这一阶段完成了"].exists {
                phaseCompleted = true
                attach(app, "phase-complete")
                app.buttons["fluency-continue"].tap()
            }
        }
        XCTAssertTrue(phaseCompleted, "Real take-off phase must complete")
        app.buttons["session-close"].tap()
        app.buttons["tab-1"].tap()
        XCTAssertTrue(app.staticTexts["report-total"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["report-total"].label, "16 道题")
        attach(app, "calibrated-report")
        app.buttons["tab-2"].tap()
        XCTAssertTrue(app.buttons["profile-parent"].exists)
        XCTAssertTrue(app.buttons["profile-account"].exists)
        app.terminate()
    }
    private func solve(_ app: XCUIApplication) throws {
        let question = app.staticTexts["fluency-question"]
        XCTAssertTrue(question.waitForExistence(timeout: 3))
        let digits = question.label.components(separatedBy: CharacterSet.decimalDigits.inverted).compactMap(Int.init)
        XCTAssertEqual(digits.count, 2)
        let a = try XCTUnwrap(digits.first), b = try XCTUnwrap(digits.last)
        let answer = question.label.contains("×") ? a * b : a / b
        for d in String(answer) { app.buttons[String(d)].tap() }
        app.buttons["answer-submit"].tap()
    }
    private func attach(_ app: XCUIApplication, _ name: String) {
        let image = XCTAttachment(screenshot: app.screenshot())
        image.name = name; image.lifetime = .keepAlways; add(image)
    }
}
