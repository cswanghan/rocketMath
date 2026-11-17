# Page dependency trees — 星芽 iOS

All files are under 900 lines; pass full files under PAYLOAD BUDGET when designing a given screen. Mid-flight Account/Auth/Membership are not reliable ground truth; use device-reviewed baseline + screenshots for those screens.
## 首页 / 知识地图 (current tab home)
Entry: `ios/Xingya/Views/KnowledgeMapView.swift`
Dependencies:
- `ios/Xingya/Views/KnowledgeMapView.swift`
  ios/Xingya/Theme.swift
  ios/Xingya/Map/KnowledgeMap.swift
  ios/Xingya/Map/AppContent.swift
  ios/Xingya/Views/RootView.swift  (TabView shell: 首页 / 报告 / 我的)
  destinations: PracticeView, PlayView, RaceView, AccountView, ParentGateView, GradePickerView

## 年级选择
Entry: `ios/Xingya/Views/GradePickerView.swift`
Dependencies:
- `ios/Xingya/Views/GradePickerView.swift`
  ios/Xingya/Theme.swift
  ios/Xingya/Views/RootView.swift

## 热身探针
Entry: `ios/Xingya/Views/ProbeView.swift`
Dependencies:
- `ios/Xingya/Views/ProbeView.swift`
  ios/Xingya/Theme.swift
  ios/Xingya/Views/NumpadView.swift

## 答题 / 练习 Practice
Entry: `ios/Xingya/Views/PracticeView.swift`
Dependencies:
- `ios/Xingya/Views/PracticeView.swift`
  ios/Xingya/Theme.swift
  ios/Xingya/Views/NumpadView.swift
  ios/Xingya/Practice/PracticeModel.swift
  interaction contract: timeout, must tap 继续, correction speech, 3-tier progress basic→consolidate→challenge

## 答题 / 口算流畅度 Play
Entry: `ios/Xingya/Views/PlayView.swift`
Dependencies:
- `ios/Xingya/Views/PlayView.swift`
  ios/Xingya/Theme.swift
  ios/Xingya/Views/NumpadView.swift
  ios/Xingya/Game/GameModel.swift
  interaction contract: timeout, must tap 继续, correction + read-aloud, fluency-continue identifiers

## 竞速 Race
Entry: `ios/Xingya/Views/RaceView.swift`
Dependencies:
- `ios/Xingya/Views/RaceView.swift`
  ios/Xingya/Theme.swift
  ios/Xingya/Views/NumpadView.swift

## 报告
Entry: `ios/Xingya/Views/ReportView.swift`
Dependencies:
- `ios/Xingya/Views/ReportView.swift`
  ios/Xingya/Theme.swift
  ios/Xingya/Views/RocketChartView.swift
  ios/Xingya/Views/RootView.swift (tab 报告)

## 我的 Profile
Entry: `ios/Xingya/Views/ProfileView.swift`
Dependencies:
- `ios/Xingya/Views/ProfileView.swift`
  ios/Xingya/Theme.swift
  ios/Xingya/Views/LevelBar.swift
  ios/Xingya/Views/RootView.swift (tab 我的)
  entry: button 👤 账号 → AccountView; parent gate; change grade

## 账号 + 会员 (user-seen baseline, not mid-flight disk)
Entry: `ios/Xingya/Views/AccountView.swift`
Dependencies:
- `ios/Xingya/Views/AccountView.swift`
  ios/Xingya/Views/MembershipSection.swift
  ios/Xingya/Views/AuthView.swift
  ios/Xingya/Theme.swift
  user-seen: NavigationStack + system List sections 账号 / 云同步 / 会员 · Monthly membership / 关于
  bilingual CTAs and legal links; pink text links as primary purchase; displayPrice + ' / 每月 · per month'
  mid-flight disk copies may not compile; do not reproduce those

## 登录 / 注册 (user-seen baseline)
Entry: `ios/Xingya/Views/AuthView.swift`
Dependencies:
- `ios/Xingya/Views/AuthView.swift`
  ios/Xingya/Theme.swift
  user-seen: NavigationStack + Form, segmented 登录/注册, sparse fields, weak primary button, large empty chrome

## 家长门 + 家长面板
Entry: `ios/Xingya/Views/ParentDashboardView.swift`
Dependencies:
- `ios/Xingya/Views/ParentGateView.swift`
- `ios/Xingya/Views/ParentDashboardView.swift`
  ios/Xingya/Theme.swift
  system List; AI summary is membership; local analysis is free

## 时间锁
Entry: `ios/Xingya/Views/LockView.swift`
Dependencies:
- `ios/Xingya/Views/LockView.swift`
  ios/Xingya/Theme.swift

# Full page source dumps

## GradePickerView
Path: `ios/Xingya/Views/GradePickerView.swift`

```swift
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
                                Text(g.tag)
                                    .font(.caption2.bold())
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Theme.brand.opacity(0.12), in: Capsule())
                                Text("\(g.grade)")
                                    .font(.system(size: 36, weight: .bold, design: .rounded))
                                    .foregroundStyle(Theme.brand)
                                Text(g.label)
                                    .font(.headline)
                                    .foregroundStyle(.primary)
                                Text(g.desc)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(.leading)
                                    .lineLimit(2)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .cardStyle()
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("grade-\(g.grade)")
                    }
                }
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
```

## ProbeView
Path: `ios/Xingya/Views/ProbeView.swift`

```swift
// 首次进入的基线探针（SPEC §5）：约 10 次「按下你看到的数字」，量的是**手速**
// 不是算术。中位反应时 × 倍率 = 这个孩子的答题时限，避免用统一时限压慢手的孩子。

import SwiftUI

struct ProbeView: View {
    let pack: ContentPack
    let storage: any StorageAdapter
    let studentId: String
    var onDone: (Int) -> Void

    @State private var trial = 0
    @State private var times: [Int] = []
    @State private var startedAt = Date()

    private var trials: Int { pack.engineConfig.individualizedGoal.probeProblemCount }
    /// 与 Web 端同一套确定性目标序列（热身不需要随机）
    private var target: Int { ((trial * 7 + 3) % 9) + 1 }

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text("热身 🖐️").font(.title2.weight(.semibold))
                Text("按下你看到的数字，越快越好")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                ProgressView(value: Double(trial), total: Double(trials))
                    .frame(maxWidth: 220)
                Text("\(trial + 1) / \(trials)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }

            Text("\(target)")
                .font(.system(size: 96, weight: .bold, design: .rounded))
                .monospacedDigit()
                .contentTransition(.numericText())
                .accessibilityLabel("请按 \(target)")

            NumpadView(
                onDigit: tap,
                onDelete: {},
                onSubmit: {},
                submitDisabled: true
            )
            .padding(.horizontal)
        }
        .padding()
        .onAppear { startedAt = Date() }
    }

    private func tap(_ digit: Int) {
        guard digit == target else { return } // 只有按对才计时，避免乱按拉低时限
        times.append(max(0, Int(Date().timeIntervalSince(startedAt) * 1000)))
        if trial + 1 >= trials {
            let gate = LatencyGate.compute(probeTimesMs: times, config: pack.engineConfig)
            let now = Int(Date().timeIntervalSince1970 * 1000)
            var student = storage.student(id: studentId)
                ?? StudentRecord(id: studentId, createdAt: now, latencyGateMs: nil, xp: 0)
            student.latencyGateMs = gate
            storage.putStudent(student)
            onDone(gate)
        } else {
            withAnimation { trial += 1 }
            startedAt = Date()
        }
    }
}
```

## KnowledgeMapView
Path: `ios/Xingya/Views/KnowledgeMapView.swift`

