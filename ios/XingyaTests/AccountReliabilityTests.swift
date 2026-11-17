import Foundation
import Testing
@testable import Xingya

@MainActor
private final class TestTokens: SecureTokenStore {
    var value: String?
    var failSave = false
    var failLoad = false
    var saves = 0
    var deletes = 0
    init(_ value: String? = nil) { self.value = value }
    func load(_ key: String) throws -> String? {
        if failLoad { throw TokenStorageError.unavailable }
        return value
    }
    func save(_ value: String, for key: String) throws {
        if failSave { throw TokenStorageError.unavailable }
        saves += 1
        self.value = value
    }
    func delete(_ key: String) throws { deletes += 1; value = nil }
}

@MainActor
private final class AuthFixture {
    let suite = "XingyaTests.auth.\(UUID().uuidString)"
    let defaults: UserDefaults
    let tokens = TestTokens("test-session")
    init() throws {
        defaults = UserDefaults(suiteName: suite)!
        defaults.set(try JSONEncoder().encode(AuthUser(id: 1, username: "test-a")), forKey: "xingya.auth.user")
    }
    func clean() { defaults.removePersistentDomain(forName: suite) }
    func session(status: Int = 200, body: String = "{\"ok\":true}", offline: Bool = false) -> AuthSession {
        AuthSession(defaults: defaults, secure: tokens) { request in
            if offline { throw URLError(.notConnectedToInternet) }
            return (Data(body.utf8), HTTPURLResponse(url: request.url!, statusCode: status,
                httpVersion: nil, headerFields: nil)!)
        }
    }
}

@Suite("账号可靠性回归")
@MainActor
struct AccountReliabilityTests {
    #if DEBUG
    @Test("截图安全存储从空白开始，隔离旧账号且不授予登录或会员")
    func screenshotStorageIsolation() throws {
        let suite = "com.hanwang.xingya.uitest.auth"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        defaults.set("stale-test-token", forKey: TokenMigration.tokenKey)
        defaults.set(try JSONEncoder().encode(AuthUser(id: 9, username: "stale-test-user")), forKey: "xingya.auth.user")
        let auth = AuthSession.forLaunch(arguments: ["UITEST_MEMORY", "UITEST_SECURE_MEMORY"])
        #expect(!auth.isLoggedIn)
        #expect(auth.token == nil)
        #expect(auth.user == nil)
        #expect(auth.lastError == nil)
        #expect(defaults.object(forKey: TokenMigration.tokenKey) == nil)
        let store = StoreKitService(readEntitlements: { [] }, finishTransactions: { _ in }, observeTransactions: false)
        #expect(!store.isPremium)
        #expect(!store.canUseCloud(auth))
    }

    @Test("测试安全存储按键隔离并且不持久化")
    func memoryTokensAreEphemeral() throws {
        let secure = InMemoryTokenStore()
        #expect(try secure.load("first") == nil)
        try secure.save("test-token", for: "first")
        #expect(try secure.load("first") == "test-token")
        #expect(try secure.load("second") == nil)
        #expect(try InMemoryTokenStore().load("first") == nil)
        try secure.delete("first")
        #expect(try secure.load("first") == nil)
    }

    #endif

    @Test("安全存储错误按应用语言显示")
    func localizedSecureStorageError() {
        let original = UserDefaults.standard.object(forKey: "appLanguage")
        defer {
            if let original { UserDefaults.standard.set(original, forKey: "appLanguage") }
            else { UserDefaults.standard.removeObject(forKey: "appLanguage") }
        }
        UserDefaults.standard.set("en", forKey: "appLanguage")
        #expect(TokenStorageError.unavailable.localizedDescription.hasPrefix("Unable to access secure sign-in storage."))
        UserDefaults.standard.set("zh-Hans", forKey: "appLanguage")
        #expect(TokenStorageError.unavailable.localizedDescription.hasPrefix("无法访问安全登录存储"))
    }

    @Test("200 + ok=true 才退出；本机进度与归属保留")
    func deleteSuccess() async throws {
        let fixture = try AuthFixture()
        defer { fixture.clean() }
        let auth = fixture.session()
        let storage = InMemoryStorage()
        storage.putStudent(.init(id: "local", createdAt: 1, xp: 80))
        #expect(await auth.deleteAccount())
        #expect(!auth.isLoggedIn)
        #expect(fixture.tokens.value == nil)
        #expect(storage.student(id: "local")?.xp == 80)
        #expect(auth.syncOwnership.allows(userId: 1, studentId: "local"))
    }

