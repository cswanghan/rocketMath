#!/usr/bin/env python3
"""Grade-7 content generator (人教版七年级数学).

Produces THREE JSON files in one run:
  grade7_math_fluency_pack.json
  grade7_practice_pack.json
  grade7_knowledge_map.json

    python3 content/build_grade7.py

Never hand-edit the JSON — edit this file and re-run.
"""
import json
import os
import string

CONTENT_DIR = os.path.dirname(os.path.abspath(__file__))
LEVEL_LETTERS = list(string.ascii_uppercase)

B, C, X = "basic", "consolidate", "challenge"


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1 — FLUENCY PACK
# ═══════════════════════════════════════════════════════════════════════════

# ---------------------------------------------------------------------------
# Track 1: rational_add_sub  有理数加减法 → 整数结果
# All answers must be integers; operands include negatives.
# ---------------------------------------------------------------------------
# Level A: 正负数加法(结果为整数,绝对值10以内)
RAT_ADD_A = [
    # (a, b, ans)  a + b = ans
    (-3,  5,  2),   # -3 + 5 = 2
    ( 4, -6, -2),   #  4 + (-6) = -2
    (-7,  7,  0),   # -7 + 7 = 0
    ( 8, -3,  5),   #  8 + (-3) = 5
]
# Level B: 负负加法,绝对值10~20
RAT_ADD_B = [
    (-4,  -6, -10),  # -4 + (-6) = -10
    (-9,  13,   4),  # -9 + 13 = 4
    (15,  -8,   7),  # 15 + (-8) = 7
    (-12,  5,  -7),  # -12 + 5 = -7
]
# Level C: 减法 (a - b = a + (-b))
RAT_ADD_C = [
    # (a, b, ans)  a - b = ans
    ( 3, -5,   8),   # 3 - (-5) = 8
    (-6,  4, -10),   # -6 - 4 = -10
    ( 0, -8,   8),   # 0 - (-8) = 8
    (-5, -3,  -2),   # -5 - (-3) = -2
]
# Level D: 混合(连加减,三个数,整数结果)
RAT_ADD_D = [
    # (a, b, c, ans)  a + b + c = ans
    ( 3, -7,  4,  0),   # 3 + (-7) + 4 = 0
    (-2,  6, -4,  0),   # -2 + 6 + (-4) = 0
    ( 5, -9,  6,  2),   # 5 + (-9) + 6 = 2
    (-8,  3, -1, -6),   # -8 + 3 + (-1) = -6
]

RAT_ADD_LEVELS_AB = [RAT_ADD_A, RAT_ADD_B]
RAT_ADD_LEVELS_C = [RAT_ADD_C]
RAT_ADD_LEVELS_D = [RAT_ADD_D]


def _rat_add_fact_ab(a, b, ans, lvl_idx):
    """有理数加法 fluency fact (2 operands)."""
    assert a + b == ans, f"CHECK FAIL: {a} + {b} should be {a+b}, got {ans}"
    fid = f"rat_add_{lvl_idx}_{a}p{b}".replace("-", "n")
    if b >= 0:
        prompt = f"({a}) + {b} = ?"
    else:
        prompt = f"({a}) + ({b}) = ?"
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}


def _rat_sub_fact(a, b, ans, lvl_idx):
    """有理数减法 fluency fact."""
    assert a - b == ans, f"CHECK FAIL: {a} - ({b}) should be {a-b}, got {ans}"
    fid = f"rat_sub_{lvl_idx}_{a}m{b}".replace("-", "n")
    if b >= 0:
        prompt = f"({a}) - {b} = ?"
    else:
        prompt = f"({a}) - ({b}) = ?"
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}


def _rat_add3_fact(a, b, c, ans, lvl_idx):
    """三数连加 fluency fact."""
    assert a + b + c == ans, f"CHECK FAIL: {a}+{b}+{c} should be {a+b+c}, got {ans}"
    fid = f"rat_add3_{lvl_idx}_{a}_{b}_{c}".replace("-", "n")
    parts = [f"({x})" if x < 0 else str(x) for x in [a, b, c]]
    prompt = f"{parts[0]} + {parts[1]} + {parts[2]} = ?"
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}


def build_rat_add_levels():
    levels = []
    for i, specs in enumerate(RAT_ADD_LEVELS_AB):
        facts = [_rat_add_fact_ab(a, b, ans, i) for (a, b, ans) in specs]
        levels.append({"level": LEVEL_LETTERS[i], "new_facts": facts})
    # Level C: subtraction
    for specs in RAT_ADD_LEVELS_C:
        facts = [_rat_sub_fact(a, b, ans, 2) for (a, b, ans) in specs]
        levels.append({"level": LEVEL_LETTERS[2], "new_facts": facts})
    # Level D: triple add
    for specs in RAT_ADD_LEVELS_D:
        facts = [_rat_add3_fact(a, b, c, ans, 3) for (a, b, c, ans) in specs]
        levels.append({"level": LEVEL_LETTERS[3], "new_facts": facts})
    return levels


# ---------------------------------------------------------------------------
# Track 2: rational_mul_div  有理数乘除法 → 整数结果
# ---------------------------------------------------------------------------
RAT_MUL_A = [
    # (a, b, ans)  a * b = ans
    (-3,  4, -12),   # (-3) × 4 = -12
    ( 5, -2, -10),   # 5 × (-2) = -10
    (-6, -3,  18),   # (-6) × (-3) = 18
    ( 7, -3, -21),   # 7 × (-3) = -21
]
RAT_MUL_B = [
    (-8,  5, -40),   # (-8) × 5 = -40
    (-4, -9,  36),   # (-4) × (-9) = 36
    ( 3, -7, -21),   # 3 × (-7) = -21
    (-6,  6, -36),   # (-6) × 6 = -36
]
RAT_DIV_C = [
    # (a, b, ans)  a ÷ b = ans (integer)
    (-12,  4,  -3),  # -12 ÷ 4 = -3
    ( 20, -5,  -4),  # 20 ÷ (-5) = -4
    (-18, -6,   3),  # -18 ÷ (-6) = 3
    ( 36, -9,  -4),  # 36 ÷ (-9) = -4
]
RAT_DIV_D = [
    (-48,  8,  -6),  # -48 ÷ 8 = -6
    (-35, -7,   5),  # -35 ÷ (-7) = 5
    ( 42, -6,  -7),  # 42 ÷ (-6) = -7
    (-56, -8,   7),  # -56 ÷ (-8) = 7
]

RAT_MUL_LEVELS = [RAT_MUL_A, RAT_MUL_B]
RAT_DIV_LEVELS = [RAT_DIV_C, RAT_DIV_D]


def _rat_mul_fact(a, b, ans, lvl_idx):
    assert a * b == ans, f"CHECK FAIL: {a}×{b} should be {a*b}, got {ans}"
    fid = f"rat_mul_{lvl_idx}_{a}x{b}".replace("-", "n")
    pa = f"({a})" if a < 0 else str(a)
    pb = f"({b})" if b < 0 else str(b)
    prompt = f"{pa} × {pb} = ?"
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}


def _rat_div_fact(a, b, ans, lvl_idx):
    assert b != 0 and a // b == ans and a % b == 0, (
        f"CHECK FAIL: {a}÷{b} should be {a//b}, got {ans}"
    )
    fid = f"rat_div_{lvl_idx}_{a}d{b}".replace("-", "n")
    pa = f"({a})" if a < 0 else str(a)
    pb = f"({b})" if b < 0 else str(b)
    prompt = f"{pa} ÷ {pb} = ?"
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}


def build_rat_mul_levels():
    levels = []
    for i, specs in enumerate(RAT_MUL_LEVELS):
        facts = [_rat_mul_fact(a, b, ans, i) for (a, b, ans) in specs]
        levels.append({"level": LEVEL_LETTERS[i], "new_facts": facts})
    for i, specs in enumerate(RAT_DIV_LEVELS):
        facts = [_rat_div_fact(a, b, ans, i + 2) for (a, b, ans) in specs]
        levels.append({"level": LEVEL_LETTERS[i + 2], "new_facts": facts})
    return levels


# ---------------------------------------------------------------------------
# Track 3: rational_power  有理数乘方 → 整数结果
# ---------------------------------------------------------------------------
RAT_POW_A = [
    # (base, exp, ans)
    (-2, 2,   4),   # (-2)² = 4
    (-3, 2,   9),   # (-3)² = 9
    (-2, 3,  -8),   # (-2)³ = -8
    (-1, 5,  -1),   # (-1)⁵ = -1
]
RAT_POW_B = [
    (-4, 2,  16),   # (-4)² = 16
    (-5, 2,  25),   # (-5)² = 25
    (-2, 4,  16),   # (-2)⁴ = 16
    (-3, 3, -27),   # (-3)³ = -27
]
RAT_POW_C = [
    (-1, 100,   1),   # (-1)^100 = 1 (偶数次方)
    (-1, 101,  -1),   # (-1)^101 = -1 (奇数次方)
    (-2,  5, -32),   # (-2)⁵ = -32
    ( 3,  4,  81),   # 3⁴ = 81
]
RAT_POW_D = [
    (-5, 3, -125),   # (-5)³ = -125
    ( 2,  7, 128),   # 2⁷ = 128
    (-4, 3,  -64),   # (-4)³ = -64
    ( 4,  4, 256),   # 4⁴ = 256
]

RAT_POW_LEVELS = [RAT_POW_A, RAT_POW_B, RAT_POW_C, RAT_POW_D]


def _rat_pow_fact(base, exp, ans, lvl_idx):
    computed = base ** exp
    assert computed == ans, f"CHECK FAIL: ({base})^{exp} should be {computed}, got {ans}"
    fid = f"rat_pow_{lvl_idx}_{base}e{exp}".replace("-", "n")
    if base < 0:
        prompt = f"({base})^{exp} = ?"
    else:
        prompt = f"{base}^{exp} = ?"
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "fact_recall"}


def build_rat_pow_levels():
    levels = []
    for i, specs in enumerate(RAT_POW_LEVELS):
        facts = [_rat_pow_fact(b, e, a, i) for (b, e, a) in specs]
        levels.append({"level": LEVEL_LETTERS[i], "new_facts": facts})
    return levels


# ---------------------------------------------------------------------------
# Track 4: monomial_eval  单项式代值口算 → 整数结果
# Prompt: 当 x=? 时, expr = ?
# All results are integers.
# ---------------------------------------------------------------------------
MONO_EVAL_A = [
    # (display_str, py_expr, x_val, ans)
    ("2x",      "2*x",       3,   6),    # 2×3=6
    ("3x",      "3*x",      -2,  -6),    # 3×(-2)=-6
    ("5x",      "5*x",       4,  20),    # 5×4=20
    ("-4x",     "-4*x",      3, -12),    # -4×3=-12
]
MONO_EVAL_B = [
    ("x²",      "x**2",      3,   9),   # 3²=9
    ("x²",      "x**2",     -4,  16),   # (-4)²=16
    ("-x²",     "-(x**2)",   2,  -4),   # -(2²)=-4
    ("2x²",     "2*(x**2)", -3,  18),   # 2×(-3)²=18
]
MONO_EVAL_C = [
    ("3x²",     "3*(x**2)",  -2,  12),   # 3×(-2)²=3×4=12
    ("-2x³",    "-2*(x**3)", 2, -16),   # -2×2³=-16
    ("4x²",     "4*(x**2)",  3,  36),   # 4×9=36
    ("x³",      "x**3",     -3, -27),   # (-3)³=-27
]
MONO_EVAL_D = [
    ("5x²",     "5*(x**2)",       -2,  20),   # 5×4=20
    ("-3x³",    "-3*(x**3)",       2, -24),   # -3×8=-24
    ("2x²+x",   "2*(x**2)+x",     3,  21),   # 2×9+3=21
    ("x²-2x",   "x**2-2*x",      -1,   3),   # 1-(-2)=3
]

MONO_EVAL_LEVELS = [MONO_EVAL_A, MONO_EVAL_B, MONO_EVAL_C, MONO_EVAL_D]


def _verify_mono(py_expr, x_val, ans):
    x = x_val
    computed = eval(py_expr)
    assert computed == ans, f"CHECK FAIL: {py_expr} at x={x_val} should be {computed}, got {ans}"


def _mono_fact(display_str, py_expr, x_val, ans, lvl_idx):
    _verify_mono(py_expr, x_val, ans)
    safe = display_str.replace(" ", "").replace("-", "n").replace("+", "p")
    fid = f"mono_eval_{lvl_idx}_{safe}_x{x_val}".replace("-", "n")
    prompt = f"当 x = {x_val} 时，{display_str} = ?"
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}


