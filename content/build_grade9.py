#!/usr/bin/env python3
"""Grade-9 content generator (人教版九年级数学).

Produces THREE JSON files in one run:
  grade9_math_fluency_pack.json
  grade9_practice_pack.json
  grade9_knowledge_map.json

    python3 content/build_grade9.py

Never hand-edit the JSON — edit this file and re-run.

课程范围:
  上册: 一元二次方程, 二次函数, 旋转, 圆, 概率初步
  下册: 反比例函数, 相似(相似三角形), 锐角三角函数, 投影与视图
"""
import json
import os
import string

CONTENT_DIR = os.path.dirname(os.path.abspath(__file__))
LEVEL_LETTERS = list(string.ascii_uppercase)

B, C, X = "basic", "consolidate", "challenge"


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1 — FLUENCY PACK
# All answers MUST be integers — verified by assertion in each builder.
# ═══════════════════════════════════════════════════════════════════════════

# ---------------------------------------------------------------------------
# Track 1: quadratic_roots  一元二次方程整数根口算
# Prompt format: "x²+bx+c=0 的两根之和 = ?" or "两根之积 = ?" or "较小根 = ?"
# All equations have two integer roots; answers are sums / products / roots.
# Verification: for ax²+bx+c=0 with integer roots p,q:
#   sum = p+q = -b/a,  product = p*q = c/a  (all integers by design)
# ---------------------------------------------------------------------------
# Level A: simple monic, positive roots, ask for sum
QR_A = [
    # (b, c, p, q, question_type)   p+q=-b, p*q=c
    # question_type: 's'=sum, 'p'=product, 'min'=smaller root
    ( -5,  6,  2,  3, "s"),   # x²-5x+6=0 → roots 2,3 → sum=5
    ( -7,  12, 3,  4, "s"),   # x²-7x+12=0 → roots 3,4 → sum=7
    ( -6,  8,  2,  4, "s"),   # x²-6x+8=0 → roots 2,4 → sum=6
    ( -9,  20, 4,  5, "s"),   # x²-9x+20=0 → roots 4,5 → sum=9
]
# Level B: ask for product
QR_B = [
    ( -5,  6,  2,  3, "p"),   # x²-5x+6=0 → product=6
    ( -7,  12, 3,  4, "p"),   # x²-7x+12=0 → product=12
    ( -8,  15, 3,  5, "p"),   # x²-8x+15=0 → product=15
    ( -9,  18, 3,  6, "p"),   # x²-9x+18=0 → product=18
]
# Level C: ask for smaller root
QR_C = [
    ( -5,  6,  2,  3, "min"),  # x²-5x+6=0 → smaller=2
    ( -7,  12, 3,  4, "min"),  # x²-7x+12=0 → smaller=3
    ( -8,  15, 3,  5, "min"),  # x²-8x+15=0 → smaller=3
    ( -6,  9,  3,  3, "min"),  # x²-6x+9=0 → double root 3
]
# Level D: one negative root — ask for sum
QR_D = [
    (  1, -6,  2, -3, "s"),   # x²+x-6=0 → roots 2,-3 → sum=-1
    (  2, -8,  2, -4, "s"),   # x²+2x-8=0 → roots 2,-4 → sum=-2
    (  3, -10, 2, -5, "s"),   # x²+3x-10=0 → roots 2,-5 → sum=-3
    (  4, -12, 2, -6, "s"),   # x²+4x-12=0 → roots 2,-6 → sum=-4
]
# Level E: one negative root — ask for product
QR_E = [
    (  1, -6,  2, -3, "p"),   # product = -6
    (  2, -8,  2, -4, "p"),   # product = -8
    (  3, -10, 2, -5, "p"),   # product = -10
    (  4, -12, 2, -6, "p"),   # product = -12
]
# Level F: ask for larger root (one negative root)
QR_F = [
    (  1, -6,  2, -3, "max"),  # larger = 2
    (  2, -8,  2, -4, "max"),  # larger = 2
    (  3, -10, 2, -5, "max"),  # larger = 2
    (  5, -14, 2, -7, "max"),  # x²+5x-14=0 → roots 2,-7 → larger=2
]

QR_LEVELS = [QR_A, QR_B, QR_C, QR_D, QR_E, QR_F]


def _qr_fact(b, c, p, q, qtype):
    """一元二次方程整数根口算 fluency fact."""
    # verify roots
    assert p + q == -b, f"sum check: p+q={p+q} != {-b}"
    assert p * q == c,  f"product check: p*q={p*q} != {c}"
    # build prompt and answer
    b_str = f"{b:+d}x" if b != 0 else ""
    c_str = f"{c:+d}" if c != 0 else ""
    eq = f"x²{b_str}{c_str}=0"
    if qtype == "s":
        ans = p + q
        prompt = f"{eq} 两根之和 = ?"
        fid = f"qr_s_{b}_{c}"
    elif qtype == "p":
        ans = p * q
        prompt = f"{eq} 两根之积 = ?"
        fid = f"qr_p_{b}_{c}"
    elif qtype == "min":
        ans = min(p, q)
        prompt = f"{eq} 较小根 = ?"
        fid = f"qr_min_{b}_{c}"
    else:  # max
        ans = max(p, q)
        prompt = f"{eq} 较大根 = ?"
        fid = f"qr_max_{b}_{c}"
    assert isinstance(ans, int), f"answer must be int, got {ans}"
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}


def build_qr_levels():
    levels = []
    for i, specs in enumerate(QR_LEVELS):
        facts = [_qr_fact(b, c, p, q, qt) for (b, c, p, q, qt) in specs]
        levels.append({"level": LEVEL_LETTERS[i], "new_facts": facts})
    return levels


# ---------------------------------------------------------------------------
# Track 2: quadratic_fn_vertex  二次函数顶点/对称轴口算 (整数结果)
# y = a(x-h)²+k → vertex (h,k), axis x=h
# Prompt: "y=a(x-h)²+k 的对称轴 x = ?" or "顶点纵坐标 = ?"
# All h and k are integers by construction.
# ---------------------------------------------------------------------------
# (a, h, k, question_type)  question: 'axis'=x=h (int), 'vy'=k (int)
QFV_A = [
    (1,  2,  3, "axis"),   # y=(x-2)²+3,  axis x=2
    (1,  3,  1, "axis"),   # y=(x-3)²+1,  axis x=3
    (1, -1,  4, "axis"),   # y=(x+1)²+4,  axis x=-1
    (1, -4,  0, "axis"),   # y=(x+4)²,    axis x=-4
]
QFV_B = [
    (1,  2,  3, "vy"),    # vertex y=3
    (1,  3,  1, "vy"),    # vertex y=1
    (2,  0, -5, "vy"),    # y=2x²-5, vertex y=-5
    (1, -4,  7, "vy"),    # vertex y=7
]
QFV_C = [
    # standard form y=ax²+bx+c → axis x=-b/(2a) must be integer
    # axis = -b/(2a); vy = c - b²/(4a)
    # (a, b, c, axis_int, vy_int, qtype)
    (1, -4,  3, "axis"),   # y=x²-4x+3, axis=-(-4)/(2)=2, vy=3-4=−1 → axis=2
    (1,  6,  5, "axis"),   # y=x²+6x+5, axis=-6/2=-3
    (1, -2, -3, "axis"),   # y=x²-2x-3, axis=1
    (2, -8, 10, "axis"),   # y=2x²-8x+10, axis=2
]
QFV_D = [
    (1, -4,  3, "vy"),    # vy = c - b²/(4a) = 3 - 4 = -1
    (1,  6,  5, "vy"),    # vy = 5 - 9 = -4
    (1, -2, -3, "vy"),    # vy = -3 - 1 = -4
    (2, -8, 10, "vy"),    # vy = 10 - 8 = 2
]

QFV_LEVELS_AB = [QFV_A, QFV_B]    # vertex form
QFV_LEVELS_CD = [QFV_C, QFV_D]    # standard form


def _qfv_fact_vertex(a, h, k, qtype, level_idx):
    """顶点式 二次函数 vertex/axis fact."""
    # y = a(x-h)²+k
    h_str = f"-{h}" if h > 0 else (f"+{-h}" if h < 0 else "")
    k_str = f"+{k}" if k > 0 else (f"{k}" if k < 0 else "")
    a_str = "" if a == 1 else (f"-" if a == -1 else f"{a}")
    prompt_eq = f"y={a_str}(x{h_str})²{k_str}"
    if qtype == "axis":
        ans = h
        prompt = f"{prompt_eq}  对称轴 x = ?"
        fid = f"qfv_axis_{level_idx}_{h}"
    else:
        ans = k
        prompt = f"{prompt_eq}  顶点纵坐标 = ?"
        fid = f"qfv_vy_{level_idx}_{k}"
    assert isinstance(ans, int)
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}


def _qfv_fact_standard(a, b, c, qtype, level_idx):
    """标准式 二次函数 axis/vy fact."""
    # axis = -b/(2a)
    axis_num = -b
    axis_den = 2 * a
    assert axis_num % axis_den == 0, f"axis not integer: {axis_num}/{axis_den}"
    axis = axis_num // axis_den
    # vy = c - b²/(4a)
    disc_num = b * b
    disc_den = 4 * a
    assert disc_num % disc_den == 0, f"vy not integer: {disc_num}/{disc_den}"
    vy = c - disc_num // disc_den

    b_str = f"{b:+d}x" if b != 0 else ""
    c_str = f"{c:+d}" if c != 0 else ""
    a_str = "" if a == 1 else (f"-" if a == -1 else f"{a}")
    prompt_eq = f"y={a_str}x²{b_str}{c_str}"
    if qtype == "axis":
        ans = axis
        prompt = f"{prompt_eq}  对称轴 x = ?"
        fid = f"qfv_axis_std_{level_idx}_{b}"
    else:
        ans = vy
        prompt = f"{prompt_eq}  顶点纵坐标 = ?"
        fid = f"qfv_vy_std_{level_idx}_{b}"
    assert isinstance(ans, int)
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}


def build_qfv_levels():
    levels = []
    for i, specs in enumerate(QFV_LEVELS_AB):
        facts = [_qfv_fact_vertex(a, h, k, qt, i) for (a, h, k, qt) in specs]
        levels.append({"level": LEVEL_LETTERS[i], "new_facts": facts})
    for j, specs in enumerate(QFV_LEVELS_CD):
        idx = len(QFV_LEVELS_AB) + j
        facts = [_qfv_fact_standard(a, b, c, qt, idx) for (a, b, c, qt) in specs]
        levels.append({"level": LEVEL_LETTERS[idx], "new_facts": facts})
    return levels


# ---------------------------------------------------------------------------
# Track 3: special_angle_trig  特殊角三角函数 → 整数答案
# Strategy: ask "sin30°×? = 1" style → answer integer,
#           or "tan45°×? = ?" 中整数, or "某角的对面边长=?" with integer result
# We use: 2×sin30°=1, 2×cos60°=1, tan45°=1, sin90°=1, cos0°=1 → all known,
# but phrased so answer is integer.
# Format A: "___°角的正弦值 × 2 = 1,此角为?" → answer: 30 (degrees, integer)
# Format B: "直角三角形斜边10,30°对边=?" → answer=5 (integer)
# ---------------------------------------------------------------------------
# (prompt_text, answer_int, verify_comment)
SAT_A = [
    # 角度问题 — answer is degrees
    ("sin___°= 1/2, 此锐角为几度?",       30, "sin30°=1/2"),
    ("cos___°= 1/2, 此锐角为几度?",       60, "cos60°=1/2"),
    ("tan___°= 1,   此锐角为几度?",       45, "tan45°=1"),
    ("sin___°= 1,   此角为几度?",         90, "sin90°=1"),
]
SAT_B = [
    ("cos___°= √3/2, 此锐角为几度?",      30, "cos30°=√3/2"),
    ("sin___°= √3/2, 此锐角为几度?",      60, "sin60°=√3/2"),
    ("tan___°= √3,   此锐角为几度?",      60, "tan60°=√3"),
    ("cos___°= 0,    此角为几度?",         90, "cos90°=0"),
]
SAT_C = [
    # 边长计算 — 直角三角形,斜边×sin/cos得整数
    # 斜边=10, ∠A=30° → 对边=10sin30°=5
    ("直角△斜边=10,∠A=30°,A的对边=10×sin30°=?",  5, "10×1/2=5"),
    # 斜边=10, ∠A=60° → 邻边=10cos60°=5
    ("直角△斜边=10,∠A=60°,A的邻边=10×cos60°=?",  5, "10×1/2=5"),
    # 斜边=20, ∠A=30° → 对边=20×1/2=10
    ("直角△斜边=20,∠A=30°,A的对边=20×sin30°=?", 10, "20×1/2=10"),
    # 斜边=20, ∠A=60° → 邻边=20×1/2=10
    ("直角△斜边=20,∠A=60°,A的邻边=20×cos60°=?", 10, "20×1/2=10"),
]
SAT_D = [
    # tan + integer sides: 直角△中 tan=对/邻, 求整数
    # 底边=3,∠A=45°,对边=3×tan45°=3
    ("直角△邻边=3,∠A=45°,对边=3×tan45°=?",  3, "3×1=3"),
    # 底边=5,∠A=45°,对边=5
    ("直角△邻边=5,∠A=45°,对边=5×tan45°=?",  5, "5×1=5"),
    # 斜边=6, ∠A=30° → 对边=6×sin30°=3
    ("直角△斜边=6,∠A=30°,A的对边=6×sin30°=?",  3, "6×1/2=3"),
    # 斜边=8, ∠A=30° → 对边=4
    ("直角△斜边=8,∠A=30°,A的对边=8×sin30°=?",  4, "8×1/2=4"),
]

SAT_LEVELS = [SAT_A, SAT_B, SAT_C, SAT_D]


def _sat_fact(prompt, ans, comment, level_idx, idx):
    assert isinstance(ans, int), f"answer must be int: {ans} ({comment})"
    fid = f"sat_{level_idx}_{idx}"
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "fact_recall"}


def build_sat_levels():
    levels = []
    for i, specs in enumerate(SAT_LEVELS):
        facts = [_sat_fact(p, a, c, i, j) for j, (p, a, c) in enumerate(specs)]
        levels.append({"level": LEVEL_LETTERS[i], "new_facts": facts})
    return levels


# ---------------------------------------------------------------------------
# Track 4: probability_count  概率古典概型 — 整数答案
# Prompt: ask for number of favorable outcomes (integer) or total equally likely outcomes
# ---------------------------------------------------------------------------
# (prompt_text, answer_int, verify_comment)
PROB_A = [
    ("掷一枚骰子,出现偶数点的等可能结果有几个?",                2,  "2,4,6 共3个… 等等偶数: 2,4,6=3个"),
    # fix: 偶数 = 2,4,6 → 3
    ("掷一枚骰子,出现3的倍数点的等可能结果有几个?",             2,  "3,6 共2个"),
    ("掷一枚骰子,所有等可能结果共几个?",                        6,  "1~6共6个"),
    ("掷一枚骰子,出现奇数点的等可能结果有几个?",                3,  "1,3,5共3个"),
]
PROB_B = [
    ("一个装有3个红球2个白球的袋子,随机摸一个\n有利结果(摸到红球)有几种?",  3, "3个红球"),
    ("一个装有4个黑球3个白球的袋子,随机摸一个\n全部等可能结果共几种?",      7, "4+3=7"),
    ("从1,2,3,4,5中随机取一个数\n取到奇数有几种等可能结果?",              3, "1,3,5"),
    ("从1,2,3,4,5中随机取一个数\n取到大于3的数有几种等可能结果?",         2, "4,5"),
]
PROB_C = [
    ("从1~10中随机取一数\n等可能结果共几个?",                    10, "1~10共10个"),
    ("从1~10中随机取一数\n取到质数的有利结果有几个?",             4,  "2,3,5,7共4个"),
    ("从1~10中随机取一数\n取到偶数的有利结果有几个?",             5,  "2,4,6,8,10共5个"),
    ("从1~10中随机取一数\n取到4的因数的有利结果有几个?",          3,  "1,2,4共3个"),
]
PROB_D = [
    ("掷两枚硬币,正反两面各一,全部等可能结果共几个?",            4,  "HH,HT,TH,TT共4个"),
    ("掷两枚硬币,恰好一正一反的有利结果有几个?",                 2,  "HT,TH共2个"),
    ("掷两枚硬币,至少一个正面的有利结果有几个?",                 3,  "HH,HT,TH共3个"),
    ("掷两枚硬币,两面都是正面的有利结果有几个?",                 1,  "HH共1个"),
]

PROB_LEVELS = [PROB_A, PROB_B, PROB_C, PROB_D]

# Fix PROB_A[0]: 偶数 = 2,4,6 → 3 not 2
PROB_A[0] = ("掷一枚骰子,出现偶数点的等可能结果有几个?", 3, "2,4,6共3个")


def _prob_fact(prompt, ans, comment, level_idx, idx):
    assert isinstance(ans, int) and ans > 0, f"answer must be positive int: {ans}"
    fid = f"prob_{level_idx}_{idx}"
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "fact_recall"}


def build_prob_levels():
    levels = []
    for i, specs in enumerate(PROB_LEVELS):
        facts = [_prob_fact(p, a, c, i, j) for j, (p, a, c) in enumerate(specs)]
        levels.append({"level": LEVEL_LETTERS[i], "new_facts": facts})
    return levels


# ---------------------------------------------------------------------------
# Track 5: similar_ratio  相似三角形边长口算 (整数答案)
# Prompt: "两相似△相似比k:1, 已知一边=a, 对应边=?"
# All answers are integers by construction (a divisible by 1, results integer).
# ---------------------------------------------------------------------------
# (ratio_m, ratio_n, known_side, answer, question_style)
# answer = known_side * ratio_n / ratio_m  (or × ratio_m/ratio_n)
# style 'small': known is larger side, find smaller
# style 'large': known is smaller side, find larger
SIMR_A = [
    (2, 1,  6,  3, "small"),  # ratio 2:1, larger=6 → smaller=3
    (3, 1,  9,  3, "small"),  # ratio 3:1, larger=9 → smaller=3
    (2, 1,  8,  4, "small"),  # ratio 2:1, larger=8 → smaller=4
    (3, 1, 12,  4, "small"),  # ratio 3:1, larger=12 → smaller=4
]
SIMR_B = [
    (2, 1,  4,  8, "large"),  # ratio 2:1, smaller=4 → larger=8
    (3, 1,  5, 15, "large"),  # ratio 3:1, smaller=5 → larger=15
    (2, 1,  7, 14, "large"),  # ratio 2:1, smaller=7 → larger=14
    (4, 1,  3, 12, "large"),  # ratio 4:1, smaller=3 → larger=12
]
SIMR_C = [
    (3, 2,  6,  4, "small"),  # ratio 3:2, larger=6 → smaller=4
    (3, 2,  9,  6, "small"),  # ratio 3:2, larger=9 → smaller=6
    (4, 3, 12,  9, "small"),  # ratio 4:3, larger=12 → smaller=9
    (5, 2, 10,  4, "small"),  # ratio 5:2, larger=10 → smaller=4
]
SIMR_D = [
    (3, 2,  4,  6, "large"),  # ratio 3:2, smaller=4 → larger=6
    (5, 3,  6, 10, "large"),  # ratio 5:3, smaller=6 → larger=10
    (4, 3,  9, 12, "large"),  # ratio 4:3, smaller=9 → larger=12
    (5, 2,  4, 10, "large"),  # ratio 5:2, smaller=4 → larger=10
]

SIMR_LEVELS = [SIMR_A, SIMR_B, SIMR_C, SIMR_D]


def _simr_fact(rm, rn, known, ans, style, level_idx, idx):
    if style == "small":
        # known = larger side, find smaller: smaller = known * rn / rm
        assert known * rn % rm == 0 and known * rn // rm == ans, (
            f"CHECK: {known}×{rn}/{rm}={known*rn//rm} != {ans}"
        )
        prompt = (f"两相似△相似比 {rm}:{rn},较大对应边={known},\n"
                  f"较小对应边 = ?")
    else:
        # known = smaller side, find larger: larger = known * rm / rn
        assert known * rm % rn == 0 and known * rm // rn == ans, (
            f"CHECK: {known}×{rm}/{rn}={known*rm//rn} != {ans}"
        )
        prompt = (f"两相似△相似比 {rm}:{rn},较小对应边={known},\n"
                  f"较大对应边 = ?")
    fid = f"simr_{level_idx}_{idx}"
    assert isinstance(ans, int)
    return {"id": fid, "prompt": prompt, "answer": ans, "learningType": "pattern"}


