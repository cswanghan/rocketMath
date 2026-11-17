import Foundation
import CryptoKit
import Security

struct AppleSignInChallenge: Decodable {
    let challengeId: String
    let expiresAt: TimeInterval
}

struct AppleSignInCredential: Encodable {
    struct Name: Encodable {
        let givenName: String?
        let familyName: String?
    }
    let identityToken: String
    let authorizationCode: String
    let fullName: Name?
}

/// Value boundary shared by the native delegate and credential-free tests.
/// This only parses the callback; the server must still verify Apple's signature,
/// audience, nonce, one-use challenge, and authorization code before signing in.
struct AppleSignInCompletion {
    let state: String?
    let identityToken: Data?
    let authorizationCode: Data?
    var fullName: AppleSignInCredential.Name? = nil

    func credential(expectedState: String) throws -> AppleSignInCredential {
        // state is optional on the native credential. An absent echo is not
        // proof of failure: the active controller and server-verified nonce bind
        // this flow. A supplied but different (including empty) state is invalid.
        guard !expectedState.isEmpty, state == nil || state == expectedState,
              let identityToken, let token = String(data: identityToken, encoding: .utf8), !token.isEmpty,
              let authorizationCode, let code = String(data: authorizationCode, encoding: .utf8), !code.isEmpty else {
            throw AppleSignInClientError.invalid
        }
        return .init(identityToken: token, authorizationCode: code, fullName: fullName)
    }
}

enum AppleSignInClientError: LocalizedError {
    case cancelled, unavailable, invalid
    var errorDescription: String? {
        switch self {
        case .cancelled: return nil
        case .unavailable: return L10n.catalogText("Apple 登录未配置或暂时不可用，请稍后重试。")
        case .invalid: return L10n.catalogText("无法验证 Apple 登录，请重新使用 Apple 登录。")
        }
    }
}

enum AppleSignInNonce {
    static func generate() throws -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            throw AppleSignInClientError.unavailable
        }
        return bytes.map { String(format: "%02x", $0) }.joined()
    }
    static func hash(_ raw: String) -> String {
        SHA256.hash(data: Data(raw.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
