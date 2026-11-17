# Extractable components — 星芽 iOS

SwiftUI has no existing Petite-Vue/HTML components. Candidates below are shared visual patterns. Skip tiny primitives (Button/Input/Card) at extraction time unless needed; prefer extracting the tab bar for multi-page consistency.

## XingyaTabBar
- Source: `ios/Xingya/Views/RootView.swift`
- Category: layout
- Description: Bottom TabView with three items — 首页 (house.fill), 报告 (chart.bar.fill), 我的 (person.fill); tint Theme.brand, inactive tabInactive.
- Extractable props: activeItem (string, default: "home") — values home | report | profile
- Hardcoded: tab titles 首页/报告/我的, SF Symbols house.fill / chart.bar.fill / person.fill, brand tint

## CandyCard
- Source: `ios/Xingya/Theme.swift` (`CardStyle`)
- Category: basic
- Description: White thick card, 2px white stroke, soft purple shadow, rMd/rLg corners.
- Extractable props: none required
- Hardcoded: radius tokens, white fill, shadow color, padding default 12–18

## BrandProgress
- Source: `ios/Xingya/Theme.swift`
- Category: basic
- Description: Capsule track + gradient fill progress.
- Extractable props: value (number, 0–1)
- Hardcoded: track color, default brandGradient, height 8

## LevelBar
- Source: `ios/Xingya/Views/LevelBar.swift`
- Category: basic
- Description: Level / XP display used on profile.
- Extractable props: level, xp (or equivalent)
- Hardcoded: typography, gold/brand colors

## Numpad
- Source: `ios/Xingya/Views/NumpadView.swift`
- Category: basic
- Description: Custom numeric keypad for answering.
- Extractable props: none for static mock (keys 0–9, delete, submit)
- Hardcoded: key labels, layout, accessibility identifiers

Do not extract mid-flight ThemeComponents as project components until a design is approved and implemented.
