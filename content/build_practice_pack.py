#!/usr/bin/env python3
"""Practice problem-set generator (人教版三年级,非限时题集).

Drives the Practice engine (procedure/formula/concept/logic/data). P0b ships
the procedure sets: 竖式加/减/乘/除. Answers are computed here so the JSON is
always consistent. Edit + re-run; never hand-edit the JSON.

    python3 content/build_practice_pack.py

See docs/knowledge-map-design.md for the Problem schema.
"""
import json
import os


def col(a, b, op):
    """Render a vertical (竖式) layout as a multi-line string."""
    w = max(len(str(a)), len(str(b)) + 2) + 1
    l1 = str(a).rjust(w)
    l2 = (op + " " + str(b)).rjust(w)
    bar = "─" * w
    return f"{l1}\n{l2}\n{bar}"


def fill_problem(pid, prompt, answer, hint, explanation):
    return {
        "id": pid,
        "type": "fill",
        "prompt": prompt,
        "answer": answer,
        "hint": hint,
        "explanation": explanation,
    }


def steps_problem(pid, prompt, fields, hint, explanation):
    return {"id": pid, "type": "steps", "prompt": prompt, "fields": fields, "hint": hint, "explanation": explanation}


def add_set():
    pairs = [(456, 378), (285, 637), (159, 264), (308, 495), (672, 259), (437, 386), (548, 273), (619, 184)]
    probs = [
        fill_problem(f"add_{a}_{b}", col(a, b, "+"), a + b, "从个位加起,满十向前一位进 1", f"{a} + {b} = {a + b}")
        for a, b in pairs
    ]
    return {"id": "add_column", "title": "三位数加法竖式", "pedagogy": "procedure", "maxTries": 2, "problems": probs}


def sub_set():
    pairs = [(834, 378), (605, 247), (700, 365), (523, 168), (910, 432), (456, 189), (742, 575), (381, 196)]
    probs = [
        fill_problem(f"sub_{a}_{b}", col(a, b, "−"), a - b, "不够减时,向前一位借 1 当 10", f"{a} − {b} = {a - b}")
        for a, b in pairs
    ]
    return {"id": "sub_column", "title": "三位数减法竖式", "pedagogy": "procedure", "maxTries": 2, "problems": probs}


def mul_nocarry_set():
    pairs = [(213, 3), (122, 4), (321, 2), (231, 3), (412, 2), (143, 2)]
    probs = [
        fill_problem(f"muln_{a}_{b}", col(a, b, "×"), a * b, "用乘法口诀,每一位分别乘", f"{a} × {b} = {a * b}")
        for a, b in pairs
    ]
    return {"id": "mul1_nocarry", "title": "不进位乘竖式", "pedagogy": "procedure", "maxTries": 2, "problems": probs}


def mul_carry_set():
    pairs = [(256, 3), (147, 4), (238, 3), (165, 5), (274, 3), (189, 4)]
    probs = [
        fill_problem(f"mulc_{a}_{b}", col(a, b, "×"), a * b, "哪一位满几十,就向前一位进几", f"{a} × {b} = {a * b}")
        for a, b in pairs
    ]
    return {"id": "mul1_carry", "title": "进位乘竖式", "pedagogy": "procedure", "maxTries": 2, "problems": probs}


