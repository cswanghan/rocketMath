// Navigation fallback for enabled practice tracks outside the textbook map.
// These temporary topics reuse the normal session picker; persisted progress
// still uses the original track ID and no curriculum resource is rewritten.
nonisolated enum FluencyNavigation {
    static func unmappedTopics(tracks: [Track], mappedTopics: [Topic]) -> [Topic] {
        let mapped = Set(mappedTopics.compactMap(\.fluencyTrackId))
        return tracks.filter { $0.enabled && !mapped.contains($0.trackId) }.map { track in
            Topic(id: "additional-\(track.trackId)", unitId: "additional-fluency", title: track.name,
                  pedagogy: .fluency, dependsOn: [], status: .ready,
                  fluencyTrackId: track.trackId, problemSetId: nil)
        }
    }
}