```swift
// 知识地图首页 —— 糖果乐园视觉。单元分组 + 糖果卡片（学科专属色图标 + 进度条 + 金星）。
// 保留多年级、家长/账号/切换年级菜单、上下册切换等全部接口，只重塑视觉。

import SwiftUI

struct KnowledgeMapView: View {
    let content: AppContent
    let storage: any StorageAdapter
    let studentId: String
    var onParent: (() -> Void)?
    var onChangeGrade: (() -> Void)?
    var onAccount: (() -> Void)?

    @State private var term: Term = .upper

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 4, pinnedViews: []) {
                    termPicker
                    ForEach(content.map.units(term: term)) { unit in
                        unitSection(unit)
                    }
                }
                .padding(.horizontal, Theme.pad)
                .padding(.bottom, 24)
            }
            .background(Theme.pageBackground.ignoresSafeArea())
            .navigationTitle("星芽 · \(Grades.label(for: content.map.grade))")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.large)
            #endif
            .toolbar {
                ToolbarItem(placement: .automatic) {
                    Menu {
                        if let onAccount {
                            Button("账号", systemImage: "person.crop.circle", action: onAccount)
                        }
                        if let onParent {
                            Button("家长", systemImage: "person.2.fill", action: onParent)
                        }
                        if let onChangeGrade {
                            Button("切换年级", systemImage: "arrow.left.arrow.right", action: onChangeGrade)
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle.fill")
                            .foregroundStyle(Theme.brand)
                    }
                    .accessibilityIdentifier("home-menu")
                    .accessibilityLabel("更多")
                }
            }
        }
    }

    private var termPicker: some View {
        Picker("学期", selection: $term) {
            Text("上册").tag(Term.upper)
            Text("下册").tag(Term.lower)
        }
        .pickerStyle(.segmented)
        .padding(.top, 4)
        .padding(.bottom, 6)
    }

    // ----- 单元 --------------------------------------------------------------

    private func unitSection(_ unit: Unit) -> some View {
        let topics = content.map.topics(in: unit)
        return VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 7) {
                Text("✳️")
                Text(unit.title)
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.ink)
                Spacer()
                Text("\(topics.count) 课")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.sub)
            }
            .padding(.horizontal, 4)
            .padding(.top, 10)

            ForEach(topics) { topic in
                topicCard(topic)
            }
        }
    }

    // ----- 卡片 --------------------------------------------------------------

    @ViewBuilder
    private func topicCard(_ topic: Topic) -> some View {
        switch content.route(for: topic) {
        case .fluency(let trackId):
            NavigationLink { fluencyDestination(trackId: trackId) } label: {
                cardBody(topic, progress: fluencyProgress(trackId), locked: false)
            }
            .buttonStyle(.plain)
        case .practice(let setId):
            NavigationLink {
                PracticeView(model: PracticeModel(set: content.practicePack.set(id: setId)!, storage: storage, studentId: studentId))
            } label: {
                cardBody(topic, progress: practiceProgress(setId), locked: false)
            }
            .buttonStyle(.plain)
        case .comingSoon:
            cardBody(topic, progress: 0, locked: true)
        }
    }

    private func cardBody(_ topic: Topic, progress: Double, locked: Bool) -> some View {
        let (c1, c2) = Theme.candyColors(for: topic.pedagogy)
        return HStack(spacing: 12) {
            Text(locked ? "🔒" : topic.pedagogy.emoji)
                .font(.system(size: 24))
                .frame(width: 48, height: 48)
                .background(
                    locked ? AnyShapeStyle(Theme.track) : AnyShapeStyle(Theme.candyGradient(for: topic.pedagogy)),
                    in: .rect(cornerRadius: 14)
                )
                .shadow(color: (locked ? Color.clear : c2).opacity(0.4), radius: 6, y: 4)

            VStack(alignment: .leading, spacing: 2) {
                Text(topic.title)
                    .font(.system(size: 16, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.ink)
                Text(topic.pedagogy.label)
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.sub)
                    .padding(.bottom, 6)
                if locked {
                    Text("即将上线")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(Theme.sub)
                } else {
                    BrandProgress(
                        value: progress, height: 7,
                        fill: LinearGradient(colors: [c1, c2], startPoint: .leading, endPoint: .trailing)
                    )
                }
            }

            Spacer(minLength: 6)

            if !locked {
                Text(stars(progress))
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundStyle(Theme.gold)
            }
        }
        .cardStyle()
        .opacity(locked ? 0.62 : 1)
    }

    private func stars(_ p: Double) -> String {
        let filled = p >= 0.8 ? 3 : (p >= 0.4 ? 2 : (p > 0 ? 1 : 0))
        return String(repeating: "★", count: filled) + String(repeating: "☆", count: 3 - filled)
    }

    // ----- 目标 & 进度 -------------------------------------------------------

    @ViewBuilder
    private func fluencyDestination(trackId: String) -> some View {
        if let model = try? GameModel(trackId: trackId, pack: content.fluencyPack, storage: storage, studentId: studentId) {
            PlayView(model: model, pack: content.fluencyPack, storage: storage, studentId: studentId)
        } else {
            ContentUnavailableView("打不开", systemImage: "exclamationmark.triangle")
        }
    }

    private func fluencyProgress(_ trackId: String) -> Double {
        guard let state = storage.trackState(studentId: studentId, trackId: trackId),
              let track = content.fluencyPack.tracks.first(where: { $0.trackId == trackId }),
              !track.levels.isEmpty else { return 0 }
        return Double(state.completedLevels.count) / Double(track.levels.count)
    }

    private func practiceProgress(_ setId: String) -> Double {
        guard let rec = storage.practiceRecord(studentId: studentId, setId: setId), rec.total > 0 else { return 0 }
        return Double(rec.bestFirstTryCorrect) / Double(rec.total)
    }
}
```

## PlayView
Path: `ios/Xingya/Views/PlayView.swift`

