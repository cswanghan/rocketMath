#!/usr/bin/env python3
"""Knowledge-map generator (人教版三年级数学).

Single source of truth for the topic graph. Each topic declares its pedagogy
(fluency vs procedure/formula/concept/logic/data), prerequisites, and whether
its content is ready yet. fluency topics link to a track in the fluency pack;
the rest will link to Practice problem sets (P0b+).

    python3 content/build_knowledge_map.py

Edit here + re-run; never hand-edit the JSON. See docs/knowledge-map-design.md.
"""
import json
import os

# topic tuple: (id, title, pedagogy, dependsOn[list], status, fluencyTrackId|None)
# status: 'ready' (content wired) | 'coming_soon' (planned P0b/P1/P2)
R = "ready"
S = "coming_soon"

UNITS = [
    # --- foundation (二年级口诀,已建,作为三年级地基) ---
    ("found", "upper", 0, "口算基础", [
        ("mult_facts", "乘法口诀", "fluency", [], R, "mult_facts"),
        ("div_facts", "除法口诀", "fluency", ["mult_facts"], R, "div_facts"),
    ]),
    # --- 上册 ---
    ("u1", "upper", 1, "时、分、秒", [
        ("read_clock", "认读钟表", "concept", [], S, None),
        ("time_conversion", "时分秒换算", "fluency", [], S, None),
        ("time_elapsed", "经过时间", "formula", ["time_conversion"], R, None, "time_elapsed"),
    ]),
    ("u2", "upper", 2, "万以内的加法和减法(一)", [
        ("add_sub_oral", "几百几十加减口算", "fluency", [], R, "add_sub_oral"),
        ("add_sub_estimate", "加减估算", "concept", ["add_sub_oral"], S, None),
    ]),
    ("u3", "upper", 3, "测量", [
        ("length_units", "长度单位认识(毫米/分米/千米)", "concept", [], S, None),
        ("length_conversion", "长度单位换算", "fluency", ["length_units"], S, None),
        ("mass_units", "质量单位认识(吨/千克/克)", "concept", [], S, None),
        ("mass_conversion", "质量单位换算", "fluency", ["mass_units"], S, None),
    ]),
    ("u4", "upper", 4, "万以内的加法和减法(二)", [
        ("add_column", "三位数加法竖式", "procedure", ["add_sub_oral"], R, None, "add_column"),
        ("sub_column", "三位数减法竖式", "procedure", ["add_column"], R, None, "sub_column"),
        ("add_sub_check", "加减法验算", "procedure", ["sub_column"], S, None),
    ]),
    ("u5", "upper", 5, "倍的认识", [
        ("times_concept", "倍的认识", "concept", ["mult_facts"], S, None),
        ("times_word", "倍数应用题", "formula", ["times_concept"], R, None, "times_word"),
    ]),
    ("u6", "upper", 6, "多位数乘一位数", [
        ("round_number_oral", "整十整百乘一位(口算)", "fluency", ["mult_facts"], R, "round_number_oral"),
        ("mul1_nocarry", "不进位乘竖式", "procedure", ["round_number_oral"], R, None, "mul1_nocarry"),
        ("mul1_carry", "进位乘竖式", "procedure", ["mul1_nocarry"], R, None, "mul1_carry"),
        ("mul1_zero", "因数中间末尾有0", "procedure", ["mul1_carry"], S, None),
    ]),
    ("u7", "upper", 7, "长方形和正方形", [
        ("quad_props", "四边形认识", "concept", [], S, None),
        ("perimeter_concept", "周长的认识", "concept", [], S, None),
        ("perimeter_formula", "长方形正方形周长", "formula", ["perimeter_concept"], R, None, "perimeter_formula"),
    ]),
    ("u8", "upper", 8, "分数的初步认识", [
        ("fraction_meaning", "几分之一·几分之几", "concept", [], S, None),
        ("fraction_compare", "分数比大小", "concept", ["fraction_meaning"], S, None),
        ("fraction_add_sub", "同分母分数加减", "concept", ["fraction_compare"], S, None),
    ]),
    ("u9", "upper", 9, "数学广角——集合", [
        ("sets", "集合(重叠问题)", "logic", [], S, None),
    ]),
    # --- 下册 ---
    ("l1", "lower", 1, "位置与方向(一)", [
        ("directions", "东南西北", "concept", [], S, None),
        ("route_map", "简单路线图", "logic", ["directions"], S, None),
    ]),
    ("l2", "lower", 2, "除数是一位数的除法", [
        ("div_oral", "口算除法", "fluency", ["div_facts"], S, None),
        ("div_estimate", "除法估算", "concept", ["div_oral"], S, None),
        ("div_column", "一位数除法竖式", "procedure", ["div_oral"], R, None, "div_column"),
        ("div_remainder", "有余数的除法", "procedure", ["div_column"], R, None, "div_remainder"),
    ]),
    ("l3", "lower", 3, "复式统计表", [
        ("read_table", "读复式统计表", "data", [], S, None),
    ]),
    ("l4", "lower", 4, "两位数乘两位数", [
        ("mul2_oral", "两位数乘整十(口算)", "fluency", ["mult_facts"], S, None),
        ("mul2_column", "两位数乘两位数竖式", "procedure", ["mul2_oral"], S, None),
    ]),
    ("l5", "lower", 5, "面积", [
        ("area_concept", "面积的认识", "concept", [], S, None),
        ("area_units", "面积单位(平方厘米/平方米)", "concept", ["area_concept"], S, None),
        ("area_conversion", "面积单位换算", "fluency", ["area_units"], S, None),
        ("area_formula", "长方形正方形面积", "formula", ["area_units"], R, None, "area_formula"),
    ]),
    ("l6", "lower", 6, "年、月、日", [
        ("month_days", "大小月·平闰年", "concept", [], S, None),
        ("date_calc", "年月日计算", "logic", ["month_days"], S, None),
        ("hour24", "24时计时法", "concept", [], S, None),
    ]),
    ("l7", "lower", 7, "小数的初步认识", [
        ("decimal_meaning", "小数的认识", "concept", [], S, None),
        ("decimal_compare", "小数比大小", "concept", ["decimal_meaning"], S, None),
        ("decimal_add_sub", "简单小数加减", "concept", ["decimal_compare"], S, None),
    ]),
    ("l8", "lower", 8, "数学广角——搭配", [
        ("combination", "搭配(组合)", "logic", [], S, None),
    ]),
]


