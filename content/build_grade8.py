#!/usr/bin/env python3
"""Grade-8 content generator (人教版八年级数学).

Produces THREE JSON files in one run:
  grade8_math_fluency_pack.json
  grade8_practice_pack.json
  grade8_knowledge_map.json

    python3 content/build_grade8.py

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
# Track 1: power_rules  幂的运算法则口算 → 整数指数
# 题型: a^m · a^n = a^(m+n), 求指数和 / 幂的幂 / 同底数除法
# 每题答案均为整数(指数或具体数值)
# ---------------------------------------------------------------------------
# Level A: 同底数幂的乘法 — 求指数和
POWER_MUL_A = [
    # (base_text, m, n, answer=m+n)
    ("a", 2, 3, 5),    # a^2 · a^3 = a^5  → 5
    ("x", 1, 4, 5),    # x^1 · x^4 = x^5  → 5
    ("b", 3, 3, 6),    # b^3 · b^3 = b^6  → 6
    ("y", 2, 2, 4),    # y^2 · y^2 = y^4  → 4
]
POWER_MUL_B = [
    ("a", 3, 4, 7),    # a^3 · a^4 = a^7  → 7
    ("x", 5, 2, 7),    # x^5 · x^2 = x^7  → 7
    ("m", 4, 4, 8),    # m^4 · m^4 = m^8  → 8
    ("n", 6, 3, 9),    # n^6 · n^3 = n^9  → 9
]
# Level C: 幂的幂 — 求指数积
POWER_POW_C = [
    # (base_text, m, n, answer=m*n)
    ("a", 2, 3, 6),    # (a^2)^3 = a^6   → 6
    ("x", 3, 2, 6),    # (x^3)^2 = x^6   → 6
    ("b", 4, 2, 8),    # (b^4)^2 = b^8   → 8
    ("y", 2, 5, 10),   # (y^2)^5 = y^10  → 10
]
# Level D: 具体数值计算 — 2^n 直接求值
POWER_VAL_D = [
    # (base, exp, answer)
    (2, 3,  8),    # 2^3 = 8
    (2, 4, 16),    # 2^4 = 16
    (3, 2,  9),    # 3^2 = 9
    (5, 2, 25),    # 5^2 = 25
]
# Level E: 同底数幂的除法 — 求指数差
POWER_DIV_E = [
    # (base_text, m, n, answer=m-n)
    ("a", 7, 3, 4),    # a^7 / a^3 = a^4  → 4
    ("x", 9, 4, 5),    # x^9 / x^4 = x^5  → 5
    ("b", 8, 5, 3),    # b^8 / b^5 = b^3  → 3
    ("m", 6, 2, 4),    # m^6 / m^2 = m^4  → 4
]
# Level F: 积的幂 & 混合 — 求指数
POWER_MIX_F = [
    # (base_text, m, n, answer)  type: (a^m)^n + mult → exponent
    ("x", 3, 4, 12),   # (x^3)^4 = x^12  → 12
    ("a", 5, 3, 15),   # (a^5)^3 = a^15  → 15
    ("b", 2, 6, 12),   # (b^2)^6 = b^12  → 12
    ("y", 4, 3, 12),   # (y^4)^3 = y^12  → 12
]

POWER_LEVELS_DATA = [
    ("mul", POWER_MUL_A),
    ("mul", POWER_MUL_B),
    ("pow", POWER_POW_C),
    ("val", POWER_VAL_D),
    ("div", POWER_DIV_E),
    ("pow", POWER_MIX_F),
]


def _power_fact(kind, row, level_letter):
    if kind == "mul":
        base, m, n, ans = row
        assert m + n == ans, f"FAIL mul: {base}^{m}·{base}^{n} != {ans}"
        fid = f"pow_mul_{base}{m}p{n}"
        prompt = f"{base}^{m} · {base}^{n} = {base}^?  (填指数)"
        return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}
    elif kind == "pow":
        base, m, n, ans = row
        assert m * n == ans, f"FAIL pow: ({base}^{m})^{n} != {ans}"
        fid = f"pow_pow_{base}{m}q{n}"
        prompt = f"({base}^{m})^{n} = {base}^?  (填指数)"
        return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}
    elif kind == "val":
        base, exp, ans = row
        assert base ** exp == ans, f"FAIL val: {base}^{exp} != {ans}"
        fid = f"pow_val_{base}e{exp}"
        prompt = f"{base}^{exp} = ?"
        return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "fact_recall"}
    else:  # div
        base, m, n, ans = row
        assert m - n == ans, f"FAIL div: {base}^{m}/{base}^{n} != {ans}"
        fid = f"pow_div_{base}{m}m{n}"
        prompt = f"{base}^{m} ÷ {base}^{n} = {base}^?  (填指数)"
        return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}


def build_power_levels():
    levels = []
    for i, (kind, rows) in enumerate(POWER_LEVELS_DATA):
        facts = [_power_fact(kind, row, LEVEL_LETTERS[i]) for row in rows]
        levels.append({"level": LEVEL_LETTERS[i], "new_facts": facts})
    return levels


# ---------------------------------------------------------------------------
# Track 2: pythagorean_triple  勾股定理整数边口算
# 已知两边求第三边, 答案为整数 (勾股数组)
# ---------------------------------------------------------------------------
# (a, b, c, unknown, answer)  — a^2+b^2=c^2
# unknown: 'c'=求斜边, 'a'=求直角边
PYTH_A = [
    (3, 4, 5, "c", 5),    # 3²+4²=5²  → c=5
    (6, 8, 10, "c", 10),  # 6²+8²=10² → c=10
    (5, 12, 13, "c", 13), # 5²+12²=13²→ c=13
    (8, 15, 17, "c", 17), # 8²+15²=17²→ c=17
]
PYTH_B = [
    (9, 12, 15, "c", 15),  # 9²+12²=15²
    (3, 4, 5, "a", 3),    # ?²+4²=5²  → a=3
    (5, 12, 13, "a", 5),  # ?²+12²=13²→ a=5
    (6, 8, 10, "a", 6),   # ?²+8²=10² → a=6
]
PYTH_C = [
    (20, 21, 29, "c", 29),  # 20²+21²=400+441=841=29²
    (7, 24, 25, "c", 25),   # 7²+24²=49+576=625=25²
    (9, 40, 41, "c", 41),   # 9²+40²=81+1600=1681=41²
    (10, 24, 26, "c", 26),  # 10²+24²=100+576=676=26²
]
PYTH_D = [
    (8, 15, 17, "a", 8),    # ?²+15²=17² → 64=225? no: 17²-15²=289-225=64 → 8
    (7, 24, 25, "a", 7),    # ?²+24²=25² → 625-576=49 → 7
    (20, 21, 29, "a", 20),  # ?²+21²=29² → 841-441=400 → 20
    (10, 24, 26, "a", 10),  # ?²+24²=26² → 676-576=100 → 10
]

PYTH_LEVELS = [PYTH_A, PYTH_B, PYTH_C, PYTH_D]


def _pyth_fact(a, b, c, unknown, ans):
    # verify
    assert a * a + b * b == c * c, f"FAIL pythagorean: {a}^2+{b}^2!={c}^2"
    if unknown == "c":
        import math
        computed = int(math.isqrt(a * a + b * b))
        assert computed == ans, f"FAIL: sqrt({a}^2+{b}^2)={computed} != {ans}"
        fid = f"pyth_{a}_{b}_c"
        prompt = f"直角三角形两直角边为 {a} 和 {b},斜边 = ?"
    else:
        import math
        computed = int(math.isqrt(c * c - b * b))
        assert computed == ans, f"FAIL: sqrt({c}^2-{b}^2)={computed} != {ans}"
        fid = f"pyth_{b}_{c}_a"
        prompt = f"直角三角形斜边为 {c},一直角边为 {b},另一直角边 = ?"
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "fact_recall"}


def build_pyth_levels():
    levels = []
    for i, specs in enumerate(PYTH_LEVELS):
        facts = [_pyth_fact(a, b, c, u, ans) for (a, b, c, u, ans) in specs]
        levels.append({"level": LEVEL_LETTERS[i], "new_facts": facts})
    return levels


# ---------------------------------------------------------------------------
# Track 3: linear_func_val  一次函数求函数值 → 整数
# y = kx + b, x 代整数 → y 为整数
# ---------------------------------------------------------------------------
# (k, b, x, y_answer)
LINFUNC_A = [
    (2, 1, 3, 7),    # y=2×3+1=7
    (3, 0, 4, 12),   # y=3×4=12
    (1, 5, 6, 11),   # y=1×6+5=11
    (4, 2, 2, 10),   # y=4×2+2=10
]
LINFUNC_B = [
    (2, -1, 5, 9),   # y=2×5-1=9
    (3, 4, 3, 13),   # y=3×3+4=13
    (-1, 6, 4, 2),   # y=-1×4+6=2
    (5, -3, 2, 7),   # y=5×2-3=7
]
LINFUNC_C = [
    (-2, 10, 3, 4),  # y=-2×3+10=4
    (3, -5, 4, 7),   # y=3×4-5=7
    (4, -6, 3, 6),   # y=4×3-6=6
    (-3, 15, 4, 3),  # y=-3×4+15=3
]
LINFUNC_D = [
    (2, 3, -4, -5),  # y=2×(-4)+3=-5
    (5, -10, 3, 5),  # y=5×3-10=5
    (-4, 12, 2, 4),  # y=-4×2+12=4
    (6, -6, 2, 6),   # y=6×2-6=6
]

LINFUNC_LEVELS = [LINFUNC_A, LINFUNC_B, LINFUNC_C, LINFUNC_D]


def _linfunc_fact(k, b, x, ans):
    computed = k * x + b
    assert computed == ans, f"FAIL linfunc: {k}*{x}+{b}={computed} != {ans}"
    if b >= 0:
        func_str = f"y = {k}x + {b}" if b != 0 else f"y = {k}x"
    else:
        func_str = f"y = {k}x - {abs(b)}"
    fid = f"lf_k{k}_b{b}_x{x}".replace("-", "n")
    prompt = f"{func_str},当 x = {x} 时,y = ?"
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}


def build_linfunc_levels():
    levels = []
    for i, specs in enumerate(LINFUNC_LEVELS):
        facts = [_linfunc_fact(k, b, x, a) for (k, b, x, a) in specs]
        levels.append({"level": LEVEL_LETTERS[i], "new_facts": facts})
    return levels


# ---------------------------------------------------------------------------
# Track 4: triangle_angles  三角形内角和 / 外角口算 → 整数(度数)
# ---------------------------------------------------------------------------
# (a, b, c_answer) 三内角 a+b+?=180
TRIANGLE_A = [
    (60, 60, 60),    # 等边三角形
    (90, 45, 45),    # 直角等腰
    (30, 60, 90),    # 30-60-90
    (40, 70, 70),    # 等腰
]
TRIANGLE_B = [
    (35, 75, 70),    # 35+75+70=180
    (50, 80, 50),    # 50+80+50=180
    (25, 130, 25),   # 25+130+25=180
    (90, 55, 35),    # 90+55+35=180
]
# Level C: 外角 = 两不相邻内角之和
# (a, b, exterior_answer = a+b)
TRIANGLE_EXT_C = [
    (40, 60, 100),   # 外角=40+60=100
    (35, 75, 110),   # 外角=35+75=110
    (30, 80, 110),   # 外角=30+80=110
    (45, 55, 100),   # 外角=45+55=100
]
TRIANGLE_EXT_D = [
    (50, 70, 120),   # 外角=50+70=120
    (25, 65, 90),    # 外角=25+65=90
    (40, 75, 115),   # 外角=40+75=115
    (30, 55, 85),    # 外角=30+55=85
]

TRIANGLE_LEVELS_DATA = [
    ("interior", TRIANGLE_A),
    ("interior", TRIANGLE_B),
    ("exterior", TRIANGLE_EXT_C),
    ("exterior", TRIANGLE_EXT_D),
]


def _triangle_fact(kind, row):
    if kind == "interior":
        a, b, ans = row
        assert a + b + ans == 180, f"FAIL interior: {a}+{b}+{ans}!=180"
        fid = f"tri_int_{a}_{b}"
        prompt = f"三角形两内角分别为 {a}° 和 {b}°,第三个内角 = ?°"
    else:
        a, b, ans = row
        assert a + b == ans, f"FAIL exterior: {a}+{b}!={ans}"
        fid = f"tri_ext_{a}_{b}"
        prompt = f"三角形某外角的两个不相邻内角为 {a}° 和 {b}°,该外角 = ?°"
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "fact_recall"}


def build_triangle_levels():
    levels = []
    for i, (kind, rows) in enumerate(TRIANGLE_LEVELS_DATA):
        facts = [_triangle_fact(kind, row) for row in rows]
        levels.append({"level": LEVEL_LETTERS[i], "new_facts": facts})
    return levels


# ---------------------------------------------------------------------------
# Track 5: mean_median  整数数据集的平均数/中位数口算
# ---------------------------------------------------------------------------
# (data_list, type, answer)  type: 'mean' or 'median'
STATS_A = [
    ([2, 4, 6, 8], "mean", 5),            # (2+4+6+8)/4=20/4=5
    ([1, 3, 5, 7, 9], "median", 5),       # 排序后中间=5
    ([10, 20, 30], "mean", 20),            # 60/3=20
    ([3, 5, 7], "median", 5),              # 中间=5
]
STATS_B = [
    ([4, 6, 8, 10, 12], "mean", 8),       # 40/5=8
    ([1, 2, 3, 4, 5], "median", 3),       # 中间=3
    ([4, 8, 12, 16], "mean", 10),           # 40/4=10
    ([6, 8, 10, 12, 14], "median", 10),   # 中间=10
]
STATS_C = [
    ([12, 14, 16, 18, 20], "mean", 16),   # 80/5=16
    ([3, 5, 7, 9, 11], "median", 7),      # 中间=7
    ([10, 20, 30, 40], "mean", 25),        # 100/4=25
    ([2, 4, 6, 8, 10], "median", 6),      # 中间(4+6)/2? 奇数个用中间值
]
STATS_D = [
    ([6, 7, 8, 9, 10], "mean", 8),        # 40/5=8
    ([1, 3, 5, 7, 9, 11], "median", 6),   # (5+7)/2=6
    ([4, 8, 12, 16], "mean", 10),          # 40/4=10
    ([2, 4, 6, 8, 10, 12], "median", 7),  # (6+8)/2=7
]

STATS_LEVELS = [STATS_A, STATS_B, STATS_C, STATS_D]


def _stats_fact(data, kind, ans, level_idx):
    # fid 必须全局唯一; 同一组数据可能出现在不同 level(如 [4,8,12,16] 同时在 B/D),
    # 用 level_idx 前缀消歧,否则 validatePack 会因 duplicate fact id 报错
    data_s = sorted(data)
    n = len(data_s)
    if kind == "mean":
        computed = sum(data_s) // n
        assert sum(data_s) % n == 0, f"FAIL mean not integer: {data}"
        assert computed == ans, f"FAIL mean: sum={sum(data_s)}/n={n}={computed} != {ans}"
        fid = f"stat_mean_l{level_idx}_" + "_".join(str(x) for x in data)
        prompt = f"数据 {data},平均数 = ?"
    else:  # median
        if n % 2 == 1:
            computed = data_s[n // 2]
        else:
            assert (data_s[n // 2 - 1] + data_s[n // 2]) % 2 == 0, f"FAIL median not int: {data}"
            computed = (data_s[n // 2 - 1] + data_s[n // 2]) // 2
        assert computed == ans, f"FAIL median: {data_s} median={computed} != {ans}"
        fid = f"stat_med_l{level_idx}_" + "_".join(str(x) for x in data)
        prompt = f"数据 {data},中位数 = ?"
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}


def build_stats_levels():
    levels = []
    for i, specs in enumerate(STATS_LEVELS):
        facts = [_stats_fact(d, k, a, i) for (d, k, a) in specs]
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
            "trackId": "power_rules",
            "name": "幂的运算法则口算",
            "enabled": True,
            "levels": build_power_levels(),
        },
        {
            "trackId": "pythagorean_triple",
            "name": "勾股定理整数边口算",
            "enabled": True,
            "levels": build_pyth_levels(),
        },
        {
            "trackId": "linear_func_val",
            "name": "一次函数求值口算",
            "enabled": True,
            "levels": build_linfunc_levels(),
        },
        {
            "trackId": "triangle_angles",
            "name": "三角形内角和与外角口算",
            "enabled": True,
            "levels": build_triangle_levels(),
        },
        {
            "trackId": "mean_median",
            "name": "平均数与中位数口算",
            "enabled": True,
            "levels": build_stats_levels(),
        },
    ]

    non_drill_topics = [
        "congruent_triangle_proof",
        "factorization_common",
        "factorization_formula",
        "fraction_equation",
        "quadratic_radical_simplify",
        "parallelogram_properties",
        "linear_func_graph",
        "data_variance",
        "axial_symmetry",
        "isosceles_triangle",
    ]

    return {
        "version": "1.0.0",
        "grade": 8,
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


# ── 上册 U1: 三角形 ────────────────────────────────────────────────────────

def triangle_angle_sum():
    """三角形内角和与外角 — concept."""
    probs = [
        P_mc("tas_b0",
             "三角形内角和等于?",
             ["180°", "360°", "90°"],
             0, "三角形内角和定理", "三角形三个内角之和 = 180°", B),
        P_fill("tas_b1",
               "三角形两内角分别为 50° 和 70°,第三个内角 = ?°",
               60, "180 - 50 - 70", "180 - 50 - 70 = 60°", B),
        P_mc("tas_c0",
             "三角形的一个外角等于?",
             ["与它不相邻的两内角之和", "180° 减去这个内角", "与相邻内角相等"],
             0, "外角定理", "外角 = 两个不相邻内角之和", C),
        P_fill("tas_c1",
               "三角形某外角为 110°,其中一个不相邻内角为 45°,\n另一个不相邻内角 = ?°",
               65, "外角=两不相邻内角之和,110-45", "110 - 45 = 65°", C),
        P_mc("tas_x0",
             "等腰三角形顶角为 40°,底角各为?",
             ["70°", "80°", "60°"],
             0, "两底角相等,(180-40)÷2", "(180 - 40) ÷ 2 = 70°", X),
        P_steps("tas_x1",
                "如图,△ABC 中,∠A = 35°,∠B = 65°。\n求: (1) ∠C = ?° (2) ∠C 的外角 = ?°",
                [{"label": "∠C", "answer": "80"},
                 {"label": "∠C 的外角", "answer": "100"}],
                "内角和=180°,外角=两不相邻内角之和",
                "∠C = 180 - 35 - 65 = 80°; 外角 = 35 + 65 = 100°", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_fill("tas_b2",
               "三角形两内角分别为 40° 和 80°,第三个内角 = ?°",
               60, "180 − 40 − 80", "180 − 40 − 80 = 60°", B),
        P_fill("tas_b3",
               "三角形两内角分别为 55° 和 75°,第三个内角 = ?°",
               50, "180 − 55 − 75", "180 − 55 − 75 = 50°", B),
        P_mc("tas_b4",
             "三角形有且只有?个内角大于等于 90°",
             ["1", "2", "0"],
             0, "若有两个≥90°则内角和>180°", "三角形至多有一个钝角或直角", B),
        P_fill("tas_c2",
               "三角形某外角为 130°,其中一个不相邻内角为 70°,\n另一不相邻内角 = ?°",
               60, "130 − 70", "外角=两不相邻内角之和,130−70=60°", C),
        P_mc("tas_c3",
             "△ABC 三内角之比 ∠A:∠B:∠C = 2:3:4,则 ∠C = ?°",
             ["80°", "60°", "40°", "90°"],
             0, "2x+3x+4x=180°,x=20°,∠C=4×20°",
             "9x=180°,x=20°,∠C=80°", C),
        P_fill("tas_x2",
               "△ABC 的三个内角之比为 1:2:3,最大内角 = ?°",
               90, "x+2x+3x=180°,x=30°,最大角=3×30°=90°", "x=30°;最大角=90°", X),
        P_mc("tas_x3",
             "如图,直线 l∥m,△ABC 的顶点 A 在 l 上,BC 在 m 上。\n∠B=50°,∠C=60°,则∠A关于直线 l 所在的内角 = ?°",
             ["70°", "110°", "60°", "50°"],
             0, "平行线内错角,∠A=180−50−60=70°", "内角和180°,∠A=180−110=70°", X),
        P_mc("tas_x4",
             "等腰三角形顶角为 50°,底角的外角 = ?°",
             ["115°", "65°", "130°", "50°"],
             0, "底角=(180−50)÷2=65°,外角=180−65=115°", "(180−50)÷2=65°;外角=180−65=115°", X),
        P_fill("tas_b5",
               "三角形两内角分别为 30° 和 60°,第三个内角 = ?°",
               90, "180 − 30 − 60", "180 − 90 = 90°", B),
        P_fill("tas_c4",
               "三角形某外角为 95°,其中一个不相邻内角为 40°,另一不相邻内角 = ?°",
               55, "95 − 40", "外角=两不相邻内角之和,95−40=55°", C),
        P_mc("tas_x5",
             "△ABC 中,∠A:∠B:∠C = 1:1:2,则最大角 ∠C = ?°",
             ["90°", "60°", "120°"],
             0, "x+x+2x=4x=180°,x=45°,∠C=2×45=90°", "4x=180°,∠C=90°", X),
        P_fill("tas_b6",
               "三角形两内角分别为 25° 和 115°,第三个内角 = ?°",
               40, "180 − 25 − 115", "180 − 140 = 40°", B),
        P_mc("tas_c5",
             "三角形一个外角为 150°,与它不相邻的两内角之积是多少(两角为 70° 和 80°)?",
             ["5600", "150", "700"],
             0, "70×80=5600,仅验证外角:70+80=150✓", "70 × 80 = 5600", C),
        P_fill("tas_x6",
               "△ABC 中,∠B=∠C=50°,∠A 的外角 = ?°",
               100, "∠A=180−50−50=80°,外角=180−80=100°或=∠B+∠C=100°", "80°的外角=100°", X),
    ]
    return make_set("triangle_angle_sum", "三角形内角和与外角", "concept", probs)


def isosceles_triangle():
    """等腰三角形 — concept."""
    probs = [
        P_mc("iso_b0",
             "等腰三角形两底角的关系?",
             ["相等", "互补", "互余"],
             0, "等腰三角形底角相等", "底角相等", B),
        P_mc("iso_b1",
             "等腰三角形顶角平分线具有什么性质?",
             ["也是底边上的中线和高", "只是角平分线", "只是高"],
             0, "三线合一", "顶角平分线 = 底边中线 = 底边上的高(三线合一)", B),
        P_fill("iso_c0",
               "等腰三角形底角为 65°,顶角 = ?°",
               50, "顶角=180-65×2", "180 - 65 × 2 = 50°", C),
        P_mc("iso_c1",
             "等腰三角形一个角为 100°,另外两角各为?",
             ["40°", "80°", "50°"],
             0, "100°只能是顶角,(180-100)÷2=40°", "(180 - 100) ÷ 2 = 40°", C),
        P_mc("iso_x0",
             "等边三角形每个内角为?",
             ["60°", "90°", "45°"],
             0, "三角相等,180÷3", "180 ÷ 3 = 60°", X),
        P_mc("iso_x1",
             "等腰△ABC,AB = AC,∠A = 36°。求∠B,并判断△ABC 是否为锐角三角形。",
             ["∠B=72°,是锐角三角形", "∠B=72°,不是锐角三角形", "∠B=60°,是锐角三角形", "∠B=80°,是锐角三角形"],
             0, "底角=(180-36)÷2,三个角均小于90°则为锐角三角形",
             "∠B = ∠C = (180-36)÷2 = 72°;三角均<90°,是锐角三角形 | 步骤: ∠B=(180−36)÷2=72; 是否锐角三角形=是", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_fill("iso_b2",
               "等腰三角形底角为 75°,顶角 = ?°",
               30, "顶角 = 180 − 75 × 2", "180 − 150 = 30°", B),
        P_mc("iso_b3",
             "等腰三角形两腰相等,两腰分别称为?",
             ["腰", "底边", "高"],
             0, "等腰三角形的相等两边叫腰", "相等的两边叫腰,另一边叫底边", B),
        P_fill("iso_c2",
               "等腰三角形顶角为 100°,底角 = ?°",
               40, "底角 = (180 − 100) ÷ 2", "(180 − 100) ÷ 2 = 40°", C),
        P_mc("iso_c3",
             "等腰△PQR 中,PQ=PR,∠Q = 50°,则∠P = ?°",
             ["80°", "100°", "60°", "50°"],
             0, "∠P = 180 − 50 × 2", "180 − 100 = 80°", C),
        P_fill("iso_x2",
               "等腰三角形腰长为 5,底边为 6,底边上的高 = ?",
               4, "h = √(5² − 3²) = √16 = 4", "腰=5,底÷2=3,h=√(25−9)=4", X),
        P_mc("iso_x3",
             "等腰三角形腰长为 10,底边为 12,底边上的高 = ?",
             ["8", "6", "10", "4"],
             0, "h = √(10²−6²) = √(100−36) = √64 = 8", "√(100−36) = √64 = 8", X),
        P_fill("iso_b4",
               "等腰三角形腰长为 7,底边为 6,则周长 = ?",
               20, "周长=7+7+6=20", "7+7+6=20", B),
        P_mc("iso_c4",
             "等腰三角形有一个角为 80°,则顶角可能为?",
             ["20° 或 80°", "只能 80°", "只能 20°"],
             0, "80°可为顶角→底角=(180−80)/2=50°;或80°为底角→顶角=180−160=20°",
             "两种情况都合法", C),
        P_fill("iso_x4",
               "等腰△ABC,AB=AC=5,BC=8。BC 上的高 h = ?",
               3, "h=√(5²−4²)=√(25−16)=√9=3", "√(25−16)=3", X),
        P_mc("iso_b5",
             "等腰三角形的顶角平分线垂直于底边,这说明?",
             ["顶角平分线是底边的高", "顶角平分线不是中线", "顶角与底边不相关"],
             0, "三线合一:顶角平分线=底边中线=底边高", "顶角平分线是底边上的高(三线合一)", B),
        P_fill("iso_c5",
               "等腰三角形底角为 55°,底边上的两底角各为 ?°",
               55, "等腰三角形底角相等", "两底角均为 55°", C),
        P_mc("iso_x5",
             "等腰△ABC 中,AB=AC=13,BC=10。AB 上的高 = ?",
             # 高落在BC上:h=√(13²-5²)=√(169-25)=√144=12
             ["12", "10", "5"],
             0, "h=√(13²−5²)=√144=12", "√144=12", X),
        P_fill("iso_b6",
               "等腰三角形顶角为 120°,底角 = ?°",
               30, "底角=(180−120)÷2=30°", "(180−120)÷2=30°", B),
        P_mc("iso_c6",
             "等边三角形边长为 4,周长 = ?",
             ["12", "8", "16"],
             0, "三边相等,周长=4×3=12", "4×3=12", C),
    ]
    return make_set("isosceles_triangle", "等腰三角形", "concept", probs)


# ── 上册 U2: 全等三角形 ────────────────────────────────────────────────────

def congruent_triangle_concept():
    """全等三角形判定条件 — concept."""
    probs = [
        P_mc("ctc_b0",
             "全等三角形对应边和对应角的关系?",
             ["对应边相等,对应角相等", "只有对应边相等", "只有对应角相等"],
             0, "全等 = 完全重合", "全等三角形:对应边相等,对应角相等", B),
        P_mc("ctc_b1",
             "三角形全等的判定定理 SSS 是指?",
             ["三边对应相等", "两边夹角相等", "两角夹边相等"],
             0, "S=边(Side)", "SSS:三组边对应相等", B),
        P_mc("ctc_c0",
             "已知 AB=DE,BC=EF,∠B=∠E,这满足哪个判定?",
             ["SAS(两边夹角)", "ASA(两角夹边)", "AAS(两角对边)"],
             0, "边-角-边(夹角在两边之间)", "SAS:两边夹角相等", C),
        P_mc("ctc_c1",
             "下列不能判定两三角形全等的是?",
             ["AAA(三角对应相等)", "SSS", "ASA"],
             0, "三角相等只能保证相似不能保证全等", "AAA 只保证相似,不能判定全等", C),
        P_mc("ctc_x0",
             "△ABC 与 △DEF 中,AB=DE=5,AC=DF=7,∠A=∠D=60°。\n用哪个判定方法可证 △ABC≅△DEF？",
             ["SAS", "ASA", "SSS", "AAS"],
             0, "AB=DE,AC=DF,夹角∠A=∠D",
             "两边 AB=DE,AC=DF 且夹角∠A=∠D,由 SAS 得 △ABC≅△DEF | 步骤: 判定依据=SAS; 结论=△ABC≅△DEF", X),
        P_mc("ctc_x1",
             "△ABC≅△DEF(对应顺序),则 ∠C 对应的角是?",
             ["∠F", "∠D", "∠E"],
             0, "第三个字母对应第三个字母", "C↔F,对应角为∠F", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_mc("ctc_b2",
             "三角形全等的判定定理 SAS 是指?",
             ["两边夹角对应相等", "三边对应相等", "两角夹边对应相等"],
             0, "S=边,A=角,SAS=两边夹一角", "SAS:两边及其夹角对应相等", B),
        P_mc("ctc_b3",
             "三角形全等的判定定理 ASA 是指?",
             ["两角夹边对应相等", "两边夹角对应相等", "三角对应相等"],
             0, "A=角,S=边,ASA=两角夹一边", "ASA:两角及其夹边对应相等", B),
        P_mc("ctc_c2",
             "已知 ∠A=∠D,∠B=∠E,AB=DE,这满足哪个判定?",
             ["ASA(两角夹边)", "AAS(两角对边)", "SAS(两边夹角)"],
             0, "∠A-AB-∠B,边AB是夹边", "两角∠A,∠B 的夹边 AB=DE,ASA", C),
        P_mc("ctc_c3",
             "已知 ∠A=∠D,∠B=∠E,BC=EF(BC 是 ∠B 对应的对边),满足?",
             ["AAS(两角一对边)", "ASA(两角夹边)", "SSS(三边)"],
             0, "AAS:两角及其中一角的对边", "∠A=∠D,∠B=∠E,∠B的对边BC=EF,AAS", C),
        P_fill("ctc_x2",
               "△ABC≅△PQR,AB=6,PQ=6,BC=8,则 QR = ?",
               8, "全等三角形对应边相等,BC对应QR", "BC = QR = 8", X),
        P_mc("ctc_x3",
             "△ABC 中,AB=AC,D 是 BC 中点,△ABD 和 △ACD 的关系?",
             ["全等(SSS)", "相似非全等", "不确定"],
             0, "AB=AC,BD=CD,AD公共边,SSS", "三组边对应相等,SSS→△ABD≅△ACD", X),
        P_mc("ctc_x4",
             "下列信息能判定 △ABC≅△DEF 的是?",
             ["AB=DE,BC=EF,∠B=∠E", "AB=DE,∠A=∠D,∠C=∠F", "∠A=∠D,∠B=∠E,∠C=∠F"],
             0, "第一项:两边夹角(SAS);第二项AAS但需检验;第三项只保证相似",
             "AB=DE,BC=EF,∠B=∠E:两边夹角SAS成立", X),
        P_mc("ctc_b4",
             "直角三角形全等还有哪个特殊判定?",
             ["HL(斜边和一直角边)", "只用SSS", "只用SAS"],
             0, "直角三角形:HL斜边直角边", "HL:斜边和一条直角边相等→全等", B),
        P_mc("ctc_c4",
             "△ABC≅△DEF,∠A=50°,∠B=70°,则 ∠F = ?°",
             ["60°", "50°", "70°"],
             0, "∠C=180−50−70=60°,∠F=∠C=60°", "∠C=60°,∠F=∠C=60°", C),
        P_fill("ctc_x5",
               "△ABC≅△PQR,AB=8,PQ=8,∠A=40°,则 ∠P = ?°",
               40, "全等三角形对应角相等,∠P=∠A=40°", "∠P = ∠A = 40°", X),
    ]
    return make_set("congruent_triangle_concept", "全等三角形判定", "concept", probs)


def congruent_triangle_proof():
    """全等三角形证明 — procedure (steps)."""
    probs = [
        P_mc("ctp_b0",
             "已知:△ABC 中,D 是 BC 中点,AD⊥BC。\n用哪个判定定理可证 AB = AC？",
             ["SAS", "ASA", "AAS", "SSS"],
             0, "中点 BD=DC,AD 公共边,∠ADB=∠ADC=90°",
             "BD=DC(D为中点),AD=AD(公共边),∠ADB=∠ADC=90°,SAS→△ADB≅△ADC→AB=AC | 步骤: ①选取全等三角形对=△ADB和△ADC; ②公共边=AD; ③判定定理=SAS; ④结论=AB=AC", B),
        P_mc("ctp_b1",
             "证全等时,'公共边 AB = AB' 用什么依据?",
             ["公共边相等", "对称性", "平行线性质"],
             0, "同一条边等于自身", "公共边:同一条线段,AB = AB", B),
        P_mc("ctp_c0",
             "如图,AB∥CD,M 是 AC 的中点。\n已知 AB∥CD,AM=CM,∠BAM=∠DCM。\n可证哪两个三角形全等？",
             ["△ABM≅△CDM", "△ABM≅△DCM", "△ACM≅△CDM", "△ADM≅△BCM"],
             0, "AB∥CD → 内错角相等,AM=CM,∠BAM=∠DCM",
             "AB∥CD → ∠ABM=∠CDM(内错角),AM=CM,∠BAM=∠DCM,ASA → △ABM≅△CDM | 步骤: ∠ABM与∠CDM的关系=相等(内错角); 判定定理=ASA; 全等结论=△ABM≅△CDM", C),
        P_mc("ctp_c1",
             "AAS 判定全等需要?",
             ["两角和其中一角对应的对边相等", "两角和夹边相等", "三边相等"],
             0, "AAS: Angle-Angle-Side(非夹边)", "两个角和其中一个角的对边:AAS", C),
        P_mc("ctp_x0",
             "已知:△ABC 中,∠BAC=90°,AB=AC,D 是 BC 中点,DE⊥AB 于 E,DF⊥AC 于 F。\n证 BE=CF 时,用哪个判定方法？",
             ["AAS", "SAS", "SSS", "ASA"],
             0, "等腰三角形底角相等∠B=∠C,∠BED=∠CFD=90°,BD=CD(中点)",
             "∠B=∠C(等腰底角),∠BED=∠CFD=90°,BD=CD(D为BC中点),AAS→△BDE≅△CDF→BE=CF | 步骤: ①选三角形对=△BDE和△CDF; ②相等的角1=∠B=∠C(等腰底角); ③相等的角2=∠BED=∠CFD=90°; ④相等的边=BD=CD(D为BC中点); ⑤判定=AAS", X),
        P_fill("ctp_x1",
               "△ABC≅△DEF,AB=5,DE=5,BC=7,则 EF = ?",
               7, "全等三角形对应边相等,BC对应EF", "BC = EF = 7", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_mc("ctp_b2",
             "证明两三角形全等时,'∠A=∠D(已知)' 是什么类型的依据?",
             ["已知条件", "定义推导", "公理"],
             0, "直接从题目条件得到", "题目直接给出的条件", B),
        P_mc("ctp_b3",
             "证明全等时,'BD=BD(公共边)' 的依据是?",
             ["公共边相等", "中点定理", "平行线性质"],
             0, "同一条边自身相等", "公共边:同一线段等于自身", B),
        P_mc("ctp_c2",
             "△ABC 中,AD 是 BC 边上的中线,则 BD = DC。\n△ABD 和 △ACD 用哪个判定可证全等?",
             ["SSS", "SAS", "ASA", "AAS"],
             0, "AB=AC需另给,实际只有BD=CD和AD公共,若再给AB=AC则SSS",
             "BD=CD(中线),AD=AD(公共边),AB=AC(等腰条件)→SSS | 步骤: BD=CD; AD=AD; AB=AC; 判定=SSS", C),
        P_fill("ctp_c3",
               "△ABC≅△DEF,∠A=70°,∠B=60°,则 ∠F = ?°",
               50, "∠C=180−70−60=50°,全等三角形∠C=∠F", "∠C=50°,∠F=∠C=50°", C),
        P_mc("ctp_b5",
             "△ABD≅△CBD,可以得到?",
             ["AB=CB,AD=CD", "只能得到角相等", "AB=CD"],
             0, "全等三角形对应边相等", "对应边AB=CB,AD=CD", B),
        P_mc("ctp_x2",
             "△ABC 和 △ADE 中,AB=AD,∠BAD=∠CAE=90°,AC=AE。\n用哪个判定证 △ABC≅△ADE？",
             ["SAS", "ASA", "SSS", "AAS"],
             0, "AB=AD,∠BAC=∠DAE(夹角均为90°),AC=AE,SAS",
             "两边AB=AD,AC=AE及夹角∠BAC=∠DAE=90°,SAS→△ABC≅△ADE", X),
        P_mc("ctp_x3",
             "下列步骤中写全等证明的正确格式是?",
             ["∵…∴△ABC≅△DEF(SAS)", "△ABC和△DEF全等", "∠A=∠D,∠B=∠E故全等"],
             0, "规范书写:∵条件∴结论(判定定理)", "规范格式: ∵ 列条件 ∴ △≅△(定理)", X),
        P_mc("ctp_b4",
             "全等三角形的面积关系?",
             ["相等", "不一定相等", "面积之比为1:2"],
             0, "全等三角形完全重合,面积相等", "全等三角形面积相等", B),
        P_fill("ctp_c4",
               "△ABC≅△DEF,∠A=35°,∠D=35°,∠E=80°,则 ∠B = ?°",
               80, "全等三角形对应角相等,∠B=∠E=80°", "∠B = ∠E = 80°", C),
        P_mc("ctp_x4",
             "△ABC 与 △DEF 中,∠A=∠D=90°,AB=DE,AC=DF。\n哪个判定可证全等？",
             ["SAS(∠A为夹角)", "ASA", "SSS"],
             0, "两边AB=DE,AC=DF,夹角∠A=∠D=90°,SAS", "两边及夹角均相等,SAS", X),
    ]
    return make_set("congruent_triangle_proof", "全等三角形证明", "procedure", probs)


# ── 上册 U3: 轴对称 ────────────────────────────────────────────────────────

def axial_symmetry():
    """轴对称 — concept."""
    probs = [
        P_mc("axs_b0",
             "轴对称图形的对称轴是?",
             ["折叠后两部分完全重合的直线", "图形的中心", "任意直线"],
             0, "折叠重合的直线", "使图形折叠后完全重合的直线", B),
        P_mc("axs_b1",
             "线段的垂直平分线上的点到线段两端点的距离?",
             ["相等", "不等", "不确定"],
             0, "垂直平分线性质", "垂直平分线上的点到两端点距离相等", B),
        P_mc("axs_c0",
             "等腰三角形有几条对称轴?",
             ["1 条", "3 条", "0 条"],
             0, "顶角平分线即对称轴", "等腰三角形有 1 条对称轴(顶角平分线)", C),
        P_fill("axs_c1",
               "点 P(3, -2) 关于 x 轴的对称点坐标 y = ?",
               2, "x 轴对称:x 不变,y 取相反数", "对称点为 (3, 2),y = 2", C),
        P_mc("axs_x0",
             "正方形有几条对称轴?",
             ["4 条", "2 条", "无数条"],
             0, "两对角线+两对边中线", "正方形有 4 条对称轴", X),
        P_fill("axs_x1",
               "点 A(-4, 3) 关于 y 轴的对称点 x 坐标 = ?",
               4, "y 轴对称:x 取相反数,y 不变", "对称点 (4, 3),x = 4", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_mc("axs_b2",
             "正三角形(等边三角形)有几条对称轴?",
             ["3 条", "1 条", "6 条"],
             0, "三条高即三条对称轴", "等边三角形有3条对称轴(每条高)", B),
        P_mc("axs_b3",
             "关于直线 l 对称的两个图形,对应点到 l 的距离?",
             ["相等", "不等", "不确定"],
             0, "轴对称定义:对应点到对称轴距离相等", "对应点到对称轴距离相等", B),
        P_fill("axs_c2",
               "点 P(5, -3) 关于 x 轴的对称点坐标,y 坐标 = ?",
               3, "x 轴对称:y 取相反数", "对称点为 (5, 3),y = 3", C),
        P_mc("axs_c3",
             "点 A(2, 3) 关于原点的对称点坐标是?",
             ["(-2, -3)", "(2, -3)", "(-2, 3)"],
             0, "原点对称:x, y 均取反", "对称点 (-2, -3)", C),
        P_fill("axs_x2",
               "点 B(-6, 4) 关于 y 轴的对称点坐标 x = ?",
               6, "y 轴对称:x 取相反数", "对称点 (6, 4),x = 6", X),
        P_mc("axs_x3",
             "矩形有几条对称轴?",
             ["2 条", "4 条", "1 条"],
             0, "矩形两组对边的中线各为对称轴", "矩形有2条对称轴(两对边的垂直平分线)", X),
        P_mc("axs_x4",
             "线段 AB 的垂直平分线上的点 P 满足?",
             ["PA = PB", "PA > PB", "PA < PB"],
             0, "垂直平分线上点到两端点距离相等", "PA = PB", X),
        P_mc("axs_b4",
             "点 P(2, 5) 关于 x 轴的对称点坐标是?",
             ["(2, −5)", "(−2, 5)", "(−2, −5)"],
             0, "x不变,y取反", "(2, −5)", B),
        P_mc("axs_c4",
             "点 A(3, −4) 关于 y 轴对称点坐标是?",
             ["(−3, −4)", "(3, 4)", "(−3, 4)"],
             0, "x取反,y不变", "(−3, −4)", C),
        P_fill("axs_x5",
               "点 C(−5, 2) 关于原点对称的点 x 坐标 = ?",
               5, "原点对称:x, y 均取反", "对称点(5, −2),x=5", X),
        P_mc("axs_b5",
             "菱形有几条对称轴?",
             ["2 条", "4 条", "1 条"],
             0, "菱形两对角线各为对称轴", "菱形有2条对称轴(两条对角线所在直线)", B),
        P_fill("axs_c5",
               "点 D(0, −7) 关于 x 轴的对称点 y 坐标 = ?",
               7, "x轴对称:y取反", "对称点(0, 7),y=7", C),
        P_mc("axs_x6",
             "等腰三角形的对称轴是?",
             ["顶角平分线(也是底边中线和高)", "底边", "底角平分线"],
             0, "三线合一的线即对称轴", "顶角平分线=底边中线=底边高,是对称轴", X),
    ]
    return make_set("axial_symmetry", "轴对称", "concept", probs)


# ── 上册 U4: 整式的乘法与因式分解 ──────────────────────────────────────────

def power_rules_practice():
    """幂的运算 — procedure."""
    probs = [
        P_fill("prp_b0", "a^3 · a^4 = a^?  (填指数)", 7,
               "同底数幂相乘,指数相加", "3 + 4 = 7", B),
        P_fill("prp_b1", "(a^3)^4 = a^?  (填指数)", 12,
               "幂的幂,指数相乘", "3 × 4 = 12", B),
        P_fill("prp_c0", "2^3 × 2^4 = 2^? (填指数)", 7,
               "同底数幂相乘,指数相加", "3 + 4 = 7", C),
        P_mc("prp_c1",
             "(3a^2)^3 展开等于?",
             ["27a^6", "9a^6", "27a^5"],
             0, "(3)^3=27,指数×3", "3^3 × a^(2×3) = 27a^6", C),
        P_fill("prp_x0", "a^8 ÷ a^3 = a^?  (填指数)", 5,
               "同底数幂相除,指数相减", "8 - 3 = 5", X),
        P_mc("prp_x1",
             "(2x^2y)^3 = ?",
             ["8x^6y^3", "6x^6y^3", "8x^5y^3"],
             0, "2^3=8,x指数×3,y指数×3", "2^3 · x^6 · y^3 = 8x^6y^3", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_fill("prp_b2", "x^5 · x^3 = x^?  (填指数)", 8,
               "同底数幂相乘,指数相加", "5 + 3 = 8", B),
        P_fill("prp_b3", "(x^4)^2 = x^?  (填指数)", 8,
               "幂的幂,指数相乘", "4 × 2 = 8", B),
        P_mc("prp_c2",
             "(-2a^3)^2 = ?",
             ["4a^6", "-4a^6", "4a^5"],
             0, "(-2)^2=4,(a^3)^2=a^6", "(-2)^2 · a^(3×2) = 4a^6", C),
        P_fill("prp_c3", "a^10 ÷ a^4 = a^?  (填指数)", 6,
               "同底数幂相除,指数相减", "10 − 4 = 6", C),
        P_mc("prp_x2",
             "(3a^2b^3)^2 = ?",
             ["9a^4b^6", "9a^4b^5", "6a^4b^6"],
             0, "3^2=9,(a^2)^2=a^4,(b^3)^2=b^6", "9a^4b^6", X),
        P_fill("prp_x3", "3^2 × 3^3 = 3^?  (填指数)", 5,
               "同底数幂相乘,指数相加", "2 + 3 = 5", X),
        P_mc("prp_x4",
             "化简 (a^2)^3 · a^2 = ?",
             ["a^8", "a^6", "a^7"],
             0, "(a^2)^3=a^6,a^6·a^2=a^8", "a^6 · a^2 = a^8", X),
        P_fill("prp_b4", "y^6 ÷ y^2 = y^?  (填指数)", 4,
               "同底数幂相除,指数相减", "6 − 2 = 4", B),
        P_mc("prp_c4",
             "(-a^3)^2 = ?",
             ["a^6", "−a^6", "a^5"],
             0, "(-1)^2=1,(a^3)^2=a^6", "(−1)^2·a^6=a^6", C),
        P_mc("prp_x5",
             "化简 (ab)^3 · b^2 = ?",
             ["a^3b^5", "a^3b^3", "ab^5"],
             0, "(ab)^3=a^3b^3,再乘b^2得a^3b^5", "a^3·b^3·b^2=a^3b^5", X),
        P_fill("prp_b5", "m^9 ÷ m^5 = m^?  (填指数)", 4,
               "同底数幂相除,指数相减", "9 − 5 = 4", B),
        P_mc("prp_c5",
             "化简 (2x)^4 = ?",
             ["16x^4", "8x^4", "2x^4"],
             0, "2^4=16,x^4,结果16x^4", "16x^4", C),
    ]
    return make_set("power_rules_practice", "幂的运算", "procedure", probs)


def factorization_common():
    """提公因式法因式分解 — procedure."""
    probs = [
        P_mc("fcm_b0",
             "提取公因式:6a + 9 = ?",
             ["3(2a + 3)", "3(2a + 9)", "6(a + 3/2)"],
             0, "公因数为3", "6a + 9 = 3(2a + 3)", B),
        P_mc("fcm_b1",
             "提取公因式:4x^2 - 8x = ?",
             ["4x(x - 2)", "4(x^2 - 2x)", "2x(2x - 4)"],
             0, "公因式为 4x", "4x · x - 4x · 2 = 4x(x - 2)", B),
        P_mc("fcm_c0",
             "提取公因式:6a^2b - 9ab^2 = ?",
             ["3ab(2a - 3b)", "3ab(2 - 3)", "6ab(a - 3b/2)"],
             0, "公因式 3ab", "3ab(2a - 3b)", C),
        P_mc("fcm_c1",
             "提取公因式因式分解:12x^3 − 8x^2 + 4x，结果是？",
             ["4x(3x^2−2x+1)", "4x(3x^2+2x+1)", "4(3x^3−2x^2+x)", "2x(6x^2−4x+2)"],
             0, "找 12,8,4 的最大公因数及 x 的最低次幂",
             "公因式 = 4x;12x^3÷4x=3x^2,8x^2÷4x=2x,4x÷4x=1;结果 4x(3x^2-2x+1) | 步骤: 公因式=4x; 因式分解结果=4x(3x^2−2x+1)", C),
        P_mc("fcm_x0",
             "先因式分解再求值:2ab - 2b^2,当 a=4,b=3 时值为?",
             ["6", "18", "12"],
             0, "2b(a-b)=2×3×(4-3)=6", "2b(a - b) = 2×3×(4-3) = 6", X),
        P_mc("fcm_x1",
             "完全因式分解:−x^2 + x = ?",
             ["x(1 − x) 或 −x(x − 1)", "x(x − 1)", "−x(x + 1)"],
             0, "提 x 或提 −x 均可", "x(1 − x) = −x(x − 1),均正确", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_mc("fcm_b2",
             "提取公因式:10x + 15 = ?",
             ["5(2x + 3)", "5(2x + 15)", "10(x + 5)"],
             0, "公因数为5", "10x + 15 = 5(2x + 3)", B),
        P_mc("fcm_b3",
             "提取公因式:8y^2 − 12y = ?",
             ["4y(2y − 3)", "4(2y^2 − 3y)", "8y(y − 3/2)"],
             0, "公因式为 4y", "4y(2y − 3)", B),
        P_mc("fcm_c2",
             "提取公因式:15a^2b − 10ab^2 = ?",
             ["5ab(3a − 2b)", "5ab(3 − 2)", "5a(3ab − 2b^2)"],
             0, "公因式为 5ab", "5ab(3a − 2b)", C),
        P_mc("fcm_c3",
             "因式分解:6x^2y − 9xy^2 + 3xy = ?",
             ["3xy(2x − 3y + 1)", "3xy(2x + 3y − 1)", "3x(2xy − 3y^2 + y)"],
             0, "公因式 3xy", "3xy · (2x − 3y + 1)", C),
        P_mc("fcm_x2",
             "因式分解后求值:3a^2 − 6a,当 a = 3 时值 = ?",
             ["9", "18", "27"],
             0, "3a(a−2)=3×3×(3−2)=9", "3a(a−2)=3×3×1=9", X),
        P_mc("fcm_x3",
             "完全因式分解 2x^3 − 4x^2 + 2x = ?",
             ["2x(x−1)^2", "2x(x^2−2x+1)", "2x^2(x−2)+2x"],
             0, "提2x后再因式分解:2x(x^2−2x+1)=2x(x−1)^2", "2x · (x−1)^2", X),
        P_mc("fcm_b4",
             "提取公因式:14m − 21 = ?",
             ["7(2m − 3)", "7(2m − 21)", "14(m − 3/2)"],
             0, "公因数7", "14m − 21 = 7(2m − 3)", B),
        P_mc("fcm_c4",
             "因式分解:a^2b + ab^2 = ?",
             ["ab(a + b)", "a(ab + b^2)", "b(a^2 + ab)"],
             0, "公因式 ab", "ab·(a + b)", C),
        P_mc("fcm_x4",
             "因式分解:x^3 − x^2 = ?",
             ["x^2(x − 1)", "x(x^2 − x)", "x^2(x^2 − 1)"],
             0, "公因式 x^2", "x^2·(x − 1)", X),
    ]
    return make_set("factorization_common", "提公因式法因式分解", "procedure", probs)


def factorization_formula():
    """公式法因式分解(平方差/完全平方) — procedure."""
    probs = [
        P_mc("ffa_b0",
             "平方差公式:a^2 - b^2 = ?",
             ["(a+b)(a-b)", "(a-b)^2", "(a+b)^2"],
             0, "a²-b²=(a+b)(a-b)", "a^2 - b^2 = (a+b)(a-b)", B),
        P_mc("ffa_b1",
             "完全平方公式:(a+b)^2 = ?",
             ["a^2 + 2ab + b^2", "a^2 + b^2", "a^2 - 2ab + b^2"],
             0, "(a+b)^2展开", "a^2 + 2ab + b^2", B),
        P_mc("ffa_c0",
             "用平方差公式因式分解:x^2 - 9 = ?",
             ["(x+3)(x-3)", "(x-3)^2", "(x+3)^2"],
             0, "x^2-3^2=(x+3)(x-3)", "(x+3)(x-3)", C),
        P_mc("ffa_c1",
             "用完全平方公式因式分解:x^2 + 6x + 9 = ?",
             ["(x+3)^2", "(x-3)^2", "(x+3)(x-3)"],
             0, "x^2+2×x×3+3^2=(x+3)^2", "(x+3)^2", C),
        P_mc("ffa_x0",
             "因式分解:4x^2 - 25 = ?",
             ["(2x+5)(2x-5)", "(4x+5)(4x-5)", "(2x-5)^2"],
             0, "(2x)^2-5^2", "(2x+5)(2x-5)", X),
        P_mc("ffa_x1",
             "先因式分解再求值:a^2 − b^2,当 a=51,b=49 时，最终结果是？",
             ["400", "200", "100", "2"],
             1, "a²-b²=(a+b)(a-b),代入 a+b=100,a-b=2",
             "(51+49)(51-49) = 100 × 2 = 200 | 步骤: 因式分解=(a+b)(a-b); 代入计算=100×2=200", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_mc("ffa_b2",
             "完全平方公式:(a−b)^2 = ?",
             ["a^2 − 2ab + b^2", "a^2 + 2ab + b^2", "a^2 − b^2"],
             0, "(a−b)^2展开", "a^2 − 2ab + b^2", B),
        P_mc("ffa_b3",
             "用平方差公式因式分解:y^2 − 16 = ?",
             ["(y+4)(y−4)", "(y−4)^2", "(y+4)^2"],
             0, "y^2−4^2=(y+4)(y−4)", "(y+4)(y−4)", B),
        P_mc("ffa_c2",
             "用完全平方公式因式分解:x^2 − 4x + 4 = ?",
             ["(x−2)^2", "(x+2)^2", "(x−2)(x+2)"],
             0, "x^2−2·x·2+2^2=(x−2)^2", "(x−2)^2", C),
        P_mc("ffa_c3",
             "因式分解:9x^2 − 1 = ?",
             ["(3x+1)(3x−1)", "(3x−1)^2", "(9x+1)(x−1)"],
             0, "(3x)^2−1^2=(3x+1)(3x−1)", "(3x+1)(3x−1)", C),
        P_mc("ffa_x2",
             "因式分解:16a^2 − 9b^2 = ?",
             ["(4a+3b)(4a−3b)", "(4a−3b)^2", "(16a+9b)(a−b)"],
             0, "(4a)^2−(3b)^2=(4a+3b)(4a−3b)", "(4a+3b)(4a−3b)", X),
        P_mc("ffa_x3",
             "求值:99^2 − 1(利用平方差公式),结果是?",
             ["9800", "9801", "9899", "9802"],
             0, "99^2−1^2=(99+1)(99−1)=100×98=9800",
             "(99+1)(99−1)=100×98=9800", X),
        P_mc("ffa_b4",
             "平方差公式的成立条件?",
             ["a 和 b 是任意实数", "a > b > 0", "a 和 b 必须为正整数"],
             0, "平方差公式对任意实数均成立", "a²−b²=(a+b)(a−b)适用于任意实数", B),
        P_mc("ffa_c4",
             "因式分解:25x^2 − 4 = ?",
             ["(5x+2)(5x−2)", "(5x−2)^2", "(25x+4)(x−1)"],
             0, "(5x)^2−2^2=(5x+2)(5x−2)", "(5x+2)(5x−2)", C),
        P_mc("ffa_x4",
             "求值:103^2 − 97^2(利用平方差公式)",
             ["1200", "600", "6", "1800"],
             0, "(103+97)(103−97)=200×6=1200",
             "200×6=1200", X),
        P_mc("ffa_c5",
             "用完全平方公式因式分解:4x^2 + 4x + 1 = ?",
             ["(2x+1)^2", "(2x−1)^2", "(x+1)^2"],
             0, "(2x)^2+2·2x·1+1^2=(2x+1)^2", "(2x+1)^2", C),
        P_mc("ffa_x5",
             "展开:(x+3)(x−3) = ?",
             ["x^2 − 9", "x^2 + 9", "x^2 − 6x + 9"],
             0, "平方差公式:x^2−3^2=x^2−9", "x^2 − 9", X),
    ]
    return make_set("factorization_formula", "公式法因式分解", "procedure", probs)


# ── 上册 U5: 分式 ──────────────────────────────────────────────────────────

def fraction_algebra_concept():
    """分式的意义 — concept."""
    probs = [
        P_mc("fac_b0",
             "分式 A/B 有意义的条件是?",
             ["分母 B ≠ 0", "分子 A ≠ 0", "A > B"],
             0, "分母不能为零", "分母 B ≠ 0", B),
        P_mc("fac_b1",
             "x/(x-2) 无意义时,x = ?",
             ["2", "0", "-2"],
             0, "令分母 x-2=0", "x - 2 = 0 → x = 2 时无意义", B),
        P_mc("fac_c0",
             "分式的基本性质:分子分母同乘或除以同一个不为零的整式,分式值?",
             ["不变", "变大", "变小"],
             0, "类似分数基本性质", "分式值不变", C),
        P_mc("fac_c1",
             "化简分式 (x^2-4)/(x+2) = ?",
             ["x-2", "x+2", "x"],
             0, "x^2-4=(x+2)(x-2),约去(x+2)", "(x+2)(x-2)/(x+2) = x-2", C),
        P_fill("fac_x0",
               "(x^2 - 9)/(x - 3) 化简后,当 x=5 时值 = ?",
               8, "化简为 x+3,代入 x=5", "(x+3)|_{x=5} = 5+3 = 8", X),
        P_mc("fac_x1",
             "下列式子是分式的是?",
             ["3/(x-1)", "3/4", "3x/1"],
             0, "含字母在分母中", "3/(x-1) 分母含字母,是分式", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_mc("fac_b2",
             "分式 3/(x+1) 无意义时,x = ?",
             ["−1", "1", "0"],
             0, "令 x+1=0,x=−1", "x + 1 = 0 → x = −1 时无意义", B),
        P_mc("fac_b3",
             "分式与分数的区别是?",
             ["分式分母含字母,分数分母为具体数", "分式值可以为0", "分数没有意义"],
             0, "分式分母含有字母", "分式分母含字母(代数式),分数分母为具体数", B),
        P_mc("fac_c2",
             "化简分式 (x^2−1)/(x+1) = ?",
             ["x−1", "x+1", "x"],
             0, "x^2−1=(x+1)(x−1),约去(x+1)", "(x+1)(x−1)/(x+1)=x−1", C),
        P_fill("fac_c3",
               "(x^2 − 4)/(x − 2) 化简后,当 x=4 时值 = ?",
               6, "化简为 x+2,代入 x=4", "(x+2)|_{x=4}=4+2=6", C),
        P_mc("fac_x2",
             "化简 (2x^2 − 8)/(2x − 4) = ?",
             ["x+2", "2x+4", "x−2"],
             0, "2(x^2−4)/(2(x−2))=(x+2)(x−2)/(x−2)=x+2", "(x+2)(x−2)/(x−2)=x+2", X),
        P_mc("fac_x3",
             "化简 (a^2 − b^2)/(a + b) = ?",
             ["a−b", "a+b", "ab"],
             0, "(a+b)(a−b)/(a+b)=a−b", "a−b", X),
        P_mc("fac_b4",
             "分式 2/(3x) 无意义时,x = ?",
             ["0", "2/3", "−2/3"],
             0, "令 3x=0,x=0", "3x=0 → x=0", B),
        P_fill("fac_c4",
               "(x^2 − 25)/(x + 5) 化简后,当 x=3 时值 = ?",
               # 化简为 x−5,代入 x=3:3−5=−2
               -2, "化简为 x−5,代入 x=3", "(x−5)|_{x=3}=−2", C),
        P_mc("fac_x4",
             "化简 (6x^2 − 12x)/(6x) = ?",
             ["x − 2", "x − 12", "6x − 12"],
             0, "6x(x−2)/(6x)=x−2", "x−2", X),
    ]
    return make_set("fraction_algebra_concept", "分式的意义", "concept", probs)


def fraction_equation():
    """分式方程 — procedure."""
    probs = [
        P_fill("feq_b0",
               "解分式方程: 1/x + 1/2 = 1\n解: x = ?",
               2, "两边乘以 2x,消分母:2 + x = 2x → x = 2", "2 + x = 2x → x = 2,验证分母≠0✓", B),
        P_fill("feq_b1",
               "解分式方程: 6/x = 3\n解: x = ?",
               2, "两边×x:6=3x → x=2", "6 = 3x → x = 2,验证分母≠0✓", B),
        P_mc("feq_c0",
             "解方程: x/(x−2) − 4/(x−2) = 1，结论是？",
             ["x=2", "x=−2", "x=0", "无解"],
             3, "左边同分母,合并后去分母,得矛盾方程",
             "左边合并: (x-4)/(x-2)=1 → x-4=x-2 → -4=-2 矛盾,方程无解 | 步骤: 左边通分合并=(x-4)/(x-2)=1; 去分母=x-4=x-2; 结论=无解", C),
        P_fill("feq_c1",
               "解分式方程: 2/(x+1) = 1\n解: x = ?",
               1, "两边×(x+1):2=x+1 → x=1", "2 = x+1 → x = 1,x+1=2≠0✓", C),
        P_mc("feq_x0",
             "解方程: 1/(x−1) + 3/((x−1)(x+1)) = 1/(x+1)，结论是？",
             ["x=1", "x=−1", "无解", "x=4"],
             2, "两边乘以(x-1)(x+1),注意检验增根",
             "去分母: (x+1)+3 = (x-1) → x+4 = x-1 → 4=-1 矛盾,无解 | 步骤: 最小公分母=(x-1)(x+1); 去分母后方程=(x+1)+3=(x-1); 化简=x+4=x-1; 结论=无解", X),
        P_fill("feq_x1",
               "分式方程 6/(x-3) = 2 的解 x = ?",
               6, "两边×(x-3):6=2(x-3)=2x-6 → 2x=12 → x=6", "6 = 2(x-3) → 2x = 12 → x = 6;x-3=3≠0✓", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_fill("feq_b2",
               "解分式方程: 4/x = 2\n解: x = ?",
               2, "两边×x:4=2x → x=2", "4 = 2x → x = 2,验证x≠0✓", B),
        P_mc("feq_b3",
             "解分式方程需要首先?",
             ["确定分母,去分母", "移项合并", "判断有无解"],
             0, "去分母是解分式方程第一步", "首先找公分母,两边乘以公分母去分母", B),
        P_fill("feq_c2",
               "解分式方程: 3/(x+2) = 1\n解: x = ?",
               1, "两边×(x+2):3=x+2 → x=1", "3 = x+2 → x = 1;x+2=3≠0✓", C),
        P_mc("feq_c3",
             "解分式方程 2/x + 3/x = 5 的解是?",
             ["x=1", "x=2", "x=3", "无解"],
             0, "左边通分:(2+3)/x=5 → 5/x=5 → x=1", "5/x=5 → x=1,x≠0✓", C),
        P_fill("feq_x2",
               "解分式方程: 10/(x+1) = 2\n解: x = ?",
               4, "两边×(x+1):10=2(x+1)=2x+2 → x=4", "10=2x+2 → 2x=8 → x=4;x+1=5≠0✓", X),
        P_mc("feq_x3",
             "解方程: 2/(x−1) = 4/(x+1),x 的解是?",
             ["x=3", "x=−3", "x=1", "无解"],
             0, "交叉相乘:2(x+1)=4(x−1)→2x+2=4x−4→6=2x→x=3",
             "2(x+1)=4(x−1)→2x+2=4x−4→x=3;x−1=2≠0✓", X),
        P_mc("feq_b4",
             "解分式方程 2/x = 4,x = ?",
             ["1/2", "2", "8"],
             0, "两边×x:2=4x → x=1/2", "x = 2/4 = 1/2,x≠0✓", B),
        P_mc("feq_c4",
             "解分式方程 5/(2x) − 1 = 0,x = ?",
             ["5/2", "2/5", "5"],
             0, "5/(2x)=1 → 5=2x → x=5/2", "5=2x → x=5/2,x≠0✓", C),
        P_fill("feq_x4",
               "分式方程 8/(x+2) = 2 的解 x = ?",
               2, "8=2(x+2)=2x+4 → 2x=4 → x=2", "2x=4 → x=2;x+2=4≠0✓", X),
        P_mc("feq_c5",
             "解分式方程需要'验根'是因为?",
             ["去分母后可能引入使分母为0的增根", "方程可能有无穷多解", "计算过程可能出错"],
             0, "整式方程的解可能令原分母=0,需排除", "增根使分母为零,需验根排除", C),
        P_fill("feq_x5",
               "分式方程 12/(x−4) = 3 的解 x = ?",
               8, "12=3(x−4)=3x−12 → 3x=24 → x=8", "3x=24 → x=8;x−4=4≠0✓", X),
    ]
    return make_set("fraction_equation", "分式方程", "procedure", probs)


# ── 下册 L1: 二次根式 ──────────────────────────────────────────────────────

def quadratic_radical():
    """二次根式 — concept."""
    probs = [
        P_mc("qr_b0",
             "√a 有意义的条件是?",
             ["a ≥ 0", "a > 0", "a ≠ 0"],
             0, "被开方数非负", "a ≥ 0", B),
        P_mc("qr_b1",
             "(√a)^2 = ?  (a ≥ 0)",
             ["a", "√a", "a^2"],
             0, "平方与根号互为逆运算", "(√a)^2 = a", B),
        P_mc("qr_c0",
             "√(a^2) = ?",
             ["|a|", "a", "-a"],
             0, "√(a^2)=|a|,注意绝对值", "√(a^2) = |a|", C),
        P_mc("qr_c1",
             "化简 √12 = ?",
             ["2√3", "√12", "3√2"],
             0, "12=4×3,√12=√4×√3=2√3", "2√3", C),
        P_fill("qr_x0",
               "化简 √75 = a√3,a = ?",
               5, "75=25×3,√75=5√3", "√75 = √(25×3) = 5√3,a=5", X),
        P_mc("qr_x1",
             "化简并计算: √8 + √18，结果是？",
             ["6√2", "5√2", "√26", "4√2"],
             1, "提出完全平方因数",
             "√8=2√2,√18=3√2;2√2+3√2=5√2 | 步骤: √8化简=2√2; √18化简=3√2; 结果=5√2", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_mc("qr_b2",
             "√9 = ?",
             ["3", "±3", "9"],
             0, "算术平方根取正值", "√9 = 3(算术平方根)", B),
        P_fill("qr_b3",
               "√(x−3) 有意义,x 至少等于 ?",
               3, "x−3≥0 → x≥3", "被开方数 x−3 ≥ 0,x ≥ 3", B),
        P_mc("qr_c2",
             "化简 √20 = ?",
             ["2√5", "4√5", "√20"],
             0, "20=4×5,√20=2√5", "√(4×5)=2√5", C),
        P_mc("qr_c3",
             "化简 √48 = ?",
             ["4√3", "2√12", "√48"],
             0, "48=16×3,√48=4√3", "√(16×3)=4√3", C),
        P_fill("qr_x2",
               "化简 √200 = a√2,a = ?",
               10, "200=100×2,√200=10√2", "√(100×2)=10√2,a=10", X),
        P_mc("qr_x3",
             "比较大小:√5 与 2 哪个大?",
             ["√5 > 2", "√5 < 2", "√5 = 2"],
             0, "√4=2,√5>√4=2", "因为5>4,所以√5>√4=2", X),
        P_mc("qr_x4",
             "化简 √(3^2 × 5) = ?",
             ["3√5", "9√5", "√45"],
             0, "√(9×5)=3√5", "√9·√5=3√5", X),
        P_fill("qr_b4",
               "√36 = ?",
               6, "6^2=36,√36=6", "√36=6", B),
        P_mc("qr_c4",
             "下列根式中最简二次根式是?",
             ["√5", "√12", "√18"],
             0, "√5被开方数无平方因子且无分母", "√5是最简根式;√12=2√3,√18=3√2均可化简", C),
        P_mc("qr_x5",
             "化简 √(a^4) (a≥0) = ?",
             ["a^2", "a", "a^4"],
             0, "√(a^4)=(a^2)^(1/2)=a^2 (a≥0)", "a^2", X),
        P_mc("qr_b5",
             "下列哪个数是无理数?",
             ["√2", "√4", "√9"],
             0, "√2不是有理数,是无理数", "√2是无理数;√4=2,√9=3均为有理数", B),
        P_fill("qr_c5",
               "化简 √108 = a√3,a = ?",
               6, "108=36×3,√108=6√3", "√(36×3)=6√3,a=6", C),
    ]
    return make_set("quadratic_radical", "二次根式", "concept", probs)


def quadratic_radical_simplify():
    """二次根式化简运算 — procedure."""
    probs = [
        P_mc("qrs_b0",
             "√2 × √8 = ?",
             ["4", "4√2", "√16"],
             0, "√2×√8=√(2×8)=√16=4", "√(2×8) = √16 = 4", B),
        P_mc("qrs_b1",
             "√18 ÷ √2 = ?",
             ["3", "√9", "9"],
             0, "√18÷√2=√(18÷2)=√9=3", "√9 = 3", B),
        P_mc("qrs_c0",
             "3√2 + 5√2 = ?",
             ["8√2", "8", "15√4"],
             0, "同类根式合并系数", "3√2 + 5√2 = 8√2", C),
        P_fill("qrs_c1",
               "化简: √50 - √8 = a√2,a = ?",
               3, "√50=5√2,√8=2√2,5√2-2√2=3√2", "5√2 - 2√2 = 3√2,a=3", C),
        P_mc("qrs_x0",
             "(√3 + 1)(√3 - 1) = ?",
             ["2", "4", "3-1"],
             0, "(a+b)(a-b)=a^2-b^2=(√3)^2-1^2=3-1=2", "3 - 1 = 2", X),
        P_mc("qrs_x1",
             "计算: (√5 + √3)^2，结果是？",
             ["8+2√15", "8+√15", "8−2√15", "8"],
             0, "(√5)^2+2·√5·√3+(√3)^2",
             "5 + 2√15 + 3 = 8 + 2√15 | 步骤: 展开公式=(a+b)^2=a^2+2ab+b^2; 计算结果=5+2√15+3=8+2√15", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_mc("qrs_b2",
             "√5 × √5 = ?",
             ["5", "√25", "25"],
             0, "√5·√5=(√5)^2=5", "(√5)^2 = 5", B),
        P_mc("qrs_b3",
             "√12 ÷ √3 = ?",
             ["2", "√4", "4"],
             0, "√12÷√3=√(12÷3)=√4=2", "√4 = 2", B),
        P_mc("qrs_c2",
             "4√3 − √3 = ?",
             ["3√3", "3", "√3"],
             0, "同类根式合并系数:4−1=3", "3√3", C),
        P_fill("qrs_c3",
               "化简: √45 − √20 = a√5,a = ?",
               1, "√45=3√5,√20=2√5,3√5−2√5=1·√5", "3√5−2√5=√5,a=1", C),
        P_mc("qrs_x2",
             "(√6 + √2)(√6 − √2) = ?",
             ["4", "8", "√8"],
             0, "(√6)^2−(√2)^2=6−2=4", "6 − 2 = 4", X),
        P_fill("qrs_x3",
               "化简 2√3 × 3√3 = ?",
               18, "2×3×(√3)^2=6×3=18", "2·3·3 = 18", X),
        P_mc("qrs_x4",
             "(1+√2)^2 = ?",
             ["3+2√2", "1+2√2", "3+√2"],
             0, "1^2+2·1·√2+(√2)^2=1+2√2+2=3+2√2", "3 + 2√2", X),
        P_fill("qrs_b4",
               "√3 × √27 = ?",
               9, "√3×√27=√81=9", "√81=9", B),
        P_mc("qrs_c4",
             "2√5 + 3√5 − √5 = ?",
             ["4√5", "5√5", "6√5"],
             0, "同类根式合并:(2+3−1)√5=4√5", "4√5", C),
        P_mc("qrs_x5",
             "化简 √6 × √6 = ?",
             ["6", "√36", "36"],
             0, "(√6)^2=6", "6", X),
        P_mc("qrs_b5",
             "√50 化简 = ?",
             ["5√2", "10√5", "√50"],
             0, "50=25×2,√50=5√2", "5√2", B),
        P_fill("qrs_c5",
               "化简: 2√12 − √27 = a√3,a = ?",
               1, "2√12=2×2√3=4√3,√27=3√3,4√3−3√3=1·√3", "4√3−3√3=√3,a=1", C),
    ]
    return make_set("quadratic_radical_simplify", "二次根式化简运算", "procedure", probs)


# ── 下册 L2: 勾股定理 ──────────────────────────────────────────────────────

def pythagorean_theorem():
    """勾股定理 — formula."""
    probs = [
        P_mc("pt_b0",
             "直角三角形中,a^2 + b^2 = c^2,c 是什么?",
             ["斜边", "直角边", "高"],
             0, "c 为最长边(斜边)", "c 是斜边(直角所对的边)", B),
        P_fill("pt_b1",
               "直角三角形两直角边为 3 和 4,斜边 = ?",
               5, "√(3²+4²)=√25=5", "√(9+16) = √25 = 5", B),
        P_fill("pt_c0",
               "直角三角形斜边为 13,一直角边为 5,另一直角边 = ?",
               12, "√(13²-5²)=√(169-25)=√144=12", "√(169-25) = √144 = 12", C),
        P_mc("pt_c1",
             "判断三边 5,12,13 能否构成直角三角形?",
             ["能,5^2+12^2=13^2", "不能", "不确定"],
             0, "25+144=169=13^2✓", "5^2+12^2=169=13^2,是直角三角形", C),
        P_fill("pt_x0",
               "直角三角形两直角边分别为 6 和 8,斜边 = ?",
               10, "两直角边 6 和 8 组成勾股数,斜边=√(36+64)=10", "√(36+64) = √100 = 10", X),
        P_mc("pt_x1",
             "一个矩形长 8 cm,宽 6 cm,对角线长 = ? cm",
             ["14", "10", "√28", "12"],
             1, "对角线是矩形的斜边",
             "d = √(64+36) = √100 = 10 cm | 步骤: 利用勾股定理=d=√(8²+6²); 计算结果=10", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_fill("pt_b2",
               "直角三角形两直角边为 5 和 12,斜边 = ?",
               13, "√(5²+12²)=√(25+144)=√169=13", "√169 = 13", B),
        P_fill("pt_b3",
               "直角三角形两直角边为 8 和 15,斜边 = ?",
               17, "√(8²+15²)=√(64+225)=√289=17", "√289 = 17", B),
        P_fill("pt_c2",
               "直角三角形斜边为 25,一直角边为 7,另一直角边 = ?",
               24, "√(25²−7²)=√(625−49)=√576=24", "√576 = 24", C),
        P_mc("pt_c3",
             "判断三边 7,24,25 能否构成直角三角形?",
             ["能,7^2+24^2=25^2", "不能", "不确定"],
             0, "49+576=625=25^2✓", "7^2+24^2=625=25^2,是直角三角形", C),
        P_fill("pt_x2",
               "等腰直角三角形两直角边均为 1,斜边 = ? (用√表达,如√2)",
               "√2", "√(1^2+1^2)=√2", "√2", X),
        P_mc("pt_x3",
             "直角三角形斜边为 10,一直角边为 6,另一直角边 = ?",
             ["8", "4", "√136"],
             0, "√(10²−6²)=√(100−36)=√64=8", "√64 = 8", X),
        P_mc("pt_x4",
             "一正方形对角线为 10,边长 = ?",
             ["5√2", "10√2", "5"],
             0, "d=a√2 → a=d/√2=10/√2=5√2", "a = 10/√2 = 5√2", X),
        P_fill("pt_b4",
               "直角三角形两直角边为 9 和 40,斜边 = ?",
               41, "√(9²+40²)=√(81+1600)=√1681=41", "√1681=41", B),
        P_mc("pt_c4",
             "判断三边 6, 8, 9 能否构成直角三角形?",
             ["不能,6^2+8^2≠9^2", "能", "不确定"],
             0, "36+64=100,9^2=81,100≠81", "6^2+8^2=100 ≠ 81=9^2,不是直角三角形", C),
        P_fill("pt_x5",
               "直角三角形斜边为 26,一直角边为 10,另一直角边 = ?",
               24, "√(26²−10²)=√(676−100)=√576=24", "√576=24", X),
        P_mc("pt_b5",
             "勾股定理的逆定理:若三角形三边满足 a^2+b^2=c^2,则该三角形?",
             ["是直角三角形", "是等腰三角形", "是等边三角形"],
             0, "勾股逆定理", "满足a²+b²=c²的三角形是直角三角形", B),
        P_fill("pt_c5",
               "直角三角形两直角边为 20 和 21,斜边 = ?",
               29, "√(20²+21²)=√(400+441)=√841=29", "√841=29", C),
        P_mc("pt_x6",
             "如果直角三角形三边满足 a:b:c = 3:4:5,c 为最大边,则?",
             ["c 是斜边,3^2+4^2=5^2", "c 是直角边", "不能构成直角三角形"],
             0, "9+16=25✓,c对应最大角(直角)", "3:4:5 是勾股数,c为斜边", X),
        P_fill("pt_b6",
               "直角三角形两直角边为 7 和 24,斜边 = ?",
               25, "√(7²+24²)=√(49+576)=√625=25", "√625=25", B),
        P_mc("pt_c6",
             "梯子长 13m,下端距墙 5m,上端高度 = ?m",
             ["12", "8", "√194"],
             0, "h=√(13²−5²)=√(169−25)=√144=12", "√144=12", C),
    ]
    return make_set("pythagorean_theorem", "勾股定理", "formula", probs)


# ── 下册 L3: 平行四边形 ────────────────────────────────────────────────────

def parallelogram_properties():
    """平行四边形性质 — concept."""
    probs = [
        P_mc("pp_b0",
             "平行四边形的对边关系?",
             ["对边平行且相等", "只平行不相等", "只相等不平行"],
             0, "平行四边形定义+性质", "对边平行且相等", B),
        P_mc("pp_b1",
             "平行四边形的对角关系?",
             ["对角相等", "对角互补", "对角不等"],
             0, "对角相等,邻角互补", "对角相等", B),
        P_mc("pp_c0",
             "矩形比普通平行四边形多出的性质是?",
             ["四角都是直角", "对边相等", "对角线互相平分"],
             0, "矩形特殊性质:四个直角", "矩形四角均为 90°", C),
        P_mc("pp_c1",
             "菱形的四条边关系?",
             ["四边相等", "只对边相等", "相邻边相等"],
             0, "菱形四边全相等", "菱形四边相等", C),
        P_fill("pp_x0",
               "平行四边形 ABCD 中,AB=5,BC=7,∠A=60°。\n则 CD = ? (对边相等)",
               5, "CD=AB=5(对边相等)", "CD = AB = 5", X),
        P_steps("pp_x1",
                "矩形 ABCD 中,对角线 AC=10 cm。\n求: (1) BD = ? (2) 对角线交点到各顶点距离 = ?",
                [{"label": "BD", "answer": "10"},
                 {"label": "到各顶点距离", "answer": "5"}],
                "矩形对角线相等且互相平分",
                "BD = AC = 10 cm;交点到各顶点 = 10÷2 = 5 cm", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_mc("pp_b2",
             "平行四边形的对角线关系?",
             ["互相平分", "相等且互相平分", "互相垂直"],
             0, "平行四边形对角线互相平分", "平行四边形对角线互相平分(但不一定相等)", B),
        P_mc("pp_b3",
             "平行四边形相邻两角(邻角)的关系?",
             ["互补(和为180°)", "相等", "互余"],
             0, "邻角互补", "平行四边形邻角之和 = 180°", B),
        P_fill("pp_c2",
               "平行四边形 ABCD 中,∠A = 70°,则 ∠B = ?°",
               110, "邻角互补,∠B=180−70", "180 − 70 = 110°", C),
        P_mc("pp_c3",
             "平行四边形 ABCD 中,AB=6,BC=4,则 CD = ?",
             ["6", "4", "10"],
             0, "对边相等,CD=AB=6", "CD = AB = 6", C),
        P_fill("pp_x2",
               "平行四边形 ABCD 中,AB=8,∠A=60°,则 ∠C = ?°",
               60, "对角相等,∠C=∠A=60°", "∠C = ∠A = 60°", X),
        P_mc("pp_x3",
             "平行四边形 ABCD 中,对角线 AC=12,BD=8,交点为 O。则 OA = ?",
             ["6", "4", "3"],
             0, "对角线互相平分,OA=AC/2=6", "OA = 12 ÷ 2 = 6", X),
        P_mc("pp_x4",
             "下列四边形一定是平行四边形的是?",
             ["对边分别相等的四边形", "两组邻角互补的四边形", "有一组对边平行的四边形"],
             0, "对边分别相等则是平行四边形", "对边分别相等→平行四边形", X),
        P_fill("pp_b4",
               "平行四边形 ABCD 中,∠A=50°,则 ∠C = ?°",
               50, "对角相等", "∠C = ∠A = 50°", B),
        P_mc("pp_c4",
             "平行四边形 ABCD 中,∠B=110°,则 ∠A = ?°",
             ["70°", "110°", "90°"],
             0, "邻角互补,∠A=180−110=70°", "180−110=70°", C),
        P_mc("pp_x5",
             "梯形是平行四边形吗?",
             ["不是,梯形只有一组平行边", "是,因为有平行边", "不确定"],
             0, "梯形只有一组对边平行,不满足两组", "梯形不是平行四边形", X),
        P_fill("pp_b5",
               "平行四边形 ABCD 中,∠A=75°,∠D = ?°",
               105, "∠A与∠D是邻角,互补:∠D=180−75=105°", "180−75=105°", B),
        P_mc("pp_c5",
             "平行四边形面积 = ?",
             ["底×高", "底×邻边", "周长÷2"],
             0, "平行四边形面积=底×高", "底×高", C),
        P_mc("pp_x6",
             "△ABC 中,D,E 分别是 AB,AC 的中点。DE∥BC 且 DE = BC/2。\n如果 BC=10,则 DE = ?",
             ["5", "10", "20"],
             0, "中位线定理:中位线=底边的一半", "DE = 10÷2 = 5", X),
    ]
    return make_set("parallelogram_properties", "平行四边形性质", "concept", probs)


def rectangle_rhombus_square():
    """矩形菱形正方形 — concept."""
    probs = [
        P_mc("rrs_b0",
             "正方形是什么图形?",
             ["既是矩形又是菱形", "只是矩形", "只是菱形"],
             0, "正方形四角90°且四边相等", "正方形是特殊的矩形也是特殊的菱形", B),
        P_mc("rrs_b1",
             "菱形对角线的关系?",
             ["互相垂直平分", "相等且互相平分", "只是互相平分"],
             0, "菱形对角线互相垂直平分", "互相垂直平分", B),
        P_mc("rrs_c0",
             "菱形对角线为 6 和 8,边长 = ?",
             ["5", "4", "7"],
             0, "半对角线3和4,边=√(3²+4²)=5", "√(3^2+4^2) = 5", C),
        P_mc("rrs_c1",
             "矩形对角线互相平分,且?",
             ["相等", "垂直", "不相等"],
             0, "矩形对角线相等", "矩形对角线相等", C),
        P_fill("rrs_x0",
               "菱形对角线分别为 12 和 16,菱形边长 = ?",
               10, "半对角线6和8,边=√(6²+8²)=√100=10", "√(36+64) = √100 = 10", X),
        P_mc("rrs_x1",
             "正方形 ABCD 边长为 4 cm。\n(1) 对角线长(cm,保留根号)和 (2) 面积(cm²)分别是？",
             ["对角线 4√2,面积 16", "对角线 4√2,面积 8", "对角线 8,面积 16", "对角线 2√2,面积 16"],
             0, "对角线=边长×√2,面积=边长²",
             "对角线 = 4√2 cm;面积 = 4^2 = 16 cm² | 步骤: 对角线=4√2; 面积=16", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_mc("rrs_b2",
             "矩形的对角线有什么特征?",
             ["相等且互相平分", "互相垂直且平分", "相等且垂直"],
             0, "矩形:对角线相等且互相平分", "矩形对角线相等且互相平分", B),
        P_mc("rrs_b3",
             "菱形的对角线有什么特征?",
             ["互相垂直平分", "相等且互相平分", "只互相平分"],
             0, "菱形:对角线互相垂直平分", "菱形对角线互相垂直平分", B),
        P_fill("rrs_c2",
               "菱形对角线分别为 10 和 24,菱形边长 = ?",
               13, "半对角线5和12,边=√(5²+12²)=√169=13", "√(25+144)=√169=13", C),
        P_mc("rrs_c3",
             "正方形的对角线关系?",
             ["相等且互相垂直平分", "只互相垂直", "只相等"],
             0, "正方形兼有矩形和菱形特征", "相等且互相垂直平分", C),
        P_fill("rrs_x2",
               "正方形边长为 5,对角线长 = ? (保留根号,如5√2)",
               "5√2", "d=5×√2", "5√2", X),
        P_mc("rrs_x3",
             "矩形 ABCD 中,AB=3,BC=4,对角线 AC = ?",
             ["5", "7", "√7"],
             0, "AC=√(3²+4²)=√25=5", "√(9+16)=5", X),
        P_mc("rrs_x4",
             "菱形对角线为 6 和 8,其面积 = ?",
             ["24", "48", "10"],
             0, "菱形面积=对角线×对角线÷2=6×8÷2=24", "6×8÷2=24", X),
        P_mc("rrs_b4",
             "正方形的对称轴有几条?",
             ["4 条", "2 条", "8 条"],
             0, "两对角线+两对边中线=4条", "正方形有4条对称轴", B),
        P_mc("rrs_c4",
             "矩形 ABCD 中,AB=5,BC=12,对角线 AC = ?",
             ["13", "17", "7"],
             0, "AC=√(5²+12²)=√(25+144)=√169=13", "√169=13", C),
        P_fill("rrs_x5",
               "菱形对角线分别为 16 和 12,菱形边长 = ?",
               10, "半对角线8和6,边=√(8²+6²)=√(64+36)=√100=10", "√100=10", X),
    ]
    return make_set("rectangle_rhombus_square", "矩形菱形正方形", "concept", probs)


# ── 下册 L4: 一次函数 ──────────────────────────────────────────────────────

def linear_function_concept():
    """一次函数概念 — concept."""
    probs = [
        P_mc("lfc_b0",
             "一次函数的一般形式是?",
             ["y = kx + b (k≠0)", "y = kx²", "y = b"],
             0, "一次函数含一次项", "y = kx + b,k≠0", B),
        P_mc("lfc_b1",
             "一次函数 y = 2x + 3 的斜率(k)和截距(b)分别是?",
             ["k=2, b=3", "k=3, b=2", "k=2, b=0"],
             0, "y=kx+b对比", "k=2,b=3", B),
        P_mc("lfc_c0",
             "当 k > 0 时,一次函数 y = kx + b 的图象?",
             ["从左下到右上(递增)", "从左上到右下(递减)", "水平线"],
             0, "k>0 正比例方向", "k>0 时函数递增,图象从左下到右上", C),
        P_fill("lfc_c1",
               "一次函数 y = -3x + 6,当 x=2 时,y = ?",
               0, "y=-3×2+6=0", "-3×2+6=0", C),
        P_mc("lfc_x0",
             "直线 y = 2x - 4 与 x 轴的交点(令 y=0)的 x 坐标 = ?",
             ["2", "4", "-2"],
             0, "0=2x-4 → x=2", "2x=4 → x=2", X),
        P_fill("lfc_x1",
               "一次函数经过点 (0, 3) 和 (1, 5),斜率 k = ?",
               2, "k=(5-3)/(1-0)=2", "k = (5-3)/(1-0) = 2", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_mc("lfc_b2",
             "下列哪个是一次函数?",
             ["y = 3x − 1", "y = x^2 + 1", "y = 5"],
             0, "含x一次项且k≠0", "y = 3x − 1,k=3≠0,是一次函数", B),
        P_fill("lfc_b3",
               "一次函数 y = 4x − 3,当 x=2 时,y = ?",
               5, "y=4×2−3=8−3=5", "4×2−3=5", B),
        P_mc("lfc_c2",
             "当 k < 0 时,一次函数 y = kx + b 的图象?",
             ["从左上到右下(递减)", "从左下到右上(递增)", "水平线"],
             0, "k<0 函数递减", "k<0 时函数递减", C),
        P_fill("lfc_c3",
               "一次函数 y = −2x + 5,当 x = −1 时,y = ?",
               7, "y=−2×(−1)+5=2+5=7", "−2×(−1)+5=7", C),
        P_mc("lfc_x2",
             "一次函数 y = 3x + b 经过 (2, 7),b = ?",
             ["1", "−1", "13"],
             0, "7=3×2+b → b=1", "7=6+b → b=1", X),
        P_fill("lfc_x3",
               "直线 y = −x + 6 与 y 轴的交点 y 坐标 = ?",
               6, "令 x=0,y=6", "x=0时 y=−0+6=6", X),
        P_mc("lfc_x4",
             "一次函数 y = 2x − 4 与 x 轴的交点?",
             ["(2, 0)", "(0, −4)", "(4, 0)"],
             0, "令y=0:2x=4,x=2", "x轴交点(2, 0)", X),
        P_mc("lfc_b4",
             "y = 5x 是一次函数吗?",
             ["是,b=0", "不是,没有常数项", "不确定"],
             0, "y=5x+0,k=5≠0,是一次函数(也是正比例函数)", "b=0时是正比例函数,也是一次函数", B),
        P_fill("lfc_c4",
               "一次函数 y = 5x − 2,当 x=−1 时 y = ?",
               -7, "y=5×(−1)−2=−5−2=−7", "−5−2=−7", C),
        P_mc("lfc_x5",
             "一次函数 y = kx + 3 经过 (−2, 1),k = ?",
             ["1", "−1", "2"],
             0, "1=k×(−2)+3 → −2k=−2 → k=1", "1=−2k+3 → k=1", X),
        P_fill("lfc_b5",
               "一次函数 y = 2x + 7,当 x=0 时 y = ?",
               7, "y=2×0+7=7", "y = 7", B),
        P_mc("lfc_c5",
             "正比例函数与一次函数的区别?",
             ["正比例函数 b=0,是一次函数的特例", "正比例函数不是一次函数", "两者完全相同"],
             0, "y=kx是b=0的特殊一次函数", "正比例函数是b=0的一次函数", C),
    ]
    return make_set("linear_function_concept", "一次函数概念", "concept", probs)


def linear_function_graph():
    """一次函数图象与性质 — formula."""
    probs = [
        P_mc("lfg_b0",
             "一次函数 y = x + 2 的图象与 y 轴的交点是?",
             ["(0, 2)", "(2, 0)", "(0, 1)"],
             0, "令 x=0,y=2", "x=0 时 y=2,交点 (0,2)", B),
        P_mc("lfg_b1",
             "一次函数 y = 3x - 6 的图象过 x 轴上的点?",
             ["(2, 0)", "(3, 0)", "(-2, 0)"],
             0, "令y=0:3x=6,x=2", "x=2 时 y=0,过 (2,0)", B),
        P_mc("lfg_c0",
             "两条直线 y=2x+1 和 y=2x-3 的位置关系?",
             ["平行", "相交", "重合"],
             0, "斜率相同k=2,截距不同", "斜率相同,截距不同 → 平行", C),
        P_mc("lfg_c1",
             "画 y = 2x − 1 的图象,x=1 时对应的点是？",
             ["(1, 1)", "(1, −1)", "(1, 3)", "(0, −1)"],
             0, "代入 x=0 和 x=1 得两点,连线即直线",
             "点 (0,-1) 和 (1,1) 确定直线 y=2x-1 | 步骤: x=0时=y=−1,点(0,−1); x=1时=y=1,点(1,1)", C),
        P_fill("lfg_x0",
               "一次函数 y = kx - 2 经过点 (3, 4),k = ?",
               2, "4=k×3-2 → 3k=6 → k=2", "4 = 3k - 2 → k = 2", X),
        P_mc("lfg_x1",
             "一次函数 y=-x+4 和 y=2x+1 的交点 x 坐标?",
             ["1", "2", "3"],
             0, "联立:-x+4=2x+1 → 3=3x → x=1", "-x+4=2x+1 → x=1", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_mc("lfg_b2",
             "一次函数 y = −2x + 3 的图象与 y 轴的交点是?",
             ["(0, 3)", "(3, 0)", "(0, −2)"],
             0, "令 x=0,y=3", "x=0时 y=3,交点(0, 3)", B),
        P_mc("lfg_b3",
             "两条直线 y=3x+1 和 y=−x+5 的位置关系?",
             ["相交", "平行", "重合"],
             0, "斜率不同(3≠−1),故相交", "斜率不同,必相交", B),
        P_fill("lfg_c2",
               "一次函数 y = kx + 1 经过 (3, 7),k = ?",
               2, "7=k×3+1 → k=6/3=2", "7=3k+1 → 3k=6 → k=2", C),
        P_mc("lfg_c3",
             "两条平行直线 y=2x+3 和 y=2x+b,若 b=−1,则两直线?",
             ["平行(不重合)", "重合", "相交"],
             0, "斜率相同,截距不同,平行", "k相同b不同→平行", C),
        P_fill("lfg_x2",
               "直线 y = 3x − 6 与 x 轴的交点 x 坐标 = ?",
               2, "令y=0:3x=6,x=2", "3x=6 → x=2", X),
        P_mc("lfg_x3",
             "y=x+3 和 y=−x+5 的交点 y 坐标?",
             ["4", "3", "5"],
             0, "x+3=−x+5 → 2x=2 → x=1 → y=1+3=4", "x=1,y=4", X),
        P_mc("lfg_x4",
             "一次函数 y = ax + b,若图象经过第一、二、四象限,则?",
             ["a>0,b<0不对,应a<0,b>0", "a<0,b>0", "a>0,b>0"],
             1, "k<0图象递减(二→四象限),b>0与y轴正半轴相交→过一二四",
             "k<0,b>0 → 过一二四象限", X),
        P_fill("lfg_b4",
               "一次函数 y = 2x + 5 的 y 轴截距 = ?",
               5, "y轴截距就是b值", "b = 5", B),
        P_mc("lfg_c4",
             "直线 y = 3x + 2 与直线 y = −x + 2 的关系?",
             ["相交于点(0, 2)", "平行", "重合"],
             0, "令x=0:两直线y均=2,截距相同;斜率不同→相交于(0,2)", "两直线过同一点(0,2),相交", C),
        P_fill("lfg_x5",
               "y = 2x + b 经过 (1, 5),b = ?",
               3, "5=2×1+b → b=3", "b=5−2=3", X),
        P_mc("lfg_b5",
             "直线 y = −3x + 5 在 y 轴上的截距是?",
             ["5", "−3", "5/3"],
             0, "令x=0:y=5", "b=5,y轴截距为5", B),
        P_fill("lfg_c5",
               "一次函数 y = 2x − 3 与 y = 2x + 5 的 y 轴截距之差 = ?",
               -8, "b₁−b₂=−3−5=−8", "截距差=−3−5=−8", C),
    ]
    return make_set("linear_function_graph", "一次函数图象与性质", "formula", probs)


# ── 下册 L5: 数据的分析 ────────────────────────────────────────────────────

def data_analysis():
    """数据的分析(平均数·中位数·众数·方差) — data."""
    probs = [
        P_mc("da_b0",
             "一组数据 3, 5, 5, 7, 10。众数是?",
             ["5", "7", "3"],
             0, "出现次数最多的数", "5 出现 2 次,为众数", B),
        P_fill("da_b1",
               "数据 2, 4, 6, 8, 10 的平均数 = ?",
               6, "(2+4+6+8+10)/5=30/5", "30 ÷ 5 = 6", B),
        P_fill("da_c0",
               "数据 1, 3, 5, 7, 9 的中位数 = ?",
               5, "奇数个数据,中间那个", "排序后中间第3个=5", C),
        P_mc("da_c1",
             "方差反映了数据的什么?",
             ["离散程度(波动大小)", "平均水平", "最大值与最小值之差"],
             0, "方差衡量数据波动", "方差衡量数据偏离均值的程度", C),
        P_steps("da_x0",
                "数据: 80, 85, 90, 95, 100\n(1) 平均数 = ? (2) 中位数 = ?",
                [{"label": "平均数", "answer": "90"},
                 {"label": "中位数", "answer": "90"}],
                "平均数=总和÷个数,中位数=中间值",
                "平均数=(80+85+90+95+100)÷5=450÷5=90;中位数=90", X),
        P_mc("da_x1",
             "两组学生成绩:\nA组: 70, 80, 90  B组: 60, 80, 100\n比较两组的平均数和方差,哪组成绩更稳定？",
             ["B组(方差更小)", "A组(方差更小)", "两组一样稳定", "无法判断"],
             1, "平均数相同时,方差小的更稳定",
             "A均=B均=80;A方差=[(70-80)²+(80-80)²+(90-80)²]/3=(100+0+100)/3≈67;B方差=(400+0+400)/3≈267;A组更稳定 | 步骤: A组平均数=80; B组平均数=80; 哪组更稳定=A组(方差更小)", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_mc("da_b2",
             "一组数据 2, 2, 3, 5, 8。众数是?",
             ["2", "3", "5"],
             0, "出现次数最多的数", "2 出现 2 次,为众数", B),
        P_fill("da_b3",
               "数据 10, 20, 30, 40, 50 的平均数 = ?",
               30, "(10+20+30+40+50)/5=150/5=30", "150 ÷ 5 = 30", B),
        P_fill("da_c2",
               "数据 4, 6, 8, 10, 12 的中位数 = ?",
               8, "奇数个数据,中间第3个", "排序后第3个=8", C),
        P_mc("da_c3",
             "数据 1, 3, 5, 7, 9 的平均数与中位数相比?",
             ["相等,均为5", "平均数>中位数", "平均数<中位数"],
             0, "平均数=(1+3+5+7+9)/5=25/5=5,中位数=5", "均为5,相等", C),
        P_fill("da_x2",
               "数据 2, 4, 6, 8 的中位数 = ?",
               5, "偶数个数据,中位数=(4+6)/2=5", "(4+6)÷2=5", X),
        P_mc("da_x3",
             "一组数据 5, 5, 5, 5 的方差 S² = ?",
             ["0", "5", "25"],
             0, "所有数据相同,与均值之差均为0", "所有数据等于均值5,S²=0", X),
        P_mc("da_x4",
             "数据 3, 5, 7, 9, 11 的平均数是?",
             ["7", "5", "9"],
             0, "(3+5+7+9+11)/5=35/5=7", "35÷5=7", X),
        P_mc("da_b4",
             "一组数据 1, 2, 2, 3, 3, 3 的众数是?",
             ["3", "2", "1"],
             0, "3出现3次,最多", "3 出现 3 次,为众数", B),
        P_fill("da_c4",
               "数据 2, 4, 6, 8, 10, 12 的中位数 = ?",
               7, "偶数个,中位数=(6+8)/2=7", "(6+8)÷2=7", C),
        P_mc("da_x5",
             "平均数是 10,中位数是 8,众数是 6 的一组数据,分布是?",
             ["右偏(少数较大值拉高均值)", "左偏", "对称分布"],
             0, "均值>中位数>众数,少数大值拉高了平均数", "均值>中位数,数据右偏", X),
        P_fill("da_b5",
               "数据 7, 7, 8, 9, 9, 9 的众数 = ?",
               9, "9出现3次最多", "9 出现 3 次,为众数", B),
        P_fill("da_c5",
               "数据 3, 7, 9, 11, 10 的平均数 = ?",
               8, "(3+7+9+11+10)/5=40/5=8", "40÷5=8", C),
    ]
    return make_set("data_analysis", "数据的分析", "data", probs)


def data_variance():
    """方差计算 — formula."""
    probs = [
        P_mc("dv_b0",
             "方差的公式 S² = ?",
             ["各数据与均值之差的平方的平均数", "各数据之差的平均数", "各数据的平均数的平方"],
             0, "S²=Σ(xi-x̄)²/n", "S² = Σ(xi - x̄)² / n", B),
        P_fill("dv_b1",
               "数据 2, 4, 6 的均值 x̄ = ?",
               4, "(2+4+6)/3=12/3=4", "12 ÷ 3 = 4", B),
        P_mc("dv_c0",
             "数据 2, 4, 6,均值=4。\n计算方差 S²，结果是？",
             ["4/3≈1.33", "8/3≈2.67", "4", "8"],
             1, "逐个计算与均值之差的平方,再平均",
             "S² = (4+0+4)/3 = 8/3 ≈ 2.67 | 步骤: (2−4)²=4; (4−4)²=0; (6−4)²=4; S²=(4+0+4)/3=8/3≈2.67", C),
        P_mc("dv_c1",
             "S² = 0 说明?",
             ["所有数据相同", "数据均值为0", "数据波动很大"],
             0, "方差为0代表无波动", "所有数据与均值相差为0,即数据全相等", C),
        P_fill("dv_x0",
               "数据 3, 5, 7, 9, 11,均值=7。\n方差 S²= ?  (整数)",
               8, "Σ(xi-7)²: 16+4+0+4+16=40, S²=40/5=8", "S² = 40 ÷ 5 = 8", X),
        P_mc("dv_x1",
             "甲方差 S²=4,乙方差 S²=9,两人均值相同。谁成绩更稳定?",
             ["甲(方差小)", "乙(方差大)", "一样稳定"],
             0, "方差小,波动小,更稳定", "甲方差更小,成绩更稳定", X),
        # ── extra problems ──────────────────────────────────────────────────
        P_fill("dv_b2",
               "数据 1, 2, 3, 4, 5 的均值 x̄ = ?",
               3, "(1+2+3+4+5)/5=15/5=3", "15 ÷ 5 = 3", B),
        P_mc("dv_b3",
             "方差越大,说明数据?",
             ["波动越大(越分散)", "波动越小(越集中)", "均值越大"],
             0, "方差衡量离散程度", "方差大→数据波动大、分散", B),
        P_mc("dv_c2",
             "数据 4, 4, 4, 4,均值=4。方差 S² = ?",
             ["0", "4", "16"],
             0, "所有数据与均值之差均为0", "S²=0(数据无波动)", C),
        P_fill("dv_c3",
               "数据 1, 4, 7,均值=4,方差 S² = ?",
               6, "S²=[(1-4)²+(4-4)²+(7-4)²]/3=(9+0+9)/3=6",
               "(9+0+9)÷3=6", C),
        P_mc("dv_x2",
             "数据 1, 4, 7,均值为 4,方差 S² = ?",
             ["6", "3", "9"],
             0, "S²=[(1-4)²+(4-4)²+(7-4)²]/3=(9+0+9)/3=18/3=6", "18÷3=6", X),
        P_fill("dv_x3",
               "数据 0, 6, 12,均值=6,方差 S² = ?",
               24, "S²=[(0-6)²+(6-6)²+(12-6)²]/3=(36+0+36)/3=24",
               "72÷3=24", X),
        P_mc("dv_x4",
             "两组数据均值相同,A组标准差(方差的算术平方根)更小,说明?",
             ["A组数据更稳定(集中)", "A组数据更分散", "两组稳定性相同"],
             0, "标准差小→方差小→数据更集中", "A组标准差小→数据更集中稳定", X),
        P_fill("dv_b4",
               "数据 5, 5, 5 的方差 S² = ?",
               0, "三个数相同,均值=5,每项之差均为0", "S²=0", B),
        P_mc("dv_c4",
             "数据 0, 10,均值=5,方差 S² = ?",
             ["25", "50", "5"],
             0, "S²=[(0-5)^2+(10-5)^2]/2=(25+25)/2=25", "50÷2=25", C),
        P_mc("dv_x5",
             "数据 2, 4, 6, 8, 10,均值=6。方差 S²=?",
             ["8", "4", "16"],
             0, "S²=[(2-6)^2+(4-6)^2+(6-6)^2+(8-6)^2+(10-6)^2]/5=(16+4+0+4+16)/5=40/5=8", "40÷5=8", X),
        P_mc("dv_b5",
             "标准差(均方差)与方差的关系?",
             ["标准差=√方差", "标准差=方差^2", "两者相同"],
             0, "标准差=√S²", "标准差 = √(S²)", B),
        P_fill("dv_c5",
               "数据 3, 3, 9, 9,均值=6,方差 S² = ?",
               9, "S²=[(3-6)^2+(3-6)^2+(9-6)^2+(9-6)^2]/4=(9+9+9+9)/4=36/4=9", "36÷4=9", C),
    ]
    return make_set("data_variance", "方差计算", "formula", probs)


# ── 组合 ───────────────────────────────────────────────────────────────────

def build_practice_pack():
    sets = [
        # 上册
        triangle_angle_sum(),
        isosceles_triangle(),
        congruent_triangle_concept(),
        congruent_triangle_proof(),
        axial_symmetry(),
        power_rules_practice(),
        factorization_common(),
        factorization_formula(),
        fraction_algebra_concept(),
        fraction_equation(),
        # 下册
        quadratic_radical(),
        quadratic_radical_simplify(),
        pythagorean_theorem(),
        parallelogram_properties(),
        rectangle_rhombus_square(),
        linear_function_concept(),
        linear_function_graph(),
        data_analysis(),
        data_variance(),
    ]
    return {"version": "2.0.0", "grade": 8, "sets": sets}


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3 — KNOWLEDGE MAP
# ═══════════════════════════════════════════════════════════════════════════

UNITS_G8 = [
    ("u1", "upper", 1, "三角形", [
        ("triangle_angle_sum",        "三角形内角和与外角",   "concept",   [],                          "triangle_angles"),
        ("isosceles_triangle",        "等腰三角形",          "concept",   ["triangle_angle_sum"]),
    ]),
    ("u2", "upper", 2, "全等三角形", [
        ("congruent_triangle_concept", "全等三角形判定",      "concept",   ["isosceles_triangle"]),
        ("congruent_triangle_proof",   "全等三角形证明",      "procedure", ["congruent_triangle_concept"]),
    ]),
    ("u3", "upper", 3, "轴对称", [
        ("axial_symmetry",             "轴对称",             "concept",   ["congruent_triangle_concept"]),
    ]),
    ("u4", "upper", 4, "整式的乘法与因式分解", [
        ("power_rules_practice",       "幂的运算",           "procedure", [],                           "power_rules"),
        ("factorization_common",       "提公因式法因式分解",  "procedure", ["power_rules_practice"]),
        ("factorization_formula",      "公式法因式分解",      "procedure", ["factorization_common"]),
    ]),
    ("u5", "upper", 5, "分式", [
        ("fraction_algebra_concept",   "分式的意义",          "concept",   ["factorization_formula"]),
        ("fraction_equation",          "分式方程",            "procedure", ["fraction_algebra_concept"]),
    ]),
    ("l1", "lower", 1, "二次根式", [
        ("quadratic_radical",          "二次根式",            "concept",   []),
        ("quadratic_radical_simplify", "二次根式化简运算",    "procedure", ["quadratic_radical"]),
    ]),
    ("l2", "lower", 2, "勾股定理", [
        ("pythagorean_theorem",        "勾股定理",            "formula",   ["quadratic_radical"],        "pythagorean_triple"),
    ]),
    ("l3", "lower", 3, "平行四边形", [
        ("parallelogram_properties",   "平行四边形性质",      "concept",   []),
        ("rectangle_rhombus_square",   "矩形菱形正方形",      "concept",   ["parallelogram_properties"]),
    ]),
    ("l4", "lower", 4, "一次函数", [
        ("linear_function_concept",    "一次函数概念",        "concept",   [],                           "linear_func_val"),
        ("linear_function_graph",      "一次函数图象与性质",  "formula",   ["linear_function_concept"]),
    ]),
    ("l5", "lower", 5, "数据的分析", [
        ("data_analysis",              "数据的分析",          "data",      [],                           "mean_median"),
        ("data_variance",              "方差计算",            "formula",   ["data_analysis"]),
    ]),
]


def build_knowledge_map(practice_pack):
    """Build knowledge map, auto-detecting ready status from practice pack."""
    practice_ids = {s["id"] for s in practice_pack["sets"]}

    fluency_track_ids = {
        "power_rules", "pythagorean_triple", "linear_func_val",
        "triangle_angles", "mean_median",
    }

    units_out = []
    topics_out = []

    for unit_id, term, index, title, topic_specs in UNITS_G8:
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
        "grade": 8,
        "units": units_out,
        "topics": topics_out,
    }


# ═══════════════════════════════════════════════════════════════════════════
# MAIN: generate all three files
# ═══════════════════════════════════════════════════════════════════════════

def main():
    # ── 1. Fluency pack ───────────────────────────────────────────────────
    fluency = build_fluency_pack()
    fluency_path = os.path.join(CONTENT_DIR, "grade8_math_fluency_pack.json")
    with open(fluency_path, "w", encoding="utf-8") as f:
        json.dump(fluency, f, ensure_ascii=False, indent=2)
        f.write("\n")

    n_facts = sum(len(lv["new_facts"]) for t in fluency["tracks"] for lv in t["levels"])
    print(f"wrote {fluency_path}")
    print(f"  tracks={len(fluency['tracks'])}  facts={n_facts}")
    for t in fluency["tracks"]:
        print(f"  - {t['trackId']:28s} enabled={t['enabled']!s:5s}  levels={len(t['levels'])}")

    # ── 2. Practice pack ──────────────────────────────────────────────────
    practice = build_practice_pack()
    practice_path = os.path.join(CONTENT_DIR, "grade8_practice_pack.json")
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
    kmap_path = os.path.join(CONTENT_DIR, "grade8_knowledge_map.json")
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
    _n, _u = tag_practice_file(8)
    print(f"source-tagged {_n} problems (grade 8)" + (f"  UNMAPPED {_u}" if _u else ""))
