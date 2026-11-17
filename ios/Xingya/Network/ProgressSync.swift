// 学习进度云同步。对接 /api/progress/sync。
// 策略：推送本地 → 服务端 LWW 合并 → 拉回全量写本地（幂等）。

import Foundation

struct SyncSnapshot: Codable, Sendable {
    var studentId: String
    var student: StudentSync
    var tracks: [TrackSync]
    var practices: [PracticeSync]
    var mistakes: [MistakeSync]
    var syncedAt: Int?

    struct StudentSync: Codable, Sendable {
        var xp: Int
        var latencyGateMs: Int?
        var updatedAt: Int
    }

    struct TrackSync: Codable, Sendable {
        var trackId: String
        var payload: String
        var updatedAt: Int
    }

    struct PracticeSync: Codable, Sendable {
        var setId: String
        var bestFirstTryCorrect: Int
        var total: Int
        var completedAt: Int
    }

    struct MistakeSync: Codable, Sendable {
        var clientKey: String
        var source: String
        var topicId: String
        var topicTitle: String
        var problemId: String
        var prompt: String
        var difficulty: String?
        var yourAnswer: String
        var correctAnswer: String
        var elapsedMs: Int?
        var slow: Bool?
        var ts: Int
        var corrected: Bool?
    }
}

@MainActor
enum ProgressSync {
    /// 导出本地 → 推送 → 应用服务端合并结果。
    static func sync(
        storage: any StorageAdapter,
        studentId: String,
        auth: AuthSession,
        transport: APIClient.Transport = APIClient.send
    ) async throws -> SyncSnapshot {
        let (userId, token) = try authorizedSession(auth, studentId: studentId)
        try await requireMembership(auth, userId: userId, token: token, studentId: studentId, transport: transport)
        let body = export(storage: storage, studentId: studentId)
        let data = try await APIClient.request(
            "/api/progress/sync",
            method: "POST",
            token: token,
            body: body,
            transport: transport
        )
        let snapshot = try APIClient.decode(SyncSnapshot.self, from: data)
        // An account switch while awaiting HTTP must not import a stale response.
        guard auth.user?.id == userId, auth.token == token, snapshot.studentId == studentId else {
            throw APIError.http(status: 409, message: "账号或同步范围已变化，请重试。")
        }
        try auth.syncOwnership.requireOwner(userId: userId, studentId: studentId)
        apply(snapshot, to: storage, studentId: studentId)
        return snapshot
    }

    static func pull(
        storage: any StorageAdapter,
        studentId: String,
        auth: AuthSession,
        transport: APIClient.Transport = APIClient.send
    ) async throws -> SyncSnapshot {
        let (userId, token) = try authorizedSession(auth, studentId: studentId)
        try await requireMembership(auth, userId: userId, token: token, studentId: studentId, transport: transport)
        let data = try await APIClient.request(
            "/api/progress/sync?studentId=\(studentId)",
            token: token,
            transport: transport
        )
        let snapshot = try APIClient.decode(SyncSnapshot.self, from: data)
        // An account switch while awaiting HTTP must not import a stale response.
        guard auth.user?.id == userId, auth.token == token, snapshot.studentId == studentId else {
            throw APIError.http(status: 409, message: "账号或同步范围已变化，请重试。")
        }
        try auth.syncOwnership.requireOwner(userId: userId, studentId: studentId)
        apply(snapshot, to: storage, studentId: studentId)
        return snapshot
    }

    private static func requireMembership(_ auth: AuthSession, userId: Int, token: String,
                                          studentId: String, transport: APIClient.Transport) async throws {
        let membership = try await MembershipClient.status(token: token, transport: transport)
        guard membership.isActive() else {
            throw APIError.http(status: 403, message: "云同步需要有效月度会员，请到账号页开通或恢复购买。")
        }
        guard auth.user?.id == userId, auth.token == token, !auth.isBusy else { throw APIError.notAuthenticated }
        try auth.syncOwnership.requireOwner(userId: userId, studentId: studentId)
    }

