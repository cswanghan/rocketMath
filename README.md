# 🚀 星芽 — 语文、英语与数学练习

Local-first 学习应用。数学覆盖三至九年级，Web 与小程序另有语文识字、分级阅读及英语词汇、阅读、语法。iOS 原生当前仍为数学；本轮题库更新不等于原生三科接入。早期需求见 [`SPEC.md`](./SPEC.md)，进度与决策见 [`PROGRESS.md`](./PROGRESS.md)。

## 当前题库（2026-11-17）

| 内容 | 覆盖范围 | 题量 |
|---|---|---|
| 数学口算 | 三至九年级 | 2,056 题；各年级 288 / 256 / 288 / 288 / 256 / 352 / 328 |
| 数学综合练习 | 三至九年级 | 3,855 题；本轮保留原题包 |
| 语文字卡 | 常用字、14 类偏旁 | 143 张；拼音题使用例词限定多音字语境 |
| 语文原创阅读 | 建议一至六年级 | 各 2 篇，共 12 篇、36 题，附原文依据与解析 |
| 英语阅读与语法 | KET/A2、PET/B1 学习路径 | 4 组各 32 题，共 128 题，分基础、巩固、挑战 |
| 英语词汇 | A2/B1、12 个主题 | 保留 516 个词条 |

语文年级是建议难度，不对应指定教材；高年级短文仍属基础阅读补充。英语为原创练习，不是官方真题。题量与结构检查不代表所有原有综合题都经过本轮人工复核。

数学新增题保留旧题 ID 与进度结构；106 个薄弱口算池扩为每池 16 题，至少 6 种答案，单一答案不超过 25%。口诀与特殊角记忆池保持原教学顺序。网页、小程序和 iOS 口算/竞速均可输入负数；负号按整条题型开启，不提示当前题的答案符号。

网页和小程序的 17 个双模式知识点可分别进入综合练习、口算和竞速；三端补齐七年级有理数乘除入口。网页综合填空允许负数、分数与文字，答对后也显示解析。

题库源与再生成：

```sh
python3 content/build_content_pack.py       # 三年级口算
python3 content/build_grade5.py --fluency-only # 同样适用于六至九年级
python3 content/build_english.py            # 英语题库；编辑 english_questions.py / build_english.py
python3 content/build_chinese_reading.py    # 原创阅读；字卡源仍在 public/chinese-characters.html
npm run content:english                    # 数学英文镜像；新增文字需先补已审校映射
npm run mini:content                       # 同步小程序产物
npm run test:content                       # 独立数学答案校验、生成物新鲜度
npm run test:localization
npm test                                   # 题库、进度、输入及跨端产物回归
```

数学综合练习及英语阅读/语法选择题点选后立即显示对错与解析，无需再提交；首次错选后点“再试一次”重新作答，连续点击不会重复计分。语文识字与阅读选择题点选即反馈并显示正解。口算和竞速在停止输入约 1 秒后自动判定，不再显示检查按钮；等待时间不计入反应速度。综合填空与多步骤题保留确认按钮。原创语文阅读按字在文章中的位置标注多音字语境，编辑后的自定义文本仍使用自动参考读音。

数学题池改变后，用 `npm run golden` 更新原生回归快照，并核对引擎阶段与计分不变。已上传或正在审核的安装包不会因源码更新而改变。当前发布采用 Build 10，实际验收与发布状态见 [Build 10 发布记录](docs/build10-release-acceptance.md)；Build 8 的真机检查保留为历史证据。

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 引擎、存储、账号、题库及输入回归
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
