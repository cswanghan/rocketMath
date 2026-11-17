// Captures the account membership/paywall screen for review materials.
// Isolated SwiftData + secure-token memory; no login, entitlement, or purchase is fabricated.
import XCTest

@MainActor
final class PaywallScreenshotUITests: XCTestCase {
    private enum FlowFailure: Error { case assertion }

    override func setUp() {
        continueAfterFailure = false
    }

    func testMembershipPaywallScreenshot() throws {
        try captureMembership(english: false)
    }

    func testEnglishMembershipPaywallScreenshot() throws {
        try captureMembership(english: true)
    }

    private func captureMembership(english: Bool) throws {
        func localized(_ zh: String, _ en: String) -> String { english ? en : zh }
        let app = XCUIApplication()
        app.launchArguments += ["-AppleLanguages", english ? "(en)" : "(zh-Hans)",
                                "-AppleLocale", english ? "en_US" : "zh_CN",
                                "-appLanguage", english ? "en" : "zh-Hans",
                                "UITEST_MEMORY", "UITEST_SECURE_MEMORY", "SUNNY_UI_TEST",
                                "-xingya.timelock", "", "-xingya.parentPin", ""]
        app.launch()

        try require(app.buttons["home-menu"].waitForExistence(timeout: 10), "Home must load", in: app)
        if !english { try verifyReportFooter(app) }
        try selectTab("我的", identifier: "person.fill", in: app)
        let account = app.buttons["profile-account"]
        try require(account.waitForExistence(timeout: 5) && account.isHittable, "我的页应有账号入口", in: app)
        account.tap()
        try require(app.navigationBars[localized("账号", "Account")].waitForExistence(timeout: 5), "应打开账号页", in: app)

        try require(app.buttons["account-login"].exists, "Capture must start signed out", in: app)
        try require(!app.descendants(matching: .any)["account-auth-error"].exists,
                    "A secure-storage error must never appear in review captures", in: app)

        let purchase = app.buttons["membership-purchase"]
        let restore = app.buttons["membership-restore"]
        let unavailable = app.staticTexts[localized("暂时无法加载订阅。请稍后重试，仍可继续免费练习。", "Subscriptions are unavailable right now. Try again later; free practice is still available.")]
        let loading = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", localized("正在加载 / 验证会员…", "Loading / verifying membership…")))
        // The List itself may report isHittable == false even with visible rows.
        // Identify the account container by its restore button, not hit testing.
        let collections = app.scrollViews.matching(identifier: "account-scroll")
        let tables = app.tables.matching(identifier: "account-scroll")
        var lists: [XCUIElement] = []
        try waitUntil("应找到包含恢复购买的账号滚动容器", in: app) {
            lists = collections.allElementsBoundByIndex + tables.allElementsBoundByIndex
            return lists.count == 1
        }
        let list = lists[0]
        try require(scrollTo(restore, in: list), "账号页应露出恢复购买", in: app)
        try waitUntil("商品加载/权益刷新应结束，并显示商品或明确的空目录提示", in: app, timeout: 45) {
            restore.isEnabled && loading.count == 0 && (purchase.exists || unavailable.exists)
        }

        let hasProduct = purchase.exists
        if hasProduct {
            let names = app.staticTexts.matching(identifier: "membership-product-name")
            let name = names.element(boundBy: 0)
            try require(scrollTo(name, in: list, upward: false), "商品名应完整可见", in: app)
            try require(names.count == 1, "本地 StoreKit 应显示唯一月订的真实本地化名称", in: app)
            let prices = app.staticTexts.matching(identifier: "membership-price")
            try require(prices.count == 1, "商品应显示商店返回的价格与每月周期", in: app)
            let price = prices.element(boundBy: 0)
            try require(price.label.rangeOfCharacter(from: .decimalDigits) != nil,
                        "周期前应有实际价格，不能只有占位文案", in: app)
            try require(scrollTo(restore, in: list), "恢复购买应完整可见", in: app)
            try require(isVisible(name, in: list) && isVisible(price, in: list) && isVisible(purchase, in: list),
                        "商品名、价格/周期、购买与恢复入口应同屏可见", in: app)
            try require(!purchase.isEnabled, "Signed-out capture must not bypass authentication", in: app)
            try require(purchase.label == localized("订阅月度会员", "Subscribe monthly"), "应使用当前购买按钮文案", in: app)
        } else {
            try require(scrollTo(unavailable, in: list, upward: false), "空目录应明确显示不可用原因", in: app)
            try require(scrollTo(restore, in: list) && isVisible(unavailable, in: list),
                        "空目录提示与恢复入口应同屏可见", in: app)
        }
        try require(restore.label == localized("恢复购买", "Restore purchases") && restore.isEnabled,
                    "加载完成后恢复购买应可用", in: app)

        // Do not start a purchase. This is a local StoreKit mock catalog when the
        // scheme attaches Configuration.storekit; it is not a Sandbox/live purchase.
        let prefix = (english ? "en-US-" : "zh-Hans-") + (hasProduct ? "paywall" : "paywall-unavailable")
        attach(app, name: "\(prefix)-account")

        let renewal = app.staticTexts.matching(NSPredicate(format: "label == %@", localized("按月自动续订，费用由 Apple 账户支付。除非在当前周期结束至少 24 小时前取消，否则将续订；取消后可用至有效期结束。价格以商店显示和 Apple 购买确认页为准。", "Renews monthly and is charged to your Apple account unless cancelled at least 24 hours before the current period ends. Access continues until expiry after cancellation. The store and Apple confirmation sheet show the applicable price."))).firstMatch
        try require(scrollTo(renewal, in: list), "自动续订说明应完整可见", in: app)
        attach(app, name: "\(prefix)-renewal")

        // SwiftUI Link is exposed as a link or a button depending on OS version.
        let manage = try revealLink(localized("管理订阅", "Manage subscription"), in: list, app: app)
        let eula = try revealLink(localized("Apple 标准 EULA", "Apple standard EULA"), in: list, app: app)
        try require(isVisible(manage, in: list) && isVisible(eula, in: list), "管理订阅和标准 EULA 应同屏可见", in: app)
        try require(manage.isEnabled && eula.isEnabled, "管理订阅和 EULA 入口应可用", in: app)
        try require(loading.count == 0, "截图不能仍处于加载中", in: app)
        attach(app, name: "\(prefix)-terms")
    }

