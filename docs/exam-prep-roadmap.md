# 「我要备考」功能 — 分期设计 Roadmap

> 本文件记录从「考试日历（资讯展示）」延伸到「面向目标考试的备考闭环」的产品与架构决策。
> 已确认：**内容策略 = 同步投入补建缺失练习**（不止串联现有内容）/ **入口 = 考试详情「开始备考」+ 首页「继续备考」** / 按 **P0→P2** 分期。
> 关联文档：[`docs/knowledge-map-design.md`](./knowledge-map-design.md)（两套引擎与 Topic 数据模型）。

## 1. 背景与目标

考试日历已上线，其数据 schema（`content/exam_calendar.json`）从第一版起就预留了两个联动字段：

- `series[].prepTopics`：`{ grade, topicId, label }[]` —— 引用知识地图里的 `Topic.id`，把考试映射到要掌握的知识点。
- `series[].vocabLink`：`{ module: "english_vocab", level }` —— 英语考试联动到背单词模块。

**核心方向**：把产品从「按学科刷题」升级为「面向目标考试系统备考」。用户闭环：

```
选定考试 → 生成备考清单（串联各学科基础知识点）
        → 标注每个知识点的掌握状态
        → 引导去练习未掌握的点
        → 追踪整体备考进度
```

本文档回答「为实现这个闭环，还需要做哪些功能」，并给出分期落地方案。

## 2. 现状盘点（决定能复用什么 / 缺什么）

### 2.1 可直接复用（零或极低改造）

| 能力 | 现成接口 | 位置 |
|---|---|---|
| 查口算掌握 | `adapter.getTrackState(studentId, trackId)`，判 `completedLevels.length === levels.length` | `src/storage/types.ts:80` |
| 查练习掌握 | `adapter.getPractice(studentId, setId)`，判 `record.completed` | `src/storage/types.ts:88` |
| 查错题/薄弱点 | `adapter.listMistakes(studentId)` → 按 `topicId` 过滤（`MistakeRecord` 含 `topicId/elapsedMs/corrected`） | `src/storage/types.ts:44-60` |
| 跨孩子隔离 | `studentIdFor(activeChild)` → `child_<id>` / `local` | `src/ui/family.ts:33` |
| 跨年级加载内容 | `loadGrade(g)` 支持 grade 3-9，模块级缓存 | `src/ui/gradeLoader.ts` |
| 自包含练习组件 | `PracticeScreen/Play/Race/Probe` 仅需 `{题包, adapter, studentId, setId/trackId, seed, onExit}` | `src/ui/App.tsx:300-324` |
| 英语词汇深链 | `vocab.html?level=a2-key&topic=...&mode=...` 已实现解析 | `public/vocab-app.js`（resolveInitialState） |

**存储层 schema 无需任何改动**即可支撑备考的掌握度聚合。

### 2.2 关键技术点：跨年级跳练习

App.tsx 当前只持有单一 `grade` / `content` state，`PracticeScreen` 用的是 `content.practicePack`（当前年级题包）。一张 AMC 备考清单会横跨 grade 6/7/9——但因为练习组件是自包含的、`loadGrade` 又带缓存，**解法是让「备考页」自己管理子导航**：点知识点时按需 `loadGrade(topic.grade)` 拿到对应年级题包再渲染练习，`onExit` 回到备考清单。**不扩展、不污染全局 `Session` 类型**，与现有 state 驱动的页面切换风格一致。

### 2.3 最大短板：内容覆盖

- 现 `prepTopics` 稀疏：数学竞赛每个仅 2-3 个、英语靠 `vocabLink`、语文/科创为空。
- 练习内容仅覆盖 **grade3-9 数学** + **KET/PET 词汇**。
- 超出课内的备考点（竞赛几何/数论、英语阅读写作、语文、编程）**目前没有练习内容**。

→ 用户已确认**同步投入补建**这些缺失内容（见 §4 的 E2）。无内容的考试在 UI 上降级为「备考内容建设中」。

### 2.4 既有但未用的字段

`Topic.dependsOn` 已在类型里（`src/map/types.ts`）但当前无任何消费逻辑，且数据均为同年级引用（无跨年级依赖）。备考清单的排序需自行实现（年级递进 + 同年级内 `dependsOn` 拓扑）。

## 3. 功能全景（答「还需要哪些功能」）

### A. 备考清单 Prep Checklist（核心）
为选定考试生成有序知识点清单：按学科/单元/年级分组，按年级递进 + `dependsOn` 排序。每项显示：所属年级、掌握状态、「去练习」入口。数据来自 `series.prepTopics`（+ `vocabLink`）。

### B. 掌握度聚合 Mastery Aggregation
封装 `getTopicMastery(adapter, studentId, topic)` → 三态（已掌握 / 进行中 / 未开始）。清单顶部整体进度「已掌握 X/N · 完成度 NN%」。复用错题本标出该考试相关薄弱点。

