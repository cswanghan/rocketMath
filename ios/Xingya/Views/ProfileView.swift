import SwiftUI

struct ProfileView: View {
    let content: AppContent
    let storage: any StorageAdapter
    let studentId: String
    var onParent: (() -> Void)?
    var onAccount: (() -> Void)?
    var onChangeGrade: (() -> Void)?
    @AppStorage("appLanguage") private var language = L10n.language
    @AppStorage("appAppearance") private var appearance = "system"
    var body: some View {
        NavigationStack {
            SunnyPage {
                Text("我的").font(Theme.titleFont(34, weight: .heavy))
                HStack(spacing: 16) {
                    SunSprout().frame(width: 70, height: 70)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("一起向阳生长").font(.title2.bold())
                        Text(L10n.text(Grades.label(for: content.map.grade))).foregroundStyle(Theme.sub)
                    }
                }.frame(maxWidth: .infinity, alignment: .leading).padding(18).background(Theme.sky2, in: .rect(cornerRadius: 26))
                BrandCard(title: "学习记录") {
                    let hits = storage.events(studentId: studentId, limit: 2000).filter { $0.outcome == "hit" || $0.outcome == "retest_pass" }.count
                    Text(L10n.format("correct_count", hits))
                    Text(L10n.format("set_count", storage.listPracticeRecords(studentId: studentId).count))
                }
                BrandCard(title: "设置") {
                    if let onParent { row("家长中心", symbol: "person.2", id: "profile-parent", action: onParent) }
                    if let onChangeGrade { row("切换年级", symbol: "books.vertical", id: "profile-grade", action: onChangeGrade) }
                    if let onAccount { row("账号", symbol: "person.crop.circle", id: "profile-account", action: onAccount) }
                    Divider()
                    Picker("语言", selection: $language) {
                        Text("简体中文").tag("zh-Hans")
                        Text("English").tag("en")
                    }.accessibilityIdentifier("language-picker")
                    Picker("外观", selection: $appearance) {
                        Text("跟随系统").tag("system")
                        Text("浅色").tag("light")
                        Text("深色").tag("dark")
                    }
                }
                Label("练习与本地分析免费 · 离线可用", systemImage: "checkmark.shield").font(.footnote).foregroundStyle(Theme.sub)
            }.toolbar(.hidden, for: .navigationBar)
        }
    }
    private func row(_ title: String, symbol: String, id: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack { Label(L10n.text(title), systemImage: symbol); Spacer(); Image(systemName: "chevron.forward").font(.footnote) }
                .frame(minHeight: 44).contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityIdentifier(id)
    }
}
