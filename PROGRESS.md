# PROGRESS

按 SPEC.md §10 维护:每个里程碑记完成项 + 偏离 SPEC 的决策及理由。

## 状态总览

| 里程碑 | 状态 | 说明 |
|---|---|---|
| M1 引擎核心 + 测试 | ✅ 完成 | `step()` 全状态机 + 51 测试,覆盖 stmt 98.86% / branch 93.49% (>90) |
| M2 content pack 加载与校验 | ✅ 随 M1 完成 | `validatePack` + `mult_facts` 已接入引擎并被测试驱动 |
| M3 最小可玩 UI | ✅ 完成 | React+Vite,乘法口诀可玩;CDP 真机验证答题/纠错/重测 |
| M4 Rocket Chart + 持久化 | ⬜ 下一步 | 过关填色 + IndexedDB/StorageAdapter + 事件日志 |
| M5 竞速 + 基线探针 + 语音 | ⬜ 引擎侧已就绪 | `step` 已支持 race;`computeLatencyGateMs` 已实现并测试 |
| M6 启用另两条 track + 时间锁 + 打磨 | ⬜ | div_facts / round_number_oral 已在 pack 中(enabled=false) |

## M1 完成项(2026-06-02)

- 工程骨架:`package.json`(仅 typescript + vitest)、`tsconfig.json`、`vitest.config.ts`、`.gitignore`。
- 内容生成器 `content/build_content_pack.py` → `content/grade3_math_fluency_pack.json`(3 track / 112 facts;mult_facts 18 关 A–R)。
- 纯 TS 引擎 `src/engine/`(零 React / 零 DOM / 零 fetch):
  - `types.ts` — SPEC §5 类型契约。
  - `rng.ts` — 可注入 seedable mulberry32。
  - `contentPack.ts` — 校验 + 派生池(take_off/orbit/universe/learned)+ 个性化时限计算。
  - `select.ts` — recent-miss 加权选题(留 FSRS/SM-2 hook,MVP 不实现)。
  - `engine.ts` — `step(state, event, ctx) -> { state, action }` reducer。
  - `index.ts` — UI 唯一入口 barrel。
- 测试 `contentPack.test.ts`(34)+ `engine.test.ts`(17):三阶段转移、纠错回路、超时判定、三掌握门、晋级、竞速 correct/min、确定性。
- 验收对照(SPEC §9):
  - [x] 答错 **或** 超时 → 立即 CORRECTION + 立即重测同一 fact。
  - [x] Take-Off 时限内连对 12;Orbit/Universe 30 题内错 ≤ 2。
  - [x] 引擎单测 >90% 且引擎目录零 fetch/网络/LLM(仅注释提及约束)。
  - [x] 竞速产出正确 correct-per-minute。
  - [ ] 刷新恢复进度(M4 持久化)。
  - [ ] track-agnostic 显隐(M3 UI 接 `getEnabledTracks` 验证)。
  - [ ] 孩子无干预玩 A→C(M3 UI)。

## M3 完成项(2026-06-02)

- Vite + React 18 + TS 骨架(`vite.config.ts`、`index.html`、`src/main.tsx`)。
- UI(`src/ui/`,只从 `src/engine` barrel 取依赖):
  - `pack.ts` — 启动时 `validatePack`,失败走错误屏。
  - `useGame.ts` — 引擎的 React 绑定:`{state,action}` 存 ref,事件处理里同步 `step()`,**StrictMode 双渲染不会双 step**(已真机验证 streak 每次 +1)。注入 `now=Date.now` / 可注入 seed RNG / 每题测 `elapsedMs`。
  - `Play.tsx` — 出题 + SVG 倒计时环(环空→超时判 miss)+ 纠错浮层 + 阶段/过关庆祝 + 物理键盘 + 屏幕数字键盘。
  - `Numpad.tsx` / `Home.tsx`(`getEnabledTracks` 驱动,只显示启用 track)/ `App.tsx` / `styles.css`(儿童友好、大点击区)。
- 验证:`tsc --noEmit` 干净;`vite build` 通过;51 引擎测试仍绿;Chrome CDP 真机走通「答对×3→streak 1/2/3 → 答错→纠错浮层+streak 清零 → 继续→重测同一 fact → 重测通过 streak 不计入」。
- SPEC §9 新增打勾:`getEnabledTracks` 驱动 → 切 `enabled` 即显隐 track(track-agnostic 证实)。

### M3 范围决策
- **持久化暂为内存态**:刷新会丢进度,留给 M4(IndexedDB + StorageAdapter + 事件日志)。M3 只要「能玩」。
- **时限用配置默认值** `latency_gate_seconds*1000`(3s):个性化探针 `computeLatencyGateMs` 引擎侧已就绪,UI 接入留 M5。
- **超时实现**:倒计时环到点 → 派发 `value=NaN, elapsedMs=gate+1` 的 ANSWER,复用引擎 miss 判定,不在 UI 重复判超时逻辑。

## 偏离 SPEC 的决策及理由

1. **TrackState 增加 `race?: RaceState` 字段**(SPEC §5 接口未列)。
   理由:`START_RACE`/`RACE_RESULT` 按 SPEC 必须经同一个 `step` reducer 流转,竞速需要 endsAt/correct/answered 子状态。作为核心接口之上的引擎内部扩展,不污染掌握逻辑(race 活跃时绕过掌握判定)。

2. **纠错计数口径**:orbit/universe 中一次 miss **计入**当前窗口(attempts++、errors++);紧接着的"立即重测"是补救,**不计入** streak/配额。take_off 的 miss 把 streak 清零,重测通过也不增 streak(下一道常规题才重新累计)。
   理由:SPEC「重测通过前不计入 streak/配额」指**重测这步**不计;原始 miss 必须计为错误,否则 orbit/universe 的「30 题内错 ≤ 2」永远无法判负。

3. **掌握门窗口语义**:orbit/universe = 最多 window(30)次计数答题;窗口内错误 > max(2) 时,attempts/errors 归零重开本轮测试;attempts 达 30 且错 ≤ 2 即过关。
   理由:把「30 题内错 ≤ 2」实现成一个可失败可重来的测试轮,符合 Rocket Math「没过就重测」。

4. **ANSWER 在非终结的答对上直接返回下一个 PROMPT**(链式),UI 不必每答对一题再发 NEXT。NEXT 用于:首题、CORRECTION 之后、PHASE/LEVEL 完成之后、竞速。
   理由:减少 UI 往返,保持 reducer 单 action 契约。

5. **recent-miss 加权**:fact 被干净地(常规流程)答对时清除 `lastMissAt`;选题权重 = 1 +(有 lastMissAt ? recent_miss_weight : 0)。
   理由:SPEC 只要求「对 lastMissAt 较近的 fact 提高权重」,用「未赎回的 miss」作为「较近」的可测代理,避免引入全局时钟。

6. **M1 依赖最小化**:本里程碑只装 `typescript` + `vitest`,React/Vite 留到 M3。
   理由:SPEC §10「引擎测试不过不碰 UI」,地基阶段不引入 UI 依赖。

7. **content pack 由我按 SPEC §4/§5 生成**(用户在启动时确认此选项)。三条 track 一次生成,div_facts/round_number_oral 先 `enabled=false`,M6 切开关即用,提前验证 track-agnostic 数据结构。
