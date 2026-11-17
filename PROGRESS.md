# PROGRESS

按 SPEC.md §10 维护:每个里程碑记完成项 + 偏离 SPEC 的决策及理由。

## 状态总览

| 里程碑 | 状态 | 说明 |
|---|---|---|
| M1 引擎核心 + 测试 | ✅ 完成 | `step()` 全状态机 + 51 测试,覆盖 stmt 98.86% / branch 93.49% (>90) |
| M2 content pack 加载与校验 | ✅ 随 M1 完成 | `validatePack` + `mult_facts` 已接入引擎并被测试驱动 |
| M3 最小可玩 UI | ✅ 完成 | React+Vite,乘法口诀可玩;CDP 真机验证答题/纠错/重测 |
| M4 Rocket Chart + 持久化 | ✅ 完成 | IndexedDB+StorageAdapter+事件日志;CDP 真机验证刷新恢复 |
| M5 竞速 + 基线探针 + 语音 | ✅ 完成 | 探针→play、gate 持久、race 计分;语音+静音 |
| M6 启用另两条 track + 时间锁 + 打磨 | ✅ 完成 | 3 track 全可玩(纯数据)、时间锁、67 测试 |

**SPEC 全部 6 个里程碑完成 + 已上线 Cloudflare Pages。** 运行:`npm run dev` / `npm test` / `npm run build`。
线上:https://rocket-math-4kg.pages.dev/

## 扩展:人教版三年级知识地图(P0→P2)

> 设计与完整地图见 `docs/knowledge-map-design.md`。已确认:人教版 / 新增非限时模式 / P0→P2 分阶段。

| 阶段 | 状态 | 说明 |
|---|---|---|
| P0a 地图框架 + 流畅度扩展 | ✅ 完成 | 47 topic 全地图、导航 UI、4 条 fluency track ready、新增加减口算 |
| P0b 竖式 procedure 引擎 | ✅ 完成 | 非限时 Practice 引擎 + 6 套竖式题集(10 ready topic) |
| P1 公式(周长/面积) | ✅ 完成 | 4 套 formula 题集(14 ready topic) |
| P2 概念课(分数/小数/年月日/位置/统计/广角) | ✅ 完成 | 33 套题集,**47/47 知识点全上线** |

**🎉 人教版三年级全部 47 个知识点上线**(43 Practice 题集 + 4 流畅度 track)。

## 错题本 + 家长入口 + DeepSeek 总结(2026-06-03)

- **错题记录**:`MistakeRecord` + adapter(`appendMistake`/`listMistakes`/`markMistakeCorrected`)+ IndexedDB v3 store。`usePractice` 首次答错记录(题干/孩子答案/正确答案/难度/知识点),`useGame` 记录口算 miss(每 fact 每会话一次)。
- **家长入口**:地图右上角低调「👨‍👧 家长」按钮 → `ParentGate` 4 位 PIN(首次设、之后验,localStorage,防孩子误入)→ `ParentDashboard`。
- **错题本**:按知识点分组,显示每题(难度标签、题干、孩子答红/正确答绿),「标为已订正」。Lv/经验概览。
- **一键总结**:`summary.ts` 本地确定性统计(薄弱知识点 top)既做兜底也做 LLM payload。`functions/api/summarize.js`(Cloudflare Pages Function)服务端调 **DeepSeek**(`deepseek-chat`),key 存 Cloudflare secret `DEEPSEEK_API_KEY`(**不入 git、不进前端 bundle**),前端只调 `/api/summarize`,非 2xx 自动回退本地总结。
- 验证:真机走通 答错→错题本→PIN→总结;生产 `/api/summarize` 返回真实 DeepSeek 个性化分析;85 测试绿。
- **安全**:API key 仅作为 Cloudflare 服务端 secret 存在,前端代码/仓库均无明文;`git grep` 确认未入库。

## 关卡 + 经验值 + 三档难度(2026-06-03)

