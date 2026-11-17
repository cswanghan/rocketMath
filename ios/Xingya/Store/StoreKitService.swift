import Foundation
import Observation
import StoreKit

@MainActor
@Observable
final class StoreKitService {
    private(set) var products: [Product] = []
    private(set) var entitlements: [CurrentMembership] = []
    private(set) var isLoading = false
    private(set) var isRefreshing = false
    private(set) var lastError: String?
    private(set) var catalogError: String?
    private(set) var feedback: PurchaseFeedback = .idle
    private(set) var serverMembership: ServerMembership?
    private var pendingPurchase: CurrentMembership?
    var hasPendingPurchase: Bool { pendingPurchase != nil }
    private var checkedSession: String?
    private var checkedUserID: Int?
    private weak var auth: AuthSession?
    private var revision = 0
    private var entitlementRevision = 0
    private var updatesTask: Task<Void, Never>?
    private let requestProducts: @MainActor ([String]) async throws -> [Product]
    private let purchaseProduct: @MainActor (Product, UUID) async throws -> Product.PurchaseResult
    private let waitForRetry: @MainActor (Int) async throws -> Void
    private let transport: APIClient.Transport
    private let readEntitlements: @MainActor () async -> [CurrentMembership]
    private let restorePurchases: @MainActor () async throws -> Void
    private let finishTransactions: @MainActor (UUID) async -> Void

    // Local StoreKit status is presentation only, never server authorization.
    var isPremium: Bool { !entitlements.isEmpty }

    init(transport: @escaping APIClient.Transport = APIClient.send,
         readEntitlements: @escaping @MainActor () async -> [CurrentMembership] = StoreKitService.currentEntitlements,
         restorePurchases: @escaping @MainActor () async throws -> Void = { try await AppStore.sync() },
         finishTransactions: @escaping @MainActor (UUID) async -> Void = StoreKitService.finishBoundTransactions,
         observeTransactions: Bool = true,
         requestProducts: @escaping @MainActor ([String]) async throws -> [Product] = { try await Product.products(for: $0) },
         purchaseProduct: @escaping @MainActor (Product, UUID) async throws -> Product.PurchaseResult = {
             try await $0.purchase(options: [.appAccountToken($1)])
         },
         waitForRetry: @escaping @MainActor (Int) async throws -> Void = { attempt in
             try await Task.sleep(for: .seconds(attempt))
         }) {
        self.waitForRetry = waitForRetry
        self.requestProducts = requestProducts
        self.purchaseProduct = purchaseProduct
        self.transport = transport
        self.readEntitlements = readEntitlements
        self.restorePurchases = restorePurchases
        self.finishTransactions = finishTransactions
        if observeTransactions {
            updatesTask = Task { [weak self] in
                await self?.refreshEntitlements()
                for await result in Transaction.updates {
                    guard !Task.isCancelled else { break }
                    await self?.received(result)
                }
            }
        }
    }

    isolated deinit { updatesTask?.cancel() }

    func canUseCloud(_ auth: AuthSession) -> Bool {
        auth.isLoggedIn && !auth.isBusy && checkedUserID == auth.user?.id
            && checkedSession == auth.token && serverMembership?.isActive() == true
    }

    func connect(_ auth: AuthSession) async {
        if self.auth?.user?.id != auth.user?.id || checkedSession != auth.token { pendingPurchase = nil }
        self.auth = auth
        lastError = nil
        feedback = .idle
        invalidateServerState()
        await refresh()
    }

    private func invalidateServerState() {
        revision += 1
        checkedSession = nil
        checkedUserID = nil
        serverMembership = nil
        isRefreshing = false
    }

    // Foreground notifications can arrive as Apple's payment sheet closes.
    // Let the running purchase/restore finish its own authoritative delivery.
    func refreshWhenIdle() async {
        guard !isLoading, !isRefreshing else { return }
        await refresh()
    }

    // Account owns this sequence when becoming active. Catalog loading sets
    // isLoading, so the app-level idle refresh may skip the same notification.
    // Check before starting: returning from a running payment/restore sheet must
    // not queue a redundant refresh behind that operation's successful binding.
    func refreshAfterForeground() async {
        guard !isLoading else { return }
        await loadProducts()
        guard !Task.isCancelled else { return }
        await refreshWhenIdle()
    }

