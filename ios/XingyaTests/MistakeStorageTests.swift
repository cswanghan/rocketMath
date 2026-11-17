// 错题本存储契约 + 本地总结文本。对照 Web 端 storage.test.ts / summary.ts。

import Foundation
import Testing
@testable import Xingya

@Suite("错题本存储")
@MainActor
struct MistakeStorageTests {
    @Test("记录、列表、标订正")
    func recordListMark() {
        let a = InMemoryStorage()
        a.appendMistake(MistakeRecord(
            id: nil, studentId: "local", source: "practice", topicId: "x",
            topicTitle: "加法", problemId: "p1", prompt: "1+1", difficulty: "basic",
            yourAnswer: "3", correctAnswer: "2", elapsedMs: 1200, slow: false,
            ts: 1, corrected: false
        ))
        a.appendMistake(MistakeRecord(
            id: nil, studentId: "local", source: "fluency", topicId: "mul",
            topicTitle: "乘法口诀", problemId: "f1", prompt: "3×4", difficulty: nil,
            yourAnswer: "11", correctAnswer: "12", elapsedMs: 800, slow: false,
            ts: 2, corrected: false
        ))
        a.appendMistake(MistakeRecord(
            id: nil, studentId: "other", source: "practice", topicId: "x",
            topicTitle: "t", problemId: "p", prompt: "?", difficulty: nil,
            yourAnswer: "1", correctAnswer: "2", elapsedMs: nil, slow: false,
            ts: 3, corrected: false
        ))

        let mine = a.listMistakes(studentId: "local")
        #expect(mine.count == 2)
        #expect(mine[0].id != nil)
        #expect(mine[1].id != nil)
        #expect(mine[0].id != mine[1].id)

        a.markMistakeCorrected(studentId: "local", id: mine[0].id!)
        let after = a.listMistakes(studentId: "local")
        #expect(after.first { $0.id == mine[0].id }?.corrected == true)
        #expect(after.first { $0.id == mine[1].id }?.corrected == false)
    }

    @Test("resetProgress 清进度保留错题；clearMistakes 清空错题")
    func resetKeepsMistakes() {
        let a = InMemoryStorage()
        a.putStudent(StudentRecord(id: "local", createdAt: 0, latencyGateMs: 3000, xp: 500))
        a.putTrackState(Engine.initialState(trackId: "mul"), studentId: "local")
        a.putPracticeRecord(
            PracticeRecord(setId: "s1", bestFirstTryCorrect: 5, total: 10, completedAt: 1),
            studentId: "local"
        )
        a.appendMistake(MistakeRecord(
            id: nil, studentId: "local", source: "practice", topicId: "x",
            topicTitle: "t", problemId: "p", prompt: "1", difficulty: nil,
            yourAnswer: "1", correctAnswer: "2", elapsedMs: nil, slow: false,
            ts: 1, corrected: false
        ))

        a.resetProgress(studentId: "local")
        #expect(a.student(id: "local")?.xp == 0)
        #expect(a.trackState(studentId: "local", trackId: "mul") == nil)
        #expect(a.practiceRecord(studentId: "local", setId: "s1") == nil)
        #expect(a.listMistakes(studentId: "local").count == 1) // 错题本保留

        a.clearMistakes(studentId: "local")
        #expect(a.listMistakes(studentId: "local").isEmpty)
    }
}

@Suite("错题本总结")
struct MistakeSummaryTests {
    @Test("空错题本本地文案")
    func emptySummary() {
        let s = summarizeMistakes([])
        #expect(s.total == 0)
        #expect(localSummaryText(s).contains("太棒了"))
    }

    @Test("按知识点聚合错与慢")
    func groupByTopic() {
        let ms = [
            MistakeRecord(
                id: 1, studentId: "local", source: "practice", topicId: "a",
                topicTitle: "竖式加法", problemId: "p1", prompt: "12+3", difficulty: "basic",
                yourAnswer: "14", correctAnswer: "15", elapsedMs: 5000, slow: false,
                ts: 1, corrected: false
            ),
            MistakeRecord(
                id: 2, studentId: "local", source: "practice", topicId: "a",
                topicTitle: "竖式加法", problemId: "p2", prompt: "20+5", difficulty: "basic",
                yourAnswer: "25", correctAnswer: "25", elapsedMs: 25000, slow: true,
                ts: 2, corrected: false
            ),
            MistakeRecord(
                id: 3, studentId: "local", source: "fluency", topicId: "m",
                topicTitle: "乘法口诀", problemId: "f1", prompt: "7×8", difficulty: nil,
                yourAnswer: "54", correctAnswer: "56", elapsedMs: 3000, slow: false,
                ts: 3, corrected: true // 已订正，不进 active
            ),
        ]
        let s = summarizeMistakes(ms)
        #expect(s.total == 2)
        #expect(s.wrongTotal == 1)
        #expect(s.slowTotal == 1)
        #expect(s.topics.count == 1)
        #expect(s.topics[0].topicTitle == "竖式加法")
        #expect(s.topics[0].wrong == 1)
        #expect(s.topics[0].slow == 1)

        let text = localSummaryText(s)
        #expect(text.contains("共有 2 道"))
        #expect(text.contains("竖式加法"))
    }
}

@Suite("家长 PIN")
struct ParentPinTests {
    @Test("设置与校验")
    func setAndCheck() {
        ParentPin.clearForTesting()
        #expect(!ParentPin.hasPin)
        ParentPin.set("1234")
        #expect(ParentPin.hasPin)
        #expect(ParentPin.check("1234"))
        #expect(!ParentPin.check("0000"))
        ParentPin.clearForTesting()
        #expect(!ParentPin.hasPin)
    }
}
