import Testing
@testable import Xingya

@Suite("All enabled oral tracks are reachable")
@MainActor
struct FluencyNavigationTests {
    @Test(arguments: ["zh-Hans", "en"])
    func allGradesHaveRoutesWithoutDuplicatingExistingMapTopics(language: String) throws {
        for grade in 3...9 {
            let content = try AppContent.load(grade: grade, language: language)
            let extra = FluencyNavigation.unmappedTopics(tracks: content.fluencyPack.tracks, mappedTopics: content.map.topics)
            let mapped = Set(content.map.topics.compactMap(\.fluencyTrackId))
            let extraIDs = extra.compactMap(\.fluencyTrackId)
            #expect(extraIDs == (grade == 7 ? ["rational_mul_div"] : []))
            #expect(Set(extraIDs).isDisjoint(with: mapped))
            for track in content.fluencyPack.enabledTracks {
                #expect(mapped.contains(track.trackId) || extraIDs.contains(track.trackId))
            }
            for topic in extra {
                #expect(topic.problemSetId == nil)
                #expect(topic.status == .ready)
                switch content.route(for: topic) {
                case .fluency(let id): #expect(id == topic.fluencyTrackId)
                default: Issue.record("Additional oral track must use the normal fluency route")
                }
            }
        }
    }

    @Test func disabledTracksAreNotOfferedAsAdditionalPractice() throws {
        let content = try AppContent.load(grade: 7)
        let disabled = content.fluencyPack.tracks.map {
            Track(trackId: $0.trackId, name: $0.name, enabled: false, levels: $0.levels)
        }
        #expect(FluencyNavigation.unmappedTopics(tracks: disabled, mappedTopics: content.map.topics).isEmpty)
    }
}
