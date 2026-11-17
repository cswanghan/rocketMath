import Foundation
import Testing
@testable import Xingya

@MainActor
private final class MembershipTokens: SecureTokenStore {
    var value: String? = "test-session-a"
    func load(_ key: String) throws -> String? { value }
    func save(_ value: String, for key: String) throws { self.value = value }
    func delete(_ key: String) throws { value = nil }
}

@MainActor
private final class MembershipFixture {
    let suite = "XingyaTests.membership.\(UUID().uuidString)"
    let defaults: UserDefaults
    let secure = MembershipTokens()
    let account = UUID(uuidString: "11111111-1111-4111-8111-111111111111")!
    let auth: AuthSession
    init() throws {
        defaults = UserDefaults(suiteName: suite)!
        defaults.set(try JSONEncoder().encode(AuthUser(id: 1, username: "test-a")), forKey: "xingya.auth.user")
        auth = AuthSession(defaults: defaults, secure: secure) { request in
            Self.response(request, body: "{\"token\":\"test-session-b\",\"user\":{\"id\":2,\"username\":\"test-b\"}}")
        }
    }
    func clean() { defaults.removePersistentDomain(forName: suite) }
    func body(active: Bool = true) -> String {
        "{\"ok\":true,\"active\":\(active),\"accountToken\":\"\(account.uuidString)\",\"expiresAt\":\(Date().addingTimeInterval(3600).timeIntervalSince1970 * 1000)}"
    }
    var entitlement: CurrentMembership {
        .init(productID: StoreProductID.premiumMonthly, transactionID: "1002", accountToken: account)
    }
    static func response(_ request: URLRequest, body: String, status: Int = 200) -> (Data, URLResponse) {
        (Data(body.utf8), HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }
}

@Suite("月订阅权益与账号绑定（本地桩，无真实购买）")
@MainActor
struct MembershipTests {
    @Test("仅可信白名单权益；当前序列清空会移除过期/撤销会员")
    func rebuildsInsteadOfInserting() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        var revoked = f.entitlement; revoked.revoked = true
        var unverified = f.entitlement; unverified.verified = false
        var upgraded = f.entitlement; upgraded.upgraded = true
        var current = [f.entitlement, revoked, unverified, upgraded,
            CurrentMembership(productID: "other.product", transactionID: "9", accountToken: nil)]
        let store = StoreKitService(readEntitlements: { current }, finishTransactions: { _ in }, observeTransactions: false)
        await store.refreshEntitlements()
        #expect(store.entitlements == [f.entitlement])
        current = [] // currentEntitlements removes expired and refunded purchases.
        await store.refreshEntitlements()
        #expect(!store.isPremium)
        #expect(!store.canUseCloud(f.auth))
    }

    @Test("Apple 当前序列的宽限期权益可保留；服务端截止时间到达即失效")
    func graceAndDeadline() throws {
        let f = try MembershipFixture(); defer { f.clean() }
        #expect(CurrentMembership.eligible([f.entitlement]) == [f.entitlement])
        let date = Date(timeIntervalSince1970: 10)
        let status = ServerMembership(ok: true, accountToken: f.account, active: true, expiresAt: 11000)
        #expect(status.isActive(at: date))
        #expect(!status.isActive(at: date.addingTimeInterval(1)))
        #expect(!ServerMembership(ok: false, accountToken: f.account, active: true, expiresAt: 11000).isActive(at: date))
    }

    @Test("恢复成功、无购买、失败分开，失败不虚构会员")
    func restoreStates() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        let store = StoreKitService(transport: { MembershipFixture.response($0, body: f.body()) },
            readEntitlements: { [f.entitlement] }, restorePurchases: {}, finishTransactions: { _ in }, observeTransactions: false)
        await store.connect(f.auth)
        await store.restore()
        #expect(store.feedback == .restored)
        #expect(store.canUseCloud(f.auth))

        let empty = StoreKitService(readEntitlements: { [] }, restorePurchases: {}, finishTransactions: { _ in }, observeTransactions: false)
        await empty.restore()
        #expect(empty.feedback == .nothingToRestore)
        #expect(!empty.isPremium)

