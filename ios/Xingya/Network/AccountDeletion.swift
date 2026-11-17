import Foundation

/// Only an HTTP success with a valid JSON boolean `ok: true` confirms deletion.
/// Keep this independent of session mutation so failures cannot clear local state.
enum AccountDeletion {
    private struct Body: Encodable {}
    private struct Response: Decodable { let ok: Bool }

    static func request(token: String, transport: APIClient.Transport = APIClient.send) async throws {
        let data = try await APIClient.request(
            "/api/auth/delete-account", method: "POST", token: token,
            body: Body(), transport: transport
        )
        let response = try APIClient.decode(Response.self, from: data)
        guard response.ok else {
            throw APIError.http(status: 200, message: "服务器未确认删除成功，请稍后重试。")
        }
    }
}