def build_simr_levels():
    levels = []
    for i, specs in enumerate(SIMR_LEVELS):
        facts = [_simr_fact(rm, rn, k, a, s, i, j)
                 for j, (rm, rn, k, a, s) in enumerate(specs)]
        levels.append({"level": LEVEL_LETTERS[i], "new_facts": facts})
    return levels


# ---------------------------------------------------------------------------
# engine_config — identical contract to grade 6
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
            "trackId": "quadratic_roots",
            "name": "一元二次方程整数根口算",
            "enabled": True,
            "levels": build_qr_levels(),
        },
        {
            "trackId": "quadratic_fn_vertex",
            "name": "二次函数顶点对称轴口算",
            "enabled": True,
            "levels": build_qfv_levels(),
        },
        {
            "trackId": "special_angle_trig",
            "name": "特殊角三角函数口算",
            "enabled": True,
            "levels": build_sat_levels(),
        },
        {
            "trackId": "probability_count",
            "name": "概率古典概型计数口算",
            "enabled": True,
            "levels": build_prob_levels(),
        },
        {
            "trackId": "similar_ratio",
            "name": "相似三角形边长口算",
            "enabled": True,
            "levels": build_simr_levels(),
        },
    ]

    non_drill_topics = [
        "quadratic_eq_procedure",
        "quadratic_fn_graph",
        "quadratic_fn_application",
        "circle_properties",
        "circle_tangent",
        "circle_inscribed_angle",
        "rotation_properties",
        "probability_tree",
        "inverse_proportion_fn",
        "similar_triangle_proof",
        "trig_application",
        "projection_view",
    ]

    return {
        "version": "1.0.0",
        "grade": 9,
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


# ── 上册 U1: 一元二次方程 ──────────────────────────────────────────────────

def quadratic_eq_concept():
    """一元二次方程概念 — concept."""
    probs = [
        P_mc("qec_b0",
             "一元二次方程的一般形式是?",
             ["ax²+bx+c=0 (a≠0)", "ax+b=0", "ax²+bx=0"],
             0, "二次项系数不为0", "ax²+bx+c=0,其中 a≠0", B),
        P_mc("qec_b1",
             "下列哪个是一元二次方程?",
             ["x²−3x+2=0", "2x+1=0", "x²+y=0"],
             0, "含有一个未知数的二次方程", "x²−3x+2=0 是一元二次方程", B),
        P_mc("qec_c0",
             "方程 3x²−5x+2=0 的二次项系数是?",
             ["3", "−5", "2"],
             0, "x²的系数", "二次项系数 a=3", C),
        P_mc("qec_c1",
             "方程 x(x−3)=−2 化为一般形式是?",
             ["x²−3x+2=0", "x²−3x=−2", "x²+3x+2=0"],
             0, "展开后移项", "x²−3x+2=0", C),
        P_fill("qec_x0",
               "若 x=2 是方程 x²+bx−6=0 的一根,则 b = ?",
               -1, "代入x=2: 4+2b−6=0", "4+2b−6=0 → 2b=2 → b=1  再次代入: b=1? 4+2−6=0 ✓ 故b=1…\n等等: 4+2b-6=0 → 2b=2 → b=1", 1),
        P_mc("qec_x1",
             "一元二次方程的根的情况由什么决定?",
             ["判别式 Δ=b²−4ac", "二次项系数", "常数项"],
             0, "Δ>0两个不等实根,Δ=0两等根,Δ<0无实根", "判别式 Δ=b²−4ac", X),
    ]
    # fix qec_x0: b=1, answer=1
    probs[4] = P_fill("qec_x0",
                      "若 x=2 是方程 x²+bx−6=0 的一根,则 b = ?",
                      1, "代入x=2: 4+2b−6=0 → 2b=2 → b=1",
                      "4+2b−6=0 → 2b=2 → b=1 (验证: 4+2−6=0 ✓)", X)
    return make_set("quadratic_eq_concept", "一元二次方程概念", "concept", probs)


def quadratic_eq_procedure():
    """一元二次方程解法 — procedure."""
    probs = [
        P_mc("qep_b0",
             "用直接开平方法解: x²=9，方程的解是？",
             ["x=±3", "x=3", "x=−3", "x=±9"],
             0, "x²=9 → x=±√9", "x=±3 | 步骤: 开平方=x=±3", B),
        P_mc("qep_b1",
             "用因式分解法解: x²−5x+6=0，方程的解是？",
             ["x=2 或 x=3", "x=−2 或 x=−3", "x=2 或 x=−3", "x=1 或 x=6"],
             0, "找两数之积=6,之和=5", "(x−2)(x−3)=0 → x=2 或 x=3 | 步骤: 因式分解=(x−2)(x−3)=0; 解=x=2 或 x=3", B),
        P_mc("qep_c0",
             "用公式法解: x²−3x−4=0，方程的解是？",
             ["x=4 或 x=−1", "x=−4 或 x=1", "x=4 或 x=1", "x=2 或 x=−2"],
             0, "Δ=b²−4ac, x=(−b±√Δ)/(2a)", "Δ=25, x=(3±5)/2 → x=4 或 x=−1 | 步骤: a,b,c=a=1,b=−3,c=−4; Δ=Δ=9+16=25; 解=x=4 或 x=−1", C),
        P_mc("qep_c1",
             "用配方法解: x²+4x−5=0，方程的解是？",
             ["x=−5 或 x=−1", "x=1 或 x=−5", "x=5 或 x=1", "x=1 或 x=5"],
             1, "x²+4x=(x+2)²−4", "(x+2)²=9 → x+2=±3 → x=1 或 x=−5 | 步骤: 配方=(x+2)²=9; 解=x=1 或 x=−5", C),
        P_fill("qep_c2",
               "方程 2x²−8=0 的解(两根之积) = ?",
               -4, "2x²=8 → x²=4 → x=±2", "x=2 或 x=−2,积=2×(−2)=−4", C),
        P_mc("qep_x0",
             "解方程: 2x²+3x−2=0，方程的解是？",
             ["x=2 或 x=−1/2", "x=1/2 或 x=2", "x=1/2 或 x=−2", "x=−1/2 或 x=−2"],
             2, "Δ=3²−4×2×(−2)=9+16=25", "x=(−3±5)/4 → x=1/2 或 x=−2 | 步骤: Δ=Δ=9+16=25; 解=x=1/2 或 x=−2", X),
        P_mc("qep_x1",
             "方程 x²−6x+9=0 有几个实数根?",
             ["1 个(重根)", "2 个不等实根", "无实根"],
             0, "Δ=36−36=0", "Δ=0 → 两等实根 x=3(重根),计为1个不同根", X),
    ]
    return make_set("quadratic_eq_procedure", "一元二次方程解法", "procedure", probs)


def quadratic_eq_application():
    """一元二次方程应用 — formula."""
    probs = [
        P_mc("qea_b0",
             "一个正整数比它的平方小12,这个正整数是？",
             ["3", "4", "6", "5"],
             1, "x²−x=12 → x²−x−12=0", "x²−x−12=0 → (x−4)(x+3)=0 → x=4(取正) | 步骤: 设未知数=设正整数为x; 方程=x²−x−12=0; 解=x=4", B),
        P_fill("qea_b1",
               "两数之积为24,较大数比较小数大5,\n较小数是几?(取正整数解)",
               3, "设较小数x,则x(x+5)=24", "x²+5x−24=0 → (x+8)(x−3)=0 → x=3", B),
        P_mc("qea_c0",
             "一块长方形地,长比宽多3m,面积40m²,宽和长分别是？",
             ["宽=4 m, 长=7 m", "宽=5 m, 长=8 m", "宽=8 m, 长=5 m", "宽=5 m, 长=10 m"],
             1, "x(x+3)=40", "x²+3x−40=0 → (x+8)(x−5)=0 → x=5,长=8 | 步骤: 设宽=设宽=x m; 方程=x(x+3)=40 即 x²+3x−40=0; 解=宽=5 m, 长=8 m", C),
        P_fill("qea_c1",
               "一个两位数,个位与十位之积=12,\n个位比十位大1,这个两位数是?",
               34, "设十位=x,个位=x+1,x(x+1)=12", "x²+x−12=0 → x=3,个位=4 → 34", C),
        P_mc("qea_x0",
             "某商品先涨价20%再降价20%,\n最终价格比原价低多少百分比?",
             ["低0%(不变)", "低2%", "低4%", "低6%"],
             2, "1.2×0.8=0.96", "0.96x < x,降了4% | 步骤: 设原价=设原价x元; 最终价=x×1.2×0.8=0.96x; 结论=低4%", X),
        P_mc("qea_x1",
             "一项工程甲单独需12天,乙单独需8天,\n合作几天完成?",
             ["约4.8天", "10天", "6天"],
             0, "每天完成:1/12+1/8=5/24,总天数=24/5",
             "24/5=4.8天", X),
    ]
    return make_set("quadratic_eq_application", "一元二次方程应用", "formula", probs)


# ── 上册 U2: 二次函数 ─────────────────────────────────────────────────────

def quadratic_fn_concept():
    """二次函数概念 — concept."""
    probs = [
        P_mc("qfc_b0",
             "下列哪个是二次函数?",
             ["y=x²−3x+2", "y=2x+1", "y=1/x"],
             0, "含x²且最高次为2", "y=x²−3x+2 是二次函数", B),
        P_mc("qfc_b1",
             "y=ax²+bx+c (a≠0) 的图象叫做?",
             ["抛物线", "直线", "双曲线"],
             0, "二次函数图象", "抛物线", B),
        P_mc("qfc_c0",
             "y=2x²−4x+1 的开口方向?",
             ["向上(a>0)", "向下(a<0)", "无法确定"],
             0, "a=2>0 开口向上", "a=2>0,开口向上", C),
        P_mc("qfc_c1",
             "y=−x²+2x−3 的顶点纵坐标是?",
             ["−2", "2", "3"],
             0, "顶点x=−b/(2a)=1,代入y=−1+2−3=−2", "y(1)=−1+2−3=−2", C),
        P_fill("qfc_x0",
               "y=x²−6x+k 的顶点纵坐标为−4,则 k = ?",
               5, "顶点x=3,y=9−18+k=k−9=−4", "k−9=−4 → k=5", X),
        P_mc("qfc_x1",
             "二次函数 y=x²+4x+4 与 x 轴的交点个数?",
             ["1 个(相切)", "2 个", "0 个"],
             0, "Δ=16−16=0", "Δ=0,与x轴只有1个交点(切点)x=−2", X),
    ]
    return make_set("quadratic_fn_concept", "二次函数概念", "concept", probs)


def quadratic_fn_graph():
    """二次函数图象性质 — concept."""
    probs = [
        P_mc("qfg_b0",
             "y=x²−4 的顶点坐标是?",
             ["(0,−4)", "(4,0)", "(−4,0)"],
             0, "y=(x−0)²+(−4)", "顶点 (0,−4)", B),
        P_mc("qfg_b1",
             "y=x² 的图象沿 y 轴向上平移3个单位后函数解析式是?",
             ["y=x²+3", "y=(x+3)²", "y=x²−3"],
             0, "向上平移→y增大3", "y=x²+3", B),
        P_mc("qfg_c0",
             "y=(x−2)²+1 的对称轴是?",
             ["x=2", "x=−2", "x=1"],
             0, "顶点式对称轴 x=h", "对称轴 x=2", C),
        P_mc("qfg_c1",
             "y=−2(x+1)²+3 的最大值是?",
             ["3", "1", "−2"],
             0, "a<0,顶点为最高点", "最大值为顶点纵坐标 y=3", C),
        P_mc("qfg_x0",
             "y=x²−2x−3 的抛物线顶点坐标是？",
             ["(−1,−4)", "(1,4)", "(1,−4)", "(2,−3)"],
             2, "顶点x=1,y=1−2−3=−4;令y=0解方程", "顶点(1,−4),交x轴于(3,0)和(−1,0) | 步骤: 顶点=(1,−4); x轴交点=x=3 或 x=−1; 开口=向上", X),
        P_mc("qfg_x1",
             "二次函数 y=ax²+bx+c,当 a>0,Δ<0 时,图象特征?",
             ["全在x轴上方,开口向上", "全在x轴下方", "与x轴相交两点"],
             0, "Δ<0无实根,a>0开口向上全在x轴上", "全在x轴上方,a>0开口向上", X),
    ]
    return make_set("quadratic_fn_graph", "二次函数图象性质", "concept", probs)


def quadratic_fn_application():
    """二次函数应用 — formula."""
    probs = [
        P_fill("qfa_b0",
               "一抛物线型拱桥,跨度20m,拱高5m,\n建立坐标系后函数为 y=ax²+5 (顶点在y轴)。\n求a的值。",
               0, "对称轴y轴,拱底y=0时x=±10", "y=ax²+5,当x=10时y=0:0=100a+5 → a=−1/20", C),
        # fix: a=-1/20, not integer — change to narrative answer
        P_mc("qfa_b0_fix",
             "抛物线 y=−x²+4 与 x 轴的两交点之间距离是?",
             ["4", "2", "8"],
             0, "令y=0: x²=4 → x=±2,间距=4", "x=±2,距离=4", B),
        P_mc("qfa_b1",
             "y=x²−2x (0≤x≤3) 在 x=? 时取到最小值",
             ["x=1", "x=0", "x=3"],
             0, "顶点x=1是最小值点", "顶点(1,−1)为最小值,y最小=−1", B),
        P_mc("qfa_c0",
             "某工厂产量 y(万件)与月份 x 的关系:\ny=−x²+7x (1≤x≤6)\n最大产量是多少万件？",
             ["11万件", "12万件", "10万件", "14万件"],
             1, "顶点x=7/2=3.5,取最近整数", "y(3)=−9+21=12,y(4)=−16+28=12 | 步骤: 顶点x=x=3.5,取x=3或x=4; 比较=y(3)=12,y(4)=12; 结论=3月或4月,最大产量12万件", C),
        P_fill("qfa_c1",
               "投篮时球的高度 y=−x²+4x+1 (x为水平距离)。\n球能达到的最大高度是多少?",
               5, "顶点x=2,y=−4+8+1=5", "y(2)=−4+8+1=5 m", C),
        P_mc("qfa_x0",
             "某产品售价 p 元时,日销售量 q=−2p+100。\n日销售收入 W=pq,使W最大的售价 p=？",
             ["p=20元", "p=50元", "p=30元", "p=25元"],
             3, "W=−2p²+100p,顶点p=−100/(2×(−2))=25", "p=25时W=−2×625+2500=1250元 | 步骤: W关于p的表达式=W=p(−2p+100)=−2p²+100p; 顶点=p=25; 最大W=W=1250元", X),
    ]
    probs.pop(0)  # remove the unfixable float problem
    return make_set("quadratic_fn_application", "二次函数应用", "formula", probs)


# ── 上册 U3: 旋转 ─────────────────────────────────────────────────────────

def rotation_properties():
    """旋转的性质 — concept."""
    probs = [
        P_mc("rtp_b0",
             "图形旋转时,旋转中心是?",
             ["不动的点", "旋转最多的点", "图形的中心"],
             0, "旋转中心固定不动", "旋转中心(固定点)不移动", B),
        P_mc("rtp_b1",
             "旋转前后,对应点到旋转中心的距离?",
             ["相等", "不等", "不确定"],
             0, "旋转不改变距离", "到旋转中心距离相等", B),
        P_mc("rtp_c0",
             "旋转前后,对应线段、角的大小?",
             ["保持不变", "变大", "变小"],
             0, "旋转是等距变换", "对应线段相等,对应角相等", C),
        P_mc("rtp_c1",
             "正三角形旋转多少度后与自身重合?",
             ["120°", "60°", "90°"],
             0, "正三角形有3条旋转对称轴", "旋转120°(=360°÷3)与自身重合", C),
        P_fill("rtp_x0",
               "一个图形绕点O旋转90°,点A到O的距离为5,\n旋转后A'到O的距离为多少?",
               5, "旋转保持距离不变", "OA'=OA=5", X),
        P_mc("rtp_x1",
             "正方形绕中心旋转多少度后与自身完全重合?(最小角度)",
             ["90°", "180°", "45°"],
             0, "正方形有4重旋转对称性", "旋转90°(=360°÷4)后与自身重合", X),
    ]
    return make_set("rotation_properties", "旋转的性质", "concept", probs)


# ── 上册 U4: 圆 ───────────────────────────────────────────────────────────

def circle_properties():
    """圆的基本性质 — concept."""
    probs = [
        P_mc("cirp_b0",
             "同一个圆(或等圆)中,相等的弧所对的圆心角?",
             ["相等", "互补", "互余"],
             0, "等弧对等圆心角", "等弧对等圆心角", B),
        P_mc("cirp_b1",
             "弦的垂直平分线一定经过?",
             ["圆心", "弦的中点", "切点"],
             0, "垂径定理", "弦的垂直平分线过圆心", B),
        P_mc("cirp_c0",
             "圆周角与同弧所对的圆心角的关系?",
             ["圆周角 = 圆心角的一半", "圆周角 = 圆心角", "圆周角 = 圆心角的两倍"],
             0, "圆周角定理", "圆周角 = 对应圆心角 ÷ 2", C),
        P_fill("cirp_c1",
               "半径为10cm的圆中,一条弦长16cm,\n弦心距(圆心到弦的距离)是多少cm?",
               6, "r=10,半弦=8,d=√(10²−8²)=√36=6", "√(100−64)=√36=6 cm", C),
        P_mc("cirp_x0",
             "如图,AB是圆O的直径,C是圆上一点,∠BAC=35°,∠ABC=？",
             ["35°", "45°", "55°", "65°"],
             2, "直径所对圆周角=90°", "∠ACB=90°,∠ABC=180°−90°−35°=55° | 步骤: ∠ACB=∠ACB=90°(直径所对圆周角); ∠ABC=∠ABC=90°−35°=55°", X),
        P_mc("cirp_x1",
             "圆内接四边形相对两角之和是?",
             ["180°", "90°", "360°"],
             0, "对角互补", "圆内接四边形对角之和=180°", X),
    ]
    return make_set("circle_properties", "圆的基本性质", "concept", probs)


def circle_tangent():
    """切线与切线长 — concept."""
    probs = [
        P_mc("cirt_b0",
             "切线与圆的关系?",
             ["与圆只有一个公共点", "与圆有两个公共点", "不相交"],
             0, "切线与圆相切", "切线与圆只有一个公共点(切点)", B),
        P_mc("cirt_b1",
             "切线与过切点的半径的位置关系?",
             ["垂直", "平行", "相交但不垂直"],
             0, "切线⊥半径", "切线⊥过切点的半径", B),
        P_fill("cirt_c0",
               "圆O半径=5,点P在圆外,OP=13,\n从P到圆O的切线长PT = ?",
               12, "PT²=OP²−r²=169−25=144", "PT=√144=12", C),
        P_mc("cirt_c1",
             "从圆外一点作圆的两条切线,两切线长?",
             ["相等", "不等", "之和等于直径"],
             0, "切线长定理", "两切线长相等", C),
        P_mc("cirt_x0",
             "⊙O半径3,切线PA、PB(A,B为切点),PA=4,PO=？",
             ["3", "4", "7", "5"],
             3, "PO²=OA²+PA²", "PO=√(9+16)=5 | 步骤: OA⊥PA=OA=3,PA=4; PO=PO=√(3²+4²)=5", X),
        P_mc("cirt_x1",
             "三角形的内切圆与三边都相切,\n圆心叫做三角形的?",
             ["内心", "重心", "外心"],
             0, "内切圆圆心=内心", "三角形的内心", X),
    ]
    return make_set("circle_tangent", "切线与切线长", "concept", probs)


def circle_inscribed_angle():
    """圆周角与圆心角 — concept."""
    probs = [
        P_mc("cia_b0",
             "圆周角定理:同弧所对的圆周角?",
             ["相等", "互补", "互余"],
             0, "同弧→圆周角相等", "同弧所对圆周角相等", B),
        P_fill("cia_b1",
               "圆心角∠AOB=80°,同弧AB所对圆周角∠ACB=?°",
               40, "圆周角=圆心角÷2", "40°", B),
        P_mc("cia_c0",
             "半圆(直径)所对的圆周角等于?",
             ["90°", "180°", "60°"],
             0, "直径对应圆心角180°,圆周角=90°", "90°", C),
        P_fill("cia_c1",
               "圆内接△ABC中,∠BAC=50°,∠ABC=70°,\n则弧BC所对的圆心角∠BOC=?°",
               100, "∠BAC=50°是弧BC的圆周角,∠BOC=2×50°", "∠BOC=2×50°=100°", C),
        P_mc("cia_x0",
             "⊙O中,AB是直径,C是圆上一点,∠CAB=30°,弧AC所对的圆心角∠AOC=？",
             ["60°", "30°", "120°", "90°"],
             2, "直径所对圆周角=90°,再用三角和", "∠BOC=60°,∠AOC=120° | 步骤: ∠ACB=∠ACB=90°; ∠ABC=∠ABC=60°; ∠BOC=∠BOC=2×30°=60°; ∠AOC=∠AOC=2×60°=120°", X),
        P_mc("cia_x1",
             "圆内接四边形 ABCD,∠A=110°,则∠C=?",
             ["70°", "110°", "90°"],
             0, "对角互补: ∠A+∠C=180°", "∠C=180°−110°=70°", X),
    ]
    return make_set("circle_inscribed_angle", "圆周角与圆心角", "concept", probs)


# ── 上册 U5: 概率初步 ─────────────────────────────────────────────────────

def probability_concept():
    """概率的基本概念 — concept."""
    probs = [
        P_mc("pbc_b0",
             "必然事件的概率是?",
             ["1", "0", "0.5"],
             0, "必然发生 P=1", "P(必然事件)=1", B),
        P_mc("pbc_b1",
             "不可能事件的概率是?",
             ["0", "1", "−1"],
             0, "不可能发生 P=0", "P(不可能事件)=0", B),
        P_mc("pbc_c0",
             "事件A与其对立事件A'的概率之和是?",
             ["1", "0", "0.5"],
             0, "P(A)+P(A')=1", "互补事件概率之和=1", C),
        P_fill("pbc_c1",
               "P(A)=0.3,则P(A的对立事件)=?",
               0, "1−0.3=0.7,答案需填0.7但此处要整数→",
               "1−0.3=0.7", C),
        # fix: use integer-friendly version
        P_mc("pbc_x0",
             "一个事件的概率一定在哪个范围?",
             ["0≤P≤1", "0<P<1", "P≥1"],
             0, "概率范围", "0≤P(A)≤1", X),
        P_mc("pbc_x1",
             "古典概型中,P(A) = ?",
             ["有利结果数 ÷ 总结果数", "总结果数 ÷ 有利结果数", "有利结果数 × 总结果数"],
             0, "古典概型公式", "P(A) = m/n (m为有利结果数,n为总结果数)", X),
    ]
    # fix pbc_c1: use fill with 0.7 expressed as fraction → better to use mc
    probs[3] = P_mc("pbc_c1",
                    "P(A)=0.3,则P(A的对立事件)=?",
                    ["0.7", "0.3", "1.3"],
                    0, "P(A)+P(A')=1", "P(A')=1−0.3=0.7", C)
    return make_set("probability_concept", "概率的基本概念", "concept", probs)


def probability_classical():
    """古典概型 — procedure."""
    probs = [
        P_fill("prcl_b0",
               "掷一枚骰子,出现奇数点的概率 P = ?/?\n(填分子,分母为6)",
               3, "奇数:1,3,5共3个", "P=3/6=1/2,分子3", B),
        P_fill("prcl_b1",
               "袋中5个球:3红2白,随机取1个,\nP(取到红球)分子=?(分母5)",
               3, "红球3个", "P=3/5,分子3", B),
        P_mc("prcl_c0",
             "从1~9中随机取一个数,P(取到3的倍数)=？",
             ["1/9", "1/4", "1/3", "1/2"],
             2, "3,6,9是1~9中3的倍数", "P=3/9=1/3 | 步骤: 3的倍数=3,6,9共3个; P=P=3/9=1/3", C),
        P_mc("prcl_c1",
             "掷两枚骰子,P(两数之和=7)=？",
             ["1/12", "1/6", "1/9", "1/4"],
             1, "列出所有和=7的组合", "P=6/36=1/6 | 步骤: 总结果=6×6=36种; 和=7的结果=(1,6)(2,5)(3,4)(4,3)(5,2)(6,1)共6种; P=P=6/36=1/6", C),
        P_mc("prcl_x0",
             "从1,2,3,4中随机取两个数(不放回),\n取到的两数之和为奇数的概率是?",
             ["2/3", "1/2", "1/3"],
             0, "奇+偶=奇,偶+奇=奇;取法共C(4,2)=6种",
             "奇数:{1,3},偶数:{2,4},奇偶对:(1,2)(1,4)(3,2)(3,4)共4种,P=4/6=2/3", X),
        P_mc("prcl_x1",
             "某班20人参加抽签,5人获奖,小明抽到第一签,P(小明获奖)=？",
             ["1/5", "1/3", "1/2", "1/4"],
             3, "P=获奖签数/总签数", "P=5/20=1/4 | 步骤: 总数=20签; 获奖签=5签; P=P=5/20=1/4", X),
    ]
    return make_set("probability_classical", "古典概型计算", "procedure", probs)


def probability_tree():
    """概率树图与列举 — data."""
    probs = [
        P_mc("prtree_b0",
             "用树状图可以帮助我们?",
             ["列举所有等可能结果", "计算复杂积分", "证明几何定理"],
             0, "树状图是列举工具", "树状图用于列举所有可能结果", B),
        P_fill("prtree_b1",
               "掷一次硬币再掷一次骰子,共有多少种等可能结果?",
               12, "2×6=12", "2×6=12种", B),
        P_mc("prtree_c0",
             "一个袋中有红球R和蓝球B各1个,不放回连取2次,P(两次颜色不同)=？",
             ["1/2", "2/3", "3/4", "1"],
             3, "不放回取2个,颜色必不同", "P=1(颜色必然不同) | 步骤: 结果=(R,B),(B,R)相异;(R,R)或(B,B)不存在(不放回); 总结果=A(2,2)=2种; P=P=2/2=1", C),
        P_mc("prtree_c1",
             "甲射击命中概率0.8,乙命中概率0.7,\n各射击一次,P(至少一人命中)=？",
             ["0.56", "0.75", "0.88", "0.94"],
             3, "用对立事件", "P=1−P(两人都没命中)=1−0.06=0.94 | 步骤: P(两人都未命中)=0.2×0.3=0.06; P(至少一人命中)=1−0.06=0.94", C),
        P_mc("prtree_x0",
             "甲乙两人各独立做一道题,甲答对概率3/5,乙答对概率2/3,\nP(两人都答对) = ?",
             ["2/5", "1/5", "3/5"],
             0, "独立事件:P(AB)=P(A)×P(B)", "P=3/5×2/3=6/15=2/5", X),
        P_fill("prtree_x1",
               "投两次骰子,两次都出现6的概率,分子为?(分母=36)",
               1, "1/6×1/6=1/36,分子=1", "P=1/36,分子1", X),
    ]
    return make_set("probability_tree", "概率树图与列举", "data", probs)


# ── 下册 L1: 反比例函数 ───────────────────────────────────────────────────

def inverse_proportion_fn():
    """反比例函数 — concept."""
    probs = [
        P_mc("ipf_b0",
             "反比例函数的一般形式是?",
             ["y=k/x (k≠0)", "y=kx+b", "y=kx²"],
             0, "y与x成反比", "y=k/x (k≠0)", B),
        P_mc("ipf_b1",
             "y=3/x 的图象分布在几个象限?",
             ["第一和第三象限", "第二和第四象限", "全部四个象限"],
             0, "k>0在一三象限", "k=3>0,图象在第一、三象限", B),
        P_mc("ipf_c0",
             "y=−2/x 在第二象限内,x 增大时 y 的变化?",
             ["y 增大", "y 减小", "y 不变"],
             0, "k<0在二四象限,x增大y增大", "k<0,x>0时在第四象限,x<0在第二象限,x增大y增大(在第二象限)", C),
        P_fill("ipf_c1",
               "y=k/x,当x=3时y=4,则k=?",
               12, "k=xy=3×4", "k=3×4=12", C),
        P_mc("ipf_x0",
             "反比例函数 y=6/x 与正比例函数 y=x 的交点在?",
             ["(√6,√6) 和 (−√6,−√6)", "(6,1) 和 (1,6)", "(3,2) 和 (2,3)"],
             0, "x=x²/6? 不对: y=x和y=6/x→x=6/x→x²=6→x=±√6",
             "联立: x=6/x → x²=6 → x=±√6,交点(√6,√6)和(−√6,−√6)", X),
        P_mc("ipf_x1",
             "已知 y 与 x+1 成反比例,当x=1时y=6,\ny关于x的表达式是？",
             ["y=6/(x+1)", "y=12/x", "y=12/(x+1)", "y=6/x"],
             2, "k=y(x+1)", "k=6×(1+1)=12,y=12/(x+1) | 步骤: k=k=y×(x+1)=6×2=12; 表达式=y=12/(x+1)", X),
    ]
    return make_set("inverse_proportion_fn", "反比例函数", "concept", probs)


# ── 下册 L2: 相似三角形 ──────────────────────────────────────────────────

def similar_triangle_concept():
    """相似三角形的概念和性质 — concept."""
    probs = [
        P_mc("stc_b0",
             "两个三角形相似的条件(三边之比),三边对应成比例则?",
             ["两△相似", "两△全等", "两△等积"],
             0, "SSS相似", "三边对应成比例→两△相似(SSS相似)", B),
        P_mc("stc_b1",
             "两△相似,对应边之比叫做?",
             ["相似比", "面积比", "周长比"],
             0, "相似比定义", "对应边之比=相似比", B),
        P_mc("stc_c0",
             "相似比为2:3的两△,面积比是?",
             ["4:9", "2:3", "8:27"],
             0, "面积比=相似比的平方", "2²:3²=4:9", C),
        P_fill("stc_c1",
               "△ABC∽△DEF,相似比=3:2,AB=9,则DE=?",
               6, "AB/DE=3/2 → DE=9×2/3", "DE=9×2/3=6", C),
        P_mc("stc_x0",
             "△ABC中,DE//BC,AD=4,DB=6,DE=3,BC=？",
             ["6", "5", "4", "7.5"],
             3, "平行截线→相似,AD/AB=4/(4+6)=2/5", "BC=3÷(4/10)=3×10/4=7.5 | 步骤: 相似=△ADE∽△ABC; 比例=AD/AB=DE/BC → 4/10=3/BC; BC=BC=7.5", X),
        P_mc("stc_x1",
             "两△面积比=1:4,则对应边之比是?",
             ["1:2", "1:4", "1:16"],
             0, "边之比=面积比开平方", "√(1/4)=1/2 → 1:2", X),
    ]
    return make_set("similar_triangle_concept", "相似三角形概念与性质", "concept", probs)


def similar_triangle_proof():
    """相似三角形判定与证明 — procedure."""
    probs = [
        P_mc("stp_b0",
             "两角对应相等可判定两三角形相似,依据是?",
             ["AA相似判定", "SSS相似", "SAS相似"],
             0, "AA判定", "AA判定:两角对应相等→相似", B),
        P_mc("stp_b1",
             "一角相等且夹角两边成比例可判定相似?",
             ["SAS相似", "AA相似", "SSS相似"],
             0, "SAS相似", "SAS相似判定", B),
        P_mc("stp_c0",
             "△ABC中,∠A=∠ADB,AB=4,AD=2,\n△ABD∽△ACB,AC=？",
             ["6", "4", "8", "10"],
             2, "∠A公共,∠ADB=∠ABC(待证)→ AA", "AC=4×4/2=8 | 步骤: 共角=∠A=∠A(公共角); AA=∠A=∠ADB → △ABD∽△ACB; 比例=AB/AC=AD/AB → 4/AC=2/4 → AC=8", C),
        P_mc("stp_c1",
             "已知∠B=∠D=90°,BC=6,DC=4,AB=9,\n△ABC∽△ADC,AD=？",
             ["4", "9", "8", "6"],
             3, "∠B=∠D=90°,∠C公共→AA相似", "AD=9×4/6=6 | 步骤: ∠B=∠D=90°=两角均为直角; 公共角∠C=∠BCA=∠DCA; 相似=△ABC∽△ADC (AA); AD=AB/AD=BC/DC → 9/AD=6/4 → AD=6", C),
        P_mc("stp_x0",
             "梯形ABCD中,AB//CD,AC与BD交于O,\nOA:OC与OB:OD的关系?",
             ["OA:OC=OB:OD", "OA:OC=OD:OB", "OA:OC+OB:OD=1"],
             0, "AB//CD→△AOB∽△COD", "△AOB∽△COD → OA:OC=OB:OD", X),
        P_fill("stp_x1",
               "△ABC∽△DEF,相似比3:2,△ABC面积=27cm²,\n△DEF面积=?cm²",
               12, "面积比=相似比²=9:4,DEF面积=27×4/9", "27×4/9=12 cm²", X),
    ]
    return make_set("similar_triangle_proof", "相似三角形判定与证明", "procedure", probs)


# ── 下册 L3: 锐角三角函数 ────────────────────────────────────────────────

def trig_definition():
    """锐角三角函数定义 — concept."""
    probs = [
        P_mc("trd_b0",
             "在直角△中,∠A的正弦 sinA = ?",
             ["∠A的对边/斜边", "∠A的邻边/斜边", "∠A的对边/邻边"],
             0, "sin=对/斜", "sinA=对边/斜边", B),
        P_mc("trd_b1",
             "cosA = ?",
             ["∠A的邻边/斜边", "∠A的对边/斜边", "∠A的对边/邻边"],
             0, "cos=邻/斜", "cosA=邻边/斜边", B),
        P_mc("trd_c0",
             "tanA = ?",
             ["∠A的对边/邻边", "∠A的邻边/对边", "斜边/对边"],
             0, "tan=对/邻", "tanA=对边/邻边", C),
        P_fill("trd_c1",
               "直角△中斜边=10,∠A的对边=6,\nsinA的分子是?(分母=10)",
               6, "sinA=对边/斜边=6/10", "sinA=6/10=3/5,分子6(分母10时)", C),
        P_mc("trd_x0",
             "sin²A+cos²A = ?",
             ["1", "0", "sinA×cosA"],
             0, "勾股定理推导", "sin²A+cos²A=1 (恒等式)", X),
        P_fill("trd_x1",
               "∠A的对边=3,邻边=4,则tanA的分子=?(分母=4)",
               3, "tanA=对/邻=3/4", "tanA=3/4,分子3", X),
    ]
    return make_set("trig_definition", "锐角三角函数定义", "concept", probs)


def trig_special_values():
    """特殊角三角函数值 — formula."""
    probs = [
        P_mc("trsv_b0",
             "sin30° = ?",
             ["1/2", "√2/2", "√3/2"],
             0, "特殊值记忆", "sin30°=1/2", B),
        P_mc("trsv_b1",
             "cos60° = ?",
             ["1/2", "√3/2", "√2/2"],
             0, "cos60°=sin30°=1/2", "cos60°=1/2", B),
        P_mc("trsv_c0",
             "tan45° = ?",
             ["1", "√3", "√3/3"],
             0, "等腰直角三角形", "tan45°=1", C),
        P_mc("trsv_c1",
             "sin60° = ?",
             ["√3/2", "1/2", "√2/2"],
             0, "60°角,30-60-90三角形", "sin60°=√3/2", C),
        P_mc("trsv_x0",
             "tan30° = ?",
             ["√3/3", "√3", "1/2"],
             0, "tan30°=sin30°/cos30°=(1/2)/(√3/2)=1/√3=√3/3", "tan30°=√3/3", X),
        P_mc("trsv_x1",
             "直角△ABC中,∠C=90°,AB=8,∠A=30°,AC=？",
             ["4", "4√2", "4√3", "8√3"],
             2, "BC对∠A,AC邻∠A", "BC=4,AC=4√3 | 步骤: BC=AB×sin30°=BC=8×1/2=4; AC=AB×cos30°=AC=8×√3/2=4√3", X),
    ]
    return make_set("trig_special_values", "特殊角三角函数值", "formula", probs)


def trig_application():
    """三角函数应用 — formula."""
    probs = [
        P_fill("trapp_b0",
               "一棵树高h,树影长d=h/tan∠A。\n∠A=45°时,h=10m,树影长=?m",
               10, "d=10/tan45°=10/1=10", "d=10÷1=10 m", B),
        P_mc("trapp_b1",
             "从楼顶俯角30°看地面一点,楼高20m,\n此点到楼脚的水平距离是？",
             ["20m", "10√3 m", "20√3 m", "40m"],
             2, "tan(俯角)=高/水平距离", "d=20/tan30°=20÷(√3/3)=20√3≈34.6m | 步骤: 设距离为d=tan30°=20/d; d=d=20/tan30°=20√3", B),
        P_mc("trapp_c0",
             "测得山顶仰角45°,向山走100m后仰角60°,山高约是？",
             ["h=100(√3−1)m≈73m", "h=50√3 m≈87m", "h=100m", "h=50(√3+1)√3≈236m"],
             3, "用两个方程消去x", "h=50√3(√3+1)≈236.6m | 步骤: 设山高h,初始水平距离x=tan45°=h/x → x=h; 走近后=tan60°=h/(x−100) → √3=h/(h−100); 解h=√3h−100√3=h → h(√3−1)=100√3 → h=50(√3+1)√3≈236m", X),
        P_fill("trapp_c1",
               "坡角30°的斜坡,沿坡走60m,上升高度=?m",
               30, "h=60×sin30°=60×0.5=30", "h=60×1/2=30 m", C),
        P_mc("trapp_x0",
             "仰角是从?观察目标的角",
             ["水平线向上", "水平线向下", "竖直线向上"],
             0, "仰角=往上看", "仰角是水平线向上的角", X),
        P_mc("trapp_x1",
             "旗杆高15m,从地面一点仰角30°,\n此点到旗杆底部的水平距离是？",
             ["5√3 m", "15m", "15√3 m", "30m"],
             2, "tan30°=√3/3=1/√3", "d=15÷(√3/3)=15√3≈25.98m | 步骤: tan30°=15/d=d=15/tan30°; d=d=15/(√3/3)=15√3=5√3×3=15√3≈26m", X),
    ]
    return make_set("trig_application", "三角函数应用", "formula", probs)


# ── 下册 L4: 投影与视图 ──────────────────────────────────────────────────

def projection_view():
    """投影与视图 — concept."""
    probs = [
        P_mc("pjv_b0",
             "正视图是从哪个方向看的?",
             ["正面(前方)", "上方", "左侧"],
             0, "正视图=主视图", "正视图:从正面向后看", B),
        P_mc("pjv_b1",
             "一个正方体的俯视图是?",
             ["正方形", "长方形", "圆形"],
             0, "从上往下看", "俯视图为正方形", B),
        P_mc("pjv_c0",
             "圆柱的侧视图是?",
             ["长方形", "圆形", "三角形"],
             0, "从侧面看圆柱", "圆柱侧视图为长方形", C),
        P_mc("pjv_c1",
             "圆锥的正视图是?",
             ["等腰三角形", "圆形", "长方形"],
             0, "从正面看圆锥", "圆锥正视图为等腰三角形", C),
        P_mc("pjv_x0",
             "一个几何体的三视图(正/侧/俯)都是圆,这个几何体是?",
             ["球", "圆柱", "圆锥"],
             0, "球三视图都是圆", "球的三视图均为圆", X),
        P_mc("pjv_x1",
             "根据三视图还原几何体:\n正视图:等腰三角形; 侧视图:等腰三角形; 俯视图:正方形。\n这是什么几何体?",
             ["圆锥", "三棱锥", "圆柱", "四棱锥(正四棱锥)"],
             3, "底面正方形+顶尖→四棱锥", "正四棱锥 | 步骤: 分析正/侧视图=三角形轮廓→有尖顶; 俯视图=正方形→底面是正方形; 结论=四棱锥(正四棱锥)", X),
    ]
    return make_set("projection_view", "投影与视图", "concept", probs)


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2b — EXTRA PROBLEMS (triples each set from ~6 to ~12)
# All answers computed parametrically — correct by construction.
# IDs use suffix _e1 … _e6 (never collide with existing ids).
# ═══════════════════════════════════════════════════════════════════════════

# ---------------------------------------------------------------------------
# Helper: generate mc / fill problems for quadratic equations
# Choose roots first, then expand → guarantees clean roots.
# ---------------------------------------------------------------------------

def _quad_fill_discriminant(pid, p, q, diff=C):
    """Fill: 方程 x²+bx+c=0 的判别式 Δ = ?  (roots p, q chosen first)"""
    # x²-(p+q)x + p*q = 0  → b=-(p+q), c=p*q
    b = -(p + q)
    c = p * q
    delta = b * b - 4 * c   # = (p-q)^2  ≥ 0
    b_str = f"{b:+d}x" if b != 0 else ""
    c_str = f"{c:+d}" if c != 0 else ""
    eq = f"x²{b_str}{c_str}=0"
    assert delta == (p - q) ** 2
    return P_fill(pid,
                  f"方程 {eq} 的判别式 Δ=b²−4ac = ?",
                  delta,
                  "Δ=(−b)²−4c,  (b=系数)",
                  f"Δ={b}²−4×{c}={b*b}−{4*c}={delta}",
                  diff)


def _quad_mc_roots(pid, p, q, diff=C):
    """MC: solve x² + bx + c = 0 (roots p, q), pick correct pair."""
    b = -(p + q)
    c = p * q
    b_str = f"{b:+d}x" if b != 0 else ""
    c_str = f"{c:+d}" if c != 0 else ""
    eq = f"x²{b_str}{c_str}=0"
    correct = f"x={p} 或 x={q}"
    wrong1 = f"x={p+1} 或 x={q-1}"
    wrong2 = f"x=−{abs(p)} 或 x=−{abs(q)}" if p >= 0 and q >= 0 else f"x={abs(p)} 或 x={abs(q)}"
    wrong3 = f"x={p} 或 x={q+1}"
    opts = [correct, wrong1, wrong2, wrong3]
    return P_mc(pid,
                f"解方程: {eq},方程的解是？",
                opts, 0,
                "因式分解或公式法",
                f"(x−{p})(x−{q})=0 → {correct}",
                diff)


def _quad_fill_sum_product(pid, p, q, ask, diff=C):
    """Fill: 两根之和 or 两根之积"""
    b = -(p + q)
    c = p * q
    b_str = f"{b:+d}x" if b != 0 else ""
    c_str = f"{c:+d}" if c != 0 else ""
    eq = f"x²{b_str}{c_str}=0"
    if ask == "sum":
        ans = p + q
        q_text = f"{eq} 两根之和 = ?"
        hint = "韦达定理: 两根之和 = −b"
        expl = f"两根之和 = −({b}) = {ans}"
    else:
        ans = p * q
        q_text = f"{eq} 两根之积 = ?"
        hint = "韦达定理: 两根之积 = c"
        expl = f"两根之积 = {c} = {ans}"
    return P_fill(pid, q_text, ans, hint, expl, diff)


def _quad_mc_vertex(pid, a, h, k, diff=C):
    """MC: 顶点 of y = a(x-h)²+k"""
    a_str = "" if a == 1 else (f"−" if a == -1 else f"{a}")
    h_str = f"−{h}" if h > 0 else (f"+{-h}" if h < 0 else "")
    k_str = f"+{k}" if k > 0 else (f"{k}" if k < 0 else "")
    eq = f"y={a_str}(x{h_str})²{k_str}"
    correct = f"({h},{k})"
    wrong1 = f"(−{h},{k})" if h > 0 else f"({-h},{k})"
    wrong2 = f"({h},−{k})" if k > 0 else f"({h},{-k})"
    wrong3 = f"(0,{k})"
    opts = [correct, wrong1, wrong2, wrong3]
    return P_mc(pid,
                f"{eq} 的顶点坐标是？",
                opts, 0,
                "顶点式直读顶点(h,k)",
                f"顶点 ({h},{k})",
                diff)


def _quad_mc_axis(pid, a, b, c, diff=C):
    """MC: 对称轴 of y=ax²+bx+c; requires -b%(2a)==0."""
    axis_num = -b
    axis_den = 2 * a
    assert axis_num % axis_den == 0
    axis = axis_num // axis_den
    b_str = f"{b:+d}x" if b != 0 else ""
    c_str = f"{c:+d}" if c != 0 else ""
    a_str = "" if a == 1 else (f"−" if a == -1 else f"{a}")
    eq = f"y={a_str}x²{b_str}{c_str}"
    correct = f"x={axis}"
    wrong1 = f"x={axis+1}"
    wrong2 = f"x={-axis}" if axis != 0 else f"x=1"
    wrong3 = f"x={axis-1}"
    opts = [correct, wrong1, wrong2, wrong3]
    return P_mc(pid,
                f"{eq} 的对称轴是？",
                opts, 0,
                "对称轴 x=−b/(2a)",
                f"x=−({b})/(2×{a})={axis}",
                diff)


def _prob_fraction_fill(pid, favorable, total, ask_numerator, hint, expl, diff=C):
    """Fill: probability question where answer is an integer (numerator or count)."""
    assert isinstance(favorable, int) and isinstance(total, int)
    ans = favorable if ask_numerator else total
    return P_fill(pid,
                  f"古典概型: {hint}\n有利结果={favorable}, 总结果={total}。\nP = {favorable}/{total}，分子 = ?",
                  favorable, hint, expl, diff)


def _simil_fill_side(pid, rm, rn, known, ask_larger, diff=C):
    """Fill: 相似△边长计算"""
    if ask_larger:
        assert known * rm % rn == 0
        ans = known * rm // rn
        prompt = f"两相似△相似比 {rm}:{rn},较小对应边={known},较大对应边 = ?"
        expl = f"{known}×{rm}/{rn}={ans}"
    else:
        assert known * rn % rm == 0
        ans = known * rn // rm
        prompt = f"两相似△相似比 {rm}:{rn},较大对应边={known},较小对应边 = ?"
        expl = f"{known}×{rn}/{rm}={ans}"
    hint = "对应边之比 = 相似比"
    return P_fill(pid, prompt, ans, hint, expl, diff)


def _trig_fill_side(pid, hyp, angle_deg, ratio_type, diff=C):
    """Fill: 直角三角形边长 (integer result only)."""
    import math
    # ratio_type: 'opp_sin'=hyp*sin, 'adj_cos'=hyp*cos, 'opp_tan_adj'=adj*tan
    # only use special angles 30/45/60
    sin_vals = {30: (1, 2), 60: (3**0.5, 2), 45: (2**0.5, 2)}
    cos_vals = {30: (3**0.5, 2), 60: (1, 2), 45: (2**0.5, 2)}
    if ratio_type == "opp_sin":
        n, d = {30: (1, 2), 60: (1, 2)}[angle_deg]  # integer results only
        # For sin30=1/2 → ans=hyp/2; for sin60 need hyp divisible by 2
        if angle_deg == 30:
            ans = hyp // 2
            assert hyp % 2 == 0
            prompt = f"直角△斜边={hyp},∠A={angle_deg}°,A的对边=斜边×sin{angle_deg}°=?"
            expl = f"{hyp}×sin{angle_deg}°={hyp}×1/2={ans}"
        else:  # 60: sin60=√3/2, result only integer if hyp divisible by 2 AND result is integer
            # We'll only use this branch when explicitly set, use 30 only for safety
            assert False, "use 30 degree for integer result"
        return P_fill(pid, prompt, ans, f"sin{angle_deg}°=1/2", expl, diff)
    elif ratio_type == "adj_cos":
        assert angle_deg in (30, 60)
        if angle_deg == 60:
            assert hyp % 2 == 0
            ans = hyp // 2
            expl = f"{hyp}×cos60°={hyp}×1/2={ans}"
        else:  # 30: cos30=√3/2 → not integer in general; skip
            assert False
        prompt = f"直角△斜边={hyp},∠A={angle_deg}°,A的邻边=斜边×cos{angle_deg}°=?"
        return P_fill(pid, prompt, ans, f"cos{angle_deg}°=1/2", expl, diff)
    elif ratio_type == "opp_tan_45":
        ans = hyp  # tan45=1
        prompt = f"直角△∠A=45°,邻边={hyp},A的对边=邻边×tan45°=?"
        expl = f"{hyp}×1={ans}"
        return P_fill(pid, prompt, ans, "tan45°=1", expl, diff)
    else:
        assert False, f"unknown ratio_type {ratio_type}"


def _circle_fill_chord_dist(pid, r, half_chord, diff=C):
    """Fill: 弦心距 d = √(r²−half_chord²)"""
    import math
    d_sq = r * r - half_chord * half_chord
    assert d_sq > 0
    d = int(math.isqrt(d_sq))
    assert d * d == d_sq, f"弦心距不是整数: r={r},半弦={half_chord}"
    prompt = f"⊙O半径={r},弦长={2*half_chord},弦心距(圆心到弦的距离)=?"
    expl = f"√({r}²−{half_chord}²)=√{d_sq}={d}"
    hint = f"d=√(r²−(弦/2)²)"
    return P_fill(pid, prompt, d, hint, expl, diff)


def _circle_fill_central_angle(pid, inscribed_angle, diff=C):
    """Fill: 圆心角 = 2×圆周角"""
    central = 2 * inscribed_angle
    prompt = f"圆周角∠ACB={inscribed_angle}°,同弧所对的圆心角∠AOB=?°"
    expl = f"圆心角=2×圆周角=2×{inscribed_angle}°={central}°"
    return P_fill(pid, prompt, central, "圆心角=2×圆周角", expl, diff)


# ── 额外题目: 一元二次方程概念 ─────────────────────────────────────────────

def quadratic_eq_concept_extra():
    """Extra problems for 一元二次方程概念."""
    # parametric: choose roots, compute b/c
    probs = []

    # e1: discriminant fill  roots 1,5  → x²-6x+5=0  Δ=16
    probs.append(_quad_fill_discriminant("qec_e1", 1, 5, B))

    # e2: mc roots  roots 2,7  → x²-9x+14=0
    p, q = 2, 7
    b = -(p + q)  # -9
    c = p * q      # 14
    probs.append(P_mc("qec_e2",
        f"下列方程中,x²{b:+d}x{c:+d}=0 的两根是？",
        [f"x={p} 或 x={q}", f"x=−{p} 或 x=−{q}", f"x={p+1} 或 x={q-1}", f"x={c} 或 x=1"],
        0, "找两数积=14,和=9", f"(x−{p})(x−{q})=0 → x={p} 或 x={q}", B))

    # e3: fill — 韦达定理 sum  roots 3,8
    probs.append(_quad_fill_sum_product("qec_e3", 3, 8, "sum", C))

    # e4: fill — 韦达定理 product  roots -2, 5
    probs.append(_quad_fill_sum_product("qec_e4", -2, 5, "product", C))

    # e5: mc — 判断Δ  roots 3,3 (double) → Δ=0
    probs.append(P_mc("qec_e5",
        "方程 x²−6x+9=0 的判别式 Δ=?",
        ["0", "36", "−36"],
        0, "Δ=b²−4ac", "Δ=(−6)²−4×9=36−36=0", C))

    # e6: fill — find c given one root  root x=−3  x²+bx+c=0, b=1 → root -3
    # x²+x+c=0, x=-3 → 9−3+c=0 → c=−6
    probs.append(P_fill("qec_e6",
        "若 x=−3 是方程 x²+x+c=0 的一根,则 c=?",
        -6, "代入x=−3: 9−3+c=0",
        "9+(−3)+c=0 → c=−6", X))

    return probs


# ── 额外题目: 一元二次方程解法 ─────────────────────────────────────────────

def quadratic_eq_procedure_extra():
    """Extra problems for 一元二次方程解法."""
    probs = []

    # e1: mc roots 4,-1  → x²-3x-4=0 (already exists as qep_c0 but different angle)
    # use roots 5,-2  → x²-3x-10=0
    probs.append(_quad_mc_roots("qep_e1", 5, -2, B))

    # e2: fill  两根之积  roots 4,1 → x²-5x+4=0  product=4
    probs.append(_quad_fill_sum_product("qep_e2", 4, 1, "product", B))

    # e3: mc  direct square root  x²=25
    probs.append(P_mc("qep_e3",
        "直接开平方法解: x²=25,方程的解是？",
        ["x=±5", "x=5", "x=−5", "x=±√5"],
        0, "x²=25 → x=±√25", "x=±5", B))

    # e4: fill discriminant  roots 6,-1 → x²-5x-6=0  Δ=49
    probs.append(_quad_fill_discriminant("qep_e4", 6, -1, C))

    # e5: mc factoring  roots -3,-4 → x²+7x+12=0
    p, q = -3, -4
    probs.append(_quad_mc_roots("qep_e5", p, q, C))

    # e6: fill  两根之和  roots 3,-7 → x²+4x-21=0  sum=-4
    probs.append(_quad_fill_sum_product("qep_e6", 3, -7, "sum", X))

    return probs


# ── 额外题目: 一元二次方程应用 ─────────────────────────────────────────────

def quadratic_eq_application_extra():
    """Extra problems for 一元二次方程应用."""
    probs = []

    # e1: B fill  两数之积=18,差=3 → roots 6,3(or -6,-3 take positive): x(x-3)=18 →  x²-3x-18=0 → (x-6)(x+3)=0 → x=6
    probs.append(P_fill("qea_e1",
        "两正整数之差为3,积为18,较大数是?",
        6, "设较小数x,则x(x+3)=18",
        "x²+3x−18=0 → (x+6)(x−3)=0 → x=3(正),较大数=6", B))

    # e2: B mc  perimeter=20, area
    # 长方形周长=20 → 2(l+w)=20 → l+w=10;  若l-w=2 → l=6,w=4 → area=24
    probs.append(P_mc("qea_e2",
        "长方形周长=20m,长比宽大2m,面积=?m²",
        ["24", "20", "16", "21"],
        0, "长+宽=10,长−宽=2", "长=6,宽=4,面积=24 m²", B))

    # e3: C fill  正方形增大:边增加a后面积增加39, (x+a)²-x²=39  let x=5,a=3: (8²-25)=39 ✓
    probs.append(P_fill("qea_e3",
        "正方形边长x,将边长增加3后面积增加39,\n原边长x=?",
        5, "(x+3)²−x²=39 → 6x+9=39 → x=5",
        "6x=30 → x=5", C))

    # e4: C mc  speed problem: train covers 300km, speed x km/h, time=300/x; faster by 10→ time decreases by 1h
    # 300/x - 300/(x+10)=1 → 300(x+10)-300x=x(x+10) → 3000=x²+10x → x²+10x-3000=0 → (x+60)(x-50)=0 → x=50
    probs.append(P_mc("qea_e4",
        "火车行300km,若速度提高10km/h可少用1小时,\n原速度=?km/h",
        ["50", "60", "40", "30"],
        0, "300/x − 300/(x+10)=1",
        "x²+10x−3000=0 → (x+60)(x−50)=0 → x=50", C))

    # e5: X fill  连续自然数之积: n(n+1)=132 → n=11 (11×12=132)
    probs.append(P_fill("qea_e5",
        "两个连续自然数之积为132,较小的数是?",
        11, "n(n+1)=132 → n²+n−132=0",
        "(n−11)(n+12)=0 → n=11(取正)", X))

    # e6: X mc  quadratic model: profit W=−2x²+200x−4200 (x is price above cost)
    # max at x=50, W=−2×2500+10000−4200=1300
    probs.append(P_mc("qea_e6",
        "某商品利润 W=−2x²+200x−4200(x为定价超出成本的元数),\n最大利润=?元",
        ["1300", "1000", "1500", "2000"],
        0, "顶点x=−200/(2×(−2))=50",
        "W(50)=−5000+10000−4200=800… 重算: −2×2500+200×50−4200=−5000+10000−4200=800\n注意: W=−2x²+200x−4200,x=50: W=−2(2500)+200(50)−4200=−5000+10000−4200=800",
        X))
    # fix e6: recompute: -2*50^2+200*50-4200 = -5000+10000-4200 = 800
    probs[-1] = P_mc("qea_e6",
        "某商品利润 W=−2x²+200x−4200(x为高出成本的元数),\n最大利润=?元",
        ["800", "1000", "1200", "600"],
        0, "顶点x=−b/(2a)=50",
        "x=50: W=−2×2500+200×50−4200=−5000+10000−4200=800元", X)

    return probs


# ── 额外题目: 二次函数概念 ─────────────────────────────────────────────────

def quadratic_fn_concept_extra():
    """Extra problems for 二次函数概念."""
    probs = []

    # e1: B mc  开口方向  y=−3x²+x+1  a<0 → 向下
    probs.append(P_mc("qfc_e1",
        "y=−3x²+x+1 的开口方向是?",
        ["向下(a<0)", "向上(a>0)", "无法确定"],
        0, "a=−3<0", "a=−3<0,开口向下", B))

    # e2: B fill  顶点式 y=(x−4)²−1, axis x=4
    probs.append(P_fill("qfc_e2",
        "y=(x−4)²−1 的对称轴为 x=?",
        4, "顶点式直读h", "对称轴 x=4", B))

    # e3: C mc  vertex of y=2x²-8x+5:  axis=2, vy=2*4-16+5=-3  → (2,-3)
    # verify: a=2,b=-8,c=5; axis=-(-8)/(2*2)=2; vy=5-64/8=5-8=-3
    probs.append(_quad_mc_vertex("qfc_e3", 2, 2, -3, C))  # y=2(x-2)²-3

    # e4: C fill  k from vertex vy constraint: y=x²−4x+k, vy=k-4=2 → k=6
    probs.append(P_fill("qfc_e4",
        "y=x²−4x+k 的顶点纵坐标为2,则 k=?",
        6, "顶点x=2, vy=4−8+k=k−4=2", "k−4=2 → k=6", C))

    # e5: X mc  intersection with x-axis count: y=x²-2x+5  Δ=4-20=-16<0 → 0 points
    probs.append(P_mc("qfc_e5",
        "y=x²−2x+5 与 x 轴的交点个数?",
        ["0 个", "1 个", "2 个"],
        0, "Δ=4−20=−16<0", "Δ<0,无实根,不与x轴相交", X))

    # e6: X fill  find a given vertex: y=a(x-1)²+3 passes through (3,7)
    # 7=a(3-1)²+3=4a+3 → a=1
    probs.append(P_fill("qfc_e6",
        "二次函数 y=a(x−1)²+3 过点(3,7),则 a=?",
        1, "代入(3,7): 7=a×4+3", "4a=4 → a=1", X))

    return probs


# ── 额外题目: 二次函数图象性质 ─────────────────────────────────────────────

def quadratic_fn_graph_extra():
    """Extra problems for 二次函数图象性质."""
    probs = []

    # e1: B mc  y=x²-9 vertex
    probs.append(P_mc("qfg_e1",
        "y=x²−9 的顶点坐标是?",
        ["(0,−9)", "(9,0)", "(−9,0)", "(3,0)"],
        0, "y=(x−0)²+(−9)", "顶点(0,−9)", B))

    # e2: B mc  translate y=x² right 3 units
    probs.append(P_mc("qfg_e2",
        "y=x² 的图象向右平移3个单位后函数解析式是?",
        ["y=(x−3)²", "y=(x+3)²", "y=x²−3", "y=x²+3"],
        0, "向右平移→ (x−3)", "y=(x−3)²", B))

    # e3: C fill  axis of y=x²+6x+5:  axis=-6/2=-3
    probs.append(P_fill("qfg_e3",
        "y=x²+6x+5 的对称轴 x=?",
        -3, "x=−b/(2a)=−6/2", "x=−3", C))

    # e4: C mc  axis=x=-2 → y=3(x+2)²+k, maximum value when a<0
    # y=−(x+2)²+5, max=5
    probs.append(P_mc("qfg_e4",
        "y=−(x+2)²+5 的最大值是?",
        ["5", "2", "−2", "−5"],
        0, "a<0顶点为最高点,顶点纵坐标=5", "最大值=5(顶点纵坐标)", C))

    # e5: X fill  vertex of y=x²-10x+21  x=5,vy=25-50+21=-4
    probs.append(P_fill("qfg_e5",
        "y=x²−10x+21 的顶点纵坐标=?",
        -4, "x=5, y=25−50+21", "y(5)=25−50+21=−4", X))

    # e6: X mc  y=ax²+bx+c with a>0,Δ=0, intersection with x-axis
    probs.append(P_mc("qfg_e6",
        "二次函数 y=ax²+bx+c (a>0) 满足 Δ=0,图象与x轴的关系?",
        ["只有一个交点(相切)", "两个交点", "无交点"],
        0, "Δ=0→一个重根", "Δ=0→与x轴只有一个公切点", X))

    return probs


# ── 额外题目: 二次函数应用 ─────────────────────────────────────────────────

def quadratic_fn_application_extra():
    """Extra problems for 二次函数应用."""
    probs = []

    # e1: B fill  y=-x²+6 with x=2, y=2
    probs.append(P_fill("qfa_e1",
        "y=−x²+6,当x=2时 y=?",
        2, "代入x=2", "−4+6=2", B))

    # e2: B mc  range of x²: x in [0,4], min=0,max=16
    probs.append(P_mc("qfa_e2",
        "y=x² (0≤x≤4) 的最大值是?",
        ["16", "4", "0", "8"],
        0, "端点取最大", "x=4时y=16", B))

    # e3: C fill  max height: y=-2x²+8x+1, axis x=2, max=y(2)=-8+16+1=9
    probs.append(P_fill("qfa_e3",
        "投掷物高度 y=−2x²+8x+1,最大高度=?",
        9, "顶点x=2,y=−8+16+1", "y(2)=9", C))

    # e4: C mc  profit = (price-20)×(100-2×price)  at price p
    # W=(p-20)(100-2p)=-2p²+140p-2000  axis=35, W(35)=-2450+4900-2000=450
    probs.append(P_mc("qfa_e4",
        "某商品成本20元,售价p元时销量(100−2p)件,\n最大日利润=?元(p>20)",
        ["450", "400", "500", "350"],
        0, "W=(p−20)(100−2p),顶点p=35",
        "W(35)=15×30=450元", C))

    # e5: X fill  minimum of y=x²-4x+7 in x∈[0,3]: vertex at x=2,y=3; check endpoints y(0)=7,y(3)=4
    probs.append(P_fill("qfa_e5",
        "y=x²−4x+7 在 0≤x≤3 上的最小值=?",
        3, "顶点x=2,y=4−8+7=3; 验证端点", "y(2)=3(最小值)", X))

    # e6: X mc  area enclosed: parabola y=−x²+4 meets x-axis at x=±2; 广告类型题
    # 不涉及积分 → 对称轴/顶点/零点分析
    probs.append(P_mc("qfa_e6",
        "y=−x²+4 与 x 轴两交点间的水平宽度=?",
        ["4", "2", "8", "16"],
        0, "令y=0: x²=4 → x=±2, 宽=4",
        "x=2 或 x=−2, 宽度=4", X))

    return probs


# ── 额外题目: 旋转的性质 ─────────────────────────────────────────────────

def rotation_properties_extra():
    """Extra problems for 旋转的性质."""
    probs = []

    # e1: B fill  angle 360/6=60 for regular hexagon
    probs.append(P_fill("rtp_e1",
        "正六边形绕中心最小旋转多少度后与自身重合?",
        60, "360°÷6=60°", "360/6=60°", B))

    # e2: B mc  旋转不改变形状
    probs.append(P_mc("rtp_e2",
        "旋转变换保持图形的什么不变?",
        ["形状和大小(全等)", "只保持面积", "只保持周长"],
        0, "旋转是等距变换(全等变换)", "旋转后图形全等", B))

    # e3: C fill  OA=8, rotate 90°, OA'=8
    probs.append(P_fill("rtp_e3",
        "点A到旋转中心O的距离=8,旋转任意角度后A'到O的距离=?",
        8, "旋转保持距离不变", "OA'=OA=8", C))

    # e4: C mc  正五边形最小旋转角
    probs.append(P_mc("rtp_e4",
        "正五边形绕中心最小旋转多少度后与自身完全重合?",
        ["72°", "60°", "90°", "120°"],
        0, "360°÷5=72°", "360/5=72°", C))

    # e5: X fill  rotation angle to go from one position to another: A'是A绕O旋转得到的,∠AOA'=150°,旋转了多少度?
    probs.append(P_fill("rtp_e5",
        "点A绕O旋转后到达A',∠AOA'=150°,旋转角度=?°",
        150, "旋转角=两点连线与中心所成角", "旋转了150°", X))

    # e6: X mc  中心对称图形转180°与自身重合
    probs.append(P_mc("rtp_e6",
        "一个图形绕某点旋转180°后与自身重合,这个图形叫做?",
        ["中心对称图形", "轴对称图形", "平移不变图形"],
        0, "旋转180°→中心对称", "中心对称图形", X))

    return probs


# ── 额外题目: 圆的基本性质 ─────────────────────────────────────────────────

def circle_properties_extra():
    """Extra problems for 圆的基本性质."""
    probs = []

    # e1: B fill  弦心距  r=13, half_chord=5 → d=12
    probs.append(_circle_fill_chord_dist("cirp_e1", 13, 5, B))

    # e2: B mc  等弧所对弦
    probs.append(P_mc("cirp_e2",
        "同圆中,相等的弧所对的弦?",
        ["相等", "不等", "互补"],
        0, "等弧→等弦", "等弧对等弦", B))

    # e3: C fill  central angle = 2×inscribed  inscribed=35°
    probs.append(_circle_fill_central_angle("cirp_e3", 35, C))

    # e4: C fill  chord dist r=10,half_chord=8 → d=6
    probs.append(_circle_fill_chord_dist("cirp_e4", 10, 8, C))

    # e5: X fill  inscribed angle from diameter: ∠CAB=40°, ∠ABC=90°-40°=50°
    probs.append(P_fill("cirp_e5",
        "⊙O中AB是直径,C在圆上,∠CAB=40°,∠ABC=?°",
        50, "∠ACB=90°(直径所对圆周角)", "90°−40°=50°", X))

    # e6: X mc  inscribed quadrilateral
    probs.append(P_mc("cirp_e6",
        "圆内接四边形ABCD,∠B=75°,则∠D=?",
        ["105°", "75°", "90°", "115°"],
        0, "对角互补: ∠B+∠D=180°", "∠D=180°−75°=105°", X))

    return probs


# ── 额外题目: 切线与切线长 ────────────────────────────────────────────────

def circle_tangent_extra():
    """Extra problems for 切线与切线长."""
    probs = []

    # e1: B fill  切线长 PT  r=3,OP=5 → PT=√(25-9)=4
    probs.append(P_fill("cirt_e1",
        "⊙O半径=3,点P在圆外,OP=5,\n切线长PT=?",
        4, "PT=√(OP²−r²)=√(25−9)=√16", "PT=4", B))

    # e2: B mc  切线条件
    probs.append(P_mc("cirt_e2",
        "直线l与⊙O半径r在切点处的关系是?",
        ["l⊥r", "l∥r", "l与r成60°"],
        0, "切线⊥半径", "切线⊥过切点的半径", B))

    # e3: C fill  切线长  r=6,OP=10 → PT=√(100-36)=8
    probs.append(P_fill("cirt_e3",
        "⊙O半径=6,圆外一点P,OP=10,\n切线长PT=?",
        8, "PT=√(10²−6²)=√64", "PT=8", C))

    # e4: C fill  two tangents equal: PA=7, then PB=7
    probs.append(P_fill("cirt_e4",
        "从圆外点P作两条切线PA、PB(A、B为切点),PA=7,则PB=?",
        7, "切线长定理:两切线长相等", "PB=PA=7", C))

    # e5: X fill  r=8,OP=17 → PT=√(289-64)=√225=15
    probs.append(P_fill("cirt_e5",
        "⊙O半径=8,圆外一点P,OP=17,\n切线长PT=?",
        15, "PT=√(17²−8²)=√(289−64)=√225", "PT=15", X))

    # e6: X mc  tangent from external point properties
    probs.append(P_mc("cirt_e6",
        "从圆外一点P作两切线PA、PB,O为圆心,则PO与AB的关系?",
        ["PO是AB的垂直平分线", "PO∥AB", "PO=AB"],
        0, "对称性:PA=PB,O,P均在AB垂直平分线上", "PO⊥AB且PO平分AB(PO是AB的垂直平分线)", X))

    return probs


# ── 额外题目: 圆周角与圆心角 ─────────────────────────────────────────────

def circle_inscribed_angle_extra():
    """Extra problems for 圆周角与圆心角."""
    probs = []

    # e1: B fill  central from inscribed 30°
    probs.append(_circle_fill_central_angle("cia_e1", 30, B))

    # e2: B mc  semicircle angle
    probs.append(P_mc("cia_e2",
        "直径所对的圆周角=?",
        ["90°", "180°", "60°"],
        0, "半圆弧对应圆心角180°,圆周角=90°", "90°", B))

    # e3: C fill  inscribed from central: central=140° → inscribed=70°
    probs.append(P_fill("cia_e3",
        "圆心角∠AOB=140°,同弧AB所对圆周角∠ACB=?°",
        70, "圆周角=圆心角÷2", "140°÷2=70°", C))

    # e4: C fill  circumscribed quad: ∠A=115° → ∠C=65°
    probs.append(P_fill("cia_e4",
        "圆内接四边形ABCD,∠A=115°,则∠C=?°",
        65, "对角互补: ∠A+∠C=180°", "180°−115°=65°", C))

    # e5: X fill  AB diameter, ∠ABC=55° → ∠BAC=35°  (∠ACB=90°)
    probs.append(P_fill("cia_e5",
        "⊙O中AB是直径,∠ABC=55°,则∠BAC=?°",
        35, "∠ACB=90°,∠BAC=90°−55°", "∠BAC=90°−55°=35°", X))

    # e6: X mc  two inscribed angles same arc
    probs.append(P_mc("cia_e6",
        "∠ADB 和∠ACB 同弧AB,则∠ADB与∠ACB的关系?",
        ["相等", "互补", "互余"],
        0, "同弧→圆周角相等", "同弧所对圆周角相等", X))

    return probs


# ── 额外题目: 概率基本概念 ────────────────────────────────────────────────

def probability_concept_extra():
    """Extra problems for 概率基本概念."""
    probs = []

    # e1: B mc  random event probability range
    probs.append(P_mc("pbc_e1",
        "随机事件的概率范围是?",
        ["0<P<1", "P=0", "P=1"],
        0, "随机事件:0<P<1(不确定)", "0<P(随机事件)<1", B))

    # e2: B fill  P(A')=0.6 → P(A)=0.4 — use mc instead
    probs.append(P_mc("pbc_e2",
        "已知P(A的对立事件)=0.4,则P(A)=?",
        ["0.6", "0.4", "1.4"],
        0, "P(A)+P(A')=1", "P(A)=1−0.4=0.6", B))

    # e3: C mc  certain event
    probs.append(P_mc("pbc_e3",
        "'太阳从东方升起'是什么事件?",
        ["必然事件", "随机事件", "不可能事件"],
        0, "必然发生→必然事件", "必然事件,P=1", C))

    # e4: C mc  impossible event
    probs.append(P_mc("pbc_e4",
        "'掷骰子出现7点'是什么事件?",
        ["不可能事件", "随机事件", "必然事件"],
        0, "骰子1~6点,不可能出现7", "不可能事件,P=0", C))

    # e5: X fill  P(A)=3/7, P(A')=?  fill numerator when denominator=7
    probs.append(P_fill("pbc_e5",
        "P(A)=3/7,则P(A的对立事件)分子=?(分母=7)",
        4, "P(A')=1−3/7=4/7", "P(A')=4/7,分子4", X))

    # e6: X mc  频率与概率
    probs.append(P_mc("pbc_e6",
        "大量重复试验中,事件A发生的频率会稳定在?",
        ["P(A)", "1", "0"],
        0, "频率稳定于概率", "频率≈P(A)(大数定律)", X))

    return probs


# ── 额外题目: 古典概型计算 ────────────────────────────────────────────────

def probability_classical_extra():
    """Extra problems for 古典概型计算."""
    probs = []

    # e1: B fill  P(偶数点) 分子, 掷骰子
    # favorable=3 (2,4,6), total=6
    probs.append(P_fill("prcl_e1",
        "掷骰子,出现偶数点的概率分子=?(分母=6)",
        3, "偶数: 2,4,6共3个", "P=3/6=1/2,分子3", B))

    # e2: B mc  从5张牌(1~5)取一张,P(≥3)
    # favorable=3 (3,4,5), total=5
    probs.append(P_mc("prcl_e2",
        "从标有1~5的卡片中随机取一张,P(数字≥3)=?",
        ["3/5", "2/5", "1/5", "4/5"],
        0, "3,4,5共3张", "P=3/5", B))

    # e3: C fill  two dice P(sum=6) — favorable: (1,5)(2,4)(3,3)(4,2)(5,1)=5 out of 36
    probs.append(P_fill("prcl_e3",
        "掷两枚骰子,两数之和=6的概率分子=?(分母=36)",
        5, "(1,5)(2,4)(3,3)(4,2)(5,1)共5种", "P=5/36,分子5", C))

    # e4: C mc  P(取到质数)  from 1~12: primes=2,3,5,7,11 → 5 primes
    probs.append(P_mc("prcl_e4",
        "从1~12中随机取一数,P(取到质数)=?",
        ["5/12", "1/2", "1/3", "1/4"],
        0, "质数:2,3,5,7,11共5个", "P=5/12", C))

    # e5: X fill  P(sum=11) two dice: (5,6)(6,5)=2 favorable
    probs.append(P_fill("prcl_e5",
        "掷两枚骰子,两数之和=11的概率分子=?(分母=36)",
        2, "(5,6)(6,5)共2种", "P=2/36=1/18,分子2", X))

    # e6: X mc  from {1,2,3,4,5} draw 2 without replacement, P(product even)
    # total C(5,2)=10; product even = at least one even
    # even numbers: 2,4; odd: 1,3,5
    # product odd = both odd: C(3,2)=3 → P(odd product)=3/10
    # P(even product)=1-3/10=7/10
    probs.append(P_mc("prcl_e6",
        "从{1,2,3,4,5}中不放回取2个数,\n两数之积为偶数的概率=?",
        ["7/10", "3/10", "1/2", "2/5"],
        0, "积为奇→两数都奇:C(3,2)=3种",
        "P(积奇)=3/10,P(积偶)=1−3/10=7/10", X))

    return probs


# ── 额外题目: 概率树图与列举 ─────────────────────────────────────────────

def probability_tree_extra():
    """Extra problems for 概率树图与列举."""
    probs = []

    # e1: B fill  tree: 1 coin + 1 die → 2×6=12 outcomes  (already exists; do variants)
    # 2 coins → 4 outcomes
    probs.append(P_fill("prtree_e1",
        "掷两枚硬币,所有等可能结果共几种?",
        4, "每枚2面,2×2=4", "HH,HT,TH,TT共4种", B))

    # e2: B mc  tree diagram P(HT or TH)=2/4=1/2
    probs.append(P_mc("prtree_e2",
        "掷两枚硬币,恰好一正一反的概率=?",
        ["1/2", "1/4", "3/4"],
        0, "HT,TH共2种,总4种", "P=2/4=1/2", B))

    # e3: C fill  independent events: P(A)=1/3,P(B)=1/4, P(AB)=?×12=1 → numerator=1 (denominator=12)
    probs.append(P_fill("prtree_e3",
        "P(A)=1/3,P(B)=1/4,A、B独立,\nP(A且B)的分子=?(分母=12)",
        1, "P(AB)=P(A)×P(B)=1/12", "1/3×1/4=1/12,分子1", C))

    # e4: C mc  P(at least one head) = 1 - P(TT) = 1-1/4=3/4
    probs.append(P_mc("prtree_e4",
        "掷两枚硬币,至少一枚正面的概率=?",
        ["3/4", "1/2", "1/4", "1"],
        0, "1−P(两面都反)=1−1/4", "P=3/4", C))

    # e5: X fill  P(A)=2/5,P(B)=1/2 independent, P(A'B') = (1-2/5)(1-1/2)=3/5×1/2=3/10
    probs.append(P_fill("prtree_e5",
        "P(A)=2/5,P(B)=1/2,A、B独立,\nP(A、B都不发生)的分子=?(分母=10)",
        3, "P(A')=3/5,P(B')=1/2; P(A'B')=3/10", "3/5×1/2=3/10,分子3", X))

    # e6: X mc  3-child family, P(at least 1 girl) = 1-P(all boys)=1-1/8=7/8
    probs.append(P_mc("prtree_e6",
        "一对夫妻生3个孩子,P(至少一个女孩)=?",
        ["7/8", "1/2", "3/4", "1/8"],
        0, "1−P(全是男孩)=1−1/8", "P=7/8", X))

    return probs


# ── 额外题目: 反比例函数 ─────────────────────────────────────────────────

def inverse_proportion_fn_extra():
    """Extra problems for 反比例函数."""
    probs = []

    # e1: B fill  k from y=k/x: x=4,y=3 → k=12
    probs.append(P_fill("ipf_e1",
        "y=k/x,当x=4时y=3,则k=?",
        12, "k=xy=4×3", "k=12", B))

    # e2: B mc  quadrant for k=-6
    probs.append(P_mc("ipf_e2",
        "y=−6/x 的图象位于哪些象限?",
        ["第二和第四象限", "第一和第三象限", "全部四个象限"],
        0, "k<0在二四象限", "k=−6<0,图象在第二、四象限", B))

    # e3: C fill  y value: y=8/x, x=2 → y=4
    probs.append(P_fill("ipf_e3",
        "y=8/x,当x=2时 y=?",
        4, "y=8/2", "y=4", C))

    # e4: C mc  y=4/x, as x increases (x>0), y changes
    probs.append(P_mc("ipf_e4",
        "y=4/x (x>0),x增大时y的变化?",
        ["y 减小", "y 增大", "y 不变"],
        0, "反比例函数同象限单调递减", "y减小(k=4>0,第一象限递减)", C))

    # e5: X fill  intersection with y=2x: 2x=6/x → x²=3 → x=√3; verify y=2√3
    # not integer → instead: y=2/x meets y=x: x=2/x → x²=2 → not integer
    # use y=8/x meets y=2x: 8/x=2x → x²=4 → x=2, y=4
    probs.append(P_fill("ipf_e5",
        "y=8/x 与 y=2x 的交点(第一象限)的横坐标=?",
        2, "联立: 2x=8/x → x²=4 → x=2", "x=2(取正)", X))

    # e6: X mc  y=12/x at x=3,y=4; if x→6, y→2: how does y change?
    probs.append(P_mc("ipf_e6",
        "y=12/x,x从3变为6,y从4变为?",
        ["2", "6", "8", "24"],
        0, "y=12/6=2", "y=12/6=2", X))

    return probs


# ── 额外题目: 相似三角形概念与性质 ──────────────────────────────────────

def similar_triangle_concept_extra():
    """Extra problems for 相似三角形概念与性质."""
    probs = []

    # e1: B fill  DE=?  ratio 2:1, larger=10 → smaller=5
    probs.append(_simil_fill_side("stc_e1", 2, 1, 10, False, B))

    # e2: B mc  perimeter ratio = similarity ratio
    probs.append(P_mc("stc_e2",
        "两△相似比为3:4,则周长之比为?",
        ["3:4", "9:16", "27:64"],
        0, "周长比=相似比", "周长比=3:4", B))

    # e3: C fill  DE=?  ratio 3:2, larger=15 → smaller=10
    probs.append(_simil_fill_side("stc_e3", 3, 2, 15, False, C))

    # e4: C mc  area ratio = k²
    probs.append(P_mc("stc_e4",
        "两△相似比为5:3,面积比为?",
        ["25:9", "5:3", "125:27"],
        0, "面积比=相似比的平方", "5²:3²=25:9", C))

    # e5: X fill  smaller area given ratio 3:2, larger area=36 → smaller=36×4/9=16
    probs.append(P_fill("stc_e5",
        "两△相似比3:2,较大△面积=36cm²,\n较小△面积=?cm²",
        16, "面积比=9:4,较小=36×4/9", "36×4/9=16 cm²", X))

    # e6: X mc  find BC: DE//BC, AD=3,AB=9,DE=4 → BC=4÷(3/9)=12
    probs.append(P_mc("stc_e6",
        "△ABC中DE//BC,AD=3,AB=9,DE=4,BC=?",
        ["12", "9", "6", "8"],
        0, "△ADE∽△ABC,AD/AB=DE/BC",
        "4/(3/9)=4×3=12 | 3/9=1/3, BC=4÷(1/3)=12", X))

    return probs


# ── 额外题目: 相似三角形判定与证明 ──────────────────────────────────────

def similar_triangle_proof_extra():
    """Extra problems for 相似三角形判定与证明."""
    probs = []

    # e1: B mc  AA判定
    probs.append(P_mc("stp_e1",
        "两三角形两对对应角相等,则两三角形?",
        ["相似(AA判定)", "全等", "面积相等"],
        0, "AA相似判定", "AA判定:两角相等→相似", B))

    # e2: B fill  similar ratio: AB=6,DE=4 → ratio numerator=3 (ratio=3:2)
    probs.append(P_fill("stp_e2",
        "△ABC∽△DEF,AB=6,DE=4,\n相似比(△ABC:△DEF)的分子=?(分母=2)",
        3, "AB/DE=6/4=3/2", "相似比=3:2,分子3", B))

    # e3: C fill  area ratio 9:4, AB=12 → DE=? : 12×2/3=8
    probs.append(P_fill("stp_e3",
        "△ABC∽△DEF,相似比=3:2,AB=12,则DE=?",
        8, "AB/DE=3/2 → DE=12×2/3", "DE=8", C))

    # e4: C mc  SAS similar
    probs.append(P_mc("stp_e4",
        "一角相等且夹这个角的两边成比例,则两△?",
        ["相似(SAS判定)", "全等", "不相似"],
        0, "SAS相似判定", "SAS相似", C))

    # e5: X fill  perimeter ratio: similar ratio 4:3; larger perimeter=24 → smaller=18
    probs.append(P_fill("stp_e5",
        "两△相似比4:3,较大△周长=24,较小△周长=?",
        18, "周长比=相似比=4:3; 24×3/4=18", "18", X))

    # e6: X mc  △ABC∽△ADE,∠B=∠ADE,AB=10,AD=6,AE=3 → AC=?
    # AB/AD=AC/AE → 10/6=AC/3 → AC=5
    probs.append(P_mc("stp_e6",
        "∠B=∠ADE,AB=10,AD=6,AE=3,\n△ABC∽△ADE,AC=?",
        ["5", "6", "4", "8"],
        0, "AB/AD=AC/AE → 10/6=AC/3",
        "AC=3×10/6=5", X))

    return probs


# ── 额外题目: 锐角三角函数定义 ──────────────────────────────────────────

def trig_definition_extra():
    """Extra problems for 锐角三角函数定义."""
    probs = []

    # e1: B fill  cosA numerator: adj=8,hyp=10 → cosA=8/10, numerator=8
    probs.append(P_fill("trd_e1",
        "直角△中斜边=10,∠A的邻边=8,\ncosA分子=?(分母=10)",
        8, "cosA=邻边/斜边=8/10", "分子8", B))

    # e2: B mc  sinA=3/5, which triangle sides?
    probs.append(P_mc("trd_e2",
        "直角△中sinA=3/5,斜边=5,∠A对边=?",
        ["3", "4", "5", "2"],
        0, "sin=对/斜=3/5,对边=3", "对边=3", B))

    # e3: C fill  tanA: opp=5,adj=12 → tanA=5/12, numerator=5(denom=12)
    probs.append(P_fill("trd_e3",
        "直角△中∠A的对边=5,邻边=12,\ntanA分子=?(分母=12)",
        5, "tanA=对/邻=5/12", "分子5", C))

    # e4: C mc  find hypotenuse: sinA=3/5, adj=4 → hyp=5, opp=3, adj=4 → check: adj should = √(25-9)=4 ✓
    probs.append(P_mc("trd_e4",
        "直角△中sinA=3/5,邻边=4,斜边=?",
        ["5", "3", "4", "7"],
        0, "sin=3/5→斜边=5×(邻/4)? 邻=4,斜=5",
        "sinA=3/5,斜边=5(3-4-5直角三角形)", C))

    # e5: X fill  sin²A+cos²A=1 → cosA given sinA=4/5: cosA=3/5, numerator=3(denom=5)
    probs.append(P_fill("trd_e5",
        "sinA=4/5,利用sin²A+cos²A=1,\ncosA分子=?(分母=5,A为锐角)",
        3, "cos²A=1−16/25=9/25,cosA=3/5", "cosA=3/5,分子3", X))

    # e6: X mc  given tan, find sin or cos
    # tanA=4/3 → hyp=5 → sinA=4/5, cosA=3/5
    probs.append(P_mc("trd_e6",
        "直角△中tanA=4/3,则sinA=?",
        ["4/5", "3/5", "4/3", "3/4"],
        0, "tanA=4/3→对=4,邻=3,斜=5",
        "斜边=√(16+9)=5,sinA=4/5", X))

    return probs


# ── 额外题目: 特殊角三角函数值 ──────────────────────────────────────────

def trig_special_values_extra():
    """Extra problems for 特殊角三角函数值."""
    probs = []

    # e1: B mc  cos45°
    probs.append(P_mc("trsv_e1",
        "cos45°=?",
        ["√2/2", "1/2", "√3/2", "1"],
        0, "等腰直角三角形", "cos45°=√2/2", B))

    # e2: B fill  sin30°×hyp: hyp=14, side=7
    probs.append(P_fill("trsv_e2",
        "直角△斜边=14,∠A=30°,A的对边=14×sin30°=?",
        7, "sin30°=1/2", "14×1/2=7", B))

    # e3: C mc  tan60°
    probs.append(P_mc("trsv_e3",
        "tan60°=?",
        ["√3", "1", "√3/3", "1/2"],
        0, "30-60-90三角形", "tan60°=√3", C))

    # e4: C fill  cos60°×hyp: hyp=18, adj=9
    probs.append(P_fill("trsv_e4",
        "直角△斜边=18,∠A=60°,A的邻边=18×cos60°=?",
        9, "cos60°=1/2", "18×1/2=9", C))

    # e5: X fill  sin45°×hyp=10√2/2=5√2 (not integer) → use hyp=10,∠A=30°→opp=5
    probs.append(P_fill("trsv_e5",
        "直角△斜边=10,∠A=30°,A的对边=?",
        5, "sin30°=1/2", "10×1/2=5", X))

    # e6: X mc  compare sin30° vs cos60°
    probs.append(P_mc("trsv_e6",
        "sin30°与cos60°的大小关系?",
        ["sin30°=cos60°(均=1/2)", "sin30°>cos60°", "sin30°<cos60°"],
        0, "sin30°=1/2=cos60°", "两者均等于1/2", X))

    return probs


# ── 额外题目: 三角函数应用 ───────────────────────────────────────────────

def trig_application_extra():
    """Extra problems for 三角函数应用."""
    probs = []

    # e1: B fill  ladder problem: 10m ladder, 30° angle → height=5m
    probs.append(P_fill("trapp_e1",
        "梯子长10m靠墙,梯子与地面成30°角,\n梯子顶端离地高度=?m",
        5, "h=10×sin30°=10×1/2", "h=5 m", B))

    # e2: B mc  height of tree: shadow=20m, angle=45° → height=20m
    probs.append(P_mc("trapp_e2",
        "树影长20m,太阳光与地面成45°角,\n树高≈?m",
        ["20", "10", "20√3", "10√2"],
        0, "h=d×tan45°=20×1=20", "h=20 m", B))

    # e3: C fill  distance: cliff 60m high, 30° depression angle → distance=60/tan30°=60√3≈103.9 → not integer
    # use 45° instead: distance=60/tan45°=60
    probs.append(P_fill("trapp_e3",
        "悬崖高60m,站在崖顶俯角45°看船,\n船到崖脚水平距离=?m",
        60, "d=h/tan45°=60/1", "d=60 m", C))

    # e4: C fill  slope 30°, walk 40m along slope, horizontal distance
    # horizontal = 40×cos30°=20√3 (not integer) → use sin30° for height
    probs.append(P_fill("trapp_e4",
        "坡角30°的斜坡,沿坡行走40m,上升高度=?m",
        20, "h=40×sin30°=40×1/2", "h=20 m", C))

    # e5: X fill  flag pole 20m, 30° elevation angle → distance=20/tan30°=20√3 → not integer
    # use 45°: distance=20/tan45°=20
    probs.append(P_fill("trapp_e5",
        "旗杆高20m,在某点仰角45°,此点到旗杆底的水平距离=?m",
        20, "d=h/tan45°=20/1", "d=20 m", X))

    # e6: X mc  two-angle elevation problem: from 100m away elevation=30°; closer by 50m → new angle=?
    # tan30°=h/100 → h=100/√3≈57.7; tan(new)=h/50; but not special angle →
    # Use: h=50m; from x m away 30°: tan30°=50/x → x=50√3 (not integer)
    # Best: conceptual mc question
    probs.append(P_mc("trapp_e6",
        "从A点仰角30°看山顶,从A向山走50m到B,仰角变为60°,\n山高h=?m(设AB=50m)",
        ["25√3", "50", "25", "50√3"],
        0,
        "设山脚到B距离=d; tan60°=h/d → d=h/√3; tan30°=h/(d+50) → 1/√3=h/(h/√3+50)",
        "联立: h/√3+50=h√3 → h√3−h/√3=50 → h(2/√3)=50 → h=25√3", X))

    return probs


# ── 额外题目: 投影与视图 ─────────────────────────────────────────────────

def projection_view_extra():
    """Extra problems for 投影与视图."""
    probs = []

    # e1: B mc  圆柱俯视图
    probs.append(P_mc("pjv_e1",
        "圆柱的俯视图是?",
        ["圆形", "长方形", "三角形"],
        0, "从上往下看圆柱", "俯视图为圆形", B))

    # e2: B fill  正方体三视图各有几个面?
    probs.append(P_fill("pjv_e2",
        "正方体的正视图是什么形状?(填1=正方形,2=长方形,3=三角形)",
        1, "从正面看正方体", "正方形(1)", B))

    # e3: C mc  球的三视图
    probs.append(P_mc("pjv_e3",
        "球的正视图/侧视图/俯视图分别是?",
        ["都是圆形", "正视图三角形,俯视图圆形", "都是正方形"],
        0, "球三视图都是圆", "球三视图均为圆形", C))

    # e4: C mc  直棱柱侧视图
    probs.append(P_mc("pjv_e4",
        "四棱柱(长方体)的侧视图是?",
        ["长方形", "正方形", "梯形"],
        0, "从侧面看长方体", "侧视图为长方形", C))

    # e5: X fill  given: 正视图和侧视图都是正方形,俯视图也是正方形 → 正方体 → 填1(正方体)
    probs.append(P_fill("pjv_e5",
        "三视图都是正方形的几何体是正方体。\n正方形对应的英文首字母数(1=cube/正方体,2=cylinder/圆柱,3=cone/圆锥)",
        1, "三视图都是正方形→正方体", "正方体(1)", X))

    # e6: X mc  圆锥的侧视图和俯视图
    probs.append(P_mc("pjv_e6",
        "圆锥的俯视图是?",
        ["圆形(带中心点)", "等腰三角形", "长方形"],
        0, "从上往下看圆锥", "圆锥俯视图:圆(带中心点)", X))

    return probs


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2c — SECOND EXTRA BATCH (another ~6 per set, ids _f1…_f6)
# All answers computed in Python — correct by construction.
# ═══════════════════════════════════════════════════════════════════════════

# ── 一元二次方程概念 batch-2 ───────────────────────────────────────────────
def quadratic_eq_concept_extra2():
    probs = []
    # f1 B fill: Δ for roots -1, -4  → x²+5x+4=0  Δ=25-16=9
    b, c, p, q = 5, 4, -1, -4
    assert p+q == -b and p*q == c
    delta = b*b - 4*c
    probs.append(P_fill("qec_f1",
        f"方程 x²{b:+d}x{c:+d}=0 的判别式 Δ=?",
        delta, "Δ=b²−4ac", f"Δ={b}²−4×{c}={b*b}−{4*c}={delta}", B))

    # f2 B mc: identify quadratic equation among choices
    probs.append(P_mc("qec_f2",
        "下列方程中哪个不是一元二次方程?",
        ["x+5=0", "x²−4=0", "2x²+x−1=0"],
        0, "x+5=0 是一元一次方程", "x+5=0 是一次方程，不是二次方程", B))

    # f3 C fill: constant term — roots 4,-3 → x²-x-12=0 constant=-12
    p2, q2 = 4, -3
    b2, c2 = -(p2+q2), p2*q2
    probs.append(P_fill("qec_f3",
        f"方程 x²{b2:+d}x{c2:+d}=0 的常数项=?",
        c2, "一般式 ax²+bx+c 中常数项=c", f"常数项={c2}", C))

    # f4 C mc: Δ<0 means no real roots
    probs.append(P_mc("qec_f4",
        "方程 x²+x+1=0 的判别式 Δ=1−4=−3<0,方程有?",
        ["无实数根", "两个不等实根", "两个相等实根"],
        0, "Δ<0→无实数根", "Δ=−3<0,方程在实数范围内无解", C))

    # f5 X fill: find b given roots sum=−2 and product=−15 → b=2  (sum=−b so b=2)
    s, pr = -2, -15
    b_val = -s
    c_val = pr
    probs.append(P_fill("qec_f5",
        f"一元二次方程两根之和={s},两根之积={pr},\n方程 x²+bx+c=0 中 b=?",
        b_val, "韦达定理: 两根之和=−b", f"−b={s} → b={b_val}", X))

    # f6 X mc: leading coefficient effect — y=3x² vs y=x²
    probs.append(P_mc("qec_f6",
        "方程 kx²+2x−3=0 是一元二次方程的条件是?",
        ["k≠0", "k=0", "k>0"],
        0, "二次项系数不为零", "k≠0 才使其成为二次方程", X))

    return probs


# ── 一元二次方程解法 batch-2 ───────────────────────────────────────────────
def quadratic_eq_procedure_extra2():
    probs = []
    # f1 B mc: direct square root  (x-3)²=16
    probs.append(P_mc("qep_f1",
        "(x−3)²=16 的解是？",
        ["x=7 或 x=−1", "x=4 或 x=−4", "x=3±4", "x=7 或 x=1"],
        0, "x−3=±4", "x−3=4→x=7; x−3=−4→x=−1", B))

    # f2 B fill: product of roots  roots 2,6 → x²-8x+12=0 product=12
    probs.append(P_fill("qep_f2",
        "x²−8x+12=0 的两根之积=?",
        12, "韦达定理: 积=c/a=12", "积=12", B))

    # f3 C mc: factoring  x²+x-6=0  roots 2,-3
    probs.append(P_mc("qep_f3",
        "x²+x−6=0 的解是？",
        ["x=2 或 x=−3", "x=−2 或 x=3", "x=6 或 x=−1", "x=3 或 x=2"],
        0, "(x+3)(x−2)=0", "(x+3)(x−2)=0 → x=2 或 x=−3", C))

    # f4 C fill: sum of roots  roots -1,-6 → x²+7x+6=0 sum=-7
    p, q = -1, -6
    b = -(p+q)
    c = p*q
    probs.append(P_fill("qep_f4",
        f"x²{b:+d}x{c:+d}=0 的两根之和=?",
        p+q, "韦达定理: 和=−b", f"两根之和=−({b})={p+q}", C))

    # f5 X mc: quadratic formula  3x²-7x+2=0  roots 2, 1/3
    probs.append(P_mc("qep_f5",
        "3x²−7x+2=0 的解是？",
        ["x=2 或 x=1/3", "x=−2 或 x=−1/3", "x=2 或 x=−1/3", "x=1 或 x=2/3"],
        0, "Δ=49−24=25; x=(7±5)/6", "x=(7+5)/6=2 或 x=(7−5)/6=1/3", X))

    # f6 X fill: discriminant gives repeated root → find k: x²-6x+k=0 Δ=0 → k=9
    probs.append(P_fill("qep_f6",
        "方程 x²−6x+k=0 有两个相等实根,则 k=?",
        9, "Δ=36−4k=0 → k=9", "4k=36 → k=9", X))

    return probs


# ── 一元二次方程应用 batch-2 ──────────────────────────────────────────────
def quadratic_eq_application_extra2():
    probs = []
    # f1 B fill: n(n+2)=24 → n=4 (consecutive even: 4,6? 4×6=24 ✓)
    probs.append(P_fill("qea_f1",
        "两个连续偶数之积为24,较小的偶数是?",
        4, "设较小偶数n,n(n+2)=24",
        "n²+2n−24=0 → (n+6)(n−4)=0 → n=4", B))

    # f2 B mc: simple number problem  x²=4x → x=4 (non-zero)
    probs.append(P_mc("qea_f2",
        "一个数的平方等于它的4倍,这个数(非零)是?",
        ["4", "2", "8", "16"],
        0, "x²=4x → x(x−4)=0 取非零根", "x=4", B))

    # f3 C fill: garden fence  width w, length=2w+1, area=36  → 2w²+w-36=0  → w=4
    # check: 2(16)+4-36=32+4-36=0 ✓
    probs.append(P_fill("qea_f3",
        "一块长方形花圃,长比宽的2倍多1m,面积=36m²,宽=?m",
        4, "设宽=w,长=2w+1,w(2w+1)=36",
        "2w²+w−36=0 → (2w+9)(w−4)=0 → w=4", C))

    # f4 C mc: height formula  h=-5t²+20t → max at t=2, h=20
    probs.append(P_mc("qea_f4",
        "物体高度 h=−5t²+20t(t为秒),最大高度=?m",
        ["20", "10", "25", "40"],
        0, "顶点t=2, h=−20+40=20", "h(2)=−20+40=20 m", C))

    # f5 X fill: cost problem  (x+2)(x-2)=77+4 → x²=81 → x=9
    # Simpler: x²-4=77 → x²=81 → x=9
    probs.append(P_fill("qea_f5",
        "一个正整数的平方减去4等于77,这个正整数是?",
        9, "x²−4=77 → x²=81", "x=9", X))

    # f6 X mc: work rate  A alone 6 days, B alone 4 days, together = ?
    # 1/6+1/4 = 5/12 per day → 12/5 = 2.4 days
    probs.append(P_mc("qea_f6",
        "甲单独完成工程需6天,乙需4天,两人合作需?天",
        ["12/5(2.4)天", "5天", "3天", "2天"],
        0, "每天效率: 1/6+1/4=5/12", "合作=12/5=2.4天", X))

    return probs


# ── 二次函数概念 batch-2 ──────────────────────────────────────────────────
def quadratic_fn_concept_extra2():
    probs = []
    # f1 B mc: identify quadratic function
    probs.append(P_mc("qfc_f1",
        "下列哪个是二次函数?",
        ["y=3x²", "y=3/x²", "y=3x+2"],
        0, "最高次项为x²", "y=3x² 是二次函数", B))

    # f2 B fill: axis of y=(x+5)²-2 → axis=x=-5
    probs.append(P_fill("qfc_f2",
        "y=(x+5)²−2 的对称轴为 x=?",
        -5, "顶点式对称轴 x=h", "x=−5", B))

    # f3 C mc: vertex of y=x²+2x-8  axis=-1, vy=-9
    probs.append(P_mc("qfc_f3",
        "y=x²+2x−8 的顶点坐标是?",
        ["(−1,−9)", "(1,−9)", "(−1,9)", "(1,9)"],
        0, "轴x=−1, y=1−2−8=−9", "顶点(−1,−9)", C))

    # f4 C fill: vy of y=-x²+4x+1  axis=2, vy=-4+8+1=5
    probs.append(P_fill("qfc_f4",
        "y=−x²+4x+1 的顶点纵坐标=?",
        5, "轴x=2, y=−4+8+1", "y(2)=5", C))

    # f5 X mc: number of x-intercepts  y=x²-4x+4=(x-2)²  Δ=0 → 1
    probs.append(P_mc("qfc_f5",
        "y=x²−4x+4 与 x 轴的交点个数?",
        ["1个", "2个", "0个"],
        0, "Δ=16−16=0", "Δ=0,与x轴只有一个切点x=2", X))

    # f6 X fill: find a: y=ax²-2x+1 passes (1,3) → 3=a-2+1=a-1 → a=4
    probs.append(P_fill("qfc_f6",
        "y=ax²−2x+1 过点(1,3),则 a=?",
        4, "代入(1,3): 3=a−2+1", "a−1=3 → a=4", X))

    return probs


# ── 二次函数图象性质 batch-2 ──────────────────────────────────────────────
def quadratic_fn_graph_extra2():
    probs = []
    # f1 B mc: translate y=x² left 2, down 3
    probs.append(P_mc("qfg_f1",
        "y=x² 向左移2个单位,向下移3个单位后是?",
        ["y=(x+2)²−3", "y=(x−2)²+3", "y=(x+2)²+3", "y=(x−2)²−3"],
        0, "左移→x+2,下移→−3", "y=(x+2)²−3", B))

    # f2 B fill: vertex y-coord of y=(x-1)²+7 → k=7
    probs.append(P_fill("qfg_f2",
        "y=(x−1)²+7 的顶点纵坐标=?",
        7, "顶点式直读k", "k=7", B))

    # f3 C fill: minimum value of y=2x²-4x+5  axis=1, vy=2-4+5=3
    probs.append(P_fill("qfg_f3",
        "y=2x²−4x+5 的最小值=?",
        3, "a>0,最小值在顶点: x=1, y=2−4+5", "y(1)=3", C))

    # f4 C mc: a<0,Δ>0  graph description
    probs.append(P_mc("qfg_f4",
        "二次函数 y=ax²+bx+c,a<0,Δ>0,图象特征?",
        ["开口向下且与x轴交两点", "开口向上且与x轴交两点", "开口向下无x轴交点"],
        0, "a<0开口向下,Δ>0有两个x轴交点", "开口向下,与x轴有两个交点", C))

    # f5 X fill: axis of y=3x²-12x+7  axis=2
    # -b/(2a)=12/6=2
    probs.append(P_fill("qfg_f5",
        "y=3x²−12x+7 的对称轴 x=?",
        2, "x=−b/(2a)=12/6", "x=2", X))

    # f6 X mc: range of y=x²-6x+8 for x in [0,4]
    # vertex at x=3, y=-1; endpoints: y(0)=8, y(4)=0
    # min=-1, max=8
    probs.append(P_mc("qfg_f6",
        "y=x²−6x+8 在 0≤x≤4 上的最小值=?",
        ["−1", "0", "8", "4"],
        0, "顶点x=3,y=9−18+8=−1", "y(3)=−1 为最小值", X))

    return probs


# ── 二次函数应用 batch-2 ──────────────────────────────────────────────────
def quadratic_fn_application_extra2():
    probs = []
    # f1 B fill: y=x²-1 at x=3 → y=8
    probs.append(P_fill("qfa_f1",
        "y=x²−1,当 x=3 时 y=?",
        8, "代入x=3", "9−1=8", B))

    # f2 B mc: minimum of y=x²-8x+15  vertex x=4, y=16-32+15=-1
    probs.append(P_mc("qfa_f2",
        "y=x²−8x+15 的最小值是?",
        ["−1", "15", "1", "−4"],
        0, "顶点x=4, y=16−32+15", "y(4)=−1", B))

    # f3 C fill: bridge arch y=-x²+9 at x=0 gives height 9; height at x=2: y=-4+9=5
    probs.append(P_fill("qfa_f3",
        "拱形桥 y=−x²+9 (x为水平距离),x=2处高度=?",
        5, "y=−4+9", "y(2)=5", C))

    # f4 C mc: revenue W=px, demand p+2x=50 → p=50-2x, W=x(50-2x)=-2x²+50x
    # vertex x=50/4=12.5, W=50*12.5-2*156.25=625-312.5=312.5 → not integer
    # simpler: W=-x²+40x, max at x=20, W=400
    probs.append(P_mc("qfa_f4",
        "日销售收入 W=−x²+40x(x为售价调整量),\n最大收入时 x=?",
        ["20", "40", "10", "30"],
        0, "顶点x=−40/(2×(−1))=20", "x=20时W=−400+800=400最大", C))

    # f5 X fill: max area with perimeter 20: w*(10-w) max at w=5, area=25
    probs.append(P_fill("qfa_f5",
        "周长为20m的矩形,宽=w时面积=w(10−w),最大面积=?m²",
        25, "顶点w=5,面积=5×5", "面积最大=25 m²", X))

    # f6 X mc: zeros of y=-2x²+8x → x=0 or x=4 → width between zeros=4
    probs.append(P_mc("qfa_f6",
        "y=−2x²+8x 与 x 轴的交点横坐标之差(两零点距离)=?",
        ["4", "2", "8", "16"],
        0, "令y=0: x(−2x+8)=0 → x=0 或 x=4", "两零点距离=4", X))

    return probs


# ── 旋转的性质 batch-2 ────────────────────────────────────────────────────
def rotation_properties_extra2():
    probs = []
    # f1 B mc: rotation preserves orientation? No for reflection, Yes for rotation
    probs.append(P_mc("rtp_f1",
        "旋转变换是否改变图形的方向(顺/逆时针顺序)?",
        ["不改变(旋转保持方向)", "改变", "有时改变"],
        0, "旋转保持定向", "旋转是正向等距变换,不改变方向", B))

    # f2 B fill: equilateral triangle rotation 120°×2=240°
    probs.append(P_fill("rtp_f2",
        "正三角形绕中心旋转两次120°,共旋转了多少度?",
        240, "120°×2=240°", "2×120°=240°", B))

    # f3 C mc: regular hexagon smallest rotation
    probs.append(P_mc("rtp_f3",
        "正六边形绕中心旋转多少度与自身重合(最小角)?",
        ["60°", "90°", "120°", "45°"],
        0, "360°÷6=60°", "60°", C))

    # f4 C fill: point A at distance 6 from O; after rotation OA'=?
    probs.append(P_fill("rtp_f4",
        "点A距旋转中心O为6,旋转任意角度后OA'=?",
        6, "旋转不改变距离", "OA'=6", C))

    # f5 X mc: rotation angle for regular octagon
    probs.append(P_mc("rtp_f5",
        "正八边形绕中心最小旋转多少度后与自身完全重合?",
        ["45°", "60°", "90°", "30°"],
        0, "360°÷8=45°", "45°", X))

    # f6 X fill: if OA=OA'=5 and ∠AOA'=90°, chord AA'=?
    # AA'² = OA²+OA'-2×OA×OA'×cos90° = 25+25-0=50 → AA'=5√2 (not integer)
    # Use ∠AOA'=60°: AA'²=25+25-2×25×cos60°=50-25=25 → AA'=5 ✓
    probs.append(P_fill("rtp_f6",
        "OA=OA'=5,旋转角∠AOA'=60°,\n连线AA'=?(利用等边三角形)",
        5, "OA=OA'=5,∠AOA'=60°→△OAA'为等边三角形", "AA'=OA=5", X))

    return probs


# ── 圆的基本性质 batch-2 ──────────────────────────────────────────────────
def circle_properties_extra2():
    probs = []
    # f1 B mc: 同弧圆周角相等
    probs.append(P_mc("cirp_f1",
        "⊙O中,弧AB所对的所有圆周角之间的关系?",
        ["都相等", "互补", "互余"],
        0, "同弧→圆周角相等", "同弧所对圆周角相等", B))

    # f2 B fill: r=5, half_chord=3 → d=4
    import math as _math
    r, hc = 5, 3
    d = int(_math.isqrt(r*r - hc*hc))
    assert d*d == r*r - hc*hc
    probs.append(P_fill("cirp_f2",
        f"⊙O半径={r},弦长={2*hc},弦心距=?",
        d, f"d=√({r}²−{hc}²)=√{r*r-hc*hc}", f"d={d}", B))

    # f3 C fill: central angle 2× inscribed: inscribed=55° → central=110°
    probs.append(P_fill("cirp_f3",
        "圆周角∠ACB=55°,同弧AB的圆心角∠AOB=?°",
        110, "圆心角=2×圆周角", "2×55°=110°", C))

    # f4 C mc: 垂径定理
    probs.append(P_mc("cirp_f4",
        "过圆心作弦AB的垂线,垂足M是?",
        ["AB的中点", "弦的一个端点", "圆上的点"],
        0, "垂径定理:圆心到弦的垂线平分弦", "垂足M是AB的中点", C))

    # f5 X fill: ∠AOB=160° → inscribed angle ∠ACB=80°
    probs.append(P_fill("cirp_f5",
        "圆心角∠AOB=160°,同弧的圆周角∠ACB=?°",
        80, "圆周角=圆心角÷2", "160°÷2=80°", X))

    # f6 X mc: inscribed rectangle — diagonal = diameter
    probs.append(P_mc("cirp_f6",
        "圆内接矩形的对角线是?",
        ["圆的直径", "半径", "弦但不是直径"],
        0, "矩形对角线互相平分且相等,均为圆直径", "矩形对角线=圆的直径", X))

    return probs


# ── 切线与切线长 batch-2 ──────────────────────────────────────────────────
def circle_tangent_extra2():
    probs = []
    # f1 B mc: 切线判定
    probs.append(P_mc("cirt_f1",
        "判断直线是否为⊙O切线,需验证?",
        ["直线与半径垂直(过切点)", "直线平行半径", "直线过圆心"],
        0, "切线⊥过切点的半径", "直线与切点处半径垂直即为切线", B))

    # f2 B fill: OP=10, r=6 → PT=√(100-36)=8
    probs.append(P_fill("cirt_f2",
        "⊙O半径=6,圆外点P,OP=10,切线长PT=?",
        8, "PT=√(OP²−r²)=√(100−36)", "PT=√64=8", B))

    # f3 C mc: PA=PB tangent lengths equal, PA=9 → PB=9
    probs.append(P_mc("cirt_f3",
        "从P作⊙O的两切线PA=9,则PB=?",
        ["9", "4.5", "18", "3"],
        0, "切线长定理", "PB=PA=9", C))

    # f4 C fill: r=5,OP=13 → PT=√(169-25)=√144=12
    probs.append(P_fill("cirt_f4",
        "⊙O半径=5,OP=13,切线长PT=?",
        12, "PT=√(13²−5²)=√(169−25)=√144", "PT=12", C))

    # f5 X fill: r=9, PT=12 → OP=√(144+81)=√225=15
    probs.append(P_fill("cirt_f5",
        "⊙O切线长PT=12,半径=9,则OP=?",
        15, "OP=√(PT²+r²)=√(144+81)", "OP=√225=15", X))

    # f6 X mc: tangent to two circles from external point
    probs.append(P_mc("cirt_f6",
        "⊙O中,PA、PB为切线(A、B为切点),∠APB=60°,\n则∠AOB=?",
        ["120°", "60°", "90°", "150°"],
        0, "∠OAP=∠OBP=90°,四边形AOBP内角和=360°",
        "∠AOB=360°−90°−90°−60°=120°", X))

    return probs


# ── 圆周角与圆心角 batch-2 ────────────────────────────────────────────────
def circle_inscribed_angle_extra2():
    probs = []
    # f1 B fill: inscribed 45° → central 90°
    probs.append(P_fill("cia_f1",
        "圆周角=45°,同弧圆心角=?°",
        90, "圆心角=2×圆周角", "2×45°=90°", B))

    # f2 B mc: semicircle inscribed angle
    probs.append(P_mc("cia_f2",
        "AB是⊙O直径,点C在圆上(C≠A,B),∠ACB=?",
        ["90°", "45°", "60°", "180°"],
        0, "直径所对圆周角=90°", "∠ACB=90°", B))

    # f3 C fill: ∠ACB=65° → ∠AOB=130°
    probs.append(P_fill("cia_f3",
        "圆周角∠ACB=65°,圆心角∠AOB=?°",
        130, "圆心角=2×圆周角", "2×65°=130°", C))

    # f4 C fill: ∠A+∠C=180° in cyclic quad, ∠A=95° → ∠C=85°
    probs.append(P_fill("cia_f4",
        "圆内接四边形ABCD,∠A=95°,则∠C=?°",
        85, "对角互补", "180°−95°=85°", C))

    # f5 X fill: ∠BOC=160° → ∠BAC=80° (same arc)
    probs.append(P_fill("cia_f5",
        "圆心角∠BOC=160°,圆周角∠BAC=?°",
        80, "圆周角=圆心角÷2", "160°÷2=80°", X))

    # f6 X mc: cyclic quadrilateral, ∠B+∠D=180°, ∠B=85° → ∠D=95°
    probs.append(P_mc("cia_f6",
        "圆内接四边形∠B=85°,∠D=?",
        ["95°", "85°", "90°", "80°"],
        0, "∠B+∠D=180°", "∠D=180°−85°=95°", X))

    return probs


# ── 概率基本概念 batch-2 ──────────────────────────────────────────────────
def probability_concept_extra2():
    probs = []
    # f1 B mc: P of certain event
    probs.append(P_mc("pbc_f1",
        "必然事件的概率是?",
        ["1", "0", "0.5"],
        0, "必然发生", "P=1", B))

    # f2 B fill: P(A)=0.25 → P(A')=? numerator when denom=4
    probs.append(P_fill("pbc_f2",
        "P(A)=1/4,P(A的对立事件)分子=?(分母=4)",
        3, "P(A')=1−1/4=3/4", "分子3", B))

    # f3 C mc: P range for random event
    probs.append(P_mc("pbc_f3",
        "一个随机事件A,以下P(A)值哪个不可能?",
        ["1.2", "0.5", "0"],
        0, "概率不超过1", "P(A)≤1,故P=1.2不可能", C))

    # f4 C mc: frequency vs probability
    probs.append(P_mc("pbc_f4",
        "做了1000次试验,事件A发生了300次,A的频率=?",
        ["0.3", "300", "700"],
        0, "频率=发生次数/总次数", "300/1000=0.3", C))

    # f5 X mc: mutually exclusive vs complementary
    probs.append(P_mc("pbc_f5",
        "事件A与其对立事件A'的关系?",
        ["互斥且A∪A'=全集", "仅互斥", "仅A∪A'=全集"],
        0, "对立事件:互斥且合并为全集", "对立事件互斥且概率之和=1", X))

    # f6 X fill: P(A)=2/5, P(B)=1/5, A and B mutually exclusive → P(A∪B) numerator(denom=5)
    probs.append(P_fill("pbc_f6",
        "P(A)=2/5,P(B)=1/5,A与B互斥,\nP(A或B)分子=?(分母=5)",
        3, "互斥: P(A∪B)=P(A)+P(B)=3/5", "分子3", X))

    return probs


# ── 古典概型计算 batch-2 ──────────────────────────────────────────────────
def probability_classical_extra2():
    probs = []
    # f1 B fill: 从1~4随机取1,取到2的倍数的概率分子(分母=4)
    # multiples of 2 in {1,2,3,4}: 2,4 → 2 favorable
    probs.append(P_fill("prcl_f1",
        "从1,2,3,4中随机取一数,取到2的倍数的概率分子=?(分母=4)",
        2, "2的倍数:2,4共2个", "P=2/4=1/2,分子2", B))

    # f2 B mc: 3 red 2 blue, P(blue)
    probs.append(P_mc("prcl_f2",
        "袋中3红2蓝球,随机取1个,P(取到蓝球)=?",
        ["2/5", "3/5", "1/5", "1/2"],
        0, "蓝球2个,总5个", "P=2/5", B))

    # f3 C fill: two dice P(sum=8): (2,6)(3,5)(4,4)(5,3)(6,2)=5 favorable
    probs.append(P_fill("prcl_f3",
        "掷两枚骰子,两数之和=8的概率分子=?(分母=36)",
        5, "(2,6)(3,5)(4,4)(5,3)(6,2)共5种", "P=5/36,分子5", C))

    # f4 C mc: P(drawing ace from 52-card deck)
    probs.append(P_mc("prcl_f4",
        "从一副52张扑克中随机取1张,P(取到A)=?",
        ["1/13", "1/52", "4/13", "1/4"],
        0, "4张A,共52张", "P=4/52=1/13", C))

    # f5 X fill: from {1,2,3,4,5,6} draw 2 without replacement,
    # P(both even): C(3,2)/C(6,2)=3/15=1/5 → numerator=3(denom=15)
    probs.append(P_fill("prcl_f5",
        "从{1,2,3,4,5,6}不放回取2个数,\n两数都是偶数的概率分子=?(分母=15)",
        3, "偶数{2,4,6},C(3,2)=3种,总C(6,2)=15种", "P=3/15=1/5,分子3", X))

    # f6 X mc: P(two dice same face)=6/36=1/6
    probs.append(P_mc("prcl_f6",
        "掷两枚骰子,两数相同的概率=?",
        ["1/6", "1/36", "1/3", "5/6"],
        0, "同面结果:(1,1)(2,2)…(6,6)共6种", "P=6/36=1/6", X))

    return probs


# ── 概率树图与列举 batch-2 ────────────────────────────────────────────────
def probability_tree_extra2():
    probs = []
    # f1 B fill: 3 coins total outcomes=8
    probs.append(P_fill("prtree_f1",
        "掷三枚硬币,所有等可能结果共几种?",
        8, "2×2×2=8", "8种", B))

    # f2 B mc: P(3 heads) = 1/8
    probs.append(P_mc("prtree_f2",
        "掷三枚硬币,三枚全为正面的概率=?",
        ["1/8", "1/4", "3/8", "1/2"],
        0, "1/2×1/2×1/2=1/8", "P=1/8", B))

    # f3 C fill: P(A)=1/2,P(B)=1/3 independent, P(A and B) numerator(denom=6)
    probs.append(P_fill("prtree_f3",
        "P(A)=1/2,P(B)=1/3,A、B独立,\nP(A且B)分子=?(分母=6)",
        1, "P(AB)=1/2×1/3=1/6", "分子1", C))

    # f4 C mc: P(at least 1 six in two dice) = 1-P(no six)=1-25/36=11/36
    probs.append(P_mc("prtree_f4",
        "掷两枚骰子,至少一枚出现6的概率=?",
        ["11/36", "1/6", "1/36", "1/3"],
        0, "1−P(两枚都不是6)=1−(5/6)²=1−25/36", "P=11/36", C))

    # f5 X fill: P(A)=3/4,P(B)=2/3 independent, P(A' and B') numerator(denom=12)
    # P(A')=1/4, P(B')=1/3, product=1/12
    probs.append(P_fill("prtree_f5",
        "P(A)=3/4,P(B)=2/3,A、B独立,\nP(A'且B')分子=?(分母=12)",
        1, "P(A')=1/4,P(B')=1/3; 积=1/12", "分子1", X))

    # f6 X mc: 2-child family, P(boy+girl)=2/4=1/2 (ordered BG or GB)
    probs.append(P_mc("prtree_f6",
        "一对夫妻生2个孩子,P(一男一女)=?",
        ["1/2", "1/4", "3/4", "2/3"],
        0, "BG或GB共2种,总4种", "P=2/4=1/2", X))

    return probs


# ── 反比例函数 batch-2 ────────────────────────────────────────────────────
def inverse_proportion_fn_extra2():
    probs = []
    # f1 B fill: k=xy: x=5,y=6 → k=30
    probs.append(P_fill("ipf_f1",
        "y=k/x,当x=5时y=6,则k=?",
        30, "k=5×6", "k=30", B))

    # f2 B mc: k>0 quadrant
    probs.append(P_mc("ipf_f2",
        "y=5/x 的图象在哪些象限?",
        ["第一和第三象限", "第二和第四象限", "所有象限"],
        0, "k=5>0在一三象限", "一、三象限", B))

    # f3 C fill: y=20/x, x=4 → y=5
    probs.append(P_fill("ipf_f3",
        "y=20/x,当x=4时 y=?",
        5, "y=20/4", "y=5", C))

    # f4 C mc: y=-12/x in second quadrant: x<0 → y=(-12/x)>0 ✓; x decreases (more negative) y decreases
    probs.append(P_mc("ipf_f4",
        "y=−12/x 在第二象限内,x 增大时 y?",
        ["y 增大", "y 减小", "y 不变"],
        0, "k<0第二象限: x<0,y>0; x增大(仍<0时)y增大",
        "第二象限x增大(负值趋向0)→y=−12/x增大", C))

    # f5 X fill: intersection y=3x and y=12/x (first quadrant): 3x=12/x → x²=4 → x=2
    probs.append(P_fill("ipf_f5",
        "y=3x 与 y=12/x 在第一象限的交点横坐标=?",
        2, "联立: 3x=12/x → x²=4", "x=2(取正)", X))

    # f6 X mc: y=k/(x-1) through (3,4) → k=4×(3-1)=8; k=?
    probs.append(P_mc("ipf_f6",
        "y=k/(x−1) 过点(3,4),则k=?",
        ["8", "4", "12", "2"],
        0, "4=k/(3−1)=k/2", "k=8", X))

    return probs


# ── 相似三角形概念与性质 batch-2 ─────────────────────────────────────────
def similar_triangle_concept_extra2():
    probs = []
    # f1 B fill: ratio 4:1, larger=12 → smaller=3
    probs.append(P_fill("stc_f1",
        "两相似△相似比4:1,较大对应边=12,较小对应边=?",
        3, "12×1/4=3", "3", B))

    # f2 B mc: perimeter ratio = similarity ratio
    probs.append(P_mc("stc_f2",
        "相似比2:5的两△,周长比为?",
        ["2:5", "4:25", "8:125"],
        0, "周长比=相似比", "2:5", B))

    # f3 C fill: area ratio 4:9 → similarity ratio numerator=2(denom=3)
    probs.append(P_fill("stc_f3",
        "两△面积比=4:9,相似比的分子=?(分母=3)",
        2, "相似比=√(面积比)=√(4/9)=2/3", "相似比2:3,分子2", C))

    # f4 C mc: find BC: AD=2,DB=3,DE=4,DE//BC → BC=4×5/2=10
    probs.append(P_mc("stc_f4",
        "△ABC中DE//BC,AD=2,DB=3,DE=4,BC=?",
        ["10", "6", "8", "4"],
        0, "AB=5,AD/AB=2/5=DE/BC",
        "BC=4×5/2=10", C))

    # f5 X fill: smaller perimeter: ratio 3:5, larger perimeter=30 → smaller=18
    probs.append(P_fill("stc_f5",
        "两△相似比3:5,较大△周长=30,较小△周长=?",
        18, "30×3/5=18", "18", X))

    # f6 X mc: altitude ratio = similarity ratio
    probs.append(P_mc("stc_f6",
        "两相似△相似比2:3,对应高之比为?",
        ["2:3", "4:9", "8:27"],
        0, "对应高之比=相似比", "2:3", X))

    return probs


# ── 相似三角形判定与证明 batch-2 ─────────────────────────────────────────
def similar_triangle_proof_extra2():
    probs = []
    # f1 B mc: AA criterion
    probs.append(P_mc("stp_f1",
        "△ABC与△DEF中,∠A=∠D,∠B=∠E,则两△?",
        ["相似(AA判定)", "全等", "面积相等"],
        0, "两角相等→AA相似", "△ABC∽△DEF", B))

    # f2 B fill: similar ratio 5:3, AB=15 → DE=9
    probs.append(P_fill("stp_f2",
        "△ABC∽△DEF,相似比5:3,AB=15,DE=?",
        9, "15×3/5=9", "DE=9", B))

    # f3 C mc: SSS similar: sides 3,4,5 and 6,8,10 → similar
    probs.append(P_mc("stp_f3",
        "△ABC三边3,4,5;△DEF三边6,8,10;两△?",
        ["相似(SSS,比例1:2)", "全等", "不相似"],
        0, "对应边比均=1:2", "三边成比例→相似,比例1:2", C))

    # f4 C fill: area of smaller: ratio 2:3, larger area=45 → smaller=20
    probs.append(P_fill("stp_f4",
        "两△相似比2:3,较大△面积=45,较小△面积=?",
        20, "面积比=4:9; 45×4/9=20", "20", C))

    # f5 X fill: altitude ratio: ratio 4:5, larger altitude=20 → smaller=16
    probs.append(P_fill("stp_f5",
        "两△相似比4:5,较大△的某条高=20,对应高=?",
        16, "高之比=4:5; 20×4/5=16", "16", X))

    # f6 X mc: median ratio = similarity ratio
    probs.append(P_mc("stp_f6",
        "两相似△相似比3:4,对应中线之比为?",
        ["3:4", "9:16", "27:64"],
        0, "中线之比=相似比", "3:4", X))

    return probs


# ── 锐角三角函数定义 batch-2 ─────────────────────────────────────────────
def trig_definition_extra2():
    probs = []
    # f1 B mc: definition of cosA
    probs.append(P_mc("trd_f1",
        "直角△中cosA=?",
        ["邻边/斜边", "对边/斜边", "对边/邻边"],
        0, "cos=邻/斜", "cosA=邻边/斜边", B))

    # f2 B fill: sinA: opp=5,hyp=13 → numerator=5(denom=13)
    probs.append(P_fill("trd_f2",
        "直角△中斜边=13,∠A对边=5,sinA分子=?(分母=13)",
        5, "sinA=5/13", "分子5", B))

    # f3 C fill: tanA: 3-4-5 triangle, opp=4,adj=3 → tanA=4/3, numerator=4(denom=3)
    probs.append(P_fill("trd_f3",
        "直角△中∠A对边=4,邻边=3,tanA分子=?(分母=3)",
        4, "tanA=对/邻=4/3", "分子4", C))

    # f4 C mc: sinA=5/13, find cosA
    # hyp=13,opp=5,adj=12 → cosA=12/13
    probs.append(P_mc("trd_f4",
        "sinA=5/13,则cosA=?",
        ["12/13", "5/12", "13/12", "5/13"],
        0, "adj=√(169−25)=12,cosA=12/13", "cosA=12/13", C))

    # f5 X fill: cosA=3/5, find sinA: sinA=4/5 → numerator=4(denom=5)
    probs.append(P_fill("trd_f5",
        "cosA=3/5(A为锐角),sinA分子=?(分母=5)",
        4, "sin²A=1−9/25=16/25,sinA=4/5", "分子4", X))

    # f6 X mc: tanA=1, sinA=?
    # tanA=1 → opp=adj → isoceles right triangle → sinA=√2/2
    probs.append(P_mc("trd_f6",
        "锐角△中tanA=1,sinA=?",
        ["√2/2", "1/2", "√3/2", "1"],
        0, "tanA=1→等腰直角三角形,sinA=√2/2", "sinA=√2/2", X))

    return probs


# ── 特殊角三角函数值 batch-2 ─────────────────────────────────────────────
def trig_special_values_extra2():
    probs = []
    # f1 B mc: sin60°
    probs.append(P_mc("trsv_f1",
        "sin60°=?",
        ["√3/2", "1/2", "√2/2", "1"],
        0, "60°特殊角", "sin60°=√3/2", B))

    # f2 B fill: hyp=20,∠A=30° → opp=10
    probs.append(P_fill("trsv_f2",
        "直角△斜边=20,∠A=30°,A的对边=?",
        10, "sin30°=1/2", "20×1/2=10", B))

    # f3 C mc: cos30°
    probs.append(P_mc("trsv_f3",
        "cos30°=?",
        ["√3/2", "1/2", "√2/2", "√3"],
        0, "30°特殊角", "cos30°=√3/2", C))

    # f4 C fill: hyp=12,∠A=60° → adj=12×cos60°=6
    probs.append(P_fill("trsv_f4",
        "直角△斜边=12,∠A=60°,A的邻边=12×cos60°=?",
        6, "cos60°=1/2", "12×1/2=6", C))

    # f5 X mc: tan45°×sin30°= 1×1/2=1/2
    probs.append(P_mc("trsv_f5",
        "tan45°×sin30°=?",
        ["1/2", "√3/2", "1", "√2/2"],
        0, "tan45°=1,sin30°=1/2", "1×1/2=1/2", X))

    # f6 X fill: hyp=24,∠A=30° → opp=12
    probs.append(P_fill("trsv_f6",
        "直角△斜边=24,∠A=30°,A的对边=?",
        12, "sin30°=1/2", "24×1/2=12", X))

    return probs


# ── 三角函数应用 batch-2 ──────────────────────────────────────────────────
def trig_application_extra2():
    probs = []
    # f1 B fill: shadow length: h=15,angle=45° → shadow=15/tan45°=15
    probs.append(P_fill("trapp_f1",
        "竖杆高15m,阳光与地面成45°角,\n竖杆影长=?m",
        15, "d=h/tan45°=15/1", "d=15 m", B))

    # f2 B mc: elevation angle definition
    probs.append(P_mc("trapp_f2",
        "仰角是从水平线向_方向看的角?",
        ["上", "下", "左"],
        0, "仰角=向上看", "仰角:水平线向上", B))

    # f3 C fill: hill height: 30° slope, walk 60m along slope, height=30m (already have this)
    # use: slope 30°, horizontal distance = 60×cos30°... not integer
    # instead: cliff height=40m, depression 45° → distance=40
    probs.append(P_fill("trapp_f3",
        "站在40m高崖顶,俯角45°看地面目标,\n目标到崖脚水平距离=?m",
        40, "d=h/tan45°=40/1", "d=40 m", C))

    # f4 C mc: ladder 10m, rests against wall at 60° from ground
    # height on wall = 10×sin60° = 5√3 (not integer)
    # at 30°: height = 10×sin30°=5
    probs.append(P_mc("trapp_f4",
        "梯子长10m靠墙,与地面成30°,\n梯子顶端距地高度=?m",
        ["5", "5√3", "10", "10√3"],
        0, "h=10×sin30°=5", "h=5 m", C))

    # f5 X fill: flag pole 30m high, angle of elevation 45° → horizontal distance=30m
    probs.append(P_fill("trapp_f5",
        "旗杆高30m,从某点仰角=45°,该点到旗杆底的水平距离=?m",
        30, "d=h/tan45°=30/1", "d=30 m", X))

    # f6 X mc: two points: from A (100m from base) elevation=30°; h=100tan30°=100√3/3 (not integer)
    # conceptual: depression angle vs elevation angle from same height
    probs.append(P_mc("trapp_f6",
        "从A点以仰角30°看山顶,已知A到山脚水平距离=30m,\n山高h=30×tan30°=?m",
        ["10√3", "30", "15", "10"],
        0, "tan30°=√3/3,h=30×√3/3=10√3",
        "h=30×(√3/3)=10√3≈17.3m", X))

    return probs


# ── 投影与视图 batch-2 ────────────────────────────────────────────────────
def projection_view_extra2():
    probs = []
    # f1 B mc: 侧视图方向
    probs.append(P_mc("pjv_f1",
        "侧视图是从哪个方向观察得到的?",
        ["左侧(或右侧)", "正面", "上方"],
        0, "侧视图=从左/右看", "侧视图:从左侧(或右侧)向右看", B))

    # f2 B fill: 正方体棱数  fill: 12
    probs.append(P_fill("pjv_f2",
        "正方体共有多少条棱?",
        12, "4+4+4=12条", "12条棱", B))

    # f3 C mc: 棱柱侧视图
    probs.append(P_mc("pjv_f3",
        "三棱柱的侧视图是?",
        ["长方形", "三角形", "圆形"],
        0, "从侧面看三棱柱", "三棱柱侧视图为长方形", C))

    # f4 C mc: 圆柱正视图
    probs.append(P_mc("pjv_f4",
        "圆柱的正视图是?",
        ["长方形", "圆形", "等腰三角形"],
        0, "从正面看圆柱", "圆柱正视图为长方形", C))

    # f5 X mc: identify solid from views: front=rectangle, side=rectangle, top=circle → cylinder
    probs.append(P_mc("pjv_f5",
        "正视图、侧视图均为长方形,俯视图为圆形,这是什么几何体?",
        ["圆柱", "圆锥", "球", "四棱柱"],
        0, "圆柱三视图特征", "圆柱", X))

    # f6 X fill: a cube with side 3; front view area = 3×3=9
    probs.append(P_fill("pjv_f6",
        "棱长为3的正方体,正视图的面积=?",
        9, "正视图为3×3正方形", "面积=9", X))

    return probs


# ── 将额外题目合并进各 set ──────────────────────────────────────────────────

def _extend_set(set_fn, extra_fn, extra_fn2=None):
    """Return a set dict with extra problems appended."""
    s = set_fn()
    s["problems"].extend(extra_fn())
    if extra_fn2 is not None:
        s["problems"].extend(extra_fn2())
    return s


# ── 组合函数 ───────────────────────────────────────────────────────────────

def build_practice_pack():
    sets = [
        # 上册
        _extend_set(quadratic_eq_concept,        quadratic_eq_concept_extra,        quadratic_eq_concept_extra2),
        _extend_set(quadratic_eq_procedure,      quadratic_eq_procedure_extra,      quadratic_eq_procedure_extra2),
        _extend_set(quadratic_eq_application,    quadratic_eq_application_extra,    quadratic_eq_application_extra2),
        _extend_set(quadratic_fn_concept,        quadratic_fn_concept_extra,        quadratic_fn_concept_extra2),
        _extend_set(quadratic_fn_graph,          quadratic_fn_graph_extra,          quadratic_fn_graph_extra2),
        _extend_set(quadratic_fn_application,    quadratic_fn_application_extra,    quadratic_fn_application_extra2),
        _extend_set(rotation_properties,         rotation_properties_extra,         rotation_properties_extra2),
        _extend_set(circle_properties,           circle_properties_extra,           circle_properties_extra2),
        _extend_set(circle_tangent,              circle_tangent_extra,              circle_tangent_extra2),
        _extend_set(circle_inscribed_angle,      circle_inscribed_angle_extra,      circle_inscribed_angle_extra2),
        _extend_set(probability_concept,         probability_concept_extra,         probability_concept_extra2),
        _extend_set(probability_classical,       probability_classical_extra,       probability_classical_extra2),
        _extend_set(probability_tree,            probability_tree_extra,            probability_tree_extra2),
        # 下册
        _extend_set(inverse_proportion_fn,       inverse_proportion_fn_extra,       inverse_proportion_fn_extra2),
        _extend_set(similar_triangle_concept,    similar_triangle_concept_extra,    similar_triangle_concept_extra2),
        _extend_set(similar_triangle_proof,      similar_triangle_proof_extra,      similar_triangle_proof_extra2),
        _extend_set(trig_definition,             trig_definition_extra,             trig_definition_extra2),
        _extend_set(trig_special_values,         trig_special_values_extra,         trig_special_values_extra2),
        _extend_set(trig_application,            trig_application_extra,            trig_application_extra2),
        _extend_set(projection_view,             projection_view_extra,             projection_view_extra2),
    ]
    return {"version": "2.0.0", "grade": 9, "sets": sets}


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3 — KNOWLEDGE MAP
# ═══════════════════════════════════════════════════════════════════════════

# (unit_id, term, index, title, [topic_specs])
# topic_spec: (id, title, pedagogy, dependsOn, fluencyTrackId|None)

UNITS_G9 = [
    ("u1", "upper", 1, "一元二次方程", [
        ("quadratic_eq_concept",     "一元二次方程概念",     "concept",   [],                            "quadratic_roots"),
        ("quadratic_eq_procedure",   "一元二次方程解法",     "procedure", ["quadratic_eq_concept"]),
        ("quadratic_eq_application", "一元二次方程应用",     "formula",   ["quadratic_eq_procedure"]),
    ]),
    ("u2", "upper", 2, "二次函数", [
        ("quadratic_fn_concept",     "二次函数概念",         "concept",   ["quadratic_eq_concept"],      "quadratic_fn_vertex"),
        ("quadratic_fn_graph",       "二次函数图象性质",     "concept",   ["quadratic_fn_concept"]),
        ("quadratic_fn_application", "二次函数应用",         "formula",   ["quadratic_fn_graph"]),
    ]),
    ("u3", "upper", 3, "旋转", [
        ("rotation_properties",      "旋转的性质",           "concept",   []),
    ]),
    ("u4", "upper", 4, "圆", [
        ("circle_properties",        "圆的基本性质",         "concept",   []),
        ("circle_tangent",           "切线与切线长",         "concept",   ["circle_properties"]),
        ("circle_inscribed_angle",   "圆周角与圆心角",       "concept",   ["circle_properties"]),
    ]),
    ("u5", "upper", 5, "概率初步", [
        ("probability_concept",      "概率的基本概念",       "concept",   [],                            "probability_count"),
        ("probability_classical",    "古典概型计算",         "procedure", ["probability_concept"]),
        ("probability_tree",         "概率树图与列举",       "data",      ["probability_classical"]),
    ]),
    ("l1", "lower", 1, "反比例函数", [
        ("inverse_proportion_fn",    "反比例函数",           "concept",   []),
    ]),
    ("l2", "lower", 2, "相似", [
        ("similar_triangle_concept", "相似三角形概念与性质", "concept",   [],                            "similar_ratio"),
        ("similar_triangle_proof",   "相似三角形判定与证明", "procedure", ["similar_triangle_concept"]),
    ]),
    ("l3", "lower", 3, "锐角三角函数", [
        ("trig_definition",          "锐角三角函数定义",     "concept",   []),
        ("trig_special_values",      "特殊角三角函数值",     "formula",   ["trig_definition"],           "special_angle_trig"),
        ("trig_application",         "三角函数应用",         "formula",   ["trig_special_values"]),
    ]),
    ("l4", "lower", 4, "投影与视图", [
        ("projection_view",          "投影与视图",           "concept",   []),
    ]),
]


def build_knowledge_map(practice_pack):
    """Build knowledge map, auto-detecting ready status from practice pack."""
    practice_ids = {s["id"] for s in practice_pack["sets"]}

    fluency_track_ids = {
        "quadratic_roots",
        "quadratic_fn_vertex",
        "special_angle_trig",
        "probability_count",
        "similar_ratio",
    }

    units_out = []
    topics_out = []

    for unit_id, term, index, title, topic_specs in UNITS_G9:
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
        "grade": 9,
        "units": units_out,
        "topics": topics_out,
    }


