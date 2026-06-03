#!/usr/bin/env python3
"""Content pack generator for the Grade-3 math fluency trainer.

This is the single source of truth for *what* gets taught. The engine is
content-agnostic: to change pacing, add facts, or add a whole track, edit
THIS file and re-run it — never hand-edit the JSON.

    python3 content/build_content_pack.py

Contract (see SPEC.md §4):
  - tracks[].levels[] declare ONLY `new_facts`.
  - orbit/universe pools are DERIVED by the engine from `interleave_rules`,
    they are NOT enumerated here.
  - engine_config carries the mastery thresholds, latency gate, correction
    loop, milestone races and the individualized-goal probe config.
"""
import json
import os
import string

LEVEL_LETTERS = list(string.ascii_uppercase)  # A, B, C, ...


def fact(a, b, op, learning_type):
    """Build one fact. `answer` is computed here so the JSON is always
    internally consistent; the engine re-validates it at load time."""
    if op == "x":
        answer = a * b
        prompt = f"{a} × {b}"            # a × b
        fid = f"mult_{a}x{b}"
    elif op == "div":
        # a ÷ b : we pass the dividend/divisor directly
        answer = a // b
        prompt = f"{a} ÷ {b}"            # a ÷ b
        fid = f"div_{a}d{b}"
    else:
        raise ValueError(f"unknown op {op}")
    return {
        "id": fid,
        "prompt": prompt,
        "answer": answer,
        "learningType": learning_type,
    }


def oral_fact(a, b, op):
    """Mental add/sub fact, e.g. 300 + 400 = 700 / 560 - 30 = 530."""
    if op == "+":
        answer = a + b
        prompt = f"{a} + {b}"
        fid = f"add_{a}p{b}"
    elif op == "-":
        answer = a - b
        prompt = f"{a} - {b}"
        fid = f"sub_{a}m{b}"
    else:
        raise ValueError(op)
    return {"id": fid, "prompt": prompt, "answer": answer, "learningType": "fact_recall"}


def pattern_fact(a, b):
    """Round-number oral math, e.g. 20 × 3 = 60 / 200 × 3 = 600.
    These are `pattern` facts: 'think the table fact, then append zeros',
    NOT rote memorisation (see SPEC §5 correction-loop note)."""
    answer = a * b
    prompt = f"{a} × {b}"
    fid = f"round_{a}x{b}"
    return {"id": fid, "prompt": prompt, "answer": answer, "learningType": "pattern"}


# --- mult_facts: 18 levels A–R, ~4 new facts each, progressive ramp ----------
# Pedagogical order: easy anchors (2s, 5s) -> 3s/4s -> hard core (6–9) ->
# 10s -> 1s -> remaining fill-ins. Each fact is introduced exactly once.
MULT_LEVELS = [
    [(2, 2), (2, 3), (2, 4), (2, 5)],   # A
    [(2, 6), (2, 7), (2, 8), (2, 9)],   # B
    [(5, 2), (5, 3), (5, 4), (5, 5)],   # C
    [(5, 6), (5, 7), (5, 8), (5, 9)],   # D
    [(3, 2), (3, 3), (3, 4), (3, 5)],   # E
    [(3, 6), (3, 7), (3, 8), (3, 9)],   # F
    [(4, 2), (4, 3), (4, 4), (4, 5)],   # G
    [(4, 6), (4, 7), (4, 8), (4, 9)],   # H
    [(6, 6), (6, 7), (6, 8), (6, 9)],   # I
    [(7, 6), (7, 7), (7, 8), (7, 9)],   # J
    [(8, 6), (8, 7), (8, 8), (8, 9)],   # K
    [(9, 6), (9, 7), (9, 8), (9, 9)],   # L
    [(10, 2), (10, 3), (10, 4), (10, 5)],  # M
    [(10, 6), (10, 7), (10, 8), (10, 9)],  # N
    [(1, 6), (1, 7), (1, 8), (1, 9)],   # O
    [(6, 2), (6, 3), (6, 4), (6, 5)],   # P
    [(7, 2), (7, 3), (7, 4), (7, 5)],   # Q
    [(8, 2), (8, 3), (8, 4), (8, 5)],   # R
]

# --- div_facts: inverse of the early multiplication anchors (M6, disabled) ---
DIV_LEVELS = [
    [(4, 2), (6, 2), (8, 2), (10, 2)],   # A : ÷2
    [(12, 2), (14, 2), (16, 2), (18, 2)],  # B : ÷2
    [(10, 5), (15, 5), (20, 5), (25, 5)],  # C : ÷5
    [(30, 5), (35, 5), (40, 5), (45, 5)],  # D : ÷5
    [(6, 3), (9, 3), (12, 3), (15, 3)],   # E : ÷3
    [(8, 4), (12, 4), (16, 4), (20, 4)],   # F : ÷4
]

