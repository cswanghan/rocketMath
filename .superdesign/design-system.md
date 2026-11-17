# 星芽 Xingya — Design System

## Product context
星芽 is a native iOS oral-math (口算) app for children aged 9–11 and their parents. Chinese-first. Core practice works offline and is free without an account. Monthly Apple subscription unlocks only: (1) cloud sync of a limited progress subset and (2) AI parent summaries. Local analysis stays free. Price must come from StoreKit `displayPrice`. Legal URLs stay the same (Apple subscriptions, Standard EULA, privacy https://rocket-math-4kg.pages.dev/privacy.html, support mailto:cswanghan@gmail.com).

## Key screens
- 年级选择 → 热身探针 → Tab shell: 首页/知识地图, 报告, 我的
- 答题: Practice / Play / Race (timeout, must tap 继续, correction read-aloud — interaction contract stays)
- 账号 / 登录注册 / 会员 (status first, then actions; login is the primary CTA when signed out; subscribe is the primary CTA when signed in and not entitled; restore/refresh are secondary; legal links are small footer)
- 家长门 + 家长面板 (AI summary is membership; local analysis is free)

## JTBD
- Child: start a practice or fluency session quickly, see clear progress, get calm feedback on right/wrong.
- Parent: glance a report, unlock parent tools, understand membership without a settings-manual feel.

## Branding & tokens (current 糖果乐园, Theme.swift) — hard constraints
Colors: brand #ff6b9d, brand2 #ff8fb1, accent #28d3a7, warn #ff9f45, danger #ff6b6b, gold #ffb92e, ink #3a2b5c, sub #9b8fb5, line/track #f0e6f5, card #ffffff, pageBg #f2f6ff, sky1 #eaf1ff, sky2 #f6f2ff, pillBg #ffe3ef, pillInk #ff5c8a, tabInactive #b7a9c9, shadow #7850a0.
Gradients: brandGradient brand2→brand; pageBackground #fff7fb → #f4f2ff → #f2f6ff; pedagogy candy colors for topic cards only.
Radius: 22 / 18 / 12. Padding 16. Cards: white, 2px white stroke, soft purple shadow.
Type: titles and key numbers use rounded; body regular/medium and readable — not every word heavy. Chinese system UI / SF rounded for titles. One language per screen (zh-Hans = all Chinese).

## Motion
Light only: button press scale, card appear, short correct-answer feedback. No exaggerated bounce, confetti storms, or animations that block answering.

## Current UI problems to fix in redesign (NOT in a reproduction pass)
Account / Auth / Membership / ParentDashboard used system List/Form, bilingual stacked copy (e.g. 订阅月度会员 · Subscribe, US$2.99 / 每月 · per month), pink text links as primary actions, sparse login form, and instruction-manual footnotes. That is disconnected from KnowledgeMap / Profile / Report, and also feels like a cheap candy stall if pink is overused.

## Redesign principles (for iteration after a faithful reproduction)
Stay inside this token set; do not invent a new brand, a new font family, or a louder candy carnival. Tighten the 糖果乐园 language: warm, clean, tasteful, child-friendly but restrained. Solid brand-pink primary buttons (disabled = lower opacity, still present). Secondary and text actions in ink/sub, not a screen full of pink links. Compact weighted cards and fields. Clear hierarchy: status, then one primary action, then secondary, legal footer last. No default iOS settings-list look for account or parent pages.
