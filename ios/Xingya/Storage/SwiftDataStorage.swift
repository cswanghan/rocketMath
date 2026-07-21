// SwiftData 实现。TrackState 是带字典的值类型，直接建关系型模型没意义，
// 存成 JSON blob：引擎的类型契约就是 schema，改引擎字段不用写迁移。
// 事件日志则拆成独立模型（append-only，将来要按时间/知识点查）。

import Foundation
import SwiftData

@Model
final class StudentModel {
    // 注：不用 #Unique（iOS 18+），保持 iOS 17 起步——孩子用的常是家里的旧设备。
    // 唯一性由 putStudent 的「先查后写」保证。
    var studentId: String = ""
    var createdAt: Int = 0
    var latencyGateMs: Int?
    var xp: Int = 0

    init(studentId: String, createdAt: Int, latencyGateMs: Int?, xp: Int) {
        self.studentId = studentId
        self.createdAt = createdAt
        self.latencyGateMs = latencyGateMs
        self.xp = xp
    }
}

@Model
final class TrackStateModel {
    var studentId: String = ""
    var trackId: String = ""
    var updatedAt: Int = 0
    /// TrackState 的 JSON 编码
    var payload: Data = Data()

    init(studentId: String, trackId: String, updatedAt: Int, payload: Data) {
        self.studentId = studentId
        self.trackId = trackId
        self.updatedAt = updatedAt
        self.payload = payload
    }
}

@Model
final class AnswerEventModel {
    var studentId: String = ""
    var trackId: String = ""
    var ts: Int = 0
    var level: String = ""
    var phase: String = ""
    var factId: String = ""
    var value: Int?
    var elapsedMs: Int = 0
    var outcome: String = ""

    init(
        studentId: String, trackId: String, ts: Int, level: String, phase: String,
        factId: String, value: Int?, elapsedMs: Int, outcome: String
    ) {
        self.studentId = studentId
        self.trackId = trackId
        self.ts = ts
        self.level = level
        self.phase = phase
        self.factId = factId
        self.value = value
        self.elapsedMs = elapsedMs
        self.outcome = outcome
    }
}

@MainActor
final class SwiftDataStorage: StorageAdapter {
    static let schema: [any PersistentModel.Type] = [
        StudentModel.self, TrackStateModel.self, AnswerEventModel.self,
    ]

    private let context: ModelContext
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(context: ModelContext) {
        self.context = context
    }

    // ----- 学生 --------------------------------------------------------------

    private func fetchStudent(_ id: String) -> StudentModel? {
        let descriptor = FetchDescriptor<StudentModel>(predicate: #Predicate { $0.studentId == id })
        return try? context.fetch(descriptor).first
    }

    func student(id: String) -> StudentRecord? {
        guard let m = fetchStudent(id) else { return nil }
        return StudentRecord(id: m.studentId, createdAt: m.createdAt, latencyGateMs: m.latencyGateMs, xp: m.xp)
    }

    func putStudent(_ student: StudentRecord) {
        if let m = fetchStudent(student.id) {
            m.createdAt = student.createdAt
            m.latencyGateMs = student.latencyGateMs
            m.xp = student.xp
        } else {
            context.insert(StudentModel(
                studentId: student.id,
                createdAt: student.createdAt,
                latencyGateMs: student.latencyGateMs,
                xp: student.xp
            ))
        }
        save()
    }

    func addXp(_ studentId: String, _ amount: Int) {
        guard let m = fetchStudent(studentId) else { return }
        m.xp += amount
        save()
    }

    // ----- track 状态 --------------------------------------------------------

    func trackState(studentId: String, trackId: String) -> TrackState? {
        let descriptor = FetchDescriptor<TrackStateModel>(
            predicate: #Predicate { $0.studentId == studentId && $0.trackId == trackId }
        )
        guard let m = try? context.fetch(descriptor).first else { return nil }
        return try? decoder.decode(TrackState.self, from: m.payload)
    }

    func putTrackState(_ state: TrackState, studentId: String) {
        guard let payload = try? encoder.encode(state) else { return }
        let trackId = state.trackId
        let descriptor = FetchDescriptor<TrackStateModel>(
            predicate: #Predicate { $0.studentId == studentId && $0.trackId == trackId }
        )
        let now = Int(Date().timeIntervalSince1970 * 1000)
        if let m = try? context.fetch(descriptor).first {
            m.payload = payload
            m.updatedAt = now
        } else {
            context.insert(TrackStateModel(studentId: studentId, trackId: trackId, updatedAt: now, payload: payload))
        }
        save()
    }

    // ----- 事件日志 ----------------------------------------------------------

    func appendEvent(_ event: AnswerEventRecord) {
        context.insert(AnswerEventModel(
            studentId: event.studentId,
            trackId: event.trackId,
            ts: event.ts,
            level: event.level,
            phase: event.phase,
            factId: event.factId,
            value: event.value,
            elapsedMs: event.elapsedMs,
            outcome: event.outcome
        ))
        save()
    }

    func events(studentId: String, limit: Int) -> [AnswerEventRecord] {
        var descriptor = FetchDescriptor<AnswerEventModel>(
            predicate: #Predicate { $0.studentId == studentId },
            sortBy: [SortDescriptor(\.ts, order: .reverse)]
        )
        descriptor.fetchLimit = limit
        let rows = (try? context.fetch(descriptor)) ?? []
        return rows.map {
            AnswerEventRecord(
                studentId: $0.studentId, trackId: $0.trackId, ts: $0.ts, level: $0.level,
                phase: $0.phase, factId: $0.factId, value: $0.value, elapsedMs: $0.elapsedMs,
                outcome: $0.outcome
            )
        }
    }

    private func save() {
        do {
            try context.save()
        } catch {
            // 存不下也不能打断孩子答题：记日志，下一次 step 还会再存一次。
            print("⚠️ SwiftData 保存失败：\(error)")
        }
    }
}
