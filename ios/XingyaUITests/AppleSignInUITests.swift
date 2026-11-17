import XCTest

/// iPhone/iPad UI smoke: never presses Apple authorization or supplies an ID.
@MainActor
final class AppleSignInUITests: XCTestCase {
    func testChineseAuthButtons() { checkAuth(language: "zh-Hans") }
    func testEnglishAuthButtons() { checkAuth(language: "en") }
    func testCompletedAuthorizationBackendError() { checkAuth(language: "zh-Hans", completedFailure: true) }

    private func checkAuth(language: String, completedFailure: Bool = false) {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["UITEST_MEMORY", "UITEST_SECURE_MEMORY", "SUNNY_UI_TEST",
            "-AppleLanguages", "(\(language))", "-appLanguage", language, "-appAppearance", "light"]
        if completedFailure { app.launchArguments.append("UITEST_APPLE_COMPLETED_FAILURE") }
        app.launch()
        defer { app.terminate() }
        XCTAssertTrue(app.buttons["tab-2"].waitForExistence(timeout: 15))
        app.buttons["tab-2"].tap()
        app.buttons["profile-account"].tap()
        XCTAssertTrue(app.buttons["account-login"].waitForExistence(timeout: 5))
        app.buttons["account-login"].tap()
        XCTAssertTrue(app.buttons["auth-apple"].waitForExistence(timeout: 5))
        revealAppleButton(app)
        XCTAssertTrue(app.buttons["auth-apple"].isEnabled)
        XCTAssertTrue(app.buttons["auth-apple"].isHittable)
        XCTAssertTrue(app.textFields["auth-username"].exists)
        XCTAssertTrue(app.secureTextFields["auth-password"].exists)
        XCTAssertFalse(app.buttons["auth-submit"].isEnabled)
        let error = app.descendants(matching: .any)["auth-error"].firstMatch
        if completedFailure {
            XCTAssertTrue(error.waitForExistence(timeout: 5))
            XCTAssertTrue(error.isHittable)
            XCTAssertTrue(app.staticTexts["Apple 登录未配置或暂时不可用，请稍后重试。"].exists)
        } else {
            XCTAssertFalse(error.exists)
        }
        capture(app, "apple-login-\(language)")
        app.segmentedControls.buttons[language == "en" ? "Create account" : "注册"].tap()
        XCTAssertTrue(app.textFields["auth-email"].waitForExistence(timeout: 5))
        revealAppleButton(app)
        XCTAssertTrue(app.buttons["auth-apple"].isHittable)
        capture(app, "apple-register-\(language)")
    }

    private func revealAppleButton(_ app: XCUIApplication) {
        let button = app.buttons["auth-apple"]
        let scroll = app.scrollViews.containing(.button, identifier: "auth-apple").firstMatch
        // A sliver at a form sheet's lower edge can report isHittable. Verify
        // the whole official control is visible, without ever tapping it.
        XCTAssertTrue(scroll.exists)
        if !scroll.frame.insetBy(dx: 0, dy: 8).contains(button.frame) { scroll.swipeUp() }
        XCTAssertTrue(scroll.frame.contains(button.frame))
        XCTAssertTrue(button.isHittable)
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