- **三档难度题型(关卡)**:每个 Practice 知识点的题按 `difficulty` 分 **基础(basic)→夯实(consolidate)→拔高(challenge)** 三关,引擎按此顺序出题(`tieredOrder`,关内 seedable 洗牌)。练习屏顶部「关卡进度条」过一关亮一段。
- **难度提升**:`build_practice_pack.py` 重写,每套补 basic 热身 + challenge 拔高(多步/应用题/陷阱/大数)。现 **43 套 / 295 题**(basic 85 / consolidate 117 / challenge 93),python 自检每套三关齐全、mc 唯一正确。
- **经验值 + 等级**:纯模块 `src/practice/xp.ts`(`xpForCorrect` 基础5/夯实10/拔高20、一次答对翻倍;口算 `FLUENCY_XP`=8;`levelFromXp` 三角曲线 Lv2=100/Lv3=300/Lv4=600)。`StorageAdapter.addXp` 原子累加(memory + IndexedDB),`Student.xp` 持久化。
- **展示**:地图顶部 `Lv.X` + 经验条 + 距下一级;答题/练习头部实时 `⭐ 经验`;答对弹「+N 经验」。
- 测试:83 个(+tier 排序、xp/level),引擎+practice 覆盖 99.11%/94.06%。真机验证:基础题先出、+10 经验翻倍、关卡条、等级面板。

### P0a 完成项(2026-06-03)
- `docs/knowledge-map-design.md`:架构 + 人教版完整 47 topic 地图 + pedagogy→引擎映射 + schema。
- `content/build_knowledge_map.py` → `grade3_knowledge_map.json`(18 单元 / 47 topic;pedagogy: fluency 10 / concept 19 / procedure 9 / formula 4 / logic 4 / data 1)。
- `src/map/`(types + loader)、`src/ui/KnowledgeMap.tsx`:上/下册→单元→topic 卡片导航,成为新首页。fluency-ready topic 进现有 Play,其余显「🔒 即将上线」。
- 流畅度扩展:`computeFromPrompt` 支持 `+`/`−`(三年级非负);新增 `add_sub_oral`(万以内加减口算,8 关)。流畅度包现 4 track / 144 facts。
- 4 条 ready fluency track:乘法口诀、除法口诀、几百几十加减口算、整十整百乘一位。
- 验证:69 测试绿、覆盖 98.88%/93.64%、`tsc` 干净、CDP 真机验证地图渲染 + 加减口算可玩("70 + 20")。

### P0b 完成项(2026-06-03)
- **第二套引擎 `src/practice/`**(纯 TS、确定性、**无限时门**、零 LLM):`practiceStep` reducer + `checkAnswer`(mc/fill/steps)+ shuffle。答错给提示可重试,超 maxTries 揭示答案;按"一次答对"统计掌握。10 个新测试,practice 覆盖 100%/93.75%。
- **题集生成器 `build_practice_pack.py`** → `grade3_practice_pack.json`(6 套 procedure 题集 / 40 题):三位数加/减竖式、不进位/进位乘竖式、一位数除法、有余数除法(steps:商+余数)。
- 地图生成器扩 `problemSetId`,6 个 procedure topic 转 `ready`(现 10 ready)。
- 持久化:`StorageAdapter` 加 `getPractice/putPractice` + IndexedDB v2 新 store `practiceStates`;完成时存最佳"一次答对"。memory + indexeddb 双实现。
- UI:`usePractice` hook(StrictMode-safe)+ `PracticeScreen`(竖式 pre 布局、fill/steps/mc 输入、提示浮层、揭示、完成总结)。地图上 procedure topic → Practice。
- 验证:79 测试绿、覆盖 99.05%/93.65%、`tsc` 干净、CDP 真机走通 竖式答错→提示→答对→下一题、有余数除法两格输入。