```swift
// 答题主界面：倒计时环 + 题干 + 数字键盘，纠错/过关用浮层。
// 交互契约照搬 Web 端 Play.tsx（倒计时归零算超时失误、纠错朗读答案、
// 纠错与过关都要孩子主动点「继续」），视觉走 iOS 原生。

import SwiftUI

struct PlayView: View {
    @State private var model: GameModel
    @State private var input = ""
    @State private var ringProgress: Double = 1
    @State private var lastPromptAt = Date()
    @Environment(SpeechService.self) private var speech
    @Environment(TimeLockService.self) private var timeLock
    @Environment(\.dismiss) private var dismiss

    private let pack: ContentPack
    private let storage: any StorageAdapter
    private let studentId: String

    init(model: GameModel, pack: ContentPack, storage: any StorageAdapter, studentId: String) {
        _model = State(initialValue: model)
        self.pack = pack
        self.storage = storage
        self.studentId = studentId
    }

    private var gateSeconds: Double { Double(model.latencyGateMs) / 1000 }

    var body: some View {
        VStack(spacing: 16) {
            header
            RocketChartView(
                levels: model.track.levels.map(\.level),
                completed: model.trackState?.completedLevels ?? [],
                current: model.trackState?.currentLevel ?? "A",
                compact: true
            )
            LevelBar(info: model.levelInfo)
            Spacer(minLength: 0)
            stage
            Spacer(minLength: 0)
        }
        .padding()
        .background(Theme.pageBackground.ignoresSafeArea())
        .navigationTitle(model.track.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink {
                    RaceView(trackId: model.track.trackId, pack: pack, storage: storage, studentId: studentId)
                } label: {
                    Image(systemName: "flag.checkered")
                }
                .accessibilityLabel("竞速")
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    speech.isMuted.toggle()
                } label: {
                    Image(systemName: speech.isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                }
                .accessibilityLabel(speech.isMuted ? "开启语音" : "关闭语音")
            }
        }
        .overlay { overlay }
        .overlay { if timeLock.isLocked { lockCover } }
        // 每出一道新题：累计活跃时间到时间锁、清空输入、重置倒计时环、到点判超时
        .task(id: model.promptSeq) {
            let now = Date()
            timeLock.tick(deltaMs: Int(now.timeIntervalSince(lastPromptAt) * 1000))
            lastPromptAt = now

            input = ""
            guard case .prompt = model.viewState else { return }
            ringProgress = 1
            withAnimation(.linear(duration: gateSeconds)) { ringProgress = 0 }
            try? await Task.sleep(for: .milliseconds(model.latencyGateMs))
            guard !Task.isCancelled else { return }
            model.timeoutMiss()
        }
    }

    private var lockCover: some View {
        ZStack {
            Rectangle().fill(.regularMaterial).ignoresSafeArea()
            LockView()
        }
    }

    // ----- 顶部进度 ----------------------------------------------------------

    private var header: some View {
        HStack {
            if let state = model.trackState {
                Label(phaseLabel(state.phase), systemImage: phaseIcon(state.phase))
                    .font(.subheadline.weight(.medium))
                    .labelStyle(.titleAndIcon)
                Spacer()
                Text(progressText(state))
                    .accessibilityIdentifier("fluency-progress")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
        }
    }

    private func progressText(_ state: TrackState) -> String {
        if state.phase == .takeOff {
            return "连对 \(state.streak)/\(model.mastery.takeOff.consecutiveCorrectWithinGate)"
        }
        let window = state.phase == .orbit ? model.mastery.orbit : model.mastery.universe
        return "\(state.attempts)/\(window.windowAttempts) 题 · 错 \(state.errors)/\(window.maxErrors)"
    }

    private func phaseLabel(_ phase: Phase) -> String {
        switch phase {
        case .takeOff: "起飞 Take-Off"
        case .orbit: "环绕 Orbit"
        case .universe: "宇宙 Universe"
        }
    }

    private func phaseIcon(_ phase: Phase) -> String {
        switch phase {
        case .takeOff: "airplane.departure"
        case .orbit: "circle.dashed"
        case .universe: "sparkles"
        }
    }

    // ----- 答题区 ------------------------------------------------------------

    @ViewBuilder
    private var stage: some View {
        switch model.viewState {
        case .prompt(let fact, let isRetest):
            VStack(spacing: 20) {
                ZStack {
                    Circle()
                        .fill(Theme.card)
                        .shadow(color: Theme.shadowColor.opacity(0.18), radius: 14, y: 8)
                    Circle()
                        .stroke(Theme.track, lineWidth: 14)
                    Circle()
                        .trim(from: 0, to: ringProgress)
                        .stroke(
                            AngularGradient(colors: [Theme.brand2, Theme.brand], center: .center),
                            style: StrokeStyle(lineWidth: 14, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                    Text(fact.prompt)
                        .font(.system(size: 60, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.ink)
                        .monospacedDigit()
                        .minimumScaleFactor(0.5)
                        .padding(.horizontal, 24)
                }
                .frame(width: 220, height: 220)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("题目 \(fact.prompt)")
                .accessibilityIdentifier("fluency-question")

                if isRetest {
                    Label("再试一次", systemImage: "arrow.clockwise")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.orange)
                }

                Text(input.isEmpty ? " " : input)
                    .font(.system(size: 44, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.ink)
                    .monospacedDigit()
                    .frame(maxWidth: .infinity)
                    .frame(height: 64)
                    .background(Theme.card, in: .rect(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(.white, lineWidth: 2))
                    .shadow(color: Theme.shadowColor.opacity(0.12), radius: 8, y: 4)
                    .accessibilityLabel(input.isEmpty ? "还没输入答案" : "你的答案 \(input)")

                NumpadView(
                    onDigit: { digit in
                        guard input.count < 4 else { return }
                        input.append(String(digit))
                    },
                    onDelete: { _ = input.popLast() },
                    onSubmit: submit,
                    submitDisabled: input.isEmpty
                )
            }

        case .loading:
            ProgressView("载入中…")

        case .failed(let message):
            ContentUnavailableView("出错了", systemImage: "exclamationmark.triangle", description: Text(message))

        default:
            // 纠错 / 过关等都由 overlay 承载，底层保持题面骨架不跳动
            Color.clear.frame(height: 1)
        }
    }

    private func submit() {
        guard let value = Int(input) else { return }
        model.submit(value)
    }

    // ----- 浮层 --------------------------------------------------------------

    @ViewBuilder
    private var overlay: some View {
        switch model.viewState {
        case .correction(let fact):
            card {
                Text("再看一遍 👀").font(.headline)
                Text("\(fact.prompt) = \(fact.answer)")
                    .accessibilityIdentifier("fluency-correction-answer")
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .monospacedDigit()
                if fact.learningType == .pattern {
                    Text("先想口诀，再添 0").font(.subheadline).foregroundStyle(.secondary)
                }
                Button("我记住了，再来一次") { model.next() }
                    .accessibilityIdentifier("fluency-retry")
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }
            .task(id: fact.id) {
                speech.speak(SpeechService.sayFact(prompt: fact.prompt, answer: fact.answer))
            }

        case .phaseDone(let phase):
            card {
                Text("🎉 \(phaseLabel(phase)) 通过！").font(.title3.weight(.semibold))
                Button("继续") { model.next() }
                    .accessibilityIdentifier("fluency-continue")
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }

        case .levelDone(let level):
            card {
                Text("🚀 第 \(level) 关全部通过！").font(.title3.weight(.semibold))
                Button("下一关") { model.next() }
                    .accessibilityIdentifier("fluency-next-level")
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }

        case .raceResult(let cpm):
            card {
                Text("竞速结束").font(.headline)
                Text("每分钟 \(Int(cpm.rounded())) 题")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                Button("继续") { model.next() }
                    .accessibilityIdentifier("fluency-continue")
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }

        default:
            EmptyView()
        }
    }

    @ViewBuilder
    private func card<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        ZStack {
            Rectangle().fill(.ultraThinMaterial).ignoresSafeArea()
            VStack(spacing: 20, content: content)
                .padding(28)
                .background(Theme.card, in: .rect(cornerRadius: 26))
                .overlay(RoundedRectangle(cornerRadius: 26).strokeBorder(.white, lineWidth: 2))
                .shadow(color: Theme.shadowColor.opacity(0.3), radius: 24, y: 10)
                .padding(32)
        }
        .transition(.opacity)
    }
}
```

## PracticeView
Path: `ios/Xingya/Views/PracticeView.swift`

