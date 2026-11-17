// 家长面板：免费本地分析；有效会员可主动请求 AI 总结。
// 对应 Web 端 ParentDashboard.tsx。

import SwiftUI

struct ParentDashboardView: View {
    let storage: any StorageAdapter
    let studentId: String
    let onExit: () -> Void

    @Environment(AuthSession.self) private var auth
    @Environment(StoreKitService.self) private var store

    @State private var mistakes: [MistakeRecord] = []
    @State private var xp = 0
    @State private var summaryText = ""
    @State private var summarySource = ""
    @State private var summaryLoading = false
    @State private var confirmReset = false
    @State private var confirmClear = false

    private static let diffLabel: [String: String] = [
        "basic": "基础", "consolidate": "夯实", "challenge": "拔高",
    ]

    private var active: [MistakeRecord] { mistakes.filter { !$0.corrected } }
    private var summaryData: MistakeSummaryData { summarizeMistakes(mistakes) }
    private var level: LevelInfo { levelFromXp(xp) }

    private var groups: [(topic: String, items: [MistakeRecord])] {
        var map: [String: [MistakeRecord]] = [:]
        for m in active {
            map[m.topicTitle, default: []].append(m)
        }
        return map
            .map { (topic: $0.key, items: $0.value) }
            .sorted { $0.items.count > $1.items.count }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        Text(L10n.text("学习记录"))
                            .font(.headline)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Theme.brand.opacity(0.15), in: Capsule())
                        Text(L10n.format("%@ 经验", L10n.number(xp)))
                        Spacer()
                        Text(L10n.format("待关注 %@ 道", L10n.number(active.count)))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text(L10n.format("答错 %@ · 偏慢 %@", L10n.number(summaryData.wrongTotal), L10n.number(summaryData.slowTotal)))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Section("家长总结") {
                    Button {
                        Task { await generateSummary() }
                    } label: {
                        if summaryLoading {
                            ProgressView().frame(maxWidth: .infinity)
                        } else {
                            Label(
                                L10n.text(canSendSummary ? "远程 AI 家长总结" : "本地免费分析"),
                                systemImage: "sparkles"
                            )
                        }
                    }
                    .disabled(active.isEmpty || summaryLoading)
                    .accessibilityIdentifier("parent-summary")

                    if !canSendSummary {
                        Text("AI 家长总结为月度会员权益，请在「我的 → 账号 → 会员」开通或恢复购买。仅首次关联本机数据的账号可发送；本地分析免费。")
                            .font(.caption2)
                            .foregroundStyle(Theme.sub)
                    }

                    if !summaryText.isEmpty {
                        if !summarySource.isEmpty {
                            Text(L10n.text(SummarizeClient.sourceLabel(summarySource)))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .accessibilityIdentifier("parent-summary-source")
                            if summarySource != "AI" && summarySource != "本地" {
                                Text("远程 AI 未返回有效结果；以下为本地免费分析。")
                                    .font(.caption2).foregroundStyle(.secondary)
                            }
                        }
                        Text(summaryText)
                            .font(.footnote)
                            .textSelection(.enabled)
                            .padding(.vertical, 4)
                    }
                }

                if active.isEmpty {
                    Section {
                        ContentUnavailableView(
                            "暂无待订正的错题",
                            systemImage: "checkmark.seal",
                            description: Text("孩子答错或偏慢的题会出现在这里")
                        )
                    }
                } else {
                    ForEach(groups, id: \.topic) { group in
                        Section("\(L10n.text(group.topic)) · \(L10n.questions(group.items.count))") {
                            ForEach(group.items) { m in
                                mistakeCard(m)
                            }
                        }
                    }
                }