### P1 完成项(2026-06-03)
- 4 套 formula 题集(周长、面积、倍数应用题、经过时间),复用 Practice 引擎(fill + mc)。

### P2 完成项(2026-06-03)
- **一次补齐剩余 33 个知识点**,共 43 套 Practice 题集 / 242 题。
- 地图生成器改为**从 practice pack 自动派生 ready**(`_practice_set_ids`):凡 topic id == 某题集 id 即自动上线,不再手改 status。authoring 一套题 = 自动点亮一个知识点。
- 覆盖:口算/单位换算(时分秒/长度/质量/面积/口算除法/两位数乘整十,fill)、剩余竖式(因数含0、两位数乘两位数、加减验算)、概念(钟表/估算/单位认识/倍/四边形/周长/分数3/小数3/面积2/年月日/24时/方向)、推理(集合/路线/年月日计算/搭配)、数据(复式统计表,prompt 内嵌多行表格)。
- Python 侧自检:242 题全部一致(mc 恰好 1 个正确、fill/steps 答案齐全)。
- 真机:47/47 ready、概念选择题出结果卡、复式统计表表格渲染正确。

### P1/P2 决策/边界
- **6 个 fluency-标签的换算/口算题暂用 Practice fill 承载**(整数答案),非真正限时引擎;后续可升级为带限时门的 fluency track(需扩展 content 校验支持"X 米=?厘米"类 prompt)。
- **分数/小数全用选择题(mc)**:答题输入框只收数字,无法输入 `1/2`、`0.7`;故概念用 mc 规避,且更适合理解性考查。
- **复式统计表**用 prompt 内嵌纯文本表格 + mc,未做真表格/图表组件(后续 polish)。
- **依赖解锁仍未硬锁**:47 个全部可直接进入。

### P0b 决策/边界
- **竖式用文本竖排 + 单格结果输入**(有余数除法用商/余数双格),不做逐位进退位格子 UI(后续 polish)。
- **Practice 事件日志暂缓**:`GameEvent` 结构面向 fluency,P0b 只存 `PracticeRecord` 完成记录;append-only practice 事件留后续。
- **依赖解锁仍未硬锁**:ready 即可练。

### P0a 偏离/决策
- **地图成为新首页**,旧 `Home.tsx` 删除(被 `KnowledgeMap` 取代)。
- **`computeFromPrompt` 扩 +/−**:旧测试 `'1 + 1'` 视为 garbage,现为合法(=2),已改测试用例。三年级减法限非负(`a<b` 判 null)。
- **依赖解锁(dependsOn)P0a 暂不硬锁**:ready=可玩,coming_soon=锁;按 pedagogy 依赖的渐进解锁放后续。

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

## M5 完成项(2026-06-02)

- `speech.ts`:SpeechSynthesis zh-CN 封装,静音状态存 localStorage,headless 守卫。Play 在**纠错时**朗读答案(仅学习阶段),竞速全程静音(SPEC §7 App Store 教训),Play 头部静音开关。
- `Probe.tsx`:首次进入做 ~10 题中性敲击探针 → `computeLatencyGateMs` → 存入 student.latencyGateMs;有 gate 后跳过。
- `Race.tsx`:1 分钟竞速(引擎 `START_RACE`,题池=已学 facts),全局倒计时到点 flush `RACE_RESULT`,correct/min 写入 raceResults。
- App 路由 probe/play/race;Home 每条 track 加竞速按钮。
- 真机验证:探针→play、gate 跨二次进入持久、race 起→止计 2 题/分钟。

## M6 完成项(2026-06-02)

- `build_content_pack.py` 把 `div_facts` + `round_number_oral` 切 `enabled=true` 并重新生成;**只改数据**,UI 自动出现 3 条 track 且均可玩(除法 `6 ÷ 2`、整十 `40 × 2` 真机验证)→ track-agnostic 彻底证实(SPEC §9)。
- 时间锁:`timelock.ts` 纯 reducer(6 测试)+ `useTimeLock` + `LockScreen`。配置在 `engine_config.time_lock`(play 15 分→break 20 分,`enabled` 可关)。状态存 localStorage,**刷新不能绕过**;真机验证锁屏倒计时→自动解锁。
- 验证:`tsc` 干净、`vite build` 通过、67 测试全绿。