```swift
// Practice 答题界面：非限时，支持选择题(mc)/填空(fill)/多格(steps)。答错给提示可重试，
// 超 maxTries 揭示答案。顶部关卡进度条按 basic→consolidate→challenge 三档。视觉走原生 HIG。

import SwiftUI

struct PracticeView: View {
    @State private var model: PracticeModel
    @State private var choiceId: String?
    @State private var fillText = ""
    @State private var fieldValues: [String: String] = [:]
    @Environment(\.dismiss) private var dismiss

    init(model: PracticeModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        VStack(spacing: 16) {
            TierBar(current: model.currentTier)
            ScrollView {
                content.padding(.vertical, 8)
            }
        }
        .padding()
        .background(Theme.pageBackground.ignoresSafeArea())
        .navigationTitle(model.set.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Text("⭐ \(model.sessionXP)")
                    .font(.subheadline.weight(.medium))
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
        }
        .onChange(of: model.problemSeq) {
            choiceId = nil
            fillText = ""
            fieldValues = [:]
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.viewState {
        case .loading:
            ProgressView()

        case .present(let problem), .wrong(let problem, _):
            problemBody(problem, locked: false)

        case .correct(let problem, let firstTry):
            VStack(spacing: 16) {
                promptText(problem)
                Label(firstTry ? "答对了！一次就对 🎉" : "答对了 👍", systemImage: "checkmark.circle.fill")
                    .font(.headline)
                    .foregroundStyle(.green)
                if model.lastGainXP > 0 {
                    Text("+\(model.lastGainXP) 经验").font(.subheadline).foregroundStyle(.orange)
                }
                if let explanation = problem.explanation {
                    calloutText(explanation)
                }
                Button("下一题") { model.next() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }

        case .reveal(let problem):
            VStack(spacing: 16) {
                promptText(problem)
                Label("看一下正确答案", systemImage: "eye.fill")
                    .font(.headline)
                    .foregroundStyle(.orange)
                Text(correctText(problem))
                    .font(.title3.weight(.semibold))
                    .multilineTextAlignment(.center)
                if let explanation = problem.explanation {
                    calloutText(explanation)
                }
                Button("下一题") { model.next() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }

        case .complete(let ftc, let total):
            VStack(spacing: 16) {
                Text("🎓").font(.system(size: 64))
                Text("这一套练完啦").font(.title2.weight(.semibold))
                Text("一次答对 \(ftc) / \(total) 题")
                    .font(.headline)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
                Button("返回") { dismiss() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }
            .padding(.top, 40)
        }
    }

    // ----- 题目主体 ----------------------------------------------------------

    @ViewBuilder
    private func problemBody(_ problem: Problem, locked: Bool) -> some View {
        VStack(spacing: 20) {
            promptText(problem)

            if case .wrong(_, let tries) = model.viewState {
                Label(problem.hint ?? "再想想", systemImage: "lightbulb")
                    .font(.subheadline)
                    .foregroundStyle(.orange)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(Color.orange.opacity(0.12), in: .rect(cornerRadius: 12))
                Text("第 \(tries) 次尝试")
                    .font(.caption).foregroundStyle(.secondary)
            }

            switch problem.type {
            case .mc: choicesInput(problem)
            case .fill: fillInput(problem)
            case .steps: stepsInput(problem)
            }

            Button("确定") { submit(problem) }
                .accessibilityIdentifier("practice-submit")
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(!canSubmit(problem))
        }
    }

    private func promptText(_ problem: Problem) -> some View {
        Text(problem.prompt)
            .font(.system(size: 40, weight: .bold, design: .monospaced))
            .foregroundStyle(Theme.ink)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
            .textSelection(.enabled)
            .padding(24)
            .background(Theme.card, in: .rect(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(.white, lineWidth: 2))
            .shadow(color: Theme.shadowColor.opacity(0.14), radius: 10, y: 6)
            .accessibilityLabel("题目 \(problem.prompt)")
            .accessibilityIdentifier("practice-question")
    }

    private func calloutText(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 12))
    }

    // ----- 三种输入 ----------------------------------------------------------

    private func choicesInput(_ problem: Problem) -> some View {
        VStack(spacing: 12) {
            ForEach(problem.choices ?? []) { choice in
                Button {
                    choiceId = choice.id
                } label: {
                    HStack(spacing: 14) {
                        Image(systemName: choiceId == choice.id ? "largecircle.fill.circle" : "circle")
                            .font(.title2)
                            .foregroundStyle(choiceId == choice.id ? Color.accentColor : .secondary)
                        Text(choice.label)
                            .font(.title3)
                            .multilineTextAlignment(.leading)
                        Spacer()
                    }
                    .padding(18)
                    .background(
                        (choiceId == choice.id ? Color.accentColor.opacity(0.12) : Color(.secondarySystemBackground)),
                        in: .rect(cornerRadius: 14)
                    )
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(choiceId == choice.id ? [.isSelected] : [])
            }
        }
    }

    private func fillInput(_ problem: Problem) -> some View {
        TextField("答案", text: $fillText)
            .accessibilityIdentifier("practice-answer")
            .keyboardType(.numbersAndPunctuation)
            .font(.system(size: 34, weight: .heavy, design: .rounded))
            .foregroundStyle(Theme.ink)
            .multilineTextAlignment(.center)
            .padding(.vertical, 18)
            .background(Theme.card, in: .rect(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.brand.opacity(0.5), lineWidth: 2))
            .shadow(color: Theme.shadowColor.opacity(0.1), radius: 8, y: 4)
            .submitLabel(.done)
            .onSubmit { submit(problem) }
    }

    private func stepsInput(_ problem: Problem) -> some View {
        VStack(spacing: 14) {
            ForEach(Array((problem.fields ?? []).enumerated()), id: \.element.id) { i, field in
                HStack(spacing: 14) {
                    Text(field.label).font(.title3.weight(.medium))
                    TextField("", text: binding(for: field.id.isEmpty ? "f\(i)" : field.id))
                        .keyboardType(.numbersAndPunctuation)
                        .font(.system(size: 30, weight: .semibold, design: .rounded))
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 14)
                        .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: 14))
                }
            }
        }
    }

    private func binding(for key: String) -> Binding<String> {
        Binding(
            get: { fieldValues[key] ?? "" },
            set: { fieldValues[key] = $0 }
        )
    }

    // ----- 提交 --------------------------------------------------------------

    private func canSubmit(_ problem: Problem) -> Bool {
        switch problem.type {
        case .mc: return choiceId != nil
        case .fill: return !fillText.trimmingCharacters(in: .whitespaces).isEmpty
        case .steps:
            let fields = problem.fields ?? []
            return fields.enumerated().allSatisfy { i, f in
                !(fieldValues[f.id.isEmpty ? "f\(i)" : f.id] ?? "").trimmingCharacters(in: .whitespaces).isEmpty
            }
        }
    }

    private func submit(_ problem: Problem) {
        guard canSubmit(problem) else { return }
        switch problem.type {
        case .mc:
            if let choiceId { model.answer(.choice(choiceId)) }
        case .fill:
            model.answer(.value(fillText))
        case .steps:
            model.answer(.fields(fieldValues))
        }
    }
}

/// 关卡进度条：基础 → 夯实 → 拔高，点亮当前所在档。
private struct TierBar: View {
    let current: Difficulty?

    private let tiers: [(Difficulty, String)] = [
        (.basic, "基础"), (.consolidate, "夯实"), (.challenge, "拔高"),
    ]

    var body: some View {
        HStack(spacing: 6) {
            ForEach(tiers, id: \.0) { tier, label in
                Text(label)
                    .font(.caption.weight(.medium))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background(background(for: tier), in: .capsule)
                    .foregroundStyle(current == tier ? .white : .secondary)
            }
        }
    }

    private func background(for tier: Difficulty) -> some ShapeStyle {
        current == tier ? AnyShapeStyle(Color.accentColor) : AnyShapeStyle(Color(.secondarySystemFill))
    }
}
```

## RaceView
Path: `ios/Xingya/Views/RaceView.swift`

