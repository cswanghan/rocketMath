// Macro-free smoke runner. Injected HTTP only; no Apple account, purchase,
// Keychain, database, or live network. Scheme tests cover the observable service.
import Foundation

@main
struct MembershipCoreCheck {
    @MainActor
    static func main() async throws {
        var checks = 0
        func check(_ value: Bool) { precondition(value); checks += 1 }
        let account = UUID(uuidString: "11111111-1111-4111-8111-111111111111")!
        let good = CurrentMembership(productID: StoreProductID.premiumMonthly, transactionID: "1002", accountToken: account)
        var revoked = good; revoked.revoked = true
        var unverified = good; unverified.verified = false
        var upgraded = good; upgraded.upgraded = true
        let other = CurrentMembership(productID: "other", transactionID: "9", accountToken: account)
        check(CurrentMembership.eligible([good, revoked, unverified, upgraded, other]) == [good])
        check(CurrentMembership.eligible([]).isEmpty)
        let now = Date(timeIntervalSince1970: 10)
        let state = ServerMembership(ok: true, accountToken: account, active: true, expiresAt: 11000)
        check(state.isActive(at: now))
        check(!state.isActive(at: now.addingTimeInterval(1)))
        check(!ServerMembership(ok: false, accountToken: account, active: true, expiresAt: 11000).isActive(at: now))
        func response(_ body: String, status: Int = 200) -> APIClient.Transport {
            { request in
                check(request.url?.path == "/api/native/membership")
                return (Data(body.utf8), HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
            }
        }
        let body = "{\"ok\":true,\"active\":true,\"accountToken\":\"\(account)\",\"expiresAt\":\(Date().addingTimeInterval(3600).timeIntervalSince1970 * 1000)}"
        check(try await MembershipClient.status(token: "fixture-only", transport: response(body)).isActive())
        for invalid in ["<html>fallback</html>", "{}", "{\"ok\":false}",
            "{\"ok\":true,\"active\":true,\"accountToken\":\"\(account)\",\"expiresAt\":1}"] {
            do {
                _ = try await MembershipClient.status(token: "fixture-only", transport: response(invalid))
                preconditionFailure("invalid response accepted")
            } catch { checks += 1 }
        }
        do {
            _ = try await MembershipClient.status(token: "fixture-only", transport: response(body, status: 503))
            preconditionFailure("HTTP failure accepted")
        } catch { checks += 1 }
        do {
            _ = try await MembershipClient.status(token: "fixture-only") { _ in throw URLError(.notConnectedToInternet) }
            preconditionFailure("offline accepted")
        } catch { checks += 1 }
        print("Membership core: \(checks) checks passed (mock HTTP, no Apple verification)")
    }
}