## SPEC §9 验收(全部达成)

- [x] 孩子无干预完成 A→C(引擎 + 可玩 UI;掌握门强制推进)。
- [x] 答错 **或** 超时 → 立即重教 + 立即重测同一题(真机验证)。
- [x] 掌握门:Take-Off 时限连对 12;Orbit/Universe 30 题错 ≤ 2。
- [x] 刷新后进度/factStats/completedLevels 恢复(IndexedDB,真机验证)。
- [x] 引擎单测 >90% 且引擎目录零 fetch/网络/LLM。
- [x] 竞速产出正确 correct-per-minute。
- [x] 仅切 content pack 的 `enabled` 即显隐 track(3 track 真机验证)。

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

7. **content pack 由我按 SPEC §4/§5 生成**(用户在启动时确认此选项)。三条 track 一次生成,M6 切 `enabled=true` 启用。

8. **事件 outcome 分类放在 storage 层**(`classifyOutcome`),不进引擎。理由:引擎不关心日志;分类是纯函数,据「答前状态 + 结果 action」推导(hit/miss/retest_pass/retest_fail/race),独立可测。

9. **竞速期间 putTrackState 会把 `race` 字段一并落盘**。若竞速中途刷新,重载时 `step(saved, NEXT)` 因 `now() >= endsAt` 立即 `finishRace` 出结果——不污染掌握态(race 旁路掌握逻辑)。MVP 可接受,已记此边界。

10. **时间锁配置入 `engine_config.time_lock`(数据驱动),纯逻辑在 `src/ui/timelock.ts`**。SPEC §7 说 MVP 可 optional,我默认 `enabled=true`(15 分玩/20 分歇,真 Rocket Math 值)并做成可关。状态存 localStorage 防刷新绕过。这是 UI 护栏,不进引擎。

11. **个性化时限 gate 的 UI 接入在 M5**(M3/M4 期间用配置默认 3s)。引擎侧 `computeLatencyGateMs` 自 M1 即就绪并测试。

## iOS 原生 App（2026-07-20 起）

> 目标：**上架 App Store**，**全量对齐 Web 端**（数学 + 英语 + 汉字 + 阅读 + 考试日历 + 账号）。
> 路线选型与阶段划分见本节；决策记录接在文末「偏离 SPEC 的决策」序号之后。

| 阶段 | 状态 | 说明 |
|---|---|---|
| P0 工程骨架 + 引擎移植 + 黄金对拍 | ✅ 完成 | 4 测试全绿（3813 步对拍 + RNG 逐位 + pack 加载 + prompt 反推），变异测试验证过安全网有效 |
| P1 流畅度全套 UI + SwiftData 持久化 | ✅ 完成 | 模拟器端到端可玩（UI 测试真读题真按键）；竞速/经验/时间锁未接 UI，留 P1.5 |
| P2 Practice 引擎 + 知识地图 + Practice UI | ✅ 三年级完成 | 引擎黄金对拍(洗牌逐位) + 知识地图首页 + mc/fill/steps 练习界面, 端到端可玩 |
| P2.5 错题本 + 家长区 + 多年级 | ✅ 完成 | 错题本(practice/fluency) + PIN 门 + 家长面板 + 本地总结 + 3–9 年级切换 |
| P3 账号登录 + 云同步 + StoreKit 2 内购 | ✅ 完成 | 登录/注册 + 进度 sync 线上可用 + StoreKit 2 + AI 总结 |
| P4 上架材料与审核 | ✅ 材料齐 | 文案/隐私/支持页/截图/审核账号；Archive 与 ASC 点提交需本机 |