    private func verifyReportFooter(_ app: XCUIApplication) throws {
        app.buttons["tab-1"].tap()
        let list = app.scrollViews.firstMatch
        try require(list.waitForExistence(timeout: 5), "Report must be scrollable", in: app)
        let footer = app.staticTexts["分析保存在本机 · 离线可用"]
        try require(scrollTo(footer, in: list), "Report footer must scroll fully into view", in: app)
        let title = app.staticTexts["在家试一试"]
        let detail = app.staticTexts["请孩子说一说：这道题是怎么算出来的？"]
        try require(isVisible(title, in: list) && isVisible(detail, in: list),
                    "Try at home title and detail must be fully visible", in: app)
        try require(footer.frame.maxY < app.buttons["tab-1"].frame.minY,
                    "Report footer must remain above the tab bar", in: app)
        attach(app, name: "report-footer-verification")
    }

    private func selectTab(_ label: String, identifier: String, in app: XCUIApplication) throws {
        let tab = app.buttons["tab-2"]
        try require(tab.waitForExistence(timeout: 5), "Me tab must exist", in: app)
        tab.tap()
    }

    private func isVisible(_ element: XCUIElement, in list: XCUIElement) -> Bool {
        element.exists && !element.frame.isEmpty && list.frame.insetBy(dx: 2, dy: 6).contains(element.frame)
    }

    private func scrollTo(_ element: XCUIElement, in list: XCUIElement, upward: Bool = true) -> Bool {
        for _ in 0..<12 {
            if isVisible(element, in: list) { return true }
            // Short drags avoid skipping a row and keep gestures inside the sheet.
            let start = list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: upward ? 0.7 : 0.3))
            let end = list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: upward ? 0.3 : 0.7))
            start.press(forDuration: 0.05, thenDragTo: end)
        }
        return isVisible(element, in: list)
    }

    private func revealLink(_ label: String, in list: XCUIElement, app: XCUIApplication) throws -> XCUIElement {
        let links = app.links.matching(NSPredicate(format: "label == %@", label))
        let buttons = app.buttons.matching(NSPredicate(format: "label == %@", label))
        // Re-query after each scroll: List may not expose rows below the viewport yet.
        for _ in 0..<12 {
            let candidates = links.allElementsBoundByIndex + buttons.allElementsBoundByIndex
            let visible = candidates.filter { isVisible($0, in: list) && $0.isHittable }
            if visible.count == 1 { return visible[0] }
            try require(visible.count < 2, "\(label) 应只有一个可见目标", in: app)
            let start = list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.7))
            let end = list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3))
            start.press(forDuration: 0.05, thenDragTo: end)
        }
        try require(false, "应滚动至 \(label)", in: app)
        throw FlowFailure.assertion
    }

    private func waitUntil(_ message: String, in app: XCUIApplication, timeout: TimeInterval = 8,
                           _ condition: @escaping () -> Bool) throws {
        if condition() { return }
        let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
        try require(XCTWaiter.wait(for: [expectation], timeout: timeout) == .completed, message, in: app)
    }

    private func require(_ condition: Bool, _ message: String, in app: XCUIApplication,
                         file: StaticString = #filePath, line: UInt = #line) throws {
        guard condition else {
            let tree = XCTAttachment(string: app.debugDescription)
            tree.name = "失败元素树-\(message)"
            tree.lifetime = .keepAlways
            add(tree)
            attach(app, name: "失败界面")
            XCTFail(message, file: file, line: line)
            throw FlowFailure.assertion
        }
    }

    private func attach(_ app: XCUIApplication, name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }
}
