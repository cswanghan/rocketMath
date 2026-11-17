#!/usr/bin/env python3
"""English practice generator (KET/PET 阅读·语法,非限时题集).

Generates content/english_practice_pack.json — a PracticePack consumed by the
same Practice engine as the math packs (MC problems). Used by the「我要备考」
prep checklist for Cambridge English exams (KET/PET), alongside the 背单词
module. Edit this file and re-run; never hand-edit the JSON.

    python3 content/build_english.py
"""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

from english_questions import EXTENSIONS

B, C, X = "basic", "consolidate", "challenge"


def P_mc(pid, prompt, opts, ci, hint, expl, diff=C):
    ch = [{"id": chr(97 + i), "label": str(l), "correct": i == ci} for i, l in enumerate(opts)]
    return {"id": pid, "type": "mc", "prompt": prompt, "difficulty": diff,
            "choices": ch, "hint": hint, "explanation": expl}


def make_set(setid, title, problems, max_tries=2):
    for pid, prompt, opts, hint, expl, difficulty in EXTENSIONS[setid]:
        problems.append(P_mc(pid, prompt, opts, 0, hint, expl, difficulty))
    # Both clients display the supplied order. Balance each difficulty tier,
    # rather than letting the first button answer every question. Keep option
    # IDs attached to their labels so historical choice records remain valid.
    for difficulty in (B, C, X):
        tier = [p for p in problems if p["difficulty"] == difficulty]
        tier.sort(key=lambda p: hashlib.sha256(p["id"].encode()).digest())
        for index, problem in enumerate(tier):
            correct = next(c for c in problem["choices"] if c["correct"])
            others = [c for c in problem["choices"] if not c["correct"]]
            others.sort(key=lambda c: hashlib.sha256((problem["id"] + c["id"]).encode()).digest())
            others.insert(index % 4, correct)
            problem["choices"] = others
    return {"id": setid, "title": title, "pedagogy": "concept", "maxTries": max_tries, "problems": problems}


def ket_grammar():
    p = [
        P_mc("keg_b0", "She ___ a teacher.", ["is", "are", "am", "be"], 0, "主语是 she,用 is", "She is a teacher.", B),
        P_mc("keg_b1", "描述你现在的日常习惯：I ___ to school every day.", ["go", "goes", "going", "went"], 0, "现在的日常习惯用一般现在时；主语 I 后用原形", "I go to school every day. went 是过去式，不符合题目要求的当前习惯。", B),
        P_mc("keg_b2", "There ___ two cats on the sofa.", ["are", "is", "am", "be"], 0, "two cats 是复数,用 are", "There are two cats.", B),
        P_mc("keg_c0", "He ___ football yesterday.", ["played", "plays", "play", "playing"], 0, "yesterday 是过去,用过去式", "He played football yesterday.", C),
        P_mc("keg_c1", "This is ___ apple.", ["an", "a", "some", "/"], 0, "apple 是以元音音素开头的单数可数名词", "an apple：一个苹果。单数可数名词不能直接裸用；a 用在辅音音素前。", C),
        P_mc("keg_c2", "My sister is taller ___ me.", ["than", "then", "as", "to"], 0, "比较级后用 than", "taller than me", C),
        P_mc("keg_c3", "用现在进行时描述眼前的动作：Look! They ___ now.", ["are running", "run", "runs", "ran"], 0, "现在进行时需要 be + 动词 -ing", "They are running now. they 是复数，用 are running。", C),
        P_mc("keg_x0", "___ you like coffee?", ["Do", "Does", "Are", "Is"], 0, "实义动词 like 的一般疑问用 Do", "Do you like coffee?", X),
        P_mc("keg_x1", "If it rains tomorrow, I ___ at home.", ["will stay", "stayed", "stays", "staying"], 0, "说的是明天可能发生的事情，主句需要完整的谓语", "I will stay at home. 这里用 will + 动词原形表达将来的决定。", X),
        P_mc("keg_x2", "She has lived here ___ 2010.", ["since", "for", "from", "at"], 0, "since + 时间点", "since 2010", X),
    ]
    return make_set("ket_grammar", "KET 基础语法", p)