### P0 已完成
- **工程**：`ios/Xingya.xcodeproj`（手写 pbxproj，objectVersion 77）。两个 target：`Xingya`(App) + `XingyaTests`(Swift Testing)。用 **synchronized folder** 挂载源码目录 —— 新增 Swift 文件不用改工程文件。iOS 17.0+ / iPhone+iPad / Swift 6 严格并发 + `SWIFT_DEFAULT_ACTOR_ISOLATION=MainActor` / bundle id `com.xingya.app`。
- **内容包零重写**：仓库 `content/` 以蓝色文件夹引用直接进 App bundle，Python 生成器仍是唯一真源，Web 与 iOS 共用同一份 JSON。
- **引擎移植**：`ios/Xingya/Engine/`（Types / RandomSource / ContentPackStore / Select / Engine），由 `src/engine/` 逐行移植，全部 `nonisolated + Sendable`，纯函数零 UI 零网络。`swiftc -swift-version 6 -typecheck` 干净。
- **黄金用例对拍**：`tools/export-engine-golden.ts`（`npm run golden`）用**真实 content pack** 驱动 TS 引擎，导出 13 场景 / 3813 步 → `ios/XingyaTests/Golden/engine_golden.json`。覆盖 take_off/orbit/universe 三阶段、566 次纠错回路、36 次阶段晋级、16 次过关、1 次竞速结算。Swift 侧 `EngineGoldenTests.swift` 逐步回放并比对 action + 状态 + factStats 摘要，首处分叉精确报「第几步、哪个字段」。

### iOS 相关决策
12. **原生重写而非 Capacitor 壳**（用户选定）。代价是 UI 两套长期双向维护；缓解手段 = 内容包与引擎行为两端锁死（黄金对拍），UI 各自适配平台。
13. **content pack 与 Python 生成器不动**。iOS 只加 Swift `Codable` 解析层，不复制内容、不另起生成器——否则两端内容必然漂移。
14. **mulberry32 必须逐位复现**。JS `Math.imul`/`>>>` ↔ Swift `UInt32 &*`/`>>`，选题依赖它；黄金用例单列 RNG 断言，排障时能一眼分清「随机数不一致」还是「状态机不一致」。
15. **factStats 用 FNV-1a 摘要而非全量记录**。全量会让黄金产物膨胀到几十 MB；摘要仍能精确定位分叉步，两端同实现 32 位环绕乘法。
16. **支付必须换 StoreKit 2 内购**。iOS 端隐藏微信/支付宝收款码与闲鱼入口，否则触犯 App Store 3.1.1 必拒。

### P1 已完成（2026-07-20）
- **视觉方向定为 iOS 原生 HIG**（用户选定）：系统组件 + 系统色，不复刻 Web 端 2328 行星空 CSS。品牌一致性靠内容与文案，不靠像素级还原。
- **持久化**：`StorageAdapter` 协议（与 Web 端同构）+ `SwiftDataStorage`。TrackState 存成 JSON blob（引擎类型契约即 schema，改字段不用写迁移），事件日志独立 `@Model`。另有 `InMemoryStorage` 供预览/测试。
- **绑定层** `GameModel`（`@Observable`）：对应 Web 端 `useGame`。注入 now/rng、量 elapsedMs、把 action 翻成界面状态、每步落盘。**规则一条都不写在这里**——只在 Engine 里，否则两端必漂移。
- **界面**：`RootView`（加载/校验 pack，失败响亮报错）→ `ProbeView`（基线探针，量手速定个性化时限）→ `HomeView`（4 条 track + Rocket Chart 缩略）→ `PlayView`（倒计时环 + 数字键盘 + 纠错/过关浮层）。语音走 `AVSpeechSynthesizer` zh-CN，竞速永不朗读。
- **端到端 UI 测试** `XingyaUITests/PlaythroughUITests`：真的从屏幕上**读题、算答案、按数字键**，走完 热身探针 → 首页 → 答题 → 纠错重教 → 阶段晋级（跑通时已从 take_off 进入 orbit）。顺带截图存进 xcresult，将来可直接当上架素材。