    func refresh() async {
        invalidateServerState()
        await refreshEntitlements()
        await refreshMembership()
    }

    func refreshEntitlements() async {
        entitlementRevision += 1
        let started = entitlementRevision
        let current = await readEntitlements()
        guard started == entitlementRevision else { return }
        entitlements = CurrentMembership.eligible(current) // replace, never insert-only
    }

    private func sessionMatches(_ token: String, _ userID: Int) -> Bool {
        auth?.token == token && auth?.user?.id == userID && auth?.isBusy == false
    }

    func refreshMembership() async {
        invalidateServerState()
        let started = revision
        guard let token = auth?.token, let userID = auth?.user?.id, auth?.isBusy == false else { return }
        isRefreshing = true
        defer { if started == revision { isRefreshing = false } }
        do {
            var status = try await MembershipClient.status(token: token, transport: transport)
            guard started == revision, sessionMatches(token, userID) else { return }
            // Retry interrupted binding only for the Apple-proven current account.
            let expectedAccountToken = status.accountToken
            let pending = pendingPurchase.flatMap { $0.accountToken == status.accountToken ? $0 : nil }
            if let current = entitlements.first(where: { $0.accountToken == status.accountToken }) ?? pending {
                status = try await MembershipClient.status(token: token, transactionID: current.transactionID, transport: transport)
                guard status.accountToken == expectedAccountToken else {
                    throw APIError.http(status: 409, message: "购买未关联当前账号。请使用原购买账号恢复；请勿再次付费。")
                }
            } else if !entitlements.isEmpty && !status.isActive() {
                throw APIError.http(status: 409, message: "购买未关联当前账号。请使用原购买账号恢复；历史购买需核验，请勿再次付费。")
            }
            guard started == revision, sessionMatches(token, userID) else { return }
            serverMembership = status
            checkedSession = token
            checkedUserID = userID
            if status.isActive() {
                pendingPurchase = nil
                await finishTransactions(status.accountToken)
                if feedback == .verificationPending { feedback = .purchased }
            }
            guard started == revision, sessionMatches(token, userID) else { return }
            if !isLoading { lastError = nil }
        } catch {
            guard started == revision, sessionMatches(token, userID) else { return }
            if pendingPurchase != nil && Self.canAwaitDelivery(error) {
                feedback = .verificationPending
                lastError = nil
            } else { lastError = StoreErrorMessage.message(for: error, restoring: true) }
        }
    }

