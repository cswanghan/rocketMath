# SPEC — 三年级计算流畅度训练器（Rocket Math 模型）

> 给 Claude Code 的实现方案。读完直接从 M1 开工。遇到与本文件冲突的"更聪明做法"，先在 `PROGRESS.md` 记下理由再问，不要擅自改架构决策。

## 0. 一句话目标

做一个 **local-first、单机单人** 的 Web 应用，用 Rocket Math 的 mastery-learning 模型训练三年级数学**计算流畅度**，全部由一个 **JSON content pack 驱动**。MVP 先把"乘法口诀"这一条 track 跑通到能给真孩子用。

## 1. 核心理念（理解 WHY，别做歪）

- 这是**流畅度引擎，不是 AI 家教**。目标是把 math facts 练到不假思索的自动提取（automaticity），手段 = 小事实集 + 限时门 + 间隔重复 + 即时纠错。
- **核心引擎必须是确定性的、零 LLM、零网络调用**。这是硬约束。任何想在答题循环里塞 LLM 的冲动都是错的——慢、贵、不可测。
- **内容数据驱动**。引擎对"教什么"一无所知，只认 content pack。换 track / 换学科靠改数据，不改引擎。

## 2. 范围

### MVP（这次要交付）
- 单人、单设备、本地持久化（刷新不丢进度）。
- **一条 track 端到端可玩**：`mult_facts`（乘法口诀，18 关 A–R）。但引擎必须 track-agnostic——另两条 track 仅靠配置即可启用。
- 三阶段循环（Take-Off / Orbit / Universe）+ 纠错回路 + 掌握门（mastery gate）。
- 1 分钟里程碑竞速。
- Rocket Chart 进度可视化（A–Z 填色）。
- 语音反馈（浏览器 SpeechSynthesis，zh-CN），可静音。
- 个性化基线：首次进入做一个敲击速度探针，据此设定该孩子的答题时限。

### 非目标（明确不做，别自作主张加）
- ❌ 多租户 / 学校 / 班级 / 教师 dashboard。
- ❌ 后端服务器 / 账号 / 登录鉴权。
- ❌ 答题循环里的任何 LLM 调用。
- ❌ 竖式与概念课内容（多位数乘除竖式、面积、分数、年月日…）。这些在 `content pack` 的 `non_drill_topics` 里被刻意排除，**不要**给它们加限时刷题。

## 3. 技术栈

- **React + TypeScript + Vite**（可玩 demo 的最快稳妥默认，可替换但先用这个）。
- **核心引擎**：纯 TypeScript，放在 `src/engine/`，**零 React / 零 DOM 依赖**，用 Vitest 做到 >90% 覆盖。
- **持久化**：IndexedDB，藏在 `StorageAdapter` 接口后面（将来换真后端只改 adapter）。MVP 用 localStorage 兜底也行。
- **音频**：Web Speech API（SpeechSynthesis），中文语音，带静音开关；**竞速模式默认不读题**（见 §7 的 App Store 教训）。
- **随机性**：所有 shuffle 走可注入的 seedable RNG，保证引擎可测。
- 加任何上述之外的依赖前先问。

## 4. Content pack 契约

随仓库提供两个文件（放进 `content/`）：
- `grade3_math_fluency_pack.json` —— 内容包本体。
- `build_content_pack.py` —— 生成器（改节奏/加 track 改这里重跑，别手改 JSON）。

结构要点：
- `tracks[].levels[]` 每关**只声明 `new_facts`**。
- `engine_config` 里有：三阶段掌握标准、`latency_gate_seconds`、`correction_loop`、`interleave_rules`、`milestone_races`、`individualized_goal`。
- **关键**：orbit / universe 的混合池由引擎按 `interleave_rules` **推导**，不在 JSON 里枚举。
  - `orbit_pool = 本关 new_facts ∪ 上一关 new_facts`
  - `universe_pool = A..当前关 所有 new_facts 的并集`
- 启动时校验 content pack（schema 校验 + 每个 fact 的 answer 可计算），校验失败直接报错，别静默吞。

## 5. 核心引擎规格（最重要，必须精确）

引擎是一个纯函数 reducer：`step(state, event, ctx) -> { state, action }`。先把这套类型钉死，再写实现，再写测试。

```ts
type Phase = 'take_off' | 'orbit' | 'universe';

interface Fact { id: string; prompt: string; answer: number; learningType: 'fact_recall' | 'pattern'; }

interface FactStat { seen: number; correct: number; lastMissAt?: number; }

interface TrackState {
  trackId: string;
  currentLevel: string;              // 'A'..'R'
  phase: Phase;
  streak: number;                    // take_off：时限内连续答对计数
  attempts: number;                  // orbit/universe：本阶段已答题数
  errors: number;                    // orbit/universe：本阶段错误数
  pendingRetest: string | null;      // 纠错后等待立即重测的 factId
  factStats: Record<string, FactStat>;
  completedLevels: string[];         // 供 Rocket Chart
}

type Event =
  | { type: 'ANSWER'; factId: string; value: number; elapsedMs: number }
  | { type: 'NEXT' }                                 // 请求下一题
  | { type: 'START_RACE'; durationMs: number };

type Action =
  | { kind: 'PROMPT'; fact: Fact }
  | { kind: 'CORRECTION'; fact: Fact }               // 重新教学：显示+朗读答案
  | { kind: 'PHASE_COMPLETE'; phase: Phase }
  | { kind: 'LEVEL_COMPLETE'; level: string }
  | { kind: 'RACE_RESULT'; correctPerMin: number };

interface EngineContext {
  pack: ContentPack;
  latencyGateMs: number;             // 个性化后的实际时限
  now: () => number;
  rng: () => number;                 // seedable
}

function step(state: TrackState, event: Event, ctx: EngineContext): { state: TrackState; action: Action };
```