    @Test("200 的 false、缺字段、非布尔与 HTML 都不能退出或删本地状态")
    func invalidSuccessResponses() async throws {
        for body in ["{\"ok\":false}", "{}", "{\"ok\":\"true\"}", "<html>fallback</html>"] {
            let fixture = try AuthFixture()
            defer { fixture.clean() }
            let auth = fixture.session(body: body)
            let savedUser = fixture.defaults.data(forKey: "xingya.auth.user")
            #expect(!(await auth.deleteAccount()))
            #expect(auth.isLoggedIn)
            #expect(auth.user?.id == 1)
            #expect(fixture.tokens.value == "test-session")
            #expect(fixture.tokens.deletes == 0)
            #expect(fixture.defaults.data(forKey: "xingya.auth.user") == savedUser)
            #expect(auth.lastError != nil)
        }
    }

    @Test("HTTP 错误即使 ok=true 也保留会话，包括 401")
    func httpFailures() async throws {
        for status in [401, 403, 500, 503] {
            let fixture = try AuthFixture()
            defer { fixture.clean() }
            let auth = fixture.session(status: status)
            #expect(!(await auth.deleteAccount()))
            #expect(auth.isLoggedIn)
            #expect(fixture.tokens.deletes == 0)
        }
    }

    @Test("断网不当作删除成功")
    func networkFailure() async throws {
        let fixture = try AuthFixture()
        defer { fixture.clean() }
        let auth = fixture.session(offline: true)
        #expect(!(await auth.deleteAccount()))
        #expect(auth.isLoggedIn)
        #expect(fixture.tokens.deletes == 0)
        #expect(auth.lastError != nil)
    }

    @Test("登录只写安全存储，不写 UserDefaults token")
    func loginStorage() async throws {
        let fixture = try AuthFixture()
        defer { fixture.clean() }
        let auth = fixture.session(body: "{\"token\":\"new-test-session\",\"user\":{\"id\":1,\"username\":\"a\"}}")
        await auth.login(username: "a", password: "test-only")
        #expect(auth.isLoggedIn)
        #expect(fixture.tokens.value == "new-test-session")
        #expect(fixture.defaults.object(forKey: TokenMigration.tokenKey) == nil)
    }

    @Test("Keychain 写入失败不覆盖已有会话")
    func secureWriteFailure() async throws {
        let fixture = try AuthFixture()
        defer { fixture.clean() }
        let auth = fixture.session(body: "{\"token\":\"other-session\",\"user\":{\"id\":2,\"username\":\"b\"}}")
        fixture.tokens.failSave = true
        await auth.login(username: "b", password: "test-only")
        #expect(auth.user?.id == 1)
        #expect(auth.token == "test-session")
        #expect(fixture.defaults.object(forKey: TokenMigration.tokenKey) == nil)
        #expect(auth.lastError != nil)
    }

    @Test("一次迁移成功后清除明文；再次打开只从安全存储读取")
    func legacyTokenMigration() throws {
        let fixture = try AuthFixture()
        defer { fixture.clean() }
        fixture.tokens.value = nil
        fixture.defaults.set("legacy-test-session", forKey: TokenMigration.tokenKey)
        let first = fixture.session()
        #expect(first.isLoggedIn)
        #expect(fixture.tokens.value == "legacy-test-session")
        #expect(fixture.defaults.object(forKey: TokenMigration.tokenKey) == nil)
        let second = fixture.session()
        #expect(second.token == "legacy-test-session")
        #expect(fixture.tokens.saves == 1)
    }

    @Test("迁移失败保留唯一凭据和会话，下次可重试")
    func legacyMigrationFailure() throws {
        let fixture = try AuthFixture()
        defer { fixture.clean() }
        fixture.tokens.value = nil
        fixture.tokens.failSave = true
        fixture.defaults.set("legacy-test-session", forKey: TokenMigration.tokenKey)
        let auth = fixture.session()
        #expect(auth.isLoggedIn)
        #expect(fixture.defaults.string(forKey: TokenMigration.tokenKey) == "legacy-test-session")
        #expect(auth.lastError != nil)
        fixture.tokens.failSave = false
        #expect(fixture.session().isLoggedIn)
        #expect(fixture.defaults.object(forKey: TokenMigration.tokenKey) == nil)
    }

    @Test("Keychain 暂不可读时保留旧凭据，不误当成无记录覆盖")
    func secureReadFailure() throws {
        let fixture = try AuthFixture()
        defer { fixture.clean() }
        fixture.tokens.failLoad = true
        fixture.defaults.set("legacy-test-session", forKey: TokenMigration.tokenKey)
        let auth = fixture.session()
        #expect(auth.isLoggedIn)
        #expect(fixture.tokens.saves == 0)
        #expect(fixture.defaults.string(forKey: TokenMigration.tokenKey) == "legacy-test-session")
        #expect(auth.lastError != nil)
    }

