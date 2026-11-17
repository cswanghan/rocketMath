#!/usr/bin/env python3
"""Deterministic supplemental oral-math questions for grades 3 and 5–9.

Keep the existing small fact-recall introductions; diversify the application
pools without moving, replacing or renumbering any previously learned fact.
The grade generators call expand_tracks; no runtime engine changes are needed.
"""
from collections import Counter
from copy import deepcopy
from hashlib import sha256
from math import gcd


def _candidates(grade, track, level):
    """Yield (prompt, answer) in a fixed pedagogical order; no random generation."""
    i = ord(level) - ord('A')
    if grade == 3:
        if track == 'round_number_oral':
            bounds = [(2, 6, 10), (6, 10, 10), (1, 6, 100), (6, 10, 100)][i]
            for a in range(bounds[0], bounds[1]):
                for b in range(2, 10):
                    yield f'{a * bounds[2]} × {b}', a * bounds[2] * b
        elif track == 'add_sub_oral':
            for a in range(2, 10):
                for b in range(1, 10):
                    if i in (0, 2) and a + b <= 10:
                        unit = 10 if i == 0 else 100
                        yield f'{a*unit} + {b*unit}', (a+b)*unit
                    elif i in (1, 3) and a > b:
                        unit = 10 if i == 1 else 100
                        yield f'{a*unit} - {b*unit}', (a-b)*unit
                    elif i == 4:
                        yield f'{a*100+20} + {b*10}', a*100+20+b*10
                    elif i == 5 and b <= 8:
                        yield f'{a*100+80} - {b*10}', a*100+80-b*10
                    elif i == 6:
                        left, right = 10*a+7, 10*b+6
                        if left+right < 100:
                            yield f'{left} + {right}', left+right
                    elif i == 7 and a > b:
                        left, right = 10*a+2, 10*b+7
                        yield f'{left} - {right}', left-right
    elif grade == 5:
        if track == 'equation_oral':
            for x in range(2, 26):
                for a in range(2, 10):
                    if i == 0: yield f'x + {a} = {x+a}', x
                    elif i == 1 and x > a: yield f'x - {a} = {x-a}', x
                    elif i == 2 and x <= 12: yield f'{a}x = {a*x}', x
                    elif i == 3: yield f'x ÷ {a} = {x}', a*x
                    elif i == 4:
                        yield f'{a}x + {a+1} = {a*x+a+1}', x
                        yield f'{a}x - {a+1} = {a*x-a-1}', x
                    elif i == 5:
                        yield f'{a*x+12} - {a}x = 12', x
                        yield f'{a*x} ÷ x = {a}', x
        elif track == 'polygon_area_oral':
            for a in range(3, 16):
                for b in range(2, 10):
                    if i in (0, 3): yield f'平行四边形,底 {a},高 {b},面积 = ?', a*b
                    if i in (1, 3) and a*b % 2 == 0:
                        yield f'三角形,底 {a},高 {b},面积 = ?', a*b//2
                    if i in (2, 3):
                        yield f'梯形,上底 {a},下底 {a+2},高 {b},面积 = ?', (a+1)*b
        elif track == 'factor_multiple_oral':
            for a in range(2, 25):
                for b in range(2, 13):
                    if i in (0, 1) and a <= (9 if i == 0 else 12):
                        yield f'{a*b} ÷ {b} = ?', a
                    elif i == 2: yield f'{a*2} 和 {a*3} 的最大公因数 = ?', a
                    elif i == 3:
                        yield f'{a} 和 {b} 的最小公倍数 = ?', a*b//gcd(a,b)
        elif track == 'cuboid_calc':
            for a in range(1, 10):
                if i == 0:
                    yield f'正方体,棱长 {a},体积 = ?', a**3
                    yield f'正方体,体积 {a**3},棱长 = ?', a
                elif i == 2:
                    yield f'正方体,棱长 {a},表面积 = ?', 6*a*a
                    yield f'正方体,表面积 {6*a*a},棱长 = ?', a
                else:
                    for b in range(2, 7):
                        c = 2 + (a+b) % 4
                        if i == 1: yield f'长方体,长 {a} 宽 {b} 高 {c},体积 = ?', a*b*c
                        else: yield f'长方体,长 {a} 宽 {b} 高 {c},表面积 = ?', 2*(a*b+a*c+b*c)
    elif grade == 6:
        if track == 'fraction_of_int':
            pairs = [[(1,d) for d in range(2,6)], [(2,3),(3,4),(2,5),(4,5)],
                     [(1,d) for d in range(6,10)], [(3,7),(5,6),(2,9),(4,7)],
                     [(5,8),(3,10),(7,8),(5,12)], [(7,10),(3,8),(9,10),(5,6)]][i]
            for q in range(1, 13):
                for n,d in pairs: yield f'{n}/{d} × {q*d} = ?', n*q
        elif track == 'fraction_div_int':
            for q in range(1, 11):
                for n,d in [[(2,3),(3,4),(4,5),(5,6)],[(3,5),(3,4),(7,8),(4,5)],
                            [(6,7),(9,10),(5,6),(7,9)],[(9,10),(7,8),(2,5),(3,8)]][i]:
                    yield f'{q*n} ÷ ({n}/{d}) = ?', q*d
        elif track == 'percent_convert':
            for p in [[50,25,10,20],[75,30,40,60],[15,35,45,5],[125,80,12,150]][i]:
                for k in range(10, 201, 5):
                    if p*k%100 == 0: yield f'{p}% × {k} = ?', p*k//100
        elif track == 'ratio_oral':
            for q in range(2, 16):
                for b in [[2,3,4,5],[6,7,8,9],[1,2,5,7],[12,14,16,25]][i]:
                    yield f'{q*b} : {b} 的比值 = ?', q
    elif grade == 7:
        if track == 'rational_add_sub':
            for a in range(2+i*2, 13+i*2):
                for b in range(1, 11):
                    if i == 0: yield f'(-{a}) + {b} = ?', -a+b
                    elif i == 1: yield f'(-{a}) + (-{b}) = ?', -a-b
                    elif i == 2: yield f'({a}) - (-{b}) = ?', a+b
                    else: yield f'{a} + (-{b+3}) + {b%4} = ?', a-b-3+b%4
        elif track == 'rational_mul_div':
            for a in range(2, 10):
                for b in range(2, 10):
                    if i == 0: yield f'(-{a}) × {b} = ?', -a*b
                    elif i == 1: yield f'(-{a}) × (-{b}) = ?', a*b
                    elif i == 2: yield f'(-{a*b}) ÷ {b} = ?', -a
                    else: yield f'(-{a*b}) ÷ (-{b}) = ?', a
        elif track == 'rational_power':
            for a in range(1, [7,10,8,11][i]):
                for exponent in ([2,3],[2,3,4],[4,5,6],[3,4,5,6])[i]:
                    for sign in (-1,1):
                        value = (sign*a)**exponent
                        if abs(value) <= [125,512,1024,4096][i]:
                            yield f'({sign*a})^{exponent} = ?', value
        elif track == 'monomial_eval':
            for x in range(-4, 5):
                for a in range(2, 6):
                    if i == 0: yield f'当 x = {x} 时，{a}x = ?', a*x
                    elif i == 1: yield f'当 x = {x} 时，{a}x² = ?', a*x*x
                    elif i == 2: yield f'当 x = {x} 时，{a}x³ = ?', a*x**3
                    else: yield f'当 x = {x} 时，{a}x²+x = ?', a*x*x+x
    elif grade == 8:
        if track == 'power_rules':
            for a in range(1, 9):
                for b in range(2, 9):
                    if i in (0,1): yield f'a^{a} · a^{b} = a^?  (填指数)', a+b
                    elif i in (2,5): yield f'(a^{a})^{b} = a^?  (填指数)', a*b
                    elif i == 3 and a**b <= 512: yield f'{a}^{b} = ?', a**b
                    elif i == 4 and a>b: yield f'a^{a} ÷ a^{b} = a^?  (填指数)', a-b
        elif track == 'pythagorean_triple':
            triples = [(3,4,5),(5,12,13),(8,15,17)] if i < 2 else [(7,24,25),(20,21,29),(9,40,41),(12,35,37)]
            for scale in range(1,7):
                for a,b,c in triples:
                    a,b,c = a*scale,b*scale,c*scale
                    if i in (0,2):
                        yield f'直角三角形两直角边为 {a} 和 {b},斜边 = ?', c
                    else:
                        yield f'直角三角形斜边为 {c},一直角边为 {a},另一直角边 = ?', b
                        yield f'直角三角形斜边为 {c},一直角边为 {b},另一直角边 = ?', a
        elif track == 'linear_func_val':
            for x in range(1 if i == 0 else -4, 9):
                for a in ([2,3,4] if i == 0 else [-3,-2,2,3]):
                    b = 2*i+1
                    yield f'y = {a}x + {b},当 x = {x} 时,y = ?', a*x+b
        elif track == 'triangle_angles':
            for a in range(20+i*5, 81, 5):
                for b in range(25, 96, 5):
                    if a+b < 180:
                        if i < 2: yield f'三角形两内角分别为 {a}° 和 {b}°,第三个内角 = ?°', 180-a-b
                        else: yield f'三角形某外角的两个不相邻内角为 {a}° 和 {b}°,该外角 = ?°', a+b
        elif track == 'mean_median':
            for mid in range(4+i*4, 20+i*4):
                # Unsorted, asymmetric data requires identifying the statistic,
                # rather than always taking the middle displayed number.
                data = [mid+3,mid-2,mid+1,mid-3,mid+1]
                yield f'数据 [{", ".join(map(str,data))}],平均数 = ?', mid
                data = [mid+4,mid-2,mid,mid+2,mid-1]
                yield f'数据 [{", ".join(map(str,data))}],中位数 = ?', mid
    elif grade == 9:
        if track == 'quadratic_roots':
            for p in range(1,10):
                for q in range(p+1,13):
                    left,right = (p,q) if i < 3 else (-q,p)
                    b,c = -left-right,left*right
                    expression = f'x²{b:+d}x{c:+d}=0'
                    ask = ['两根之和','两根之积','较小根','两根之和','两根之积','较大根'][i]
                    answer = [left+right,left*right,min(left,right),left+right,left*right,max(left,right)][i]
                    yield f'{expression} {ask} = ?', answer
        elif track == 'quadratic_fn_vertex':
            for h in range(-6,7):
                for k in range(-6,7):
                    if i < 2:
                        expr = f'y=(x{-h:+d})²{k:+d}'
                    else: expr = f'y=x²{-2*h:+d}x{h*h+k:+d}'
                    ask = '对称轴 x' if i%2 == 0 else '顶点纵坐标'
                    yield f'{expr}  {ask} = ?', h if i%2 == 0 else k
        elif track == 'special_angle_trig' and i >= 2:
            for n in range(2,25):
                if i == 2:
                    yield f'直角△斜边={2*n},∠A=30°,A的对边={2*n}×sin30°=?', n
                    yield f'直角△斜边={2*n},∠A=60°,A的邻边={2*n}×cos60°=?', n
                else: yield f'直角△邻边={n},∠A=45°,对边={n}×tan45°=?', n
        elif track == 'probability_count':
            for n in range(6+i*4,25+i*4):
                if i == 0:
                    yield f'从1~{n}中随机取一数\n取到偶数的有利结果有几个?', n//2
                elif i == 1:
                    yield f'一个装有{n}个红球{n//2}个白球的袋子,随机摸一个\n有利结果(摸到红球)有几种?', n
                elif i == 2:
                    yield f'从1~{n}中随机取一数\n取到3的倍数的有利结果有几个?', n//3
                else:
                    yield f'分别从编号1~{n}和编号1~2的两组卡片中各抽一张\n全部等可能的编号组合有几种?', n*2
        elif track == 'similar_ratio':
            for unit in range(1,13):
                for a,b in ([(2,1),(3,1),(4,1)] if i<2 else [(3,2),(4,3),(5,2),(5,3)]):
                    if i%2 == 0: yield f'两相似△相似比 {a}:{b},较大对应边={a*unit},\n较小对应边 = ?', b*unit
                    else: yield f'两相似△相似比 {a}:{b},较小对应边={b*unit},\n较大对应边 = ?', a*unit