    func loadProducts() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        catalogError = nil
        // The catalog is independent of server membership. A membership refresh
        // must never erase this error, and a failed catalog must not block restore.
        await refreshEntitlements()
        do {
            for attempt in 0..<3 {
                try Task.checkCancellation()
                do {
                    let loaded = try await requestProducts(StoreProductID.all).filter {
                        $0.id == StoreProductID.premiumMonthly && $0.type == .autoRenewable
                            && $0.subscription?.subscriptionPeriod.unit == .month
                            && $0.subscription?.subscriptionPeriod.value == 1
                    }
                    try Task.checkCancellation()
                    if !loaded.isEmpty {
                        products = loaded
                        return
                    }
                } catch {
                    if StoreErrorMessage.isCancellation(error) { throw CancellationError() }
                    // Retry transient StoreKit failures just like an empty response.
                }
                if attempt < 2 { try await waitForRetry(1 << attempt) }
            }
            products = []
            catalogError = StoreErrorMessage.catalogUnavailable
        } catch {
            // Leaving Account cancels its task, not the user's membership.
            if !StoreErrorMessage.isCancellation(error) {
                products = []
                catalogError = StoreErrorMessage.catalogUnavailable
            }
        }
    }

    func purchase(_ product: Product, auth: AuthSession) async {
        guard !isLoading, !isRefreshing, !hasPendingPurchase else { return }
        guard let token = auth.token, let userID = auth.user?.id, !auth.isBusy else {
            lastError = "请先登录要关联会员的账号。"
            return
        }
        guard product.id == StoreProductID.premiumMonthly, products.contains(where: { $0.id == product.id }) else { return }
        self.auth = auth
        isLoading = true
        lastError = nil
        feedback = .purchasing
        defer { isLoading = false }
        do {
            // Missing validation configuration stops before Apple's purchase sheet.
            let account = try await MembershipClient.status(token: token, transport: transport)
            guard sessionMatches(token, userID) else { throw APIError.notAuthenticated }
            if account.isActive() {
                await refreshMembership()
                feedback = canUseCloud(auth) ? .restored : .idle
                return
            }
            await refreshEntitlements()
            guard sessionMatches(token, userID) else { throw APIError.notAuthenticated }
            guard entitlements.isEmpty else {
                throw APIError.http(status: 409, message: "已发现购买，请先恢复购买并核对原账号；请勿再次付费。")
            }
            switch try await purchaseProduct(product, account.accountToken) {
            case .success(let result):
                let transaction = try verified(result)
                try await deliverVerifiedPurchase(
                    CurrentMembership(productID: transaction.productID, transactionID: String(transaction.id),
                                      accountToken: transaction.appAccountToken,
                                      revoked: transaction.revocationDate != nil, upgraded: transaction.isUpgraded),
                    accountToken: account.accountToken, token: token, userID: userID,
                    finish: { await transaction.finish() })
            case .userCancelled: feedback = .idle
            case .pending: feedback = .pending
            @unknown default: throw APIError.decoding
            }
        } catch {
            feedback = .idle
            if StoreErrorMessage.isProductUnavailable(error) {
                products = []
                catalogError = StoreErrorMessage.purchaseUnavailable
                lastError = nil
            } else {
                lastError = StoreErrorMessage.message(for: error, restoring: false)
            }
        }
    }

    // Called only after StoreKit verification succeeds. HTTP remains the authority
    // for cloud membership; this seam also tests delivery without Apple credentials.
    func deliverVerifiedPurchase(_ transaction: CurrentMembership, accountToken: UUID,
                                 token: String, userID: Int,
                                 finish: @MainActor () async -> Void) async throws {
        guard sessionMatches(token, userID) else { throw APIError.notAuthenticated }
        guard CurrentMembership.eligible([transaction]).count == 1,
              transaction.accountToken == accountToken else {
            throw APIError.http(status: 409, message: "购买未关联当前账号。请使用原购买账号恢复；请勿再次付费。")
        }
        pendingPurchase = transaction
        invalidateServerState()
        await refreshEntitlements()
        for attempt in 0..<3 {
            guard sessionMatches(token, userID) else { throw APIError.notAuthenticated }
            do {
                let bound = try await MembershipClient.status(token: token,
                    transactionID: transaction.transactionID, transport: transport)
                guard sessionMatches(token, userID) else { throw APIError.notAuthenticated }
                guard bound.accountToken == accountToken else {
                    throw APIError.http(status: 409, message: "购买未关联当前账号。请使用原购买账号恢复；请勿再次付费。")
                }
                guard bound.isActive() else {
                    throw APIError.http(status: 503, message: "购买已完成，正在验证会员。")
                }
                // POST has already verified with Apple and durably saved the binding.
                // A redundant GET must not turn that successful delivery into an error.
                await finish()
                guard sessionMatches(token, userID) else { throw APIError.notAuthenticated }
                invalidateServerState() // discard older in-flight refresh responses
                serverMembership = bound
                checkedSession = token
                checkedUserID = userID
                pendingPurchase = nil
                lastError = nil
                feedback = .purchased
                return
            } catch {
                guard sessionMatches(token, userID) else { throw APIError.notAuthenticated }
                guard Self.canAwaitDelivery(error) else { throw error }
                if attempt < 2 && Self.isTransientDelivery(error) {
                    try await waitForRetry(attempt + 1)
                    continue
                }
                // Apple completed the payment. Keep it unfinished for safe redelivery;
                // this state grants no cloud access and prevents a second purchase.
                feedback = .verificationPending
                lastError = nil
                return
            }
        }
    }

    private static func canAwaitDelivery(_ error: Error) -> Bool {
        if case APIError.notAuthenticated = error { return false }
        if case APIError.http(let status, _) = error, status == 409 { return false }
        return !(error is CancellationError)
    }

    private static func isTransientDelivery(_ error: Error) -> Bool {
        switch error {
        case APIError.network: return true
        case APIError.http(let status, _): return status == 429 || status >= 500
        default: return false
        }
    }

    func restore() async {
        guard !isLoading, !isRefreshing else { return }
        isLoading = true
        lastError = nil
        feedback = .idle
        defer { isLoading = false }
        do {
            try await restorePurchases()
            await refresh()
            if let auth, canUseCloud(auth) { feedback = .restored }
            else if hasPendingPurchase && lastError == nil { feedback = .verificationPending }
            else if entitlements.isEmpty && lastError == nil { feedback = .nothingToRestore }
            else if self.auth?.isLoggedIn != true { lastError = "购买已检查；请登录原购买账号后验证云端权益。" }
        } catch { lastError = StoreErrorMessage.message(for: error, restoring: true) }
    }

    private func received(_ result: VerificationResult<Transaction>) async {
        // purchase/restore owns delivery while it is running; do not race its POST
        // with a second refresh that can overwrite the successful server response.
        guard !isLoading else { return }
        await refresh() // rebuild even on revoked or unverified updates
        do {
            let transaction = try verified(result)
            guard transaction.productID == StoreProductID.premiumMonthly else { return }
            if transaction.revocationDate != nil || transaction.isUpgraded {
                await transaction.finish()
            } else if let auth, canUseCloud(auth), transaction.appAccountToken == serverMembership?.accountToken {
                await transaction.finish()
            }
        } catch { lastError = "购买验证失败，未授予会员。" }
    }

    private func verified<T>(_ value: VerificationResult<T>) throws -> T {
        switch value {
        case .verified(let transaction): return transaction
        case .unverified(_, let error): throw error
        }
    }

    static func currentEntitlements() async -> [CurrentMembership] {
        var values: [CurrentMembership] = []
        for await result in Transaction.currentEntitlements {
            guard case .verified(let t) = result else { continue }
            values.append(CurrentMembership(productID: t.productID, transactionID: String(t.id),
                accountToken: t.appAccountToken, revoked: t.revocationDate != nil, upgraded: t.isUpgraded))
        }
        return values
    }

    static func finishBoundTransactions(accountToken: UUID) async {
        // Retry delivery/finish after a previous successful charge but failed HTTP
        // binding, including manual restore. Never finish an unverified/foreign ID.
        for await result in Transaction.unfinished {
            guard case .verified(let t) = result, t.productID == StoreProductID.premiumMonthly,
                  t.appAccountToken == accountToken else { continue }
            await t.finish()
        }
    }
}


