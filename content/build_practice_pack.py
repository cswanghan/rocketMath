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
