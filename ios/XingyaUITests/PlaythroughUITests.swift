// 端到端真机（模拟器）走一遍：热身探针 → 首页 → 答题 → 纠错 → 阶段推进。
//
// 这个测试真的在**读屏幕上的题**、算出答案、按数字键，所以它证明的是「这个 App
// 能玩」，而不是「代码能编译」。同时它顺手截图，截图既用于人工核对，将来也能
// 直接当 App Store 的素材来源。
//
// 注：UI 自动化只能用 XCTest（Swift Testing 目前不支持 XCUIApplication）。

import XCTest

final class PlaythroughUITests: XCTestCase {

    override func setUp() {
        continueAfterFailure = false
    }

    func testFullPlaythrough() throws {
        let app = XCUIApplication()
        app.launchArguments += ["-AppleLanguages", "(zh-Hans)", "UITEST_MEMORY"]
        // 清掉上一轮残留的时间锁，避免中途被休息屏挡住
        app.launchArguments += ["-xingya.timelock", ""]
        app.launch()

        try runProbe(app)
        attach(app, name: "02-知识地图首页")

        try runPractice(app)

        // fluency topic：滚回顶部点标题进入限时训练
        let trackLabel = app.staticTexts["乘法口诀"]
        for _ in 0..<12 where !trackLabel.isHittable { app.swipeDown() }
        XCTAssertTrue(trackLabel.isHittable, "首页应列出乘法口诀")
        trackLabel.tap()

        let onPlayScreen = app.staticTexts["起飞 Take-Off"].waitForExistence(timeout: 5)
        if !onPlayScreen { attachText(app.debugDescription, name: "调试-未进入答题页") }
        XCTAssertTrue(onPlayScreen, "点 track 后应进入答题页")

        try play(app, rounds: 14)
        attach(app, name: "04-答题进行中")

        try runRace(app)
    }

    // ----- Practice（非限时练习）--------------------------------------------