/// Never surface raw StoreKit diagnostics such as "Item Unavailable" to families.
/// API ownership conflicts retain an actionable account-recovery message.
enum StoreErrorMessage {
    static let catalogUnavailable = "暂时无法加载订阅。请检查网络或稍后重试，仍可继续免费练习。"
    static let purchaseUnavailable = "此订阅暂时不可购买，请刷新商品后重试。仍可继续免费练习。"
    static let purchaseFailed = "购买暂时无法完成，请稍后重试。如已扣款，请使用「恢复购买」，不要重复付费。"
    static let restoreFailed = "暂时无法恢复购买，请检查网络后重试。现有购买不会丢失。"
    static let accountConflict = "购买未关联当前账号。请使用原购买账号恢复；请勿再次付费。"

    static func isCancellation(_ error: Error) -> Bool {
        if error is CancellationError { return true }
        if case StoreKitError.userCancelled = error { return true }
        if case StoreKitError.systemError(let underlying) = error { return isCancellation(underlying) }
        let ns = error as NSError
        return (ns.domain == SKErrorDomain && ns.code == SKError.paymentCancelled.rawValue)
            || (ns.domain == NSURLErrorDomain
                && [URLError.cancelled.rawValue, URLError.userCancelledAuthentication.rawValue].contains(ns.code))
    }

    static func message(for error: Error, restoring: Bool) -> String? {
        if isCancellation(error) { return nil }
        if case APIError.notAuthenticated = error { return "请先登录要关联会员的账号。" }
        if case APIError.http(let status, _) = error, status == 409 { return accountConflict }
        if isProductUnavailable(error) { return purchaseUnavailable }
        return restoring ? restoreFailed : purchaseFailed
    }

    static func isProductUnavailable(_ error: Error) -> Bool {
        if case Product.PurchaseError.productUnavailable = error { return true }
        if case StoreKitError.notAvailableInStorefront = error { return true }
        let ns = error as NSError
        return ns.domain == SKErrorDomain && ns.code == SKError.storeProductNotAvailable.rawValue
    }
}