        let failed = StoreKitService(readEntitlements: { [] },
            restorePurchases: { throw URLError(.notConnectedToInternet) }, finishTransactions: { _ in }, observeTransactions: false)
        await failed.restore()
        #expect(failed.lastError != nil)
        #expect(failed.feedback != .restored)
        #expect(!failed.isLoading)
    }

    @Test("恢复操作串行，处理中重复点击不再请求")
    func noOverlappingRestore() async {
        var calls = 0
        var resume: CheckedContinuation<Void, Never>?
        let store = StoreKitService(readEntitlements: { [] }, restorePurchases: {
            calls += 1
            await withCheckedContinuation { resume = $0 }
        }, finishTransactions: { _ in }, observeTransactions: false)
        let first = Task { await store.restore() }
        while resume == nil { await Task.yield() }
        await store.restore()
        #expect(calls == 1)
        #expect(store.isLoading)
        resume?.resume()
        await first.value
        #expect(!store.isLoading)
    }

    @Test("本地模拟或未绑定购买不能授予云端权益，配置缺失不跳过验证")
    func noLocalOrOfflineBypass() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        let store = StoreKitService(transport: {
            MembershipFixture.response($0, body: "{\"error\":\"verification unavailable\"}", status: 503)
        }, readEntitlements: { [f.entitlement] }, restorePurchases: {}, finishTransactions: { _ in }, observeTransactions: false)
        await store.connect(f.auth)
        #expect(store.isPremium)
        #expect(!store.canUseCloud(f.auth))
        #expect(store.lastError != nil)
        await store.restore()
        #expect(store.feedback != .restored)
        #expect(f.auth.isLoggedIn)
    }

    @Test("无标记的历史购买和其他账号购买不自动 POST 认领")
    func noLegacyOrForeignClaim() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        for account in [nil, UUID()] as [UUID?] {
            var posts = 0
            let store = StoreKitService(transport: { request in
                if request.httpMethod == "POST" { posts += 1 }
                return MembershipFixture.response(request, body: f.body(active: false))
            }, readEntitlements: { [.init(productID: StoreProductID.premiumMonthly, transactionID: "1002", accountToken: account)] },
                finishTransactions: { _ in }, observeTransactions: false)
            await store.connect(f.auth)
            #expect(posts == 0)
            #expect(!store.canUseCloud(f.auth))
            #expect(store.lastError != nil)
        }
    }

    @Test("账号切换后丢弃迟到的会员响应；有效会员也不能越过本机归属")
    func accountSwitchAndOwnership() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        var resume: CheckedContinuation<Void, Never>?
        let store = StoreKitService(transport: { request in
            await withCheckedContinuation { resume = $0 }
            return MembershipFixture.response(request, body: f.body())
        }, readEntitlements: { [] }, finishTransactions: { _ in }, observeTransactions: false)
        let first = Task { await store.connect(f.auth) }
        while resume == nil { await Task.yield() }
        await f.auth.login(username: "b", password: "test-only")
        resume?.resume()
        await first.value
        #expect(!store.canUseCloud(f.auth))
        #expect(store.serverMembership == nil)

        let paidB = StoreKitService(transport: { MembershipFixture.response($0, body: f.body()) },
            readEntitlements: { [] }, finishTransactions: { _ in }, observeTransactions: false)
        await paidB.connect(f.auth)
        #expect(paidB.canUseCloud(f.auth))
        let storage = InMemoryStorage()
        storage.putStudent(.init(id: "local", createdAt: 1, xp: 88))
        var calls = 0
        do {
            _ = try await ProgressSync.sync(storage: storage, studentId: "local", auth: f.auth) { request in
                calls += 1
                return MembershipFixture.response(request, body: f.body())
            }
            Issue.record("B 不得上传 A 的本地记录")
        } catch {}
        #expect(calls == 0)
        #expect(storage.student(id: "local")?.xp == 88)
    }

    @Test("客户端严格验证会员成功结构及服务端有效期")
    func responseSemantics() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        let active = try await MembershipClient.status(token: "test") {
            MembershipFixture.response($0, body: f.body())
        }
        #expect(active.isActive())
        for body in ["<html>fallback</html>", "{}", "{\"ok\":false}",
            "{\"ok\":true,\"active\":true,\"accountToken\":\"\(f.account)\",\"expiresAt\":1}"] {
            do {
                _ = try await MembershipClient.status(token: "test") { MembershipFixture.response($0, body: body) }
                Issue.record("无效会员响应不能成功")
            } catch {}
        }
    }

    @Test("未订阅时不上传学习数据，不修改本地进度")
    func nonMemberDoesNotUpload() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        let storage = InMemoryStorage()
        storage.putStudent(.init(id: "local", createdAt: 1, xp: 55))
        var paths: [String] = []
        do {
            _ = try await ProgressSync.sync(storage: storage, studentId: "local", auth: f.auth) { request in
                paths.append(request.url!.path)
                #expect(request.httpBody == nil)
                return MembershipFixture.response(request, body: f.body(active: false))
            }
            Issue.record("非会员不得同步")
        } catch {}
        #expect(paths == ["/api/native/membership"])
        #expect(storage.student(id: "local")?.xp == 55)
    }

    @Test("AI 仅走原生付费路由；失败只回退本地，不调用免费 Web 路由")
    func aiRouteAndFallback() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        let data = summarizeMistakes([MistakeRecord(id: nil, studentId: "local", source: "practice",
            topicId: "test", topicTitle: "math", problemId: "one", prompt: "1+1", difficulty: nil,
            yourAnswer: "3", correctAnswer: "2", elapsedMs: 1000, slow: false, ts: 1, corrected: false)])
        for active in [true, false] {
            var paths: [String] = []
            let result = await SummarizeClient.summarize(data, auth: f.auth, studentId: "local") { request in
                paths.append(request.url!.path)
                if request.url!.path == "/api/native/membership" {
                    return MembershipFixture.response(request, body: f.body(active: active))
                }
                return MembershipFixture.response(request, body: "{\"error\":\"unavailable\"}", status: 503)
            }
            #expect(result.source != "AI")
            #expect(paths == (active ? ["/api/native/membership", "/api/native/summarize"] : ["/api/native/membership"]))
            #expect(f.auth.isLoggedIn)
        }
    }

    @Test("只有远程有效响应标为远程 AI；HTML、空摘要及 HTTP 失败保持本地免费分析")
    func remoteSummaryEvidence() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        let data = summarizeMistakes([MistakeRecord(id: nil, studentId: "local", source: "practice",
            topicId: "test", topicTitle: "math", problemId: "one", prompt: "1+1", difficulty: nil,
            yourAnswer: "3", correctAnswer: "2", elapsedMs: 1000, slow: false, ts: 1, corrected: false)])
        for (status, body, remote) in [
            (200, "{\"summary\":\"remote test response\"}", true),
            (200, "<html>fallback</html>", false),
            (200, "{\"summary\":\"   \"}", false),
            (200, "{}", false),
            (503, "{\"summary\":\"must not display\"}", false),
        ] {
            var paths: [String] = []
            let result = await SummarizeClient.summarize(data, auth: f.auth, studentId: "local") { request in
                paths.append(request.url!.path)
                if request.url!.path == "/api/native/membership" {
                    return MembershipFixture.response(request, body: f.body())
                }
                return MembershipFixture.response(request, body: body, status: status)
            }
            #expect(paths == ["/api/native/membership", "/api/native/summarize"])
            #expect(SummarizeClient.sourceLabel(result.source) == (remote ? "远程 AI 家长总结" : "本地免费分析"))
            #expect(result.text == (remote ? "remote test response" : localSummaryText(data)))
        }
        let offline = await SummarizeClient.summarize(data, auth: f.auth, studentId: "local") { request in
            if request.url!.path == "/api/native/membership" {
                return MembershipFixture.response(request, body: f.body())
            }
            throw URLError(.notConnectedToInternet)
        }
        #expect(SummarizeClient.sourceLabel(offline.source) == "本地免费分析")
        #expect(offline.text == localSummaryText(data))
    }
}

