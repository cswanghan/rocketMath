// 一个年级的三份数据源打包：知识地图（导航）+ 流畅度包（限时引擎）+ 练习包（Practice 引擎）。
// 地图的 topic 靠 fluencyTrackId / problemSetId 关联到另两个包。

import Foundation

struct AppContent {
    let map: KnowledgeMap
    let fluencyPack: ContentPack
    let practicePack: PracticePack

    /// 加载某年级的三份数据。文件命名约定：gradeN_knowledge_map / gradeN_math_fluency_pack / gradeN_practice_pack。
    static func load(grade: Int) throws -> AppContent {
        let map = try KnowledgeMapLoader.load("grade\(grade)_knowledge_map")
        let fluency = try ContentPackLoader.load("grade\(grade)_math_fluency_pack")
        let practice = try loadPracticePack("grade\(grade)_practice_pack")
        return AppContent(map: map, fluencyPack: fluency, practicePack: practice)
    }

    private static func loadPracticePack(_ fileName: String, bundle: Bundle = .main) throws -> PracticePack {
        guard let url = bundle.url(forResource: fileName, withExtension: "json", subdirectory: "content")
            ?? bundle.url(forResource: fileName, withExtension: "json") else {
            throw ContentPackError.notLoaded("bundle 里找不到 content/\(fileName).json")
        }
        return try JSONDecoder().decode(PracticePack.self, from: Data(contentsOf: url))
    }

    // ----- topic → 可玩性判定 -------------------------------------------------

    enum TopicRoute {
        case fluency(trackId: String)
        case practice(setId: String)
        case comingSoon
    }

    func route(for topic: Topic) -> TopicRoute {
        if topic.pedagogy == .fluency,
           let trackId = topic.fluencyTrackId,
           fluencyPack.tracks.contains(where: { $0.trackId == trackId }) {
            return .fluency(trackId: trackId)
        }
        if let setId = topic.problemSetId, practicePack.set(id: setId) != nil {
            return .practice(setId: setId)
        }
        return .comingSoon
    }
}