```swift
// 里程碑竞速：限时内用已学 facts 连续答题，结算每分钟答对数。
// 与答题主界面的区别（SPEC §5/§7）：全局倒计时而非单题倒计时、竞速全程不朗读、
// 只看对错不看时限。引擎 startRace/finishRace 已被黄金用例覆盖，这里只做壳。

import SwiftUI

struct RaceView: View {
    let trackId: String
    let pack: ContentPack
    let storage: any StorageAdapter
    let studentId: String

    @State private var model: GameModel?
    @State private var remainingMs = 0
    @State private var startError: String?
    @Environment(\.dismiss) private var dismiss

    private var speeds: [RaceSpeed] {
        pack.engineConfig.milestoneRaces.speeds ?? [
            RaceSpeed(id: "standard", label: "标准", emoji: "🚀", seconds: pack.engineConfig.milestoneRaces.durationSeconds)
        ]
    }

    var body: some View {
        Group {
            if let error = startError {
                ContentUnavailableView("开始不了", systemImage: "flag.slash", description: Text(error))
            } else if let model {
                switch model.viewState {
                case .raceResult(let cpm):
                    resultScreen(cpm: cpm)
                case .prompt(let fact, _):
                    racingScreen(model: model, fact: fact)
                default:
                    ProgressView()
                }
            } else {
                chooseScreen
            }
        }
        .background(Theme.pageBackground.ignoresSafeArea())
        .navigationTitle("竞速")
        .navigationBarTitleDisplayMode(.inline)
    }

    // ----- 选速度 ------------------------------------------------------------

    private var chooseScreen: some View {
        VStack(spacing: 16) {
            Text("选一个速度，看看一分钟能答对多少题")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            ForEach(speeds) { speed in
                Button {
                    start(durationSeconds: speed.seconds)
                } label: {
                    HStack {
                        Text(speed.emoji).font(.title)
                        VStack(alignment: .leading) {
                            Text(speed.label).font(.headline)
                            Text("\(speed.seconds) 秒").font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right").foregroundStyle(.tertiary)
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: 16))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("race-speed-\(speed.id)")
                .padding(.horizontal)
            }
            Spacer()
        }
        .padding(.top)
    }

    private func start(durationSeconds: Int) {
        do {
            let m = try GameModel(trackId: trackId, pack: pack, storage: storage, studentId: studentId)
            m.startRace(durationMs: durationSeconds * 1000)
            model = m
            remainingMs = durationSeconds * 1000
        } catch {
            startError = "\(error)"
        }
    }

    // ----- 竞速中 ------------------------------------------------------------

    private func racingScreen(model: GameModel, fact: Fact) -> some View {
        VStack(spacing: 24) {
            timerBar
            Spacer()
            Text(fact.prompt)
                .font(.system(size: 52, weight: .bold, design: .rounded))
                .monospacedDigit()
                .accessibilityLabel("题目 \(fact.prompt)")
                .accessibilityIdentifier("race-question")
            if let race = model.trackState?.race {
                Text("已答对 \(race.correct) 题")
                    .accessibilityIdentifier("race-correct-count")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
            Spacer()
            RaceNumpad(model: model)
        }
        .padding()
        // 全局倒计时：到点主动收尾，即便孩子停手
        .task(id: model.promptSeq) {
            while !Task.isCancelled {
                guard let endsAt = model.trackState?.race?.endsAt else { return }
                let left = endsAt - Int(Date().timeIntervalSince1970 * 1000)
                remainingMs = max(0, left)
                if left <= 0 {
                    model.next() // 触发 finishRace
                    return
                }
                try? await Task.sleep(for: .milliseconds(100))
            }
        }
    }

    private var timerBar: some View {
        let total = Double((model?.trackState?.race?.durationMs ?? 1))
        let frac = total > 0 ? Double(remainingMs) / total : 0
        return VStack(spacing: 6) {
            Text("\(Int(ceil(Double(remainingMs) / 1000))) 秒")
                .font(.title3.weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(remainingMs <= 10000 ? .orange : .primary)
            ProgressView(value: frac)
                .tint(remainingMs <= 10000 ? .orange : .accentColor)
        }
    }

    // ----- 结果 --------------------------------------------------------------

    private func resultScreen(cpm: Double) -> some View {
        VStack(spacing: 20) {
            Spacer()
            Text("🏁").font(.system(size: 64))
            Text("每分钟 \(Int(cpm.rounded())) 题")
                .font(.system(size: 40, weight: .bold, design: .rounded))
            if let race = model?.trackState?.race {
                Text("共答对 \(race.correct) / \(race.answered) 题")
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(spacing: 12) {
                Button("再来一次") { model = nil }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                Button("返回") { dismiss() }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
            }
            .padding(.horizontal)
        }
        .padding()
    }
}

/// 竞速专用键盘：答完立刻提交并出下一题（无「确定」步骤，追求手速）。
private struct RaceNumpad: View {
    let model: GameModel
    @State private var input = ""

    var body: some View {
        VStack(spacing: 12) {
            Text(input.isEmpty ? " " : input)
                .font(.system(size: 32, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: 12))

            NumpadView(
                onDigit: { d in
                    guard input.count < 4 else { return }
                    input.append(String(d))
                },
                onDelete: { _ = input.popLast() },
                onSubmit: submit,
                submitDisabled: input.isEmpty
            )
        }
        .onChange(of: model.promptSeq) { input = "" }
    }

    private func submit() {
        guard let value = Int(input) else { return }
        model.submit(value)
    }
}
```

## ReportView
Path: `ios/Xingya/Views/ReportView.swift`

```swift
// 学习报告（糖果乐园）。KPI（总题数/正确率/经验等级）+ 最近 7 天柱状图 + 薄弱知识点。
// 数据来自本地事件日志与练习记录，纯读取、不写入。

import SwiftUI

struct ReportView: View {
    let content: AppContent
    let storage: any StorageAdapter
    let studentId: String

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    kpiRow
                    weeklyCard
                    weakCard
                }
                .padding(Theme.pad)
                .padding(.bottom, 24)
            }
            .background(Theme.pageBackground.ignoresSafeArea())
            .navigationTitle("📈 学习报告")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.large)
            #endif
        }
    }

    // ----- 数据 --------------------------------------------------------------

    private var events: [AnswerEventRecord] { storage.events(studentId: studentId, limit: 2000) }

    private var totalAnswered: Int {
        events.filter { ["hit", "miss", "retest_pass", "retest_fail"].contains($0.outcome) }.count
    }
    private var hits: Int { events.filter { $0.outcome == "hit" || $0.outcome == "retest_pass" }.count }
    private var accuracy: Int {
        totalAnswered == 0 ? 0 : Int((Double(hits) / Double(totalAnswered) * 100).rounded())
    }
    private var levelInfo: LevelInfo { levelFromXp(storage.student(id: studentId)?.xp ?? 0) }

    /// 最近 7 天每天答题数（今天在最右）
    private var weeklyCounts: [Int] {
        let dayMs = 86_400_000
        let now = Int(Date().timeIntervalSince1970 * 1000)
        let todayStart = now - (now % dayMs)
        var buckets = Array(repeating: 0, count: 7)
        for e in events {
            let daysAgo = (todayStart - (e.ts - (e.ts % dayMs))) / dayMs
            if daysAgo >= 0, daysAgo < 7 { buckets[6 - daysAgo] += 1 }
        }
        return buckets
    }

    /// 薄弱知识点：掌握度最低的几项（口算按完成关数，练习按一次答对率）
    private struct Weak: Identifiable { let id: String; let title: String; let ratio: Double }
    private var weakItems: [Weak] {
        var out: [Weak] = []
        for track in content.fluencyPack.tracks where track.enabled {
            let done = storage.trackState(studentId: studentId, trackId: track.trackId)?.completedLevels.count ?? 0
            let r = track.levels.isEmpty ? 0 : Double(done) / Double(track.levels.count)
            if r < 1 { out.append(Weak(id: track.trackId, title: track.name, ratio: r)) }
        }
        for set in content.practicePack.sets {
            if let rec = storage.practiceRecord(studentId: studentId, setId: set.id), rec.total > 0 {
                let r = Double(rec.bestFirstTryCorrect) / Double(rec.total)
                if r < 0.9 { out.append(Weak(id: set.id, title: set.title, ratio: r)) }
            }
        }
        return Array(out.sorted { $0.ratio < $1.ratio }.prefix(3))
    }

    // ----- 视图 --------------------------------------------------------------

    private var kpiRow: some View {
        HStack(spacing: 12) {
            kpi("\(totalAnswered)", "总题数", id: "report-total")
            kpi("\(accuracy)%", "正确率", id: "report-accuracy")
            kpi("Lv.\(levelInfo.level)", "等级", id: "report-level")
        }
    }

    private func kpi(_ num: String, _ label: String, id: String) -> some View {
        VStack(spacing: 4) {
            Text(num)
                .accessibilityIdentifier(id)
                .font(.system(size: 24, weight: .heavy, design: .rounded))
                .foregroundStyle(Theme.brand)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            Text(label)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.sub)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .cardStyle(radius: Theme.rMd, padding: 0)
    }

    private var weeklyCard: some View {
        let counts = weeklyCounts
        let maxV = max(counts.max() ?? 1, 1)
        return VStack(alignment: .leading, spacing: 12) {
            Text("最近练习").font(.system(size: 16, weight: .heavy, design: .rounded)).foregroundStyle(Theme.ink)
            HStack(alignment: .bottom, spacing: 8) {
                ForEach(Array(counts.enumerated()), id: \.offset) { _, v in
                    VStack {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Theme.brandGradient)
                            .frame(height: max(6, CGFloat(v) / CGFloat(maxV) * 96))
                    }
                    .frame(maxWidth: .infinity, alignment: .bottom)
                }
            }
            .frame(height: 100)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle(radius: Theme.rLg, padding: 16)
    }

    private var weakCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("薄弱知识点").font(.system(size: 16, weight: .heavy, design: .rounded)).foregroundStyle(Theme.ink)
            let items = weakItems
            if items.isEmpty {
                Text("暂无，继续加油 🎉")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(Theme.sub)
            } else {
                ForEach(items) { w in
                    HStack(spacing: 12) {
                        Text(w.title)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(1)
                        Spacer()
                        BrandProgress(value: w.ratio, height: 8, fill: Theme.warnGradient)
                            .frame(width: 120)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle(radius: Theme.rLg, padding: 16)
    }
}
```