def div_set():
    pairs = [(84, 4), (96, 3), (75, 5), (92, 4), (78, 6), (85, 5)]
    probs = [
        fill_problem(f"div_{a}_{b}", f"{a} ÷ {b} = ?", a // b, "从最高位除起", f"{a} ÷ {b} = {a // b}")
        for a, b in pairs
    ]
    return {"id": "div_column", "title": "一位数除法竖式", "pedagogy": "procedure", "maxTries": 2, "problems": probs}


def div_remainder_set():
    pairs = [(47, 5), (38, 4), (59, 6), (23, 4), (67, 8), (50, 7)]
    probs = [
        steps_problem(
            f"divr_{a}_{b}",
            f"{a} ÷ {b} = ( ) … ( )",
            [{"id": "q", "label": "商", "answer": a // b}, {"id": "r", "label": "余数", "answer": a % b}],
            "余数一定要比除数小",
            f"{a} ÷ {b} = {a // b} …… {a % b}",
        )
        for a, b in pairs
    ]
    return {"id": "div_remainder", "title": "有余数的除法", "pedagogy": "procedure", "maxTries": 2, "problems": probs}


def mc_problem(pid, prompt, options, correct_idx, hint, explanation):
    """options: list of labels; correct_idx: index of the correct one."""
    choices = [
        {"id": chr(ord("a") + i), "label": str(lab), "correct": i == correct_idx}
        for i, lab in enumerate(options)
    ]
    return {"id": pid, "type": "mc", "prompt": prompt, "choices": choices, "hint": hint, "explanation": explanation}


# ---------------- P1: formula(周长 / 面积 / 倍数 / 经过时间) ----------------

def perimeter_set():
    probs = []
    for l, w in [(8, 5), (12, 7), (10, 6), (15, 9), (20, 4), (14, 11)]:
        probs.append(fill_problem(f"peri_rect_{l}_{w}", f"长方形,长 {l} 厘米,宽 {w} 厘米。\n周长是多少厘米?",
                                  (l + w) * 2, "周长 =(长 + 宽)× 2", f"({l}+{w})×2 = {(l + w) * 2} 厘米"))
    for s in [6, 9, 12]:
        probs.append(fill_problem(f"peri_sq_{s}", f"正方形,边长 {s} 厘米。\n周长是多少厘米?",
                                  s * 4, "周长 = 边长 × 4", f"{s}×4 = {s * 4} 厘米"))
    return {"id": "perimeter_formula", "title": "长方形正方形周长", "pedagogy": "formula", "maxTries": 2, "problems": probs}


def area_set():
    probs = []
    for l, w in [(8, 5), (12, 6), (9, 7), (15, 4), (10, 10), (13, 6)]:
        probs.append(fill_problem(f"area_rect_{l}_{w}", f"长方形,长 {l} 厘米,宽 {w} 厘米。\n面积是多少平方厘米?",
                                  l * w, "面积 = 长 × 宽", f"{l}×{w} = {l * w} 平方厘米"))
    for s in [4, 7, 9]:
        probs.append(fill_problem(f"area_sq_{s}", f"正方形,边长 {s} 厘米。\n面积是多少平方厘米?",
                                  s * s, "面积 = 边长 × 边长", f"{s}×{s} = {s * s} 平方厘米"))
    return {"id": "area_formula", "title": "长方形正方形面积", "pedagogy": "formula", "maxTries": 2, "problems": probs}


def times_word_set():
    probs = []
    for a, n in [(6, 3), (8, 4), (7, 5), (9, 6)]:
        probs.append(fill_problem(f"times_{a}_{n}", f"{a} 的 {n} 倍是多少?", a * n, "几倍就是乘几", f"{a}×{n} = {a * n}"))
    for big, small in [(24, 6), (35, 7), (48, 8)]:
        probs.append(fill_problem(f"timesq_{big}_{small}", f"{big} 是 {small} 的几倍?", big // small,
                                  "求几倍用除法", f"{big}÷{small} = {big // small}"))
    return {"id": "times_word", "title": "倍数应用题", "pedagogy": "formula", "maxTries": 2, "problems": probs}


def time_elapsed_set():
    probs = []
    for h1, h2 in [(8, 11), (9, 12), (7, 10), (13, 17)]:
        probs.append(fill_problem(f"elapsed_{h1}_{h2}", f"从 {h1} 时到 {h2} 时,经过了几小时?",
                                  h2 - h1, "结束时刻 − 开始时刻", f"{h2}−{h1} = {h2 - h1} 小时"))
    probs.append(mc_problem("elapsed_mc1", "一节课 40 分钟,从 9:00 开始,几点下课?",
                            ["9:30", "9:40", "10:00"], 1, "9 时加 40 分", "9:00 + 40 分 = 9:40"))
    probs.append(mc_problem("elapsed_mc2", "电影 8:00 开始,10:00 结束,放映了多久?",
                            ["1 小时", "2 小时", "3 小时"], 1, "10 − 8", "经过 2 小时"))
    return {"id": "time_elapsed", "title": "经过时间", "pedagogy": "formula", "maxTries": 2, "problems": probs}


def _fills(setid, title, pedagogy, items, hint):
    """items: list of (prompt, answer). explanation auto = '= answer'."""
    probs = [fill_problem(f"{setid}_{i}", p, a, hint, f"答案:{a}") for i, (p, a) in enumerate(items)]
    return {"id": setid, "title": title, "pedagogy": pedagogy, "maxTries": 2, "problems": probs}


def _mcs(setid, title, pedagogy, items, hint):
    """items: list of (prompt, [options], correct_idx, explanation)."""
    probs = [mc_problem(f"{setid}_{i}", p, opts, ci, hint, ex) for i, (p, opts, ci, ex) in enumerate(items)]
    return {"id": setid, "title": title, "pedagogy": pedagogy, "maxTries": 2, "problems": probs}


# ============ P2-A: 口算 / 单位换算(暂用 Practice fill,整数答案)============

def time_conversion_set():
    return _fills("time_conversion", "时分秒换算", "fluency", [
        ("1 时 = ( ) 分", 60), ("2 时 = ( ) 分", 120), ("1 分 = ( ) 秒", 60),
        ("3 分 = ( ) 秒", 180), ("120 分 = ( ) 时", 2), ("180 秒 = ( ) 分", 3),
    ], "1 时 = 60 分,1 分 = 60 秒")


def length_conversion_set():
    return _fills("length_conversion", "长度单位换算", "fluency", [
        ("1 厘米 = ( ) 毫米", 10), ("1 分米 = ( ) 厘米", 10), ("1 米 = ( ) 厘米", 100),
        ("1 千米 = ( ) 米", 1000), ("3 米 = ( ) 厘米", 300), ("50 毫米 = ( ) 厘米", 5),
    ], "进率:毫米→厘米→分米→米 都是 10,米→千米 是 1000")


def mass_conversion_set():
    return _fills("mass_conversion", "质量单位换算", "fluency", [
        ("1 千克 = ( ) 克", 1000), ("1 吨 = ( ) 千克", 1000), ("2 千克 = ( ) 克", 2000),
        ("3 吨 = ( ) 千克", 3000), ("5000 克 = ( ) 千克", 5), ("2000 千克 = ( ) 吨", 2),
    ], "1 吨 = 1000 千克,1 千克 = 1000 克")


def area_conversion_set():
    return _fills("area_conversion", "面积单位换算", "fluency", [
        ("1 平方分米 = ( ) 平方厘米", 100), ("1 平方米 = ( ) 平方分米", 100),
        ("2 平方分米 = ( ) 平方厘米", 200), ("300 平方厘米 = ( ) 平方分米", 3),
    ], "相邻面积单位进率是 100")


def div_oral_set():
    return _fills("div_oral", "口算除法", "fluency", [
        ("60 ÷ 3 = ?", 20), ("80 ÷ 4 = ?", 20), ("90 ÷ 3 = ?", 30),
        ("240 ÷ 6 = ?", 40), ("350 ÷ 5 = ?", 70), ("180 ÷ 2 = ?", 90),
    ], "先用口诀算,再看 0")


def mul2_oral_set():
    return _fills("mul2_oral", "两位数乘整十", "fluency", [
        ("12 × 10 = ?", 120), ("23 × 20 = ?", 460), ("15 × 30 = ?", 450),
        ("24 × 20 = ?", 480), ("13 × 30 = ?", 390), ("16 × 40 = ?", 640),
    ], "先算几乘几,再添上 0")


# ============ P2-B: 剩余竖式(procedure)============

def mul1_zero_set():
    pairs = [(405, 3), (320, 4), (608, 5), (240, 6), (503, 7), (160, 8)]
    probs = [fill_problem(f"mulz_{a}_{b}", col(a, b, "×"), a * b, "0 乘任何数都得 0,但要注意占位", f"{a} × {b} = {a * b}") for a, b in pairs]
    return {"id": "mul1_zero", "title": "因数中间末尾有0", "pedagogy": "procedure", "maxTries": 2, "problems": probs}


def mul2_column_set():
    pairs = [(23, 12), (34, 21), (45, 13), (26, 14), (31, 23), (42, 15)]
    probs = [fill_problem(f"mul2_{a}_{b}", col(a, b, "×"), a * b, "先乘个位再乘十位,最后相加", f"{a} × {b} = {a * b}") for a, b in pairs]
    return {"id": "mul2_column", "title": "两位数乘两位数竖式", "pedagogy": "procedure", "maxTries": 2, "problems": probs}


def add_sub_check_set():
    return _mcs("add_sub_check", "加减法验算", "procedure", [
        ("验算 356 + 278 = 634,用哪个算式?", ["634 − 278", "634 + 278", "356 − 278"], 0, "和减一个加数,应得另一个加数"),
        ("验算 800 − 245 = 555,用哪个算式?", ["555 + 245", "800 + 245", "555 − 245"], 0, "差加减数应得被减数"),
        ("验算 423 + 159 = 582,用哪个算式?", ["582 − 159", "582 + 159", "423 − 159"], 0, "和 − 一个加数 = 另一个加数"),
        ("验算 600 − 374 = 226,用哪个算式?", ["226 + 374", "600 + 226", "374 − 226"], 0, "差 + 减数 = 被减数"),
        ("加法可以用什么来验算?", ["交换加数再加一次", "用乘法", "不用验算"], 0, "交换两个加数再加,结果应相同"),
    ], "加减法互为逆运算")


# ============ P2-C: 概念课(concept)============

def read_clock_set():
    return _mcs("read_clock", "认读钟表", "concept", [
        ("时针指向 8,分针指向 12,是几时?", ["8:00", "12:00", "8:30"], 0, "分针指 12 是整时"),
        ("时针在 3 和 4 之间,分针指向 6,是几时几分?", ["3:30", "6:30", "4:30"], 0, "分针指 6 是 30 分"),
        ("钟面上一共有几个大格?", ["12", "60", "24"], 0, "钟面 12 个大格"),
        ("分针走一大格是几分钟?", ["5 分", "1 分", "12 分"], 0, "一大格 = 5 分钟"),
        ("分针走一圈,时针走多少?", ["1 大格", "1 圈", "不动"], 0, "分针 1 圈 = 60 分 = 1 小时,时针走 1 大格"),
    ], "看时针定'时',看分针定'分'")


def add_sub_estimate_set():
    return _mcs("add_sub_estimate", "加减估算", "concept", [
        ("498 + 305 大约是多少?", ["约 800", "约 700", "约 900"], 0, "500 + 300 ≈ 800"),
        ("612 − 289 大约是多少?", ["约 300", "约 400", "约 200"], 0, "600 − 300 ≈ 300"),
        ("203 + 398 大约是多少?", ["约 600", "约 500", "约 700"], 0, "200 + 400 ≈ 600"),
        ("一本书 18 元,一支笔 21 元,大约共多少?", ["约 40 元", "约 30 元", "约 50 元"], 0, "20 + 20 ≈ 40"),
        ("估算时通常把数看成什么?", ["最接近的整十整百", "最大的数", "最小的数"], 0, "看成接近的整十整百"),
    ], "把数看成接近的整十整百再算")


def length_units_set():
    return _mcs("length_units", "长度单位认识", "concept", [
        ("一支铅笔长约 18 ( )?", ["厘米", "毫米", "米"], 0, "铅笔约 18 厘米"),
        ("一枚 1 元硬币厚约 2 ( )?", ["毫米", "厘米", "分米"], 0, "很薄,用毫米"),
        ("教室门高约 2 ( )?", ["米", "分米", "厘米"], 0, "门高约 2 米"),
        ("北京到上海的距离用什么单位?", ["千米", "米", "分米"], 0, "很长,用千米"),
        ("1 米里面有几个 1 分米?", ["10", "100", "1000"], 0, "1 米 = 10 分米"),
    ], "短用毫米厘米,长用米千米")


def mass_units_set():
    return _mcs("mass_units", "质量单位认识", "concept", [
        ("一个鸡蛋约重 50 ( )?", ["克", "千克", "吨"], 0, "鸡蛋约 50 克"),
        ("一个小朋友约重 30 ( )?", ["千克", "克", "吨"], 0, "人用千克"),
        ("一头大象约重 5 ( )?", ["吨", "千克", "克"], 0, "很重,用吨"),
        ("称比较轻的东西用什么单位?", ["克", "吨", "千米"], 0, "轻的用克"),
        ("1 千克 = ( ) 克?", ["1000", "100", "10"], 0, "1 千克 = 1000 克"),
    ], "克 < 千克 < 吨")


def times_concept_set():
    return _mcs("times_concept", "倍的认识", "concept", [
        ("红花 3 朵,黄花是红花的 2 倍,黄花有几朵?", ["6", "5", "9"], 0, "3 × 2 = 6"),
        ("○○ 是 2 个,● 有它的 4 倍,● 有几个?", ["8", "6", "4"], 0, "2 × 4 = 8"),
        ("12 是 3 的几倍?", ["4", "3", "6"], 0, "12 ÷ 3 = 4"),
        ("求一个数的几倍,用什么运算?", ["乘法", "加法", "减法"], 0, "几倍 = 乘几"),
        ("8 是 2 的几倍?", ["4", "6", "10"], 0, "8 ÷ 2 = 4"),
    ], "几倍:乘法;求是几倍:除法")


def quad_props_set():
    return _mcs("quad_props", "四边形认识", "concept", [
        ("四边形有什么特点?", ["4 条直的边、4 个角", "3 条边", "没有角"], 0, "四边形:4 边 4 角"),
        ("长方形的对边怎么样?", ["相等", "不相等", "都不一样"], 0, "对边相等"),
        ("正方形的四条边怎么样?", ["都相等", "都不等", "两条相等"], 0, "四边都相等"),
        ("下面哪个是四边形?", ["长方形", "三角形", "圆"], 0, "长方形是四边形"),
        ("长方形有几个直角?", ["4", "2", "0"], 0, "4 个直角"),
    ], "四边形 = 4 条直边围成")


def perimeter_concept_set():
    return _mcs("perimeter_concept", "周长的认识", "concept", [
        ("周长指的是什么?", ["图形一周的长度", "图形里面的大小", "边的条数"], 0, "封闭图形一周的长度"),
        ("求周长就是求什么?", ["所有边长的总和", "最长的边", "面积"], 0, "各边之和"),
        ("绕操场跑一圈的长度是操场的什么?", ["周长", "面积", "宽"], 0, "一周长度 = 周长"),
        ("正方形周长 = ?", ["边长 × 4", "边长 × 边长", "边长 + 4"], 0, "边长 × 4"),
        ("长方形周长 = ?", ["(长 + 宽) × 2", "长 × 宽", "长 + 宽"], 0, "(长 + 宽) × 2"),
    ], "周长 = 封闭图形一周的总长度")


def fraction_meaning_set():
    return _mcs("fraction_meaning", "几分之一·几分之几", "concept", [
        ("把一个圆平均分成 4 份,每份是它的几分之几?", ["四分之一", "四分之四", "二分之一"], 0, "1 份 = 1/4"),
        ("把一块饼平均分成 2 份,每份是它的?", ["二分之一", "二分之二", "三分之一"], 0, "1/2"),
        ("一个长方形平均分成 8 份,取 3 份是?", ["八分之三", "三分之八", "八分之八"], 0, "3/8"),
        ("分数线下面的数表示什么?", ["平均分成几份", "取了几份", "一共几个"], 0, "分母 = 平均分的份数"),
        ("分数线上面的数表示什么?", ["取了几份", "平均分几份", "一共"], 0, "分子 = 取的份数"),
    ], "平均分的份数是分母,取的份数是分子")


def fraction_compare_set():
    return _mcs("fraction_compare", "分数比大小", "concept", [
        ("1/3 和 1/5 哪个大?", ["1/3", "1/5", "一样大"], 0, "分子相同,分母小的大"),
        ("3/7 和 5/7 哪个大?", ["5/7", "3/7", "一样大"], 0, "分母相同,分子大的大"),
        ("1/2 和 1/4 哪个大?", ["1/2", "1/4", "一样大"], 0, "分得越少每份越大"),
        ("分母相同时,怎么比大小?", ["分子大的大", "分子小的大", "都一样"], 0, "分母同,看分子"),
        ("2/9 和 7/9 哪个大?", ["7/9", "2/9", "一样大"], 0, "7 > 2"),
    ], "同分母看分子,同分子看分母")


def fraction_add_sub_set():
    return _mcs("fraction_add_sub", "同分母分数加减", "concept", [
        ("1/5 + 2/5 = ?", ["3/5", "3/10", "2/5"], 0, "分母不变,分子相加"),
        ("4/7 − 2/7 = ?", ["2/7", "2/0", "6/7"], 0, "分子相减"),
        ("3/8 + 4/8 = ?", ["7/8", "7/16", "1/8"], 0, "3 + 4 = 7"),
        ("同分母分数相加,分母怎么办?", ["不变", "相加", "相乘"], 0, "分母不变"),
        ("5/6 − 5/6 = ?", ["0", "1", "5/6"], 0, "相等相减得 0"),
    ], "同分母:分母不变,分子加减")


def div_estimate_set():
    return _mcs("div_estimate", "除法估算", "concept", [
        ("243 ÷ 5 大约是多少?", ["约 50", "约 40", "约 60"], 0, "250 ÷ 5 = 50"),
        ("178 ÷ 3 大约是多少?", ["约 60", "约 50", "约 70"], 0, "180 ÷ 3 = 60"),
        ("321 ÷ 4 大约是多少?", ["约 80", "约 70", "约 90"], 0, "320 ÷ 4 = 80"),
        ("把 296 个苹果分给 6 人,每人大约几个?", ["约 50", "约 40", "约 60"], 0, "300 ÷ 6 = 50"),
        ("估算除法时把被除数看成什么?", ["接近的整十整百", "最大数", "0"], 0, "看成好算的整十整百"),
    ], "把被除数看成接近的、能整除的数")


def area_concept_set():
    return _mcs("area_concept", "面积的认识", "concept", [
        ("面积指的是什么?", ["物体表面或图形的大小", "一周的长度", "边的条数"], 0, "表面的大小"),
        ("数学书封面和课桌面,谁的面积大?", ["课桌面", "数学书", "一样大"], 0, "课桌面更大"),
        ("周长相等的两个图形,面积一定相等吗?", ["不一定", "一定相等", "一定不等"], 0, "不一定"),
        ("比较面积常用什么方法?", ["用单位方格去量", "用尺子量长度", "数角"], 0, "用面积单位量"),
        ("面积比的是什么?", ["面的大小", "边的长短", "角的大小"], 0, "面的大小"),
    ], "面积 = 表面或图形的大小")


def area_units_set():
    return _mcs("area_units", "面积单位", "concept", [
        ("课桌面的大小约 30 ( )?", ["平方分米", "平方厘米", "平方米"], 0, "桌面约 30 平方分米"),
        ("一个指甲盖的面积约 1 ( )?", ["平方厘米", "平方分米", "平方米"], 0, "很小,平方厘米"),
        ("教室地面的面积约 50 ( )?", ["平方米", "平方分米", "平方厘米"], 0, "大,平方米"),
        ("边长 1 厘米的正方形面积是?", ["1 平方厘米", "1 厘米", "4 平方厘米"], 0, "1×1 = 1 平方厘米"),
        ("常用的面积单位有哪些?", ["平方厘米、平方分米、平方米", "厘米、米", "克、千克"], 0, "都是'平方'单位"),
    ], "小→平方厘米,中→平方分米,大→平方米")


def month_days_set():
    return _mcs("month_days", "大小月·平闰年", "concept", [
        ("下面哪个月是 31 天(大月)?", ["1 月", "4 月", "6 月"], 0, "1、3、5、7、8、10、12 是大月"),
        ("平年 2 月有几天?", ["28", "29", "30"], 0, "平年 2 月 28 天"),
        ("闰年 2 月有几天?", ["29", "28", "30"], 0, "闰年 2 月 29 天"),
        ("4 月有几天?", ["30", "31", "28"], 0, "4 月是小月,30 天"),
        ("一年有几个月?", ["12", "10", "24"], 0, "12 个月"),
    ], "大月 31 天,小月 30 天,2 月特殊")


def hour24_set():
    return _mcs("hour24", "24时计时法", "concept", [
        ("下午 3 时用 24 时计时法是?", ["15:00", "3:00", "13:00"], 0, "下午加 12:3 + 12 = 15"),
        ("晚上 8 时是?", ["20:00", "8:00", "18:00"], 0, "8 + 12 = 20"),
        ("17:00 是下午几时?", ["5 时", "7 时", "3 时"], 0, "17 − 12 = 5"),
        ("上午 9 时用 24 时计时法是?", ["9:00", "21:00", "19:00"], 0, "上午不变"),
        ("一天有多少小时?", ["24", "12", "60"], 0, "一天 24 小时"),
    ], "下午、晚上的时刻 = 普通时刻 + 12")


def decimal_meaning_set():
    return _mcs("decimal_meaning", "小数的认识", "concept", [
        ("0.5 读作?", ["零点五", "五", "零点零五"], 0, "小数点读'点'"),
        ("一元五角写成小数是 ( ) 元?", ["1.5", "1.05", "15"], 0, "5 角 = 0.5 元"),
        ("0.7 表示十分之几?", ["十分之七", "七", "百分之七"], 0, "0.7 = 7/10"),
        ("3.6 中小数点左边的 3 表示?", ["3 个一", "3 个十分", "3 角"], 0, "整数部分 3"),
        ("把 8 角写成小数是 ( ) 元?", ["0.8", "8.0", "0.08"], 0, "8 角 = 0.8 元"),
    ], "小数点左边是整数,右边是小数部分")


def decimal_compare_set():
    return _mcs("decimal_compare", "小数比大小", "concept", [
        ("0.8 和 0.5 哪个大?", ["0.8", "0.5", "一样大"], 0, "先比小数点后第一位"),
        ("1.2 和 0.9 哪个大?", ["1.2", "0.9", "一样大"], 0, "先比整数部分"),
        ("0.3 和 0.30 哪个大?", ["一样大", "0.3", "0.30"], 0, "末尾添 0 大小不变"),
        ("2.5 元 和 2.8 元,谁多?", ["2.8 元", "2.5 元", "一样"], 0, "8 > 5"),
        ("比较小数先比哪部分?", ["整数部分", "小数部分", "末位"], 0, "先整数,再依次小数位"),
    ], "先比整数部分,再依次比小数位")


def decimal_add_sub_set():
    return _mcs("decimal_add_sub", "简单小数加减", "concept", [
        ("0.3 + 0.4 = ?", ["0.7", "0.07", "7"], 0, "小数点对齐相加"),
        ("0.9 − 0.5 = ?", ["0.4", "0.04", "4"], 0, "相减得 0.4"),
        ("1.2 + 0.5 = ?", ["1.7", "1.07", "17"], 0, "1.2 + 0.5 = 1.7"),
        ("2.5 − 1.5 = ?", ["1", "1.0", "0"], 0, "得 1"),
        ("小数加减要把什么对齐?", ["小数点", "末尾", "第一位"], 0, "小数点对齐"),
    ], "小数点对齐再加减")


def directions_set():
    return _mcs("directions", "东南西北", "concept", [
        ("早晨太阳从哪个方向升起?", ["东", "西", "南"], 0, "日出东方"),
        ("面向北方,右手边是哪个方向?", ["东", "西", "南"], 0, "上北下南左西右东"),
        ("傍晚太阳从哪个方向落下?", ["西", "东", "北"], 0, "日落西方"),
        ("地图上通常上面是哪个方向?", ["北", "南", "东"], 0, "上北下南"),
        ("面向南,后面是哪个方向?", ["北", "东", "西"], 0, "南的对面是北"),
    ], "上北下南、左西右东")


# ============ P2-D: 推理 / 数据(logic / data)============

def sets_set():
    return _mcs("sets", "集合(重叠问题)", "logic", [
        ("跳绳 8 人,跳远 6 人,两项都参加 2 人,一共多少人?", ["12", "14", "16"], 0, "8 + 6 − 2 = 12"),
        ("画画 10 人,唱歌 7 人,都参加 3 人,一共多少人?", ["14", "17", "13"], 0, "10 + 7 − 3 = 14"),
        ("重叠的部分在算总数时要怎么样?", ["只算一次", "算两次", "不算"], 0, "重复的只数一次"),
        ("甲组 9 人,乙组 5 人,都在的 4 人,一共多少人?", ["10", "14", "9"], 0, "9 + 5 − 4 = 10"),
        ("两个圈重叠的中间部分表示什么?", ["两项都参加", "只参加一项", "都不参加"], 0, "中间 = 两项都有"),
    ], "总数 = 甲 + 乙 − 重叠部分")


def route_map_set():
    return _mcs("route_map", "简单路线图", "logic", [
        ("从学校向东走到书店,原路返回要向哪走?", ["西", "东", "北"], 0, "返回走相反方向"),
        ("小明向北走到公园,再向南走,会回到?", ["出发点附近", "更北", "东边"], 0, "南北相反"),
        ("地图上从家到学校先向东再向北,从学校回家应该?", ["先向南再向西", "先向北再向东", "向东"], 0, "倒过来走相反方向"),
        ("向西走的相反方向是?", ["东", "南", "北"], 0, "西的反方向是东"),
        ("看路线图要先确定什么?", ["方向(东南西北)", "颜色", "大小"], 0, "先看方向"),
    ], "返回走相反方向,顺序也要倒过来")


def date_calc_set():
    return _mcs("date_calc", "年月日计算", "logic", [
        ("今天是 3 月 31 日,明天是几月几日?", ["4 月 1 日", "3 月 32 日", "4 月 31 日"], 0, "3 月 31 天,下一天进入 4 月"),
        ("一年有 365 天,这一年是?", ["平年", "闰年", "无法确定"], 0, "365 天是平年"),
        ("从 6 月 1 日到 6 月 10 日,经过了几天?", ["9", "10", "11"], 0, "10 − 1 = 9 天"),
        ("一个星期有几天?", ["7", "5", "10"], 0, "7 天"),
        ("4 月 30 日的后一天是?", ["5 月 1 日", "4 月 31 日", "5 月 30 日"], 0, "4 月只有 30 天"),
    ], "注意每月天数:大月 31、小月 30、2 月特殊")


def combination_set():
    return _mcs("combination", "搭配(组合)", "logic", [
        ("2 件上衣和 3 条裤子,有几种搭配?", ["6", "5", "9"], 0, "2 × 3 = 6"),
        ("3 种饭和 2 种汤,有几种搭配?", ["6", "5", "9"], 0, "3 × 2 = 6"),
        ("用 1、2 两个数字组成两位数(数字不重复),能组几个?", ["2", "4", "1"], 0, "12、21,共 2 个"),
        ("求搭配的种数,通常用什么运算?", ["乘法", "加法", "减法"], 0, "一类 × 另一类"),
        ("4 顶帽子配 2 条围巾,有几种搭配?", ["8", "6", "4"], 0, "4 × 2 = 8"),
    ], "搭配种数 = 一类的数 × 另一类的数")


def read_table_set():
    t = "三年级各班人数\n班级  男生 女生\n一班   22   20\n二班   21   23"
    return _mcs("read_table", "读复式统计表", "data", [
        (t + "\n一班一共多少人?", ["42", "43", "44"], 0, "22 + 20 = 42"),
        (t + "\n二班一共多少人?", ["44", "43", "42"], 0, "21 + 23 = 44"),
        (t + "\n两个班男生一共多少人?", ["43", "42", "44"], 0, "22 + 21 = 43"),
        (t + "\n哪个班人数更多?", ["二班", "一班", "一样多"], 0, "44 > 42"),
        ("复式统计表比单式统计表的好处是?", ["能同时比较几组数据", "更好看", "更短"], 0, "便于对比多组数据"),
    ], "横着看、竖着看,先找对应的行和列")


def build():
    return {
        "version": "1.0.0",
        "sets": [
            # P0b procedure
            add_set(), sub_set(), mul_nocarry_set(), mul_carry_set(), div_set(), div_remainder_set(),
            mul1_zero_set(), mul2_column_set(), add_sub_check_set(),
            # P1 formula
            perimeter_set(), area_set(), times_word_set(), time_elapsed_set(),
            # P2 口算/换算
            time_conversion_set(), length_conversion_set(), mass_conversion_set(),
            area_conversion_set(), div_oral_set(), mul2_oral_set(),
            # P2 concept
            read_clock_set(), add_sub_estimate_set(), length_units_set(), mass_units_set(),
            times_concept_set(), quad_props_set(), perimeter_concept_set(),
            fraction_meaning_set(), fraction_compare_set(), fraction_add_sub_set(),
            div_estimate_set(), area_concept_set(), area_units_set(),
            month_days_set(), hour24_set(),
            decimal_meaning_set(), decimal_compare_set(), decimal_add_sub_set(),
            directions_set(),
            # P2 logic / data
            sets_set(), route_map_set(), date_calc_set(), combination_set(), read_table_set(),
        ],
    }


def main():
    pack = build()
    out = os.path.join(os.path.dirname(__file__), "grade3_practice_pack.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(pack, f, ensure_ascii=False, indent=2)
        f.write("\n")
    n = sum(len(s["problems"]) for s in pack["sets"])
    print(f"wrote {out}")
    print(f"  sets={len(pack['sets'])}  problems={n}")
    for s in pack["sets"]:
        print(f"  - {s['id']:14s} {s['title']}  ({len(s['problems'])})")


if __name__ == "__main__":
    main()