# --- add_sub_oral: mental addition/subtraction within 10000 (人教版 U2) -------
# Progressive: 整十/整百加减 -> 几百几十 -> 两位数进退位 -> 三位数.
ADD_SUB_LEVELS = [
    [(20, 30, "+"), (40, 50, "+"), (60, 30, "+"), (70, 20, "+")],   # A 整十加
    [(80, 30, "-"), (90, 40, "-"), (70, 50, "-"), (60, 20, "-")],   # B 整十减
    [(300, 400, "+"), (500, 200, "+"), (600, 300, "+"), (200, 700, "+")],  # C 整百加
    [(800, 300, "-"), (900, 500, "-"), (700, 400, "-"), (600, 200, "-")],  # D 整百减
    [(230, 40, "+"), (350, 60, "+"), (520, 70, "+"), (640, 50, "+")],  # E 几百几十+几十
    [(450, 30, "-"), (560, 40, "-"), (780, 50, "-"), (630, 20, "-")],  # F 几百几十-几十
    [(25, 17, "+"), (38, 26, "+"), (47, 28, "+"), (56, 35, "+")],   # G 两位进位加
    [(62, 28, "-"), (73, 47, "-"), (84, 56, "-"), (91, 38, "-")],   # H 两位退位减
]

# --- round_number_oral: integer-ten/hundred oral math (M6, disabled) ---------
ROUND_LEVELS = [
    [(20, 3), (30, 4), (40, 2), (50, 6)],   # A
    [(60, 7), (70, 8), (80, 9), (90, 3)],   # B
    [(200, 3), (300, 4), (400, 2), (500, 6)],  # C
    [(600, 7), (700, 8), (800, 9), (900, 3)],  # D
]


def build_levels(level_specs, op, learning_type):
    levels = []
    for i, pairs in enumerate(level_specs):
        new_facts = []
        for spec in pairs:
            if op == "round":
                new_facts.append(pattern_fact(spec[0], spec[1]))
            elif op == "addsub":
                new_facts.append(oral_fact(spec[0], spec[1], spec[2]))
            else:
                new_facts.append(fact(spec[0], spec[1], op, learning_type))
        levels.append({"level": LEVEL_LETTERS[i], "new_facts": new_facts})
    return levels


def build_pack():
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
        # The engine DERIVES the actual fact pools from these rules.
        "interleave_rules": {
            "take_off_pool": "current_level.new_facts",
            "orbit_pool": "current_level.new_facts ∪ previous_level.new_facts",
            "universe_pool": "union(A..current_level).new_facts",
            "recent_miss_weight": 3,
        },
        "milestone_races": {
            "duration_seconds": 60,
            "positions_percent": [25, 50, 75, 100],
        },
        "individualized_goal": {
            "probe_problem_count": 10,
            "latency_multiplier": 2.5,
            "min_gate_seconds": 2.0,
            "max_gate_seconds": 6.0,
        },
        # Anti-fatigue guardrail (SPEC §7): after `play_minutes` of active play,
        # force a `break_minutes` rest. Configurable; flip `enabled` to disable.
        "time_lock": {
            "enabled": True,
            "play_minutes": 15,
            "break_minutes": 20,
        },
    }

    tracks = [
        {
            "trackId": "mult_facts",
            "name": "乘法口诀",  # 乘法口诀
            "enabled": True,
            "levels": build_levels(MULT_LEVELS, "x", "fact_recall"),
        },
        {
            "trackId": "div_facts",
            "name": "除法口诀",  # 除法口诀
            "enabled": True,
            "levels": build_levels(DIV_LEVELS, "div", "fact_recall"),
        },
        {
            "trackId": "round_number_oral",
            "name": "整十整百口算",  # 整十整百口算
            "enabled": True,
            "levels": build_levels(ROUND_LEVELS, "round", "pattern"),
        },
        {
            "trackId": "add_sub_oral",
            "name": "万以内加减口算",  # 万以内加减口算
            "enabled": True,
            "levels": build_levels(ADD_SUB_LEVELS, "addsub", "fact_recall"),
        },
    ]

    # things the engine must NOT turn into timed drills (SPEC §2 non-goals)
    non_drill_topics = [
        "multi_digit_multiplication_column",
        "multi_digit_division_column",
        "area",
        "fractions",
        "calendar_date_math",
    ]

    return {
        "version": "1.0.0",
        "grade": 3,
        "subject": "math_fluency",
        "engine_config": engine_config,
        "tracks": tracks,
        "non_drill_topics": non_drill_topics,
    }


def main():
    pack = build_pack()
    out = os.path.join(os.path.dirname(__file__), "grade3_math_fluency_pack.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(pack, f, ensure_ascii=False, indent=2)
        f.write("\n")
    n_facts = sum(len(l["new_facts"]) for t in pack["tracks"] for l in t["levels"])
    print(f"wrote {out}")
    print(f"  tracks={len(pack['tracks'])}  facts={n_facts}")
    for t in pack["tracks"]:
        print(f"  - {t['trackId']:18s} enabled={t['enabled']!s:5s} levels={len(t['levels'])}")


if __name__ == "__main__":
    main()