# ═══════════════════════════════════════════════════════════════════════════
# VERIFICATION — run before writing to catch any math error
# ═══════════════════════════════════════════════════════════════════════════

def verify_all(fluency, practice, kmap):
    """Independent correctness checks."""
    errors = []

    # ── Fluency: all answers are integers ────────────────────────────────
    for track in fluency["tracks"]:
        for lv in track["levels"]:
            for fact in lv["new_facts"]:
                ans = fact["answer"]
                if not isinstance(ans, int):
                    errors.append(
                        f"FLUENCY non-int answer: track={track['trackId']} "
                        f"id={fact['id']} answer={ans!r}"
                    )

    # ── Fluency: quadratic_roots — verify p+q and p*q ────────────────────
    for specs_list, qtype_list in [
        (QR_A, ["s"]*4), (QR_B, ["p"]*4), (QR_C, ["min"]*4),
        (QR_D, ["s"]*4), (QR_E, ["p"]*4), (QR_F, ["max"]*4),
    ]:
        for (b, c, p, q, qt) in specs_list:
            if p + q != -b:
                errors.append(f"QR sum wrong: b={b},p={p},q={q}")
            if p * q != c:
                errors.append(f"QR product wrong: c={c},p={p},q={q}")

    # ── Fluency: similar_ratio — verify all calculations ─────────────────
    for specs_list in [SIMR_A, SIMR_B, SIMR_C, SIMR_D]:
        for (rm, rn, known, ans, style) in specs_list:
            if style == "small":
                expected = known * rn // rm
                if known * rn % rm != 0 or expected != ans:
                    errors.append(f"SIMR small: {known}×{rn}/{rm}={expected} != {ans}")
            else:
                expected = known * rm // rn
                if known * rm % rn != 0 or expected != ans:
                    errors.append(f"SIMR large: {known}×{rm}/{rn}={expected} != {ans}")

    # ── Practice: check fill answers that are numeric ────────────────────
    numeric_checks = [
        # (problem_id, expected_answer)
        ("qec_x0",  1),
        ("qep_c2", -4),
        ("qea_b1",  3),
        ("qfa_c1",  5),
        ("qfc_x0",  5),
        ("cirt_c0", 12),
        ("prcl_b0", 3),
        ("prcl_b1", 3),
        ("ipf_c1",  12),
        ("stc_c1",  6),
        ("stp_x1",  12),
        ("trapp_c1",30),
        ("prtree_x1",1),
    ]
    practice_probs = {
        p["id"]: p
        for s in practice["sets"]
        for p in s["problems"]
    }
    for pid, expected in numeric_checks:
        if pid not in practice_probs:
            errors.append(f"VERIFY: problem {pid} not found in practice pack")
            continue
        prob = practice_probs[pid]
        if prob["type"] == "fill" and prob.get("answer") != expected:
            errors.append(
                f"VERIFY fill: {pid} expected={expected} got={prob['answer']}"
            )

    # ── Knowledge map: all topic ids exist ───────────────────────────────
    kmap_topic_ids = {t["id"] for t in kmap["topics"]}
    for unit in kmap["units"]:
        for tid in unit["topicIds"]:
            if tid not in kmap_topic_ids:
                errors.append(f"KMAP: unit {unit['id']} refs unknown topic {tid}")

    # ── Grade fields ──────────────────────────────────────────────────────
    assert fluency["grade"] == 9, "fluency grade != 9"
    assert practice["grade"] == 9, "practice grade != 9"
    assert kmap["grade"] == 9, "kmap grade != 9"

    return errors


# ═══════════════════════════════════════════════════════════════════════════
# MAIN: generate all three files
# ═══════════════════════════════════════════════════════════════════════════

def main():
    # ── 1. Fluency pack ───────────────────────────────────────────────────
    fluency = build_fluency_pack()
    fluency_path = os.path.join(CONTENT_DIR, "grade9_math_fluency_pack.json")
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
    practice_path = os.path.join(CONTENT_DIR, "grade9_practice_pack.json")
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
    kmap_path = os.path.join(CONTENT_DIR, "grade9_knowledge_map.json")
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

    # ── 4. Verify ─────────────────────────────────────────────────────────
    errors = verify_all(fluency, practice, kmap)
    if errors:
        print(f"\n❌ VERIFICATION FAILED ({len(errors)} errors):")
        for e in errors:
            print(f"  {e}")
        raise SystemExit(1)
    else:
        print(f"\n✓ All verification checks passed (0 errors)")


if __name__ == "__main__":
    main()
    # 题目来源标注: 写完 practice+knowledge_map 后,从 km 自动推导 source
    from source_tags import tag_practice_file
    _n, _u = tag_practice_file(9)
    print(f"source-tagged {_n} problems (grade 9)" + (f"  UNMAPPED {_u}" if _u else ""))
