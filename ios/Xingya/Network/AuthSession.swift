// 登录会话：token 仅存 Keychain；旧 UserDefaults 副本成功迁移后删除。
// 对接 /api/auth/login · register · me。

import Foundation
import Observation

struct AuthUser: Codable, Sendable, Equatable {
    var id: Int
    var username: String
    var role: String?
}

@MainActor
@Observable
final class AuthSession {
    /// UITEST_SECURE_MEMORY is independent of UITEST_MEMORY (SwiftData only).
    /// Debug UI tests/review captures start signed out with isolated auth defaults.
    /// Release builds always use Keychain, even if passed the test argument.
    static func forLaunch(arguments: [String] = ProcessInfo.processInfo.arguments) -> AuthSession {
        #if DEBUG
        if arguments.contains("UITEST_SECURE_MEMORY") {
            let suite = "com.hanwang.xingya.uitest.auth"
            let defaults = UserDefaults(suiteName: suite)!
            defaults.removePersistentDomain(forName: suite)
            if arguments.contains("UITEST_APPLE_COMPLETED_FAILURE") {
                // Credential-free, offline UI scenario. This branch cannot exist
                // in Release or reach Apple/the production backend.
                let session = AuthSession(defaults: defaults, secure: InMemoryTokenStore()) { request in
                    let challenge = request.url?.path == "/api/auth/apple-challenge"
                    let body = challenge
                        ? "{\"challengeId\":\"ui-fixture\",\"expiresAt\":\(Date().timeIntervalSince1970 + 300)}"
                        : "{\"error\":\"Apple 登录未配置或暂时不可用，请稍后重试。\",\"code\":\"apple_unavailable\"}"
                    return (Data(body.utf8), HTTPURLResponse(url: request.url!, statusCode: challenge ? 200 : 503,
                        httpVersion: nil, headerFields: nil)!)
                }
                Task {
                    await session.signInWithApple { challenge, _ in
                        try AppleSignInCompletion(state: nil, identityToken: Data("ui-fixture-identity".utf8),
                            authorizationCode: Data("ui-fixture-code".utf8)).credential(expectedState: challenge.challengeId)
                    }
                }
                return session
            }
            return AuthSession(defaults: defaults, secure: InMemoryTokenStore())
        }
        #endif
        return AuthSession()
    }

    private(set) var token: String?
    private(set) var user: AuthUser?
    private(set) var isBusy = false
    private(set) var lastError: String?

    var isLoggedIn: Bool { token != nil && user != nil }

    private let tokenKey = TokenMigration.tokenKey
    private let defaults: UserDefaults
    private let secure: any SecureTokenStore
    private let transport: APIClient.Transport
    let syncOwnership: SyncOwnership
    private var revision = 0
    private let userKey = "xingya.auth.user"

    init(
        defaults: UserDefaults = .standard,
        secure: any SecureTokenStore = KeychainStore(),
        transport: @escaping APIClient.Transport = APIClient.send
    ) {
        self.defaults = defaults
        self.secure = secure
        self.transport = transport
        syncOwnership = SyncOwnership(defaults: defaults)
        do {
            token = try TokenMigration.load(defaults: defaults, secure: secure)
        } catch {
            // Retry migration on next launch/login. Never erase the only saved credential.
            token = defaults.string(forKey: tokenKey)
            lastError = error.localizedDescription
        }
        if let data = defaults.data(forKey: userKey),
           let u = try? JSONDecoder().decode(AuthUser.self, from: data) {
            user = u
            syncOwnership.claimIfUnowned(userId: u.id)
        }
    }

    func login(username: String, password: String) async {
        await run {
            struct Body: Encodable { let username: String; let password: String }
            struct Resp: Decodable {
                var token: String
                var user: AuthUser
            }
            let data = try await APIClient.request(
                "/api/auth/login",
                method: "POST",
                body: Body(username: username, password: password),
                transport: transport
            )
            let resp = try APIClient.decode(Resp.self, from: data)
            try apply(token: resp.token, user: resp.user)
        }
    }

    func register(username: String, password: String, email: String) async {
        await run {
            struct Body: Encodable {
                let username: String
                let password: String
                let email: String
            }
            struct Resp: Decodable { var message: String? }
            let data = try await APIClient.request(
                "/api/auth/register",
                method: "POST",
                body: Body(username: username, password: password, email: email),
                transport: transport
            )
            _ = try? APIClient.decode(Resp.self, from: data)
            // 注册成功后自动登录
            try await loginThrowing(username: username, password: password)
        }
    }

