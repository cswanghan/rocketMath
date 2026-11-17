// 家长区 4 位 PIN。这是防小孩误进，不是真正安全——明文存在 UserDefaults。
// 对应 Web 端 src/ui/pin.ts。

import Foundation

enum ParentPin {
    private static let key = "xingya.parentPin"

    static var hasPin: Bool {
        let v = UserDefaults.standard.string(forKey: key)
        return v != nil && !(v!.isEmpty)
    }

    static func set(_ pin: String) {
        UserDefaults.standard.set(pin, forKey: key)
    }

    static func check(_ pin: String) -> Bool {
        guard let saved = UserDefaults.standard.string(forKey: key), !saved.isEmpty else { return false }
        return saved == pin
    }

    /// UI 测试可清掉残留 PIN
    static func clearForTesting() {
        UserDefaults.standard.removeObject(forKey: key)
    }
}
