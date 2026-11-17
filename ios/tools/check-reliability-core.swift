// Standalone smoke runner for non-macro production logic. No real user DB,
// Keychain, network, simulator, or app sandbox is accessed.
import Foundation

@MainActor
private final class MemoryTokens: SecureTokenStore {
    var value: String?
    var fails = false
    func load(_ key: String) throws -> String? { value }
    func save(_ value: String, for key: String) throws {
        if fails { throw TokenStorageError.unavailable }
        self.value = value
    }
    func delete(_ key: String) throws { value = nil }
}

@main
struct ReliabilityCoreCheck {
    @MainActor
    static func main() async throws {
        var checks = 0
        func check(_ condition: Bool, _ name: String) {
            precondition(condition, name)
            checks += 1
        }
        let suite = "XingyaCoreCheck.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let secure = MemoryTokens()
        defaults.set("fixture-only", forKey: TokenMigration.tokenKey)
        secure.fails = true
        do {
            _ = try TokenMigration.load(defaults: defaults, secure: secure)
            preconditionFailure("migration must fail")
        } catch {}
        check(defaults.string(forKey: TokenMigration.tokenKey) != nil, "preserve failed migration")
        secure.fails = false
        check(try TokenMigration.load(defaults: defaults, secure: secure) == "fixture-only", "migration result")
        check(defaults.object(forKey: TokenMigration.tokenKey) == nil, "remove plaintext after migration")
        defaults.set("stale-fixture", forKey: TokenMigration.tokenKey)
        check(try TokenMigration.load(defaults: defaults, secure: secure) == "fixture-only", "secure value wins")
        check(defaults.object(forKey: TokenMigration.tokenKey) == nil, "remove stale plaintext")
        let owner = SyncOwnership(defaults: defaults)
        owner.claimIfUnowned(userId: 1)
        owner.claimIfUnowned(userId: 2)
        check(owner.allows(userId: 1, studentId: "local"), "original owner remains")
        check(!SyncOwnership(defaults: defaults).allows(userId: 2, studentId: "local"), "second account blocked across reload")
        check(!owner.allows(userId: 1, studentId: "other"), "scope must match")
        do { try owner.requireOwner(userId: 2, studentId: "local"); preconditionFailure("must reject") } catch {}
        checks += 1

        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let files = ["store", "store-shm", "store-wal"].map { directory.appendingPathComponent($0) }
        let sentinel = Data("sentinel".utf8)
        for file in files { try sentinel.write(to: file) }
        var attempts = 0
        let result: Result<Int, Error> = StoreOpening.attempt { attempts += 1; throw CocoaError(.fileReadNoPermission) }
        if case .success = result { preconditionFailure("failure must remain failure") }
        check(attempts == 1, "no automatic replacement")
        for file in files { check(try Data(contentsOf: file) == sentinel, "original files intact") }
        check(try StoreOpening.attempt { 42 }.get() == 42, "retry can succeed")

        func response(_ status: Int, _ body: String) -> APIClient.Transport {
            { request in
                (Data(body.utf8), HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
            }
        }
        try await AccountDeletion.request(token: "fixture-only", transport: response(200, "{\"ok\":true}"))
        checks += 1
        for (status, body) in [(200, "{\"ok\":false}"), (200, "{}"), (200, "<html>fallback</html>"),
                               (200, "{\"ok\":\"true\"}"), (401, "{\"ok\":true}"), (500, "{\"ok\":true}")] {
            do {
                try await AccountDeletion.request(token: "fixture-only", transport: response(status, body))
                preconditionFailure("invalid deletion response accepted")
            } catch { checks += 1 }
        }
        do {
            try await AccountDeletion.request(token: "fixture-only") { _ in throw URLError(.notConnectedToInternet) }
            preconditionFailure("offline deletion accepted")
        } catch { checks += 1 }
        print("Reliability core: \(checks) checks passed")
    }
}
