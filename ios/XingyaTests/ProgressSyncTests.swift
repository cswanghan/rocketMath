// 进度云同步：导出 / 应用合并逻辑（不依赖网络）。

import Foundation
import Testing
@testable import Xingya

@Suite("进度云同步")
@MainActor
struct ProgressSyncTests {
    @Test("export 包含 student / tracks / practice / mistakes")
    func exportSnapshot() {
        let a = InMemoryStorage()
        a.putStudent(StudentRecord(id: "local", createdAt: 1, latencyGateMs: 2500, xp: 120))
        var state = Engine.initialState(trackId: "mult_facts")
        state.currentLevel = "B"
        a.putTrackState(state, studentId: "local")
        a.forcePutPracticeRecord(
            PracticeRecord(setId: "set1", bestFirstTryCorrect: 8, total: 10, completedAt: 99),
            studentId: "local"
        )
        a.appendMistake(MistakeRecord(
            id: nil, studentId: "local", source: "practice", topicId: "set1",
            topicTitle: "竖式", problemId: "p1", prompt: "1+1", difficulty: "basic",
            yourAnswer: "3", correctAnswer: "2", elapsedMs: 1000, slow: false,
            ts: 50, corrected: false
        ))

        let snap = ProgressSync.export(storage: a, studentId: "local")
        #expect(snap.student.xp == 120)
        #expect(snap.student.latencyGateMs == 2500)
        #expect(snap.tracks.count == 1)
        #expect(snap.tracks[0].trackId == "mult_facts")
        #expect(snap.practices.count == 1)
        #expect(snap.practices[0].bestFirstTryCorrect == 8)
        #expect(snap.mistakes.count == 1)
        #expect(snap.mistakes[0].clientKey.contains("p1"))
    }

    @Test("apply 合并 xp 取 max，practice 保留更优")
    func applyMerge() {
        let a = InMemoryStorage()
        a.putStudent(StudentRecord(id: "local", createdAt: 1, latencyGateMs: 3000, xp: 50))
        a.forcePutPracticeRecord(
            PracticeRecord(setId: "s", bestFirstTryCorrect: 9, total: 10, completedAt: 1),
            studentId: "local"
        )

        var remoteState = Engine.initialState(trackId: "div_facts")
        remoteState.currentLevel = "C"
        let payload = String(data: try! JSONEncoder().encode(remoteState), encoding: .utf8)!

        let snap = SyncSnapshot(
            studentId: "local",
            student: .init(xp: 200, latencyGateMs: 2200, updatedAt: 10),
            tracks: [.init(trackId: "div_facts", payload: payload, updatedAt: 10)],
            practices: [
                .init(setId: "s", bestFirstTryCorrect: 5, total: 10, completedAt: 2), // 更差，应忽略
                .init(setId: "s2", bestFirstTryCorrect: 3, total: 6, completedAt: 3),
            ],
            mistakes: [
                .init(
                    clientKey: "k1", source: "fluency", topicId: "t", topicTitle: "乘法",
                    problemId: "f1", prompt: "2×3", difficulty: nil,
                    yourAnswer: "5", correctAnswer: "6", elapsedMs: 800,
                    slow: false, ts: 1, corrected: false
                ),
            ],
            syncedAt: 11
        )
        ProgressSync.apply(snap, to: a, studentId: "local")

        #expect(a.student(id: "local")?.xp == 200) // max(50,200)
        #expect(a.student(id: "local")?.latencyGateMs == 2200)
        #expect(a.trackState(studentId: "local", trackId: "div_facts")?.currentLevel == "C")
        #expect(a.practiceRecord(studentId: "local", setId: "s")?.bestFirstTryCorrect == 9) // 保留更优
        #expect(a.practiceRecord(studentId: "local", setId: "s2")?.bestFirstTryCorrect == 3)
        #expect(a.listMistakes(studentId: "local").count == 1)

        // 再 apply 同一 clientKey 不重复
        ProgressSync.apply(snap, to: a, studentId: "local")
        #expect(a.listMistakes(studentId: "local").count == 1)
    }
}

@Suite("API 错误解析")
struct APIErrorTests {
    @Test("错误文案可读")
    func messages() {
        #expect(APIError.notAuthenticated.errorDescription == "未登录")
        #expect(APIError.http(status: 400, message: "用户名已存在").errorDescription == "用户名已存在")
    }
}