def build():
    units = []
    topics = []
    for unit_id, term, index, title, topic_specs in UNITS:
        topic_ids = []
        for spec in topic_specs:
            tid, ttitle, pedagogy, deps, status, track = spec[:6]
            pset = spec[6] if len(spec) > 6 else None
            topic_ids.append(tid)
            topic = {
                "id": tid,
                "unitId": unit_id,
                "title": ttitle,
                "pedagogy": pedagogy,
                "dependsOn": deps,
                "status": status,
            }
            if track:
                topic["fluencyTrackId"] = track
            if pset:
                topic["problemSetId"] = pset
            topics.append(topic)
        units.append({"id": unit_id, "term": term, "index": index, "title": title, "topicIds": topic_ids})
    return {"textbook": "人教版", "grade": 3, "units": units, "topics": topics}


def main():
    m = build()
    out = os.path.join(os.path.dirname(__file__), "grade3_knowledge_map.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write("\n")
    ready = [t for t in m["topics"] if t["status"] == "ready"]
    print(f"wrote {out}")
    print(f"  units={len(m['units'])}  topics={len(m['topics'])}  ready={len(ready)}")
    by_ped = {}
    for t in m["topics"]:
        by_ped[t["pedagogy"]] = by_ped.get(t["pedagogy"], 0) + 1
    print(f"  pedagogy: {by_ped}")


if __name__ == "__main__":
    main()
