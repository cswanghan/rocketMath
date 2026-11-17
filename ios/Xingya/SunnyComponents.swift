import SwiftUI

/// Original circles, arcs, rays and leaves. Decorative, never on top of a problem.
struct SunSprout: View {
    var body: some View {
        Canvas { context, size in
            let unit = min(size.width, size.height) / 100
            context.scaleBy(x: unit, y: unit)
            for i in 0..<8 {
                let angle = Double(i) * .pi / 4
                var ray = Path()
                ray.move(to: CGPoint(x: 50 + cos(angle) * 39, y: 54 + sin(angle) * 39))
                ray.addLine(to: CGPoint(x: 50 + cos(angle) * 46, y: 54 + sin(angle) * 46))
                context.stroke(ray, with: .color(Color(hex: 0xE3B649)), style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
            }
            context.fill(Path(ellipseIn: CGRect(x: 15, y: 19, width: 70, height: 70)), with: .color(Theme.gold))
            context.fill(Path(ellipseIn: CGRect(x: 28, y: 31, width: 16, height: 16)), with: .color(Color(hex: 0xFFDF7C)))
            for x in [41, 59] { context.fill(Path(ellipseIn: CGRect(x: Double(x), y: 49, width: 4.5, height: 4.5)), with: .color(Color(hex: 0x594400))) }
            var smile = Path(); smile.move(to: CGPoint(x: 44, y: 62)); smile.addQuadCurve(to: CGPoint(x: 57, y: 62), control: CGPoint(x: 50, y: 69))
            context.stroke(smile, with: .color(Color(hex: 0x594400)), style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
            var leaf = Path(); leaf.move(to: CGPoint(x: 50, y: 20)); leaf.addQuadCurve(to: CGPoint(x: 70, y: 8), control: CGPoint(x: 51, y: 4)); leaf.addQuadCurve(to: CGPoint(x: 50, y: 20), control: CGPoint(x: 65, y: 22))
            context.fill(leaf, with: .color(Color(hex: 0x36A46D)))
            var sprout = Path(); sprout.move(to: CGPoint(x: 47, y: 23)); sprout.addQuadCurve(to: CGPoint(x: 25, y: 19), control: CGPoint(x: 36, y: 10)); sprout.addQuadCurve(to: CGPoint(x: 47, y: 23), control: CGPoint(x: 34, y: 32))
            context.fill(sprout, with: .color(Color(hex: 0x77C98C)))
        }.aspectRatio(1, contentMode: .fit).accessibilityHidden(true)
    }
}

struct SunnyPage<Content: View>: View {
    @ViewBuilder var content: () -> Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22, content: content)
                .frame(maxWidth: 760).padding(Theme.pad).frame(maxWidth: .infinity)
        }.background(Theme.pageBg.ignoresSafeArea()).foregroundStyle(Theme.ink)
    }
}

struct SessionHeader: View {
    var progress: Double
    var title: String
    var seconds: Int?
    var paused = false
    var close: () -> Void
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            Button(action: close) { Image(systemName: "xmark").font(.title2.bold()).frame(width: 44, height: 44) }
                .buttonStyle(.plain).foregroundStyle(Theme.ink)
                .background(Theme.card, in: .rect(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.line))
                .accessibilityLabel(L10n.text("关闭")).accessibilityIdentifier("session-close")
            VStack(alignment: .leading, spacing: 8) {
                Text(title).font(.subheadline.bold()).fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("session-progress")
                BrandProgress(value: progress)
                if typeSize.isAccessibilitySize { timer }
            }
            if !typeSize.isAccessibilitySize { timer }
        }
    }
    @ViewBuilder private var timer: some View {
        if let seconds {
            Label(String(format: "%d:%02d", seconds / 60, seconds % 60), systemImage: paused ? "pause.circle" : "timer")
                .font(.headline.monospacedDigit()).padding(12)
                .foregroundStyle(paused ? Theme.sub : Theme.warn)
                .background(paused ? Theme.card : Theme.sunlight, in: .rect(cornerRadius: 14))
                .accessibilityLabel(L10n.format(paused ? "计时已暂停：%@" : "剩余时间：%@", L10n.duration(Double(seconds))))
                .accessibilityIdentifier("session-timer")
        }
    }
}

struct FeedbackBand: View {
    var correct: Bool
    var title: String
    var detail: String
    var buttonTitle = "继续"
    var identifier = "session-continue"
    var action: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 14) {
                Image(systemName: correct ? "checkmark" : "arrow.counterclockwise")
                    .font(.title2.bold()).foregroundStyle(.white)
                    .frame(width: 48, height: 48).background(correct ? Theme.button : Theme.warn, in: Circle())
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    Text(L10n.text(title)).font(.title2.bold())
                    if !detail.isEmpty { Text(L10n.text(detail)).font(.headline).fixedSize(horizontal: false, vertical: true) }
                }
                Spacer(minLength: 0)
                if correct { SunSprout().frame(width: 44, height: 44) }
            }
            BrandPrimaryButton(buttonTitle, action: action).accessibilityIdentifier(identifier)
            Text("不着急，准备好再继续").font(.footnote).foregroundStyle(Theme.sub).frame(maxWidth: .infinity)
        }
        .padding(18).background(correct ? Theme.leafSoft : Theme.sunlight, in: .rect(cornerRadius: 26))
        .overlay(RoundedRectangle(cornerRadius: 26).strokeBorder(correct ? Theme.brand.opacity(0.3) : Theme.warn.opacity(0.3)))
        .accessibilityElement(children: .contain)
    }
}

struct LanguagePicker: View {
    @AppStorage("appLanguage") private var language = L10n.language
    var body: some View {
        Picker("语言", selection: $language) {
            Text("简体中文").tag("zh-Hans")
            Text("English").tag("en")
        }.pickerStyle(.menu).frame(minHeight: 44).accessibilityIdentifier("language-picker")
    }
}
