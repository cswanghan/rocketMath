// 年级选择。3–9 年级 pack 已在 bundle；对应 Web 端 GradePicker.tsx。

import SwiftUI

struct GradeOption: Identifiable, Hashable {
    let grade: Int
    let label: String
    let desc: String
    let tag: String

    var id: Int { grade }
}

enum Grades {
    static let all: [GradeOption] = [
        .init(grade: 3, label: "三年级", desc: "乘除法·周长面积·分数初步", tag: "小学"),
        .init(grade: 4, label: "四年级", desc: "大数·角度·小数·运算定律", tag: "小学"),
        .init(grade: 5, label: "五年级", desc: "方程·多边形面积·因数倍数", tag: "小学"),
        .init(grade: 6, label: "六年级", desc: "分数运算·百分数·圆·比例", tag: "小学"),
        .init(grade: 7, label: "初一", desc: "有理数·整式·方程·几何", tag: "初中"),
        .init(grade: 8, label: "初二", desc: "全等·因式分解·函数·勾股", tag: "初中"),
        .init(grade: 9, label: "初三", desc: "二次方程·二次函数·圆·相似", tag: "初中"),
    ]

    static func label(for grade: Int) -> String {
        all.first { $0.grade == grade }?.label ?? "\(grade) 年级"
    }

    private static let gradeKey = "xingya.selectedGrade"

    static var saved: Int? {
        let v = UserDefaults.standard.integer(forKey: gradeKey)
        return v >= 3 && v <= 9 ? v : nil
    }

    static func save(_ grade: Int) {
        UserDefaults.standard.set(grade, forKey: gradeKey)
    }

    static func clearForTesting() {
        UserDefaults.standard.removeObject(forKey: gradeKey)
    }
}

struct GradePickerView: View {
    let onSelect: (Int) -> Void

    private let columns = [GridItem(.adaptive(minimum: 150), spacing: 14)]

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                LanguagePicker()
                Text("你在几年级？")
                    .font(.largeTitle.bold())
                    .padding(.top, 32)
                Text("选择你正在学习的年级")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                LazyVGrid(columns: columns, spacing: 14) {
                    ForEach(Grades.all) { g in
                        Button {
                            Grades.save(g.grade)
                            onSelect(g.grade)
                        } label: {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(L10n.text(g.tag))
                                    .font(.caption2.bold())
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Theme.brand.opacity(0.12), in: Capsule())
                                Text("\(g.grade)")
                                    .font(.system(size: 36, weight: .bold, design: .rounded))
                                    .foregroundStyle(Theme.brand)
                                Text(L10n.text(g.label))
                                    .font(.headline)
                                    .foregroundStyle(.primary)
                                Text(L10n.text(g.desc))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(.leading)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .cardStyle()
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("grade-\(g.grade)")
                    }
                }
                .frame(maxWidth: 900)
                .padding(.horizontal)
            }
            .padding(.bottom, 40)
        }
        .background(Theme.pageBackground.ignoresSafeArea())
        .navigationTitle("星芽")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}
