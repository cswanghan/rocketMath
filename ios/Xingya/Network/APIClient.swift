// HTTP 客户端：对接 Cloudflare Pages Functions（与 Web 同源 API）。
// 默认生产站 https://rocket-math-4kg.pages.dev；调试可用 UserDefaults 覆盖。

import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case http(status: Int, message: String)
    case decoding
    case notAuthenticated
    case network(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "无效地址"
        case .http(_, let message): return message
        case .decoding: return "服务器响应无法解析"
        case .notAuthenticated: return "未登录"
        case .network(let s): return s
        }
    }
}

enum APIClient {
    typealias Transport = @MainActor (URLRequest) async throws -> (Data, URLResponse)

    static func send(_ request: URLRequest) async throws -> (Data, URLResponse) {
        try await URLSession.shared.data(for: request)
    }
    /// 生产 API 根；与 PROGRESS.md 线上一致。
    static let defaultBaseURL = URL(string: "https://rocket-math-4kg.pages.dev")!

    private static let baseOverrideKey = "xingya.apiBaseURL"

    static var baseURL: URL {
        if let s = UserDefaults.standard.string(forKey: baseOverrideKey),
           let u = URL(string: s), !s.isEmpty {
            return u
        }
        return defaultBaseURL
    }

    static func setBaseURLOverride(_ string: String?) {
        if let string, !string.isEmpty {
            UserDefaults.standard.set(string, forKey: baseOverrideKey)
        } else {
            UserDefaults.standard.removeObject(forKey: baseOverrideKey)
        }
    }

    static func request(
        _ path: String,
        method: String = "GET",
        token: String? = nil,
        body: (any Encodable)? = nil,
        transport: Transport = APIClient.send
    ) async throws -> Data {
        guard let url = URL(string: path, relativeTo: baseURL)?.absoluteURL else {
            throw APIError.invalidURL
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token, !token.isEmpty {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            req.httpBody = try JSONEncoder().encode(body)
        }
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await transport(req)
        } catch {
            throw APIError.network(error.localizedDescription)
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401 { throw APIError.notAuthenticated }
        if !(200..<300).contains(status) {
            let message = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error
                ?? String(data: data, encoding: .utf8)
                ?? "HTTP \(status)"
            throw APIError.http(status: status, message: message)
        }
        return data
    }

    static func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decoding
        }
    }

    private struct ErrorBody: Decodable {
        var error: String?
    }
}
