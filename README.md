# 🚀 Rocket Math — 三年级计算流畅度训练器

Local-first、单机单人的 Web 应用,用 Rocket Math 的 mastery-learning 模型训练三年级数学**计算流畅度**(automaticity)。完整需求见 [`SPEC.md`](./SPEC.md),进度与决策见 [`PROGRESS.md`](./PROGRESS.md)。

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 67 个测试(引擎 + 存储 + 时间锁)
npm run build      # 生产打包
npm run content    # 重新生成 content pack(改节奏/加 track 后)
```

## 架构

- **核心引擎** `src/engine/` —— 纯 TypeScript reducer `step(state, event, ctx)`,**零 React / 零 DOM / 零网络 / 零 LLM**,确定性(随机走可注入 seedable RNG),Vitest 覆盖 >90%。引擎对「教什么」一无所知,只认 content pack。
- **内容包** `content/` —— `build_content_pack.py` 生成 `grade3_math_fluency_pack.json`。每关只声明 `new_facts`;orbit/universe 混合池由引擎按 `interleave_rules` 推导。**别手改 JSON**,改生成器重跑。
- **持久化** `src/storage/` —— `StorageAdapter` 接口 + IndexedDB 实现(+ 内存兜底)。存 trackStates / raceResults / append-only 事件日志。换真后端只改 adapter。
- **UI** `src/ui/` —— React + Vite。首页(选 track + Rocket Chart)→ 答题(倒计时环)→ 纠错浮层 → 过关庆祝 → 竞速 / 基线探针 / 时间锁。

## 三阶段掌握循环(每关 A–R)

1. **Take-Off** 池=本关新事实;掌握=时限内连对 12。
2. **Orbit** 池=本关 ∪ 上一关;掌握=30 题内错 ≤ 2。
3. **Universe** 池=A..当前关全部;掌握=30 题内错 ≤ 2。

贯穿三阶段的**纠错回路**:答错或超时 → 立即重教(显示+朗读答案)→ 立即重测同一题。

## 三条 track(全部数据驱动)

| trackId | 内容 | 关数 |
|---|---|---|
| `mult_facts` | 乘法口诀 | 18 (A–R) |
| `div_facts` | 除法口诀 | 6 |
| `round_number_oral` | 整十整百口算(pattern) | 4 |

切 content pack 里某 track 的 `enabled` 即可在 UI 显隐该 track —— 引擎 track-agnostic。
