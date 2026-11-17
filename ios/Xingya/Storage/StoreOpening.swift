import Foundation

/// Opening failure is recoverable. This policy has no delete/recreate fallback.
enum StoreOpening {
    static let recoveryMessage = "暂时无法打开本机学习数据。原有数据已保留；请稍后重试，或重启设备后再试。请勿通过卸载应用来排查，以免丢失本机数据。"

    static func attempt<Store>(_ open: () throws -> Store) -> Result<Store, Error> {
        Result(catching: open)
    }
}