## ProfileView
Path: `ios/Xingya/Views/ProfileView.swift`

```swift
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
```

## AccountView
Path: `ios/Xingya/Views/AccountView.swift`

```swift
// 账号中心：登录态、云同步、订阅（StoreKit 2）。

import StoreKit
import SwiftUI

struct AccountView: View {
    let storage: any StorageAdapter
    let studentId: String
    var onClose: () -> Void

    @Environment(AuthSession.self) private var auth
    @Environment(StoreKitService.self) private var store

    @State private var showAuth = false
    @State private var syncMessage = ""
    @State private var isSyncing = false
    @State private var confirmDelete = false
    @State private var deleteMessage = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    BrandCard {
                        HStack(spacing: 12) {
                            Image(systemName: auth.isLoggedIn ? "person.crop.circle.fill" : "person.crop.circle")
                                .font(Theme.titleFont(36)).foregroundStyle(Theme.brand)
                            VStack(alignment: .leading, spacing: 4) {
                                BrandSectionTitle(auth.isLoggedIn ? (store.canUseCloud(auth) ? "月度会员有效" : "已登录 · 未开通会员") : "未登录")
                                if let user = auth.user, auth.isLoggedIn {
                                    Text(user.username).font(Theme.bodyFont)
                                } else {
                                    Text("登录并开通月度会员后可手动同步部分数学进度")
                                        .font(Theme.captionFont).foregroundStyle(Theme.sub)
                                }
                            }
                        }
                        if !auth.isLoggedIn {
                            BrandPrimaryButton("登录") { showAuth = true }
                                .accessibilityIdentifier("account-login")
                        }
                        if !deleteMessage.isEmpty {
                            BrandNotice(message: L10n.text(deleteMessage))
                        }
                        if let error = auth.lastError {
                            BrandNotice(message: L10n.text(error), isError: true)
                        }
                    }

                    if auth.isLoggedIn {
                        BrandCard(title: "云同步") {
                            Button {
                                Task { await syncNow() }
                            } label: {
                                HStack {
                                    if isSyncing { ProgressView().tint(Theme.ink) }
                                    Label("立即同步", systemImage: "arrow.triangle.2.circlepath")
                                }
                            }
                            .buttonStyle(BrandSecondaryStyle())
                            .disabled(isSyncing || auth.isBusy || !canSync)
                            .accessibilityIdentifier("account-sync")

                            Text("仅手动合并经验、手速阈值、关卡、练习最佳成绩与错题；答题事件、完整报告、年级设置和家长 PIN 不同步。")
                                .font(Theme.captionFont).foregroundStyle(Theme.sub)
                            Text(L10n.text(SyncOwnership.resetMessage)).font(Theme.captionFont).foregroundStyle(Theme.sub)
                            if !ownsLocalData {
                                BrandNotice(message: L10n.text(SyncOwnership.blockedMessage), isError: true)
                            }
                            if !store.canUseCloud(auth) {
                                Text("云同步为月度会员权益，请在下方开通或恢复购买；验证失败时仍可离线练习。")
                                    .font(Theme.captionFont).foregroundStyle(Theme.sub)
                            }
                            if !syncMessage.isEmpty { BrandNotice(message: syncMessage) }
                        }
                    }

                    MembershipSection()

                    BrandCard(title: "本机学习数据") {
                        Text(L10n.text(SyncOwnership.scopeMessage)).font(Theme.captionFont).foregroundStyle(Theme.sub)
                        if auth.isLoggedIn {
                            HStack(spacing: 16) {
                                Button("退出登录", role: .destructive) {
                                    auth.logout()
                                    syncMessage = ""
                                    deleteMessage = ""
                                }
                                .buttonStyle(BrandTextStyle(destructive: true))
                                .disabled(isSyncing || auth.isBusy)
                                Spacer()
                                Button("删除账号…", role: .destructive) { confirmDelete = true }
                                    .buttonStyle(BrandTextStyle(destructive: true))
                                    .disabled(isSyncing || auth.isBusy)
                                    .accessibilityIdentifier("account-delete")
                            }
                        }
                    }
                    VStack(alignment: .leading, spacing: 12) {
                        BrandSectionTitle("关于")
                        Link("应用支持", destination: URL(string: "https://rocket-math-4kg.pages.dev/app-support.html")!)
                            .buttonStyle(BrandTextStyle())
                        Text("隐私与支持网页已可访问，网页联系邮箱更新待部署，可直接通过以上邮箱联系。学习数据默认保存在本机；云同步须手动操作；AI 总结会发送错题题干、作答、正确答案与耗时样例至 DeepSeek。")
                        Text("本地优先：口算、练习和本地分析免费，未登录也能离线使用。云同步与 AI 家长总结需登录并拥有有效月度会员。")
                    }
                    .font(Theme.captionFont).foregroundStyle(Theme.sub)
                    .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 6)
                }
                .frame(maxWidth: 620)
                .padding(Theme.pad)
                .frame(maxWidth: .infinity)
            }
            .accessibilityIdentifier("account-scroll")
            .background(Theme.pageBackground.ignoresSafeArea())
            .foregroundStyle(Theme.ink)
            .navigationTitle("账号")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    BrandTextButton("完成", action: onClose)
                }
            }
            .sheet(isPresented: $showAuth) {
                AuthView()
                    .environment(auth)
            }
            .confirmationDialog("删除账号？", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("删除云端账号", role: .destructive) {
                    Task {
                        let ok = await auth.deleteAccount()
                        deleteMessage = ok
                            ? "服务器已确认删除。本机学习数据和原账号关联仍保留。"
                            : (auth.lastError ?? "删除失败")
                    }
                }
                Button("取消", role: .cancel) {}
            } message: {
                Text("请求清理账号关联的云端学习记录并停用账号。服务端保留去除登录标识的账号占位记录，订阅关联记录保留以防重复认领，非全部日志和备份删除。只有服务器确认成功后才退出。本机数据和原账号关联保留；线上删除版本待核验。删除账号不会取消 Apple 订阅，请先管理订阅。")
            }
            .task {
                await auth.refreshMe()
                await store.loadProducts()
                await store.refresh()
            }
        }
    }

    private var canSync: Bool { ownsLocalData && store.canUseCloud(auth) }

    private var ownsLocalData: Bool {
        guard let user = auth.user else { return false }
        return auth.syncOwnership.allows(userId: user.id, studentId: studentId)
    }

    private func syncNow() async {
        guard auth.isLoggedIn else { return }
        isSyncing = true
        syncMessage = ""
        defer { isSyncing = false }
        do {
            let snap = try await ProgressSync.sync(
                storage: storage,
                studentId: studentId,
                auth: auth
            )
            let n = snap.tracks.count + snap.practices.count + snap.mistakes.count
            syncMessage = "已同步 · 服务端合并结果已应用：\(n) 条学习记录，另含经验与手速阈值。"
        } catch {
            syncMessage = "同步失败：\(error.localizedDescription)"
        }
    }
}
```

