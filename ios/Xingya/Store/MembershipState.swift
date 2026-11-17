import Foundation

enum StoreProductID {
    static let premiumMonthly = "com.hanwang.xingya.premium.monthly"
    static let all = [premiumMonthly]
}

/// StoreKit currentEntitlements excludes expired/revoked subscriptions and
/// includes eligible grace periods. Do not reject grace using expirationDate.
struct CurrentMembership: Equatable, Sendable {
    let productID: String
    let transactionID: String
    let accountToken: UUID?
    var verified = true
    var revoked = false
    var upgraded = false

    static func eligible(_ values: [Self]) -> [Self] {
        values.filter { $0.verified && !$0.revoked && !$0.upgraded && $0.productID == StoreProductID.premiumMonthly }
    }
}

enum PurchaseFeedback: Equatable {
    case idle, purchasing, cancelled, pending, verificationPending, purchased, restored, nothingToRestore
    var message: String? {
        switch self {
        case .idle: return nil
        case .purchasing: return "正在处理购买…"
        case .cancelled: return "已取消购买，未开通会员。"
        case .pending: return "购买待批准或付款确认。确认后将自动刷新，请勿重复购买。"
        case .verificationPending: return "Apple 购买已完成，会员正在验证。请勿重复购买；稍后点「恢复购买」重试。"
        case .purchased: return "购买成功，会员已关联当前账号。"
        case .restored: return "已恢复购买，会员已关联当前账号。"
        case .nothingToRestore: return "没有可恢复的有效月订阅。"
        }
    }
}

struct ServerMembership: Decodable, Equatable {
    let ok: Bool
    let accountToken: UUID
    let active: Bool
    let expiresAt: Double?
    var environment: String? = nil

    func isActive(at date: Date = Date()) -> Bool {
        ok && active && (expiresAt ?? 0) > date.timeIntervalSince1970 * 1000
    }
}

enum MembershipClient {
    @MainActor
    static func status(token: String, transactionID: String? = nil,
                       transport: APIClient.Transport = APIClient.send) async throws -> ServerMembership {
        struct Body: Encodable { let transactionId: String }
        let data = try await APIClient.request("/api/native/membership",
            method: transactionID == nil ? "GET" : "POST", token: token,
            body: transactionID.map { Body(transactionId: $0) }, transport: transport)
        let result = try APIClient.decode(ServerMembership.self, from: data)
        guard result.ok, !result.active || result.isActive() else { throw APIError.decoding }
        return result
    }
}
