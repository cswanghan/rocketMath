# 知识地图设计 — 人教版三年级数学全覆盖

> 本文件记录从「单一流畅度专题」扩展到「按知识地图覆盖三年级每个知识点」的架构决策。
> 已确认:**人教版(PEP)** / **新增非限时模式**(不给概念课加限时刷题)/ **按教学法分 P0→P2**。

## 1. 核心原则(不可违背)

- 原 SPEC 的**流畅度引擎**保持不变:限时门 + 三阶段掌握门,只服务"口算自动化"(automaticity)。
- 概念/竖式/应用题**不加限时**(SPEC §2 的 `non_drill_topics` 是刻意的)。给"理解分数"加倒计时会把概念课做坏。
- 因此引入**第二种引擎:Practice(非限时练习)**。两套引擎共存,由知识地图节点的 `pedagogy` 决定走哪套。
- **两套引擎都保持:纯函数、确定性、本地、零网络、零 LLM、数据驱动**。概念题的答案/干扰项/提示/解释全部写在 content 里,判题不需要 LLM。

## 2. 教学法 → 引擎映射

| pedagogy | 含义 | 引擎 | 交互 |
|---|---|---|---|
| `fluency` | 口算自动化(口诀、整十整百、加减口算、单位换算) | **现有 TimedDrill** | 限时环 + 三阶段掌握门 |
| `procedure` | 竖式等多步算法(加减乘除竖式) | **新 Practice** | 多格分步输入,错了给步骤提示 |
| `formula` | 公式应用(周长、面积) | **新 Practice** | 填空 + 图示 + 应用题 |
| `concept` | 概念理解(分数、小数、倍、单位认识、钟表) | **新 Practice** | 选择/判断 + 图示 + 解释 |
| `logic` | 推理(集合、搭配、路线) | **新 Practice** | 选择/匹配 |
| `data` | 数据(复式统计表) | **新 Practice** | 读表选择/填空 |

## 3. 数据模型

### 知识地图(`content/grade3_knowledge_map.json`,由 `build_knowledge_map.py` 生成)

```
KnowledgeMap {
  textbook: "人教版", grade: 3,
  units: [ { id, term: 'upper'|'lower', index, title, topicIds: [...] } ],
  topics: [ Topic ]
}
Topic {
  id, unitId, title,
  pedagogy: 'fluency'|'procedure'|'formula'|'concept'|'logic'|'data',
  dependsOn: [topicId...],          // 先修(地图解锁顺序)
  status: 'ready' | 'coming_soon',  // 内容是否已铺好
  fluencyTrackId?: string,          // pedagogy=fluency 时,指向流畅度包里的 track
  problemSetId?: string             // 其余 pedagogy 时,指向 Practice 题集
}
```

### Practice 题集(P0b 起,`content/grade3_practice_pack.json`)

```
ProblemSet { id, title, pedagogy, mastery: { target_correct, allow_retry: true }, problems: [Problem] }
Problem {
  id, type: 'mc'|'fill'|'steps'|'truefalse',
  prompt,
  choices?: [{id, label, correct}],     // mc / truefalse
  answer?: number|string,               // fill(数值按数值比对)
  fields?: [{id, label, answer}],       // steps(竖式多格)
  figure?: FigureSpec,                  // 简单 SVG 规格(面积方格、分数条等)
  hint?,                                // 答错时给
  explanation?                          // 答对后/揭示时讲解
}
```

Practice 引擎(非限时)循环:出题 → 判题(确定性)→ 对:记一分,够掌握线则过关;错:显示 hint + 解释,**无惩罚计时**,可重试。掌握 = 一组题正确率达标(非"连对/限时")。

## 4. 人教版三年级完整知识地图

### 上册(upper,9 单元)

