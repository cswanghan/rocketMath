// 一个年级的三份数据源打包：知识地图（导航）+ 流畅度包（限时引擎）+ 练习包（Practice 引擎）。
// 地图的 topic 靠 fluencyTrackId / problemSetId 关联到另两个包。

import Foundation

struct AppContent {
    let map: KnowledgeMap
    let fluencyPack: ContentPack
    let practicePack: PracticePack

    /// 加载某年级的三份数据。文件命名约定：gradeN_knowledge_map / gradeN_math_fluency_pack / gradeN_practice_pack。
    static func load(grade: Int, language: String = L10n.language, bundle: Bundle = .main) throws -> AppContent {
        let map = try KnowledgeMapLoader.load("grade\(grade)_knowledge_map", bundle: bundle, language: language)
        let fluency = try ContentPackLoader.load("grade\(grade)_math_fluency_pack", bundle: bundle, language: language)
        let practice = try JSONDecoder().decode(PracticePack.self, from:
            LocalizedContent.data("grade\(grade)_practice_pack", language: language, bundle: bundle))
        return AppContent(map: map, fluencyPack: fluency, practicePack: practice)
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