                Section("数据管理") {
                    Text(L10n.text(SyncOwnership.resetMessage)).font(.caption).foregroundStyle(.secondary)
                    Button(role: .destructive) {
                        confirmReset = true
                    } label: {
                        Label("重置完成度和经验", systemImage: "arrow.counterclockwise")
                    }
                    .accessibilityIdentifier("parent-reset-progress")

                    Button(role: .destructive) {
                        confirmClear = true
                    } label: {
                        Label("清空错题本", systemImage: "trash")
                    }
                    .accessibilityIdentifier("parent-clear-mistakes")
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(Theme.pageBg)
            .foregroundStyle(Theme.ink)
            .navigationTitle("家长 · 错题本")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("返回", action: onExit)
                }
            }
            .confirmationDialog("重置完成度和经验？", isPresented: $confirmReset, titleVisibility: .visible) {
                Button("重置", role: .destructive) {
                    storage.resetProgress(studentId: studentId)
                    summaryText = ""
                    reload()
                }
                Button("取消", role: .cancel) {}
            } message: {
                Text(L10n.text("本机关卡进度、已过关、等级/经验清零，错题本保留。") + L10n.text(SyncOwnership.resetMessage))
            }
            .confirmationDialog("清空错题本？", isPresented: $confirmClear, titleVisibility: .visible) {
                Button("清空", role: .destructive) {
                    storage.clearMistakes(studentId: studentId)
                    summaryText = ""
                    reload()
                }
                Button("取消", role: .cancel) {}
            } message: {
                Text(L10n.text("清空本机错题。") + L10n.text(SyncOwnership.resetMessage))
            }
            .onAppear { reload() }
        }
    }

    @ViewBuilder
    private func mistakeCard(_ m: MistakeRecord) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(L10n.text(m.slow ? "⏱ 偏慢" : "答错"))
                    .font(.caption2.bold())
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background((m.slow ? Theme.warn : Theme.danger).opacity(0.15), in: Capsule())
                if let d = m.difficulty, let label = Self.diffLabel[d] {
                    Text(L10n.text(label))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                if let ms = m.elapsedMs {
                    Text(L10n.duration(Double(ms) / 1000))
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(Theme.sub)
                }
            }
            Text(L10n.text(m.prompt))
                .font(.body)
            if m.slow {
                Text(L10n.format("答对（偏慢）：%@", L10n.text(m.correctAnswer)))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                Text(L10n.format("孩子答：%@", L10n.text(m.yourAnswer)))
                    .font(.caption)
                    .foregroundStyle(Theme.danger)
                Text(L10n.format("正确：%@", L10n.text(m.correctAnswer)))
                    .font(.caption)
                    .foregroundStyle(Theme.accent)
            }
            Button("✓ 标为已订正") {
                if let id = m.id {
                    storage.markMistakeCorrected(studentId: studentId, id: id)
                    reload()
                }
            }
            .font(.caption)
            .buttonStyle(.borderless)
        }
        .padding(.vertical, 4)
    }

    private func reload() {
        mistakes = storage.listMistakes(studentId: studentId).map { stored in
            var localized = stored
            @MainActor func text(_ value: String) -> String {
                LocalizedContent.text(value, language: L10n.language) ?? L10n.text(value)
            }
            localized.topicTitle = text(stored.topicTitle)
            localized.prompt = text(stored.prompt)
            localized.correctAnswer = text(stored.correctAnswer)
            localized.yourAnswer = text(stored.yourAnswer)
            return localized
        }
        xp = storage.student(id: studentId)?.xp ?? 0
    }

    private var canSendSummary: Bool {
        guard let user = auth.user, auth.isLoggedIn else { return false }
        return auth.syncOwnership.allows(userId: user.id, studentId: studentId) && store.canUseCloud(auth)
    }

    private func generateSummary() async {
        summaryLoading = true
        defer { summaryLoading = false }
        let data = summarizeMistakes(mistakes)
        if canSendSummary {
            let result = await SummarizeClient.summarize(data, auth: auth, studentId: studentId)
            summaryText = result.source == "AI" ? result.text : L10n.localSummary(data)
            summarySource = result.source
        } else {
            summaryText = L10n.localSummary(data)
            summarySource = "本地"
        }
    }
}
