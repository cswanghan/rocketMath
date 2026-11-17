import Foundation
import Testing
import AuthenticationServices
import UIKit
@testable import Xingya

@MainActor
private final class AppleTestTokens: SecureTokenStore {
    var value: String?
    var failSave = false
    func load(_ key: String) throws -> String? { value }
    func save(_ value: String, for key: String) throws {
        if failSave { throw TokenStorageError.unavailable }
        self.value = value
    }
    func delete(_ key: String) throws { value = nil }
}

@MainActor
private final class AppleAuthFixture {
    let suite = "XingyaTests.apple.\(UUID().uuidString)"
    let defaults: UserDefaults
    let tokens = AppleTestTokens()
    init() { defaults = UserDefaults(suiteName: suite)! }
    func clean() { defaults.removePersistentDomain(forName: suite) }
    func response(_ request: URLRequest, _ body: String, status: Int = 200) -> (Data, URLResponse) {
        (Data(body.utf8), HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }
    var challengeBody: String {
        "{\"challengeId\":\"fixture-challenge\",\"expiresAt\":\(Date().timeIntervalSince1970 + 300)}"
    }
    var loginBody: String { "{\"token\":\"fixture-app-session\",\"user\":{\"id\":42,\"username\":\"apple_fixture\",\"role\":\"user\"}}" }
    var credential: AppleSignInCredential {
        .init(identityToken: "fixture-identity", authorizationCode: "fixture-code", fullName: nil)
    }
}

@Suite("原生 Apple 登录")
@MainActor
struct AppleSignInTests {
    @Test("系统成功回调：state 缺失仍交给后端 nonce 验证，明确不匹配则拒绝", arguments: ["matching", "missing", "mismatched", "empty"])
    func completedAuthorization(stateCase: String) async throws {
        let fixture = AppleAuthFixture()
        defer { fixture.clean() }
        var loginRequests = 0
        let auth = AuthSession(defaults: fixture.defaults, secure: fixture.tokens) { request in
            if request.url?.path == "/api/auth/apple-challenge" { return fixture.response(request, fixture.challengeBody) }
            loginRequests += 1
            return fixture.response(request, fixture.loginBody)
        }
        let origin = UIWindow(frame: CGRect(x: 0, y: 0, width: 600, height: 800))
        let other = UIWindow(frame: origin.frame)
        let button = ASAuthorizationAppleIDButton()
        origin.addSubview(button)
        var coordinator: AppleSignInButton.Coordinator!
        coordinator = .init(auth: auth, onSuccess: {}, performRequests: { controller in
            let request = controller.authorizationRequests.first as? ASAuthorizationAppleIDRequest
            #expect(request?.state == "fixture-challenge")
            #expect(request?.nonce?.count == 64)
            let provider = controller.presentationContextProvider
            #expect(provider?.presentationAnchor(for: controller) === origin)
            // Moving/removing the button after presentation must not change the origin.
            other.addSubview(button)
            #expect(provider?.presentationAnchor(for: controller) === origin)
            let state: String? = switch stateCase {
            case "matching": "fixture-challenge"
            case "missing": nil
            case "empty": ""
            default: "wrong-state"
            }
            let result = AppleSignInCompletion(state: state, identityToken: Data("fixture-identity".utf8),
                authorizationCode: Data("fixture-code".utf8))
            let unrelated = ASAuthorizationController(authorizationRequests: [ASAuthorizationAppleIDProvider().createRequest()])
            coordinator.complete(controller: unrelated, result: .failure(AppleSignInClientError.invalid))
            coordinator.complete(controller: controller, result: .success(result))
            coordinator.complete(controller: controller, result: .failure(AppleSignInClientError.invalid))
            // A retained provider remains safe even after the callback has completed.
            #expect(provider?.presentationAnchor(for: controller) === origin)
        })
        coordinator.button = button
        await auth.signInWithApple { challenge, nonce in
            try await coordinator.authorize(challenge: challenge, rawNonce: nonce)
        }
        let shouldLogin = stateCase == "matching" || stateCase == "missing"
        #expect(auth.isLoggedIn == shouldLogin)
        #expect((auth.lastError == nil) == shouldLogin)
        #expect(loginRequests == (shouldLogin ? 1 : 0))
        #expect((fixture.tokens.value != nil) == shouldLogin)
        #expect(!auth.isBusy)
    }