def ket_reading():
    p = [
        P_mc("ker_b0", "标识「NO SMOKING」的意思是?", ["禁止吸烟", "请吸烟", "小心地滑", "保持安静"], 0, "no + 动名词 = 禁止", "禁止吸烟", B),
        P_mc("ker_b1", "门上写着「PUSH」,你应该?", ["推门", "拉门", "敲门", "锁门"], 0, "push 是推", "推门", B),
        P_mc("ker_b2", "商店门口「OPEN 9:00–18:00」表示?", ["营业时间 9 点到 18 点", "9 折优惠", "9 号开业", "停业"], 0, "open + 时间 = 营业时间", "营业时间 9:00–18:00", B),
        P_mc("ker_c0", "公园里「Keep off the grass」的意思是?", ["请勿践踏草坪", "保持草坪整洁", "在草坪上玩", "草坪出售"], 0, "keep off = 远离", "请勿践踏草坪", C),
        P_mc("ker_c1", "票上写「SOLD OUT」表示?", ["售罄", "打折", "免费", "预售"], 0, "sold out = 卖光了", "售罄", C),
        P_mc("ker_c2", "墙上的「EXIT」指示?", ["出口", "入口", "厕所", "电梯"], 0, "exit = 出口", "出口", C),
        P_mc("ker_c3", "图书馆里「Please be quiet」的意思是?", ["请保持安静", "请排队", "请关门", "请登记"], 0, "quiet = 安静", "请保持安静", C),
        P_mc("ker_x0", "广告「Buy one get one free」表示?", ["买一送一", "第二件半价", "全场免费", "买一付二"], 0, "get one free = 免费得一件", "买一送一", X),
        P_mc("ker_x1", "机器上贴「OUT OF ORDER」表示?", ["故障,停止使用", "正在营业", "免费使用", "请排队"], 0, "out of order = 出故障", "故障,停止使用", X),
        P_mc("ker_x2", "「Tickets must be bought before boarding」意思是?", ["上车前必须买票", "车上可以补票", "凭票免费", "禁止带票"], 0, "must be bought before boarding", "上车前必须买票", X),
    ]
    return make_set("ket_reading", "KET 标识与短文阅读", p)


def pet_grammar():
    p = [
        P_mc("peg_b0", "选择表示「已经」的词：I have ___ finished my homework.", ["already", "yet", "still", "ever"], 0, "肯定句中「已经」用 already", "have already finished 表示到现在已经完成。", B),
        P_mc("peg_b1", "This book is ___ than that one.", ["more interesting", "interestinger", "most interesting", "interesting"], 0, "多音节词比较级用 more", "more interesting than", B),
        P_mc("peg_b2", "He's the man ___ helped me.", ["who", "which", "whom", "what"], 0, "先行词是人作主语,用 who", "the man who helped me", B),
        P_mc("peg_c0", "表达与现在事实相反的假设：If I ___ rich, I would travel the world.", ["were", "am", "will be", "be"], 0, "与现在事实相反的虚拟,用 were", "If I were rich… 表示现在并不富有时的假设。", C),
        P_mc("peg_c1", "She asked me where I ___ when I was a child.", ["lived", "lives", "did lived", "living"], 0, "when I was a child 指已经过去的童年；从句用陈述语序", "where I lived when I was a child：问我小时候住在哪里。用 lived；不能用 did lived 或单独的 living。", C),
        P_mc("peg_c2", "The car ___ by my father every weekend.", ["is washed", "washes", "washed", "washing"], 0, "被动语态 be + 过去分词", "is washed", C),
        P_mc("peg_c3", "I'm looking forward to ___ you.", ["seeing", "see", "saw", "seen"], 0, "look forward to 的 to 是介词,后接动名词", "looking forward to seeing", C),
        P_mc("peg_x0", "You ___ smoke here. It's not allowed.", ["mustn't", "needn't", "don't have to", "can"], 0, "表示「禁止」用 mustn't", "mustn't smoke", X),
        P_mc("peg_x1", "The film began twenty minutes before we arrived. By the time we arrived, it ___.", ["had started", "was start", "starts", "has starting"], 0, "电影开始早于过去的到达时间", "the film had started：用 had + 过去分词表达发生在另一个过去动作之前的动作。", X),
        P_mc("peg_x2", "I'd rather ___ at home tonight.", ["stay", "to stay", "staying", "stayed"], 0, "would rather + 动词原形", "I'd rather stay", X),
    ]
    return make_set("pet_grammar", "PET 语法进阶", p)