### C. 跨年级练习跳转 Cross-grade Jump（关键技术）
备考页自包含子导航：点知识点 → `loadGrade(topic.grade)` → 渲染 `PracticeScreen`/`Play`，`onExit` 回**备考清单**（而非该年级地图）。英语项 → `EnglishVocab` 带 level 深链。

### D. 备考入口与目标管理 Entry & Target
- 考试详情弹窗加「开始备考」按钮（`ExamCalendar` DetailModal）。
- 持久化「当前备考目标」：localStorage `rm.prep.<studentId>`，跨孩子隔离。
- 首页加「继续备考：AMC 8 · 完成度 40%」胶囊/横幅（有目标时显示）。
- 多目标：P0 单目标，P2 支持多目标。

### E. 内容建设 Content Authoring（最大工程，已确认投入）
- **E1（P0，无需新练习）**：用现有 grade3-9 数学 topic + KET/PET 词表，把数学竞赛与剑桥英语的 `prepTopics` 映射做扎实（research 辅助，逐考试核对）。
- **E2（P1+，新建练习）**：补建超出课内的备考内容，复用 `content/build_*.py` + `knowledge_map` + `practice_pack` 生产管线：
  - 数学竞赛专项：几何、数论、组合计数、竞赛应用题
  - 英语：阅读理解、语法、写作（KET/PET 不止背单词）
  - 语文：阅读/作文（覆盖叶圣陶/楚才）
  - 科创：计算思维/编程入门（Bebras/蓝桥青少）
- 无内容的考试在清单/详情标「备考内容建设中」（判定：`prepTopics.length === 0 && !vocabLink`）。

### F. 备考计划/排程 Study Plan（P2）
按报名/考试日期倒排：距考试 N 天、每周计划、每日打卡与提醒、完成度里程碑。利用考试日历已有的 `examDate / registrationEnd`。

## 4. 分期

### P0 — 备考闭环机制（用现有内容跑通）
- `PrepScreen.tsx`：清单 + 掌握度聚合 + 跨年级跳转子导航
- 详情「开始备考」+ 首页「继续备考」+ 目标持久化
- `EnglishVocab` 加 level 深链
- 覆盖范围：数学竞赛（grade3-9 数学）、KET/PET（背单词）；其余标「建设中」
- 含 **E1**：把数学竞赛/剑桥英语的 `prepTopics` 映射用现有 topic 做扎实

### P1 — 内容扩建 + 体验增强
- **E2** 启动：竞赛数学专项练习（几何/数论/组合，分模块分期上线）
- 错题本融入备考薄弱点视图
- KET/PET 阅读/语法练习（超出背单词）
- 备考多目标

### P2 — 智能备考
- 按考试日期倒排的学习计划 / 打卡 / 提醒
- 语文、科创备考内容
- 备考报告（家长视角，复用 `ParentDashboard`）

## 5. P0 架构设计要点（供后续实现）

- 新建 `src/ui/PrepScreen.tsx`：自包含组件。
  - props：`{ seriesId, adapter, studentId, onBack }`
  - state：`{ view: 'list'|'practice'|'vocab', loadedGrades: Map<number, GradeContent>, masteryByTopic, activePractice }`
- 掌握度 helper（新建 `src/ui/prepMastery.ts` 或并入 PrepScreen）：`getTopicMastery()` 组合 `getTrackState/getPractice`；批量查询仿 `KnowledgeMap.tsx:54-66` 的 `Promise.all` 模式。
- `App.tsx`：新增 `prepExamId` state + 渲染分支（仿现有 `examCal` 分支），带 `userBar/switcherEl`。
- `ExamCalendar.tsx` DetailModal：加「开始备考」按钮 → 回调 `onStartPrep(seriesId)`（「建设中」的 series 禁用并提示）。
- `EnglishVocab.tsx`：加 `level?/topic?` props → `src={ '/vocab.html?level=' + level }`。
- 持久化：localStorage `rm.prep.<studentId>`，存 `{ seriesId, startedAt }`。
- **存储层零改动**；练习/口算/词汇组件零改动（仅传入不同年级的题包）。

### 数据 schema 微调（P0）
- `prepTopics[]` 现为 series 级、含 `{ grade, topicId, label }`，P0 够用。
- 可选增项 `area`（如「数与代数」「几何」）供清单分组 —— 非必需，P1 再加。

## 6. 开放问题（实现前再定）

- **备考清单粒度**：`prepTopics` 现为 series 级（整套考试共用）。AMC 8 与 AMC 12 备考重点差异大，但同属不同 series 已天然区分；同一 series 不同级别（如袋鼠 A-F 级）是否需要分级清单 —— P0 先 series 级，按需再细化。
- **掌握阈值**：现「掌握」是布尔（口算全通关 / 练习 completed）。备考是否需要更高标准（如竞赛要求「一次答对率 ≥ X%」）—— P0 沿用现有布尔，P1 评估。
- **E2 内容优先级**：先补哪类（竞赛数学几何/数论 vs 英语阅读）取决于用户最关注的考试，实现前确认。