// Start at the verified StoreKit success boundary; HTTP and finish are local stubs.
// This reproduces delivery behavior, not a real Apple Sandbox purchase.
@Suite("购买已完成后的交付回归（本地桩）")
@MainActor
struct PurchaseDeliveryTests {
    @Test("绑定成功后不依赖第二次网络验证，否则已付款会被显示为失败")
    func successfulBindingSurvivesRefreshOutage() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        var posts = 0
        var getsAfterBinding = 0
        var finishes = 0
        let store = StoreKitService(transport: { request in
            if request.httpMethod == "POST" {
                posts += 1
                return MembershipFixture.response(request, body: f.body())
            }
            if posts > 0 {
                getsAfterBinding += 1
                return MembershipFixture.response(request, body: "{\"error\":\"test outage\"}", status: 503)
            }
            return MembershipFixture.response(request, body: f.body(active: false))
        }, readEntitlements: { [] }, finishTransactions: { _ in }, observeTransactions: false)
        await store.connect(f.auth)
        try await store.deliverVerifiedPurchase(f.entitlement, accountToken: f.account,
            token: f.auth.token!, userID: 1, finish: { finishes += 1 })
        #expect(posts == 1)
        #expect(finishes == 1)
        #expect(getsAfterBinding == 0)
        #expect(store.feedback == .purchased)
        #expect(store.lastError == nil)
        #expect(store.canUseCloud(f.auth))
    }
    @Test("付款后的暂时服务错误只重试绑定，成功后才结束交易")
    func retriesBindingWithoutRepurchasing() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        var posts = 0; var finishes = 0; var waits: [Int] = []
        let store = StoreKitService(transport: { request in
            if request.httpMethod == "POST" {
                posts += 1
                return MembershipFixture.response(request, body: posts == 1 ? "{}" : f.body(), status: posts == 1 ? 503 : 200)
            }
            return MembershipFixture.response(request, body: f.body(active: false))
        }, readEntitlements: { [] }, finishTransactions: { _ in }, observeTransactions: false,
            waitForRetry: { waits.append($0) })
        await store.connect(f.auth)
        try await store.deliverVerifiedPurchase(f.entitlement, accountToken: f.account,
            token: f.auth.token!, userID: 1, finish: { finishes += 1 })
        #expect(posts == 2 && waits == [1] && finishes == 1)
        #expect(store.feedback == .purchased && store.lastError == nil)
        #expect(store.canUseCloud(f.auth) && !store.hasPendingPurchase)
    }

    @Test("持续验证失败保留待交付交易，恢复购买可重试；不授予离线权益")
    func pendingDeliveryRestoresWithoutLocalPropagation() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        var recovered = false; var posts = 0; var finishes = 0; var restoredFinishes = 0
        let store = StoreKitService(transport: { request in
            if request.httpMethod == "POST" {
                posts += 1
                return MembershipFixture.response(request, body: recovered ? f.body() : "{}", status: recovered ? 200 : 503)
            }
            return MembershipFixture.response(request, body: f.body(active: false))
        }, readEntitlements: { [] }, restorePurchases: {}, finishTransactions: { _ in restoredFinishes += 1 },
            observeTransactions: false, waitForRetry: { _ in })
        await store.connect(f.auth)
        try await store.deliverVerifiedPurchase(f.entitlement, accountToken: f.account,
            token: f.auth.token!, userID: 1, finish: { finishes += 1 })
        #expect(posts == 3 && finishes == 0)
        #expect(store.feedback == .verificationPending && store.lastError == nil)
        #expect(store.hasPendingPurchase && !store.canUseCloud(f.auth))
        recovered = true
        await store.restore()
        #expect(posts == 4 && restoredFinishes == 1)
        #expect(store.feedback == .restored && store.canUseCloud(f.auth))
        #expect(!store.hasPendingPurchase)
    }

    @Test("未激活或无效成功结构保留待验证状态，不显示解析错误或结束交易")
    func inactiveAndMalformedBindingRemainUnfinished() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        for response in [f.body(active: false), "{}", "<html>fallback</html>"] {
            var finishes = 0
            let store = StoreKitService(transport: { request in
                MembershipFixture.response(request, body: request.httpMethod == "POST" ? response : f.body(active: false))
            }, readEntitlements: { [] }, finishTransactions: { _ in }, observeTransactions: false, waitForRetry: { _ in })
            await store.connect(f.auth)
            try await store.deliverVerifiedPurchase(f.entitlement, accountToken: f.account,
                token: f.auth.token!, userID: 1, finish: { finishes += 1 })
            #expect(finishes == 0 && !store.canUseCloud(f.auth))
            #expect(store.feedback == .verificationPending && store.lastError == nil)
        }
    }

    @Test("他人/无标记/未验证/撤销交易不绑定；服务器归属冲突不授予会员")
    func rejectsForeignOrUnverifiedDelivery() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        var foreign = f.entitlement; foreign = .init(productID: foreign.productID, transactionID: foreign.transactionID, accountToken: UUID())
        var unverified = f.entitlement; unverified.verified = false
        var revoked = f.entitlement; revoked.revoked = true
        let legacy = CurrentMembership(productID: StoreProductID.premiumMonthly, transactionID: "1002", accountToken: nil)
        for transaction in [foreign, unverified, revoked, legacy] {
            var posts = 0; var finishes = 0
            let store = StoreKitService(transport: { request in
                if request.httpMethod == "POST" { posts += 1 }
                return MembershipFixture.response(request, body: f.body(active: false))
            }, readEntitlements: { [] }, finishTransactions: { _ in }, observeTransactions: false)
            await store.connect(f.auth)
            do {
                try await store.deliverVerifiedPurchase(transaction, accountToken: f.account,
                    token: f.auth.token!, userID: 1, finish: { finishes += 1 })
                Issue.record("Unowned or unverified transaction must be rejected")
            } catch {}
            #expect(posts == 0 && finishes == 0 && !store.canUseCloud(f.auth))
        }
        for status in [200, 409] {
            var finishes = 0; var posts = 0
            let store = StoreKitService(transport: { request in
                if request.httpMethod == "POST" {
                    posts += 1
                    return MembershipFixture.response(request, body: f.body().replacingOccurrences(of: f.account.uuidString, with: UUID().uuidString), status: status)
                }
                return MembershipFixture.response(request, body: f.body(active: false))
            }, readEntitlements: { [] }, finishTransactions: { _ in }, observeTransactions: false)
            await store.connect(f.auth)
            do {
                try await store.deliverVerifiedPurchase(f.entitlement, accountToken: f.account,
                    token: f.auth.token!, userID: 1, finish: { finishes += 1 })
                Issue.record("Binding conflict must be rejected")
            } catch {}
            #expect(posts == 1 && finishes == 0 && !store.canUseCloud(f.auth))
        }
    }

    @Test("绑定请求期间账号切换，迟到响应不能激活新账号或结束交易")
    func accountSwitchDuringDelivery() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        var finishes = 0
        let originalToken = f.auth.token!
        let store = StoreKitService(transport: { request in
            if request.httpMethod == "POST" {
                await f.auth.login(username: "b", password: "test-only")
                return MembershipFixture.response(request, body: f.body())
            }
            return MembershipFixture.response(request, body: f.body(active: false))
        }, readEntitlements: { [] }, finishTransactions: { _ in }, observeTransactions: false)
        await store.connect(f.auth)
        do {
            try await store.deliverVerifiedPurchase(f.entitlement, accountToken: f.account,
                token: originalToken, userID: 1, finish: { finishes += 1 })
            Issue.record("Changed account must reject late response")
        } catch {}
        #expect(finishes == 0 && !store.canUseCloud(f.auth) && store.serverMembership == nil)
    }

    @Test("较早刷新响应不能覆盖新购买的成功绑定")
    func lateRefreshCannotOverwriteDelivery() async throws {
        let f = try MembershipFixture(); defer { f.clean() }
        var blockRefresh = false
        var resume: CheckedContinuation<Void, Never>?
        let store = StoreKitService(transport: { request in
            if request.httpMethod == "POST" { return MembershipFixture.response(request, body: f.body()) }
            if blockRefresh { await withCheckedContinuation { resume = $0 } }
            return MembershipFixture.response(request, body: f.body(active: false))
        }, readEntitlements: { [] }, finishTransactions: { _ in }, observeTransactions: false)
        await store.connect(f.auth)
        blockRefresh = true
        let refresh = Task { await store.refreshMembership() }
        while resume == nil { await Task.yield() }
        try await store.deliverVerifiedPurchase(f.entitlement, accountToken: f.account,
            token: f.auth.token!, userID: 1, finish: {})
        resume?.resume(); await refresh.value
        #expect(store.feedback == .purchased && store.canUseCloud(f.auth))
        #expect(store.lastError == nil)
    }

}
