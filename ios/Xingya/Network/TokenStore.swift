import Foundation
import Security

@MainActor
protocol SecureTokenStore {
    func load(_ key: String) throws -> String?
    func save(_ value: String, for key: String) throws
    func delete(_ key: String) throws
}

enum TokenStorageError: LocalizedError {
    case unavailable
    var errorDescription: String? {
        L10n.catalogText("无法访问安全登录存储，请解锁设备后重试。现有登录信息未被覆盖。")
    }
}

#if DEBUG
/// Opt-in UI-test storage. Starts empty; never creates a login or membership.
@MainActor
final class InMemoryTokenStore: SecureTokenStore {
    private var values: [String: String] = [:]
    func load(_ key: String) throws -> String? { values[key] }
    func save(_ value: String, for key: String) throws { values[key] = value }
    func delete(_ key: String) throws { values.removeValue(forKey: key) }
}
#endif

/// No delete-before-add: a failed update must not destroy the existing credential.
struct KeychainStore: SecureTokenStore {
    private func query(_ key: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrAccount as String: key,
         kSecAttrService as String: "com.hanwang.xingya"]
    }

    func save(_ value: String, for key: String) throws {
        let attributes: [String: Any] = [
            kSecValueData as String: Data(value.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        let status = SecItemUpdate(query(key) as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            let add = query(key).merging(attributes) { _, new in new }
            guard SecItemAdd(add as CFDictionary, nil) == errSecSuccess else {
                throw TokenStorageError.unavailable
            }
        } else if status != errSecSuccess {
            throw TokenStorageError.unavailable
        }
    }

    func load(_ key: String) throws -> String? {
        var search = query(key)
        search[kSecReturnData as String] = true
        search[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: AnyObject?
        let status = SecItemCopyMatching(search as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            throw TokenStorageError.unavailable
        }
        return token
    }

    func delete(_ key: String) throws {
        let status = SecItemDelete(query(key) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw TokenStorageError.unavailable
        }
    }
}

@MainActor
enum TokenMigration {
    static let tokenKey = "xingya.auth.token"

    static func load(defaults: UserDefaults, secure: any SecureTokenStore) throws -> String? {
        if let token = try secure.load(tokenKey) {
            defaults.removeObject(forKey: tokenKey)
            return token
        }
        guard let legacy = defaults.string(forKey: tokenKey) else { return nil }
        // Remove the old plaintext copy only after a confirmed secure write.
        try secure.save(legacy, for: tokenKey)
        defaults.removeObject(forKey: tokenKey)
        return legacy
    }
}