### P1 决策与踩坑
17. **iOS 17.0 起步，不用 `#Unique`（iOS 18+）**。孩子用的常是家里旧设备，多覆盖一代系统值得；唯一性由「先查后写」保证。
18. **UI 测试 target 单独设 `SWIFT_DEFAULT_ACTOR_ISOLATION = nonisolated`**。App target 用 MainActor 默认隔离写 SwiftUI 很顺，但 `XCTestCase` 的覆写方法是 nonisolated，两者冲突会编译不过。
19. **引擎侧 extension 必须显式 `nonisolated`**。默认 MainActor 隔离会把纯函数引擎钉在主线程上；独立 `swiftc -typecheck` 查不出来，校验命令要带 `-default-isolation MainActor`。
20. **首页点击要点 track 名称而非整行**。行内嵌了横向滚动的 Rocket Chart，点行中心会被 ScrollView 吃掉，NavigationLink 不触发。

### P1.5 已完成（2026-07-21）
- **竞速**：`RaceView`（选速度 🐢轻松/🚀标准/⚡挑战 → 全局倒计时 → 连续答题 → 每分钟答对数结算）。复用同一 `GameModel.startRace`，竞速全程不朗读、只看对错不看时限。端到端 UI 测试已覆盖（选速度 → 答题 → 计数）。
- **经验/等级**：`Progression.swift`（`levelFromXp` 三角曲线，数值对拍 Web 端）+ 顶部 `LevelBar`。答对累加并落盘，跨会话恢复。
- **时间锁**：`TimeLock.swift`（纯 reducer + `TimeLockService` 持久到 UserDefaults）+ `LockView` 休息锁屏。玩满 15 分强制歇 20 分，重开 App 躲不掉。
- 单元测试 10 个（经验门槛/等级进度/时间锁触发与解锁）全绿，数值与 Web 端一致。

### P1.5 决策/踩坑
21. **UI 测试用 `UITEST_MEMORY` 启动参数切内存 SwiftData**。持久化数据会让「探针跳过 + 恢复到 orbit」破坏断言的可复现性；内存库保证每次从 A 关起飞。
22. **竞速全局倒计时用 `race.endsAt`（epoch）而非本地计时器**，到点主动 `next()` 触发 `finishRace`，即便孩子停手也会结算。
23. **`LevelBar` 放 Rocket Chart 下方而非 VStack 顶部**：inline 导航栏会和顶部内容重叠。

### P2 已完成（2026-07-21，三年级）
- **Practice 引擎移植**：`ios/Xingya/Practice/`（PracticeTypes/Check/Engine/AnswerText）由 `src/practice/` 逐行移植。`AnswerValue` 用 enum 兼容数字/字符串答案。黄金对拍 `tools/export-practice-golden.ts`（16 场景/真实 practice pack）→ Swift 逐步比对，**洗牌顺序 order 逐位复现**（依赖 mulberry32）。
- **知识地图**：`Map/KnowledgeMap.swift`（types + loader）+ `Map/AppContent.swift`（一个年级三份数据打包 + topic→路由判定：fluency 进限时训练 / ready practice 进 Practice / 否则「即将上线」）。
- **知识地图首页** `KnowledgeMapView`：上/下册 segmented + 单元 section + topic 卡片（pedagogy 图标 ⚡口算/💡概念/ƒ公式/▦竖式/🧩推理/📊数据 + 掌握度标注）。取代原 fluency-only HomeView 成为新首页。
- **Practice 界面** `PracticeView`：mc（单选）/ fill（填空）/ steps（多格，如商+余数）三种输入，关卡进度条（基础→夯实→拔高），答错给提示可重试、超 maxTries 揭示答案+解析、完成总结。经验按难度分档 + 一次答对翻倍（`xpForCorrect`）。
- **持久化**：`StorageAdapter` 加 `PracticeRecord`（最佳一次答对）+ SwiftData `PracticeRecordModel`，只在超过历史最佳时更新。
- 端到端 UI 测试扩展：地图首页 → 竖式练习（答错→提示→连错→揭示答案「72+15=87」→下一题）→ 返回 → fluency 答题 → 竞速。53 秒全绿。

