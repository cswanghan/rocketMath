// 我的（糖果乐园）。资料卡（头像 + 等级 + 经验条）+ 成就墙 + 设置列表。
// 设置项连到家长中心 / 切换年级 / 账号 —— 复用 RootView 的现有流程。

import SwiftUI

struct ProfileView: View {
    let content: AppContent
    let storage: any StorageAdapter
    let studentId: String
    var onParent: (() -> Void)?
    var onAccount: (() -> Void)?
    var onChangeGrade: (() -> Void)?

    private var levelInfo: LevelInfo { levelFromXp(storage.student(id: studentId)?.xp ?? 0) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    profileCard
                    achievements
                    settings
                }
                .padding(Theme.pad)
                .padding(.bottom, 24)
            }
            .background(Theme.pageBackground.ignoresSafeArea())
            .navigationTitle("我的")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.large)
            #endif
        }
    }

    // ----- 资料卡 ------------------------------------------------------------

    private var profileCard: some View {
        HStack(spacing: 14) {
            Text("🦊")
                .font(.system(size: 34))
                .frame(width: 64, height: 64)
                .background(Theme.brandGradient, in: .rect(cornerRadius: 20))
                .shadow(color: Theme.brand.opacity(0.4), radius: 8, y: 4)
            VStack(alignment: .leading, spacing: 4) {
                Text("小星芽").font(.system(size: 18, weight: .heavy, design: .rounded)).foregroundStyle(Theme.ink)
                Text("\(Grades.label(for: content.map.grade)) · Lv.\(levelInfo.level)")
                    .font(.system(size: 13, weight: .bold, design: .rounded)).foregroundStyle(Theme.sub)
                BrandProgress(value: progress, height: 9).frame(maxWidth: 200)
            }
            Spacer(minLength: 0)
        }
        .padding(16)
        .background(
            LinearGradient(colors: [Theme.sky1, Theme.sky2], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: .rect(cornerRadius: Theme.rLg)
        )
        .overlay(RoundedRectangle(cornerRadius: Theme.rLg).strokeBorder(.white, lineWidth: 2))
        .shadow(color: Theme.shadowColor.opacity(0.14), radius: 12, y: 8)
    }

    private var progress: Double {
        levelInfo.span > 0 ? Double(levelInfo.intoLevel) / Double(levelInfo.span) : 0
    }

    // ----- 成就墙 ------------------------------------------------------------

    private var achievements: some View {
        let hits = storage.events(studentId: studentId, limit: 2000).filter { $0.outcome == "hit" || $0.outcome == "retest_pass" }.count
        let donePractice = content.practicePack.sets.filter { storage.practiceRecord(studentId: studentId, setId: $0.id) != nil }.count
        let items: [(String, String, Bool)] = [
            ("🚀", "升到 Lv.\(levelInfo.level)", levelInfo.level >= 2),
            ("⭐", "答对 \(hits) 题", hits >= 10),
            ("🏅", "练完 \(donePractice) 套", donePractice >= 1),
            ("🔥", "坚持练习", hits >= 30),
        ]
        return LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, it in
                VStack(spacing: 6) {
                    Text(it.0).font(.system(size: 26)).opacity(it.2 ? 1 : 0.35)
                    Text(it.1).font(.system(size: 12, weight: .bold, design: .rounded)).foregroundStyle(it.2 ? Theme.ink : Theme.sub)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .cardStyle(radius: Theme.rMd, padding: 0)
            }
        }
    }

    // ----- 设置列表 ----------------------------------------------------------

    private var settings: some View {
        VStack(spacing: 10) {
            if let onParent { settingRow("👨‍👩‍👧 家长中心", action: onParent) }
            if let onChangeGrade { settingRow("🔄 切换年级", action: onChangeGrade) }
            if let onAccount { settingRow("👤 账号", action: onAccount) }
        }
    }

    private func settingRow(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(title).font(.system(size: 15, weight: .bold, design: .rounded)).foregroundStyle(Theme.ink)
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 13, weight: .bold)).foregroundStyle(Theme.sub)
            }
            .cardStyle(radius: Theme.rMd, padding: 16)
        }
        .buttonStyle(.plain)
    }
}