## AuthView
Path: `ios/Xingya/Views/AuthView.swift`

```swift
// 登录 / 注册。对接 Cloudflare /api/auth/*。

import SwiftUI

struct AuthView: View {
    @Environment(AuthSession.self) private var auth
    @Environment(\.dismiss) private var dismiss

    @State private var mode: Mode = .login
    @State private var username = ""
    @State private var password = ""
    @State private var email = ""

    private enum Mode { case login, register }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                VStack(spacing: 8) {
                    Image(systemName: "sparkle").font(Theme.titleFont(32)).foregroundStyle(Theme.brand)
                    Text(mode == .login ? "登录星芽" : "注册星芽").font(Theme.titleFont(26))
                }
                .padding(.top, 20)
                Picker("方式", selection: $mode) {
                    Text("登录").tag(Mode.login)
                    Text("注册").tag(Mode.register)
                }
                .pickerStyle(.segmented)
                

                BrandCard {
                    BrandTextField("用户名", text: $username)
                        .textContentType(.username)
                        .autocorrectionDisabled()
                        #if os(iOS)
                        .textInputAutocapitalization(.never)
                        #endif
                        .accessibilityIdentifier("auth-username")
                    BrandSecureField("密码", text: $password)
                        .textContentType(mode == .login ? .password : .newPassword)
                        .accessibilityIdentifier("auth-password")
                    if mode == .register {
                        BrandTextField("邮箱", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            #if os(iOS)
                            .textInputAutocapitalization(.never)
                            #endif
                            .accessibilityIdentifier("auth-email")
                    }
                                    Text(mode == .login
                       ? "登录后可云同步进度，换设备继续练。"
                       : "用户名 3–20 字，密码至少 6 位。")
                        .font(Theme.captionFont).foregroundStyle(Theme.sub)
                }

                if let err = auth.lastError, !err.isEmpty {
                    Group {
                        BrandNotice(message: L10n.text(err), isError: true)
                            .accessibilityIdentifier("auth-error")
                    }
                }

                Group {
                    BrandPrimaryButton(mode == .login ? "登录" : "注册并登录", isLoading: auth.isBusy) {
                        Task {
                            if mode == .login {
                                await auth.login(username: username.trimmingCharacters(in: .whitespaces), password: password)
                            } else {
                                await auth.register(
                                    username: username.trimmingCharacters(in: .whitespaces),
                                    password: password,
                                    email: email.trimmingCharacters(in: .whitespaces)
                                )
                            }
                            if auth.isLoggedIn { dismiss() }
                        }
                    }
                    .disabled(!canSubmit || auth.isBusy)
                    .accessibilityIdentifier("auth-submit")
                }
                }
                .frame(maxWidth: 520)
                .padding(Theme.pad)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.pageBackground.ignoresSafeArea())
            .foregroundStyle(Theme.ink)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    BrandTextButton("关闭") { dismiss() }
                }
            }
        }
    }

    private var canSubmit: Bool {
        let u = username.trimmingCharacters(in: .whitespaces)
        guard u.count >= 3, password.count >= 6 else { return false }
        if mode == .register {
            return email.contains("@") && email.contains(".")
        }
        return true
    }
}
```

## MembershipSection
Path: `ios/Xingya/Views/MembershipSection.swift`

```swift
import StoreKit
import SwiftUI

struct MembershipSection: View {
    @Environment(AuthSession.self) private var auth
    @Environment(StoreKitService.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            BrandCard(title: "月度会员") {
                if store.canUseCloud(auth) {
                    Label("月度会员有效", systemImage: "checkmark.seal.fill")
                        .font(Theme.titleFont(20)).foregroundStyle(Theme.accent)
                    if store.serverMembership?.environment == "Sandbox" {
                        Text("沙盒测试权益，不代表生产购买。")
                            .font(Theme.captionFont).foregroundStyle(Theme.sub)
                    }
                } else if store.isPremium {
                    BrandNotice(message: "已发现 Apple 购买，云端会员尚未验证。请使用原购买账号恢复；不要重复购买。")
                }
                Text("口算、练习和本地分析免费，支持离线。月度会员提供云同步与 AI 家长总结，须登录并关联购买账号。")
                    .font(Theme.captionFont).foregroundStyle(Theme.sub)
                if store.isLoading || store.isRefreshing {
                    ProgressView("正在加载 / 验证会员…").tint(Theme.brand)
                }
                if store.products.isEmpty && !store.isLoading {
                    BrandNotice(message: "订阅商品当前不可用。请重试；开发者需核对 App Store Connect 商品配置与可售状态。核心练习仍可使用。")
                }
                ForEach(store.products, id: \.id) { product in
                    VStack(alignment: .leading, spacing: 10) {
                        Text(product.displayName).font(Theme.titleFont(18))
                            .accessibilityIdentifier("membership-product-name")
                        Text(product.description).font(Theme.captionFont).foregroundStyle(Theme.sub)
                        HStack(alignment: .firstTextBaseline, spacing: 8) {
                            Text(product.displayPrice).font(Theme.numberFont(28))
                                .accessibilityIdentifier("membership-price")
                            Text("每月").font(Theme.captionFont).foregroundStyle(Theme.sub)
                                .accessibilityIdentifier("membership-period")
                        }
                        if !store.canUseCloud(auth) {
                            if auth.isLoggedIn {
                                BrandPrimaryButton("订阅月度会员") {
                                    Task { await store.purchase(product, auth: auth) }
                                }
                                .disabled(!auth.isLoggedIn || auth.isBusy || store.isLoading || store.isRefreshing
                                          || store.isPremium || store.canUseCloud(auth))
                                .accessibilityIdentifier("membership-purchase")
                            } else {
                                Button("订阅月度会员") {
                                    Task { await store.purchase(product, auth: auth) }
                                }
                                .buttonStyle(BrandSecondaryStyle())
                                .disabled(!auth.isLoggedIn || auth.isBusy || store.isLoading || store.isRefreshing
                                          || store.isPremium || store.canUseCloud(auth))
                                .accessibilityIdentifier("membership-purchase")
                            }
                        }
                    }
                }
                BrandSecondaryButton("恢复购买") { Task { await store.restore() } }
                    .disabled(store.isLoading || store.isRefreshing || auth.isBusy)
                    .accessibilityIdentifier("membership-restore")
                if !auth.isLoggedIn {
                    Text("请先登录要关联会员的账号，再购买或验证恢复结果。")
                        .font(Theme.captionFont).foregroundStyle(Theme.sub)
                }
                BrandTextButton("刷新商品与权益") {
                    Task { await store.loadProducts(); await store.refresh() }
                }
                .disabled(store.isLoading || store.isRefreshing)
                if let message = store.feedback.message { BrandNotice(message: L10n.text(message)) }
                if let error = store.lastError { BrandNotice(message: L10n.text(error), isError: true) }
            }
            VStack(alignment: .leading, spacing: 10) {
                Text("按月自动续订，费用由 Apple 账户支付。除非在当前周期结束至少 24 小时前取消，否则将续订；取消后可用至有效期结束。价格以商店显示和 Apple 购买确认页为准。")
                HStack(spacing: 20) {
                    Link("管理订阅", destination: URL(string: "https://apps.apple.com/account/subscriptions")!)
                    Link("Apple 标准 EULA", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
                }
                Link("隐私政策", destination: URL(string: "https://rocket-math-4kg.pages.dev/privacy.html")!)
                Link("支持与隐私联系：cswanghan@gmail.com", destination: URL(string: "mailto:cswanghan@gmail.com")!)
                Text("隐私与支持网页已可访问，网页联系邮箱更新待部署。删除星芽账号不会自动取消 Apple 订阅，请先在「管理订阅」中处理。")
                #if DEBUG
                Text("调试构建：若启用本地 StoreKit 配置，商品及示例价不代表真实 ASC 目录，本地模拟购买不能解锁云端会员。")
                #endif
            }
            .font(Theme.captionFont).foregroundStyle(Theme.sub)
            .buttonStyle(BrandTextStyle())
            .padding(.horizontal, 6)
        }
    }
}
```

