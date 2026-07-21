// 持久化接口。与 Web 端 src/storage/ 同构：引擎只管纯逻辑，存哪儿藏在协议后面，
// 将来接云同步只换实现（P3 会加一个走 Cloudflare D1 的实现）。
//
// SwiftData 的 ModelContext 不是 Sendable，且本 App 的读写都发生在交互路径上，
// 所以整个存储层锁在主 actor 上——不为难自己做并发。

import Foundation

struct StudentRecord: Sendable, Equatable {
    var id: String
    var createdAt: Int
    var latencyGateMs: Int?
    var xp: Int
}

/// append-only 事件日志的一条。与 Web 端字段对齐，便于将来两端数据合并。
struct AnswerEventRecord: Sendable {
    var studentId: String
    var trackId: String
    var ts: Int
    var level: String
    var phase: String
    var factId: String
    var value: Int?          // nil = 超时未作答
    var elapsedMs: Int
    var outcome: String
}

/// Practice 题集的完成记录：存最佳「一次答对」数，供知识地图显示掌握度。
struct PracticeRecord: Sendable, Equatable {
    var setId: String
    var bestFirstTryCorrect: Int
    var total: Int
    var completedAt: Int
}

@MainActor
protocol StorageAdapter: AnyObject {
    func student(id: String) -> StudentRecord?
    func putStudent(_ student: StudentRecord)
    func addXp(_ studentId: String, _ amount: Int)

    func trackState(studentId: String, trackId: String) -> TrackState?
    func putTrackState(_ state: TrackState, studentId: String)

    func appendEvent(_ event: AnswerEventRecord)
    func events(studentId: String, limit: Int) -> [AnswerEventRecord]

    func practiceRecord(studentId: String, setId: String) -> PracticeRecord?
    /// 只在超过历史最佳时更新（一次答对越多越好）。
    func putPracticeRecord(_ record: PracticeRecord, studentId: String)
}

/// 答题结果分类。对应 Web 端 src/storage/outcome.ts：由「答前状态 + 结果 action」
/// 推导，纯函数、可测，不进引擎。
enum AnswerOutcome: String {
    case hit
    case miss
    case retestPass = "retest_pass"
    case retestFail = "retest_fail"
    case race

    static func classify(previous: TrackState, action: Action) -> AnswerOutcome {
        if previous.race != nil { return .race }
        let wasRetest = previous.pendingRetest != nil
        switch action {
        case .correction:
            return wasRetest ? .retestFail : .miss
        default:
            return wasRetest ? .retestPass : .hit
        }
    }
}

/// 内存实现：SwiftUI 预览与单元测试用，避免碰真数据库。
@MainActor
final class InMemoryStorage: StorageAdapter {
    private var students: [String: StudentRecord] = [:]
    private var trackStates: [String: TrackState] = [:]
    private var eventLog: [AnswerEventRecord] = []
    private var practiceRecords: [String: PracticeRecord] = [:]

    private func key(_ studentId: String, _ trackId: String) -> String { "\(studentId)|\(trackId)" }

    func student(id: String) -> StudentRecord? { students[id] }
    func putStudent(_ student: StudentRecord) { students[student.id] = student }

    func addXp(_ studentId: String, _ amount: Int) {
        guard var s = students[studentId] else { return }
        s.xp += amount
        students[studentId] = s
    }

    func trackState(studentId: String, trackId: String) -> TrackState? {
        trackStates[key(studentId, trackId)]
    }

    func putTrackState(_ state: TrackState, studentId: String) {
        trackStates[key(studentId, state.trackId)] = state
    }

    func appendEvent(_ event: AnswerEventRecord) { eventLog.append(event) }

    func events(studentId: String, limit: Int) -> [AnswerEventRecord] {
        eventLog.filter { $0.studentId == studentId }.suffix(limit).map { $0 }
    }

    func practiceRecord(studentId: String, setId: String) -> PracticeRecord? {
        practiceRecords[key(studentId, setId)]
    }

    func putPracticeRecord(_ record: PracticeRecord, studentId: String) {
        let k = key(studentId, record.setId)
        if let existing = practiceRecords[k], existing.bestFirstTryCorrect >= record.bestFirstTryCorrect { return }
        practiceRecords[k] = record
    }
}