def pet_reading():
    p = [
        P_mc("per_b0",
             "Tom usually walks to school, but when it rains he takes the bus.\n问:下雨时 Tom 怎么去上学?",
             ["坐公交车", "走路", "骑自行车", "坐爸爸的车"], 0, "when it rains he takes the bus", "下雨时坐公交", B),
        P_mc("per_b1",
             "The museum opens at 10 a.m. every day except Mondays, when it is closed.\n问:博物馆哪天不开门?",
             ["周一", "周日", "周末", "每天"], 0, "except Mondays, when it is closed", "周一闭馆", B),
        P_mc("per_c0",
             "Lucy bought the red dress because the blue one was too expensive.\n问:Lucy 为什么没买蓝裙子?",
             ["太贵了", "颜色不喜欢", "尺码不对", "卖完了"], 0, "the blue one was too expensive", "蓝裙子太贵", C),
        P_mc("per_c1",
             "The train to London leaves at 8:15. Please arrive ten minutes early.\n问:建议几点到车站?",
             ["8:05", "8:15", "8:25", "8:00"], 0, "ten minutes early = 提前十分钟", "8:15 提前 10 分钟 = 8:05", C),
        P_mc("per_c2",
             "Anna likes both swimming and reading, but her favourite hobby is painting.\n问:Anna 最喜欢的爱好是?",
             ["画画", "游泳", "阅读", "三个都是"], 0, "favourite hobby is painting", "画画", C),
        P_mc("per_x0",
             "The shop offers free delivery on orders over £20.\n问:怎样才能享受免费配送?",
             ["订单超过 20 英镑", "任何订单", "会员专享", "周末下单"], 0, "over 表示严格大于，不包括恰好 20", "订单金额必须超过 20 英镑；恰好 20 英镑不满足 over £20。", X),
        P_mc("per_x1",
             "Although it was raining, the children went outside to play.\n问:孩子们出去玩时天气如何?",
             ["在下雨", "晴天", "下雪", "刮风"], 0, "Although it was raining = 尽管在下雨", "下雨", X),
        P_mc("per_x2",
             "Sam can come on Friday or Saturday, but not Sunday.\n问:Sam 哪天不能来?",
             ["周日", "周五", "周六", "都能来"], 0, "but not Sunday", "周日不能来", X),
    ]
    return make_set("pet_reading", "PET 阅读理解", p)


def build():
    return {
        "version": "1.1.0",
        "subject": "english",
        "provenance": "原创分级练习；KET/PET 为学习路径标签，不是官方真题或预测题。",
        "sets": [ket_grammar(), ket_reading(), pet_grammar(), pet_reading()],
    }


def validate(pack):
    ids, prompts = set(), set()
    for problem_set in pack["sets"]:
        for p in problem_set["problems"]:
            assert p["id"] not in ids, f"duplicate id: {p['id']}"
            assert p["prompt"] not in prompts, f"duplicate prompt: {p['id']}"
            ids.add(p["id"])
            prompts.add(p["prompt"])
            assert len(p["choices"]) == 4
            assert len({c["label"].strip().casefold() for c in p["choices"]}) == 4
            assert sum(c["correct"] for c in p["choices"]) == 1
            assert p["hint"].strip() and p["explanation"].strip()
        for difficulty in (B, C, X):
            tier = [p for p in problem_set["problems"] if p["difficulty"] == difficulty]
            positions = Counter(next(i for i, c in enumerate(p["choices"]) if c["correct"]) for p in tier)
            assert len(tier) >= 8
            assert len(positions) == 4 and max(positions.values()) - min(positions.values()) <= 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify committed JSON without writing it")
    args = parser.parse_args()
    pack = build()
    validate(pack)
    out = Path(__file__).with_name("english_practice_pack.json")
    serialized = json.dumps(pack, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not out.exists() or out.read_text(encoding="utf-8") != serialized:
            raise SystemExit("English practice pack is stale; run python3 content/build_english.py")
    else:
        out.write_text(serialized, encoding="utf-8")
    n = sum(len(s["problems"]) for s in pack["sets"])
    print(f"{'checked' if args.check else 'wrote'} {out}")
    print(f"  sets={len(pack['sets'])}  problems={n}")
    for s in pack["sets"]:
        print(f"  - {s['id']:14s} {s['title']}  ({len(s['problems'])})")


if __name__ == "__main__":
    main()