## ParentGateView
Path: `ios/Xingya/Views/ParentGateView.swift`

```swift
// 家长区 4 位 PIN 门。首次进入设置密码，之后每次验证。对应 Web 端 ParentGate.tsx。

import SwiftUI

struct ParentGateView: View {
    let onCancel: () -> Void
    let onUnlocked: () -> Void

    private let mode: Mode = ParentPin.hasPin ? .enter : .set
    @State private var pin = ""
    @State private var confirm = ""
    @State private var error = ""

    private enum Mode { case set, enter }

    var body: some View {
        VStack(spacing: 24) {
            HStack {
                Button("← 返回", action: onCancel)
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                Spacer()
            }
            .padding(.horizontal)

            Spacer()

            Image(systemName: "lock.fill")
                .font(.system(size: 40))
                .foregroundStyle(Theme.brand)
                .accessibilityHidden(true)

            Text(mode == .set ? "设置家长密码" : "家长验证")
                .font(.title2.bold())

            Text(mode == .set ? "第一次进入，请设置一个 4 位数字密码" : "请输入 4 位家长密码")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            pinField(title: "输入4位数字", text: $pin)
            if mode == .set {
                pinField(title: "再输一次", text: $confirm)
            }

            if !error.isEmpty {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(Theme.danger)
                    .accessibilityIdentifier("parent-gate-error")
            }

            Button(mode == .set ? "设置并进入" : "进入") {
                submit()
            }
            .buttonStyle(.borderedProminent)
            .disabled(pin.count < 4)
            .accessibilityIdentifier("parent-gate-submit")

            Spacer()
        }
        .padding()
        .background(Theme.pageBackground.ignoresSafeArea())
    }

    private func pinField(title: String, text: Binding<String>) -> some View {
        SecureField(title, text: text)
            .keyboardType(.numberPad)
            .textContentType(.oneTimeCode)
            .multilineTextAlignment(.center)
            .font(.title3.monospacedDigit())
            .padding()
            .background(Theme.card, in: .rect(cornerRadius: Theme.rSm))
            .overlay(RoundedRectangle(cornerRadius: Theme.rSm).strokeBorder(Theme.line))
            .frame(maxWidth: 220)
            .onChange(of: text.wrappedValue) { _, new in
                let digits = new.filter(\.isNumber)
                text.wrappedValue = String(digits.prefix(4))
                error = ""
            }
            .accessibilityIdentifier(title)
    }

    private func submit() {
        switch mode {
        case .set:
            guard pin.count == 4 else { error = "请输入 4 位数字"; return }
            guard pin == confirm else { error = "两次输入不一致"; return }
            ParentPin.set(pin)
            onUnlocked()
        case .enter:
            if ParentPin.check(pin) {
                onUnlocked()
            } else {
                error = "密码错误"
                pin = ""
            }
        }
    }
}
```

## ParentDashboardView
Path: `ios/Xingya/Views/ParentDashboardView.swift`

```swift
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
                        Text("Lv.\(level.level)")
                            .font(.headline)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Theme.brand.opacity(0.15), in: Capsule())
                        Text("⭐ \(xp) 经验")
                        Spacer()
                        Text("待关注 \(active.count) 道")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text("错 \(summaryData.wrongTotal) · 慢 \(summaryData.slowTotal)")
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
                                canSendSummary ? "远程 AI 家长总结" : "本地免费分析",
                                systemImage: "sparkles"
                            )
                        }
                    }
                    .disabled(active.isEmpty || summaryLoading)
                    .accessibilityIdentifier("parent-summary")

                    if !canSendSummary {
                        Text("AI 家长总结为月度会员权益，请在「我的 → 账号 → 会员」开通或恢复购买。仅首次关联本机数据的账号可发送；本地分析免费。")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }

                    if !summaryText.isEmpty {
                        if !summarySource.isEmpty {
                            Text(SummarizeClient.sourceLabel(summarySource))
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
                        Section("\(group.topic) · \(group.items.count) 题") {
                            ForEach(group.items) { m in
                                mistakeCard(m)
                            }
                        }
                    }
                }

                Section("数据管理") {
                    Text(SyncOwnership.resetMessage).font(.caption).foregroundStyle(.secondary)
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
                Text("本机关卡进度、已过关、等级/经验清零，错题本保留。" + SyncOwnership.resetMessage)
            }
            .confirmationDialog("清空错题本？", isPresented: $confirmClear, titleVisibility: .visible) {
                Button("清空", role: .destructive) {
                    storage.clearMistakes(studentId: studentId)
                    summaryText = ""
                    reload()
                }
                Button("取消", role: .cancel) {}
            } message: {
                Text("清空本机错题。" + SyncOwnership.resetMessage)
            }
            .onAppear { reload() }
        }
    }

    @ViewBuilder
    private func mistakeCard(_ m: MistakeRecord) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(m.slow ? "⏱ 偏慢" : "答错")
                    .font(.caption2.bold())
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background((m.slow ? Theme.warn : Theme.danger).opacity(0.15), in: Capsule())
                if let d = m.difficulty, let label = Self.diffLabel[d] {
                    Text(label)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                if let ms = m.elapsedMs {
                    Text(fmtSec(ms))
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(.tertiary)
                }
            }
            Text(m.prompt)
                .font(.body)
            if m.slow {
                Text("答对(但偏慢): \(m.correctAnswer)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                Text("孩子答: \(m.yourAnswer)")
                    .font(.caption)
                    .foregroundStyle(Theme.danger)
                Text("正确: \(m.correctAnswer)")
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
        mistakes = storage.listMistakes(studentId: studentId)
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
            summaryText = result.text
            summarySource = result.source
        } else {
            summaryText = localSummaryText(data)
            summarySource = "本地"
        }
    }
}
```

## LockView
Path: `ios/Xingya/Views/LockView.swift`

```swift
// 休息锁屏（SPEC §7）：玩满时限后强制休息，倒数结束才放行。孩子重开 App 也躲不掉
// （状态持久在 UserDefaults）。

import SwiftUI

struct LockView: View {
    @Environment(TimeLockService.self) private var timeLock
    @State private var remaining = 0

    var body: some View {
        VStack(spacing: 20) {
            Text("🌙").font(.system(size: 72))
            Text("休息一下眼睛")
                .font(.title2.weight(.semibold))
            Text("练了这么久，起来走走、看看远处～")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Text(timeString(remaining))
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(.orange)
                .accessibilityLabel("还需休息 \(remaining / 1000) 秒")
        }
        .padding()
        .task {
            while !Task.isCancelled {
                remaining = timeLock.remainingBreakMs
                if remaining <= 0 {
                    timeLock.refreshIfBreakOver()
                    return
                }
                try? await Task.sleep(for: .seconds(1))
            }
        }
    }

    private func timeString(_ ms: Int) -> String {
        let total = max(0, ms / 1000)
        return String(format: "%02d:%02d", total / 60, total % 60)
    }
}
```

