import Foundation

/// A conservative bridge for the existing shared `local` dataset. No records are moved.
/// Preserve this marker on logout, account deletion and local reset.
@MainActor
final class SyncOwnership {
    static let ownerKey = "xingya.sync.localOwner.v1"
    private let defaults: UserDefaults

    init(defaults: UserDefaults) { self.defaults = defaults }

    func claimIfUnowned(userId: Int) {
        guard userId > 0, defaults.object(forKey: Self.ownerKey) == nil else { return }
        defaults.set(String(userId), forKey: Self.ownerKey)
    }

    func allows(userId: Int, studentId: String) -> Bool {
        studentId == "local" && defaults.string(forKey: Self.ownerKey) == String(userId)
    }

    func requireOwner(userId: Int, studentId: String) throws {
        guard allows(userId: userId, studentId: studentId) else {
            throw APIError.http(status: 409, message: Self.blockedMessage)
        }
    }

    static let blockedMessage = "本机学习数据已关联其他账号，已阻止上传、拉取和 AI 发送。请登录首次关联的账号。本机练习仍可使用。"
    static let scopeMessage = "本机仍共用一份学习数据，切换账号不会隐藏或搬移记录。首次登录会关联这份数据，之后仅该账号可同步或发送 AI 总结；退出或删号不会解除关联。"
    static let resetMessage = "重置和清空只影响本机，不会删除云端记录；再次同步可能恢复云端已有的经验、进度或错题。"
}