| 单元 | topic | pedagogy | 依赖 |
|---|---|---|---|
| U1 时分秒 | 认读钟表 | concept | |
| | 时分秒换算(1时=60分) | fluency | |
| | 经过时间 | formula | 时分秒换算 |
| U2 万以内加减(一) | 几百几十加减口算 | fluency | |
| | 加减估算 | concept | |
| U3 测量 | 长度单位认识(mm/dm/km) | concept | |
| | 长度单位换算 | fluency | 长度单位认识 |
| | 质量单位认识(吨/千克/克) | concept | |
| | 质量单位换算 | fluency | 质量单位认识 |
| U4 万以内加减(二) | 三位数加法竖式 | procedure | 几百几十加减口算 |
| | 三位数减法竖式 | procedure | 三位数加法竖式 |
| | 加减验算 | procedure | 三位数减法竖式 |
| U5 倍的认识 | 倍的认识 | concept | 乘法口诀 |
| | 倍数应用题 | formula | 倍的认识 |
| U6 多位数乘一位数 | 整十整百乘一位(口算) | fluency | 乘法口诀 |
| | 不进位乘竖式 | procedure | 整十整百乘一位 |
| | 进位乘竖式 | procedure | 不进位乘竖式 |
| | 因数含0的乘法 | procedure | 进位乘竖式 |
| U7 长方形正方形 | 四边形认识 | concept | |
| | 周长认识 | concept | |
| | 长方形正方形周长 | formula | 周长认识 |
| U8 分数初步 | 几分之一·几分之几 | concept | |
| | 分数比大小 | concept | 几分之一·几分之几 |
| | 同分母分数加减 | concept | 分数比大小 |
| U9 数学广角 | 集合(重叠问题) | logic | |

### 下册(lower,8 单元)

| 单元 | topic | pedagogy | 依赖 |
|---|---|---|---|
| L1 位置与方向 | 东南西北 | concept | |
| | 简单路线图 | logic | 东南西北 |
| L2 除数一位数除法 | 口算除法 | fluency | 除法口诀 |
| | 除法估算 | concept | 口算除法 |
| | 一位数除法竖式 | procedure | 口算除法 |
| | 有余数除法 | procedure | 一位数除法竖式 |
| L3 复式统计表 | 读复式统计表 | data | |
| L4 两位数乘两位数 | 两位数乘整十(口算) | fluency | 乘法口诀 |
| | 两位数乘两位数竖式 | procedure | 两位数乘整十 |
| L5 面积 | 面积认识 | concept | |
| | 面积单位(cm²/m²) | concept | 面积认识 |
| | 面积单位换算 | fluency | 面积单位 |
| | 长方形正方形面积 | formula | 面积单位 |
| L6 年月日 | 大小月·平闰年 | concept | |
| | 年月日计算 | logic | 大小月·平闰年 |
| | 24时计时法 | concept | |
| L7 小数初步 | 小数的认识 | concept | |
| | 小数比大小 | concept | 小数的认识 |
| | 简单小数加减 | concept | 小数比大小 |
| L8 数学广角 | 搭配(组合) | logic | |

合计约 **40 个 topic**。其中 fluency ≈ 8(进现有引擎),其余 ≈ 32 走 Practice 引擎。

## 5. 分阶段(P0→P2)

- **P0a(本阶段)**:知识地图框架 + 导航 UI;现有 3 条 fluency track(乘/除/整十整百)接入地图;扩 `computeFromPrompt` 支持 +/−,新增 `add_sub_oral` 口算 track。非 fluency topic 显示「即将上线」。
- **P0b**:Practice 引擎(纯 TS + 测试)+ 竖式多格 UI;接入加减/乘/除竖式 procedure topic。
- **P1**:formula(周长、面积)+ 简单图示。
- **P2**:concept/logic/data(分数、小数、倍、年月日、位置、统计、广角)。

## 6. 与现有架构的关系

- 流畅度引擎 `src/engine/`、流畅度包 `content/grade3_math_fluency_pack.json`:**不动其内核**,仅新增 fluency track。
- 新增 `src/practice/`(Practice 引擎,纯 TS)、`src/map/`(地图加载/解锁逻辑)、对应 UI。
- 持久化复用 `StorageAdapter`:Practice 进度按 problemSetId 存快照,事件日志同样 append-only。
- 地图成为新的首页;fluency topic → 现有 Play;其余 → Practice 屏。
