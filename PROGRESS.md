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