    @Test("延迟首次授权跨后台切换保留原 controller、nonce 和 state", arguments: [false, true])
    func delayedAuthorizationAcrossBackground(deviceClockAhead: Bool) async throws {
        let fixture = AppleAuthFixture()
        defer { fixture.clean() }
        var registeredHash: String?
        var submittedNonce: String?
        var loginRequests = 0
        let auth = AuthSession(defaults: fixture.defaults, secure: fixture.tokens) { request in
            let body = try #require(try JSONSerialization.jsonObject(with: request.httpBody!) as? [String: Any])
            if request.url?.path == "/api/auth/apple-challenge" {
                registeredHash = body["nonceHash"] as? String
                // A past timestamp models a device clock ahead of the server;
                // only the server may decide whether its challenge has expired.
                let expiry = deviceClockAhead ? 1 : Date().timeIntervalSince1970 + 1800
                return fixture.response(request, "{\"challengeId\":\"delayed-first-login\",\"expiresAt\":\(expiry)}")
            }
            loginRequests += 1
            submittedNonce = body["rawNonce"] as? String
            #expect(body["challengeId"] as? String == "delayed-first-login")
            let name = body["fullName"] as? [String: String]
            #expect(name?["givenName"] == "First")
            #expect(name?["familyName"] == "Authorization")
            return fixture.response(request, fixture.loginBody)
        }
        let origin = UIWindow(frame: CGRect(x: 0, y: 0, width: 600, height: 800))
        let button = ASAuthorizationAppleIDButton()
        origin.addSubview(button)
        var pendingController: ASAuthorizationController?
        let coordinator = AppleSignInButton.Coordinator(auth: auth, onSuccess: {}, performRequests: {
            pendingController = $0 // Deliberately return without delivering a callback.
        })
        coordinator.button = button
        let authorization = Task {
            await auth.signInWithApple { challenge, nonce in
                try await coordinator.authorize(challenge: challenge, rawNonce: nonce)
            }
        }
        defer { coordinator.detach() }
        for _ in 0..<100 where pendingController == nil { await Task.yield() }
        let controller = try #require(pendingController)
        let request = try #require(controller.authorizationRequests.first as? ASAuthorizationAppleIDRequest)
        let initialState = request.state
        let initialNonce = request.nonce
        #expect(auth.isBusy)
        #expect(loginRequests == 0)
        NotificationCenter.default.post(name: UIApplication.willResignActiveNotification, object: nil)
        NotificationCenter.default.post(name: UIApplication.didEnterBackgroundNotification, object: nil)
        button.removeFromSuperview()
        await Task.yield()
        #expect(auth.isBusy)
        #expect(auth.lastError == nil)
        #expect(controller.presentationContextProvider?.presentationAnchor(for: controller) === origin)
        NotificationCenter.default.post(name: UIApplication.willEnterForegroundNotification, object: nil)
        NotificationCenter.default.post(name: UIApplication.didBecomeActiveNotification, object: nil)
        origin.addSubview(button)
        #expect(request.state == initialState)
        #expect(request.nonce == initialNonce)
        coordinator.complete(controller: controller, result: .success(.init(
            state: nil, identityToken: Data("fixture-identity".utf8),
            authorizationCode: Data("fixture-code".utf8),
            fullName: .init(givenName: "First", familyName: "Authorization"))))
        await authorization.value
        #expect(auth.isLoggedIn)
        #expect(auth.lastError == nil)
        #expect(!auth.isBusy)
        #expect(loginRequests == 1)
        #expect(initialState == "delayed-first-login")
        #expect(initialNonce == registeredHash)
        #expect(AppleSignInNonce.hash(try #require(submittedNonce)) == registeredHash)
    }