    private static func authorizedSession(_ auth: AuthSession, studentId: String) throws -> (Int, String) {
        guard let user = auth.user, let token = auth.token, !auth.isBusy else {
            throw APIError.notAuthenticated
        }
        try auth.syncOwnership.requireOwner(userId: user.id, studentId: studentId)
        return (user.id, token)
    }

    // ----- export / apply ----------------------------------------------------

    static func export(storage: any StorageAdapter, studentId: String) -> SyncSnapshot {
        let student = storage.student(id: studentId)
        let tracks = storage.listTrackStates(studentId: studentId).compactMap { item -> SyncSnapshot.TrackSync? in
            guard let data = try? JSONEncoder().encode(item.state),
                  let json = String(data: data, encoding: .utf8) else { return nil }
            return .init(trackId: item.trackId, payload: json, updatedAt: item.updatedAt)
        }
        let practices = storage.listPracticeRecords(studentId: studentId).map {
            SyncSnapshot.PracticeSync(
                setId: $0.setId,
                bestFirstTryCorrect: $0.bestFirstTryCorrect,
                total: $0.total,
                completedAt: $0.completedAt
            )
        }
        let mistakes = storage.listMistakesWithKeys(studentId: studentId).map { item in
            let m = item.mistake
            return SyncSnapshot.MistakeSync(
                clientKey: item.key,
                source: m.source,
                topicId: m.topicId,
                topicTitle: m.topicTitle,
                problemId: m.problemId,
                prompt: m.prompt,
                difficulty: m.difficulty,
                yourAnswer: m.yourAnswer,
                correctAnswer: m.correctAnswer,
                elapsedMs: m.elapsedMs,
                slow: m.slow,
                ts: m.ts,
                corrected: m.corrected
            )
        }
        let now = Int(Date().timeIntervalSince1970 * 1000)
        return SyncSnapshot(
            studentId: studentId,
            student: .init(
                xp: student?.xp ?? 0,
                latencyGateMs: student?.latencyGateMs,
                updatedAt: now
            ),
            tracks: tracks,
            practices: practices,
            mistakes: mistakes,
            syncedAt: nil
        )
    }

    static func apply(_ snapshot: SyncSnapshot, to storage: any StorageAdapter, studentId: String) {
        // student meta
        let local = storage.student(id: studentId)
        let xp = max(local?.xp ?? 0, snapshot.student.xp)
        let gate = snapshot.student.latencyGateMs ?? local?.latencyGateMs
        storage.putStudent(StudentRecord(
            id: studentId,
            createdAt: local?.createdAt ?? snapshot.student.updatedAt,
            latencyGateMs: gate,
            xp: xp
        ))

        // tracks
        for t in snapshot.tracks {
            guard let data = t.payload.data(using: .utf8),
                  let state = try? JSONDecoder().decode(TrackState.self, from: data) else { continue }
            storage.putTrackState(state, studentId: studentId)
        }

        // practice — force write better-or-equal from server
        for p in snapshot.practices {
            let existing = storage.practiceRecord(studentId: studentId, setId: p.setId)
            if let existing, existing.bestFirstTryCorrect > p.bestFirstTryCorrect { continue }
            storage.forcePutPracticeRecord(
                PracticeRecord(
                    setId: p.setId,
                    bestFirstTryCorrect: p.bestFirstTryCorrect,
                    total: p.total,
                    completedAt: p.completedAt
                ),
                studentId: studentId
            )
        }

        // mistakes
        for m in snapshot.mistakes {
            storage.upsertMistake(
                MistakeRecord(
                    id: nil,
                    studentId: studentId,
                    source: m.source,
                    topicId: m.topicId,
                    topicTitle: m.topicTitle,
                    problemId: m.problemId,
                    prompt: m.prompt,
                    difficulty: m.difficulty,
                    yourAnswer: m.yourAnswer,
                    correctAnswer: m.correctAnswer,
                    elapsedMs: m.elapsedMs,
                    slow: m.slow ?? false,
                    ts: m.ts,
                    corrected: m.corrected ?? false
                ),
                clientKey: m.clientKey
            )
        }
    }
}