    private func runPractice(_ app: XCUIApplication) throws {
        let topic = app.staticTexts["三位数加法竖式"]
        XCTAssertTrue(scrollTo(topic, in: app), "地图应列出竖式练习 topic")
        topic.tap()

        // 关卡进度条 + 竖式题目应出现
        XCTAssertTrue(app.staticTexts["基础"].waitForExistence(timeout: 5), "应进入 Practice 并显示关卡进度条")
        attach(app, name: "07-竖式练习")

        // 连错两次触发揭示答案（maxTries=2），覆盖 wrong→reveal 链路
        let field = app.textFields.firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 3), "竖式题应有填空框")
        field.tap()
        field.typeText("999")
        app.buttons["确定"].tap()
        XCTAssertTrue(app.staticTexts["第 1 次尝试"].waitForExistence(timeout: 3), "答错应显示提示与尝试次数")

        let field2 = app.textFields.firstMatch
        field2.tap()
        field2.typeText("888")
        app.buttons["确定"].tap()
        XCTAssertTrue(app.staticTexts["看一下正确答案"].waitForExistence(timeout: 3), "连错两次应揭示答案")
        attach(app, name: "08-竖式揭示答案")

        // 揭示后进入下一题，然后退回地图
        app.buttons["下一题"].tap()
        app.navigationBars.buttons.firstMatch.tap() // 返回地图
        XCTAssertTrue(app.staticTexts["三位数加法竖式"].waitForExistence(timeout: 5), "应返回知识地图列表")
    }

    // ----- 竞速 --------------------------------------------------------------

    private func runRace(_ app: XCUIApplication) throws {
        app.buttons["竞速"].tap()
        XCTAssertTrue(app.staticTexts["标准"].waitForExistence(timeout: 5), "应显示竞速速度选择")
        attach(app, name: "05-竞速选速度")

        // 选最短的挑战档（60 秒），但测试里只答几题就截图，不等满时长
        app.staticTexts["挑战"].tap()

        // 答对几题证明竞速答题链路通
        for _ in 0..<6 {
            guard let (_, answer) = currentQuestion(app) else {
                _ = app.staticTexts.firstMatch.waitForExistence(timeout: 1)
                continue
            }
            type(answer, in: app)
            // 竞速键盘答完即提交，无「确定」；这里点确定按钮（RaceNumpad 仍有确定键）
            if app.buttons["确定"].exists { app.buttons["确定"].tap() }
        }
        attach(app, name: "06-竞速进行中")
    }

    // ----- 热身探针 ----------------------------------------------------------

    private func runProbe(_ app: XCUIApplication) throws {
        // 首次启动才有探针；已做过则直接进首页
        guard app.staticTexts["热身 🖐️"].waitForExistence(timeout: 10) else { return }
        attach(app, name: "01-热身探针")

        for step in 1...40 {
            guard let target = probeTarget(app) else { break } // 探针结束
            app.buttons[String(target)].tap()
            if step > 30 { XCTFail("探针没有在预期次数内结束") }
        }
        XCTAssertTrue(app.staticTexts["乘法口诀"].waitForExistence(timeout: 5), "探针结束后应进入知识地图首页")
    }

    /// 探针目标数字来自无障碍标签「请按 N」
    private func probeTarget(_ app: XCUIApplication) -> Int? {
        let predicate = NSPredicate(format: "label BEGINSWITH %@", "请按 ")
        let element = app.staticTexts.matching(predicate).firstMatch
        guard element.exists else { return nil }
        return Int(element.label.replacingOccurrences(of: "请按 ", with: ""))
    }

    // ----- 答题主循环 --------------------------------------------------------

    private func play(_ app: XCUIApplication, rounds: Int) throws {
        var answered = 0
        var corrections = 0
        var shotTaken = false

        for _ in 0..<(rounds * 3) where answered < rounds {
            // 纠错浮层：点「我记住了，再来一次」继续（会立即重测同一题）
            let correction = app.buttons["我记住了，再来一次"]
            if correction.exists {
                if !shotTaken {
                    attach(app, name: "03-纠错重教")
                    shotTaken = true
                }
                corrections += 1
                correction.tap()
                continue
            }
            // 阶段/过关庆祝
            for label in ["继续", "下一关"] where app.buttons[label].exists {
                app.buttons[label].tap()
            }

            guard let (prompt, answer) = currentQuestion(app) else {
                // 可能正处在浮层切换的间隙，稍等再看
                _ = app.staticTexts.firstMatch.waitForExistence(timeout: 1)
                continue
            }
            type(answer, in: app)
            app.buttons["确定"].tap()
            answered += 1
            XCTAssertFalse(prompt.isEmpty)
        }

        XCTAssertGreaterThanOrEqual(answered, rounds, "应至少完成 \(rounds) 道题")
        // 进度条应该在动：起飞阶段显示「连对 x/12」
        let progress = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "连对 ")).firstMatch
        XCTAssertTrue(progress.exists || corrections > 0, "应能看到连对进度或经历过纠错")
    }

    /// 从屏幕上读题并算出正确答案。无障碍标签形如「题目 6 × 7」。
    private func currentQuestion(_ app: XCUIApplication) -> (String, Int)? {
        let predicate = NSPredicate(format: "label BEGINSWITH %@", "题目 ")
        // 用 descendants 而不是限定 otherElements：SwiftUI 合并后的无障碍元素
        // 具体归到哪个类型不稳定，按标签找最可靠
        let element = app.descendants(matching: .any).matching(predicate).firstMatch
        guard element.exists else { return nil }
        let prompt = element.label.replacingOccurrences(of: "题目 ", with: "")
        guard let answer = evaluate(prompt) else { return nil }
        return (prompt, answer)
    }

    /// 只支持题库里出现的四则口算，算不出就返回 nil（测试会跳过这一轮）
    private func evaluate(_ prompt: String) -> Int? {
        let parts = prompt.split(separator: " ").map(String.init)
        guard parts.count == 3, let a = Int(parts[0]), let b = Int(parts[2]) else { return nil }
        switch parts[1] {
        case "×": return a * b
        case "÷": return b == 0 ? nil : a / b
        case "+": return a + b
        case "-", "−": return a - b
        default: return nil
        }
    }

    private func type(_ value: Int, in app: XCUIApplication) {
        for ch in String(value) {
            app.buttons[String(ch)].tap()
        }
    }

    // ----- 截图 --------------------------------------------------------------

    /// List 懒加载：屏幕外的 cell 不在树里，先滚到它可点为止。
    private func scrollTo(_ element: XCUIElement, in app: XCUIApplication, maxSwipes: Int = 12) -> Bool {
        var tries = 0
        while !element.isHittable && tries < maxSwipes {
            app.swipeUp()
            tries += 1
        }
        return element.isHittable
    }

    /// 失败时把元素树留在 xcresult 里，省得靠猜
    private func attachText(_ text: String, name: String) {
        let attachment = XCTAttachment(string: text)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func attach(_ app: XCUIApplication, name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }
}