    @Test("取消后重试使用新 nonce 与 challenge，旧 controller 回调不能完成新请求")
    func freshAttemptAfterCancellation() async throws {
        let fixture = AppleAuthFixture()
        defer { fixture.clean() }
        var hashes: [String] = []
        var challengeIds: [String] = []
        var loginRequests = 0
        let auth = AuthSession(defaults: fixture.defaults, secure: fixture.tokens) { request in
            let body = try #require(try JSONSerialization.jsonObject(with: request.httpBody!) as? [String: Any])
            if request.url?.path == "/api/auth/apple-challenge" {
                hashes.append(try #require(body["nonceHash"] as? String))
                let id = "attempt-\(hashes.count)"
                challengeIds.append(id)
                return fixture.response(request, "{\"challengeId\":\"\(id)\",\"expiresAt\":\(Date().timeIntervalSince1970 + 1800)}")
            }
            loginRequests += 1
            #expect(body["challengeId"] as? String == "attempt-2")
            #expect(AppleSignInNonce.hash(try #require(body["rawNonce"] as? String)) == hashes.last)
            return fixture.response(request, fixture.loginBody)
        }
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 600, height: 800))
        let button = ASAuthorizationAppleIDButton()
        window.addSubview(button)
        var previousController: ASAuthorizationController?
        var coordinator: AppleSignInButton.Coordinator!
        coordinator = .init(auth: auth, onSuccess: {}, performRequests: { controller in
            if let previousController {
                coordinator.complete(controller: previousController, result: .failure(AppleSignInClientError.invalid))
                #expect(auth.isBusy)
                coordinator.complete(controller: controller, result: .success(.init(
                    state: "attempt-2", identityToken: Data("fixture-identity".utf8),
                    authorizationCode: Data("fixture-code".utf8))))
            } else {
                previousController = controller
                coordinator.authorizationController(controller: controller,
                    didCompleteWithError: ASAuthorizationError(.canceled))
            }
        })
        coordinator.button = button
        for attempt in 1...2 {
            await auth.signInWithApple { challenge, nonce in
                try await coordinator.authorize(challenge: challenge, rawNonce: nonce)
            }
            #expect(auth.isLoggedIn == (attempt == 2))
            #expect(auth.lastError == nil)
            #expect(!auth.isBusy)
        }
        #expect(challengeIds == ["attempt-1", "attempt-2"])
        #expect(hashes.count == 2)
        #expect(Set(hashes).count == 2)
        #expect(loginRequests == 1)
    }

    @Test("完成回调缺少或损坏 token/code 时不发起登录", arguments: ["missing-token", "empty-token", "invalid-utf8", "missing-code", "empty-code"])
    func incompleteCallback(kind: String) async {
        let fixture = AppleAuthFixture()
        defer { fixture.clean() }
        var requests = 0
        let auth = AuthSession(defaults: fixture.defaults, secure: fixture.tokens) { request in
            requests += 1
            return fixture.response(request, fixture.challengeBody)
        }
        await auth.signInWithApple { challenge, _ in
            let token: Data? = kind == "missing-token" ? nil : kind == "empty-token" ? Data() :
                kind == "invalid-utf8" ? Data([0xff]) : Data("fixture-identity".utf8)
            let code: Data? = kind == "missing-code" ? nil : kind == "empty-code" ? Data() : Data("fixture-code".utf8)
            return try AppleSignInCompletion(state: challenge.challengeId, identityToken: token,
                authorizationCode: code).credential(expectedState: challenge.challengeId)
        }
        #expect(requests == 1)
        #expect(!auth.isLoggedIn)
        #expect(auth.lastError != nil)
        #expect(fixture.tokens.value == nil)
        #expect(!auth.isBusy)
    }