def build_mono_eval_levels():
    levels = []
    for i, specs in enumerate(MONO_EVAL_LEVELS):
        facts = [_mono_fact(disp, py, x, a, i) for (disp, py, x, a) in specs]
        levels.append({"level": LEVEL_LETTERS[i], "new_facts": facts})
    return levels


# ---------------------------------------------------------------------------
# engine_config (identical contract to grade 6)
# ---------------------------------------------------------------------------
def _engine_config():
    return {
        "latency_gate_seconds": 3,
        "mastery": {
            "take_off": {"consecutive_correct_within_gate": 12},
            "orbit": {"window_attempts": 30, "max_errors": 2},
            "universe": {"window_attempts": 30, "max_errors": 2},
        },
        "correction_loop": {
            "trigger_on": ["wrong_answer", "timeout"],
            "immediate_reteach": True,
            "immediate_retest": True,
        },
        "interleave_rules": {
            "take_off_pool": "current_level.new_facts",
            "orbit_pool": "current_level.new_facts ∪ previous_level.new_facts",
            "universe_pool": "union(A..current_level).new_facts",
            "recent_miss_weight": 3,
        },
        "milestone_races": {
            "duration_seconds": 120,
            "speeds": [
                {"id": "relaxed",   "label": "轻松", "emoji": "🐢", "seconds": 180},
                {"id": "standard",  "label": "标准", "emoji": "🚀", "seconds": 120},
                {"id": "challenge", "label": "挑战", "emoji": "⚡", "seconds": 60},
            ],
            "positions_percent": [25, 50, 75, 100],
        },
        "individualized_goal": {
            "probe_problem_count": 10,
            "latency_multiplier": 2.5,
            "min_gate_seconds": 2.0,
            "max_gate_seconds": 6.0,
        },
        "time_lock": {
            "enabled": True,
            "play_minutes": 15,
            "break_minutes": 20,
        },
    }


def build_fluency_pack():
    tracks = [
        {
            "trackId": "rational_add_sub",
            "name": "有理数加减法口算",
            "enabled": True,
            "levels": build_rat_add_levels(),
        },
        {
            "trackId": "rational_mul_div",
            "name": "有理数乘除法口算",
            "enabled": True,
            "levels": build_rat_mul_levels(),
        },
        {
            "trackId": "rational_power",
            "name": "有理数乘方口算",
            "enabled": True,
            "levels": build_rat_pow_levels(),
        },
        {
            "trackId": "monomial_eval",
            "name": "单项式代值口算",
            "enabled": True,
            "levels": build_mono_eval_levels(),
        },
    ]

    non_drill_topics = [
        "rational_number_concept",
        "number_line",
        "absolute_value",
        "rational_mixed_ops",
        "polynomial_add_sub",
        "linear_equation_one",
        "linear_equation_app",
        "geometry_intro",
        "parallel_lines",
        "real_number_sqrt",
        "coordinate_plane",
        "equation_system",
        "inequality_group",
        "data_statistics",
    ]

    return {
        "version": "1.0.0",
        "grade": 7,
        "subject": "math_fluency",
        "engine_config": _engine_config(),
        "tracks": tracks,
        "non_drill_topics": non_drill_topics,
    }


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2 — PRACTICE PACK
# ═══════════════════════════════════════════════════════════════════════════

def P_fill(pid, prompt, answer, hint, expl, diff=C):
    return {"id": pid, "type": "fill", "prompt": prompt, "difficulty": diff,
            "answer": answer, "hint": hint, "explanation": expl}


def P_mc(pid, prompt, opts, ci, hint, expl, diff=C):
    choices = [{"id": chr(97 + i), "label": str(lb), "correct": i == ci}
               for i, lb in enumerate(opts)]
    return {"id": pid, "type": "mc", "prompt": prompt, "difficulty": diff,
            "choices": choices, "hint": hint, "explanation": expl}


def P_steps(pid, prompt, fields, hint, expl, diff=C):
    # 每个步骤字段必须有唯一 id,否则前端多个输入框会共用同一个 key 而联动
    for i, f in enumerate(fields):
        f.setdefault("id", f"{pid}_f{i+1}")
    return {"id": pid, "type": "steps", "prompt": prompt, "difficulty": diff,
            "fields": fields, "hint": hint, "explanation": expl}


def make_set(setid, title, pedagogy, problems, max_tries=2):
    return {"id": setid, "title": title, "pedagogy": pedagogy,
            "maxTries": max_tries, "problems": problems}


# ── 上册 U1: 有理数 ────────────────────────────────────────────────────────

def rational_number_concept():
    """有理数的概念 — concept."""
    probs = [
        P_mc("rnc_b0",
             "下列各数中，哪些是负数？\n−3,  0,  +5,  −0.5,  7",
             ["−3 和 −0.5", "−3、0 和 −0.5", "只有 −3"],
             0, "负号且不为0", "−3 和 −0.5 是负数", B),
        P_mc("rnc_b1",
             "有理数包括哪几类?",
             ["整数和分数", "正数和负数", "自然数和整数"],
             0, "有理数=整数+分数(含小数)", "有理数包括整数和分数(有限小数/循环小数)", B),
        P_mc("rnc_c0",
             "0 是正数还是负数?",
             ["既不是正数也不是负数", "正数", "负数"],
             0, "0 是整数但不是正负数", "0 既不是正数也不是负数，是非负整数", C),
        P_mc("rnc_c1",
             "−5 的相反数是?",
             ["5", "−5", "1/5"],
             0, "相反数符号相反", "−5 的相反数是 5", C),
        P_mc("rnc_x0",
             "下列说法正确的是?",
             ["有理数包括整数和分数", "所有小数都是无理数", "负数都比0小，0比正数大"],
             0, "有理数定义", "有理数 = 整数 + 分数（有限/循环小数）", X),
        P_fill("rnc_x1",
               "写出比 −2 大、比 3 小的所有整数，共几个?",
               4, "−1, 0, 1, 2 共4个", "−1, 0, 1, 2 四个整数", X),
        # ── NEW ──
        P_mc("rnc_b2",
             "下列数中，哪个是正整数?",
             ["7", "−3", "0"],
             0, "正整数大于0且无小数部分", "7 是正整数", B),
        P_mc("rnc_b3",
             "−4 是哪种类型的有理数?",
             ["负整数", "负分数", "整数但非负"],
             0, "−4 没有小数部分，是整数，且为负", "−4 是负整数", B),
        P_mc("rnc_c2",
             "下列数中，哪个既是整数又是有理数?",
             ["−9", "√2", "π"],
             0, "√2和π是无理数，−9是整数也是有理数", "−9 既是整数又是有理数", C),
        P_mc("rnc_c3",
             "a 的相反数是 −a，若 a = −6，则 −a = ?",
             ["6", "−6", "36"],
             0, "−(−6) = 6", "−a = −(−6) = 6", C),
        P_fill("rnc_c4",
               "比 −5 大 1 的数是?",
               -4, "−5 + 1 = −4", "−5 + 1 = −4", C),
        P_mc("rnc_x2",
             "自然数和正整数的关系是?",
             ["自然数包含0和正整数", "正整数包含自然数", "两者完全相同"],
             0, "自然数 = {0, 1, 2, 3, ...}", "自然数包括 0 和全体正整数", X),
        P_fill("rnc_x3",
               "写出比 −3 大但比 2 小的所有非零整数，共几个?",
               3, "−2, −1, 1 共3个（排除0）", "非零整数: −2, −1, 1，共 3 个", X),
        P_mc("rnc_x4",
             "下列哪组数都是有理数?",
             ["−3, 0, 2/5", "√2, 1, 0", "π, −1, 3"],
             0, "√2和π是无理数", "−3, 0, 2/5 都是有理数", X),
        # ── BATCH 2 ──
        P_mc("rnc_e1",
             "−0.75 属于哪一类有理数?",
             ["负分数", "负整数", "非负数"],
             0, "−0.75 是有限小数，即负分数", "−0.75 是负分数（有限小数）", B),
        P_fill("rnc_e2",
               "8 的相反数是?",
               -8, "相反数符号相反", "8 的相反数是 −8", B),
        P_mc("rnc_e3",
             "下列数中，哪个是非负整数?",
             ["0", "−1", "0.5"],
             0, "非负整数包括 0 和正整数", "0 是非负整数", C),
        P_fill("rnc_e4",
               "比 −4 小 3 的数是?",
               -4 - 3, "−4 减去 3", "−4 − 3 = −7", C),
        P_mc("rnc_e5",
             "写出所有满足 −3 ≤ x ≤ 2 的整数，共几个?",
             ["6 个", "5 个", "4 个"],
             0, "−3,−2,−1,0,1,2 共6个", "−3, −2, −1, 0, 1, 2，共 6 个", X),
    ]
    return make_set("rational_number_concept", "有理数的概念", "concept", probs)