    /// Apple credentials live only in this request's memory. The standard apply
    /// path persists only the returned Xingya JWT in Keychain.
    func signInWithApple(
        authorize: @MainActor (AppleSignInChallenge, String) async throws -> AppleSignInCredential
    ) async {
        await run {
            let startedAt = revision
            let rawNonce = try AppleSignInNonce.generate()
            struct ChallengeBody: Encodable { let nonceHash: String }
            let challengeData = try await APIClient.request("/api/auth/apple-challenge", method: "POST",
                body: ChallengeBody(nonceHash: AppleSignInNonce.hash(rawNonce)), transport: transport)
            let challenge = try APIClient.decode(AppleSignInChallenge.self, from: challengeData)
            guard !challenge.challengeId.isEmpty, challenge.expiresAt > Date().timeIntervalSince1970 else {
                throw AppleSignInClientError.invalid
            }
            guard startedAt == revision else { return }
            let credential = try await authorize(challenge, rawNonce)
            guard startedAt == revision else { return }
            struct Body: Encodable {
                let identityToken: String
                let authorizationCode: String
                let fullName: AppleSignInCredential.Name?
                let rawNonce: String
                let challengeId: String
            }
            struct Response: Decodable { let token: String; let user: AuthUser; let deletionPending: Bool? }
            let data = try await APIClient.request("/api/auth/apple", method: "POST",
                body: Body(identityToken: credential.identityToken, authorizationCode: credential.authorizationCode,
                    fullName: credential.fullName, rawNonce: rawNonce, challengeId: challenge.challengeId), transport: transport)
            guard startedAt == revision else { return }
            let response = try APIClient.decode(Response.self, from: data)
            guard !response.token.isEmpty else { throw AppleSignInClientError.invalid }
            try apply(token: response.token, user: response.user)
            if response.deletionPending == true {
                lastError = L10n.text("账号删除尚未完成，请在账号页面重试删除。")
            }
        }
    }

    /// 校验本地 token 是否仍有效；失效则登出。
    func refreshMe() async {
        guard let token, !isBusy else { return }
        let startedAt = revision
        do {
            struct Resp: Decodable { var user: AuthUser }
            let data = try await APIClient.request("/api/auth/me", token: token, transport: transport)
            let resp = try APIClient.decode(Resp.self, from: data)
            guard startedAt == revision else { return }
            try apply(token: token, user: resp.user)
        } catch APIError.notAuthenticated {
            guard startedAt == revision else { return }
            logout()
        } catch {
            // 网络抖动不踢下线
            guard startedAt == revision else { return }
            lastError = error.localizedDescription
        }
    }

    func logout() {
        do {
            try secure.delete(tokenKey)
        } catch {
            lastError = error.localizedDescription
            return
        }
        clearLocalSession()
    }

    private func clearLocalSession() {
        revision += 1
        token = nil
        user = nil
        defaults.removeObject(forKey: tokenKey)
        defaults.removeObject(forKey: userKey)
        // Keep ownership across logout/deletion: a second account must not upload this dataset.
    }

    /// Server soft-deletes the account and clears the documented linked data atomically.
    /// A transport/HTTP/business failure never clears the local session or learning data.
    func deleteAccount() async -> Bool {
        guard let token, !isBusy else {
            lastError = "未登录或请求仍在处理中"
            return false
        }
        revision += 1
        let startedAt = revision
        isBusy = true
        lastError = nil
        defer { isBusy = false }
        do {
            try await AccountDeletion.request(token: token, transport: transport)
            guard startedAt == revision else { return false }
            logout()
            // A confirmed server deletion invalidates the session even if the
            // Keychain is temporarily unavailable. The retained credential can
            // no longer access APIs; report the secure-store error if any.
            if self.token != nil { clearLocalSession() }
            return true
        } catch {
            if startedAt == revision { lastError = error.localizedDescription }
            return false
        }
    }

    // ----- private -----------------------------------------------------------

    private func loginThrowing(username: String, password: String) async throws {
        struct Body: Encodable { let username: String; let password: String }
        struct Resp: Decodable {
            var token: String
            var user: AuthUser
        }
        let data = try await APIClient.request(
            "/api/auth/login",
            method: "POST",
            body: Body(username: username, password: password),
            transport: transport
        )
        let resp = try APIClient.decode(Resp.self, from: data)
        try apply(token: resp.token, user: resp.user)
    }

    private func apply(token: String, user: AuthUser) throws {
        try secure.save(token, for: tokenKey)
        defaults.removeObject(forKey: tokenKey)
        syncOwnership.claimIfUnowned(userId: user.id)
        revision += 1
        self.token = token
        self.user = user
        if let data = try? JSONEncoder().encode(user) {
            defaults.set(data, forKey: userKey)
        }
        lastError = nil
    }

    private func run(_ work: () async throws -> Void) async {
        guard !isBusy else { return }
        revision += 1
        isBusy = true
        lastError = nil
        defer { isBusy = false }
        do {
            try await work()
        } catch AppleSignInClientError.cancelled {
            lastError = nil
        } catch {
            lastError = error.localizedDescription
        }
    }
}