def expand_tracks(grade, tracks):
    """Add 12 distinct examples to each selected four-question pool.

    Select the least-represented answer first so additional examples break the
    old answer concentration. Hash-based IDs stay stable if candidates change.
    Existing facts (including old duplicate prompts) are never edited.
    """
    tracks = deepcopy(tracks)
    for track in tracks:
        tid = track['trackId']
        if grade == 3 and tid in ('mult_facts','div_facts'): continue
        used = {f['prompt'] for level in track['levels'] for f in level['new_facts']}
        for level in track['levels']:
            if grade == 9 and tid == 'special_angle_trig' and level['level'] in ('A','B'): continue
            facts = level['new_facts']
            frequencies = Counter(f['answer'] for f in facts)
            candidates = list(dict.fromkeys(_candidates(grade,tid,level['level'])))
            while len(facts) < 16:
                available = [(prompt,answer) for prompt,answer in candidates if prompt not in used]
                if not available: raise ValueError(f'Insufficient candidates: grade {grade} {tid}/{level["level"]}')
                prompt, answer = min(available, key=lambda item: frequencies[item[1]])
                if not isinstance(answer,int) or abs(answer)>9999: raise ValueError(prompt)
                fid = f'g{grade}_{tid}_{level["level"].lower()}_v2_{sha256(prompt.encode()).hexdigest()[:12]}'
                facts.append({'id':fid,'prompt':prompt,'answer':answer,'learningType':facts[0]['learningType']})
                used.add(prompt); frequencies[answer] += 1
    return tracks


def fluency_only_cli(grade, build):
    """Opt-in command path that cannot rewrite unrelated practice/map packs."""
    import json
    from pathlib import Path
    import sys
    if '--fluency-only' not in sys.argv[1:]:
        return
    if sys.argv[1:] != ['--fluency-only']:
        raise SystemExit('Usage: --fluency-only (no other arguments)')
    pack = build()
    target = Path(__file__).resolve().parent / f'grade{grade}_math_fluency_pack.json'
    target.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + '\n')
    count = sum(len(level['new_facts']) for track in pack['tracks'] for level in track['levels'])
    print(f'wrote {target.name}: {count} oral questions; practice/map unchanged')
    raise SystemExit(0)