def number_line():
    """数轴与有理数 — concept."""
    probs = [
        P_mc("nl_b0",
             "数轴的三要素是?",
             ["原点、正方向、单位长度", "原点、x轴、y轴", "正负方向、刻度"],
             0, "数轴三要素缺一不可", "原点、正方向、单位长度", B),
        P_mc("nl_b1",
             "在数轴上，−3 在 0 的哪侧?",
             ["左侧", "右侧", "原点上"],
             0, "负数在数轴原点左边", "−3 在 0 的左侧", B),
        P_fill("nl_c0",
               "数轴上，A 点坐标是 −4，B 点坐标是 2，\nAB 两点之间的距离是多少?",
               6, "距离 = |2 − (−4)| = |6| = 6", "2 − (−4) = 6，距离为 6", C),
        P_mc("nl_c1",
             "数轴上距原点 3 个单位的点有几个?",
             ["2 个", "1 个", "3 个"],
             0, "−3 和 3 都距原点3个单位", "−3 和 3，共 2 个点", C),
        P_mc("nl_x0",
             "在数轴上，互为相反数的两个点关于__对称。",
             ["原点", "x轴", "y轴"],
             0, "相反数在原点两侧等距", "关于原点对称", X),
        P_fill("nl_x1",
               "数轴上 A(−5) 和 B(3)，C 是 AB 的中点，C 的坐标是?",
               -1, "中点 = (−5+3)/2 = −1", "(−5 + 3) ÷ 2 = −1", X),
        # ── NEW ──
        P_mc("nl_b2",
             "在数轴上，正数在原点的哪侧?",
             ["右侧", "左侧", "原点上"],
             0, "正数在原点右边", "正数在原点右侧", B),
        P_fill("nl_b3",
               "数轴上，坐标为 5 的点距原点多少个单位?",
               5, "距离 = |5| = 5", "|5| = 5 个单位", B),
        P_mc("nl_c2",
             "数轴上，从 −2 向左移动 4 个单位到达哪点?",
             ["−6", "2", "−4"],
             0, "向左减，−2 − 4 = −6", "−2 − 4 = −6", C),
        P_fill("nl_c3",
               "数轴上 P(−7) 和 Q(1)，PQ 两点距离是?",
               8, "|1 − (−7)| = |8| = 8", "1 − (−7) = 8，距离为 8", C),
        P_mc("nl_c4",
             "数轴上 A(−3), B(5)，AB 中点坐标是?",
             ["1", "−1", "2"],
             0, "中点 = (−3+5)/2 = 1", "(−3 + 5) ÷ 2 = 1", C),
        P_fill("nl_x2",
               "数轴上与 −2 距离为 5 的点，其中较大的坐标是?",
               3, "−2+5=3 或 −2−5=−7，较大为3", "−2 + 5 = 3", X),
        P_mc("nl_x3",
             "数轴上 A(−4), B(6)，AB 中点 M 的坐标是?",
             ["1", "2", "−1"],
             0, "中点 = (−4+6)/2 = 1", "(−4 + 6) ÷ 2 = 1", X),
        P_fill("nl_x4",
               "已知数轴上 A(a) 和 B(−a)，若 AB 距离为 10，则 a = ?（取正值）",
               5, "距离=|a−(−a)|=|2a|=10，a=5", "|2a| = 10，a = 5（取正值）", X),
        # ── BATCH 2 ──
        P_mc("nl_e1",
             "数轴上，整数 −2, −1, 0, 1, 2 中，哪个最靠近原点右边?",
             ["1", "0", "2"],
             0, "原点右边第一个整数是 1", "1 是离原点最近的正整数", B),
        P_fill("nl_e2",
               "数轴上 P(6) 和 Q(−2)，PQ 距离是?",
               abs(6 - (-2)), "距离=|6−(−2)|=8", f"|6−(−2)| = {abs(6-(-2))}", B),
        P_mc("nl_e3",
             "数轴上从 −3 向右移动 7 格，到达哪点?",
             ["4", "−10", "3"],
             0, "−3 + 7 = 4", "−3 + 7 = 4", C),
        P_fill("nl_e4",
               "数轴上 A(−6) 和 B(4)，AB 中点坐标是?",
               (-6 + 4) // 2, "中点 = (−6+4)/2 = −1", f"(−6+4) ÷ 2 = {(-6+4)//2}", C),
        P_mc("nl_e5",
             "数轴上距 2 的距离为 4 的两点坐标是?",
             ["−2 和 6", "−4 和 4", "0 和 6"],
             0, "2−4=−2, 2+4=6", "2 − 4 = −2 和 2 + 4 = 6", X),
    ]
    return make_set("number_line", "数轴与有理数", "concept", probs)


def absolute_value():
    """绝对值 — concept."""
    probs = [
        P_mc("av_b0",
             "|−7| = ?",
             ["7", "−7", "0"],
             0, "绝对值 = 距离原点的距离，非负", "|−7| = 7", B),
        P_fill("av_b1",
               "|0| = ?",
               0, "原点到原点距离为 0", "|0| = 0", B),
        P_fill("av_c0",
               "若 |x| = 5，则 x = ?（填较大的那个）",
               5, "x = 5 或 x = −5", "x = 5 或 x = −5，较大的是 5", C),
        P_mc("av_c1",
             "比较 |−8| 与 |5| 的大小?",
             ["|−8| > |5|", "|−8| < |5|", "|−8| = |5|"],
             0, "8 > 5", "|−8| = 8 > 5 = |5|", C),
        P_mc("av_x0",
             "若 a < 0，则 |a| = ?",
             ["−a", "a", "0"],
             0, "负数的绝对值 = 它的相反数", "a < 0 时，|a| = −a", X),
        P_fill("av_x1",
               "|−3| + |2| − |−1| = ?",
               4, "3 + 2 − 1 = 4", "3 + 2 − 1 = 4", X),
        # ── NEW ──
        P_fill("av_b2",
               "|−12| = ?",
               12, "负数的绝对值等于它的相反数", "|−12| = 12", B),
        P_mc("av_b3",
             "下列说法正确的是?",
             ["绝对值一定是非负数", "绝对值一定是正数", "0 没有绝对值"],
             0, "|0|=0, 绝对值≥0", "绝对值是非负数（|0|=0）", B),
        P_fill("av_c2",
               "若 |x| = 9，则 x = ?（填较小的那个）",
               -9, "x = 9 或 x = −9，较小为 −9", "x = −9 或 x = 9，较小的是 −9", C),
        P_mc("av_c3",
             "|−6| − |−2| = ?",
             ["4", "8", "−4"],
             0, "6 − 2 = 4", "|−6| − |−2| = 6 − 2 = 4", C),
        # Parametrically verify: |(-5)|+|3| = 5+3 = 8
        P_fill("av_c4",
               "|−5| + |3| = ?",
               5 + 3, "5 + 3 = 8", "|−5| + |3| = 5 + 3 = 8", C),
        P_mc("av_x2",
             "若 a > 0，则 |a| = ?",
             ["a", "−a", "0"],
             0, "正数的绝对值就是它本身", "a > 0 时，|a| = a", X),
        P_fill("av_x3",
               "2|−4| − 3|−1| = ?",
               2*4 - 3*1, "2×4 − 3×1 = 8 − 3 = 5", "2×4 − 3×1 = 8 − 3 = 5", X),
        P_mc("av_x4",
             "满足 |x| < 3 的整数共有几个?",
             ["5 个", "4 个", "6 个"],
             0, "x=−2,−1,0,1,2 共5个", "x ∈ {−2, −1, 0, 1, 2}，共 5 个", X),
        # ── BATCH 2 ──
        P_fill("av_e1",
               "|−15| = ?",
               15, "负数绝对值取相反数", "|−15| = 15", B),
        P_mc("av_e2",
             "以下哪个数的绝对值最大?",
             ["−9", "7", "−5"],
             0, "|−9|=9, |7|=7, |−5|=5, 9最大", "|−9| = 9 最大", C),
        P_fill("av_e3",
               "若 |x| = 7，x 的所有可能取值之和是?",
               7 + (-7), "x=7 或 x=−7，和=0", "7 + (−7) = 0", C),
        P_mc("av_e4",
             "|a + b| 与 |a| + |b| 的关系一般是?",
             ["|a+b| ≤ |a|+|b|", "|a+b| ≥ |a|+|b|", "|a+b| = |a|+|b|"],
             0, "三角不等式，等号成立当同号时", "|a+b| ≤ |a| + |b|（三角不等式）", X),
        P_fill("av_e5",
               "3|−6| − 2|4| = ?",
               3*6 - 2*4, "3×6 − 2×4 = 18 − 8 = 10", f"3×6 − 2×4 = {3*6-2*4}", X),
    ]
    return make_set("absolute_value", "绝对值", "concept", probs)


def rational_mixed_ops():
    """有理数混合运算 — procedure."""
    probs = [
        P_fill("rmo_b0", "(−3) + (+5) = ?", 2,
               "异号相加，绝对值大的符号", "−3 + 5 = 2", B),
        P_fill("rmo_b1", "(−4) × (−3) = ?", 12,
               "负负得正", "负 × 负 = 正，4 × 3 = 12", B),
        P_fill("rmo_c0", "(−2)³ + (−3)² = ?", 1,
               "(−2)³=−8，(−3)²=9", "−8 + 9 = 1", C),
        P_fill("rmo_c1", "(−6) ÷ 2 + (−3) × (−2) = ?", 3,
               "先乘除后加减", "−3 + 6 = 3", C),
        P_mc("rmo_c2",
             "(−1)^2026 + (−1)^2025 = ?",
             ["0", "2", "−2"],
             0, "偶次方=1，奇次方=−1", "1 + (−1) = 0", C),
        P_fill("rmo_x0",
               "计算: 3 × (−2)² − 4 ÷ (−2) = ?",
               14, "3×4=12，−4÷(−2)=2，12+2=14", "12 + 2 = 14", X),
        P_steps("rmo_x1",
                "计算: (−3)² ÷ (−1)³ × (−4) − (−5)",
                [
                    {"label": "计算 (−3)²", "answer": "9"},
                    {"label": "计算 (−1)³", "answer": "-1"},
                    {"label": "9 ÷ (−1) × (−4)", "answer": "36"},
                    {"label": "36 − (−5)", "answer": "41"},
                ],
                "从左到右乘除，最后加减",
                "(−3)²=9，(−1)³=−1，9÷(−1)×(−4)=9×4=36，36−(−5)=41", X),
        # ── NEW ──
        P_fill("rmo_b2", "(−8) + 3 = ?", -8 + 3,
               "负加正，绝对值大的符号", "−8 + 3 = −5", B),
        P_fill("rmo_b3", "6 × (−5) = ?", 6 * (-5),
               "正乘负得负", "6 × (−5) = −30", B),
        P_fill("rmo_b4", "(−20) ÷ (−4) = ?", (-20) // (-4),
               "负负得正", "(−20) ÷ (−4) = 5", B),
        P_fill("rmo_c3",
               "计算: (−5)² − (−2)³ = ?",
               (-5)**2 - (-2)**3,
               "(−5)²=25，(−2)³=−8", "25 − (−8) = 33", C),
        P_mc("rmo_c4",
             "计算: (−3) × 4 + 20 ÷ (−5) = ?",
             [str((-3)*4 + 20//(-5)), str((-3)*4 - 20//(-5)), str(3*4 + 20//5)],
             0, "先乘除后加减，注意符号",
             f"(−3)×4=−12，20÷(−5)=−4，−12+(−4)={(-3)*4 + 20//(-5)}", C),
        P_fill("rmo_c5",
               "计算: −2 × (−3)² + (−1)⁴ = ?",
               -2 * ((-3)**2) + ((-1)**4),
               "(−3)²=9，(−1)⁴=1，−2×9+1=−17", "−2×9 + 1 = −18 + 1 = −17", C),
        P_mc("rmo_x2",
             "计算: (−2)⁴ ÷ (−4) × (−1)³ = ?",
             ["4", "−4", "−16"],
             0, "(−2)⁴=16，再除再乘",
             "16 ÷ (−4) = −4，(−4) × (−1)³ = (−4)×(−1) = 4", X),
        P_fill("rmo_x3",
               "计算: (−1)^99 + (−1)^100 + (−2)² = ?",
               ((-1)**99) + ((-1)**100) + ((-2)**2),
               "(−1)^99=−1，(−1)^100=1，(−2)²=4",
               "−1 + 1 + 4 = 4", X),
        # ── BATCH 2 ──
        # rmo_e1: (-4)+(-9) = -13
        P_fill("rmo_e1", "(−4) + (−9) = ?", (-4) + (-9),
               "同号相加，绝对值相加取负号", f"−4 + (−9) = {(-4)+(-9)}", B),
        # rmo_e2: 15 - (-7) = 22
        P_fill("rmo_e2", "15 − (−7) = ?", 15 - (-7),
               "减去负数等于加上正数", f"15 − (−7) = 15 + 7 = {15-(-7)}", B),
        # rmo_e3: (-3)^2 * (-2)^3 = 9 * (-8) = -72
        P_fill("rmo_e3", "(−3)² × (−2)³ = ?", ((-3)**2) * ((-2)**3),
               "(−3)²=9，(−2)³=−8", f"9 × (−8) = {((-3)**2)*((-2)**3)}", C),
        # rmo_e4: -4 * 3 - (-20) / 4 = -12 - (-5) = -12+5 = -7
        P_fill("rmo_e4", "(−4) × 3 − (−20) ÷ 4 = ?",
               (-4)*3 - (-20)//4,
               "先乘除: −12，−20÷4=−5，再减",
               f"−12 − (−5) = {(-4)*3 - (-20)//4}", C),
        # rmo_e5: 2^3 + (-2)^3 = 8 + (-8) = 0
        P_fill("rmo_e5", "2³ + (−2)³ = ?", 2**3 + (-2)**3,
               "2³=8，(−2)³=−8", f"8 + (−8) = {2**3+(-2)**3}", X),
    ]
    return make_set("rational_mixed_ops", "有理数混合运算", "procedure", probs)


# ── 上册 U2: 整式的加减 ────────────────────────────────────────────────────

def polynomial_concept():
    """单项式与多项式 — concept."""
    probs = [
        P_mc("pc2_b0",
             "单项式是指?",
             ["数字或字母的积", "数字与字母的和", "含加减的式子"],
             0, "单项式=数×字母的乘积(含单个数/字母)", "单项式：数与字母的积，或单独的数/字母", B),
        P_mc("pc2_b1",
             "3x²y 的系数是?",
             ["3", "2", "3y"],
             0, "数字部分是系数", "系数是 3", B),
        P_mc("pc2_c0",
             "3x²y 的次数是多少?",
             ["3", "2", "1"],
             0, "各字母指数之和", "x²y → 2+1 = 3 次", C),
        P_mc("pc2_c1",
             "2x + 3y − 1 是几次几项式?",
             ["一次三项式", "二次三项式", "一次二项式"],
             0, "最高次数=1，共三项", "一次三项式", C),
        P_mc("pc2_x0",
             "下列哪个是单项式?",
             ["−5ab²", "a + b", "x − 2"],
             0, "只有乘法/单个数/字母", "−5ab² 是单项式", X),
        P_fill("pc2_x1",
               "多项式 2x² − 3x + 1 的最高次数(度)是?",
               2, "2x² 次数最高为 2", "最高次数是 2", X),
        # ── NEW ──
        P_mc("pc2_b2",
             "下列哪个是多项式?",
             ["3x − 2", "−7xy", "5"],
             0, "多项式含加减运算，有两项或更多", "3x − 2 是多项式（二项式）", B),
        P_mc("pc2_b3",
             "单项式 −4m³ 的系数是?",
             ["−4", "3", "4"],
             0, "系数包括负号", "系数是 −4", B),
        P_mc("pc2_c2",
             "2a²b³ 的次数是多少?",
             ["5", "6", "3"],
             0, "次数 = 2 + 3 = 5", "a²b³ → 2 + 3 = 5 次", C),
        P_mc("pc2_c3",
             "多项式 3x³ − 2x + 5 是几项式?",
             ["三项式", "二项式", "单项式"],
             0, "共有3项", "含3项：3x³、−2x、5，是三项式", C),
        P_fill("pc2_c4",
               "单项式 xy²z 的次数是?",
               1 + 2 + 1, "次数 = 1+2+1 = 4", "x¹y²z¹ → 1+2+1 = 4 次", C),
        P_mc("pc2_x2",
             "多项式 5x²y − 3xy² + 2 的次数（最高次项的次数）是?",
             ["3", "2", "4"],
             0, "5x²y 次数=2+1=3，−3xy² 次数=1+2=3，最高次=3", "最高次项 5x²y 和 −3xy² 的次数都是 3", X),
        P_mc("pc2_x3",
             "下列说法正确的是?",
             ["单个数字也是单项式", "多项式至少有3项", "x+y 是单项式"],
             0, "单个数字是零次单项式", "单个数字（如 5）也是单项式", X),
        P_fill("pc2_x4",
               "多项式 x⁴ − 3x² + x − 7 共有几项?",
               4, "x⁴, −3x², x, −7 共4项", "四项：x⁴、−3x²、x、−7", X),
        # ── BATCH 2 ──
        P_mc("pc2_e1",
             "下列哪个式子是二次单项式?",
             ["3x²", "3x + 2", "x + 1"],
             0, "单项式且最高次为2", "3x² 是二次单项式", B),
        P_fill("pc2_e2",
               "单项式 −6x³ 的系数是?",
               -6, "系数包括负号", "系数是 −6", B),
        P_mc("pc2_e3",
             "多项式 x² + 2xy + y² 是几项式?",
             ["三项式", "二项式", "单项式"],
             0, "含 x²、2xy、y² 共三项", "三项式", C),
        P_fill("pc2_e4",
               "单项式 4a²b 的次数是?",
               2 + 1, "a²b → 指数之和 2+1=3", "a²b → 2+1 = 3 次", C),
        P_mc("pc2_e5",
             "多项式 3x³ − 5x + 2 的最高次数是?",
             ["3", "5", "2"],
             0, "3x³ 次数最高为 3", "最高次项是 3x³，次数为 3", X),
    ]
    return make_set("polynomial_concept", "单项式与多项式", "concept", probs)


def polynomial_add_sub():
    """整式加减(合并同类项) — procedure."""
    # Parametric helpers for combining like terms
    def _coeff_combine(a, b): return a + b
    def _sub_bracket_coeffs(a_outer, a_const, b_inner, b_const):
        # (a_outer*x + a_const) - (b_inner*x + b_const)
        return a_outer - b_inner, a_const - b_const

    probs = [
        P_fill("pas_b0",
               "合并同类项: 3x + 5x = ?x",
               _coeff_combine(3, 5), "系数相加: 3 + 5 = 8", "3x + 5x = 8x", B),
        P_fill("pas_b1",
               "合并同类项: 7y − 3y = ?y",
               _coeff_combine(7, -3), "系数相减: 7 − 3 = 4", "7y − 3y = 4y", B),
        P_mc("pas_c0",
             "3x² + 2x − x² + 4x 化简结果是?",
             ["2x² + 6x", "4x² + 6x", "2x² + 2x"],
             0, "同类项分别合并", "3x²−x²=2x²，2x+4x=6x", C),
        P_mc("pas_c1",
             "化简: (2x² − 3x + 1) + (x² + 5x − 3)，结果是？",
             ["3x²+2x−2", "3x²−2x−2", "2x²+2x−2", "3x²+2x+2"],
             0, "去括号后合并同类项",
             "2x²+x²=3x²，−3x+5x=2x，1+(−3)=−2 | 步骤: 去括号后 x² 项合并=3x²; x 项合并=2x; 常数项合并=−2; 最终结果=3x²+2x−2", C),
        P_mc("pas_x0",
             "(3a − 2b) − (a − 4b) 化简结果是?",
             ["2a + 2b", "2a − 6b", "4a − 6b"],
             0, "减法去括号变号", "3a−2b−a+4b=2a+2b", X),
        P_fill("pas_x1",
               "化简 (3x − 1) + 2(x + 3)，再代入 x = −1 求值",
               0, "先化简再代入", "3x−1+2x+6=5x+5，代入x=−1：5×(−1)+5=0", X),
        # ── NEW ──
        P_fill("pas_b2",
               "合并同类项: 9a − 4a = ?a",
               _coeff_combine(9, -4), "系数相减: 9 − 4 = 5", "9a − 4a = 5a", B),
        P_fill("pas_b3",
               "合并同类项: −3x + (−5x) = ?x",
               _coeff_combine(-3, -5), "系数相加: −3 + (−5) = −8", "−3x + (−5x) = −8x", B),
        P_mc("pas_c2",
             "化简: 4x² − 3x + x² + 7x 的结果是?",
             ["5x² + 4x", "3x² + 4x", "5x² − 10x"],
             0, "4x²+x²=5x²，−3x+7x=4x", "4x²+x²=5x²，−3x+7x=4x → 5x²+4x", C),
        P_mc("pas_c3",
             "化简: (5x − 3) − (2x + 1) 的结果是?",
             ["3x − 4", "3x − 2", "7x − 4"],
             0, "减号去括号变号: 5x−3−2x−1=3x−4",
             "5x−3−2x−1 = 3x−4", C),
        # Parametric: compute coefficients for pas_c4
        # (2x^2 - 4x + 3) + (x^2 + 2x - 5) = 3x^2 - 2x - 2
        P_mc("pas_c4",
             "化简: (2x² − 4x + 3) + (x² + 2x − 5) 的结果是?",
             ["3x² − 2x − 2", "3x² + 2x − 2", "x² − 2x − 2"],
             0, "同类项合并: 2+1=3，−4+2=−2，3+(−5)=−2",
             "2x²+x²=3x²，−4x+2x=−2x，3+(−5)=−2 → 3x²−2x−2", C),
        P_mc("pas_x2",
             "(4m − n) − (m − 3n) 化简结果是?",
             ["3m + 2n", "3m − 4n", "5m − 2n"],
             0, "去括号变号: 4m−n−m+3n=3m+2n", "4m−n−m+3n = 3m+2n", X),
        P_fill("pas_x3",
               "化简 2(x + 3) − 3(x − 1)，代入 x = 2 求值",
               2*(2+3) - 3*(2-1), "先化简: 2x+6−3x+3=−x+9，代入x=2: −2+9=7",
               "−x+9，代入x=2：−2+9=7", X),
        # ── BATCH 2 ──
        P_fill("pas_e1",
               "合并同类项: 6a − 2a = ?a",
               _coeff_combine(6, -2), "6 − 2 = 4", "6a − 2a = 4a", B),
        P_fill("pas_e2",
               "合并同类项: −x + 4x = ?x",
               _coeff_combine(-1, 4), "−1 + 4 = 3", "−x + 4x = 3x", B),
        P_mc("pas_e3",
             "化简: 2x² − 5x + 3x² + 2x 结果是?",
             ["5x² − 3x", "5x² + 3x", "x² − 3x"],
             0, "2x²+3x²=5x²，−5x+2x=−3x", "5x² − 3x", C),
        P_mc("pas_e4",
             "化简: (a + 2b) + (3a − b) 结果是?",
             ["4a + b", "4a − b", "2a + b"],
             0, "a+3a=4a，2b+(−b)=b", "a+3a=4a，2b−b=b → 4a+b", C),
        P_mc("pas_e5",
             "化简: (6x − 3) − (4x + 1) 结果是?",
             ["2x − 4", "2x + 4", "10x − 2"],
             0, "6x−3−4x−1=2x−4", "6x−4x=2x，−3−1=−4 → 2x−4", X),
    ]
    return make_set("polynomial_add_sub", "整式加减", "procedure", probs)


# ── 上册 U3: 一元一次方程 ─────────────────────────────────────────────────

def linear_equation_one():
    """一元一次方程 — procedure."""
    # For each equation, CHOOSE the integer solution first, then build equation around it.
    # sol=7: x+5=12 ✓
    # sol=5: 3x=15 ✓
    # sol=5: 2x-3=7 ✓
    # sol=-3: 5x+2=3x-4 ✓  (5(-3)+2=-13, 3(-3)-4=-13 ✓)
    # sol=8: 3(x-2)=2(x+1) ✓ (3(6)=18, 2(9)=18 ✓)

    # New parametric equations — choose sol first, build:
    # leq_b2: sol=4 → x − 2 = 2 → x=4 ✓
    # leq_b3: sol=6 → 4x = 24 → x=6 ✓
    # leq_c3: sol=-2 → 3x+7=1 → 3(-2)+7=1 ✓
    # leq_c4: sol=3 → 4x-5=x+4 → 3x=9 → x=3 ✓ (4(3)-5=7, 3+4=7 ✓)
    # leq_c5: sol=5 → 2(x-1)=3(x-3) → 2x-2=3x-9 → x=7... let's pick sol=7: 2(6)=12, 3(4)=12 ✓
    # leq_x2: sol=2 → x/2+(x+2)/4=2 → mult 4: 2x+x+2=8 → 3x=6 → x=2 ✓
    # leq_x3: sol=-4 → 2(x+3)=3(x+7) → 2x+6=3x+21 → -x=15 → x=-15...
    #         use sol=3: (x+1)/2=(x+4)/3 → 3(x+1)=2(x+4) → 3x+3=2x+8 → x=5, pick sol=5

    probs = [
        P_fill("leq_b0", "解方程: x + 5 = 12，x = ?", 7,
               "两边减 5", "x = 12 − 5 = 7", B),
        P_fill("leq_b1", "解方程: 3x = 15，x = ?", 5,
               "两边除以 3", "x = 15 ÷ 3 = 5", B),
        P_fill("leq_c0", "解方程: 2x − 3 = 7，x = ?", 5,
               "先移项: 2x=10，再除以2", "2x = 10，x = 5", C),
        P_fill("leq_c1", "解方程: 5x + 2 = 3x − 4，x = ?", -3,
               "移项: 5x−3x=−4−2→2x=−6", "2x = −6，x = −3", C),
        P_mc("leq_c2",
             "解方程: 3(x − 2) = 2(x + 1)，x = ？",
             ["6", "8", "4", "10"],
             1, "先展开括号，再移项",
             "3x−6=2x+2，x=8 | 步骤: 展开左边=3x−6; 展开右边=2x+2; 移项合并=x=8; x=8", C),
        P_mc("leq_x0",
             "方程 2(x+3) = 8 的解是?",
             ["x = 1", "x = 2", "x = 5"],
             0, "2x+6=8，2x=2，x=1", "x = 1", X),
        P_fill("leq_x1",
               "解方程: x/2 − (x−3)/3 = 1",
               0, "两边乘以 6 去分母",
               "×6: 3x − 2(x−3) = 6 → 3x − 2x + 6 = 6 → x = 0", X),
        # ── NEW ──
        # leq_b2: sol=4, x-2=2
        P_fill("leq_b2", "解方程: x − 2 = 2，x = ?", 4,
               "两边加 2", "x = 2 + 2 = 4", B),
        # leq_b3: sol=6, 4x=24
        P_fill("leq_b3", "解方程: 4x = 24，x = ?", 6,
               "两边除以 4", "x = 24 ÷ 4 = 6", B),
        # leq_c3: sol=-2, 3x+7=1 → 3(-2)+7=1 ✓
        P_fill("leq_c3", "解方程: 3x + 7 = 1，x = ?", -2,
               "移项: 3x=1−7=−6，x=−2", "3x = −6，x = −2", C),
        # leq_c4: sol=3, 4x-5=x+4 → 3x=9, x=3; check: 4(3)-5=7, 3+4=7 ✓
        P_fill("leq_c4", "解方程: 4x − 5 = x + 4，x = ?", 3,
               "移项: 4x−x=4+5→3x=9", "3x = 9，x = 3", C),
        # leq_c5: sol=7, 2(x-1)=3(x-4) → 2x-2=3x-12 → x=10...
        # recalc: sol=7, use 2(x-1)=3(x-4): 2(6)=12, 3(3)=9 ✗
        # sol=10: 2(10-1)=18, 3(10-4)=18 ✓  → 2(x-1)=3(x-4)
        P_fill("leq_c5", "解方程: 2(x − 1) = 3(x − 4)，x = ?", 10,
               "展开: 2x−2=3x−12，移项: −x=−10", "2x−2=3x−12 → −x=−10 → x=10", C),
        # leq_x2: sol=2, x/2+(x+2)/4=2 → ×4: 2x+x+2=8 → 3x=6 → x=2 ✓
        P_fill("leq_x2", "解方程: x/2 + (x+2)/4 = 2，x = ?", 2,
               "两边×4: 2x+(x+2)=8→3x+2=8→3x=6",
               "×4: 2x+x+2=8 → 3x=6 → x=2", X),
        # leq_x3: sol=5, (x+1)/2=(x+4)/3 → 3(x+1)=2(x+4) → 3x+3=2x+8 → x=5
        # check: (5+1)/2=3, (5+4)/3=3 ✓
        P_fill("leq_x3", "解方程: (x+1)/2 = (x+4)/3，x = ?", 5,
               "去分母: 3(x+1)=2(x+4)",
               "3x+3=2x+8 → x=5; 验证: (6)/2=3, (9)/3=3 ✓", X),
        # ── BATCH 2 ──
        # leq_e1: sol=9, x-4=5
        P_fill("leq_e1", "解方程: x − 4 = 5，x = ?", 9,
               "两边加 4", "x = 5 + 4 = 9", B),
        # leq_e2: sol=-4, 2x=-8
        P_fill("leq_e2", "解方程: 2x = −8，x = ?", -4,
               "两边除以 2", "x = −8 ÷ 2 = −4", B),
        # leq_e3: sol=6, 2x+3=15 → 2x=12 → x=6
        P_fill("leq_e3", "解方程: 2x + 3 = 15，x = ?", 6,
               "移项: 2x=12，再除以2", "2x = 12，x = 6", C),
        # leq_e4: sol=4, 6x-8=2x+8 → 4x=16 → x=4; verify: 6(4)-8=16, 2(4)+8=16 ✓
        P_fill("leq_e4", "解方程: 6x − 8 = 2x + 8，x = ?", 4,
               "移项: 6x−2x=8+8→4x=16", "4x = 16，x = 4", C),
        # leq_e5: sol=3, 3(2x-1)=5x+6 → 6x-3=5x+6 → x=9 ... let me recalc
        # sol=9: 3(2(9)-1)=3(17)=51, 5(9)+6=51 ✓  Good.
        P_fill("leq_e5", "解方程: 3(2x − 1) = 5x + 6，x = ?", 9,
               "展开: 6x−3=5x+6，x=9", "6x−3=5x+6 → x=9; 验证: 3×17=51, 45+6=51 ✓", X),
    ]
    return make_set("linear_equation_one", "解一元一次方程", "procedure", probs)


def linear_equation_app():
    """一元一次方程应用题 — formula."""
    probs = [
        P_fill("lea_b0",
               "一个数加上 7 等于 15，这个数是?",
               8, "设这个数为 x，x+7=15", "x = 15 − 7 = 8", B),
        P_fill("lea_b1",
               "小明比小红大 5 岁，两人年龄之和是 25 岁，\n小红几岁?",
               10, "设小红 x，x+(x+5)=25→2x+5=25", "2x = 20，x = 10", B),
        P_mc("lea_c0",
             "某数的 3 倍减 4 等于 14，某数是?",
             ["6", "5", "10"],
             0, "3x−4=14→3x=18→x=6", "x = 6", C),
        P_fill("lea_c1",
               "一辆汽车以 60 km/h 行驶，4 小时后离目的地还有\n20 km，全程多少 km?",
               260, "60×4+20=240+20=260", "路程 = 60×4 + 20 = 260 km", C),
        P_mc("lea_x0",
             "甲乙两地相距 120 km，两车同时从两地相向而行，\n甲车速 40 km/h，乙车速 20 km/h，几小时后相遇?",
             ["2 小时", "3 小时", "4 小时"],
             0, "相遇时间=总路程÷速度和=120÷60=2h", "120 ÷ (40+20) = 2 小时", X),
        P_mc("lea_x1",
             "父亲年龄是儿子的 3 倍，再过 10 年后父亲年龄是儿子的 2 倍，\n儿子现在几岁?",
             ["8 岁", "10 岁", "12 岁", "15 岁"],
             1, "设儿子年龄为 x",
             "3x+10=2(x+10)→3x+10=2x+20→x=10 | 步骤: 设儿子年龄 x，父亲年龄=3x; 10年后儿子年龄=x+10; 列方程: 3x+10=2(x+10)=3x+10=2x+20; x=10", X),
        # ── NEW ──
        # lea_b2: x - 4 = 9 → x = 13
        P_fill("lea_b2",
               "一个数减去 4 等于 9，这个数是?",
               13, "设这个数为 x，x−4=9", "x = 9 + 4 = 13", B),
        # lea_b3: 2 numbers, sum=30, one is 8 more → x+(x+8)=30 → 2x=22 → x=11, larger=19
        P_fill("lea_b3",
               "两数之和为 30，较大数比较小数大 8，较大数是?",
               19, "设小数 x，x+(x+8)=30→2x=22→x=11，大数=19", "x=11，大数=11+8=19", B),
        # lea_c2: 连续整数问题, 三个连续整数和=42 → 3x+3=42 → x=13, 中间=14
        P_fill("lea_c2",
               "三个连续整数之和为 42，这三个整数中最大的是?",
               15, "设中间数为 x，(x−1)+x+(x+1)=42→3x=42→x=14",
               "3x=42，x=14，最大整数=14+1=15", C),
        # lea_c3: speed problem — sol built from known values
        # 步行速 4km/h, 骑行速 12km/h, 总距离18km, 步行t小时则骑行(t+1)小时
        # 4t + 12(t+1) = 18? → 4t+12t+12=18 → 16t=6 not integer
        # Use: 步行t小时, 骑行t小时, 总距离=40km: 4t+12t=40 → 16t=40... not int
        # pick: same time t, v1=5, v2=15, total=60: 20t=60, t=3 ✓
        P_fill("lea_c3",
               "甲乙同时出发，甲速 5 km/h，乙速 15 km/h，\n同向而行，出发时甲在前 60 km，乙何时追上甲（几小时）?",
               # 15t - 5t = 60 → 10t=60 → t=6
               6, "设 t 小时后追上，15t−5t=60→10t=60",
               "10t = 60，t = 6 小时", C),
        # lea_x2: price problem; sol=12 shirts
        # Each shirt $25, each pants $45, buy n shirts + (n-3) pants = 465
        # 25n + 45(n-3) = 465 → 25n+45n-135=465 → 70n=600 not integer
        # Use: $20 shirt, $30 pants, n shirts + n pants = 150: 50n=150, n=3
        P_fill("lea_x2",
               "某店衬衫每件 20 元，裤子每件 30 元，\n购买相同数量的衬衫和裤子共花了 150 元，各买了几件?",
               3, "设买 n 件，20n+30n=150→50n=150", "50n = 150，n = 3 件", X),
        # lea_x3: work problem; A+B together 6 days, A alone 10 days → B alone?
        # 1/10 + 1/B = 1/6 → 1/B = 1/6-1/10 = 2/30 → B=15
        P_mc("lea_x3",
             "甲单独完成一项工作需 10 天，甲乙合作需 6 天，\n乙单独完成需几天?",
             ["15 天", "12 天", "8 天"],
             0, "1/10 + 1/B = 1/6，解出 B",
             "1/B = 1/6 − 1/10 = 2/30 = 1/15，B = 15 天", X),
        # ── BATCH 2 ──
        # lea_e1: x+12=27 → x=15
        P_fill("lea_e1",
               "一个数加上 12 等于 27，这个数是?",
               15, "x+12=27→x=15", "x = 27 − 12 = 15", B),
        # lea_e2: three pieces total 48cm, one is twice as long as another;
        #   simpler: two ropes total 30m, one is 4m longer → x+(x+4)=30 → 2x=26 → x=13, longer=17
        P_fill("lea_e2",
               "两根绳子总长 30 m，一根比另一根长 4 m，\n较长的一根是多少米?",
               17, "设短绳 x，x+(x+4)=30→2x=26→x=13，长=17", "x=13，长绳=13+4=17 m", B),
        # lea_e3: 某数的 2 倍加 9 等于 25 → 2x+9=25 → x=8
        P_fill("lea_e3",
               "某数的 2 倍加 9 等于 25，这个数是?",
               8, "2x+9=25→2x=16→x=8", "2x = 16，x = 8", C),
        # lea_e4: distance problem, t=4h, v=50km/h, remaining=20km → total=220
        P_fill("lea_e4",
               "一辆汽车以 50 km/h 行驶，4 小时后离目的地还有\n20 km，全程多少 km?",
               50*4 + 20, "50×4+20=200+20=220", f"路程 = 50×4 + 20 = {50*4+20} km", C),
        # lea_e5: 连续偶数之和=50 → n+(n+2)=50? wait, 3 consecutive even: n+(n+2)+(n+4)=72, n=22
        P_fill("lea_e5",
               "三个连续偶数之和为 72，最小的偶数是?",
               # n+(n+2)+(n+4)=72 → 3n+6=72 → 3n=66 → n=22
               22, "设最小偶数 n，n+(n+2)+(n+4)=72→3n=66→n=22", "3n+6=72，n=22", X),
    ]
    return make_set("linear_equation_app", "一元一次方程应用", "formula", probs)


# ── 上册 U4: 几何图形初步 ─────────────────────────────────────────────────

def geometry_intro():
    """直线、射线、线段与角 — concept."""
    probs = [
        P_mc("gi_b0",
             "线段、射线、直线中，可以量出长度的是?",
             ["线段", "射线", "直线"],
             0, "只有线段有两个端点", "线段有两个端点，可以量长度", B),
        P_mc("gi_b1",
             "两点确定几条直线?",
             ["1 条", "2 条", "无数条"],
             0, "两点只能连一条直线", "过两点只能画一条直线", B),
        P_mc("gi_c0",
             "角的表示中，∠AOB 中 O 是?",
             ["顶点", "一条边", "角的内部"],
             0, "中间字母是顶点", "O 是角的顶点", C),
        P_fill("gi_c1",
               "一个角是 130°，它的补角是多少度?",
               50, "补角 = 180° − 130°", "180 − 130 = 50°", C),
        P_fill("gi_c2",
               "一个角是 40°，它的余角是多少度?",
               50, "余角 = 90° − 40°", "90 − 40 = 50°", C),
        P_mc("gi_x0",
             "从同一点出发的两条射线组成的图形叫做?",
             ["角", "线段", "直线"],
             0, "角由两条射线构成", "角", X),
        P_mc("gi_x1",
             "某角的补角是其余角的 3 倍，这个角是多少度?",
             ["45°", "60°", "30°"],
             0, "设角x: 180−x=3(90−x)", "180−x=270−3x→2x=90→x=45°", X),
        # ── NEW ──
        P_mc("gi_b2",
             "射线有几个端点?",
             ["1 个", "2 个", "0 个"],
             0, "射线只有起点，无终点", "射线有 1 个端点（起点）", B),
        P_mc("gi_b3",
             "直角是多少度?",
             ["90°", "180°", "45°"],
             0, "直角定义", "直角 = 90°", B),
        P_fill("gi_c3",
               "一个角是 65°，它的补角是多少度?",
               180 - 65, "补角 = 180° − 65°", f"180 − 65 = {180-65}°", C),
        P_fill("gi_c4",
               "一个角是 35°，它的余角是多少度?",
               90 - 35, "余角 = 90° − 35°", f"90 − 35 = {90-35}°", C),
        P_mc("gi_c5",
             "平角是多少度?",
             ["180°", "90°", "360°"],
             0, "平角两条射线共线，方向相反", "平角 = 180°", C),
        P_mc("gi_x2",
             "两角互补，其中一角是另一角的 2 倍，较小角是多少度?",
             # sol: x + 2x = 180 → 3x=180 → x=60°, smaller=60°
             ["60°", "90°", "30°"],
             0, "x+2x=180→3x=180→x=60", "x+2x=180°，3x=180°，x=60°（较小角）", X),
        P_fill("gi_x3",
               "∠A 和 ∠B 互余，∠A = 28°，则 ∠B = ?（度）",
               90 - 28, "余角之和=90°，∠B=90°−28°", f"90 − 28 = {90-28}°", X),
        P_mc("gi_x4",
             "经过直线外一点，能画几条直线与已知直线平行?",
             ["1 条", "2 条", "无数条"],
             0, "过直线外一点，有且仅有一条平行线", "1 条（平行公理）", X),
        # ── BATCH 2 ──
        P_fill("gi_e1",
               "一个角是 72°，它的补角是多少度?",
               180 - 72, "补角=180°−72°", f"180 − 72 = {180-72}°", B),
        P_fill("gi_e2",
               "一个角是 55°，它的余角是多少度?",
               90 - 55, "余角=90°−55°", f"90 − 55 = {90-55}°", B),
        P_mc("gi_e3",
             "∠A 与 ∠B 互补，∠A = 110°，则 ∠B = ?",
             [str(180-110) + "°", "110°", "90°"],
             0, "互补之和=180°，∠B=180°−110°=70°",
             f"∠B = 180° − 110° = {180-110}°", C),
        P_mc("gi_e4",
             "钝角的范围是?",
             ["90° < 钝角 < 180°", "0° < 钝角 < 90°", "钝角 = 180°"],
             0, "钝角大于直角小于平角", "90° < 钝角 < 180°", C),
        P_mc("gi_e5",
             "两角互余，其中一角是 42°，另一角是?",
             [str(90-42) + "°", "42°", "138°"],
             0, "互余之和=90°", f"90° − 42° = {90-42}°", X),
    ]
    return make_set("geometry_intro", "直线射线线段与角", "concept", probs)


# ── 下册 L1: 相交线与平行线 ───────────────────────────────────────────────

def parallel_lines():
    """相交线与平行线 — concept."""
    probs = [
        P_mc("pl_b0",
             "两条直线相交时，对顶角的关系是?",
             ["相等", "互补", "互余"],
             0, "对顶角相等", "对顶角是相等的角", B),
        P_mc("pl_b1",
             "两直线平行时，同位角的关系是?",
             ["相等", "互补", "互余"],
             0, "平行线同位角相等", "同位角相等", B),
        P_fill("pl_c0",
               "两直线平行，同旁内角之和是多少度?",
               180, "平行线同旁内角互补", "同旁内角之和 = 180°", C),
        P_mc("pl_c1",
             "两直线被第三条直线所截，若内错角相等，则两直线?",
             ["平行", "垂直", "相交"],
             0, "内错角相等是平行的判定", "两直线平行", C),
        P_fill("pl_x0",
               "两平行线间的一条截线，使得一个同位角为 70°，\n则另一个同位角是多少度?",
               70, "同位角相等", "70°（同位角相等）", X),
        P_mc("pl_x1",
             "∠1 和 ∠2 是对顶角，∠1 = 35°，则 ∠2 = ?",
             ["35°", "145°", "90°"],
             0, "对顶角相等", "∠2 = ∠1 = 35°", X),
        # ── NEW ──
        P_mc("pl_b2",
             "两直线平行时，内错角的关系是?",
             ["相等", "互补", "互余"],
             0, "平行线内错角相等", "内错角相等", B),
        P_fill("pl_b3",
               "两直线相交形成的相邻两角之和是多少度?",
               180, "相邻两角互补", "相邻角互补，和为 180°", B),
        P_fill("pl_c2",
               "两平行线被截，同旁内角一个为 55°，另一个为多少度?",
               180 - 55, "同旁内角互补，55+?=180", f"180 − 55 = {180-55}°", C),
        P_mc("pl_c3",
             "下列哪个条件能判定两直线平行?",
             ["同位角相等", "对顶角相等", "相邻角互补"],
             0, "同位角相等→平行（平行判定）", "同位角相等可以判定两直线平行", C),
        P_fill("pl_c4",
               "两直线平行，一个内错角为 72°，则另一个内错角为多少度?",
               72, "内错角相等", "72°（内错角相等）", C),
        P_mc("pl_x2",
             "两直线 a, b 被直线 c 所截，若同旁内角互补，则 a 和 b?",
             ["平行", "垂直", "相交但不垂直"],
             0, "同旁内角互补是平行的判定条件", "a ∥ b", X),
        P_fill("pl_x3",
               "两直线平行，一个同位角为 (2x+10)°，另一个为 (3x−20)°，\nx = ?",
               # 2x+10 = 3x-20 → x=30
               30, "同位角相等: 2x+10=3x−20→x=30", "2x+10=3x−20 → x=30", X),
        P_mc("pl_x4",
             "直线 a ∥ b，一个同旁内角为 110°，则另一个同旁内角为?",
             ["70°", "110°", "90°"],
             0, "同旁内角互补，110+70=180", f"180 − 110 = 70°", X),
        # ── BATCH 2 ──
        P_fill("pl_e1",
               "两平行线被截，一个内错角为 65°，则另一个内错角为多少度?",
               65, "内错角相等", "65°（内错角相等）", B),
        P_mc("pl_e2",
             "对顶角是指?",
             ["两直线相交，公共顶点两侧的角", "平行线同侧的角", "两条射线夹的角"],
             0, "对顶角由两直线相交形成", "两直线相交产生的对顶角（公共顶点，两侧）", B),
        P_fill("pl_e3",
               "两直线平行，一个同旁内角为 80°，则另一个同旁内角为多少度?",
               180 - 80, "同旁内角互补", f"180 − 80 = {180-80}°", C),
        P_mc("pl_e4",
             "两直线平行，同位角分别为 (3x)° 和 (x+60)°，则 x = ?",
             # 3x = x+60 → 2x=60 → x=30
             ["30", "20", "45"],
             0, "同位角相等: 3x=x+60→2x=60→x=30", "3x=x+60，2x=60，x=30", X),
        P_mc("pl_e5",
             "∠1 = 50°，∠2 与 ∠1 互补，则 ∠2 = ?",
             [str(180-50) + "°", "50°", "40°"],
             0, "互补之和=180°", f"180° − 50° = {180-50}°", C),
    ]
    return make_set("parallel_lines", "相交线与平行线", "concept", probs)


# ── 下册 L2: 实数（平方根/立方根）────────────────────────────────────────

def real_number_sqrt():
    """平方根与立方根 — concept."""
    probs = [
        P_mc("rns_b0",
             "√36 = ?",
             ["6", "18", "±6"],
             0, "算术平方根为正值", "√36 = 6", B),
        P_fill("rns_b1",
               "16 的算术平方根是?",
               4, "√16 = 4", "4² = 16，√16 = 4", B),
        P_fill("rns_c0",
               "∛27 = ?",
               3, "3³ = 27", "∛27 = 3", C),
        P_fill("rns_c1",
               "∛(−8) = ?",
               -2, "负数有立方根: (−2)³=−8", "∛(−8) = −2", C),
        P_mc("rns_x0",
             "下列各数中，是无理数的是?",
             ["√2", "√4", "0.333...（1/3）"],
             0, "√4=2是有理数，√2无限不循环", "√2 是无理数", X),
        P_fill("rns_x1",
               "估算 √10 的整数部分（不用计算器）",
               3, "3²=9 < 10 < 16=4²，所以 3 < √10 < 4", "√10 在 3 和 4 之间，整数部分为 3", X),
        # ── NEW ──
        P_fill("rns_b2",
               "√25 = ?",
               5, "5² = 25", "√25 = 5", B),
        P_mc("rns_b3",
             "负数有平方根吗?",
             ["没有（在实数范围内）", "有，是负数", "有，是正数"],
             0, "实数中负数没有平方根", "负数在实数范围内没有平方根", B),
        P_fill("rns_c2",
               "∛(−64) = ?",
               -4, "(−4)³=−64", "(−4)³ = −64，∛(−64) = −4", C),
        P_fill("rns_c3",
               "√81 = ?",
               9, "9² = 81", "9² = 81，√81 = 9", C),
        P_mc("rns_c4",
             "x² = 49 的解是?",
             ["x = ±7", "x = 7", "x = −7"],
             0, "平方根有正负两个", "x = 7 或 x = −7，即 ±7", C),
        P_fill("rns_x2",
               "估算 √20 的整数部分（不用计算器）",
               4, "4²=16 < 20 < 25=5²，所以 4 < √20 < 5", "√20 在 4 和 5 之间，整数部分为 4", X),
        P_mc("rns_x3",
             "下列各数中，不是无理数的是?",
             ["√9", "√5", "√7"],
             0, "√9=3是整数，故是有理数", "√9 = 3 是有理数", X),
        P_fill("rns_x4",
               "∛(125) = ?",
               5, "5³ = 125", "5³ = 125，∛125 = 5", X),
        # ── BATCH 2 ──
        P_fill("rns_e1",
               "√49 = ?",
               7, "7² = 49", "√49 = 7", B),
        P_fill("rns_e2",
               "∛(−27) = ?",
               -3, "(−3)³=−27", "∛(−27) = −3", B),
        P_mc("rns_e3",
             "x² = 25 的解是?",
             ["x = ±5", "x = 5", "x = −5"],
             0, "平方根有正负两个", "x = 5 或 x = −5，即 ±5", C),
        P_fill("rns_e4",
               "估算 √30 的整数部分（不用计算器）",
               5, "5²=25 < 30 < 36=6²，所以 5 < √30 < 6", "√30 在 5 和 6 之间，整数部分为 5", X),
        P_mc("rns_e5",
             "以下哪个数是完全平方数（能开出整数平方根）?",
             ["64", "50", "72"],
             0, "8² = 64", "64 = 8²，是完全平方数", C),
    ]
    return make_set("real_number_sqrt", "平方根与立方根", "concept", probs)


# ── 下册 L3: 平面直角坐标系 ──────────────────────────────────────────────

def coordinate_plane():
    """平面直角坐标系 — concept."""
    probs = [
        P_mc("cp3_b0",
             "点 (3, −2) 位于哪个象限?",
             ["第四象限", "第一象限", "第三象限"],
             0, "x>0，y<0 → 第四象限", "x 正 y 负 → 第四象限", B),
        P_mc("cp3_b1",
             "x 轴上的点，y 坐标为?",
             ["0", "任意", "正数"],
             0, "x 轴上 y=0", "x 轴上所有点 y = 0", B),
        P_fill("cp3_c0",
               "点 A(−3, 0) 到 y 轴的距离是?",
               3, "到 y 轴距离=|x坐标|", "|−3| = 3", C),
        P_mc("cp3_c1",
             "点 (−2, 3) 关于 y 轴的对称点是?",
             ["(2, 3)", "(−2, −3)", "(2, −3)"],
             0, "关于 y 轴对称，x 变号，y 不变", "(2, 3)", C),
        P_mc("cp3_x0",
             "第二象限的点 (x, y) 满足?",
             ["x < 0，y > 0", "x > 0，y > 0", "x < 0，y < 0"],
             0, "第二象限: 负正", "x < 0，y > 0", X),
        P_fill("cp3_x1",
               "点 A(2, 3) 和点 B(−1, 3) 之间的距离是?",
               3, "y坐标相同，距离=|2−(−1)|=3", "|2 − (−1)| = 3", X),
        # ── NEW ──
        P_mc("cp3_b2",
             "点 (−4, 5) 位于哪个象限?",
             ["第二象限", "第一象限", "第三象限"],
             0, "x<0, y>0 → 第二象限", "x 负 y 正 → 第二象限", B),
        P_mc("cp3_b3",
             "y 轴上的点，x 坐标为?",
             ["0", "任意", "负数"],
             0, "y 轴上 x=0", "y 轴上所有点 x = 0", B),
        P_fill("cp3_c2",
               "点 B(0, −5) 到 x 轴的距离是?",
               5, "到 x 轴距离=|y坐标|", "|−5| = 5", C),
        P_mc("cp3_c3",
             "点 (4, −1) 关于 x 轴的对称点是?",
             ["(4, 1)", "(−4, −1)", "(−4, 1)"],
             0, "关于 x 轴对称，y 变号，x 不变", "(4, 1)", C),
        P_mc("cp3_c4",
             "第三象限的点 (x, y) 满足?",
             ["x < 0，y < 0", "x > 0，y < 0", "x < 0，y > 0"],
             0, "第三象限: 负负", "x < 0，y < 0", C),
        P_fill("cp3_x2",
               "点 A(3, −2) 和点 B(3, 4) 之间的距离是?",
               abs(-2 - 4), "x坐标相同，距离=|−2−4|=6", "|−2 − 4| = 6", X),
        P_mc("cp3_x3",
             "点 (a, b) 在第四象限，则点 (b, a) 在?",
             # Q4: a>0,b<0 → for (b,a): b<0, a>0 → Q2
             ["第二象限", "第一象限", "第三象限"],
             0, "第四象限 a>0,b<0 → (b,a): b<0,a>0 → 第二象限", "a>0,b<0，故 (b,a) 中 b<0,a>0，位于第二象限", X),
        P_fill("cp3_x4",
               "点 C(−2, y) 到 y 轴的距离是?",
               2, "到 y 轴距离=|x坐标|=|−2|=2", "|−2| = 2", X),
        # ── BATCH 2 ──
        P_mc("cp3_e1",
             "点 (0, 5) 在哪里?",
             ["y 轴上", "x 轴上", "第一象限"],
             0, "x=0 → 在 y 轴上", "x=0 说明在 y 轴上", B),
        P_mc("cp3_e2",
             "点 (−1, −4) 在哪个象限?",
             ["第三象限", "第二象限", "第四象限"],
             0, "x<0, y<0 → 第三象限", "x 负 y 负 → 第三象限", B),
        P_mc("cp3_e3",
             "点 (5, 3) 关于原点的对称点是?",
             ["(−5, −3)", "(5, −3)", "(−5, 3)"],
             0, "关于原点对称，两坐标都变号", "(−5, −3)", C),
        P_fill("cp3_e4",
               "点 A(−4, 2) 到 x 轴的距离是?",
               abs(2), "到 x 轴距离=|y坐标|=|2|=2", "|2| = 2", C),
        P_mc("cp3_e5",
             "若点 P(2, a) 在第四象限，则 a 的范围是?",
             ["a < 0", "a > 0", "a = 0"],
             0, "第四象限 x>0, y<0，所以 a<0", "第四象限中 y<0，故 a < 0", X),
    ]
    return make_set("coordinate_plane", "平面直角坐标系", "concept", probs)


# ── 下册 L4: 二元一次方程组 ──────────────────────────────────────────────

def equation_system():
    """二元一次方程组 — procedure."""
    probs = [
        P_mc("es_b0",
             "二元一次方程组解法有哪些?",
             ["代入法和加减法", "代入法和画图法", "只有代入法"],
             0, "初中主要用代入法/加减法", "代入消元法和加减消元法", B),
        P_fill("es_b1",
               "方程组 {x+y=5, x−y=1}，求 x（整数）",
               3, "两式相加: 2x=6→x=3", "两式相加: 2x = 6，x = 3", B),
        P_mc("es_c0",
             "解方程组: {2x+y=7, x−y=2}，解为？",
             ["(2, 3)", "(3, 2)", "(3, 1)", "(4, 1)"],
             2, "两式加减消去一个未知数",
             "3x=9，x=3，y=1 | 步骤: 两式相加消 y: 3x=9; x=3; 代入第二式: 3−y=2，y=1; 解: (x,y)=(3,1)", C),
        P_fill("es_c1",
               "方程组 {3x+2y=12, x=2}，求 y（整数）",
               3, "代入x=2: 6+2y=12→2y=6", "y = 3", C),
        P_mc("es_x0",
             "方程组 {x+y=10, 2x−y=2} 的解是?",
             ["x=4, y=6", "x=6, y=4", "x=3, y=7"],
             0, "两式加: 3x=12→x=4→y=6", "x=4, y=6", X),
        P_mc("es_x1",
             "两数之和为 20，差为 4，求这两个数，较小的数是？",
             ["6", "10", "8", "9"],
             2, "和差问题列方程组",
             "x+y=20，x−y=4；两式加: 2x=24→x=12→y=8 | 步骤: 设大数 x，小数 y，方程 1=x+y=20; 方程 2=x−y=4; 解出 x=12; 解出 y=8", X),
        # ── NEW ──
        # es_b2: x+y=8, x-y=2 → 2x=10 → x=5, y=3
        P_fill("es_b2",
               "方程组 {x+y=8, x−y=2}，求 x（整数）",
               5, "两式相加: 2x=10→x=5", "两式相加: 2x = 10，x = 5", B),
        # es_b3: x=3, 2x+y=10 → y=4
        P_fill("es_b3",
               "方程组 {x=3, 2x+y=10}，求 y（整数）",
               4, "代入x=3: 6+y=10→y=4", "y = 10 − 6 = 4", B),
        # es_c2: 3x+2y=16, x+2y=8 → subtract: 2x=8 → x=4, y=2
        # verify: 3(4)+2(2)=16 ✓, 4+2(2)=8 ✓
        P_mc("es_c2",
             "方程组 {3x+2y=16, x+2y=8} 的解是?",
             ["x=4, y=2", "x=2, y=4", "x=4, y=4"],
             0, "两式相减消 y: 2x=8→x=4，代入→y=2",
             "第①式−第②式: 2x=8，x=4；代入②: 4+2y=8，y=2", C),
        # es_c3: 2x-y=3, x+y=9 → 3x=12 → x=4, y=5
        # verify: 2(4)-5=3 ✓, 4+5=9 ✓
        P_fill("es_c3",
               "方程组 {2x−y=3, x+y=9}，求 x+y 的值（即 y=?先解 x）\n解：x = ?",
               4, "两式相加: 3x=12→x=4", "相加消 y: 3x = 12，x = 4", C),
        # es_x2: 5x+3y=21, 2x+3y=12 → subtract: 3x=9 → x=3, y=2
        # verify: 5(3)+3(2)=21 ✓, 2(3)+3(2)=12 ✓
        P_mc("es_x2",
             "方程组 {5x+3y=21, 2x+3y=12} 的解是?",
             ["x=3, y=2", "x=2, y=3", "x=3, y=3"],
             0, "相减消 y: 3x=9→x=3，代入→y=2",
             "①−②: 3x=9，x=3；代入②: 6+3y=12，y=2", X),
        # es_x3: age problem; son=x, dad=4x, 5years: dad+5=3(son+5) → 4x+5=3x+15 → x=10
        P_mc("es_x3",
             "现在父亲年龄是儿子年龄的 4 倍，5 年后父亲年龄是儿子的 3 倍，\n儿子现在几岁?",
             ["10 岁", "8 岁", "12 岁"],
             0, "设儿子 x，父亲 4x，方程: 4x+5=3(x+5)",
             "4x+5=3x+15 → x=10；验证: 父40，子10；5年后: 45=3×15 ✓", X),
        # ── BATCH 2 ──
        # es_e1: x+y=7, x-y=3 → 2x=10 → x=5, y=2
        P_fill("es_e1",
               "方程组 {x+y=7, x−y=3}，求 y（整数）",
               2, "两式相加: 2x=10→x=5，代入→y=2", "x=5，y=7−5=2", B),
        # es_e2: x=4, 3x-y=7 → 3(4)-y=7 → y=5
        P_fill("es_e2",
               "方程组 {x=4, 3x−y=7}，求 y（整数）",
               5, "代入x=4: 12−y=7→y=5", "y = 12 − 7 = 5", B),
        # es_e3: 4x+y=14, 2x+y=8 → subtract: 2x=6 → x=3, y=2
        # verify: 4(3)+2=14 ✓, 2(3)+2=8 ✓
        P_mc("es_e3",
             "方程组 {4x+y=14, 2x+y=8} 的解是?",
             ["x=3, y=2", "x=2, y=6", "x=3, y=6"],
             0, "相减消 y: 2x=6→x=3，代入→y=2",
             "4x+y=14, 2x+y=8; 相减: 2x=6, x=3; 代入: y=2", C),
        # es_e4: x+3y=11, x-y=3 → subtract: 4y=8 → y=2, x=5
        # verify: 5+6=11 ✓, 5-2=3 ✓
        P_fill("es_e4",
               "方程组 {x+3y=11, x−y=3}，求 y（整数）",
               2, "两式相减: 4y=8→y=2", "4y=8，y=2", C),
        # es_e5: speed problem as equation system
        # x+y=20 (sum), 2x=y+3 (relation): 2x-y=3 → add to x+y=20 → 3x=23 non-integer
        # use: apple+banana=15, 2*apple=banana+3 → apple=6, banana=9
        # verify: 6+9=15 ✓, 12=9+3=12 ✓
        P_mc("es_e5",
             "苹果和橘子共 15 个，苹果数量是橘子的 2 倍少 3 个，\n苹果有几个?",
             ["9 个", "6 个", "10 个"],
             0, "设苹果 x，橘子 15−x，x=2(15−x)−3→x=9",
             "x=2(15−x)−3→x=30−2x−3→3x=27→x=9；验证: 9+6=15 ✓, 9=2×6−3=9 ✓", X),
    ]
    return make_set("equation_system", "二元一次方程组", "procedure", probs)


# ── 下册 L5: 不等式与不等式组 ────────────────────────────────────────────

def inequality_group():
    """一元一次不等式(组) — procedure."""
    probs = [
        P_mc("ig_b0",
             "不等式 x + 3 > 5，解为?",
             ["x > 2", "x < 2", "x > 5"],
             0, "两边减3: x>2", "x > 2", B),
        P_mc("ig_b1",
             "不等式 −2x < 6，解为?",
             ["x > −3", "x < −3", "x > 3"],
             0, "除以负数不等号变向", "−2x < 6 → x > −3", B),
        P_fill("ig_c0",
               "不等式 3x − 1 ≤ 8 的解集中，最大整数解是?",
               3, "3x≤9→x≤3，最大整数是3", "x ≤ 3，最大整数解为 3", C),
        P_mc("ig_c1",
             "不等式组 {x > 1, x ≤ 4} 的整数解有多少个?",
             ["3 个", "4 个", "2 个"],
             0, "x=2,3,4 共3个", "x = 2, 3, 4，共 3 个整数解", C),
        P_mc("ig_x0",
             "解不等式: 2(x−1) > 3x − 5，解集为？",
             ["x > 3", "x < −3", "x > −3", "x < 3"],
             3, "注意除以负数不等号方向改变",
             "2x−2>3x−5 → −x>−3 → x<3 | 步骤: 展开左边=2x−2; 移项整理=−x>−3; 除以负数，不等号变向，x<3", X),
        P_mc("ig_x1",
             "关于 x 的不等式 ax > b（a < 0），解集为?",
             ["x < b/a", "x > b/a", "x > b"],
             0, "a<0 时除以a不等号变向", "ax>b，a<0，x < b/a", X),
        # ── NEW ──
        P_mc("ig_b2",
             "不等式 x − 4 < 1，解为?",
             ["x < 5", "x > 5", "x < −3"],
             0, "两边加 4: x < 5", "x < 5", B),
        P_mc("ig_b3",
             "不等式 3x > 12，解为?",
             ["x > 4", "x < 4", "x > 3"],
             0, "两边除以 3（正数，方向不变）", "x > 4", B),
        P_fill("ig_c2",
               "不等式 2x + 5 > 1 的解集中，最小整数解是?",
               # 2x > -4 → x > -2, smallest integer is -1
               -1, "2x>−4→x>−2，最小整数解为 −1", "x > −2，最小整数解为 −1", C),
        P_mc("ig_c3",
             "解不等式: 4x + 3 ≥ 2x − 5，解集为?",
             ["x ≥ −4", "x ≤ −4", "x ≥ 4"],
             0, "4x−2x≥−5−3→2x≥−8→x≥−4", "2x ≥ −8，x ≥ −4", C),
        P_mc("ig_c4",
             "不等式组 {x ≥ −1, x < 3} 的整数解有多少个?",
             # x = -1, 0, 1, 2 → 4 integers
             ["4 个", "3 个", "5 个"],
             0, "x=−1,0,1,2 共4个", "x = −1, 0, 1, 2，共 4 个整数解", C),
        P_mc("ig_x2",
             "解不等式: −3x + 6 > 0，解集为?",
             ["x < 2", "x > 2", "x < −2"],
             0, "−3x > −6，除以负数变向，x < 2", "x < 2", X),
        P_fill("ig_x3",
               "不等式组 {2x > −6, x ≤ 5} 的解集中，最大整数解是?",
               # 2x>-6→x>-3, x≤5 → -3<x≤5, max integer = 5
               5, "x>−3 且 x≤5，最大整数解为 5", "x > −3 且 x ≤ 5，最大整数解为 5", X),
        # ── BATCH 2 ──
        P_mc("ig_e1",
             "不等式 x + 7 ≥ 10，解为?",
             ["x ≥ 3", "x ≤ 3", "x ≥ 7"],
             0, "两边减7: x≥3", "x ≥ 3", B),
        P_mc("ig_e2",
             "不等式 −5x > 15，解为?",
             ["x < −3", "x > −3", "x > 3"],
             0, "除以负数变向: x<−3", "−5x > 15 → x < −3", B),
        P_fill("ig_e3",
               "不等式 4x + 3 < 15 的最大整数解是?",
               # 4x<12 → x<3, max integer = 2
               2, "4x<12→x<3，最大整数为2", "x < 3，最大整数解为 2", C),
        P_mc("ig_e4",
             "不等式 5 − 2x ≥ 3，解集为?",
             ["x ≤ 1", "x ≥ 1", "x ≤ 2"],
             0, "−2x ≥ −2，除以负数变向，x ≤ 1", "−2x ≥ −2 → x ≤ 1", C),
        P_fill("ig_e5",
               "不等式组 {x > −2, x < 4} 的整数解有多少个?",
               # x = -1, 0, 1, 2, 3 → 5
               5, "x=−1,0,1,2,3 共5个", "x ∈ {−1, 0, 1, 2, 3}，共 5 个整数解", X),
    ]
    return make_set("inequality_group", "不等式与不等式组", "procedure", probs)


# ── 下册 L6: 数据的收集整理与描述 ──────────────────────────────────────

def data_statistics():
    """数据的收集整理与描述 — data."""
    table = "某班 10 名同学数学成绩: 85,90,78,92,88,76,90,85,85,94"
    data = [85, 90, 78, 92, 88, 76, 90, 85, 85, 94]
    _max, _min = max(data), min(data)
    _range = _max - _min  # 18
    _freq_90 = data.count(90)   # 2
    _rate_90 = _freq_90 * 100 // len(data)  # 20
    _total = len(data)  # 10
    _sum = sum(data)  # 863
    _mean = _sum // _total  # 86 (integer part)

    probs = [
        P_mc("ds_b0",
             "整理数据时，频率 = ?",
             ["该组数据个数 ÷ 总数据个数", "该组数据之和 ÷ 总数", "最大值 − 最小值"],
             0, "频率 = 频数/总数", "频率 = 频数 ÷ 总频数", B),
        P_mc("ds_b1",
             "条形图适合表示什么类型的数据比较?",
             ["各类数量多少的比较", "各部分占总量的百分比", "数据随时间的变化趋势"],
             0, "条形图擅长对比各类数量", "条形图：各类数量比较", B),
        P_fill("ds_c0",
               table + "\n85 分出现了几次（频数）?",
               3, "数一数: 85出现3次", "85 出现 3 次，频数 = 3", C),
        P_fill("ds_c1",
               table + "\n85 的频率是多少? (百分数，取整%)",
               30, "3÷10=0.3=30%", "频率 = 3 ÷ 10 = 30%", C),
        P_mc("ds_x0",
             "折线统计图最适合表示?",
             ["数据随时间的变化趋势", "各类数量的比较", "各部分占总量的百分比"],
             0, "折线图擅长展示变化趋势", "折线图：变化趋势", X),
        P_fill("ds_x1",
               table + "\n这组数据的极差（最大值 − 最小值）是?",
               _range, f"{_max} − {_min} = {_range}", f"{_max} − {_min} = {_range}", X),
        # ── NEW ──
        P_mc("ds_b2",
             "扇形统计图最适合表示?",
             ["各部分占总量的百分比", "各类数量的比较", "数据随时间的变化趋势"],
             0, "扇形图显示占比", "扇形图：各部分占总量的百分比", B),
        P_fill("ds_b3",
               table + f"\n90 分出现了几次（频数）?",
               _freq_90, f"数一数: 90出现{_freq_90}次", f"90 出现 {_freq_90} 次", B),
        P_fill("ds_c2",
               table + f"\n90 的频率是多少?（百分数，取整%）",
               _rate_90, f"{_freq_90}÷{_total}={_freq_90/10*100:.0f}%", f"{_freq_90} ÷ {_total} = {_rate_90}%", C),
        P_mc("ds_c3",
             "某班 20 名同学中，喜欢篮球的有 8 人，喜欢篮球的频率是?",
             ["40%", "8%", "20%"],
             0, "8÷20=0.4=40%", "8 ÷ 20 = 0.4 = 40%", C),
        P_fill("ds_c4",
               "5 个数据: 3, 7, 5, 9, 6，它们的极差是?",
               9 - 3, "极差 = 最大值 − 最小值 = 9 − 3", "9 − 3 = 6", C),
        P_mc("ds_x2",
             "一组数据: 4, 8, 6, 10, 2，这组数据的平均数是?",
             [str((4+8+6+10+2)//5), str((4+8+6+10+2)//5 + 1), str((4+8+6+10+2)//5 - 1)],
             0, f"(4+8+6+10+2)÷5={4+8+6+10+2}÷5={30//5}", f"30 ÷ 5 = {30//5}", X),
        P_fill("ds_x3",
               "一组数据: 2, 5, 8, 3, 7，其中位数（从小到大排列后中间的数）是?",
               5, "排序: 2,3,5,7,8，中位数是第3个", "2, 3, 5, 7, 8 → 中位数 = 5", X),
        P_mc("ds_x4",
             "下列说法正确的是?",
             ["频率之和等于 1", "频率可以大于 1", "频数之和不一定等于总数"],
             0, "所有频率之和 = 1", "所有组的频率之和等于 1", X),
        # ── BATCH 2 ──
        P_mc("ds_e1",
             "平均数的计算方式是?",
             ["所有数据之和 ÷ 数据个数", "数据中间值", "出现最多的数"],
             0, "平均数 = 总和/个数", "平均数 = 总和 ÷ 数据个数", B),
        P_mc("ds_e2",
             "众数是指一组数据中?",
             ["出现次数最多的数", "最中间的数", "最大值与最小值的平均"],
             0, "众数 = 出现频率最高的值", "众数：出现次数最多的数", B),
        P_fill("ds_e3",
               "数据: 3, 5, 7, 5, 9，众数是?",
               5, "5 出现 2 次，是众数", "5 出现 2 次，是众数", C),
        P_fill("ds_e4",
               "数据: 2, 4, 6, 8, 10，中位数是?",
               6, "排序后中间数: 2,4,6,8,10 → 第3个=6", "中位数 = 6（第3个数）", C),
        P_fill("ds_e5",
               "数据: 10, 3, 8, 5, 9，极差是?",
               10 - 3, "极差=最大−最小=10−3=7", "10 − 3 = 7", X),
    ]
    return make_set("data_statistics", "数据的收集整理与描述", "data", probs)


# ── 组合函数 ───────────────────────────────────────────────────────────────

def build_practice_pack():
    sets = [
        # 上册
        rational_number_concept(),
        number_line(),
        absolute_value(),
        rational_mixed_ops(),
        polynomial_concept(),
        polynomial_add_sub(),
        linear_equation_one(),
        linear_equation_app(),
        geometry_intro(),
        # 下册
        parallel_lines(),
        real_number_sqrt(),
        coordinate_plane(),
        equation_system(),
        inequality_group(),
        data_statistics(),
    ]
    return {"version": "2.0.0", "grade": 7, "sets": sets}


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3 — KNOWLEDGE MAP
# ═══════════════════════════════════════════════════════════════════════════

# (unit_id, term, index, title, [topic_specs])
# topic_spec: (id, title, pedagogy, dependsOn, fluencyTrackId|None)

UNITS_G7 = [
    ("u1", "upper", 1, "有理数", [
        ("rational_number_concept", "有理数的概念",     "concept",   []),
        ("number_line",             "数轴与有理数",     "concept",   ["rational_number_concept"]),
        ("absolute_value",          "绝对值",           "concept",   ["number_line"]),
        ("rational_mixed_ops",      "有理数混合运算",   "procedure", ["absolute_value"],  "rational_add_sub"),
    ]),
    ("u2", "upper", 2, "整式的加减", [
        ("polynomial_concept",      "单项式与多项式",   "concept",   ["rational_mixed_ops"]),
        ("polynomial_add_sub",      "整式加减",         "procedure", ["polynomial_concept"], "monomial_eval"),
    ]),
    ("u3", "upper", 3, "一元一次方程", [
        ("linear_equation_one",     "解一元一次方程",   "procedure", ["polynomial_add_sub"]),
        ("linear_equation_app",     "一元一次方程应用", "formula",   ["linear_equation_one"]),
    ]),
    ("u4", "upper", 4, "几何图形初步", [
        ("geometry_intro",          "直线射线线段与角", "concept",   []),
    ]),
    ("l1", "lower", 1, "相交线与平行线", [
        ("parallel_lines",          "相交线与平行线",   "concept",   ["geometry_intro"]),
    ]),
    ("l2", "lower", 2, "实数", [
        ("real_number_sqrt",        "平方根与立方根",   "concept",   ["rational_number_concept"], "rational_power"),
    ]),
    ("l3", "lower", 3, "平面直角坐标系", [
        ("coordinate_plane",        "平面直角坐标系",   "concept",   ["number_line"]),
    ]),
    ("l4", "lower", 4, "二元一次方程组", [
        ("equation_system",         "二元一次方程组",   "procedure", ["linear_equation_one"]),
    ]),
    ("l5", "lower", 5, "不等式与不等式组", [
        ("inequality_group",        "不等式与不等式组", "procedure", ["linear_equation_one"]),
    ]),
    ("l6", "lower", 6, "数据的收集整理与描述", [
        ("data_statistics",         "数据的收集整理与描述", "data",  []),
    ]),
]


def build_knowledge_map(practice_pack):
    """Build knowledge map, auto-detecting ready status from practice pack."""
    practice_ids = {s["id"] for s in practice_pack["sets"]}

    fluency_track_ids = {
        "rational_add_sub", "rational_mul_div", "rational_power", "monomial_eval"
    }

    units_out = []
    topics_out = []

    for unit_id, term, index, title, topic_specs in UNITS_G7:
        topic_ids = []
        for spec in topic_specs:
            tid, ttitle, pedagogy, deps = spec[0], spec[1], spec[2], spec[3]
            fluency_track = spec[4] if len(spec) > 4 else None

            has_practice = tid in practice_ids
            has_fluency = fluency_track in fluency_track_ids if fluency_track else False
            status = "ready" if (has_practice or has_fluency) else "coming_soon"

            topic = {
                "id": tid,
                "unitId": unit_id,
                "title": ttitle,
                "pedagogy": pedagogy,
                "dependsOn": deps,
                "status": status,
            }
            if fluency_track:
                topic["fluencyTrackId"] = fluency_track
            if has_practice:
                topic["problemSetId"] = tid

            topics_out.append(topic)
            topic_ids.append(tid)

        units_out.append({
            "id": unit_id,
            "term": term,
            "index": index,
            "title": title,
            "topicIds": topic_ids,
        })

    return {
        "textbook": "人教版",
        "grade": 7,
        "units": units_out,
        "topics": topics_out,
    }


# ═══════════════════════════════════════════════════════════════════════════
# MAIN: generate all three files
# ═══════════════════════════════════════════════════════════════════════════

def main():
    # ── 1. Fluency pack ───────────────────────────────────────────────────
    fluency = build_fluency_pack()
    fluency_path = os.path.join(CONTENT_DIR, "grade7_math_fluency_pack.json")
    with open(fluency_path, "w", encoding="utf-8") as f:
        json.dump(fluency, f, ensure_ascii=False, indent=2)
        f.write("\n")

    n_facts = sum(len(lv["new_facts"]) for t in fluency["tracks"] for lv in t["levels"])
    print(f"wrote {fluency_path}")
    print(f"  tracks={len(fluency['tracks'])}  facts={n_facts}")
    for t in fluency["tracks"]:
        print(f"  - {t['trackId']:22s} enabled={t['enabled']!s:5s}  levels={len(t['levels'])}")

    # ── 2. Practice pack ──────────────────────────────────────────────────
    practice = build_practice_pack()
    practice_path = os.path.join(CONTENT_DIR, "grade7_practice_pack.json")
    with open(practice_path, "w", encoding="utf-8") as f:
        json.dump(practice, f, ensure_ascii=False, indent=2)
        f.write("\n")

    tiers = {B: 0, C: 0, X: 0}
    for s in practice["sets"]:
        for p in s["problems"]:
            tiers[p.get("difficulty", C)] += 1
    n_probs = sum(len(s["problems"]) for s in practice["sets"])
    print(f"\nwrote {practice_path}")
    print(f"  sets={len(practice['sets'])}  problems={n_probs}  tiers={tiers}")

    # ── 3. Knowledge map ──────────────────────────────────────────────────
    kmap = build_knowledge_map(practice)
    kmap_path = os.path.join(CONTENT_DIR, "grade7_knowledge_map.json")
    with open(kmap_path, "w", encoding="utf-8") as f:
        json.dump(kmap, f, ensure_ascii=False, indent=2)
        f.write("\n")

    ready = [t for t in kmap["topics"] if t["status"] == "ready"]
    by_ped: dict = {}
    for t in kmap["topics"]:
        by_ped[t["pedagogy"]] = by_ped.get(t["pedagogy"], 0) + 1
    print(f"\nwrote {kmap_path}")
    print(f"  units={len(kmap['units'])}  topics={len(kmap['topics'])}  ready={len(ready)}")
    print(f"  pedagogy: {by_ped}")


if __name__ == "__main__":
    main()
    # 题目来源标注: 写完 practice+knowledge_map 后,从 km 自动推导 source
    from source_tags import tag_practice_file
    _n, _u = tag_practice_file(7)
    print(f"source-tagged {_n} problems (grade 7)" + (f"  UNMAPPED {_u}" if _u else ""))
