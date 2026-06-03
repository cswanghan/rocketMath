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


def build():
    return {
        "version": "1.0.0",
        "sets": [
            add_set(),
            sub_set(),
            mul_nocarry_set(),
            mul_carry_set(),
            div_set(),
            div_remainder_set(),
            # P1 formula
            perimeter_set(),
            area_set(),
            times_word_set(),
            time_elapsed_set(),
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
