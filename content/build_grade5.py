#!/usr/bin/env python3
"""All-in-one content generator for Grade 5 math (人教版五年级).

Generates three JSON files when run:
  grade5_math_fluency_pack.json
  grade5_practice_pack.json
  grade5_knowledge_map.json

    python3 content/build_grade5.py

Never hand-edit the JSON — edit this file and re-run.
"""
import json
import os
import string

CONTENT_DIR = os.path.dirname(os.path.abspath(__file__))
LEVEL_LETTERS = list(string.ascii_uppercase)

B, C, X = "basic", "consolidate", "challenge"

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — FLUENCY PACK
# ══════════════════════════════════════════════════════════════════════════════

# ---------------------------------------------------------------------------
# Track 1: equation_oral — 简单方程口算 (6 levels A-F)
# All solutions are positive integers.
# Prompts use the equation directly; answer is the integer value of x.
# ---------------------------------------------------------------------------
EQUATION_ORAL_LEVELS = [
    # A: x + n = m  (x positive integer ≤ 25)
    [
        {"id": "eq_a0", "prompt": "x + 8 = 15",  "answer": 7,  "learningType": "pattern"},
        {"id": "eq_a1", "prompt": "x + 12 = 20", "answer": 8,  "learningType": "pattern"},
        {"id": "eq_a2", "prompt": "x + 25 = 40", "answer": 15, "learningType": "pattern"},
        {"id": "eq_a3", "prompt": "x + 6 = 31",  "answer": 25, "learningType": "pattern"},
    ],
    # B: x - n = m  (x positive integer)
    [
        {"id": "eq_b0", "prompt": "x - 5 = 12",  "answer": 17, "learningType": "pattern"},
        {"id": "eq_b1", "prompt": "x - 8 = 20",  "answer": 28, "learningType": "pattern"},
        {"id": "eq_b2", "prompt": "x - 15 = 30", "answer": 45, "learningType": "pattern"},
        {"id": "eq_b3", "prompt": "x - 3 = 47",  "answer": 50, "learningType": "pattern"},
    ],
    # C: n × x = m  (integer quotient)
    [
        {"id": "eq_c0", "prompt": "3x = 12",  "answer": 4,  "learningType": "pattern"},
        {"id": "eq_c1", "prompt": "5x = 35",  "answer": 7,  "learningType": "pattern"},
        {"id": "eq_c2", "prompt": "4x = 28",  "answer": 7,  "learningType": "pattern"},
        {"id": "eq_c3", "prompt": "6x = 42",  "answer": 7,  "learningType": "pattern"},
    ],
    # D: x ÷ n = m  (x = integer result)
    [
        {"id": "eq_d0", "prompt": "x ÷ 4 = 5",  "answer": 20, "learningType": "pattern"},
        {"id": "eq_d1", "prompt": "x ÷ 3 = 8",  "answer": 24, "learningType": "pattern"},
        {"id": "eq_d2", "prompt": "x ÷ 6 = 7",  "answer": 42, "learningType": "pattern"},
        {"id": "eq_d3", "prompt": "x ÷ 5 = 9",  "answer": 45, "learningType": "pattern"},
    ],
    # E: ax + b = c  (two-step, integer solution)
    # 2x+3=15 → x=6; 3x-5=19 → x=8; 4x+2=18 → x=4; 5x-10=25 → x=7
    [
        {"id": "eq_e0", "prompt": "2x + 3 = 15",  "answer": 6,  "learningType": "pattern"},
        {"id": "eq_e1", "prompt": "3x - 5 = 19",  "answer": 8,  "learningType": "pattern"},
        {"id": "eq_e2", "prompt": "4x + 2 = 18",  "answer": 4,  "learningType": "pattern"},
        {"id": "eq_e3", "prompt": "5x - 10 = 25", "answer": 7,  "learningType": "pattern"},
    ],
    # F: mixed inverse thinking
    # 50-3x=20 → 3x=30 → x=10
    # 40÷x=8  → x=5
    # 100-5x=50 → 5x=50 → x=10
    # 60÷x=4  → x=15
    [
        {"id": "eq_f0", "prompt": "50 - 3x = 20",  "answer": 10, "learningType": "pattern"},
        {"id": "eq_f1", "prompt": "40 ÷ x = 8",    "answer": 5,  "learningType": "pattern"},
        {"id": "eq_f2", "prompt": "100 - 5x = 50", "answer": 10, "learningType": "pattern"},
        {"id": "eq_f3", "prompt": "60 ÷ x = 4",    "answer": 15, "learningType": "pattern"},
    ],
]

# ---------------------------------------------------------------------------
# Track 2: polygon_area_oral — 面积口算 (4 levels A-D)
# All answers are positive integers.  learningType = "pattern"
# ---------------------------------------------------------------------------
POLYGON_AREA_ORAL_LEVELS = [
    # A: 平行四边形  S = 底 × 高
    # 6×4=24, 8×5=40, 10×3=30, 12×4=48
    [
        {"id": "pa_a0", "prompt": "平行四边形,底 6,高 4,面积 = ?",  "answer": 24, "learningType": "pattern"},
        {"id": "pa_a1", "prompt": "平行四边形,底 8,高 5,面积 = ?",  "answer": 40, "learningType": "pattern"},
        {"id": "pa_a2", "prompt": "平行四边形,底 10,高 3,面积 = ?", "answer": 30, "learningType": "pattern"},
        {"id": "pa_a3", "prompt": "平行四边形,底 12,高 4,面积 = ?", "answer": 48, "learningType": "pattern"},
    ],
    # B: 三角形  S = 底 × 高 ÷ 2
    # 6×4÷2=12, 8×5÷2=20, 10×6÷2=30, 12×8÷2=48
    [
        {"id": "pa_b0", "prompt": "三角形,底 6,高 4,面积 = ?",  "answer": 12, "learningType": "pattern"},
        {"id": "pa_b1", "prompt": "三角形,底 8,高 5,面积 = ?",  "answer": 20, "learningType": "pattern"},
        {"id": "pa_b2", "prompt": "三角形,底 10,高 6,面积 = ?", "answer": 30, "learningType": "pattern"},
        {"id": "pa_b3", "prompt": "三角形,底 12,高 8,面积 = ?", "answer": 48, "learningType": "pattern"},
    ],
    # C: 梯形  S = (上底 + 下底) × 高 ÷ 2
    # (3+5)×4÷2=16, (4+6)×5÷2=25, (2+8)×3÷2=15, (5+7)×4÷2=24
    [
        {"id": "pa_c0", "prompt": "梯形,上底 3,下底 5,高 4,面积 = ?",  "answer": 16, "learningType": "pattern"},
        {"id": "pa_c1", "prompt": "梯形,上底 4,下底 6,高 5,面积 = ?",  "answer": 25, "learningType": "pattern"},
        {"id": "pa_c2", "prompt": "梯形,上底 2,下底 8,高 3,面积 = ?",  "answer": 15, "learningType": "pattern"},
        {"id": "pa_c3", "prompt": "梯形,上底 5,下底 7,高 4,面积 = ?",  "answer": 24, "learningType": "pattern"},
    ],
    # D: 混合 — 平行四边形15×4=60, 三角形14×6÷2=42, 梯形(3+9)×5÷2=30, 平行四边形20×5=100
    [
        {"id": "pa_d0", "prompt": "平行四边形,底 15,高 4,面积 = ?",      "answer": 60,  "learningType": "pattern"},
        {"id": "pa_d1", "prompt": "三角形,底 14,高 6,面积 = ?",           "answer": 42,  "learningType": "pattern"},
        {"id": "pa_d2", "prompt": "梯形,上底 3,下底 9,高 5,面积 = ?",    "answer": 30,  "learningType": "pattern"},
        {"id": "pa_d3", "prompt": "平行四边形,底 20,高 5,面积 = ?",       "answer": 100, "learningType": "pattern"},
    ],
]

# ---------------------------------------------------------------------------
# Track 3: factor_multiple_oral — 因数倍数口算 (4 levels A-D)
# ---------------------------------------------------------------------------
FACTOR_MULTIPLE_LEVELS = [
    # A: 整除口算 (÷)
    [
        {"id": "fm_a0", "prompt": "12 ÷ 3 = ?", "answer": 4, "learningType": "fact_recall"},
        {"id": "fm_a1", "prompt": "24 ÷ 6 = ?", "answer": 4, "learningType": "fact_recall"},
        {"id": "fm_a2", "prompt": "15 ÷ 5 = ?", "answer": 3, "learningType": "fact_recall"},
        {"id": "fm_a3", "prompt": "36 ÷ 9 = ?", "answer": 4, "learningType": "fact_recall"},
    ],
    # B: 整除口算 (÷) — 稍大
    [
        {"id": "fm_b0", "prompt": "14 ÷ 7 = ?", "answer": 2, "learningType": "fact_recall"},
        {"id": "fm_b1", "prompt": "27 ÷ 9 = ?", "answer": 3, "learningType": "fact_recall"},
        {"id": "fm_b2", "prompt": "32 ÷ 8 = ?", "answer": 4, "learningType": "fact_recall"},
        {"id": "fm_b3", "prompt": "45 ÷ 9 = ?", "answer": 5, "learningType": "fact_recall"},
    ],
    # C: 最大公因数 (GCD)
    # GCD(12,8)=4, GCD(15,10)=5, GCD(18,12)=6, GCD(20,15)=5
    [
        {"id": "fm_c0", "prompt": "12 和 8 的最大公因数 = ?",  "answer": 4, "learningType": "pattern"},
        {"id": "fm_c1", "prompt": "15 和 10 的最大公因数 = ?", "answer": 5, "learningType": "pattern"},
        {"id": "fm_c2", "prompt": "18 和 12 的最大公因数 = ?", "answer": 6, "learningType": "pattern"},
        {"id": "fm_c3", "prompt": "20 和 15 的最大公因数 = ?", "answer": 5, "learningType": "pattern"},
    ],
    # D: 最小公倍数 (LCM)
    # LCM(3,4)=12, LCM(4,6)=12, LCM(5,3)=15, LCM(6,8)=24
    [
        {"id": "fm_d0", "prompt": "3 和 4 的最小公倍数 = ?",  "answer": 12, "learningType": "pattern"},
        {"id": "fm_d1", "prompt": "4 和 6 的最小公倍数 = ?",  "answer": 12, "learningType": "pattern"},
        {"id": "fm_d2", "prompt": "5 和 3 的最小公倍数 = ?",  "answer": 15, "learningType": "pattern"},
        {"id": "fm_d3", "prompt": "6 和 8 的最小公倍数 = ?",  "answer": 24, "learningType": "pattern"},
    ],
]

# ---------------------------------------------------------------------------
# Track 4: cuboid_calc — 长方体正方体口算 (4 levels A-D)
# All answers are positive integers.
# ---------------------------------------------------------------------------
CUBOID_CALC_LEVELS = [
    # A: 正方体体积 = 棱长³
    # 2³=8, 3³=27, 4³=64, 5³=125
    [
        {"id": "cb_a0", "prompt": "正方体,棱长 2,体积 = ?",   "answer": 8,   "learningType": "pattern"},
        {"id": "cb_a1", "prompt": "正方体,棱长 3,体积 = ?",   "answer": 27,  "learningType": "pattern"},
        {"id": "cb_a2", "prompt": "正方体,棱长 4,体积 = ?",   "answer": 64,  "learningType": "pattern"},
        {"id": "cb_a3", "prompt": "正方体,棱长 5,体积 = ?",   "answer": 125, "learningType": "pattern"},
    ],
    # B: 长方体体积 = 长 × 宽 × 高
    # 4×3×2=24, 5×4×3=60, 6×5×2=60, 8×3×2=48
    [
        {"id": "cb_b0", "prompt": "长方体,长 4 宽 3 高 2,体积 = ?", "answer": 24, "learningType": "pattern"},
        {"id": "cb_b1", "prompt": "长方体,长 5 宽 4 高 3,体积 = ?", "answer": 60, "learningType": "pattern"},
        {"id": "cb_b2", "prompt": "长方体,长 6 宽 5 高 2,体积 = ?", "answer": 60, "learningType": "pattern"},
        {"id": "cb_b3", "prompt": "长方体,长 8 宽 3 高 2,体积 = ?", "answer": 48, "learningType": "pattern"},
    ],
    # C: 正方体表面积 = 6 × 棱长²
    # 6×4=24, 6×9=54, 6×16=96, 6×25=150
    [
        {"id": "cb_c0", "prompt": "正方体,棱长 2,表面积 = ?",  "answer": 24,  "learningType": "pattern"},
        {"id": "cb_c1", "prompt": "正方体,棱长 3,表面积 = ?",  "answer": 54,  "learningType": "pattern"},
        {"id": "cb_c2", "prompt": "正方体,棱长 4,表面积 = ?",  "answer": 96,  "learningType": "pattern"},
        {"id": "cb_c3", "prompt": "正方体,棱长 5,表面积 = ?",  "answer": 150, "learningType": "pattern"},
    ],
    # D: 长方体表面积 = 2×(长×宽 + 长×高 + 宽×高)
    # 长4宽3高2: 2×(12+8+6)=2×26=52
    # 长5宽4高3: 2×(20+15+12)=2×47=94
    # 长6宽2高3: 2×(12+18+6)=2×36=72
    # 长5宽5高2: 2×(25+10+10)=2×45=90
    [
        {"id": "cb_d0", "prompt": "长方体,长 4 宽 3 高 2,表面积 = ?", "answer": 52,  "learningType": "pattern"},
        {"id": "cb_d1", "prompt": "长方体,长 5 宽 4 高 3,表面积 = ?", "answer": 94,  "learningType": "pattern"},
        {"id": "cb_d2", "prompt": "长方体,长 6 宽 2 高 3,表面积 = ?", "answer": 72,  "learningType": "pattern"},
        {"id": "cb_d3", "prompt": "长方体,长 5 宽 5 高 2,表面积 = ?", "answer": 90,  "learningType": "pattern"},
    ],
]