### P2 决策/踩坑
24. **Practice 答对停在 `.correct` 庆祝态而非自动跳下一题**：对拍 Web 端 usePractice 的 `correct` view mode，让答对反馈（+经验）可见，孩子点「下一题」再进。
25. **`AnswerValue` 用 enum(number/text) 而非 Any**：practice pack 的 answer 既有数字(59)又有字符串，Codable 单值容器按序尝试解码；比对时数字按数值、文本按 trim 相等（对齐 Web 端 valueEq）。
26. **UI 测试内存模式禁用时间锁**：测试墙钟慢，跑满 15 分钟会触发休息屏挡住操作——曾导致一次跑了 2120 秒后卡死。`UITEST_MEMORY` 时 `TimeLockService(config: nil)`。
27. **知识地图 List 懒加载**：屏幕外 topic 不在无障碍树里，UI 测试要 `swipeUp` 滚动到目标可点为止。

### P2.5 已完成（2026-07-21）
- **错题本存储**：`MistakeRecord` + `StorageAdapter` 五方法（append/list/mark/reset/clear）+ SwiftData `MistakeModel`（显式 `localId` 自增）。`resetProgress` 清关卡/练习/经验、**保留**错题本。
- **答题记错题**：`PracticeModel` 首次答错/揭示写入；一次答对但 >20s 记「偏慢」。`GameModel` 流畅度 miss/retest_fail 写入（会话内每 fact 一次）。
- **家长区**：`ParentPin`（UserDefaults 4 位，防小孩非真安全）→ `ParentGateView` → `ParentDashboardView`（按知识点分组、标订正、本地一键总结、重置/清空）。AI 云总结留 P3。
- **多年级**：`GradePickerView` 3–9 年级，选择持久到 UserDefaults；知识地图菜单可「切换年级」；标题用「三年级/初一」等中文标签。
- **首页菜单**：知识地图右上角 `…` → 家长 / 切换年级。
- 单元测试 16 绿（新增错题存储/总结/PIN）；UI 测试覆盖 PIN 设置 + 家长面板往返，66 秒全绿。

### P2.5 决策/踩坑
28. **`MistakeModel.localId` 显式自增**，不用 `PersistentIdentifier.hashValue`（不稳定、跨进程不可靠）。
29. **家长面板用本地总结**，不在未登录时打 Cloudflare `/api/summarize`（无鉴权 + 审核风险）；P3 有账号后再接 AI。
30. **UI 测试 `UITEST_MEMORY` 默认三年级**，跳过 GradePicker，保证可复现；生产路径读 `Grades.saved`。

### 平台覆盖
- **iPhone + iPad**：`TARGETED_DEVICE_FAMILY = 1,2`，iOS 17+。
- **Mac**：Apple Silicon 上以「Designed for iPad」运行（非原生 AppKit/Catalyst 多平台 target）。原生 macOS 适配可后续加。

### P3 已完成（2026-07-21）
- **后端**
  - D1 迁移 `src/db/migrations/math_progress.sql`（`math_student` / `math_track_state` / `math_practice` / `math_mistake`），已 remote 执行。
  - `GET|POST /api/progress/sync`：JWT 鉴权；推送后 LWW 合并再回写全量。practice 取更优 first-try；mistake 按 `client_key` 去重。
