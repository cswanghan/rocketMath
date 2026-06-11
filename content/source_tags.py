#!/usr/bin/env python3
"""题目来源标注 (source tagging).

每道练习题打上「教材出处 + 知识点」来源,从 knowledge_map 自动推导:
  set.id  --(problemSetId)-->  topic  --(unitId)-->  unit
  source = { edition(人教版) · gradeLabel · unit · topic }

由各年级生成脚本在写完 practice_pack + knowledge_map 后调用 tag_practice_file(grade),
确保重新生成 (regen) 也不会丢标注。也可独立运行: python3 content/source_tags.py
"""
import json
import os

CONTENT_DIR = os.path.dirname(os.path.abspath(__file__))

GRADE_LABEL = {
    3: "三年级", 4: "四年级", 5: "五年级", 6: "六年级",
    7: "七年级", 8: "八年级", 9: "九年级",
}


def _load(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _dump(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def tag_practice_file(grade):
    """Read grade{N}_practice_pack.json + grade{N}_knowledge_map.json, stamp每题 source,
    rewrite the practice pack. Returns (tagged, untagged_sets)."""
    pk_path = os.path.join(CONTENT_DIR, f"grade{grade}_practice_pack.json")
    km_path = os.path.join(CONTENT_DIR, f"grade{grade}_knowledge_map.json")
    if not (os.path.exists(pk_path) and os.path.exists(km_path)):
        return (0, [])

    pk = _load(pk_path)
    km = _load(km_path)
    edition = km.get("textbook") or "人教版"
    glabel = GRADE_LABEL.get(grade, f"{grade}年级")
    units = {u["id"]: u.get("title") for u in km.get("units", [])}
    topic_by_set = {t.get("problemSetId"): t
                    for t in km.get("topics", []) if t.get("problemSetId")}

    tagged = 0
    untagged_sets = []
    for s in pk.get("sets", []):
        topic = topic_by_set.get(s["id"])
        unit_title = units.get(topic["unitId"]) if topic else None
        topic_title = (topic.get("title") if topic else None) or s.get("title")
        if topic is None:
            untagged_sets.append(s["id"])
        label = " · ".join(x for x in [edition, glabel, unit_title, topic_title] if x)
        src = {
            "edition": edition,
            "grade": grade,
            "gradeLabel": glabel,
            "unit": unit_title,
            "topic": topic_title,
            "label": label,
        }
        for p in s.get("problems", []):
            p["source"] = src
            tagged += 1

    _dump(pk_path, pk)
    return (tagged, untagged_sets)


def main():
    total = 0
    for g in (3, 4, 5, 6, 7, 8, 9):
        n, untagged = tag_practice_file(g)
        total += n
        warn = f"  ⚠ unmapped sets: {untagged}" if untagged else ""
        print(f"grade{g}: tagged {n} problems{warn}")
    print(f"TOTAL tagged: {total}")


if __name__ == "__main__":
    main()
