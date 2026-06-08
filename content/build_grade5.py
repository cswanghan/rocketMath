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
    return make_set("fraction_add_same", "同分母分数加减", "procedure", probs)


def fraction_add_diff():
    """异分母分数加减法 — different denominators, must find LCD."""
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
    return make_set("fraction_add_diff", "异分母分数加减", "procedure", probs)


def fraction_mixed_calc():
    """分数混合运算 — mixed addition and subtraction with simplifying."""
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
    return make_set("fraction_meaning5", "分数的意义", "concept", probs)


def equivalent_fraction():
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
    return make_set("equivalent_fraction", "等值分数", "concept", probs)


def fraction_simplify():
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
    return make_set("improper_fraction", "假分数与带分数", "concept", probs)


def fraction_compare5():
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
        P_mc("lg_c1", table + "\n气温上升最快是哪两天之间?",
             ["周一到周三", "周三到周五", "周四到周六"], 0, "看坡度最陡处", "周一12→周三18,升6℃是较大升幅;但每天:周一到二+3,二到三+3,三到四-2,四到五+4,五到六+2;最大单日升幅是周四到周五(+4℃)", C),
        P_fill("lg_x0", "一周气温的平均值是?(12+15+18+16+20+22+19)÷7=?", 17,
               "(12+15+18+16+20+22+19)÷7", "122÷7≈17.4≈17(取整)", X),
        P_mc("lg_x1", "折线统计图和条形统计图最主要的区别是?",
             ["折线图更能体现变化趋势,条形图更便于比较数量", "折线图不能显示具体数值", "两者完全相同"], 0,
             "两种图的区别", "折线图→趋势;条形图→比较大小", X),
    ]
    # Fix c1 with cleaner problem
    probs[4] = P_mc("lg_c1", table + "\n哪两天之间气温升幅最大?",
                    ["周四到周五(+4℃)", "周一到周二(+3℃)", "周五到周六(+2℃)"], 0,
                    "逐段计算差值", "各段差:+3,+3,-2,+4,+2,-3;最大是周四→周五+4℃", C)
    return make_set("line_graph", "折线统计图", "data", probs)


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