- **iOS 网络层** `Network/`
  - `APIClient`：默认 `https://rocket-math-4kg.pages.dev`，UserDefaults 可覆盖。
  - `AuthSession`：login / register / me / logout；token Keychain + UserDefaults 双写。
  - `ProgressSync`：export 本地 → POST → apply 合并。
  - `SummarizeClient`：登录后 POST `/api/summarize`，失败回落本地文案。
- **StoreKit 2** `Store/StoreKitService` + `Configuration.storekit`（本地调试月订 `com.hanwang.xingya.premium.monthly`）。ASC 未配置时 UI 显示「即将上线」。
- **UI**：`AuthView` / `AccountView`（同步 + 订阅）；知识地图菜单「账号」；家长面板「AI 一键总结」（未登录走本地）。
- **隐私清单** 更新为声明邮箱/用户 ID/学习进度/购买（均 App 功能、不追踪）。
- 单元测试 **19** 绿（+export/apply/API 错误）；UI 端到端 **66s** 全绿。

### P3 决策/踩坑
31. **本地优先不变**：未登录完整可玩；登录只加云同步与 AI 总结，不 gate 内容。
32. **进度 API 新建而非复用 vocab_progress**：数学是 track blob + practice + mistakes，结构不同，硬塞词表表会炸。
33. **SwiftData schema 变更开发期删库重建**：`clientKey` 字段加入 MistakeModel；上架后应写正式迁移。
34. **StoreKit 产品 ID 先写死一处** `StoreProductID.premiumMonthly`，ASC 创建后只改常量；scheme 挂本地 storekit 配置方便模拟器调试。

### P3 运维（已完成 2026-07-21）
- Pages 已部署：`rocket-math`（生产 `rocket-math-4kg.pages.dev`）与 `rocket-learning`。
- D1 `math_progress` 已建表；`POST/GET /api/progress/sync` 鉴权 + 读写实测通过。
- 审核演示账号：`appstore_review` / `[stored only in App Store Connect]`。

### P4 已完成（2026-07-21）
- **隐私政策** https://rocket-math-4kg.pages.dev/privacy.html
- **App 支持** https://rocket-math-4kg.pages.dev/app-support.html
- **上架文案** `ios/APP_STORE.md`（名称/副标题/描述/关键词/审核备注/分级问卷建议）
- **截图成片**（可直传 ASC）  
  - iPhone 6.7"：`ios/store/screenshots/final-iphone-6.7/`（5 张，1290×2796）  
  - iPhone 6.9"：`ios/store/screenshots/final-iphone-6.9/`（5 张，1320×2868）  
  - iPad 13"：`ios/store/screenshots/final-ipad-13/`（5 张，2048×2732）  
- **脚本** `ios/tools/make-store-screenshots.sh` / `compose_store_frames.py`

### ASC 提交准备（2026-07-22）
- 版本 **1.0.0 (1)**；手册 **`ios/ASC_SUBMIT.md`**
- 账号删除：`POST /api/auth/delete-account` + App 内入口（5.1.1v）
- Release Archive 已成功：`ios/build/Xingya.xcarchive`
- 上传需本机 Xcode 登录 Apple ID（CLI export 报 Failed to Use Accounts 属预期）

### P4 已完成（2026-07-21）
- **隐私政策** https://rocket-math-4kg.pages.dev/privacy.html  
- **App 支持** https://rocket-math-4kg.pages.dev/app-support.html  
- **上架文案** `ios/APP_STORE.md`（名称/副标题/描述/关键词/审核备注/分级）  
- **截图** `ios/store/screenshots/asc-iphone-6.7/`（9 张，1290×2796）  
- **导出脚本** `ios/tools/export-uitest-screenshots.sh`

### P4 仍需本机人工
1. App Store Connect 创建 App + 订阅产品 `com.hanwang.xingya.premium.monthly`  
2. 上传截图与元数据（复制 `APP_STORE.md`）  
3. Xcode → Archive → Distribute（Team `QY29J9ZMPU`）  
4. 建议补 1–3 张 iPad 截图  