### 状态机规则（来自 `engine_config`，逐条实现+逐条测试）

- **Take-Off**：池 = 仅本关 `new_facts`。掌握 = **时限内连续答对 12 题**。
- **Orbit**：池 = `orbit_pool`。掌握 = **30 题内错误 ≤ 2**。
- **Universe**：池 = `universe_pool`。掌握 = **30 题内错误 ≤ 2**。
- **纠错回路（贯穿三阶段）**：答错 **或** `elapsedMs > latencyGateMs`（超时） → 判为 miss → 立即发 `CORRECTION`（显示并朗读答案）→ 紧接着**立即重测同一 fact**（`pendingRetest`）。
  - 重测**通过前不计入** streak / 配额；Take-Off 的连对计数遇 miss **清零**。
  - `pattern` 类 fact（整十整百口算）的 CORRECTION 文案不同：强调"先想口诀，再添 0"，别当纯记忆题。
- **晋级**：三阶段全部通过 → `currentLevel` 推进到下一关，`completedLevels` 追加，阶段重置回 take_off。
- **选题策略（MVP 简单即可）**：在当前池里 shuffle，但对 `lastMissAt` 较近的 fact 提高出现权重。**预留 hook**，将来可换 FSRS/SM-2 自适应排序（不要在 MVP 里实现，留接口即可）。
- **里程碑竞速**：1 分钟，题池 = 至今所有已学 fact，统计 correct/min，写入记录。`engine_config.milestone_races.positions_percent` 决定插入点。

### 个性化基线
首次进入做一个 ~10 题的敲击速度探针（中性热身题），取**响应时间中位数 × 系数**作为该孩子的 `latencyGateMs`，而不是用统一硬值。（Rocket Math 用"书写速度"，数字版的等价物是敲击/点按速度。）

## 6. 数据模型（持久化）

至少存：`students`、`trackStates`（每个学生每条 track 一份快照）、`raceResults`，以及一条 **append-only 的 `events` 日志**（每次作答一条）。
事件日志是刻意要的——它让"回放/统计/将来 backtest 节奏参数"成为可能，是这类训练器的金矿，别省。

## 7. UI / 交互

- 极简、儿童友好、**低装饰**。重点是练习循环本身，不是画面。
- 屏幕：**首页**（选 track + 看 Rocket Chart）→ **答题**（一次一题、大输入区、倒计时环）→ **纠错浮层** → **过关庆祝** → **竞速模式**。
- 输入：屏幕数字键盘（平板）+ 物理键盘都要支持。
- **时间锁**（玩 5/10/15 分钟后强制休息 20 分钟）：按 Rocket Math 设计纳入，做成可配置的防沉迷护栏；MVP 可标 optional。
- **App Store 真实差评教训**：竞速模式里那个"哦~你不会这题？"的语音极其招人烦、还吃时间。所以**竞速模式默认关语音**，纠错语音只在学习阶段出现，且全程可静音。
- 可访问性：大点击区；字号不小于可读阈值。

## 8. 里程碑计划（按此 checkpoint，每个里程碑一次 commit）

- **M1 — 引擎核心 + 测试（无 UI）**：把 `step()` 写出来并通过测试套件，覆盖所有阶段转移、纠错回路、超时判定、三个掌握门、晋级。**这是地基，UI 之前必须先过。**
- **M2 — content pack 加载与校验**：把 `mult_facts` track 接进引擎。
- **M3 — 最小可玩 UI**：乘法口诀能从 Level A 一路玩下去（出题→作答→纠错→过关）。
- **M4 — Rocket Chart + 持久化**：过关填色；刷新后能恢复进度。
- **M5 — 竞速 + 基线探针 + 语音**。
- **M6 — 收尾**：通过配置启用 `div_facts` 与 `round_number_oral` 两条 track；时间锁；打磨。

## 9. 验收标准（具体、可测）

- [ ] 一个孩子能在无开发者干预下完成乘法口诀 Level A→C。
- [ ] 答错**或**超时都会触发"立即重新教学 → 立即重测同一题"。
- [ ] 掌握门生效：Take-Off 必须时限内连对 12；Orbit/Universe 必须 30 题内错 ≤ 2。
- [ ] 刷新页面后进度、factStats、completedLevels 完整恢复。
- [ ] 引擎单测覆盖 >90%，且 grep 全引擎目录**零** `fetch`/网络/LLM 调用。
- [ ] 竞速产出正确的 correct-per-minute 分数。
- [ ] 仅靠把 content pack 里某 track 的 `enabled` 切换，就能在 UI 出现/隐藏该 track（证明 track-agnostic）。

## 10. 工作约定

- **先 M1，引擎测试不过不碰 UI。**
- 引擎保持纯函数 + 确定性；所有随机性走可注入的 seedable RNG。
- 维护 `PROGRESS.md`：每个里程碑记完成项、偏离本 SPEC 的决策及理由。
- 把本文件作为仓库的 `SPEC.md` 保留。
- 加新依赖前先问。
