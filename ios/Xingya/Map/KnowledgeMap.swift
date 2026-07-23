// 知识地图类型与加载。地图是两个引擎之上的导航层：fluency topic 走限时训练引擎，
// 其余（procedure/formula/concept/logic/data）走 Practice 引擎。
// 对应 Web 端 src/map/types.ts + map.ts。

import Foundation

nonisolated enum Pedagogy: String, Codable, Sendable {
    case fluency, procedure, formula, concept, logic, data

    var label: String {
        switch self {
        case .fluency: "口算"
        case .procedure: "竖式"
        case .formula: "公式"
        case .concept: "概念"
        case .logic: "推理"
        case .data: "数据"
        }
    }

    var systemImage: String {
        switch self {
        case .fluency: "bolt.fill"
        case .procedure: "square.grid.3x3.fill"
        case .formula: "function"
        case .concept: "lightbulb.fill"
        case .logic: "puzzlepiece.fill"
        case .data: "chart.bar.fill"
        }
    }

    /// 糖果卡片图标 emoji
    var emoji: String {
        switch self {
        case .fluency: "🔢"
        case .procedure: "✏️"
        case .formula: "📐"
        case .concept: "💡"
        case .logic: "🧩"
        case .data: "📊"
        }
    }
}

nonisolated enum TopicStatus: String, Codable, Sendable {
    case ready
    case comingSoon = "coming_soon"
}

nonisolated enum Term: String, Codable, Sendable {
    case upper, lower
    var label: String { self == .upper ? "上册" : "下册" }
}

nonisolated struct Topic: Codable, Sendable, Identifiable {
    let id: String
    let unitId: String
    let title: String
    let pedagogy: Pedagogy
    let dependsOn: [String]
    let status: TopicStatus
    let fluencyTrackId: String?
    let problemSetId: String?

    enum CodingKeys: String, CodingKey {
        case id, unitId = "unitId", title, pedagogy, dependsOn, status
        case fluencyTrackId, problemSetId
    }
}

nonisolated struct Unit: Codable, Sendable, Identifiable {
    let id: String
    let term: Term
    let index: Int
    let title: String
    let topicIds: [String]
}

nonisolated struct KnowledgeMap: Codable, Sendable {
    let textbook: String
    let grade: Int
    let units: [Unit]
    let topics: [Topic]

    func units(term: Term) -> [Unit] {
        units.filter { $0.term == term }.sorted { $0.index < $1.index }
    }

    func topics(in unit: Unit) -> [Topic] {
        unit.topicIds.compactMap { id in topics.first { $0.id == id } }
    }

    func topic(id: String) -> Topic? { topics.first { $0.id == id } }
}

nonisolated enum KnowledgeMapLoader {
    static func load(_ fileName: String, bundle: Bundle = .main) throws -> KnowledgeMap {
        guard let url = bundle.url(forResource: fileName, withExtension: "json", subdirectory: "content")
            ?? bundle.url(forResource: fileName, withExtension: "json") else {
            throw ContentPackError.notLoaded("bundle 里找不到 content/\(fileName).json")
        }
        return try JSONDecoder().decode(KnowledgeMap.self, from: Data(contentsOf: url))
    }
}