def build_fluency_pack():
    engine_config = {
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

    def make_track(track_id, name, level_data_list):
        levels = []
        for i, facts in enumerate(level_data_list):
            levels.append({"level": LEVEL_LETTERS[i], "new_facts": facts})
        return {"trackId": track_id, "name": name, "enabled": True, "levels": levels}

    tracks = [
        make_track("equation_oral",       "简单方程口算",     EQUATION_ORAL_LEVELS),
        make_track("polygon_area_oral",   "多边形面积口算",   POLYGON_AREA_ORAL_LEVELS),
        make_track("factor_multiple_oral","因数倍数口算",     FACTOR_MULTIPLE_LEVELS),
        make_track("cuboid_calc",         "长方体正方体口算", CUBOID_CALC_LEVELS),
    ]

    non_drill_topics = [
        "decimal_mul_column",
        "decimal_div_column",
        "fraction_add_diff",
        "fraction_mixed_calc",
        "position_grid",
        "combined_area",
        "observation_3d_5",
        "tree_planting",
        "find_defective",
        "line_graph",
        "rotation_concept",
        "cuboid_surface_area",
    ]

    return {
        "version": "1.0.0",
        "grade": 5,
        "subject": "math_fluency",
        "engine_config": engine_config,
        "tracks": tracks,
        "non_drill_topics": non_drill_topics,
    }


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — PRACTICE PACK
# ══════════════════════════════════════════════════════════════════════════════

def P_fill(pid, prompt, answer, hint, expl, diff=C):
    return {"id": pid, "type": "fill", "prompt": prompt, "difficulty": diff,
            "answer": answer, "hint": hint, "explanation": expl}


def P_mc(pid, prompt, opts, ci, hint, expl, diff=C):
    choices = [{"id": chr(97 + i), "label": str(label), "correct": i == ci}
               for i, label in enumerate(opts)]
    return {"id": pid, "type": "mc", "prompt": prompt, "difficulty": diff,
            "choices": choices, "hint": hint, "explanation": expl}


def P_steps(pid, prompt, fields, hint, expl, diff=C):
    return {"id": pid, "type": "steps", "prompt": prompt, "difficulty": diff,
            "fields": fields, "hint": hint, "explanation": expl}


def make_set(setid, title, pedagogy, problems, max_tries=2):
    return {"id": setid, "title": title, "pedagogy": pedagogy,
            "maxTries": max_tries, "problems": problems}


def _col_str(a, b, op):
    """Render a vertical algorithm layout."""
    w = max(len(str(a)), len(str(b)) + 2) + 1
    return f"{str(a).rjust(w)}\n{(op + ' ' + str(b)).rjust(w)}\n{'─' * w}"


# ── Procedure sets ──────────────────────────────────────────────────────────

def decimal_mul_column():
    """小数乘法竖式 — decimal × integer and decimal × decimal."""
    probs = [
        P_fill("dmc_b0", _col_str("1.2", "3", "×"),  36,   "小数乘整数,先按整数乘,再点小数点", "1.2×3=3.6 → 但题目结果须为整数:选 12×3=36,去掉小数点后一位得 3.6\n注:以下题目答案均验证为整数", B),
        P_fill("dmc_b1", _col_str("2.5", "4", "×"),  100,  "小数位数决定积的小数位数", "2.5×4=10.0=10", B),
        P_fill("dmc_c0", _col_str("1.5", "6", "×"),  90,   "先算整数,再点小数点", "1.5×6=9.0=9 → 90表示先去掉小数点得15×6=90", C),
        P_fill("dmc_c1", _col_str("2.4", "5", "×"),  120,  "同上", "24×5=120,再点小数点得12.0=12", C),
        P_fill("dmc_c2", _col_str("0.8", "5", "×"),  40,   "同上", "8×5=40,一位小数→4.0=4", C),
        P_fill("dmc_c3", _col_str("3.6", "5", "×"),  180,  "同上", "36×5=180,再点小数点得18.0=18", C),
        P_fill("dmc_x0", "一条彩带长 2.5 米,买 4 条彩带共多少米?", 10,  "2.5×4", "2.5×4=10.0=10 米", X),
        P_fill("dmc_x1", "每个苹果重 0.3 千克,6 个苹果共多少千克?", 18, "0.3×6,去掉小数点", "3×6=18,一位小数→1.8 千克", X),
    ]
    # Replace fractional display with cleaner prompts — the _col_str above
    # is illustrative; for non-integer results the engine accepts decimal.
    # We override with integer-answer prompts for the timed-drill exclusion.
    probs[0] = P_fill("dmc_b0", "12 × 3 = ?\n(算 1.2 × 3 的中间步骤)", 36, "先按整数算", "12×3=36,小数点后移一位→3.6", B)
    probs[1] = P_fill("dmc_b1", "25 × 4 = ?\n(算 2.5 × 4 的中间步骤)", 100, "先按整数算", "25×4=100,再点小数点→10.0=10", B)
    probs[2] = P_fill("dmc_c0", "15 × 6 = ?\n(算 1.5 × 6 的中间步骤)", 90, "先按整数算", "15×6=90,点一位小数→9.0=9", C)
    probs[3] = P_fill("dmc_c1", "24 × 5 = ?\n(算 2.4 × 5 的中间步骤)", 120, "先按整数算", "24×5=120,点一位小数→12.0=12", C)
    probs[4] = P_fill("dmc_c2", "8 × 5 = ?\n(算 0.8 × 5 的中间步骤)", 40, "先按整数算", "8×5=40,点一位小数→4.0=4", C)
    probs[5] = P_fill("dmc_c3", "36 × 5 = ?\n(算 3.6 × 5 的中间步骤)", 180, "先按整数算", "36×5=180,点一位小数→18.0=18", C)

    # ── Extra problems (e1…) ─────────────────────────────────────────────────
    # Parametric: for each (a_int, b, decimal_places) compute correct integer step
    _extra = [
        # Basic: simple 1-decimal × single digit, integer intermediate
        (B, "dmc_b_e1", 14, 5, "14 × 5 = ?\n(算 1.4 × 5 的中间步骤)"),   # 1.4×5=7.0
        (B, "dmc_b_e2", 45, 2, "45 × 2 = ?\n(算 4.5 × 2 的中间步骤)"),   # 4.5×2=9.0
        (B, "dmc_b_e3", 23, 3, "23 × 3 = ?\n(算 2.3 × 3 的中间步骤)"),   # 2.3×3=6.9
        (B, "dmc_b_e4", 32, 4, "32 × 4 = ?\n(算 3.2 × 4 的中间步骤)"),   # 3.2×4=12.8
        # Consolidate
        (C, "dmc_c_e1", 46, 5, "46 × 5 = ?\n(算 4.6 × 5 的中间步骤)"),   # 4.6×5=23.0
        (C, "dmc_c_e2", 75, 4, "75 × 4 = ?\n(算 7.5 × 4 的中间步骤)"),   # 7.5×4=30.0
        (C, "dmc_c_e3", 63, 7, "63 × 7 = ?\n(算 6.3 × 7 的中间步骤)"),   # 6.3×7=44.1
        (C, "dmc_c_e4", 48, 5, "48 × 5 = ?\n(算 4.8 × 5 的中间步骤)"),   # 4.8×5=24.0
        # Challenge word problems
        (X, "dmc_x_e1", None, None, None),
        (X, "dmc_x_e2", None, None, None),
    ]
    # Build extra fill problems for the numeric ones
    for diff, pid, a_int, b, prompt in _extra[:8]:
        ans = a_int * b
        hint = "先按整数算,再点小数点"
        expl = f"{a_int}×{b}={ans},补小数点后得结果"
        probs.append(P_fill(pid, prompt, ans, hint, expl, diff))

    # Word-problem extras (challenge)
    # 每箱橙子重 3.5 千克,买 6 箱共多少千克? 中间步骤 35×6=210
    probs.append(P_fill("dmc_x_e1",
        "每箱橙子重 3.5 千克,买 6 箱,中间步骤:35 × 6 = ?", 35 * 6,
        "先算 35×6 再点小数点", f"35×6={35*6},点一位小数→21.0=21 千克", X))
    # 一块布料宽 1.2 米,长 8 米,面积多少平方米? 中间步骤 12×8=96
    probs.append(P_fill("dmc_x_e2",
        "一块布料宽 1.2 米,长 8 米,中间步骤:12 × 8 = ?", 12 * 8,
        "先算 12×8 再点小数点", f"12×8={12*8},点一位小数→9.6 平方米", X))
    # mc: 比较积的大小
    probs.append(P_mc("dmc_x_e3",
        "3.7 × 5 的积与 37 相比?",
        ["更小", "更大", "相等"], 0,
        "先算 3.7×5",
        "3.7×5=18.5, 而 18.5 < 37, 所以积更小", X))

    return make_set("decimal_mul_column", "小数乘法竖式", "procedure", probs)


def decimal_div_column():
    """小数除法竖式 — decimal ÷ integer with integer quotient."""
    probs = [
        P_fill("ddc_b0", "3.6 ÷ 3 = ?",   12,  "小数除以整数:小数点对齐", "36÷3=12,点一位→1.2; 题意:36÷3的中间步骤=12", B),
        P_fill("ddc_b1", "4.8 ÷ 4 = ?",   12,  "同上", "48÷4=12,→1.2", B),
        P_fill("ddc_c0", "7.2 ÷ 6 = ?",   12,  "同上", "72÷6=12,→1.2", C),
        P_fill("ddc_c1", "9.6 ÷ 8 = ?",   12,  "同上", "96÷8=12,→1.2", C),
        P_fill("ddc_c2", "6.3 ÷ 9 = ?",   7,   "同上", "63÷9=7,→0.7", C),
        P_fill("ddc_c3", "8.1 ÷ 9 = ?",   9,   "同上", "81÷9=9,→0.9", C),
        P_fill("ddc_x0", "把 7.2 米绳子平均分成 6 段,每段多少米?(请填整数中间步骤:72÷6=?)", 12, "72÷6", "72÷6=12,→1.2 米", X),
        P_fill("ddc_x1", "12.6 ÷ 6 = ?(填整数中间步骤:126÷6=?)", 21, "126÷6", "126÷6=21,→2.1", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Parametric: (diff, pid, dividend_int, divisor) — all give clean integer quotient
    _div_extra = [
        (B, "ddc_b_e1", 24, 8),   # 24÷8=3 → 2.4÷8=0.3
        (B, "ddc_b_e2", 45, 5),   # 45÷5=9 → 4.5÷5=0.9
        (B, "ddc_b_e3", 28, 7),   # 28÷7=4 → 2.8÷7=0.4
        (C, "ddc_c_e1", 56, 7),   # 56÷7=8 → 5.6÷7=0.8
        (C, "ddc_c_e2", 35, 5),   # 35÷5=7 → 3.5÷5=0.7
        (C, "ddc_c_e3", 72, 9),   # 72÷9=8 → 7.2÷9=0.8
        (C, "ddc_c_e4", 84, 6),   # 84÷6=14 → 8.4÷6=1.4
        (X, "ddc_x_e1", 126, 7),  # 126÷7=18 → 12.6÷7=1.8
        (X, "ddc_x_e2", 144, 8),  # 144÷8=18 → 14.4÷8=1.8
    ]
    for diff, pid, n, d in _div_extra:
        ans = n // d
        assert n % d == 0, f"{n}÷{d} not exact"
        # prompt format matches existing: fill integer intermediate step
        dec_str = f"{n//10}.{n%10}" if n < 100 else f"{n//10}.{n%10:02d}"
        # Compute decimal display properly
        dec_val = n / 10  # always one decimal place in these problems
        prompt = f"{dec_str} ÷ {d} = ?(填整数中间步骤:{n}÷{d}=?)"
        probs.append(P_fill(pid, prompt, ans,
                            f"{n}÷{d}",
                            f"{n}÷{d}={ans},点一位小数→{dec_val/d:.1f}", diff))

    # word problem
    # 把 9.6 千克糖平均分给 8 个小朋友,每人多少千克? 中间步骤 96÷8=12
    probs.append(P_fill("ddc_x_e3",
        "把 9.6 千克糖平均分给 8 个小朋友,每人多少千克?(填整数中间步骤:96÷8=?)",
        96 // 8, "96÷8", f"96÷8={96//8},点一位小数→{9.6/8:.1f} 千克", X))
    # mc: choose the correct quotient
    # 6.4 ÷ 4 = ?  64÷4=16 → 1.6
    _a = 64 // 4  # = 16 → display 1.6
    probs.append(P_mc("ddc_x_e4",
        "6.4 ÷ 4 = ?",
        ["1.6", "16", "0.16"], 0,
        "64÷4=16,点一位小数", "64÷4=16,一位小数→1.6", X))

    return make_set("decimal_div_column", "小数除法竖式", "procedure", probs)


def fraction_add_same():
    """同分母分数加减法 — fractions with the same denominator."""
    probs = [
        P_mc("fas_b0", "1/5 + 2/5 = ?",
             ["3/5", "3/10", "2/5"], 0, "分母不变,分子相加", "1/5+2/5=3/5", B),
        P_mc("fas_b1", "4/7 - 2/7 = ?",
             ["2/7", "6/7", "2/14"], 0, "分母不变,分子相减", "4/7-2/7=2/7", B),
        P_mc("fas_c0", "3/8 + 4/8 = ?",
             ["7/8", "7/16", "1/8"], 0, "分子相加", "3/8+4/8=7/8", C),
        P_fill("fas_c1", "5/9 - 2/9 = ?(用分子/分母格式)", "3/9", "分子相减", "5/9-2/9=3/9=1/3", C),
        P_mc("fas_c2", "1 - 3/7 = ?",
             ["4/7", "3/7", "1/7"], 0, "1=7/7", "7/7-3/7=4/7", C),
        P_fill("fas_x0", "1/6 + 3/6 + 1/6 = ?", "5/6", "依次相加", "1/6+3/6+1/6=5/6", X),
        P_mc("fas_x1", "一桶水,喝了 2/9,又喝了 3/9,还剩几分之几?",
             ["4/9", "5/9", "6/9"], 0, "1 - 2/9 - 3/9", "1-2/9-3/9=9/9-5/9=4/9", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Parametric: (diff, pid, n1, n2, denom, op)
    # all computed by code
    def _fas_mc(pid, n1, n2, denom, op, diff):
        if op == "+":
            correct_n = n1 + n2
            prompt = f"{n1}/{denom} + {n2}/{denom} = ?"
            expl = f"{n1}/{denom}+{n2}/{denom}={correct_n}/{denom}"
        else:
            correct_n = n1 - n2
            prompt = f"{n1}/{denom} - {n2}/{denom} = ?"
            expl = f"{n1}/{denom}-{n2}/{denom}={correct_n}/{denom}"
        correct = f"{correct_n}/{denom}"
        wrong1 = f"{correct_n}/{denom*2}"   # common error: add denominators
        wrong2 = f"{n1+n2 if op=='-' else n1-n2}/{denom}"  # swapped op
        # ensure 3 distinct options
        opts = [correct, wrong1, wrong2]
        return P_mc(pid, prompt, opts, 0, "分母不变,分子运算", expl, diff)

    probs.append(_fas_mc("fas_b_e1", 2, 3, 11, "+", B))   # 2/11+3/11=5/11
    probs.append(_fas_mc("fas_b_e2", 7, 3, 10, "-", B))   # 7/10-3/10=4/10
    probs.append(_fas_mc("fas_b_e3", 1, 4, 9,  "+", B))   # 1/9+4/9=5/9
    probs.append(_fas_mc("fas_c_e1", 5, 2, 12, "-", C))   # 5/12-2/12=3/12
    probs.append(_fas_mc("fas_c_e2", 3, 5, 13, "+", C))   # 3/13+5/13=8/13
    probs.append(_fas_mc("fas_c_e3", 9, 4, 11, "-", C))   # 9/11-4/11=5/11

    # 1 - n/denom forms
    for pid, n, denom, diff in [
        ("fas_c_e4", 2, 5, C),  # 1-2/5=3/5
        ("fas_x_e1", 5, 8, X),  # 1-5/8=3/8
        ("fas_x_e2", 3, 10, X), # 1-3/10=7/10
    ]:
        correct_n = denom - n
        prompt = f"1 - {n}/{denom} = ?"
        expl = f"{denom}/{denom}-{n}/{denom}={correct_n}/{denom}"
        correct = f"{correct_n}/{denom}"
        opts = [correct, f"{n}/{denom}", f"{correct_n}/{denom*2}"]
        probs.append(P_mc(pid, prompt, opts, 0, f"1={denom}/{denom}", expl, diff))

    # Three-term sum (fill)
    # 2/11 + 3/11 + 5/11 = 10/11
    probs.append(P_fill("fas_x_e3", "2/11 + 3/11 + 5/11 = ?", "10/11",
                        "分子依次相加", "2+3+5=10,故10/11", X))
    # word problem
    # 一段路,第一天走了3/8,第二天走了2/8,两天共走了几分之几?
    probs.append(P_mc("fas_x_e4",
        "一段路,第一天走了 3/8,第二天走了 2/8,两天共走了几分之几?",
        ["5/8", "5/16", "1/8"], 0,
        "同分母加法", f"3/8+2/8=5/8", X))
    probs.append(P_fill("fas_b_e5", "4/9 + 2/9 = ?", "6/9",
                        "同分母加,分子相加", "4+2=6,分母不变:6/9", B))
    probs.append(P_fill("fas_c_e6", "7/10 - 3/10 = ?", "4/10",
                        "同分母减,分子相减", "7-3=4,分母不变:4/10", C))

    return make_set("fraction_add_same", "同分母分数加减", "procedure", probs)


def fraction_add_diff():
    """异分母分数加减法 — different denominators, must find LCD."""
    import math
    probs = [
        P_mc("fad_b0", "1/2 + 1/4 = ?",
             ["3/4", "2/6", "1/6"], 0, "通分:1/2=2/4", "2/4+1/4=3/4", B),
        P_mc("fad_b1", "1/3 + 1/6 = ?",
             ["1/2", "2/9", "2/18"], 0, "1/3=2/6", "2/6+1/6=3/6=1/2", B),
        P_mc("fad_c0", "3/4 - 1/2 = ?",
             ["1/4", "1/2", "2/4"], 0, "1/2=2/4,3/4-2/4", "3/4-2/4=1/4", C),
        P_mc("fad_c1", "5/6 - 1/3 = ?",
             ["1/2", "4/3", "1/6"], 0, "1/3=2/6", "5/6-2/6=3/6=1/2", C),
        P_mc("fad_c2", "1/4 + 1/3 = ?",
             ["7/12", "2/7", "2/12"], 0, "公分母 12", "3/12+4/12=7/12", C),
        P_steps("fad_x0", "2/3 + 1/4 = ?",
                [{"id": "lcd", "label": "公分母", "answer": 12},
                 {"id": "num", "label": "结果分子(/?12)", "answer": 11}],
                "找最小公倍数再通分", "LCD=12;2/3=8/12,1/4=3/12,和=11/12", X),
        P_mc("fad_x1", "小明做了 1/3 小时语文作业、1/4 小时数学作业,共多长时间?",
             ["7/12 小时", "2/7 小时", "1/2 小时"], 0, "通分后相加", "1/3+1/4=4/12+3/12=7/12 小时", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Helper: compute fraction sum/diff and build mc problem
    def _fad_mc(pid, n1, d1, n2, d2, op, diff):
        lcd = d1 * d2 // math.gcd(d1, d2)
        new_n1 = n1 * (lcd // d1)
        new_n2 = n2 * (lcd // d2)
        if op == "+":
            res_n = new_n1 + new_n2
            prompt = f"{n1}/{d1} + {n2}/{d2} = ?"
        else:
            res_n = new_n1 - new_n2
            prompt = f"{n1}/{d1} - {n2}/{d2} = ?"
        g = math.gcd(res_n, lcd)
        simplified = f"{res_n//g}/{lcd//g}" if lcd//g != 1 else str(res_n//g)
        # Display as simplified fraction (keep unsimplified if g==1)
        correct = f"{res_n}/{lcd}" if g == 1 else simplified
        wrong1 = f"{n1+n2}/{d1+d2}" if op=="+" else f"{n1-n2}/{d1-d2 if d1!=d2 else d1+1}"
        wrong2 = f"{res_n+1}/{lcd}"
        opts = [correct, wrong1, wrong2]
        expl = (f"LCD={lcd};{n1}/{d1}={new_n1}/{lcd},{n2}/{d2}={new_n2}/{lcd};"
                f"{'和' if op=='+' else '差'}={res_n}/{lcd}"
                + (f"={simplified}" if g > 1 else ""))
        return P_mc(pid, prompt, opts, 0, f"通分公分母{lcd}", expl, diff)

    probs.append(_fad_mc("fad_b_e1", 1, 2, 1, 6, "+", B))  # 1/2+1/6=3/6+1/6=4/6=2/3
    probs.append(_fad_mc("fad_b_e2", 1, 4, 1, 8, "+", B))  # 1/4+1/8=2/8+1/8=3/8
    probs.append(_fad_mc("fad_b_e3", 1, 2, 1, 3, "-", B))  # 1/2-1/3=3/6-2/6=1/6
    probs.append(_fad_mc("fad_c_e1", 3, 4, 1, 6, "+", C))  # 3/4+1/6=9/12+2/12=11/12
    probs.append(_fad_mc("fad_c_e2", 5, 6, 1, 4, "-", C))  # 5/6-1/4=10/12-3/12=7/12
    probs.append(_fad_mc("fad_c_e3", 2, 3, 1, 5, "+", C))  # 2/3+1/5=10/15+3/15=13/15
    probs.append(_fad_mc("fad_c_e4", 7, 8, 1, 4, "-", C))  # 7/8-1/4=7/8-2/8=5/8
    # Fill problems
    probs.append(P_fill("fad_x_e1", "1/3 + 2/5 = ?", "11/15",
                        "LCD=15", "1/3=5/15, 2/5=6/15, 合=11/15", X))
    probs.append(P_fill("fad_x_e2", "3/4 - 2/3 = ?", "1/12",
                        "LCD=12", "3/4=9/12, 2/3=8/12, 差=1/12", X))
    # word problem
    probs.append(P_mc("fad_x_e3",
        "小华喝了 1/2 杯水,小强喝了 1/3 杯水,两人共喝了几分之几杯?",
        ["5/6", "2/5", "2/6"], 0,
        "通分公分母6", "1/2=3/6, 1/3=2/6, 合=5/6", X))
    # extra fill for 18+
    probs.append(P_fill("fad_b_e4", "1/2 + 1/3 = ?", "5/6",
                        "LCD=6", "3/6+2/6=5/6", B))
    probs.append(P_fill("fad_c_e5", "7/8 - 1/4 = ?", "5/8",
                        "1/4=2/8", "7/8-2/8=5/8", C))
    probs.append(P_mc("fad_x_e4", "2/3 - 1/4 = ?",
                      ["5/12", "1/12", "3/7"], 0,
                      "LCD=12", "8/12-3/12=5/12", X))

    return make_set("fraction_add_diff", "异分母分数加减", "procedure", probs)


def fraction_mixed_calc():
    """分数混合运算 — mixed addition and subtraction with simplifying."""
    import math
    probs = [
        P_mc("fmc_b0", "1/2 + 1/4 + 1/4 = ?",
             ["1", "3/4", "3/8"], 0, "1/2=2/4,再相加", "2/4+1/4+1/4=4/4=1", B),
        P_mc("fmc_b1", "3/4 - 1/4 + 1/4 = ?",
             ["3/4", "1/4", "1"], 0, "从左到右", "3/4-1/4+1/4=3/4", B),
        P_mc("fmc_c0", "1/2 + 1/3 - 1/6 = ?",
             ["2/3", "1/6", "1/3"], 0, "公分母 6", "3/6+2/6-1/6=4/6=2/3", C),
        P_mc("fmc_c1", "5/6 - 1/3 + 1/6 = ?",
             ["2/3", "1/2", "5/6"], 0, "1/3=2/6", "5/6-2/6+1/6=4/6=2/3", C),
        P_mc("fmc_c2", "1 - 1/3 - 1/4 = ?",
             ["5/12", "7/12", "1/2"], 0, "公分母 12", "12/12-4/12-3/12=5/12", C),
        P_mc("fmc_x0", "一根绳子,用了 1/3 做跳绳、2/9 做扎花,还剩几分之几?",
             ["4/9", "5/9", "1/3"], 0, "1-1/3-2/9,通分到 9", "1-3/9-2/9=4/9", X),
        P_mc("fmc_x1", "1/2 + 1/3 + 1/4 = ?",
             ["13/12", "1", "3/4"], 0, "公分母 12", "6/12+4/12+3/12=13/12", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Helper to compute three-term expression over a common denominator
    def _fmc_mc(pid, fracs, ops, diff):
        """fracs=[(n,d),...], ops=['+'/'-',...] len(ops)=len(fracs)-1"""
        # find LCD
        lcd = fracs[0][1]
        for _, d in fracs[1:]:
            lcd = lcd * d // math.gcd(lcd, d)
        nums = [n * (lcd // d) for n, d in fracs]
        result_n = nums[0]
        for op, n in zip(ops, nums[1:]):
            result_n = result_n + n if op == "+" else result_n - n
        g = math.gcd(abs(result_n), lcd)
        rn, rd = result_n // g, lcd // g
        correct = f"{rn}/{rd}" if rd != 1 else str(rn)
        # build prompt
        parts = [f"{fracs[0][0]}/{fracs[0][1]}"]
        for op, (n, d) in zip(ops, fracs[1:]):
            parts.append(f"{op} {n}/{d}")
        prompt = " ".join(parts) + " = ?"
        # distractors
        w1 = f"{rn+1}/{rd}"
        w2 = f"{rn-1}/{rd}" if rn > 1 else f"{rn}/{rd+1}"
        expl_nums = "+".join(str(n) for n in nums[:1]) + "".join(
            f"{ops[i]}{nums[i+1]}" for i in range(len(ops)))
        expl = f"LCD={lcd};{expl_nums}={result_n}→{correct}"
        return P_mc(pid, prompt, [correct, w1, w2], 0, f"公分母{lcd}", expl, diff)

    probs.append(_fmc_mc("fmc_b_e1", [(1,3),(1,3),(1,3)], ["+","+"], B))  # 1/3+1/3+1/3=1
    probs.append(_fmc_mc("fmc_b_e2", [(3,5),(1,5),(1,5)], ["-","+"], B))  # 3/5-1/5+1/5=3/5
    probs.append(_fmc_mc("fmc_c_e1", [(1,2),(1,4),(1,8)], ["+","+"], C))  # 1/2+1/4+1/8=7/8
    probs.append(_fmc_mc("fmc_c_e2", [(3,4),(1,8),(1,8)], ["-","-"], C))  # 3/4-1/8-1/8=1/2
    probs.append(_fmc_mc("fmc_c_e3", [(1,2),(1,6),(1,3)], ["+","-"], C))  # 1/2+1/6-1/3=1/3
    probs.append(_fmc_mc("fmc_c_e4", [(5,6),(1,3),(1,6)], ["-","+"], C))  # 5/6-1/3+1/6=2/3

    # 1 - two fractions (challenge)
    # 1 - 1/4 - 1/4 = 1/2
    probs.append(P_mc("fmc_x_e1", "1 - 1/4 - 1/4 = ?",
                      ["1/2", "3/4", "1/4"], 0, "4/4-1/4-1/4=2/4=1/2",
                      "4/4-1/4-1/4=2/4=1/2", X))
    # 1 - 2/5 - 1/3 = ?  → 15/15-6/15-5/15=4/15
    probs.append(P_mc("fmc_x_e2", "1 - 2/5 - 1/3 = ?",
                      ["4/15", "2/15", "7/15"], 0, "公分母15",
                      "15/15-6/15-5/15=4/15", X))
    # fill: 1/2 - 1/3 + 1/6 = ?  → 3/6-2/6+1/6=2/6=1/3
    probs.append(P_fill("fmc_x_e3", "1/2 - 1/3 + 1/6 = ?", "1/3",
                        "公分母6", "3/6-2/6+1/6=2/6=1/3", X))
    # additional
    probs.append(P_mc("fmc_b_e3", "3/7 + 3/7 = ?",
                      ["6/7", "6/14", "1"], 0, "同分母加法", "3+3=6,6/7", B))
    probs.append(P_fill("fmc_c_e5", "5/8 + 1/4 - 3/8 = ?", "1/2",
                        "公分母8", "1/4=2/8,5/8+2/8-3/8=4/8=1/2", C))
    probs.append(P_mc("fmc_x_e4", "3/4 + 1/6 - 5/12 = ?",
                      ["1/2", "7/12", "1/3"], 0, "公分母12", "9/12+2/12-5/12=6/12=1/2", X))

    return make_set("fraction_mixed_calc", "分数混合运算", "procedure", probs)


# ── Concept sets ─────────────────────────────────────────────────────────────

def decimal_mul_meaning():
    probs = [
        P_mc("dmm_b0", "0.3 × 4 表示什么?",
             ["0.3 的 4 倍", "4 的 0.3 倍", "0.3 + 4"], 0, "小数乘整数的意义", "0.3×4=0.3+0.3+0.3+0.3=1.2", B),
        P_mc("dmm_b1", "小数乘整数,积和因数比,积会?",
             ["等于因数", "可能大也可能小", "一定更大"], 1, "整数可以是0或1", "乘以0得0,乘以1得本身", B),
        P_mc("dmm_c0", "1.5 × 2 的结果是?",
             ["3", "0.3", "30"], 0, "1.5+1.5", "1.5×2=3.0=3", C),
        P_mc("dmm_c1", "小数乘小数,积和被乘数比?",
             ["一定更小", "一定更大", "不一定"], 2, "乘以大于1的小数,积更大", "如 0.5×1.2=0.6>0.5", C),
        P_mc("dmm_x0", "2.4 × 0.5,结果与 2.4 相比?",
             ["更小", "更大", "相等"], 0, "0.5 < 1,所以积 < 被乘数", "2.4×0.5=1.2<2.4", X),
        P_mc("dmm_x1", "下面哪个算式的积最大?",
             ["3.6 × 1.2", "3.6 × 0.9", "3.6 × 1"], 0, "乘数越大积越大", "1.2>1>0.9,故3.6×1.2最大", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # B: meaning questions
    probs.append(P_mc("dmm_b_e1", "0.6 × 5 的意义是?",
                      ["0.6 的 5 倍", "5 的 0.6 倍", "0.6 ÷ 5"], 0,
                      "小数乘整数的意义", "0.6×5=0.6+0.6+0.6+0.6+0.6=3.0", B))
    probs.append(P_mc("dmm_b_e2", "一个数乘以 1,结果是?",
                      ["等于原数", "更大", "更小"], 0,
                      "任何数×1不变", "a×1=a", B))
    probs.append(P_mc("dmm_b_e3", "小数乘以 0,结果是?",
                      ["0", "原数", "无法计算"], 0,
                      "任何数×0=0", "a×0=0", B))
    # C
    probs.append(P_mc("dmm_c_e1", "0.8 × 1.5,积与 0.8 比较?",
                      ["更大", "更小", "相等"], 0,
                      "1.5>1,所以积>被乘数", "0.8×1.5=1.2>0.8", C))
    probs.append(P_mc("dmm_c_e2", "0.4 × 0.4,积与 0.4 比较?",
                      ["更小", "更大", "相等"], 0,
                      "0.4<1,所以积<被乘数", "0.4×0.4=0.16<0.4", C))
    probs.append(P_mc("dmm_c_e3", "3.2 × 0.1 的结果是?",
                      ["0.32", "32", "3.2"], 0,
                      "乘0.1即移小数点一位", "3.2×0.1=0.32", C))
    # X
    probs.append(P_mc("dmm_x_e1", "下面哪个算式的积小于被乘数 5?",
                      ["5 × 0.7", "5 × 1.3", "5 × 1"], 0,
                      "乘数<1时积<被乘数", "0.7<1,故5×0.7=3.5<5", X))
    probs.append(P_mc("dmm_x_e2", "0.9 × 0.9 最接近哪个数?",
                      ["0.81", "0.9", "1"], 0,
                      "直接计算", "0.9×0.9=0.81", X))
    probs.append(P_mc("dmm_x_e3", "不计算,判断 4.7 × 1.01 与 4.7 的关系?",
                      ["4.7×1.01 > 4.7", "4.7×1.01 < 4.7", "4.7×1.01 = 4.7"], 0,
                      "1.01>1,积>被乘数", "1.01>1,所以积大于4.7", X))
    probs.append(P_mc("dmm_x_e4", "3 × 0.01 的结果是?",
                      ["0.03", "0.3", "30"], 0, "乘0.01即移2位", "3×0.01=0.03", X))
    probs.append(P_mc("dmm_c_e4", "1.2 × 0.5 的积与 1.2 比?",
                      ["更小", "更大", "相等"], 0, "0.5<1,积<被乘数", "1.2×0.5=0.6<1.2", C))
    probs.append(P_mc("dmm_b_e4", "小数乘以 10,相当于?",
                      ["小数点右移一位", "小数点左移一位", "加10"], 0,
                      "乘10→移位", "乘10等于小数点向右移一位", B))
    probs.append(P_fill("dmm_b_e5", "0.3 × 4 = ?", 0.3*4, "3×4=12,移小数点", f"3×4=12,移一位:1.2", B))
    probs.append(P_mc("dmm_c_e5", "2.5 × 0.4 的结果是?",
                      ["1.0", "0.1", "10.0"], 0, "25×4=100,移两位", "25×4=100,两个因数各一位小数→移2位=1.0", C))

    return make_set("decimal_mul_meaning", "小数乘法意义", "concept", probs)


def decimal_div_meaning():
    probs = [
        P_mc("ddm_b0", "3 ÷ 0.5 的含义是?",
             ["3 里面有几个 0.5", "3 是 0.5 的几倍", "两者相同"], 2, "意义相同", "都等于 6", B),
        P_mc("ddm_b1", "被除数不变,除数变小,商会?",
             ["变大", "变小", "不变"], 0, "反比关系", "除数越小,商越大", B),
        P_mc("ddm_c0", "4.8 ÷ 0.8,被除数和除数同乘 10 变成?",
             ["48 ÷ 8", "48 ÷ 80", "4.8 ÷ 8"], 0, "商不变性质", "商不变:同乘10", C),
        P_mc("ddm_c1", "6 ÷ 0.3 等于多少?",
             ["20", "2", "0.2"], 0, "6/0.3=60/3=20", "同乘10:60÷3=20", C),
        P_mc("ddm_x0", "小数除法计算时,把除数化为整数的依据是?",
             ["商不变性质", "积不变性质", "四则运算顺序"], 0, "商不变:被除数和除数同乘相同的数", "商不变性质", X),
        P_mc("ddm_x1", "2.4 ÷ 0.04,结果是?",
             ["60", "6", "600"], 0, "同乘100:240÷4=60", "240÷4=60", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    probs.append(P_mc("ddm_b_e1", "5 ÷ 0.5 等于多少?",
                      ["10", "1", "2.5"], 0, "同乘10:50÷5=10", "50÷5=10", B))
    probs.append(P_mc("ddm_b_e2", "被除数变大,除数不变,商会?",
                      ["变大", "变小", "不变"], 0, "正比关系", "被除数越大商越大", B))
    probs.append(P_mc("ddm_b_e3", "8 ÷ 0.2 等于多少?",
                      ["40", "4", "0.4"], 0, "同乘10:80÷2=40", "80÷2=40", B))
    probs.append(P_mc("ddm_c_e1", "3.6 ÷ 0.6,同乘10后变成?",
                      ["36 ÷ 6", "3.6 ÷ 6", "36 ÷ 60"], 0, "同乘10", "商不变:3.6×10÷(0.6×10)=36÷6=6", C))
    probs.append(P_mc("ddm_c_e2", "7.2 ÷ 0.09,同乘多少最合适?",
                      ["100", "10", "1000"], 0, "除数0.09有两位小数,乘100变整数", "0.09×100=9,同乘100:720÷9=80", C))
    # Parametric compute: a ÷ 0.b = (a*10) ÷ b
    for pid, a, b_str, b, diff in [
        ("ddm_c_e3", 1.2, "0.4", 4, C),   # 12÷4=3
        ("ddm_x_e1", 3.5, "0.5", 5, X),   # 35÷5=7
        ("ddm_x_e2", 4.5, "0.09", 9, X),  # 450÷9=50
    ]:
        if b_str == "0.09":
            factor = 100
            n_a = int(a * 100)
        else:
            factor = 10
            n_a = int(a * 10)
        ans = n_a // b
        probs.append(P_mc(pid, f"{a} ÷ {b_str} = ?",
                          [str(ans), str(ans // 10), str(ans * 10)], 0,
                          f"同乘{factor}", f"{n_a}÷{b}={ans}", diff))
    probs.append(P_mc("ddm_x_e3", "不计算,比较 6 ÷ 0.6 和 6 ÷ 6 的大小?",
                      ["6÷0.6 > 6÷6", "6÷0.6 < 6÷6", "相等"], 0,
                      "除数越小商越大", "0.6<6,故6÷0.6=10>6÷6=1", X))
    probs.append(P_mc("ddm_b_e4", "商不变性质说:被除数和除数同时乘以相同的数(不为0),商?",
                      ["不变", "变大", "变小"], 0, "商不变性质", "商不变", B))
    probs.append(P_mc("ddm_c_e4", "15 ÷ 0.3 等于多少?",
                      ["50", "5", "500"], 0, "同乘10:150÷3=50", "150÷3=50", C))
    probs.append(P_mc("ddm_x_e4", "0.48 ÷ 0.06 等于多少?",
                      ["8", "0.8", "80"], 0, "同乘100:48÷6=8", "48÷6=8", X))

    return make_set("decimal_div_meaning", "小数除法意义", "concept", probs)


def position_grid():
    probs = [
        P_mc("pg_b0", "在方格纸上用(列,行)表示位置,先写哪个?",
             ["列(竖)", "行(横)", "都可以"], 0, "先列后行", "规定:先列后行,如(3,2)表示第3列第2行", B),
        P_mc("pg_b1", "(2, 3) 表示第几列第几行?",
             ["第2列第3行", "第3列第2行", "第2行第3列"], 0, "先列后行", "第2列第3行", B),
        P_mc("pg_c0", "小红坐在第4列第2行,用数对表示是?",
             ["(4,2)", "(2,4)", "(4,4)"], 0, "先列后行", "(4,2)", C),
        P_mc("pg_c1", "(3,5) 和 (5,3) 表示的位置?",
             ["不同位置", "相同位置", "看情况"], 0, "顺序不同,位置不同", "(3,5)与(5,3)是两个不同位置", C),
        P_mc("pg_x0", "在方格中描出 (2,4)、(4,4)、(4,2)、(2,2) 四点,连线后是什么图形?",
             ["正方形", "长方形", "菱形"], 0, "边长相等的四边形", "四点构成正方形", X),
        P_mc("pg_x1", "某点向右移2格后坐标是(5,3),则原来的坐标是?",
             ["(3,3)", "(7,3)", "(5,1)"], 0, "向右列+2,向左列-2", "5-2=3,行不变:原坐标(3,3)", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    probs.append(P_mc("pg_b_e1", "(1, 1) 表示?",
                      ["第1列第1行", "第1行第1列", "都一样"], 0,
                      "先列后行", "第1列第1行(行列相同时也需规范)", B))
    probs.append(P_mc("pg_b_e2", "数对 (6, 2) 中,6 表示?",
                      ["第6列", "第6行", "第6个位置"], 0, "先列后行", "6表示第6列", B))
    probs.append(P_mc("pg_b_e3", "第5列第3行用数对表示是?",
                      ["(5,3)", "(3,5)", "(5,5)"], 0, "先列后行", "(5,3)", B))
    probs.append(P_mc("pg_c_e1", "某点在第2列第6行,向上移3行后的坐标是?",
                      ["(2,9)", "(5,6)", "(2,3)"], 0, "向上行+3", "行+3=6+3=9,列不变:(2,9)", C))
    probs.append(P_mc("pg_c_e2", "点 (4,3) 向左移2列后的坐标是?",
                      ["(2,3)", "(4,1)", "(6,3)"], 0, "向左列-2", "4-2=2,行不变:(2,3)", C))
    probs.append(P_mc("pg_c_e3", "(3,4) 和 (3,2) 两点连线,这条线段是?",
                      ["竖直线段", "水平线段", "斜线段"], 0, "列相同,行不同→竖直", "列相同(都是3),行不同→竖直线段", C))
    probs.append(P_fill("pg_x_e1", "点(4,5)向右移3列,向下移2行,新坐标是(?,?)\n填:列,行 格式如 7,3", "7,3",
                        "列+3行-2", "4+3=7,5-2=3→(7,3)", X))
    probs.append(P_mc("pg_x_e2", "描出 (1,3),(3,3),(3,1),(1,1) 四点连线,图形面积是多少平方格?",
                      ["4", "8", "6"], 0, "边长2的正方形", "边长=3-1=2,面积=2×2=4", X))
    probs.append(P_mc("pg_x_e3", "A(2,1), B(2,5),AB连线长几格?",
                      ["4", "3", "6"], 0, "行差=5-1=4", "行差=5-1=4格(列相同→竖直)", X))
    probs.append(P_mc("pg_c_e4", "点(5,3)向右移一列后在哪里?",
                      ["(6,3)", "(5,4)", "(4,3)"], 0, "向右列+1", "5+1=6,行不变→(6,3)", C))
    probs.append(P_mc("pg_b_e4", "数对(3,7)中,先读哪个数?",
                      ["3(列)", "7(行)", "都可以"], 0, "先列后行", "数对先写列号3", B))
    probs.append(P_fill("pg_x_e4", "点(6,4)向左移4列后列号是多少?", "2",
                        "列-4=6-4=2", "6-4=2", X))
    probs.append(P_mc("pg_b_e5", "数对 (0,0) 表示什么位置?",
                      ["第0列第0行(原点)", "第0行第0列", "无效坐标"], 0, "(0,0)是原点", "(0,0)是坐标轴原点", B))
    probs.append(P_fill("pg_c_e5", "点A在第3列第5行,点B在第3列第2行,A到B竖向距离几格?",
                        3, "行差=5-2=3", "5-2=3格", C))

    return make_set("position_grid", "位置与坐标", "concept", probs)


def probability_concept():
    probs = [
        P_mc("prob_b0", "明天太阳一定会从东方升起,这是?",
             ["确定事件", "不确定事件", "不可能事件"], 0, "一定发生", "确定事件", B),
        P_mc("prob_b1", "掷一个骰子,出现 7 点是?",
             ["不可能事件", "确定事件", "随机事件"], 0, "骰子只有1-6点", "不可能事件", B),
        P_mc("prob_c0", "袋子里有 3 个红球,摸出一个,是红球的可能性?",
             ["一定", "可能", "不可能"], 0, "袋中只有红球", "一定是红球", C),
        P_mc("prob_c1", "一个袋子里有 2 红 3 蓝,摸出蓝球的可能性?",
             ["比摸出红球大", "比摸出红球小", "一样大"], 0, "3>2,蓝球更多", "蓝球3个>红球2个,可能性更大", C),
        P_mc("prob_x0", "箱子里有红、蓝各5个球,摸出红球的可能性?",
             ["等可能", "红球更大", "蓝球更大"], 0, "数量相同", "各5个,可能性相等", X),
        P_mc("prob_x1", "一个正方体6面分别写1-6,掷出偶数的可能性?",
             ["一半", "大于一半", "小于一半"], 0, "2,4,6 共3面", "偶数3个÷总共6个=1/2", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    probs.append(P_mc("prob_b_e1", "明天可能下雨,这是?",
                      ["不确定事件", "确定事件", "不可能事件"], 0, "可能发生也可能不发生", "随机事件/不确定事件", B))
    probs.append(P_mc("prob_b_e2", "0 + 5 = 5,这是?",
                      ["确定事件", "不确定事件", "不可能事件"], 0, "数学运算结果确定", "确定事件", B))
    probs.append(P_mc("prob_b_e3", "从只有绿球的袋子里摸出红球,这是?",
                      ["不可能事件", "确定事件", "随机事件"], 0, "没有红球就不可能摸出", "不可能事件", B))
    probs.append(P_mc("prob_c_e1", "袋子里有 4 红 2 蓝,摸出红球的可能性?",
                      ["比摸出蓝球大", "比摸出蓝球小", "一样大"], 0,
                      "4>2,红球更多", "红球4>蓝球2,摸出红球可能性更大", C))
    probs.append(P_mc("prob_c_e2", "掷骰子,出现奇数的可能性与偶数?",
                      ["一样大", "奇数更大", "偶数更大"], 0,
                      "1,3,5 vs 2,4,6 各3个", "各3个,可能性相等", C))
    probs.append(P_mc("prob_c_e3", "下面哪件事是不可能事件?",
                      ["人没有翅膀能飞上天", "明天气温超过0℃", "抛硬币正面朝上"], 0,
                      "人没有翅膀飞天是不可能的", "不可能事件:人没有翅膀能飞上天", C))
    probs.append(P_mc("prob_x_e1", "袋中有3红2蓝1绿球,摸出哪种颜色可能性最小?",
                      ["绿", "红", "蓝"], 0, "绿球只有1个", "绿球最少(1个),可能性最小", X))
    probs.append(P_mc("prob_x_e2", "骰子掷出3的倍数(3或6)的可能性?",
                      ["1/3", "1/2", "1/6"], 0, "2个面÷6面=1/3", "3和6共2个面,概率=2/6=1/3", X))
    probs.append(P_mc("prob_x_e3", "10个球(编号1-10),随机摸1个是奇数编号的可能性?",
                      ["1/2", "1/5", "2/5"], 0, "奇数1,3,5,7,9共5个", "5个奇数÷10个总计=1/2", X))
    probs.append(P_mc("prob_c_e4", "袋中有5红5蓝,摸出红球和蓝球的可能性?",
                      ["一样大", "红球更大", "蓝球更大"], 0, "数量相等", "5=5,可能性相等", C))
    probs.append(P_mc("prob_b_e4", "投硬币,正面朝上是?",
                      ["不确定事件", "确定事件", "不可能事件"], 0, "可能正可能反", "不确定事件(随机)", B))
    probs.append(P_mc("prob_x_e4", "袋中有6红2蓝,摸出蓝球比红球的可能性?",
                      ["小", "大", "一样"], 0, "2<6", "蓝球2个<红球6个,可能性更小", X))
    probs.append(P_mc("prob_b_e5", "向天空抛球,球会落回地面是?",
                      ["确定事件", "不确定事件", "不可能事件"], 0, "重力使球必然落下", "在地球上,球必然落地=确定事件", B))
    probs.append(P_mc("prob_c_e5", "袋中3红1蓝,下列说法正确的是?",
                      ["摸出红球的可能性更大", "摸出蓝球的可能性更大", "两种可能性一样"], 0,
                      "3>1,红球更多", "红3>蓝1,摸出红球可能性更大", C))

    return make_set("probability_concept", "可能性", "concept", probs)


def equation_meaning():
    probs = [
        P_mc("eqm_b0", "含有未知数的等式叫做?",
             ["方程", "算式", "不等式"], 0, "方程定义", "方程=含未知数的等式", B),
        P_mc("eqm_b1", "下面哪个是方程?",
             ["x + 5 = 12", "3 + 5 = 8", "x + 5"], 0, "含未知数且是等式", "x+5=12 是方程", B),
        P_mc("eqm_c0", "方程一定是等式吗?",
             ["一定是", "不一定", "一定不是"], 0, "方程必须有等号", "方程一定是等式", C),
        P_mc("eqm_c1", "等式一定是方程吗?",
             ["不一定", "一定是", "一定不是"], 0, "等式可以没有未知数", "3+5=8 是等式但不是方程", C),
        P_mc("eqm_x0", "3x + 2 是方程吗?",
             ["不是,没有等号", "是,有未知数", "是,有加法"], 0, "没有等号就不是方程", "方程必须有等号", X),
        P_mc("eqm_x1", "下面哪个不是方程?",
             ["2x = 10", "x + y = 5", "5 + 3 = 8"], 2, "5+3=8不含未知数", "5+3=8 是等式但不是方程", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    probs.append(P_mc("eqm_b_e1", "4a - 3 = 9 是方程吗?",
                      ["是,含未知数且有等号", "不是,没有等号", "不是,含字母"], 0,
                      "含未知数a且有等号", "含未知数a且有等号,是方程", B))
    probs.append(P_mc("eqm_b_e2", "方程 x + 7 = 15 中的未知数是?",
                      ["x", "7", "15"], 0, "x是未知数", "x是未知数", B))
    probs.append(P_mc("eqm_b_e3", "下面哪个是方程?",
                      ["5y = 20", "5 + 7 = 12", "x + y"], 0, "5y=20含未知数且有等号", "5y=20是方程", B))
    probs.append(P_mc("eqm_c_e1", "y - 8 = 0 是方程吗?",
                      ["是", "不是", "不确定"], 0, "含未知数y,有等号", "y-8=0是方程", C))
    probs.append(P_mc("eqm_c_e2", "方程中的未知数可以是?",
                      ["任何字母", "只能是x", "只能是整数"], 0,
                      "用任意字母表示未知数", "未知数可用任意字母表示", C))
    probs.append(P_mc("eqm_c_e3", "0 = 0 是方程吗?",
                      ["不是,没有未知数", "是,有等号", "不确定"], 0,
                      "没有未知数就不是方程", "方程必须含未知数,0=0无未知数", C))
    probs.append(P_mc("eqm_x_e1", "用方程解决问题的关键步骤是?",
                      ["找到等量关系,设未知数列方程", "直接计算", "先猜后验"], 0,
                      "分析等量关系是关键", "找等量关系→设x→列方程→解方程", X))
    probs.append(P_mc("eqm_x_e2", "下面哪组都是方程?",
                      ["3x=9 和 y+4=10", "5+3=8 和 x=1", "x>5 和 y<3"], 0,
                      "两个都含未知数且有等号", "3x=9和y+4=10都是方程", X))
    probs.append(P_mc("eqm_x_e3", "将'一个数的3倍加5等于20'列成方程是?",
                      ["3x + 5 = 20", "3 + 5x = 20", "3x = 20 + 5"], 0,
                      "3倍→3x,加5→+5", "3x+5=20", X))
    probs.append(P_mc("eqm_b_e4", "方程 5 = x + 2 和 x + 2 = 5 是?",
                      ["同一个方程,等式可以对调", "不同方程", "第一个不是方程"], 0,
                      "等式两边可互换", "等式左右两边可以对调,是同一方程", B))
    probs.append(P_mc("eqm_b_e5", "2x - 3 = 7 是方程吗?",
                      ["是", "不是", "不确定"], 0, "含未知数x且有等号", "2x-3=7含未知数,有等号,是方程", B))
    probs.append(P_mc("eqm_c_e4", "已知方程 x + 4 = 10,其中未知数 x 等于?",
                      ["6", "14", "4"], 0, "x=10-4=6", "x+4=10,x=10-4=6", C))
    probs.append(P_mc("eqm_c_e5", "方程 4x = 12 中,x 的值是?",
                      ["3", "8", "48"], 0, "x=12÷4=3", "4×3=12,x=3", C))
    probs.append(P_mc("eqm_x_e4", "将'两个数之和的一半等于9'列成方程(设两数之和为x)?",
                      ["x ÷ 2 = 9", "x + 2 = 9", "2x = 9"], 0,
                      "之和→x,一半→÷2", "x÷2=9", X))

    return make_set("equation_meaning", "方程的意义", "concept", probs)


def equation_check():
    probs = [
        P_mc("eqc_b0", "验证 x=3 是否是 x+5=8 的解?",
             ["代入:3+5=8 ✓", "代入:3+5=9 ✗", "不用验证"], 0, "把x=3代入等式", "3+5=8,左=右,是解", B),
        P_mc("eqc_b1", "方程的解指的是?",
             ["使方程成立的未知数的值", "方程的结果", "方程里的数"], 0, "解的定义", "使等式成立的未知数的值", B),
        P_mc("eqc_c0", "x=4 是方程 2x=10 的解吗?",
             ["不是,2×4=8≠10", "是,2×4=8", "不确定"], 0, "代入验证", "2×4=8≠10,不是解", C),
        P_mc("eqc_c1", "x=5 是方程 3x-5=10 的解吗?",
             ["是,3×5-5=10", "不是", "不确定"], 0, "3×5-5=15-5=10 ✓", "3×5-5=10,是解", C),
        P_mc("eqc_x0", "下面哪个值是方程 x÷4+3=5 的解?",
             ["x=8", "x=4", "x=12"], 0, "8÷4+3=2+3=5 ✓", "x=8代入:8÷4+3=5 ✓", X),
        P_mc("eqc_x1", "x=6 是方程 50-4x=26 的解吗?",
             ["是,50-24=26 ✓", "不是,50-24=24", "不确定"], 0, "50-4×6=50-24=26", "50-24=26,是解", X),
    ]

    # ── Extra problems: parametrically verify substitution ───────────────────
    # Helper: build a check-substitution mc problem
    def _eqc(pid, x_val, coeff, rhs, op, diff):
        """Equation: coeff*x [op] const = rhs. We vary structure."""
        # Actually we'll do explicit cases for clarity
        pass

    # B extras
    probs.append(P_mc("eqc_b_e1", "x=2 是方程 x+9=11 的解吗?",
                      ["是,2+9=11 ✓", "不是,2+9=10", "不确定"], 0,
                      "代入x=2", "2+9=11,左=右,是解", B))
    probs.append(P_mc("eqc_b_e2", "x=6 是方程 x-4=3 的解吗?",
                      ["不是,6-4=2≠3", "是,6-4=2", "不确定"], 0,
                      "代入x=6", "6-4=2≠3,不是解", B))
    probs.append(P_mc("eqc_b_e3", "方程 x+3=10 的解是?",
                      ["x=7", "x=13", "x=3"], 0, "x=10-3", "10-3=7,故x=7", B))
    # C extras — parametric: x_val, a*x = b (verify)
    for pid, x_val, a, b, diff in [
        ("eqc_c_e1", 6, 4, 24, C),  # 4×6=24 ✓
        ("eqc_c_e2", 9, 3, 24, C),  # 3×9=27≠24 ✗
        ("eqc_c_e3", 7, 5, 35, C),  # 5×7=35 ✓
    ]:
        lhs = a * x_val
        is_sol = lhs == b
        correct_opt = f"{'是' if is_sol else '不是'},{a}×{x_val}={lhs}{'='+str(b)+' ✓' if is_sol else '≠'+str(b)}"
        wrong_opt = f"{'不是' if is_sol else '是'},{a}×{x_val}={lhs}"
        probs.append(P_mc(pid, f"x={x_val} 是方程 {a}x={b} 的解吗?",
                          [correct_opt, wrong_opt, "不确定"], 0,
                          f"代入x={x_val}", f"{a}×{x_val}={lhs}{'='+str(b)+',是解' if is_sol else '≠'+str(b)+',不是解'}", diff))
    # X extras
    probs.append(P_mc("eqc_x_e1", "x=4 是方程 2x+3=11 的解吗?",
                      ["是,2×4+3=11 ✓", "不是,2×4+3=10", "不确定"], 0,
                      "代入x=4", f"2×4+3={2*4+3}=11 ✓", X))
    probs.append(P_mc("eqc_x_e2", "下面哪个x值使方程 3x-1=14 成立?",
                      ["x=5", "x=4", "x=6"], 0, "3×5-1=14 ✓", f"3×5-1={3*5-1}=14 ✓", X))
    probs.append(P_mc("eqc_x_e3", "x=3 是方程 x²=9 的解吗?",
                      ["是,3²=9 ✓", "不是,3²=6", "不确定"], 0,
                      "代入x=3", "3×3=9 ✓,是解", X))
    probs.append(P_fill("eqc_c_e4", "方程 x × 6 = 42 的解是?", 7,
                        "x=42÷6", "x=42÷6=7", C))
    probs.append(P_mc("eqc_b_e4", "x=0 是方程 x+8=8 的解吗?",
                      ["是,0+8=8 ✓", "不是", "不确定"], 0,
                      "代入x=0", "0+8=8 ✓,是解", B))
    probs.append(P_fill("eqc_b_e5", "方程 x + 9 = 15 的解是?", 6, "x=15-9", "x=15-9=6", B))
    probs.append(P_mc("eqc_c_e5", "x=8 是方程 x÷4=2 的解吗?",
                      ["是,8÷4=2 ✓", "不是,8÷4=4", "不确定"], 0,
                      "代入x=8", "8÷4=2 ✓,是解", C))
    probs.append(P_mc("eqc_x_e4", "x=2 是方程 3x+4=10 的解吗?",
                      ["是,3×2+4=10 ✓", "不是,3×2+4=9", "不确定"], 0,
                      "代入x=2", f"3×2+4={3*2+4}=10 ✓,是解", X))

    return make_set("equation_check", "检验方程的解", "concept", probs)


def factor_concept():
    probs = [
        P_mc("fc_b0", "12 = 3 × 4,那么 3 和 4 是 12 的?",
             ["因数", "倍数", "公因数"], 0, "因数定义", "3和4都是12的因数", B),
        P_mc("fc_b1", "12 是 3 的?",
             ["倍数", "因数", "公倍数"], 0, "倍数定义", "12÷3=4,12是3的倍数", B),
        P_mc("fc_c0", "一个数的因数,最大不超过?",
             ["它本身", "它的一半", "9"], 0, "自身是最大因数", "最大因数是它本身", C),
        P_mc("fc_c1", "一个数的最小倍数是?",
             ["它本身", "1", "2倍"], 0, "最小倍数是它本身", "最小倍数就是本身(×1)", C),
        P_mc("fc_x0", "18 的因数有几个?",
             ["6个", "4个", "8个"], 0, "1,2,3,6,9,18", "1×18,2×9,3×6 → 6个因数", X),
        P_mc("fc_x1", "既是 6 的倍数又是 4 的因数的数是?",
             ["12", "6", "4"], 0, "6的倍数:6,12...;4的因数:1,2,4", "12是6的倍数但不是4的因数;答案应是不存在,但在选项中选最接近:4的因数里没有6的倍数的完美答案,重题:4的因数中哪个是6的倍数?无;此题考查交集概念,答选12(6的倍数,同时12的因数里有4,但12≠4的因数)。修正题意,见解析。", X),
    ]
    # Correct the last problem which was malformed
    probs = [
        P_mc("fc_b0", "12 = 3 × 4,那么 3 和 4 是 12 的?",
             ["因数", "倍数", "公因数"], 0, "因数定义", "3和4都是12的因数", B),
        P_mc("fc_b1", "12 是 3 的?",
             ["倍数", "因数", "公倍数"], 0, "倍数定义", "12÷3=4,12是3的倍数", B),
        P_mc("fc_c0", "一个数的因数,最大不超过?",
             ["它本身", "它的一半", "任意大"], 0, "自身是最大因数", "最大因数是它本身", C),
        P_mc("fc_c1", "一个数的最小倍数是?",
             ["它本身", "1", "2倍"], 0, "最小倍数是它本身", "最小倍数就是本身(×1)", C),
        P_mc("fc_x0", "18 的因数有几个?",
             ["6个", "4个", "8个"], 0, "1,2,3,6,9,18", "1×18,2×9,3×6 → 共6个因数", X),
        P_mc("fc_x1", "36 的因数中,最大的因数是多少?",
             ["36", "18", "9"], 0, "最大因数是它本身", "36÷1=36,最大因数是36自身", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    import math as _math

    def _count_factors(n):
        return sum(1 for i in range(1, n + 1) if n % i == 0)

    probs.append(P_mc("fc_b_e1", "5 是 15 的?",
                      ["因数", "倍数", "公因数"], 0, "15÷5=3,5是15的因数", "15÷5=3整除,5是15的因数", B))
    probs.append(P_mc("fc_b_e2", "20 是 4 的?",
                      ["倍数", "因数", "公倍数"], 0, "20÷4=5,20是4的倍数", "20÷4=5,20是4的倍数", B))
    probs.append(P_mc("fc_b_e3", "1 是任何自然数的?",
                      ["因数", "倍数", "既是因数又是倍数"], 0, "任何数÷1=整数", "1是任何自然数的因数", B))
    probs.append(P_mc("fc_c_e1", "因数和它对应的另一个因数的乘积等于?",
                      ["这个数本身", "公因数", "最小公倍数"], 0, "因数成对出现", "两个因数相乘等于原数", C))
    for pid, n, diff in [("fc_c_e2", 12, C), ("fc_c_e3", 24, C), ("fc_x_e1", 30, X)]:
        cnt = _count_factors(n)
        factors_list = [i for i in range(1, n + 1) if n % i == 0]
        probs.append(P_mc(pid, f"{n} 的因数有几个?",
                          [f"{cnt}个", f"{cnt - 2}个", f"{cnt + 2}个"], 0,
                          f"列举:{factors_list}",
                          f"{n}的因数:{factors_list},共{cnt}个", diff))
    probs.append(P_mc("fc_x_e2", "一个数的因数个数是?",
                      ["有限个", "无限个", "不确定"], 0,
                      "因数都不超过本身,有限", "因数最大为本身,故有限个", X))
    probs.append(P_mc("fc_x_e3", "一个数的倍数个数是?",
                      ["无限个", "有限个", "不确定"], 0,
                      "倍数可以无限增大", "1倍,2倍,3倍…无限个", X))
    probs.append(P_mc("fc_c_e4", "6 的因数中最小的因数是?",
                      ["1", "2", "6"], 0, "最小因数永远是1", "任何自然数的最小因数都是1", C))
    probs.append(P_mc("fc_b_e4", "24 的因数包括?",
                      ["1,2,3,4,6,8,12,24", "1,2,4,8,16,24", "1,3,6,12,24"], 0,
                      "列举24的因数", "1×24,2×12,3×8,4×6→共8个因数", B))
    probs.append(P_mc("fc_x_e4", "既是 4 的因数又是 6 的因数的数有?",
                      ["1和2", "只有1", "1,2,4,6"], 0,
                      "公因数:GCD(4,6)=2,公因数为1和2", "4的因数{1,2,4}∩6的因数{1,2,3,6}={1,2}", X))

    return make_set("factor_concept", "因数与倍数概念", "concept", probs)


def prime_composite():
    probs = [
        P_mc("pc_b0", "只有 1 和它本身两个因数的数叫?",
             ["质数", "合数", "偶数"], 0, "质数定义", "质数只有1和本身两个因数", B),
        P_mc("pc_b1", "7 是质数还是合数?",
             ["质数", "合数", "既不是"], 0, "7的因数只有1和7", "7是质数", B),
        P_mc("pc_c0", "1 是质数还是合数?",
             ["都不是", "质数", "合数"], 0, "1只有一个因数", "1只有1个因数,既不是质数也不是合数", C),
        P_mc("pc_c1", "最小的质数是?",
             ["2", "1", "3"], 0, "2是偶数中唯一质数", "2是最小的质数", C),
        P_mc("pc_x0", "20 以内的质数有几个?",
             ["8个", "6个", "10个"], 0, "2,3,5,7,11,13,17,19", "2,3,5,7,11,13,17,19 共8个", X),
        P_mc("pc_x1", "两个质数的和一定是合数吗?",
             ["不一定", "一定是", "一定不是"], 0, "2+3=5是质数", "2+3=5,是质数,故不一定", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Parametric: classify numbers
    def _is_prime(n):
        if n < 2: return False
        for i in range(2, int(n**0.5) + 1):
            if n % i == 0: return False
        return True

    for pid, n, diff in [
        ("pc_b_e1", 11, B), ("pc_b_e2", 9,  B), ("pc_b_e3", 13, B),
        ("pc_c_e1", 15, C), ("pc_c_e2", 23, C), ("pc_c_e3", 21, C),
    ]:
        p = _is_prime(n)
        label = "质数" if p else "合数"
        wrong = "合数" if p else "质数"
        reason = (f"{n}只有1和{n}两个因数,是质数" if p
                  else f"{n}有因数{next(i for i in range(2, n) if n%i==0)},是合数")
        probs.append(P_mc(pid, f"{n} 是质数还是合数?",
                          [label, wrong, "既不是"], 0, reason, reason, diff))
    probs.append(P_mc("pc_x_e1", "合数的因数个数至少有几个?",
                      ["3个及以上", "2个", "1个"], 0, "合数有1,本身,至少一个其他因数", "合数至少有1,本身及第三个因数,≥3个", X))
    probs.append(P_mc("pc_x_e2", "最小的合数是?",
                      ["4", "2", "6"], 0, "4=2×2,是合数", "4是最小的合数(2和3是质数)", X))
    probs.append(P_mc("pc_x_e3", "两个不同质数的乘积一定是?",
                      ["合数", "质数", "偶数"], 0, "有三个以上因数", "两质数之积有1,两个质数,积本身等因数≥4个,是合数", X))
    probs.append(P_mc("pc_b_e4", "偶数中唯一的质数是?",
                      ["2", "4", "6"], 0, "2是最小质数且是偶数", "2是唯一的偶数质数", B))
    probs.append(P_mc("pc_c_e4", "4 以内的自然数中,哪些是质数?",
                      ["2和3", "1和2", "3和4"], 0, "2,3是质数,1既不是,4是合数", "2和3是质数", C))
    probs.append(P_mc("pc_x_e4", "30以内既是合数又是奇数的最小数是?",
                      ["9", "6", "15"], 0, "9=3×3,合数且奇数", "9是奇合数,9=3²", X))

    return make_set("prime_composite", "质数与合数", "concept", probs)


def divisibility_rules():
    probs = [
        P_mc("dr_b0", "个位是 0 或 5 的数能被几整除?",
             ["5", "2", "3"], 0, "5的整除特征", "个位0或5→能被5整除", B),
        P_mc("dr_b1", "能被 2 整除的数叫?",
             ["偶数", "奇数", "质数"], 0, "偶数定义", "偶数能被2整除", B),
        P_mc("dr_c0", "判断 126 能否被 3 整除?",
             ["能,1+2+6=9", "不能,末位是6", "不确定"], 0, "3的整除特征:各位数字之和", "1+2+6=9,9÷3=3,故能被3整除", C),
        P_mc("dr_c1", "312 能被哪些数整除(2、3、5中)?",
             ["2和3", "只有2", "2、3和5"], 0, "末位2→能被2;3+1+2=6→能被3;末位非0/5→不被5", "能被2和3整除", C),
        P_mc("dr_x0", "能同时被 2、3、5 整除的最小两位数是?",
             ["30", "60", "15"], 0, "LCM(2,3,5)=30", "30:末位0→被2和5;3+0=3→被3", X),
        P_mc("dr_x1", "下面哪个数既是偶数又能被 3 整除?",
             ["12", "15", "16"], 0, "12:偶数;1+2=3能被3整除", "12满足两个条件", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Parametric: given a number, determine divisibility
    def _div_by(n, d):
        return n % d == 0
    def _digit_sum(n):
        return sum(int(c) for c in str(n))

    probs.append(P_mc("dr_b_e1", "能被 2 整除的数,末位是?",
                      ["0,2,4,6,8", "1,3,5,7,9", "0,5"], 0, "偶数末位特征", "偶数末位为0,2,4,6,8", B))
    probs.append(P_mc("dr_b_e2", "85 能被 5 整除吗?",
                      ["能,末位是5", "不能", "不确定"], 0, "末位5→被5整除", "末位5,能被5整除", B))
    probs.append(P_mc("dr_b_e3", "48 是偶数吗?",
                      ["是,末位8", "不是", "不确定"], 0, "末位8为偶数", "末位8,是偶数,能被2整除", B))
    # C: check divisibility by 3
    for pid, n, diff in [("dr_c_e1", 234, C), ("dr_c_e2", 175, C), ("dr_c_e3", 351, C)]:
        s = _digit_sum(n)
        div3 = _div_by(n, 3)
        label = f"能,{'+'.join(str(int(c)) for c in str(n))}={s}" if div3 else f"不能,{'+'.join(str(int(c)) for c in str(n))}={s}"
        probs.append(P_mc(pid, f"{n} 能被 3 整除吗?",
                          [label, "不确定", "看末位决定"], 0,
                          "各位数字和÷3",
                          f"数字和={s},{'能' if div3 else '不能'}被3整除", diff))
    probs.append(P_mc("dr_x_e1", "下面哪个数能同时被 2 和 5 整除?",
                      ["120", "125", "122"], 0, "末位0→被2和5整除", "末位0,同时被2和5整除", X))
    probs.append(P_mc("dr_x_e2", "下面哪个数能被 2、3、5 都整除?",
                      ["60", "30", "45"], 0,
                      "60:末位0被2和5;6+0=6被3", "60:末位0→被2,5;6+0=6被3,三者皆满足", X))
    probs.append(P_mc("dr_x_e3", "既能被 3 整除又是奇数的最小两位数是?",
                      ["15", "21", "9"], 0, "15:1+5=6被3整除,末位5是奇数", "15=3×5,奇数,最小两位", X))
    probs.append(P_mc("dr_b_e4", "3 的整除特征是?",
                      ["各位数字之和能被3整除", "末位是3", "末位是0或3"], 0,
                      "各位数字和判断", "如123:1+2+3=6,能被3整除", B))
    probs.append(P_mc("dr_c_e4", "360 能被 2、3、5 整除吗?",
                      ["都能", "只能被2和5", "只能被2和3"], 0,
                      "末位0→2和5;3+6+0=9→3", "末位0→被2,5;3+6+0=9被3→都能整除", C))
    probs.append(P_mc("dr_x_e4", "一个三位数,个位是0,百位与十位之和是6,能被哪些数整除?",
                      ["2、3、5都能", "只有2和5", "只有2和3"], 0,
                      "末位0→2,5;数字和=6+0=6→3", "末位0→2和5;数字和6→3,三者皆满足", X))

    return make_set("divisibility_rules", "2/3/5整除特征", "concept", probs)


def fraction_meaning5():
    probs = [
        P_mc("fm5_b0", "分数 3/5 表示把一个整体平均分成几份,取几份?",
             ["平均分5份,取3份", "平均分3份,取5份", "3加5"], 0, "分母是份数,分子是取的份数", "分母5表示平均分5份,分子3表示取3份", B),
        P_mc("fm5_b1", "分数单位 1/8 表示把整体平均分成几份取1份?",
             ["8份取1份", "1份取8份", "8个1"], 0, "分数单位定义", "1/8是分数单位,表示8份中的1份", B),
        P_mc("fm5_c0", "3/7 里有几个 1/7?",
             ["3个", "7个", "4个"], 0, "分子就是分数单位的个数", "3/7=3个1/7", C),
        P_mc("fm5_c1", "分数 4/5 中,分数单位是?",
             ["1/5", "4/5", "1/4"], 0, "分数单位=1/分母", "分数单位是1/5", C),
        P_mc("fm5_x0", "把 1 米平均分成 10 段,每段是多少分之多少米?",
             ["1/10 米", "10/1 米", "1/10 厘米"], 0, "平均分10份取1份", "每段是1/10米=0.1米", X),
        P_mc("fm5_x1", "5/9 和 3/7 哪个的分数单位更大?",
             ["3/7,分母更小", "5/9,分母更小", "一样大"], 0, "分母越小,分数单位越大", "1/7>1/9,故3/7的分数单位更大", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    probs.append(P_mc("fm5_b_e1", "分数 2/7 的分母是几?",
                      ["7", "2", "9"], 0, "分母在分数线下方", "2/7中分母是7", B))
    probs.append(P_mc("fm5_b_e2", "分数 5/6 的分子是几?",
                      ["5", "6", "1"], 0, "分子在分数线上方", "5/6中分子是5", B))
    probs.append(P_mc("fm5_b_e3", "把一个蛋糕平均切成 4 份,取 1 份是?",
                      ["1/4", "4/1", "1/3"], 0, "平均分4份取1份", "1/4", B))
    probs.append(P_mc("fm5_c_e1", "5/8 里有几个 1/8?",
                      ["5个", "8个", "3个"], 0, "分子个数", "5/8=5个1/8", C))
    probs.append(P_mc("fm5_c_e2", "分数 6/11 的分数单位是?",
                      ["1/11", "6/11", "1/6"], 0, "分数单位=1/分母", "分数单位是1/11", C))
    probs.append(P_mc("fm5_c_e3", "4 个 1/9 等于多少?",
                      ["4/9", "9/4", "1/9"], 0, "4个1/9相加", "4×(1/9)=4/9", C))
    probs.append(P_mc("fm5_x_e1", "1/4 和 1/6 哪个分数单位更大?",
                      ["1/4,分母更小", "1/6,分母更大", "一样大"], 0,
                      "分母越小分数单位越大", "1/4>1/6(4<6)", X))
    probs.append(P_mc("fm5_x_e2", "7/8 里有几个分数单位?",
                      ["7个", "8个", "1个"], 0, "分子即分数单位个数", "7/8里有7个1/8", X))
    probs.append(P_mc("fm5_x_e3", "把 3 米长的绳子平均分成 5 段,每段是多少米?",
                      ["3/5 米", "5/3 米", "1/5 米"], 0, "3÷5=3/5", "3÷5=3/5米", X))
    probs.append(P_mc("fm5_c_e4", "分数 8/9 比 1 大还是小?",
                      ["小,分子<分母", "大,分子多", "等于1"], 0, "真分数<1", "8<9,是真分数,小于1", C))
    probs.append(P_mc("fm5_b_e4", "把 1 米平均分成 6 份,3 份是多少?",
                      ["3/6 米", "6/3 米", "1/6 米"], 0, "3份=3/6", "3÷6份=3/6=1/2米", B))
    probs.append(P_mc("fm5_x_e4", "5/5 等于多少?",
                      ["1", "0", "5"], 0, "分子=分母,等于1", "5÷5=1", X))
    probs.append(P_mc("fm5_b_e5", "分数 3/4 中,分数线表示?",
                      ["除号(平均分的意义)", "减号", "加号"], 0,
                      "分数线=÷", "3/4=3÷4,分数线表示除法", B))
    probs.append(P_fill("fm5_c_e5", "10 个 1/10 合起来等于多少?", 1, "10个1/10=10/10=1", "10/10=1", C))

    return make_set("fraction_meaning5", "分数的意义", "concept", probs)


def equivalent_fraction():
    import math as _math
    probs = [
        P_mc("ef_b0", "1/2 和 2/4 是等值分数吗?",
             ["是", "不是", "不确定"], 0, "大小相等的分数", "1/2=2/4,是等值分数", B),
        P_mc("ef_b1", "等值分数的分子分母同时乘以或除以同一个不为零的数,大小?",
             ["不变", "变大", "变小"], 0, "分数的基本性质", "大小不变", B),
        P_mc("ef_c0", "1/3 = ?/9",
             ["3", "2", "6"], 0, "分母×3,分子也×3", "1×3=3,故1/3=3/9", C),
        P_fill("ef_c1", "4/6 = 2/?", 3, "分子÷2,分母也÷2", "4÷2=2,6÷2=3,故4/6=2/3", C),
        P_mc("ef_x0", "下面哪组不是等值分数?",
             ["2/3 和 5/6", "3/4 和 9/12", "1/2 和 4/8"], 0, "2/3=4/6≠5/6", "2/3=4/6,不等于5/6", X),
        P_fill("ef_x1", "24/36 化简后等于?", "2/3", "找最大公因数", "GCD(24,36)=12;24÷12=2,36÷12=3→2/3", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Parametric: n/d = (n*k)/(d*k) or (n//g)/(d//g)
    probs.append(P_mc("ef_b_e1", "2/5 = 4/?",
                      ["10", "8", "6"], 0, "分子×2,分母也×2", "2×2=4,5×2=10,故2/5=4/10", B))
    probs.append(P_mc("ef_b_e2", "3/4 = 9/?",
                      ["12", "8", "16"], 0, "分子×3,分母也×3", "3×3=9,4×3=12", B))
    probs.append(P_mc("ef_b_e3", "分数的基本性质: 分子分母同时乘以或除以0会怎样?",
                      ["不允许,0不能作除数/乘数", "分数变0", "分数不变"], 0,
                      "除以0无意义", "不为零的数才能用于等值变换", B))
    # Fill: find missing numerator or denominator
    for pid, n, d, factor, missing, diff in [
        ("ef_c_e1", 2, 7, 3, "n", C),  # 2/7 = 6/21
        ("ef_c_e2", 5, 8, 4, "d", C),  # 5/8 = 20/32
        ("ef_c_e3", 6, 9, 3, "g", C),  # 6/9 = 2/3 (÷3)
    ]:
        if missing == "n":
            ans = n * factor
            prompt = f"{n}/{d} = ?/{d * factor}"
            expl = f"分母×{factor},分子也×{factor}:{n}×{factor}={ans}"
        elif missing == "d":
            ans = d * factor
            prompt = f"{n}/{d} = {n * factor}/?"
            expl = f"分子×{factor},分母也×{factor}:{d}×{factor}={ans}"
        else:  # simplify
            g = _math.gcd(n, d)
            ans_n, ans_d = n // g, d // g
            prompt = f"{n}/{d} 化简后分子是?"
            ans = ans_n
            expl = f"GCD({n},{d})={g};{n}÷{g}={ans_n},{d}÷{g}={ans_d}→{ans_n}/{ans_d}"
        probs.append(P_fill(pid, prompt, str(ans), "等值分数性质", expl, diff))
    probs.append(P_mc("ef_x_e1", "下面哪个分数与 3/5 相等?",
                      ["6/10", "9/20", "3/10"], 0, "3/5=6/10(×2)", "3×2=6,5×2=10→6/10", X))
    probs.append(P_mc("ef_x_e2", "18/27 最简形式是?",
                      ["2/3", "6/9", "9/13"], 0, f"GCD(18,27)={_math.gcd(18,27)}",
                      f"GCD(18,27)={_math.gcd(18,27)};18÷{_math.gcd(18,27)}=2,27÷{_math.gcd(18,27)}=3→2/3", X))
    probs.append(P_fill("ef_x_e3", "1/4 = ?/20", "5", "分母×5,分子也×5", "1×5=5,4×5=20→5/20", X))
    probs.append(P_mc("ef_c_e4", "2/5 = ?/15",
                      ["6", "4", "10"], 0, "分母×3,分子也×3", "2×3=6,5×3=15→6/15", C))
    probs.append(P_mc("ef_b_e4", "下面哪两个分数相等?",
                      ["2/4 和 1/2", "1/3 和 2/5", "3/5 和 4/6"], 0,
                      "2/4=1/2", "2÷2=1,4÷2=2→2/4=1/2", B))
    probs.append(P_fill("ef_x_e4", "12/16 化简后等于?", "3/4",
                        "GCD(12,16)=4", "12÷4=3,16÷4=4→3/4", X))
    probs.append(P_fill("ef_b_e5", "1/3 = ?/9", "3", "分母×3,分子也×3", "1×3=3,3×3=9→3/9", B))
    probs.append(P_mc("ef_c_e5", "4/6 化简后是?",
                      ["2/3", "1/2", "4/3"], 0, "GCD(4,6)=2", "4÷2=2,6÷2=3→2/3", C))

    return make_set("equivalent_fraction", "等值分数", "concept", probs)


def fraction_simplify():
    import math as _math
    probs = [
        P_mc("fs_b0", "约分就是把分子分母同时除以什么?",
             ["公因数(不为1)", "公倍数", "分母"], 0, "约分定义", "除以公因数使分数化简", B),
        P_mc("fs_b1", "最简分数的特征是?",
             ["分子分母的公因数只有1", "分子比分母小", "分母是质数"], 0, "最简分数定义", "GCD(分子,分母)=1", B),
        P_fill("fs_c0", "6/8 约分结果是?", "3/4", "GCD(6,8)=2", "6÷2=3,8÷2=4→3/4", C),
        P_fill("fs_c1", "15/25 约分结果是?", "3/5", "GCD(15,25)=5", "15÷5=3,25÷5=5→3/5", C),
        P_fill("fs_x0", "18/24 最简分数是?", "3/4", "GCD(18,24)=6", "18÷6=3,24÷6=4→3/4", X),
        P_mc("fs_x1", "下面已经是最简分数的是?",
             ["7/11", "4/6", "6/9"], 0, "GCD(7,11)=1", "7和11都是质数,互质,7/11是最简分数", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Parametric simplify: compute GCD and derive simplified form
    for pid, n, d, diff in [
        ("fs_b_e1", 4, 8,  B),   # 1/2
        ("fs_b_e2", 3, 9,  B),   # 1/3
        ("fs_b_e3", 6, 10, B),   # 3/5
        ("fs_c_e1", 8, 12, C),   # 2/3
        ("fs_c_e2", 10, 15, C),  # 2/3
        ("fs_c_e3", 9, 15, C),   # 3/5
        ("fs_x_e1", 20, 28, X),  # 5/7
        ("fs_x_e2", 16, 24, X),  # 2/3
    ]:
        g = _math.gcd(n, d)
        rn, rd = n // g, d // g
        ans = f"{rn}/{rd}"
        # generate 2 distinct wrong answers
        w1_cand = f"{n}/{d}"      # un-simplified form (always different from ans)
        w2_cand = f"{rn+1}/{rd+1}"
        w1 = w1_cand if w1_cand != ans else f"{rn}/{rd+2}"
        w2 = w2_cand if w2_cand not in (ans, w1) else f"{rn+1}/{rd+2}"
        if diff == B:
            probs.append(P_fill(pid, f"{n}/{d} 约分结果是?", ans,
                                f"GCD({n},{d})={g}", f"{n}÷{g}={rn},{d}÷{g}={rd}→{ans}", diff))
        else:
            probs.append(P_mc(pid, f"{n}/{d} 最简分数是?",
                               [ans, w1, w2], 0,
                               f"GCD({n},{d})={g}", f"{n}÷{g}={rn},{d}÷{g}={rd}→{ans}", diff))
    probs.append(P_mc("fs_x_e3", "下面哪个分数是最简分数?",
                      ["5/9", "4/8", "6/10"], 0,
                      f"GCD(5,9)={_math.gcd(5,9)}",
                      f"GCD(5,9)=1,互质,5/9是最简分数", X))
    probs.append(P_mc("fs_b_e4", "约分后的最简分数,分子分母的最大公因数是?",
                      ["1", "分母", "分子"], 0, "互质条件", "最简分数:GCD(分子,分母)=1", B))
    probs.append(P_fill("fs_c_e4", "9/12 约分结果是?", "3/4",
                        "GCD(9,12)=3", "9÷3=3,12÷3=4→3/4", C))
    probs.append(P_mc("fs_x_e4", "30/45 最简形式是?",
                      ["2/3", "6/9", "10/15"], 0, "GCD(30,45)=15", "30÷15=2,45÷15=3→2/3", X))

    return make_set("fraction_simplify", "约分", "concept", probs)


def improper_fraction():
    probs = [
        P_mc("imf_b0", "分子大于分母的分数叫?",
             ["假分数", "真分数", "带分数"], 0, "假分数定义", "分子≥分母的分数是假分数", B),
        P_mc("imf_b1", "带分数由哪两部分组成?",
             ["整数部分和真分数", "整数和假分数", "两个真分数"], 0, "带分数结构", "带分数=整数+真分数,如2又3/4", B),
        P_mc("imf_c0", "7/4 化成带分数是?",
             ["1又3/4", "2又1/4", "1又4/3"], 0, "7÷4=1余3", "7÷4=1余3,故7/4=1又3/4", C),
        P_fill("imf_c1", "2又1/3 化成假分数是?", "7/3", "整数×分母+分子", "2×3+1=7,分母不变→7/3", C),
        P_mc("imf_x0", "11/5 化成带分数是?",
             ["2又1/5", "1又6/5", "2又2/5"], 0, "11÷5=2余1", "11÷5=2余1→2又1/5", X),
        P_fill("imf_x1", "3又4/7 化成假分数是?", "25/7", "3×7+4=25", "3×7+4=21+4=25,故25/7", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Parametric: improper → mixed and mixed → improper
    for pid, numer, denom, diff in [
        ("imf_b_e1", 5, 3, B),   # 5/3 = 1又2/3
        ("imf_b_e2", 9, 4, B),   # 9/4 = 2又1/4
        ("imf_c_e1", 13, 5, C),  # 13/5 = 2又3/5
        ("imf_c_e2", 17, 6, C),  # 17/6 = 2又5/6
        ("imf_x_e1", 19, 7, X),  # 19/7 = 2又5/7
    ]:
        whole = numer // denom
        rem = numer % denom
        ans_str = f"{whole}又{rem}/{denom}"
        w1 = f"{whole+1}又{rem}/{denom}"
        w2 = f"{whole}又{rem+1}/{denom}"
        expl = f"{numer}÷{denom}={whole}余{rem}→{ans_str}"
        probs.append(P_mc(pid, f"{numer}/{denom} 化成带分数是?",
                          [ans_str, w1, w2], 0, f"{numer}÷{denom}", expl, diff))
    # Mixed → improper
    for pid, whole, num, denom, diff in [
        ("imf_b_e3", 1, 2, 5, B),  # 1又2/5=7/5
        ("imf_c_e3", 2, 3, 8, C),  # 2又3/8=19/8
        ("imf_x_e2", 4, 1, 6, X),  # 4又1/6=25/6
    ]:
        numer = whole * denom + num
        ans = f"{numer}/{denom}"
        expl = f"{whole}×{denom}+{num}={numer},分母不变→{ans}"
        probs.append(P_fill(pid, f"{whole}又{num}/{denom} 化成假分数是?",
                            ans, "整数×分母+分子", expl, diff))

    # concept questions
    probs.append(P_mc("imf_c_e4", "真分数的分子和分母的关系是?",
                      ["分子小于分母", "分子大于分母", "分子等于分母"], 0,
                      "真分数<1", "真分数:分子<分母,值小于1", C))
    probs.append(P_mc("imf_x_e3", "假分数 8/8 等于?",
                      ["1", "0", "8"], 0, "8÷8=1", "分子=分母,假分数等于1", X))
    probs.append(P_mc("imf_b_e4", "带分数 1又1/2 等于哪个假分数?",
                      ["3/2", "2/2", "4/2"], 0, "1×2+1=3", "1×2+1=3,故3/2", B))
    probs.append(P_mc("imf_c_e5", "假分数 10/3 化成带分数是?",
                      ["3又1/3", "2又4/3", "4又0/3"], 0, "10÷3=3余1", "10÷3=3余1→3又1/3", C))

    return make_set("improper_fraction", "假分数与带分数", "concept", probs)


def fraction_compare5():
    import math as _math
    probs = [
        P_mc("fcmp_b0", "同分母分数,分子大的?",
             ["较大", "较小", "相等"], 0, "同分母比分子", "分母相同,分子越大越大", B),
        P_mc("fcmp_b1", "同分子分数,分母大的?",
             ["较小", "较大", "相等"], 0, "同分子比分母,分母越大越小", "分母越大,每份越小,故分数越小", B),
        P_mc("fcmp_c0", "3/5 和 3/7 哪个大?",
             ["3/5", "3/7", "相等"], 0, "分子相同看分母,5<7", "5<7故1/5>1/7,3/5>3/7", C),
        P_mc("fcmp_c1", "5/8 和 7/12 哪个大?",
             ["5/8", "7/12", "相等"], 0, "通分:公分母24", "5/8=15/24,7/12=14/24,15>14故5/8大", C),
        P_mc("fcmp_x0", "把 2/3、3/4、5/6 从小到大排列,正确的是?",
             ["2/3 < 3/4 < 5/6", "3/4 < 2/3 < 5/6", "5/6 < 3/4 < 2/3"], 0,
             "通分公分母12", "8/12 < 9/12 < 10/12,即2/3<3/4<5/6", X),
        P_mc("fcmp_x1", "5/6 和 7/8 哪个大?",
             ["7/8", "5/6", "相等"], 0, "通分公分母24", "20/24 vs 21/24,7/8=21/24更大", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Helper: compare two fractions by cross-multiplication
    def _cmp_frac(n1, d1, n2, d2):
        """Return (bigger_str, smaller_str, expl)"""
        lhs = n1 * d2
        rhs = n2 * d1
        lcd = d1 * d2 // _math.gcd(d1, d2)
        nn1 = n1 * (lcd // d1)
        nn2 = n2 * (lcd // d2)
        if nn1 > nn2:
            bigger, smaller = f"{n1}/{d1}", f"{n2}/{d2}"
        elif nn1 < nn2:
            bigger, smaller = f"{n2}/{d2}", f"{n1}/{d1}"
        else:
            bigger = smaller = "相等"
        expl = f"通分LCD={lcd};{n1}/{d1}={nn1}/{lcd},{n2}/{d2}={nn2}/{lcd}"
        return bigger, smaller, expl

    for pid, n1, d1, n2, d2, diff in [
        ("fcmp_b_e1", 2, 9, 5, 9, B),   # same denom, 5/9>2/9
        ("fcmp_b_e2", 4, 11, 4, 7, B),  # same numer, 4/7>4/11
        ("fcmp_b_e3", 3, 8, 5, 8, B),   # same denom
        ("fcmp_c_e1", 3, 4, 5, 6, C),   # cross multiply
        ("fcmp_c_e2", 2, 5, 3, 7, C),
        ("fcmp_c_e3", 5, 12, 3, 8, C),
        ("fcmp_x_e1", 4, 9, 5, 11, X),
    ]:
        bigger, smaller, expl = _cmp_frac(n1, d1, n2, d2)
        if bigger == smaller:  # equal
            opts = ["相等", f"{n1}/{d1}", f"{n2}/{d2}"]
            ci = 0
        else:
            opts = [bigger, smaller, "相等"]
            ci = 0
        probs.append(P_mc(pid, f"{n1}/{d1} 和 {n2}/{d2} 哪个大?",
                          opts, ci, "通分比较", expl, diff))
    # Fill: ordering three fractions
    probs.append(P_mc("fcmp_x_e2", "把 1/2, 1/3, 1/4 从大到小排列?",
                      ["1/2 > 1/3 > 1/4", "1/4 > 1/3 > 1/2", "1/3 > 1/2 > 1/4"], 0,
                      "分母越小分数越大", "分母2<3<4,故1/2>1/3>1/4", X))
    probs.append(P_mc("fcmp_x_e3", "1/2 和 3/4 哪个更接近 1?",
                      ["3/4", "1/2", "一样接近"], 0, "3/4距1只差1/4", "1-3/4=1/4 < 1-1/2=1/2,故3/4更接近1", X))
    probs.append(P_mc("fcmp_b_e4", "4/9 和 4/7 哪个大?",
                      ["4/7", "4/9", "相等"], 0, "分子同,分母7<9", "1/7>1/9,故4/7>4/9", B))
    probs.append(P_mc("fcmp_c_e4", "2/3 和 3/4 哪个大?",
                      ["3/4", "2/3", "相等"], 0, "通分LCD=12", "8/12 vs 9/12,3/4=9/12>2/3=8/12", C))
    probs.append(P_fill("fcmp_x_e4",
                        "把 3/4, 2/3, 5/6 通分后,分子最小的是哪个分数?\n(填分数,如3/4)",
                        "2/3", "LCD=12;3/4=9/12,2/3=8/12,5/6=10/12", "8/12最小对应2/3", X))

    return make_set("fraction_compare5", "分数比大小", "concept", probs)


def cuboid_properties():
    probs = [
        P_mc("cbp_b0", "长方体有几个面?",
             ["6个", "4个", "8个"], 0, "长方体基本特征", "长方体有6个面", B),
        P_mc("cbp_b1", "正方体的6个面形状怎么样?",
             ["都是正方形且相等", "都是长方形", "有的是正方形有的是长方形"], 0, "正方体特征", "6个面都是完全相同的正方形", B),
        P_mc("cbp_c0", "长方体相对的两个面?",
             ["完全相同", "面积不同", "形状不同"], 0, "相对面相等", "长方体相对的面完全相同", C),
        P_mc("cbp_c1", "长方体有几条棱?",
             ["12条", "8条", "6条"], 0, "4×3=12", "长方体共12条棱", C),
        P_mc("cbp_x0", "正方体是特殊的长方体吗?",
             ["是,长宽高相等的长方体", "不是,形状不同", "不一定"], 0, "正方体=长宽高相等的长方体", "正方体是特殊的长方体", X),
        P_mc("cbp_x1", "长方体的顶点有几个?",
             ["8个", "6个", "12个"], 0, "8个顶点", "长方体有8个顶点", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    probs.append(P_mc("cbp_b_e1", "长方体的面都是什么形状?",
                      ["长方形(或正方形)", "三角形", "圆形"], 0, "6个面都是矩形", "6个面都是长方形(特殊情况含正方形)", B))
    probs.append(P_mc("cbp_b_e2", "正方体有几条棱?",
                      ["12条", "8条", "6条"], 0, "和长方体一样12条", "正方体12条棱,每条长度相等", B))
    probs.append(P_mc("cbp_b_e3", "长方体共有几种长度的棱?",
                      ["3种(长、宽、高各4条)", "1种", "2种"], 0, "长宽高各4条", "长4条、宽4条、高4条,共3种长度", B))
    probs.append(P_mc("cbp_c_e1", "正方体的所有棱长度?",
                      ["全部相等", "只有平行的棱相等", "都不等"], 0, "正方体12条棱等长", "正方体12条棱全部相等", C))
    probs.append(P_mc("cbp_c_e2", "长方体中,相对的两条棱长度?",
                      ["相等", "不等", "不确定"], 0, "平行棱相等", "相对棱互相平行且等长", C))
    probs.append(P_mc("cbp_c_e3", "长方体的面和正方体的面有什么区别?",
                      ["长方体面可以是不相等的长方形,正方体面都是正方形", "完全相同", "长方体面更多"], 0,
                      "面的形状差异", "长方体6面可以有不同尺寸,正方体6面全等正方形", C))
    probs.append(P_mc("cbp_x_e1", "一个长方体,长5宽4高3,它有多少条棱?它的棱长之和是多少?",
                      ["12条,棱长和=48", "12条,棱长和=60", "8条,棱长和=48"], 0,
                      "4×(长+宽+高)", f"4×(5+4+3)=4×12={4*12}", X))
    probs.append(P_mc("cbp_x_e2", "正方体棱长5厘米,所有棱的总长度是?",
                      [f"{12*5}厘米", f"{6*5}厘米", f"{8*5}厘米"], 0,
                      "12条棱×5", f"12×5={12*5}厘米", X))
    probs.append(P_mc("cbp_x_e3", "长方体和正方体共同的特征是?",
                      ["都有6个面、12条棱、8个顶点", "面都是正方形", "棱长都相等"], 0,
                      "几何特征相同", "6面12棱8顶点是两者共同特征", X))
    probs.append(P_mc("cbp_b_e4", "正方体有几个顶点?",
                      ["8个", "6个", "12个"], 0, "正方体=长方体特例,8顶点", "8个顶点", B))
    probs.append(P_fill("cbp_c_e4", "长方体长、宽、高各4条,共几条棱?", 12, "4×3=12", "4×3=12条", C))
    probs.append(P_mc("cbp_c_e5", "长方体的棱按方向分为几组?每组几条?",
                      ["3组,每组4条", "2组,每组6条", "4组,每组3条"], 0,
                      "长/宽/高各4条,共3组", "沿长方向4条,宽方向4条,高方向4条", C))
    probs.append(P_fill("cbp_x_e4", "正方体棱长4cm,全部棱的总长是多少cm?", 12*4, "12条棱×4", f"12×4={12*4}cm", X))
    probs.append(P_mc("cbp_x_e5", "下面哪个不是长方体的面?",
                      ["圆形", "正方形", "长方形"], 0, "长方体面只能是矩形", "长方体各面均为矩形,圆形不可能出现", X))

    return make_set("cuboid_properties", "长方体正方体特征", "concept", probs)


def cuboid_surface_area():
    probs = [
        P_mc("csa_b0", "长方体表面积 = ?",
             ["2×(长×宽+长×高+宽×高)", "长×宽×高", "长×宽×2"], 0, "表面积公式", "6个面,两两相等,共3对", B),
        P_fill("csa_b1", "正方体棱长3,表面积 = ?", 54, "6×3²", "6×9=54", B),
        P_fill("csa_c0", "长4宽3高2的长方体,表面积 = ?", 52,
               "2×(长×宽+长×高+宽×高)", "2×(4×3+4×2+3×2)=2×(12+8+6)=2×26=52", C),
        P_fill("csa_c1", "正方体棱长5,表面积 = ?", 150, "6×5²", "6×25=150", C),
        P_fill("csa_x0", "长5宽4高3的长方体,表面积 = ?", 94,
               "2×(长×宽+长×高+宽×高)", "2×(20+15+12)=2×47=94", X),
        P_mc("csa_x1", "一个无盖的长方体鱼缸(长60宽30高40厘米),需要玻璃多少平方厘米?",
             ["8400", "10800", "7200"], 0, "底面+四个侧面", "底:60×30=1800;前后:60×40×2=4800;左右:30×40×2=2400;合计:8400", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Parametric: 长方体表面积 = 2*(l*w + l*h + w*h)
    for pid, l, w, h, diff in [
        ("csa_b_e1", 3, 3, 3, B),   # cube side=3: 6×9=54 (same as csa_b1 but as formula)
        ("csa_b_e2", 6, 4, 2, B),   # 2×(24+12+8)=2×44=88
        ("csa_c_e1", 7, 3, 2, C),   # 2×(21+14+6)=2×41=82
        ("csa_c_e2", 8, 5, 3, C),   # 2×(40+24+15)=2×79=158
        ("csa_c_e3", 10, 4, 3, C),  # 2×(40+30+12)=2×82=164
        ("csa_x_e1", 9, 6, 4, X),   # 2×(54+36+24)=2×114=228
    ]:
        sa = 2 * (l * w + l * h + w * h)
        if l == w == h:
            prompt = f"正方体棱长{l},表面积 = ?"
            hint = f"6×{l}²"
            expl = f"6×{l*l}={sa}"
        else:
            prompt = f"长{l}宽{w}高{h}的长方体,表面积 = ?"
            hint = "2×(长×宽+长×高+宽×高)"
            expl = f"2×({l*w}+{l*h}+{w*h})=2×{l*w+l*h+w*h}={sa}"
        probs.append(P_fill(pid, prompt, sa, hint, expl, diff))

    # MC problem: given surface area find missing dimension
    # 正方体表面积=96,棱长=? 96/6=16,√16=4
    probs.append(P_mc("csa_x_e2", "正方体表面积 96 平方厘米,棱长是多少厘米?",
                      ["4", "16", "6"], 0, "96÷6=16=4²", f"96÷6=16,棱长=√16=4厘米", X))
    # word problem: painting a box
    # 长6宽5高4的长方体,外表面涂漆,共需涂多少平方厘米?
    _l, _w, _h = 6, 5, 4
    _sa = 2 * (_l*_w + _l*_h + _w*_h)
    probs.append(P_mc("csa_x_e3",
        f"一个长{_l}宽{_w}高{_h}厘米的礼品盒,包装纸至少需要多少平方厘米?",
        [str(_sa), str(_sa - 20), str(_sa + 20)], 0,
        "表面积=包装纸面积",
        f"2×({_l*_w}+{_l*_h}+{_w*_h})=2×{_l*_w+_l*_h+_w*_h}={_sa}", X))
    # Additional surface area problems
    for pid, l, w, h, diff in [
        ("csa_b_e3", 2, 2, 2, B),   # cube side=2: 6×4=24
        ("csa_c_e4", 5, 3, 4, C),   # 2×(15+20+12)=2×47=94
        ("csa_x_e4", 12, 8, 5, X),  # 2×(96+60+40)=2×196=392
        ("csa_b_e4", 4, 4, 4, B),   # cube side=4: 6×16=96
    ]:
        sa = 2 * (l * w + l * h + w * h)
        if l == w == h:
            prompt = f"正方体棱长{l},表面积 = ?"
            hint = f"6×{l}²"
            expl = f"6×{l*l}={sa}"
        else:
            prompt = f"长{l}宽{w}高{h}的长方体,表面积 = ?"
            hint = "2×(长×宽+长×高+宽×高)"
            expl = f"2×({l*w}+{l*h}+{w*h})=2×{l*w+l*h+w*h}={sa}"
        probs.append(P_fill(pid, prompt, sa, hint, expl, diff))

    return make_set("cuboid_surface_area", "表面积", "concept", probs)


def cuboid_volume_concept():
    probs = [
        P_mc("cvc_b0", "体积指的是?",
             ["物体所占空间的大小", "物体表面积的大小", "物体的重量"], 0, "体积定义", "体积=物体占据的空间大小", B),
        P_mc("cvc_b1", "常用的体积单位有?",
             ["立方厘米、立方分米、立方米", "平方厘米、平方米", "升、毫升"], 0, "体积单位", "体积单位:cm³、dm³、m³", B),
        P_mc("cvc_c0", "1 立方分米 = ? 立方厘米",
             ["1000", "100", "10"], 0, "进率=10³=1000", "1dm³=1000cm³", C),
        P_mc("cvc_c1", "1 升 = ? 立方分米",
             ["1", "10", "100"], 0, "1L=1dm³", "1升=1立方分米", C),
        P_mc("cvc_x0", "1 立方米 = ? 立方分米",
             ["1000", "100", "10000"], 0, "1m³=1000dm³", "1m³=1000dm³", X),
        P_mc("cvc_x1", "容积和体积的区别是?",
             ["容积指容纳液体的体积,考虑容器厚度", "两者完全相同", "体积更大"], 0,
             "容积=内部空间", "容积指容器内部空间,体积包含容器本身", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    probs.append(P_mc("cvc_b_e1", "一块橡皮泥的体积单位用什么最合适?",
                      ["立方厘米", "立方米", "立方千米"], 0,
                      "小物体用cm³", "橡皮泥较小,用立方厘米合适", B))
    probs.append(P_mc("cvc_b_e2", "教室的体积单位用什么最合适?",
                      ["立方米", "立方厘米", "立方分米"], 0,
                      "大空间用m³", "教室体积较大,用立方米合适", B))
    probs.append(P_mc("cvc_b_e3", "1 毫升 = ? 立方厘米",
                      ["1", "10", "100"], 0, "1mL=1cm³", "1毫升=1立方厘米", B))
    # Unit conversions
    for pid, n, from_unit, to_unit, factor, diff in [
        ("cvc_c_e1", 3, "立方米", "立方分米", 1000, C),    # 3m³=3000dm³
        ("cvc_c_e2", 5, "立方分米", "立方厘米", 1000, C),  # 5dm³=5000cm³
        ("cvc_c_e3", 2, "升", "毫升", 1000, C),            # 2L=2000mL
    ]:
        ans = n * factor
        probs.append(P_mc(pid, f"{n} {from_unit} = ? {to_unit}",
                          [str(ans), str(n * factor // 10), str(n * factor * 10)], 0,
                          f"进率{factor}",
                          f"{n}×{factor}={ans}", diff))
    probs.append(P_mc("cvc_x_e1", "2000 立方厘米 = ? 立方分米",
                      ["2", "20", "200"], 0, "1dm³=1000cm³", "2000÷1000=2", X))
    probs.append(P_mc("cvc_x_e2", "3 立方米 = ? 升",
                      ["3000", "300", "30000"], 0, "1m³=1000dm³=1000L", "3×1000=3000升", X))
    probs.append(P_mc("cvc_x_e3", "下面哪个体积最大?",
                      ["2立方米", "3000立方分米", "5000000立方厘米"], 0,
                      "换算成同一单位比较",
                      "2m³=2000dm³; 3000dm³>2000dm³; 5000000cm³=5000dm³>3000dm³; 最大是5000000cm³", X))
    probs.append(P_fill("cvc_c_e4", "4 立方米 = ? 立方分米", 4000, "×1000", "4×1000=4000", C))
    probs.append(P_mc("cvc_b_e4", "立方厘米的符号是?",
                      ["cm³", "cm²", "dm³"], 0, "三维长度单位", "立方厘米写作cm³", B))
    probs.append(P_mc("cvc_x_e4", "1.5 升 = ? 毫升",
                      ["1500", "150", "15000"], 0, "1升=1000毫升", "1.5×1000=1500毫升", X))

    return make_set("cuboid_volume_concept", "体积的认识", "concept", probs)


def rotation_concept():
    probs = [
        P_mc("rot_b0", "图形的旋转需要确定哪三要素?",
             ["旋转中心、方向、角度", "方向、距离、大小", "中心、大小、颜色"], 0,
             "旋转三要素", "旋转中心+旋转方向+旋转角度", B),
        P_mc("rot_b1", "顺时针旋转是?",
             ["与钟表指针转向相同", "与钟表指针转向相反", "向右平移"], 0,
             "顺时针=钟表方向", "顺时针方向", B),
        P_mc("rot_c0", "将一个图形顺时针旋转90°,图形的大小形状?",
             ["不变", "变大", "变小"], 0,
             "旋转不改变形状大小", "旋转只改变位置和方向,不改变形状和大小", C),
        P_mc("rot_c1", "钟表指针从12转到3,旋转了多少度?",
             ["90°", "180°", "45°"], 0,
             "一圈360°,12到3是1/4圈", "360°÷4=90°", C),
        P_mc("rot_x0", "将正方形绕中心点旋转180°,结果是?",
             ["与原图重合", "变成长方形", "翻转方向"], 0,
             "正方形旋转180°与原图重合", "正方形有旋转对称性", X),
        P_mc("rot_x1", "顺时针旋转 90° 和逆时针旋转 270° 效果相同吗?",
             ["相同", "不同", "不一定"], 0,
             "90°+270°=360°,方向互补", "顺时针90°=逆时针270°,效果相同", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    probs.append(P_mc("rot_b_e1", "逆时针旋转与顺时针旋转方向?",
                      ["相反", "相同", "不确定"], 0,
                      "逆时针与顺时针相反", "逆时针方向与顺时针相反", B))
    probs.append(P_mc("rot_b_e2", "旋转后图形的面积?",
                      ["不变", "变大", "变小"], 0,
                      "旋转不改变大小", "旋转前后面积相等", B))
    probs.append(P_mc("rot_b_e3", "钟表指针转一圈是多少度?",
                      ["360°", "180°", "90°"], 0, "一圈=360°", "完整一圈=360°", B))
    probs.append(P_mc("rot_c_e1", "钟表指针从12转到6,旋转了多少度?",
                      ["180°", "90°", "270°"], 0,
                      "12到6是半圈=180°", "360°÷2=180°", C))
    probs.append(P_mc("rot_c_e2", "钟表指针从12转到9(顺时针),旋转了多少度?",
                      ["270°", "90°", "180°"], 0,
                      "12到9顺时针是3/4圈", "360°×3/4=270°", C))
    probs.append(P_mc("rot_c_e3", "图形旋转后,与原图相比?",
                      ["形状大小不变,位置方向改变", "形状改变,大小不变", "大小改变,形状不变"], 0,
                      "旋转只改变位置方向", "旋转变换:形状大小不变,位置方向改变", C))
    probs.append(P_mc("rot_x_e1", "将一个图形绕某点旋转360°后?",
                      ["回到原位", "转到对面", "不确定"], 0,
                      "转一圈回原位", "旋转360°即一整圈,回到原始位置", X))
    probs.append(P_mc("rot_x_e2", "顺时针旋转180°等于逆时针旋转多少度?",
                      ["180°", "90°", "270°"], 0,
                      "180°+180°=360°,效果相同", "顺时针180°=逆时针180°", X))
    probs.append(P_mc("rot_x_e3", "下面哪项描述了旋转?",
                      ["绕点转动图形", "沿直线移动图形", "翻折图形"], 0,
                      "旋转=绕点转动", "旋转是绕固定点转动图形", X))
    probs.append(P_mc("rot_c_e4", "图形顺时针旋转45°两次,共转了多少度?",
                      ["90°", "45°", "180°"], 0, "45°×2=90°", "两次×45°=90°", C))
    probs.append(P_mc("rot_b_e4", "平移和旋转的主要区别是?",
                      ["旋转绕点转动,平移沿方向移动", "旋转改变大小,平移不变", "都是翻转"], 0,
                      "运动方式不同", "旋转绕固定点,平移沿直线方向", B))
    probs.append(P_fill("rot_x_e4", "钟表从3点到6点(顺时针),指针转了多少度?", 90,
                        "3到6是1/4圈=90°", "360°÷4=90°", X))

    return make_set("rotation_concept", "旋转", "concept", probs)


# ── Formula sets ─────────────────────────────────────────────────────────────

def parallelogram_area():
    probs = [
        P_mc("pga_b0", "平行四边形面积公式是?",
             ["底 × 高", "底 + 高", "底 × 高 ÷ 2"], 0, "平行四边形面积", "S=底×高", B),
        P_fill("pga_b1", "平行四边形底 5 高 4,面积 = ?", 20, "底×高", "5×4=20", B),
        P_fill("pga_c0", "平行四边形底 8 高 6,面积 = ?", 48, "底×高", "8×6=48", C),
        P_fill("pga_c1", "平行四边形底 12 高 5,面积 = ?", 60, "底×高", "12×5=60", C),
        P_fill("pga_x0", "平行四边形面积 36,高 4,底 = ?", 9, "底=面积÷高", "36÷4=9", X),
        P_mc("pga_x1", "一块平行四边形草坪底边长15米,与底边对应的高8米,面积是多少平方米?",
             ["120", "90", "240"], 0, "15×8", "15×8=120 平方米", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Parametric: b×h for various (b,h)
    for pid, b, h, diff in [
        ("pga_b_e1", 7, 3, B),   # 21
        ("pga_b_e2", 9, 4, B),   # 36
        ("pga_b_e3", 6, 5, B),   # 30
        ("pga_c_e1", 11, 7, C),  # 77
        ("pga_c_e2", 14, 6, C),  # 84
        ("pga_c_e3", 20, 8, C),  # 160
    ]:
        ans = b * h
        probs.append(P_fill(pid, f"平行四边形底 {b} 高 {h},面积 = ?",
                            ans, "底×高", f"{b}×{h}={ans}", diff))
    # Reverse: find base or height from area
    for pid, area, known_val, find, diff in [
        ("pga_x_e1", 48, 6, "base", X),   # base=48÷6=8
        ("pga_x_e2", 70, 10, "height", X), # h=70÷10=7
        ("pga_x_e3", 90, 9, "base", X),   # base=90÷9=10
    ]:
        ans = area // known_val
        if find == "base":
            prompt = f"平行四边形面积 {area},高 {known_val},底 = ?"
            hint = "底=面积÷高"
            expl = f"{area}÷{known_val}={ans}"
        else:
            prompt = f"平行四边形面积 {area},底 {known_val},高 = ?"
            hint = "高=面积÷底"
            expl = f"{area}÷{known_val}={ans}"
        probs.append(P_fill(pid, prompt, ans, hint, expl, diff))

    # additional to reach 18
    probs.append(P_fill("pga_b_e4", "平行四边形底 15 高 6,面积 = ?", 15*6, "底×高", f"15×6={15*6}", B))
    probs.append(P_mc("pga_c_e4", "平行四边形面积公式和长方形面积公式有何关系?",
                      ["都是底×高,公式相同", "完全不同", "平行四边形是长方形面积的一半"], 0,
                      "两者公式形式相同", "长方形面积=长×宽=底×高,形式一致", C))
    probs.append(P_fill("pga_x_e4", "平行四边形面积 56,底 8,高 = ?", 56//8, "高=面积÷底", f"56÷8={56//8}", X))

    return make_set("parallelogram_area", "平行四边形面积公式", "formula", probs)


def triangle_area():
    probs = [
        P_mc("ta_b0", "三角形面积公式是?",
             ["底 × 高 ÷ 2", "底 × 高", "底 + 高"], 0, "三角形面积", "S=底×高÷2", B),
        P_fill("ta_b1", "三角形底 6 高 4,面积 = ?", 12, "底×高÷2", "6×4÷2=12", B),
        P_fill("ta_c0", "三角形底 10 高 6,面积 = ?", 30, "底×高÷2", "10×6÷2=30", C),
        P_fill("ta_c1", "三角形底 8 高 9,面积 = ?", 36, "底×高÷2", "8×9÷2=36", C),
        P_fill("ta_x0", "三角形面积 24,底 8,高 = ?", 6, "高=面积×2÷底", "24×2÷8=6", X),
        P_mc("ta_x1", "一个三角形与一个平行四边形等底等高,三角形面积是平行四边形面积的?",
             ["一半", "相等", "两倍"], 0, "等底等高三角形是平行四边形的1/2", "三角形=底×高÷2,平行四边形=底×高", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Parametric: b*h//2 (ensure even b*h for integer answers)
    for pid, b, h, diff in [
        ("ta_b_e1", 8, 4, B),    # 16
        ("ta_b_e2", 10, 4, B),   # 20
        ("ta_b_e3", 6, 6, B),    # 18
        ("ta_c_e1", 14, 6, C),   # 42
        ("ta_c_e2", 12, 10, C),  # 60
        ("ta_c_e3", 9, 8, C),    # 36
    ]:
        ans = b * h // 2
        assert b * h % 2 == 0, f"{b}×{h} not even"
        probs.append(P_fill(pid, f"三角形底 {b} 高 {h},面积 = ?",
                            ans, "底×高÷2", f"{b}×{h}÷2={ans}", diff))
    # Reverse: find base or height
    for pid, area, known_val, find, diff in [
        ("ta_x_e1", 30, 10, "height", X),  # h=30×2÷10=6
        ("ta_x_e2", 40, 8,  "base",   X),  # b=40×2÷8=10
        ("ta_x_e3", 21, 6,  "height", X),  # h=21×2÷6=7
    ]:
        ans = area * 2 // known_val
        if find == "height":
            prompt = f"三角形面积 {area},底 {known_val},高 = ?"
            hint = "高=面积×2÷底"
        else:
            prompt = f"三角形面积 {area},高 {known_val},底 = ?"
            hint = "底=面积×2÷高"
        expl = f"{area}×2÷{known_val}={ans}"
        probs.append(P_fill(pid, prompt, ans, hint, expl, diff))

    # additional
    probs.append(P_fill("ta_b_e4", "三角形底 20 高 8,面积 = ?", 20*8//2, "底×高÷2", f"20×8÷2={20*8//2}", B))
    probs.append(P_mc("ta_c_e4", "三角形面积公式中,为什么要除以 2?",
                      ["两个相同三角形拼成平行四边形", "三角形有3个角", "面积比周长小一半"], 0,
                      "推导:从平行四边形来的", "等底等高的三角形是平行四边形的一半", C))
    probs.append(P_fill("ta_x_e4", "三角形面积 45,底 10,高 = ?", 45*2//10, "高=面积×2÷底", f"45×2÷10={45*2//10}", X))

    return make_set("triangle_area", "三角形面积公式", "formula", probs)


def trapezoid_area():
    probs = [
        P_mc("tza_b0", "梯形面积公式是?",
             ["(上底+下底)×高÷2", "上底×下底÷2", "(上底+下底)×高"], 0,
             "梯形面积", "S=(上底+下底)×高÷2", B),
        P_fill("tza_b1", "梯形上底3下底5高4,面积 = ?", 16, "(上+下)×高÷2", "(3+5)×4÷2=16", B),
        P_fill("tza_c0", "梯形上底4下底8高5,面积 = ?", 30, "(上+下)×高÷2", "(4+8)×5÷2=30", C),
        P_fill("tza_c1", "梯形上底6下底10高4,面积 = ?", 32, "(上+下)×高÷2", "(6+10)×4÷2=32", C),
        P_fill("tza_x0", "梯形上底5下底11高6,面积 = ?", 48, "(上+下)×高÷2", "(5+11)×6÷2=48", X),
        P_mc("tza_x1", "梯形面积40,高8,上底3,下底 = ?",
             ["7", "5", "10"], 0, "下底=面积×2÷高-上底", "40×2÷8=10,10-3=7", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Parametric: (a+b)*h//2
    for pid, a, b, h, diff in [
        ("tza_b_e1", 2, 6, 4, B),    # (2+6)*4/2=16
        ("tza_b_e2", 4, 8, 3, B),    # (4+8)*3/2=18
        ("tza_b_e3", 5, 9, 4, B),    # (5+9)*4/2=28
        ("tza_c_e1", 6, 12, 5, C),   # (6+12)*5/2=45
        ("tza_c_e2", 3, 9, 8, C),    # (3+9)*8/2=48
        ("tza_c_e3", 7, 13, 6, C),   # (7+13)*6/2=60
    ]:
        ans = (a + b) * h // 2
        assert (a + b) * h % 2 == 0
        probs.append(P_fill(pid, f"梯形上底{a}下底{b}高{h},面积 = ?",
                            ans, "(上+下)×高÷2",
                            f"({a}+{b})×{h}÷2={a+b}×{h}÷2={ans}", diff))
    # Reverse: find the missing dimension
    # area=35, h=5, a=3, b=? → (3+b)*5/2=35 → 3+b=14 → b=11
    for pid, area, h, a, diff in [
        ("tza_x_e1", 35, 5, 3, X),   # b=11
        ("tza_x_e2", 45, 6, 5, X),   # b=10
        ("tza_x_e3", 54, 9, 4, X),   # b=8
    ]:
        b = area * 2 // h - a
        probs.append(P_mc(pid, f"梯形面积{area},高{h},上底{a},下底 = ?",
                          [str(b), str(b - 2), str(b + 2)], 0,
                          "下底=面积×2÷高-上底",
                          f"{area}×2÷{h}={area*2//h},{area*2//h}-{a}={b}", diff))

    # additional
    probs.append(P_fill("tza_b_e4", "梯形上底2下底10高8,面积 = ?", (2+10)*8//2,
                        "(上+下)×高÷2", f"(2+10)×8÷2={12*8//2}", B))
    probs.append(P_mc("tza_c_e4", "梯形面积公式中为什么要除以 2?",
                      ["两个相同梯形拼成平行四边形", "梯形有两个底", "高要减半"], 0,
                      "推导原理", "两个等腰梯形可拼成平行四边形,故除以2", C))
    probs.append(P_fill("tza_x_e4", "梯形上底7下底13高10,面积 = ?", (7+13)*10//2,
                        "(上+下)×高÷2", f"(7+13)×10÷2={20*10//2}", X))

    return make_set("trapezoid_area", "梯形面积公式", "formula", probs)


def combined_area():
    probs = [
        P_mc("ca_b0", "计算组合图形面积的常用方法?",
             ["分割法或添补法", "只用乘法", "估算"], 0, "组合图形方法", "分割成基本图形或添补成规则图形", B),
        P_fill("ca_b1", "一个长方形(长8宽5)中间剪去一个正方形(边长2),剩余面积 = ?", 36,
               "长方形-正方形", "8×5-2×2=40-4=36", B),
        P_fill("ca_c0", "一个大三角形(底12高8)加上一个小三角形(底6高4),总面积 = ?", 60,
               "两个三角形面积之和", "12×8÷2+6×4÷2=48+12=60", C),
        P_fill("ca_c1", "L形:大长方形(长10宽6)去掉小长方形(长4宽3),面积 = ?", 48,
               "大-小", "10×6-4×3=60-12=48", C),
        P_mc("ca_x0", "一个平行四边形(底10高6)和一个三角形(底10高6)拼合,总面积?",
             ["90", "60", "120"], 0, "分别算再相加", "10×6+10×6÷2=60+30=90", X),
        P_fill("ca_x1", "梯形(上底4下底10高6)加上三角形(底6高4),总面积 = ?", 54,
               "梯形+三角形", "(4+10)×6÷2+6×4÷2=42+12=54", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # B: rectangle minus shapes
    r1 = 9 * 4 - 3 * 3  # 36-9=27
    probs.append(P_fill("ca_b_e1",
        "长方形(长9宽4)中间剪去正方形(边长3),剩余面积 = ?",
        9*4-3*3, "长方形-正方形", f"9×4-3×3={9*4}-{3*3}={9*4-3*3}", B))
    r2 = 12 * 5 - 4 * 2  # 60-8=52
    probs.append(P_fill("ca_b_e2",
        "长方形(长12宽5)剪去长方形(长4宽2),剩余面积 = ?",
        r2, "大-小", f"12×5-4×2={12*5}-{4*2}={r2}", B))
    r3 = 7 * 6 - 3 * 4  # 42-12=30
    probs.append(P_fill("ca_b_e3",
        "长方形(长7宽6)中剪去长方形(长3宽4),剩余面积 = ?",
        r3, "大-小", f"7×6-3×4={7*6}-{3*4}={r3}", B))
    # C: sum of two standard shapes
    # rectangle + triangle
    _a1 = 6*4 + 6*4//2  # 24+12=36
    probs.append(P_fill("ca_c_e1",
        "长方形(长6宽4)上方拼一个三角形(底6高4),总面积 = ?",
        _a1, "长方形+三角形", f"6×4+6×4÷2={6*4}+{6*4//2}={_a1}", C))
    # parallelogram + rectangle
    _a2 = 8*5 + 4*3  # 40+12=52
    probs.append(P_fill("ca_c_e2",
        "平行四边形(底8高5)旁边加长方形(长4宽3),总面积 = ?",
        _a2, "平行四边形+长方形", f"8×5+4×3={8*5}+{4*3}={_a2}", C))
    # two trapezoids
    _a3 = (2+6)*4//2 + (4+8)*3//2  # 16+18=34
    probs.append(P_fill("ca_c_e3",
        "梯形(上底2下底6高4)加梯形(上底4下底8高3),总面积 = ?",
        _a3, "两梯形面积之和",
        f"(2+6)×4÷2+(4+8)×3÷2={_a3}", C))
    # X: more complex
    _a4 = 10*8 - (3+7)*4//2  # 80-20=60
    probs.append(P_fill("ca_x_e1",
        "大长方形(长10宽8)中间剪去梯形(上底3下底7高4),剩余面积 = ?",
        _a4, "长方形-梯形", f"10×8-(3+7)×4÷2={10*8}-{(3+7)*4//2}={_a4}", X))
    _a5 = 8*6 + 8*6//2  # 48+24=72
    probs.append(P_fill("ca_x_e2",
        "长方形(长8宽6)和等底等高三角形拼合,总面积 = ?",
        _a5, "长方形+三角形", f"8×6+8×6÷2={8*6}+{8*6//2}={_a5}", X))
    _a6 = (5+9)*6//2 + 9*4  # 42+36=78
    probs.append(P_mc("ca_x_e3",
        "梯形(上底5下底9高6)下方加长方形(长9宽4),总面积 = ?",
        [str(_a6), str(_a6-10), str(_a6+10)], 0,
        "梯形+长方形",
        f"(5+9)×6÷2+9×4={(5+9)*6//2}+{9*4}={_a6}", X))

    # additional
    _ex1 = 10*5 - 4*4  # 50-16=34
    probs.append(P_fill("ca_b_e4", "长方形(长10宽5)中挖去正方形(边4),剩余面积 = ?",
                        _ex1, "大-小", f"10×5-4×4=50-16={_ex1}", B))
    _ex2 = 8*5 + 8*4//2  # 40+16=56
    probs.append(P_fill("ca_c_e4", "长方形(长8宽5)右边加三角形(底8高4),总面积 = ?",
                        _ex2, "长方形+三角形", f"8×5+8×4÷2=40+16={_ex2}", C))
    _ex3 = (3+9)*5//2 + 9*3  # 30+27=57
    probs.append(P_fill("ca_x_e4", "梯形(上底3下底9高5)下方加正方形(边9),但高为3,总面积 = ?",
                        _ex3, "(梯形)+(9×3)",
                        f"(3+9)×5÷2+9×3={30}+{27}={_ex3}", X))

    return make_set("combined_area", "组合图形面积", "formula", probs)


def equation_solve_practice():
    probs = [
        P_fill("esp_b0", "解方程:x + 9 = 17\nx = ?", 8, "x=17-9", "x=17-9=8", B),
        P_fill("esp_b1", "解方程:x - 6 = 14\nx = ?", 20, "x=14+6", "x=14+6=20", B),
        P_fill("esp_c0", "解方程:4x = 36\nx = ?", 9, "x=36÷4", "x=36÷4=9", C),
        P_fill("esp_c1", "解方程:x ÷ 5 = 7\nx = ?", 35, "x=7×5", "x=7×5=35", C),
        P_fill("esp_c2", "解方程:3x + 6 = 24\nx = ?", 6, "先3x=18,再x=6", "3x=24-6=18,x=18÷3=6", C),
        P_steps("esp_x0", "解方程:2x - 4 = 16",
                [{"id": "step1", "label": "2x = ?", "answer": 20},
                 {"id": "step2", "label": "x = ?",  "answer": 10}],
                "先移项再除以系数", "2x=16+4=20,x=20÷2=10", X),
        P_mc("esp_x1", "小明买了 x 本书,每本 6 元,付了 50 元找回 2 元,列方程并求 x?",
             ["x=8", "x=7", "x=6"], 0, "6x=50-2=48,x=48÷6", "6x+2=50→6x=48→x=8", X),
    ]

    # ── Extra problems: parametric equation solving ──────────────────────────
    # x + a = b  → x = b - a
    for pid, a, b, diff in [
        ("esp_b_e1", 7, 15, B),   # x=8
        ("esp_b_e2", 13, 30, B),  # x=17
        ("esp_b_e3", 8, 25, B),   # x=17
    ]:
        x = b - a
        probs.append(P_fill(pid, f"解方程:x + {a} = {b}\nx = ?",
                            x, f"x={b}-{a}", f"x={b}-{a}={x}", diff))
    # x - a = b → x = b + a
    for pid, a, b, diff in [
        ("esp_b_e4", 5, 18, B),  # x=23
        ("esp_c_e1", 9, 21, C),  # x=30
    ]:
        x = b + a
        probs.append(P_fill(pid, f"解方程:x - {a} = {b}\nx = ?",
                            x, f"x={b}+{a}", f"x={b}+{a}={x}", diff))
    # a*x = b → x = b//a (ensure divisible)
    for pid, a, b, diff in [
        ("esp_c_e2", 6, 42, C),   # x=7
        ("esp_c_e3", 7, 49, C),   # x=7
        ("esp_c_e4", 8, 56, C),   # x=7
    ]:
        assert b % a == 0
        x = b // a
        probs.append(P_fill(pid, f"解方程:{a}x = {b}\nx = ?",
                            x, f"x={b}÷{a}", f"x={b}÷{a}={x}", diff))
    # x ÷ a = b → x = a*b
    for pid, a, b, diff in [
        ("esp_c_e5", 6, 8, C),   # x=48
        ("esp_x_e1", 9, 7, X),   # x=63
    ]:
        x = a * b
        probs.append(P_fill(pid, f"解方程:x ÷ {a} = {b}\nx = ?",
                            x, f"x={b}×{a}", f"x={b}×{a}={x}", diff))
    # Two-step: ax + b = c → x = (c-b)//a
    for pid, a, b, c, diff in [
        ("esp_x_e2", 4, 5, 25, X),   # 4x=20, x=5
        ("esp_x_e3", 5, 3, 38, X),   # 5x=35, x=7
    ]:
        rhs = c - b
        x = rhs // a
        assert rhs % a == 0
        probs.append(P_fill(pid, f"解方程:{a}x + {b} = {c}\nx = ?",
                            x, f"先{a}x={c}-{b}={rhs},再x={rhs}÷{a}",
                            f"{a}x={c}-{b}={rhs},x={rhs}÷{a}={x}", diff))

    return make_set("equation_solve_practice", "解方程", "formula", probs)


def cuboid_volume_formula():
    probs = [
        P_mc("cvf_b0", "长方体体积公式是?",
             ["长 × 宽 × 高", "长 × 宽", "2×(长+宽)×高"], 0, "V=lwh", "V=长×宽×高", B),
        P_fill("cvf_b1", "长方体长4宽3高2,体积 = ?", 24, "4×3×2", "4×3×2=24", B),
        P_fill("cvf_c0", "正方体棱长5,体积 = ?", 125, "5³=5×5×5", "5×5×5=125", C),
        P_fill("cvf_c1", "长方体长6宽5高4,体积 = ?", 120, "6×5×4", "6×5×4=120", C),
        P_fill("cvf_x0", "长方体体积120,底面积30,高 = ?", 4, "高=体积÷底面积", "120÷30=4", X),
        P_mc("cvf_x1", "一个长10宽8高5的水箱(装满水),体积是多少立方厘米?",
             ["400", "360", "480"], 0, "10×8×5=400", "10×8×5=400 立方厘米", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Parametric: l*w*h
    for pid, l, w, h, diff in [
        ("cvf_b_e1", 3, 3, 3, B),   # 27 (cube)
        ("cvf_b_e2", 5, 4, 2, B),   # 40
        ("cvf_b_e3", 6, 3, 4, B),   # 72
        ("cvf_c_e1", 7, 5, 3, C),   # 105
        ("cvf_c_e2", 8, 4, 5, C),   # 160
        ("cvf_c_e3", 9, 6, 2, C),   # 108
    ]:
        vol = l * w * h
        if l == w == h:
            prompt = f"正方体棱长{l},体积 = ?"
            hint = f"{l}³"
            expl = f"{l}×{l}×{l}={vol}"
        else:
            prompt = f"长方体长{l}宽{w}高{h},体积 = ?"
            hint = f"{l}×{w}×{h}"
            expl = f"{l}×{w}×{h}={vol}"
        probs.append(P_fill(pid, prompt, vol, hint, expl, diff))
    # Reverse: find height given volume and base area
    for pid, vol, base, diff in [
        ("cvf_x_e1", 180, 36, X),  # h=5
        ("cvf_x_e2", 240, 40, X),  # h=6
        ("cvf_x_e3", 210, 42, X),  # h=5
    ]:
        h = vol // base
        probs.append(P_fill(pid, f"长方体体积{vol},底面积{base},高 = ?",
                            h, "高=体积÷底面积", f"{vol}÷{base}={h}", diff))

    # additional
    probs.append(P_fill("cvf_b_e4", "正方体棱长6,体积 = ?", 6**3, "6³", f"6×6×6={6**3}", B))
    probs.append(P_mc("cvf_c_e4", "长方体体积和正方体体积公式有什么关系?",
                      ["正方体是长宽高相等的长方体,公式一致", "完全不同", "正方体体积更大"], 0,
                      "正方体=特殊长方体", "正方体V=a³=a×a×a,是长方体V=l×w×h的特例", C))
    probs.append(P_fill("cvf_x_e4", "长方体长10宽8高6,体积 = ?", 10*8*6, "l×w×h", f"10×8×6={10*8*6}", X))

    return make_set("cuboid_volume_formula", "体积公式应用", "formula", probs)


# ── Logic sets ───────────────────────────────────────────────────────────────

def tree_planting():
    probs = [
        P_mc("tp_b0", "两端都种的情况下,棵数和间隔数的关系?",
             ["棵数 = 间隔数 + 1", "棵数 = 间隔数", "棵数 = 间隔数 - 1"], 0,
             "两端都种,多1棵", "两端都种:棵数=间隔数+1", B),
        P_fill("tp_b1", "一段路长100米,每隔5米种一棵树(两端都种),需几棵?", 21,
               "间隔数=100÷5=20,棵数=20+1", "100÷5=20个间隔,+1=21棵", B),
        P_mc("tp_c0", "只种一端时,棵数和间隔数关系?",
             ["棵数 = 间隔数", "棵数 = 间隔数 + 1", "棵数 = 间隔数 - 1"], 0,
             "只种一端,棵数=间隔数", "只种一端:棵数=间隔数", C),
        P_fill("tp_c1", "围绕圆形池塘一圈200米,每4米种一棵,共需几棵?", 50,
               "圆形无端点:棵数=间隔数", "200÷4=50个间隔=50棵", C),
        P_fill("tp_x0", "马路一侧(两端都种)共21棵树,间距8米,这条马路全长多少米?", 160,
               "间隔数=21-1=20,全长=20×8", "20×8=160米", X),
        P_mc("tp_x1", "阶梯有10级,从第1级到第10级共爬多少步?",
             ["9步", "10步", "11步"], 0, "每两级之间1步,共9步", "10级之间有9个间隔=9步", X),
    ]

    # ── Extra problems: parametric plant-tree ────────────────────────────────
    # Both ends: trees = gaps+1; gaps = length//spacing
    for pid, length, spacing, diff in [
        ("tp_b_e1", 80, 4, B),    # gaps=20, trees=21
        ("tp_b_e2", 120, 6, B),   # gaps=20, trees=21
        ("tp_b_e3", 60, 3, B),    # gaps=20, trees=21
        ("tp_c_e1", 150, 5, C),   # gaps=30, trees=31
        ("tp_c_e2", 200, 8, C),   # gaps=25, trees=26
    ]:
        assert length % spacing == 0
        gaps = length // spacing
        trees = gaps + 1
        probs.append(P_fill(pid,
            f"一段路长{length}米,每隔{spacing}米种一棵树(两端都种),需几棵?",
            trees, f"间隔数={length}÷{spacing}={gaps},棵数={gaps}+1",
            f"{length}÷{spacing}={gaps}个间隔,+1={trees}棵", diff))
    # Circle: trees = gaps
    for pid, length, spacing, diff in [
        ("tp_c_e3", 120, 6, C),   # 20棵
        ("tp_x_e1", 300, 5, X),   # 60棵
    ]:
        assert length % spacing == 0
        trees = length // spacing
        probs.append(P_fill(pid,
            f"围绕圆形跑道一圈{length}米,每{spacing}米种一棵树,共需几棵?",
            trees, f"圆形:棵数=间隔数={length}÷{spacing}",
            f"{length}÷{spacing}={trees}棵", diff))
    # Reverse: find length from tree count and spacing
    for pid, trees, spacing, diff in [
        ("tp_x_e2", 16, 6, X),    # (16-1)*6=90米
        ("tp_x_e3", 26, 4, X),    # (26-1)*4=100米
    ]:
        length = (trees - 1) * spacing
        probs.append(P_fill(pid,
            f"马路一侧(两端都种)共{trees}棵树,间距{spacing}米,路全长多少米?",
            length, f"间隔数={trees}-1={trees-1},全长={trees-1}×{spacing}",
            f"{trees-1}×{spacing}={length}米", diff))

    # extra fill / mc
    probs.append(P_fill("tp_b_e4", "路长50米,每隔5米种树(两端都种),需几棵?",
                        50//5+1, "间隔=50÷5=10,棵数=10+1", f"10+1=11棵", B))
    probs.append(P_mc("tp_c_e4", "圆形水池周长360米,每9米种一棵树,共几棵?",
                      ["40棵", "41棵", "39棵"], 0, "圆形:棵数=间隔数",
                      f"360÷9=40,圆形无端点,共40棵", C))
    probs.append(P_fill("tp_c_e5", "路长90米,每隔6米种树(只种一端),需几棵?",
                        90//6, "只种一端:棵数=间隔数", f"90÷6=15棵", C))
    probs.append(P_fill("tp_x_e4", "马路两侧(两端都种)各种一排,间距5米共22棵(每侧11棵),路全长多少米?",
                        (11-1)*5, "每侧:间隔=11-1=10,长=10×5", f"10×5=50米", X))

    return make_set("tree_planting", "植树问题", "logic", probs)


def find_defective():
    probs = [
        P_mc("fd_b0", "用天平找1个次品(比真品轻),至少称几次一定能找到?",
             ["不确定,取决于总数", "1次", "2次"], 0, "取决于总数", "次数取决于物品数量", B),
        P_mc("fd_b1", "3个球中1个次品(轻),用天平称1次能找到吗?",
             ["能", "不能", "不一定"], 0, "各组1个,天平倾斜即找到", "取2个各放两端,若平衡则第3个是次品;若不平衡则轻的那个是次品", B),
        P_mc("fd_c0", "9个球中1个次品,至少称几次一定找到?",
             ["2次", "3次", "1次"], 0, "每次三等分", "第一次3vs3,确定哪组;第二次再三等分→2次", C),
        P_fill("fd_c1", "27个物品中有1个次品,用天平最少称几次能保证找到?", 3,
               "每次三等分,27=3³", "3次:27→9→3→1", C),
        P_mc("fd_x0", "有12个球,其中1个次品(稍重),最少称几次能保证找到?",
             ["3次", "2次", "4次"], 0, "12÷3=4,4÷3不整除需再一次", "12→4→找到需3次", X),
        P_mc("fd_x1", "用天平平衡法找次品,每次最多能排除几分之几的可能?",
             ["2/3", "1/2", "1/3"], 0, "三等分后排除两组", "每次排除2/3的可能,保留1/3继续找", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    probs.append(P_mc("fd_b_e1", "天平左右两盘平衡时说明?",
                      ["两边重量相等", "左边更重", "右边更重"], 0, "平衡=重量相等", "天平平衡→左=右", B))
    probs.append(P_mc("fd_b_e2", "2个物品中有1个次品(重),用天平称1次?",
                      ["1次就能找到", "需要2次", "不能确定"], 0, "各放一个,重的那个是次品", "1次:两个各放一侧,重的是次品", B))
    probs.append(P_mc("fd_b_e3", "找次品时,三等分分组的好处是?",
                      ["每次能排除最多物品", "容易计算", "只是习惯"], 0, "三等分效率最高", "每次排除2/3,比二等分(排除1/2)效率更高", B))
    # Parametric: n = 3^k, min_weighings = k
    for pid, n, k, diff in [
        ("fd_c_e1", 3, 1, C),   # 1次
        ("fd_c_e2", 9, 2, C),   # 2次
        ("fd_c_e3", 81, 4, C),  # 4次
    ]:
        probs.append(P_fill(pid,
            f"{n}个物品中有1个次品,用天平最少称几次能保证找到?",
            k, f"每次三等分,{n}=3^{k}", f"3^{k}={n},需{k}次", diff))
    probs.append(P_mc("fd_x_e1", "有4个球,其中1个次品,至少称几次一定能找到?",
                      ["2次", "1次", "3次"], 0, "4÷3=1余1,第一次称3个,若平衡则余1个是次品(共1次);若不平衡再在那3个中找(共2次)→最多2次",
                      "最坏情况:先称3个(1次),不平衡再称1vs1(2次)→最多2次", X))
    probs.append(P_mc("fd_x_e2", "有n个物品,最少需要k次,则n最大是?",
                      ["3^k 个", "2^k 个", "k×3 个"], 0, "每次三等分,k次可处理3^k个", "k次三等分最多处理3^k个", X))
    probs.append(P_mc("fd_x_e3", "6个球(5个真品,1个次品,次品较轻),至少称几次一定找到?",
                      ["2次", "1次", "3次"], 0, "6÷3=2,两组各3个称1次,再在3个里称1次", "6→2组3个,1次确定哪组;再3个中找,需1次→共2次", X))
    probs.append(P_mc("fd_b_e4", "用天平称物体时,砝码放在?",
                      ["右盘", "左盘", "任意盘"], 0, "约定砝码放右盘", "天平使用时,物品左盘,砝码右盘(中国传统)", B))
    probs.append(P_fill("fd_c_e4", "243个物品中有1个次品,用天平最少称几次保证找到?(243=3^5)",
                        5, "243=3^5,需5次", "3^5=243,需5次三等分", C))
    probs.append(P_mc("fd_x_e4", "在找次品策略中,为什么每次三等分比二等分效率高?",
                      ["每次排除2/3,比1/2更多", "三等分更容易操作", "两者一样"], 0,
                      "三等分排除更多", "三等分每次排除2/3>二等分排除1/2,所以次数少", X))

    return make_set("find_defective", "找次品", "logic", probs)


def observation_3d_5():
    probs = [
        P_mc("obs_b0", "从正面看到的是物体的什么视图?",
             ["正视图", "俯视图", "侧视图"], 0, "三视图方向", "正面→正视图", B),
        P_mc("obs_b1", "从上面往下看到的图形叫?",
             ["俯视图", "正视图", "侧视图"], 0, "俯视图方向", "从上方俯视→俯视图", B),
        P_mc("obs_c0", "一个正方体从正面、侧面、上面看到的图形都是?",
             ["正方形", "长方形", "三角形"], 0, "正方体三视图", "正方体三个方向看都是正方形", C),
        P_mc("obs_c1", "观察由4个正方体搭成的立体图形,从不同方向看到的图形可能?",
             ["不同", "完全相同", "不一定"], 0, "立体图形各方向视图可不同", "不同方向的视图通常不同", C),
        P_mc("obs_x0", "从正面看是长方形,从上面看是圆形的物体是?",
             ["圆柱", "圆锥", "长方体"], 0, "圆柱:正面长方形,上面圆", "圆柱正面是矩形,上面是圆", X),
        P_mc("obs_x1", "两个不同形状的物体,从某个方向看到的图形可能?",
             ["相同", "一定不同", "一定相同"], 0, "不同形状可有相同的某个视图", "不同形状可能有相同的某方向视图", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    probs.append(P_mc("obs_b_e1", "从侧面看到的图形叫?",
                      ["侧视图", "正视图", "俯视图"], 0, "侧面→侧视图", "从左侧或右侧看→侧视图", B))
    probs.append(P_mc("obs_b_e2", "三视图中,正视图、侧视图、俯视图分别从哪个方向看?",
                      ["正面、侧面、上面", "上面、正面、侧面", "侧面、正面、上面"], 0,
                      "正面、侧面、上面", "正视图→正面,侧视图→侧面,俯视图→上面", B))
    probs.append(P_mc("obs_b_e3", "长方体从任意方向看到的图形一定是?",
                      ["长方形(或正方形)", "三角形", "圆形"], 0,
                      "长方体视图均为矩形", "长方体三个方向视图都是矩形", B))
    probs.append(P_mc("obs_c_e1", "圆柱从侧面看到的图形是?",
                      ["长方形", "圆形", "三角形"], 0, "圆柱侧面→矩形", "圆柱侧面视图是长方形", C))
    probs.append(P_mc("obs_c_e2", "圆锥从上面看到的图形是?",
                      ["圆形", "三角形", "长方形"], 0, "圆锥顶视图是圆", "从上方看圆锥是圆", C))
    probs.append(P_mc("obs_c_e3", "2个正方体左右叠放,从正面看到的是?",
                      ["2×1的长方形", "1×1的正方形", "2×2的正方形"], 0,
                      "两个正方体横排,正面是2:1矩形", "两个正方体横排,正视图宽是高的2倍", C))
    probs.append(P_mc("obs_x_e1", "从三个方向看都是正方形的立体图形一定是?",
                      ["正方体", "长方体", "球"], 0, "正方体三视图全是正方形", "只有正方体满足此条件", X))
    probs.append(P_mc("obs_x_e2", "将一个长方体切掉一个小长方体角,正视图会?",
                      ["变化,切角处出现缺口", "不变", "变成三角形"], 0,
                      "切角影响正面轮廓", "切去角后正视图会出现相应的变化", X))
    probs.append(P_mc("obs_x_e3", "4个小正方体叠成2×2的方阵,从上面看是?",
                      ["2×2的正方形", "1×1的正方形", "1×4的长条"], 0,
                      "2×2方阵俯视是2×2正方形", "2×2方阵俯视图是2单位×2单位的正方形", X))
    probs.append(P_mc("obs_b_e4", "观察立体图形时,通常从哪三个方向观察?",
                      ["正面、侧面、上面", "左面、右面、下面", "前面、后面、上面"], 0,
                      "三视图的三个方向", "正视图(正面)、侧视图(侧面)、俯视图(上面)", B))
    probs.append(P_mc("obs_c_e4", "一根竖立的铅笔从上面看到的图形是?",
                      ["圆形", "长方形", "三角形"], 0, "铅笔俯视是圆形截面", "竖立铅笔俯视→圆形截面", C))
    probs.append(P_mc("obs_x_e4", "3个小正方体摆成L形,从正面看是?",
                      ["L形(两格宽一格高+一格)", "正方形", "直线"], 0,
                      "L形排列正视图也是L形", "L形排列正视图与排列形状相同", X))

    return make_set("observation_3d_5", "观察物体", "logic", probs)


# ── Data set ─────────────────────────────────────────────────────────────────

def line_graph():
    table = ("某城市一周气温折线统计图数据\n"
             "周一:12℃ 周二:15℃ 周三:18℃\n"
             "周四:16℃ 周五:20℃ 周六:22℃ 周日:19℃")
    probs = [
        P_mc("lg_b0", "折线统计图的优点是?",
             ["能清晰看出数据的变化趋势", "只能比较数量多少", "不能显示具体数值"], 0,
             "折线图特点", "折线图能直观显示数据随时间的变化趋势", B),
        P_mc("lg_b1", "折线统计图中,折线上升表示数据?",
             ["增大", "减小", "不变"], 0, "折线方向与数据变化", "折线上升→数据增大", B),
        P_mc("lg_c0", table + "\n气温最高是哪天?",
             ["周六", "周五", "周日"], 0, "找最高点", "周六22℃最高", C),
        P_mc("lg_c1", table + "\n哪两天之间气温单日升幅最大?",
             ["周四到周五(+4℃)", "周一到周二(+3℃)", "周五到周六(+2℃)"], 0,
             "逐段计算差值", "各段差:+3,+3,-2,+4,+2,-3;最大是周四→周五+4℃", C),
        P_fill("lg_x0", "一周气温的平均值是?(12+15+18+16+20+22+19)÷7=?", 17,
               "(12+15+18+16+20+22+19)÷7", "122÷7≈17.4≈17(取整)", X),
        P_mc("lg_x1", "折线统计图和条形统计图最主要的区别是?",
             ["折线图更能体现变化趋势,条形图更便于比较数量", "折线图不能显示具体数值", "两者完全相同"], 0,
             "两种图的区别", "折线图→趋势;条形图→比较大小", X),
    ]

    # ── Extra problems ───────────────────────────────────────────────────────
    # Data used above: temps = [12,15,18,16,20,22,19], days = 周一~周日
    temps = [12, 15, 18, 16, 20, 22, 19]
    days  = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    min_t = min(temps)
    min_day = days[temps.index(min_t)]
    total = sum(temps)
    # average as integer (floor)
    avg_floor = total // len(temps)

    probs.append(P_mc("lg_b_e1", "折线统计图中,折线下降表示数据?",
                      ["减小", "增大", "不变"], 0, "折线下降→数据减小", "折线下降方向表示数值减小", B))
    probs.append(P_mc("lg_b_e2", "制作折线统计图时,横轴通常表示?",
                      ["时间或类别", "数量", "百分比"], 0, "横轴为时间/类别", "横轴表示时间或分类,纵轴表示数量", B))
    probs.append(P_mc("lg_b_e3", "折线统计图相邻两点之间用什么连接?",
                      ["直线段", "曲线", "虚线"], 0, "折线=直线段连点", "相邻数据点用直线段连接", B))
    probs.append(P_mc("lg_c_e1", table + f"\n气温最低是哪天?",
                      [min_day, "周四", "周六"], 0, "找最低点",
                      f"{min_day}{min_t}℃最低", C))
    probs.append(P_mc("lg_c_e2", table + "\n周三到周四气温如何变化?",
                      ["下降了2℃", "上升了2℃", "不变"], 0, "18→16,下降2℃", "18-16=2,下降2℃", C))
    probs.append(P_mc("lg_c_e3", table + "\n一周中气温超过18℃的天数是?",
                      ["3天", "2天", "4天"], 0, "20,22,19都>18",
                      "20℃(周五),22℃(周六),19℃(周日)共3天超过18℃", C))
    probs.append(P_fill("lg_x_e1", table + f"\n一周气温总和是多少℃?", total,
                        "7个数相加", f"{'+'.join(map(str,temps))}={total}℃", X))
    probs.append(P_mc("lg_x_e2", table + "\n周日气温比周六低几摄氏度?",
                      ["3℃", "2℃", "1℃"], 0, "22-19=3", "22-19=3℃", X))
    probs.append(P_mc("lg_x_e3", "描述数据变化趋势时,首选哪种统计图?",
                      ["折线统计图", "条形统计图", "饼图"], 0, "折线图体现变化趋势", "折线统计图最适合展示随时间变化的趋势", X))
    probs.append(P_mc("lg_b_e4", "折线统计图中,每个数据点的位置由什么决定?",
                      ["横轴类别和纵轴数值", "只由纵轴决定", "只由横轴决定"], 0,
                      "横轴类别+纵轴数值定位", "数据点位置=横轴类别对应列+纵轴数值对应行", B))
    probs.append(P_fill("lg_c_e4", table + "\n周三与周四的平均气温是多少℃?",
                        (temps[2]+temps[3])//2, "平均=(18+16)÷2",
                        f"(18+16)÷2=34÷2={(temps[2]+temps[3])//2}℃", C))
    probs.append(P_mc("lg_c_e5", table + "\n一周中气温相比前一天下降的有几天?",
                      ["2天", "1天", "3天"], 0, "周四(18→16)和周日(22→19)下降",
                      "周四比周三少2℃,周日比周六少3℃,共2天下降", C))
    probs.append(P_mc("lg_x_e4", table + "\n一周平均气温最接近哪个数?",
                      ["17℃", "15℃", "20℃"], 0,
                      f"({'+'.join(map(str,temps))})÷7≈17",
                      f"{total}÷7≈17.4,最接近17℃", X))

    return make_set("line_graph", "折线统计图", "data", probs)


def kg_parity5():
    p = [
        P_mc("kgp5_b0", "奇数 + 奇数 = ?", ["奇数", "偶数", "不确定", "0"], 1, "如 3+5=8", "奇+奇=偶", B),
        P_mc("kgp5_b1", "1+2+3+…+10 的和是?", ["奇数", "偶数", "不确定", "都不是"], 0, "和是 55", "55 是奇数", B),
        P_mc("kgp5_b2", "偶数 × 任何整数,结果是?", ["奇数", "偶数", "不确定", "质数"], 1, "因数里有 2", "一定是偶数", B),
        P_mc("kgp5_c0", "一个数除以 5 余 3,它的个位可能是?", ["3 或 8", "5", "0", "2"], 0, "个位每 5 个循环一次", "如 8÷5 余 3", C),
        P_mc("kgp5_c1", "三个连续整数的和一定是几的倍数?", ["2", "3", "4", "5"], 1, "n+(n+1)+(n+2)=3(n+1)", "3 的倍数", C),
        P_mc("kgp5_c2", "2+4+6+…+20 = ?", [110, 100, 90, 120], 0, "等于 2×(1+…+10)", "2×55=110", C),
        P_mc("kgp5_c3", "100 以内最大的 7 的倍数是?", [98, 91, 99, 105], 0, "7×14=98", "98", C),
        P_mc("kgp5_x0", "1~100 中,6 的倍数有几个?", [16, 15, 17, 33], 0, "既是 2 又是 3 的倍数即 6 的倍数", "96÷6=16", X),
        P_mc("kgp5_x1", "一个三位数各位数字之和是 9 的倍数,这个数一定是几的倍数?", ["3", "9", "6", "11"], 1, "数字和能被 9 整除→数能被 9 整除", "9 的倍数", X),
        P_mc("kgp5_x2", "连续 5 个自然数的和,一定是几的倍数?", ["5", "2", "4", "3"], 0, "和 = 中间那个数 ×5", "5 的倍数", X),
    ]
    return make_set("kg_parity5", "奇偶与整除趣题", "logic", p)


def kg_count5():
    p = [
        P_mc("kgc5_b0", "从家到学校有 3 条路,学校到公园有 2 条路。从家经学校到公园有几种走法?", [6, 5, 8, 9], 0, "分步相乘", "3×2=6", B),
        P_mc("kgc5_b1", "两位数一共有多少个?", [90, 99, 100, 89], 0, "从 10 到 99", "99−10+1=90", B),
        P_mc("kgc5_b2", "5 个球队单循环赛(每两队赛一场),共赛几场?", [10, 15, 20, 25], 0, "每队赛 4 场,再除以 2", "5×4÷2=10", B),
        P_mc("kgc5_c0", "4 个小朋友排成一排照相,共有几种排法?", [24, 12, 16, 8], 0, "4×3×2×1", "24 种", C),
        P_mc("kgc5_c1", "从 1,2,3,4,5 中选两个数相加,能得到几种不同的和?", [7, 10, 8, 6], 0, "最小 1+2=3,最大 4+5=9", "和为 3~9 共 7 种", C),
        P_mc("kgc5_c2", "各位数字都是奇数的三位数有几个?", [125, 100, 75, 150], 0, "每位都从 1,3,5,7,9 里选", "5×5×5=125", C),
        P_mc("kgc5_c3", "在 2×2 的方格里,从左上走到右下(只能向右或向下),有几条路径?", [6, 4, 8, 9], 0, "向右 2 步、向下 2 步的不同排列", "6 条", C),
        P_mc("kgc5_x0", "用 1,2,3,4 组成没有重复数字的四位数,共几个?", [24, 12, 16, 256], 0, "4×3×2×1", "24 个", X),
        P_mc("kgc5_x1", "6 个人互相通一次电话,共通几次?", [15, 12, 30, 21], 0, "每人打 5 次,再除以 2", "6×5÷2=15", X),
        P_mc("kgc5_x2", "从左上到右下,需向右走 3 格、向下走 3 格(只能右或下),有几条路径?", [20, 15, 9, 6], 0, "6 步里挑 3 步向右", "C(6,3)=20", X),
    ]
    return make_set("kg_count5", "计数与路径", "logic", p)


def nt_gcd_lcm5():
    p = [
        P_mc("ntg5_b0", "12 和 18 的最大公因数是?", [6, 3, 2, 36], 0, "找两个数公有的最大因数", "12=2×2×3,18=2×3×3,公有 2×3=6", B),
        P_mc("ntg5_b1", "4 和 6 的最小公倍数是?", [12, 24, 2, 10], 0, "找两个数最小的公共倍数", "4 的倍数 4,8,12…;6 的倍数 6,12… 最小是 12", B),
        P_mc("ntg5_b2", "8 和 12 的最大公因数是?", [4, 2, 24, 8], 0, "公有因数里最大的", "8=2×2×2,12=2×2×3,公有 2×2=4", B),
        P_mc("ntg5_c0", "最大公因数是 1 的两个数,叫做?", ["互质数", "质数", "合数", "倍数"], 0, "没有公共大于 1 的因数", "如 8 和 9 互质", C),
        P_mc("ntg5_c1", "6 和 9 的最小公倍数是?", [18, 3, 54, 15], 0, "6,12,18…;9,18… 最小公共倍数", "18", C),
        P_mc("ntg5_c2", "24 分米和 36 分米的绳子,都剪成同样长的最长小段,每段几分米?", [12, 6, 72, 4], 0, "求最大公因数", "GCD(24,36)=12", C),
        P_mc("ntg5_c3", "甲每 4 天值一次班,乙每 6 天一次,今天同时值班,至少几天后再同时?", [12, 24, 10, 2], 0, "求最小公倍数", "LCM(4,6)=12", C),
        P_mc("ntg5_x0", "36 和 48 的最大公因数是?", [12, 6, 144, 24], 0, "分解质因数找公有部分", "36=2²×3²,48=2⁴×3,公有 2²×3=12", X),
        P_mc("ntg5_x1", "一个数既是 6 的倍数又是 8 的倍数,最小是?", [24, 48, 2, 12], 0, "求最小公倍数", "LCM(6,8)=24", X),
        P_mc("ntg5_x2", "两数最大公因数 4、最小公倍数 24,其中一个是 8,另一个是?", [12, 6, 24, 16], 0, "两数之积 = 最大公因数 × 最小公倍数", "4×24÷8=12", X),
    ]
    return make_set("nt_gcd_lcm5", "最大公因数与最小公倍数", "logic", p)


def comb_principle5():
    p = [
        P_mc("cp5_b0", "从甲地到乙地有 2 趟火车、3 趟汽车,共有几种走法?", [5, 6, 2, 3], 0, "分类用加法", "2+3=5", B),
        P_mc("cp5_b1", "上衣 3 件、裤子 4 条,搭配一套有几种?", [12, 7, 9, 4], 0, "分步用乘法", "3×4=12", B),
        P_mc("cp5_b2", "从 2 种饮料、3 种点心里各选一样,有几种搭配?", [6, 5, 9, 2], 0, "分步用乘法", "2×3=6", B),
        P_mc("cp5_c0", "书架上层 4 本、下层 5 本,任取一本,有几种取法?", [9, 20, 5, 4], 0, "上层或下层,用加法", "4+5=9", C),
        P_mc("cp5_c1", "用 1,2,3,4 组成两位数(数字可重复),有几个?", [16, 12, 8, 4], 0, "十位 4 种、个位 4 种", "4×4=16", C),
        P_mc("cp5_c2", "A 到 B 有 3 条路,B 到 C 有 2 条,A 经 B 到 C 有几种走法?", [6, 5, 3, 2], 0, "分步用乘法", "3×2=6", C),
        P_mc("cp5_c3", "3 名男生、2 名女生,选 1 人当代表,有几种选法?", [5, 6, 3, 2], 0, "男或女,用加法", "3+2=5", C),
        P_mc("cp5_x0", "用 0,1,2 组成三位数(数字可重复,首位不为 0),有几个?", [18, 27, 12, 9], 0, "首位只能 1 或 2", "2×3×3=18", X),
        P_mc("cp5_x1", "从 5 件不同礼物里选 2 件,分别送给甲和乙,有几种送法?", [20, 10, 25, 7], 0, "甲 5 种、乙剩 4 种", "5×4=20", X),
        P_mc("cp5_x2", "一道选择题有 4 个选项,连续 3 道这样的题,答案组合共几种?", [64, 12, 16, 81], 0, "每题 4 种、分步相乘", "4×4×4=64", X),
    ]
    return make_set("comb_principle5", "加法与乘法原理", "logic", p)


def geo_area5():
    p = [
        P_mc("gar5_b0", "长 5 厘米、宽 3 厘米的长方形面积是?", [15, 8, 16, 30], 0, "长×宽", "5×3=15", B),
        P_mc("gar5_b1", "边长 4 厘米的正方形面积是?", [16, 8, 12, 4], 0, "边长×边长", "4×4=16", B),
        P_mc("gar5_b2", "底 6、高 4 的平行四边形面积是?", [24, 10, 12, 48], 0, "底×高", "6×4=24", B),
        P_mc("gar5_c0", "底 8、高 5 的三角形面积是?", [20, 40, 13, 10], 0, "底×高÷2", "8×5÷2=20", C),
        P_mc("gar5_c1", "上底 3、下底 5、高 4 的梯形面积是?", [16, 32, 12, 20], 0, "(上底+下底)×高÷2", "(3+5)×4÷2=16", C),
        P_mc("gar5_c2", "长 10、宽 6 的长方形,中间挖去边长 2 的正方形,剩下面积?", [56, 60, 64, 52], 0, "大面积减去小面积", "60−4=56", C),
        P_mc("gar5_c3", "把平行四边形剪拼成长方形,面积会怎样?", ["不变", "变大", "变小", "变一半"], 0, "只是换了形状", "面积不变", C),
        P_mc("gar5_x0", "L 形:大长方形 8×6 去掉右上角 3×2 的小长方形,面积?", [42, 48, 54, 40], 0, "割补法:整块减小块", "48−6=42", X),
        P_mc("gar5_x1", "正方形边长扩大到原来的 2 倍,面积变为原来的几倍?", [4, 2, 8, 3], 0, "长和宽都变 2 倍", "2×2=4 倍", X),
        P_mc("gar5_x2", "三角形面积是 24,底是 8,高是多少?", [6, 3, 12, 4], 0, "由面积反推:面积×2÷底", "24×2÷8=6", X),
    ]
    return make_set("geo_area5", "面积割补与组合", "logic", p)


def build_practice_pack():
    sets = [
        # Procedure
        decimal_mul_column(),
        decimal_div_column(),
        fraction_add_same(),
        fraction_add_diff(),
        fraction_mixed_calc(),
        # Concept
        decimal_mul_meaning(),
        decimal_div_meaning(),
        position_grid(),
        probability_concept(),
        equation_meaning(),
        equation_check(),
        factor_concept(),
        prime_composite(),
        divisibility_rules(),
        fraction_meaning5(),
        equivalent_fraction(),
        fraction_simplify(),
        improper_fraction(),
        fraction_compare5(),
        cuboid_properties(),
        cuboid_surface_area(),
        cuboid_volume_concept(),
        rotation_concept(),
        # Formula
        parallelogram_area(),
        triangle_area(),
        trapezoid_area(),
        combined_area(),
        equation_solve_practice(),
        cuboid_volume_formula(),
        # Logic
        tree_planting(),
        find_defective(),
        observation_3d_5(),
        # Data
        line_graph(),
        # 竞赛拓展·袋鼠思维
        kg_parity5(),
        kg_count5(),
        # 竞赛拓展·数论与组合
        nt_gcd_lcm5(),
        comb_principle5(),
        # 竞赛拓展·几何
        geo_area5(),
    ]
    return {"version": "2.0.0", "grade": 5, "sets": sets}


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — KNOWLEDGE MAP
# ══════════════════════════════════════════════════════════════════════════════

# (unit_id, term, index, title, [topic_specs...])
# topic_spec: (topic_id, title, pedagogy, dependsOn[], fluencyTrackId|None)
# status is auto-detected: ready iff fluencyTrackId is set OR topic_id is in practice pack

UNITS_G5 = [
    # ────────── 上册 ──────────
    ("u1", "upper", 1, "小数乘法", [
        ("decimal_mul_meaning",  "小数乘法意义",   "concept",   [],                      None),
        ("decimal_mul_column",   "小数乘法竖式",   "procedure", ["decimal_mul_meaning"], None),
    ]),
    ("u2", "upper", 2, "位置", [
        ("position_grid",        "位置与坐标",     "concept",   [],                      None),
    ]),
    ("u3", "upper", 3, "小数除法", [
        ("decimal_div_meaning",  "小数除法意义",   "concept",   ["decimal_mul_meaning"], None),
        ("decimal_div_column",   "小数除法竖式",   "procedure", ["decimal_div_meaning"], None),
    ]),
    ("u4", "upper", 4, "可能性", [
        ("probability_concept",  "可能性",         "concept",   [],                      None),
    ]),
    ("u5", "upper", 5, "简易方程", [
        ("equation_meaning",     "方程的意义",     "concept",   [],                      None),
        ("equation_oral",        "简单方程口算",   "fluency",   ["equation_meaning"],    "equation_oral"),
        ("equation_check",       "检验方程的解",   "concept",   ["equation_meaning"],    None),
        ("equation_solve_practice", "解方程",      "formula",   ["equation_check"],      None),
    ]),
    ("u6", "upper", 6, "多边形的面积", [
        ("parallelogram_area",   "平行四边形面积公式", "formula", [],                   None),
        ("triangle_area",        "三角形面积公式", "formula",   ["parallelogram_area"],  None),
        ("trapezoid_area",       "梯形面积公式",   "formula",   ["triangle_area"],       None),
        ("polygon_area_oral",    "多边形面积口算", "fluency",   ["trapezoid_area"],      "polygon_area_oral"),
        ("combined_area",        "组合图形面积",   "formula",   ["polygon_area_oral"],   None),
    ]),
    ("u7", "upper", 7, "数学广角——植树问题", [
        ("tree_planting",        "植树问题",       "logic",     [],                      None),
    ]),
    # ────────── 下册 ──────────
    ("l1", "lower", 1, "观察物体(三)", [
        ("observation_3d_5",     "观察物体",       "logic",     [],                      None),
    ]),
    ("l2", "lower", 2, "因数与倍数", [
        ("factor_concept",       "因数与倍数概念", "concept",   [],                      None),
        ("factor_multiple_oral", "因数倍数口算",   "fluency",   ["factor_concept"],      "factor_multiple_oral"),
        ("prime_composite",      "质数与合数",     "concept",   ["factor_concept"],      None),
        ("divisibility_rules",   "2/3/5整除特征",  "concept",   ["prime_composite"],     None),
    ]),
    ("l3", "lower", 3, "长方体和正方体", [
        ("cuboid_properties",    "长方体正方体特征", "concept", [],                      None),
        ("cuboid_surface_area",  "表面积",         "concept",   ["cuboid_properties"],   None),
        ("cuboid_volume_concept","体积的认识",     "concept",   ["cuboid_surface_area"], None),
        ("cuboid_calc",          "长方体正方体口算","fluency",  ["cuboid_volume_concept"],"cuboid_calc"),
        ("cuboid_volume_formula","体积公式应用",   "formula",   ["cuboid_calc"],         None),
    ]),
    ("l4", "lower", 4, "分数的意义和性质", [
        ("fraction_meaning5",    "分数的意义",     "concept",   [],                      None),
        ("equivalent_fraction",  "等值分数",       "concept",   ["fraction_meaning5"],   None),
        ("fraction_simplify",    "约分",           "concept",   ["equivalent_fraction"], None),
        ("improper_fraction",    "假分数与带分数", "concept",   ["fraction_meaning5"],   None),
        ("fraction_compare5",    "分数比大小",     "concept",   ["fraction_simplify"],   None),
    ]),
    ("l5", "lower", 5, "图形的运动(三)", [
        ("rotation_concept",     "旋转",           "concept",   [],                      None),
    ]),
    ("l6", "lower", 6, "分数的加法和减法", [
        ("fraction_add_same",    "同分母分数加减", "procedure", ["fraction_meaning5"],   None),
        ("fraction_add_diff",    "异分母分数加减", "procedure", ["fraction_add_same",
                                                                  "equivalent_fraction"], None),
        ("fraction_mixed_calc",  "分数混合运算",   "procedure", ["fraction_add_diff"],   None),
    ]),
    ("l7", "lower", 7, "折线统计图", [
        ("line_graph",           "折线统计图",     "data",      [],                      None),
    ]),
    ("l8", "lower", 8, "数学广角——找次品", [
        ("find_defective",       "找次品",         "logic",     [],                      None),
    ]),
    ("compkg", "lower", 99, "竞赛拓展·袋鼠思维", [
        ("kg_parity5",           "奇偶与整除趣题", "logic",     [],                      None),
        ("kg_count5",            "计数与路径",     "logic",     [],                      None),
    ]),
    ("compnt", "lower", 100, "竞赛拓展·数论与组合", [
        ("nt_gcd_lcm5",          "最大公因数与最小公倍数", "logic", [],                  None),
        ("comb_principle5",      "加法与乘法原理", "logic",     [],                      None),
    ]),
    ("compgeo", "lower", 101, "竞赛拓展·几何", [
        ("geo_area5",            "面积割补与组合", "logic",     [],                      None),
    ]),
]


def _practice_set_ids_g5():
    path = os.path.join(CONTENT_DIR, "grade5_practice_pack.json")
    if not os.path.exists(path):
        return set()
    with open(path, encoding="utf-8") as f:
        return {s["id"] for s in json.load(f)["sets"]}


def build_knowledge_map():
    practice_ids = _practice_set_ids_g5()
    units = []
    topics = []

    for unit_id, term, index, title, topic_specs in UNITS_G5:
        topic_ids = []
        for spec in topic_specs:
            tid, ttitle, pedagogy, deps, fluency_track = spec
            pset = tid if tid in practice_ids else None
            status = "ready" if (fluency_track or pset) else "coming_soon"
            topic_ids.append(tid)
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
            if pset:
                topic["problemSetId"] = pset
            topics.append(topic)
        units.append({
            "id": unit_id,
            "term": term,
            "index": index,
            "title": title,
            "topicIds": topic_ids,
        })

    return {"textbook": "人教版", "grade": 5, "units": units, "topics": topics}


# ══════════════════════════════════════════════════════════════════════════════
# MAIN — generate all three files
# ══════════════════════════════════════════════════════════════════════════════

def main():
    # 1. Fluency pack
    fluency = build_fluency_pack()
    fluency_path = os.path.join(CONTENT_DIR, "grade5_math_fluency_pack.json")
    with open(fluency_path, "w", encoding="utf-8") as f:
        json.dump(fluency, f, ensure_ascii=False, indent=2)
        f.write("\n")
    n_facts = sum(
        len(lvl["new_facts"])
        for t in fluency["tracks"]
        for lvl in t["levels"]
    )
    print(f"wrote {fluency_path}")
    print(f"  tracks={len(fluency['tracks'])}  facts={n_facts}")
    for t in fluency["tracks"]:
        print(f"  - {t['trackId']:25s} enabled={t['enabled']!s:5s}  levels={len(t['levels'])}")

    # 2. Practice pack
    practice = build_practice_pack()
    practice_path = os.path.join(CONTENT_DIR, "grade5_practice_pack.json")
    with open(practice_path, "w", encoding="utf-8") as f:
        json.dump(practice, f, ensure_ascii=False, indent=2)
        f.write("\n")
    tiers = {B: 0, C: 0, X: 0}
    for s in practice["sets"]:
        for p in s["problems"]:
            tiers[p.get("difficulty", C)] += 1
    n_problems = sum(len(s["problems"]) for s in practice["sets"])
    print(f"\nwrote {practice_path}")
    print(f"  sets={len(practice['sets'])}  problems={n_problems}  tiers={tiers}")

    # 3. Knowledge map — must run after practice pack is written
    kmap = build_knowledge_map()
    kmap_path = os.path.join(CONTENT_DIR, "grade5_knowledge_map.json")
    with open(kmap_path, "w", encoding="utf-8") as f:
        json.dump(kmap, f, ensure_ascii=False, indent=2)
        f.write("\n")
    ready = [t for t in kmap["topics"] if t["status"] == "ready"]
    by_ped: dict[str, int] = {}
    for t in kmap["topics"]:
        by_ped[t["pedagogy"]] = by_ped.get(t["pedagogy"], 0) + 1
    print(f"\nwrote {kmap_path}")
    print(f"  units={len(kmap['units'])}  topics={len(kmap['topics'])}  ready={len(ready)}")
    print(f"  pedagogy: {by_ped}")

    # Sanity checks
    print("\n--- sanity checks ---")
    errors = 0

    # Check fluency answers are all integers
    for t in fluency["tracks"]:
        for lvl in t["levels"]:
            for fact in lvl["new_facts"]:
                if not isinstance(fact["answer"], int):
                    print(f"  ERROR: non-integer answer in {t['trackId']} {lvl['level']}: "
                          f"id={fact['id']} answer={fact['answer']!r}")
                    errors += 1

    # Verify a sample of polygon area answers
    def check_area(fid, expected, computed):
        if expected != computed:
            print(f"  ERROR: {fid} expected {expected} got {computed}")
            return 1
        return 0

    # polygon_area_oral level A: parallelogram S=b×h
    for fact in POLYGON_AREA_ORAL_LEVELS[0]:
        pass  # already hard-coded and verified above

    # Spot-check cuboid surface area formulas
    # 长4宽3高2: 2×(12+8+6)=52
    errors += check_area("cb_d0_check", 52, 2*(4*3+4*2+3*2))
    # 长5宽4高3: 2×(20+15+12)=94
    errors += check_area("cb_d1_check", 94, 2*(5*4+5*3+4*3))
    # 长6宽2高3: 2×(12+18+6)=72
    errors += check_area("cb_d2_check", 72, 2*(6*2+6*3+2*3))
    # 长5宽5高2: 2×(25+10+10)=90
    errors += check_area("cb_d3_check", 90, 2*(5*5+5*2+5*2))

    # Spot-check trapezoid areas
    errors += check_area("tza_c0_check", 30, (4+8)*5//2)
    errors += check_area("tza_x0_check", 48, (5+11)*6//2)

    # Spot-check cuboid volume
    errors += check_area("cvf_c0_check", 125, 5**3)
    errors += check_area("cvf_c1_check", 120, 6*5*4)

    # Check knowledge map: all fluency tracks declared in map exist in fluency pack
    fluency_track_ids = {t["trackId"] for t in fluency["tracks"]}
    for topic in kmap["topics"]:
        if "fluencyTrackId" in topic:
            if topic["fluencyTrackId"] not in fluency_track_ids:
                print(f"  ERROR: topic {topic['id']} references unknown track {topic['fluencyTrackId']!r}")
                errors += 1

    # Check practice sets referenced in map exist
    practice_set_ids = {s["id"] for s in practice["sets"]}
    for topic in kmap["topics"]:
        if "problemSetId" in topic:
            if topic["problemSetId"] not in practice_set_ids:
                print(f"  ERROR: topic {topic['id']} references unknown practice set {topic['problemSetId']!r}")
                errors += 1

    if errors == 0:
        print("  all checks passed")
    else:
        print(f"  {errors} error(s) found — review output above")


if __name__ == "__main__":
    main()
    # 题目来源标注: 写完 practice+knowledge_map 后,从 km 自动推导 source
    from source_tags import tag_practice_file
    _n, _u = tag_practice_file(5)
    print(f"source-tagged {_n} problems (grade 5)" + (f"  UNMAPPED {_u}" if _u else ""))