    @Test("安全存储优先，清除旧的明文副本")
    func secureTokenWins() throws {
        let fixture = try AuthFixture()
        defer { fixture.clean() }
        fixture.defaults.set("obsolete-test-session", forKey: TokenMigration.tokenKey)
        #expect(fixture.session().token == "test-session")
        #expect(fixture.defaults.object(forKey: TokenMigration.tokenKey) == nil)
    }

    @Test("换账号不能上传或拉取共享数据；重开应用仍然拒绝")
    func accountSwitchIsolation() async throws {
        let fixture = try AuthFixture()
        defer { fixture.clean() }
        let auth = fixture.session(body: "{\"token\":\"b-session\",\"user\":{\"id\":2,\"username\":\"b\"}}")
        auth.logout()
        await auth.login(username: "b", password: "test-only")
        #expect(auth.user?.id == 2)
        let storage = InMemoryStorage()
        storage.putStudent(.init(id: "local", createdAt: 1, xp: 80))
        var requests = 0
        let transport: APIClient.Transport = { _ in requests += 1; throw URLError(.badServerResponse) }
        do {
            _ = try await ProgressSync.sync(storage: storage, studentId: "local", auth: auth, transport: transport)
            Issue.record("B 不应上传 A 的本机数据")
        } catch {}
        do {
            _ = try await ProgressSync.pull(storage: storage, studentId: "local", auth: auth, transport: transport)
            Issue.record("B 不应拉取到 A 的本机数据集")
        } catch {}
        #expect(requests == 0)
        #expect(storage.student(id: "local")?.xp == 80)
        #expect(!fixture.session().syncOwnership.allows(userId: 2, studentId: "local"))
    }

    @Test("同步等待期间退出不应用迟到响应")
    func staleSyncResponse() async throws {
        let fixture = try AuthFixture()
        defer { fixture.clean() }
        let auth = fixture.session()
        let storage = InMemoryStorage()
        storage.putStudent(.init(id: "local", createdAt: 1, xp: 80))
        var snapshot = ProgressSync.export(storage: storage, studentId: "local")
        snapshot.student.xp = 999
        let data = try JSONEncoder().encode(snapshot)
        var sentSnapshot = false
        do {
            _ = try await ProgressSync.sync(storage: storage, studentId: "local", auth: auth) { request in
                if request.url?.path == "/api/native/membership" {
                    let body = "{\"ok\":true,\"active\":true,\"accountToken\":\"11111111-1111-4111-8111-111111111111\",\"expiresAt\":\(Date().addingTimeInterval(3600).timeIntervalSince1970 * 1000)}"
                    return (Data(body.utf8), HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!)
                }
                sentSnapshot = true
                auth.logout()
                return (data, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!)
            }
            Issue.record("不应应用已退出会话的响应")
        } catch {}
        #expect(sentSnapshot)
        #expect(storage.student(id: "local")?.xp == 80)
    }

    @Test("重置不解除数据归属，协议仍会合并云端记录")
    func resetKeepsOwnership() throws {
        let fixture = try AuthFixture()
        defer { fixture.clean() }
        let auth = fixture.session()
        let storage = InMemoryStorage()
        storage.putStudent(.init(id: "local", createdAt: 1, xp: 80))
        let cloud = ProgressSync.export(storage: storage, studentId: "local")
        storage.resetProgress(studentId: "local")
        storage.clearMistakes(studentId: "local")
        #expect(storage.student(id: "local")?.xp == 0)
        auth.syncOwnership.claimIfUnowned(userId: 2)
        #expect(!auth.syncOwnership.allows(userId: 2, studentId: "local"))
        ProgressSync.apply(cloud, to: storage, studentId: "local")
        #expect(storage.student(id: "local")?.xp == 80)
        #expect(SyncOwnership.resetMessage.contains("再次同步可能恢复"))
    }
}

@Suite("本机数据库安全打开")
@MainActor
struct StoreOpeningTests {
    @Test("失败保留主库和 sidecar 文件，用户重试才再次打开")
    func preservesFilesOnFailure() throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: dir) }
        let files = ["store", "store-shm", "store-wal"].map { dir.appendingPathComponent($0) }
        let sentinel = Data("test-only-sentinel".utf8)
        for file in files { try sentinel.write(to: file) }
        var attempts = 0
        let failed: Result<Int, Error> = StoreOpening.attempt {
            attempts += 1
            throw CocoaError(.fileReadNoPermission)
        }
        if case .success = failed { Issue.record("打开失败不能当成功") }
        #expect(attempts == 1)
        for file in files { #expect(try Data(contentsOf: file) == sentinel) }
        let retried = StoreOpening.attempt { attempts += 1; return 42 }
        #expect(try retried.get() == 42)
        #expect(attempts == 2)
        for file in files { #expect(try Data(contentsOf: file) == sentinel) }
    }
}