    @Test("系统取消、系统失败和 sheet 移除都完成 continuation", arguments: ["cancelled", "failed", "detached"])
    func delegateFailure(kind: String) async {
        let fixture = AppleAuthFixture()
        defer { fixture.clean() }
        var requests = 0
        let auth = AuthSession(defaults: fixture.defaults, secure: fixture.tokens) { request in
            requests += 1
            return fixture.response(request, fixture.challengeBody)
        }
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 600, height: 800))
        let button = ASAuthorizationAppleIDButton()
        window.addSubview(button)
        var coordinator: AppleSignInButton.Coordinator!
        coordinator = .init(auth: auth, onSuccess: {}, performRequests: { controller in
            if kind == "detached" { coordinator.detach() }
            else {
                coordinator.authorizationController(controller: controller,
                    didCompleteWithError: ASAuthorizationError(kind == "cancelled" ? .canceled : .failed))
            }
        })
        coordinator.button = button
        await auth.signInWithApple { challenge, nonce in
            try await coordinator.authorize(challenge: challenge, rawNonce: nonce)
        }
        #expect(!auth.isLoggedIn)
        #expect((auth.lastError != nil) == (kind == "failed"))
        #expect(requests == 1)
        #expect(!auth.isBusy)
    }

    @Test("Apple 登录错误在中英文目录中均有翻译")
    func localizedErrors() {
        let original = UserDefaults.standard.object(forKey: "appLanguage")
        defer {
            if let original { UserDefaults.standard.set(original, forKey: "appLanguage") }
            else { UserDefaults.standard.removeObject(forKey: "appLanguage") }
        }
        UserDefaults.standard.set("en", forKey: "appLanguage")
        #expect(AppleSignInClientError.unavailable.localizedDescription.hasPrefix("Sign in with Apple is not configured"))
        UserDefaults.standard.set("zh-Hans", forKey: "appLanguage")
        #expect(AppleSignInClientError.unavailable.localizedDescription.hasPrefix("Apple 登录未配置"))
    }

    @Test("安全随机 nonce 与 SHA256")
    func nonce() throws {
        let first = try AppleSignInNonce.generate()
        let second = try AppleSignInNonce.generate()
        #expect(first.count == 64)
        #expect(first.allSatisfy { "0123456789abcdef".contains($0) })
        #expect(first != second)
        #expect(AppleSignInNonce.hash("abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
    }

    @Test("原生回调与挑战匹配；仅应用 JWT 进入安全存储")
    func nativeSessionStorage() async throws {
        let fixture = AppleAuthFixture()
        defer { fixture.clean() }
        var registeredHash: String?
        var authorizedNonce: String?
        var requests = 0
        let auth = AuthSession(defaults: fixture.defaults, secure: fixture.tokens) { request in
            requests += 1
            let body = try #require(try JSONSerialization.jsonObject(with: request.httpBody!) as? [String: Any])
            #expect(request.value(forHTTPHeaderField: "Authorization") == nil)
            if request.url?.path == "/api/auth/apple-challenge" {
                registeredHash = body["nonceHash"] as? String
                return fixture.response(request, fixture.challengeBody)
            }
            #expect(request.url?.path == "/api/auth/apple")
            #expect((body["rawNonce"] as? String) == authorizedNonce)
            #expect((body["challengeId"] as? String) == "fixture-challenge")
            #expect((body["identityToken"] as? String) == "fixture-identity")
            #expect((body["authorizationCode"] as? String) == "fixture-code")
            #expect(body["fullName"] == nil)
            #expect(body["email"] == nil)
            return fixture.response(request, fixture.loginBody)
        }
        await auth.signInWithApple { challenge, rawNonce in
            #expect(auth.isBusy)
            #expect(challenge.challengeId == "fixture-challenge")
            #expect(AppleSignInNonce.hash(rawNonce) == registeredHash)
            authorizedNonce = rawNonce
            return fixture.credential
        }
        #expect(requests == 2)
        #expect(auth.isLoggedIn)
        #expect(auth.user?.id == 42)
        #expect(fixture.tokens.value == "fixture-app-session")
        #expect(fixture.defaults.object(forKey: TokenMigration.tokenKey) == nil)
        #expect(!fixture.defaults.dictionaryRepresentation().values.contains { String(describing: $0).contains("fixture-identity") })
        #expect(!fixture.defaults.dictionaryRepresentation().values.contains { String(describing: $0).contains("fixture-code") })
        #expect(auth.syncOwnership.allows(userId: 42, studentId: "local"))
        #expect(!auth.isBusy)
    }

    @Test("未配置时显示错误，不弹授权窗口或伪造成功")
    func missingConfiguration() async {
        let fixture = AppleAuthFixture()
        defer { fixture.clean() }
        var authorized = false
        let auth = AuthSession(defaults: fixture.defaults, secure: fixture.tokens) { request in
            fixture.response(request, "{\"error\":\"Apple 登录未配置或暂时不可用，请稍后重试。\"}", status: 503)
        }
        await auth.signInWithApple { _, _ in authorized = true; return fixture.credential }
        #expect(!authorized)
        #expect(!auth.isLoggedIn)
        #expect(fixture.tokens.value == nil)
        #expect(auth.lastError == "Apple 登录未配置或暂时不可用，请稍后重试。")
    }

    @Test("取消授权不调用登录接口")
    func cancellation() async {
        let fixture = AppleAuthFixture()
        defer { fixture.clean() }
        var requests = 0
        let auth = AuthSession(defaults: fixture.defaults, secure: fixture.tokens) { request in
            requests += 1
            return fixture.response(request, fixture.challengeBody)
        }
        await auth.signInWithApple { _, _ in throw AppleSignInClientError.cancelled }
        #expect(requests == 1)
        #expect(!auth.isLoggedIn)
        #expect(auth.lastError == nil)
        #expect(!auth.isBusy)
    }

    @Test("邮箱冲突、无效验证和错误响应不建立会话")
    func backendFailures() async {
        for status in [400, 409, 503] {
            let fixture = AppleAuthFixture()
            defer { fixture.clean() }
            let auth = AuthSession(defaults: fixture.defaults, secure: fixture.tokens) { request in
                if request.url?.path == "/api/auth/apple-challenge" { return fixture.response(request, fixture.challengeBody) }
                return fixture.response(request, "{\"error\":\"fixture-rejected\"}", status: status)
            }
            await auth.signInWithApple { challenge, _ in
                try AppleSignInCompletion(state: nil, identityToken: Data("fixture-identity".utf8),
                    authorizationCode: Data("fixture-code".utf8)).credential(expectedState: challenge.challengeId)
            }
            #expect(!auth.isLoggedIn)
            #expect(auth.lastError == "fixture-rejected")
            #expect(fixture.tokens.value == nil)
        }
    }

    @Test("授权成功后网络或解码失败不建立会话", arguments: ["network", "malformed", "empty-session"])
    func responseFailures(kind: String) async {
        let fixture = AppleAuthFixture()
        defer { fixture.clean() }
        let auth = AuthSession(defaults: fixture.defaults, secure: fixture.tokens) { request in
            if request.url?.path == "/api/auth/apple-challenge" { return fixture.response(request, fixture.challengeBody) }
            if kind == "network" { throw URLError(.notConnectedToInternet) }
            return fixture.response(request, kind == "malformed" ? "{}" :
                "{\"token\":\"\",\"user\":{\"id\":42,\"username\":\"apple_fixture\"}}")
        }
        await auth.signInWithApple { _, _ in fixture.credential }
        #expect(!auth.isLoggedIn)
        #expect(auth.lastError != nil)
        #expect(fixture.tokens.value == nil)
        #expect(!auth.isBusy)
    }

    @Test("没有来源窗口时不启动系统授权；sheet 移除后静默取消")
    func missingWindow() async {
        let fixture = AppleAuthFixture()
        defer { fixture.clean() }
        for detached in [false, true] {
            let auth = AuthSession(defaults: fixture.defaults, secure: fixture.tokens) { request in
                fixture.response(request, fixture.challengeBody)
            }
            var performed = false
            let coordinator = AppleSignInButton.Coordinator(auth: auth, onSuccess: {}, performRequests: { _ in performed = true })
            if detached { coordinator.detach() }
            await auth.signInWithApple { challenge, nonce in
                try await coordinator.authorize(challenge: challenge, rawNonce: nonce)
            }
            #expect(!performed)
            #expect(!auth.isLoggedIn)
            #expect((auth.lastError == nil) == detached)
            #expect(!auth.isBusy)
        }
    }

    @Test("Keychain 写入失败不授予登录")
    func keychainFailure() async {
        let fixture = AppleAuthFixture()
        defer { fixture.clean() }
        fixture.tokens.failSave = true
        let auth = AuthSession(defaults: fixture.defaults, secure: fixture.tokens) { request in
            fixture.response(request, request.url?.path == "/api/auth/apple-challenge" ? fixture.challengeBody : fixture.loginBody)
        }
        await auth.signInWithApple { _, _ in fixture.credential }
        #expect(!auth.isLoggedIn)
        #expect(auth.lastError != nil)
        #expect(fixture.tokens.value == nil)
    }

    @Test("退出后忽略迟到 Apple 登录响应")
    func staleResponse() async {
        let fixture = AppleAuthFixture()
        defer { fixture.clean() }
        var auth: AuthSession!
        auth = AuthSession(defaults: fixture.defaults, secure: fixture.tokens) { request in
            if request.url?.path == "/api/auth/apple-challenge" { return fixture.response(request, fixture.challengeBody) }
            auth.logout()
            return fixture.response(request, fixture.loginBody)
        }
        await auth.signInWithApple { _, _ in fixture.credential }
        #expect(!auth.isLoggedIn)
        #expect(fixture.tokens.value == nil)
    }

    @Test("删除待重试状态刷新后保留会话")
    func pendingDeletionKeepsSession() async {
        let fixture = AppleAuthFixture()
        defer { fixture.clean() }
        let auth = AuthSession(defaults: fixture.defaults, secure: fixture.tokens) { request in
            if request.url?.path == "/api/auth/apple-challenge" { return fixture.response(request, fixture.challengeBody) }
            if request.url?.path == "/api/auth/me" {
                return fixture.response(request, "{\"error\":\"账号删除尚未完成，请在账号页面重试删除。\"}", status: 409)
            }
            return fixture.response(request, fixture.loginBody)
        }
        await auth.signInWithApple { _, _ in fixture.credential }
        await auth.refreshMe()
        #expect(auth.isLoggedIn)
        #expect(fixture.tokens.value != nil)
        #expect(auth.lastError != nil)
    }
}
