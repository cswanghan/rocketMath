"""Independent content regression: exact answers, diversity and saved-progress IDs.

The oracle interprets the emitted problem text with rational arithmetic. It does
not import the candidate functions or use the stored answer in its computation.
"""
import ast
from collections import Counter
from copy import deepcopy
from fractions import Fraction
from hashlib import sha256
import importlib
import json
from math import gcd, isqrt
from pathlib import Path
import re
import statistics
import unittest

ROOT = Path(__file__).resolve().parent
GRADES = [3, 5, 6, 7, 8, 9]


def digest(value):
    return sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def arithmetic(text, x=0):
    text = text.replace('×','*').replace('÷','/').replace('^','**').replace('²','**2').replace('³','**3')
    text = re.sub(r'(\d)x',r'\1*x',text)
    def walk(node):
        if isinstance(node, ast.Constant) and type(node.value) is int: return Fraction(node.value)
        if isinstance(node, ast.Name) and node.id == 'x': return Fraction(x)
        if isinstance(node, ast.UnaryOp):
            if isinstance(node.op,ast.USub): return -walk(node.operand)
            if isinstance(node.op,ast.UAdd): return walk(node.operand)
        if isinstance(node, ast.BinOp):
            a,b = walk(node.left),walk(node.right)
            if isinstance(node.op,ast.Add): return a+b
            if isinstance(node.op,ast.Sub): return a-b
            if isinstance(node.op,ast.Mult): return a*b
            if isinstance(node.op,ast.Div): return a/b
            if isinstance(node.op,ast.Pow) and b.denominator == 1: return a**int(b)
        raise AssertionError(f'Unsupported arithmetic: {text}')
    return walk(ast.parse(text.strip(),mode='eval').body)


def answer_from_prompt(prompt):
    # Equation solving is independent of the generator's known x parameter.
    if re.fullmatch(r'[\dx +×÷-]+ = -?\d+',prompt) and 'x' in prompt:
        left,right = prompt.split(' = ')
        if '÷ x' in left: return arithmetic(left.split('÷')[0])/arithmetic(right)
        b=arithmetic(left,0); a=arithmetic(left,1)-b
        return (arithmetic(right)-b)/a
    m=re.fullmatch(r'(\d+) ÷ \(?([0-9]+)/([0-9]+)\)? = \?',prompt)
    if m:
        a,n,d=map(int,m.groups());return Fraction(a)/Fraction(n,d)
    m=re.fullmatch(r'(\d+)% × (\d+) = \?',prompt)
    if m:return Fraction(int(m[1])*int(m[2]),100)
    m=re.fullmatch(r'(\d+) : (\d+) 的比值 = \?',prompt)
    if m:return Fraction(int(m[1]),int(m[2]))
    m=re.fullmatch(r'当 x = (-?\d+) 时，(.+) = \?',prompt)
    if m:return arithmetic(m[2],int(m[1]))
    m=re.fullmatch(r'y = (.+),当 x = (-?\d+) 时,y = \?',prompt)
    if m:return arithmetic(m[1],int(m[2]))
    if prompt.startswith(('平行四边形,','三角形,','梯形,')):
        n=list(map(int,re.findall(r'\d+',prompt)))
        if prompt.startswith('平行'): return n[0]*n[1]
        if prompt.startswith('三角'): return Fraction(n[0]*n[1],2)
        return Fraction((n[0]+n[1])*n[2],2)
    if prompt.startswith('正方体,'):
        n=int(re.search(r'\d+',prompt)[0])
        if '棱长 = ?' in prompt:
            if '表面积' in prompt:
                root=isqrt(n//6);assert 6*root*root==n;return root
            root=next(k for k in range(1,22) if k**3==n);return root
        return 6*n*n if '表面积' in prompt else n**3
    if prompt.startswith('长方体,'):
        a,b,c=map(int,re.findall(r'\d+',prompt))
        return 2*(a*b+a*c+b*c) if '表面积' in prompt else a*b*c
    if '最大公因数' in prompt or '最小公倍数' in prompt:
        a,b=map(int,re.findall(r'\d+',prompt))
        return gcd(a,b) if '最大' in prompt else a*b//gcd(a,b)
    if '填指数' in prompt:
        exponents=list(map(int,re.findall(r'\d+',prompt)))
        a,b=exponents
        if '·' in prompt:return a+b
        if '÷' in prompt:return a-b
        return a*b
    if prompt.startswith('直角三角形'):
        a,b=map(int,re.findall(r'\d+',prompt))
        square=a*a-b*b if '另一直角边' in prompt else a*a+b*b
        root=isqrt(square);assert root*root==square;return root
    if prompt.startswith('三角形两内角'):
        a,b=map(int,re.findall(r'\d+',prompt));return 180-a-b
    if prompt.startswith('三角形某外角'):
        a,b=map(int,re.findall(r'\d+',prompt));return a+b
    if prompt.startswith('数据 ['):
        data=json.loads(prompt[len('数据 '):prompt.index(']')+1])
        return Fraction(sum(data),len(data)) if '平均数' in prompt else statistics.median(data)
    if prompt.startswith('x²'):
        equation,ask=prompt.split(' ',1)
        m=re.fullmatch(r'x²([+-]\d+)x([+-]\d+)=0',equation);assert m
        b,c=map(int,m.groups());d=b*b-4*c;root=isqrt(d);assert root*root==d
        roots=[Fraction(-b-root,2),Fraction(-b+root,2)]
        if '之和' in ask:return sum(roots)
        if '之积' in ask:return roots[0]*roots[1]
        return min(roots) if '小' in ask else max(roots)
    if prompt.startswith('y='):
        expr,ask=prompt[2:].split('  ',1)
        m=re.fullmatch(r'\(x([+-]\d+)\)²([+-]\d+)',expr)
        if m:h,k=-int(m[1]),int(m[2])
        else:
            m=re.fullmatch(r'x²([+-]\d+)x([+-]\d+)',expr);assert m
            b,c=map(int,m.groups());h=Fraction(-b,2);k=h*h+b*h+c
        return h if '对称轴' in ask else k
    if prompt.startswith('直角△'):
        value=int(re.search(r'=([0-9]+)',prompt)[1])
        if 'tan45' in prompt:return value
        assert 'sin30' in prompt or 'cos60' in prompt
        return Fraction(value,2)
    if prompt.startswith('从1~'):
        n=int(re.search(r'从1~(\d+)',prompt)[1])
        if '偶数' in prompt:return sum(x%2==0 for x in range(1,n+1))
        assert '3的倍数' in prompt
        return sum(x%3==0 for x in range(1,n+1))
    if prompt.startswith('一个装有'):
        return int(re.search(r'有(\d+)个红球',prompt)[1])
    if prompt.startswith('分别从编号'):
        a,b=map(int,re.findall(r'1~(\d+)',prompt));return len([(x,y) for x in range(1,a+1) for y in range(1,b+1)])
    if prompt.startswith('两相似△'):
        a,b,k=map(int,re.findall(r'\d+',prompt))
        return Fraction(k*b,a) if '较大对应边=' in prompt else Fraction(k*a,b)
    return arithmetic(prompt.split(' = ')[0])


class FluencyExpansionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.packs={g:json.loads((ROOT/f'grade{g}_math_fluency_pack.json').read_text()) for g in range(3,10)}

    def test_all_784_original_facts_and_progress_structure_preserved(self):
        fixtures=json.loads((ROOT/'fixtures/fluency_legacy_20261117.json').read_text())
        total=0
        for g,pack in self.packs.items():
            legacy=fixtures[str(g)]
            for old in legacy['levels']:
                track=next(t for t in pack['tracks'] if t['trackId']==old['trackId'])
                level=next(l for l in track['levels'] if l['level']==old['level'])
                original=[f for f in level['new_facts'] if f['id'] in old['ids']]
                self.assertEqual([f['id'] for f in original],old['ids'])
                self.assertEqual(digest(original),old['sha256'])
                total+=len(original)
            shape=deepcopy(pack);shape.pop('version')
            for t in shape['tracks']:
                for l in t['levels']:l['new_facts']=[]
            self.assertEqual(digest(shape),legacy['metadataSha256'])
        self.assertEqual(total,784)

    def test_every_added_answer_independently(self):
        total=0
        for g,pack in self.packs.items():
            for track in pack['tracks']:
                for level in track['levels']:
                    for fact in level['new_facts']:
                        if '_v2_' not in fact['id']:continue
                        with self.subTest(grade=g,question=fact['prompt']):
                            self.assertEqual(answer_from_prompt(fact['prompt']),fact['answer'])
                            self.assertIs(type(fact['answer']),int)
                            self.assertLessEqual(abs(fact['answer']),9999)
                        total+=1
        self.assertEqual(total,1272)

    def test_targeted_pools_have_varied_answers_without_duplicate_new_prompts(self):
        expanded=0
        for g in GRADES:
            for track in self.packs[g]['tracks']:
                all_facts=[f for l in track['levels'] for f in l['new_facts']]
                ids=[f['id'] for f in all_facts]
                self.assertEqual(len(ids),len(set(ids)))
                prompts=Counter(f['prompt'] for f in all_facts)
                for fact in all_facts:
                    if '_v2_' in fact['id']:self.assertEqual(prompts[fact['prompt']],1)
                for level in track['levels']:
                    if not any('_v2_' in f['id'] for f in level['new_facts']):continue
                    counts=Counter(f['answer'] for f in level['new_facts'])
                    self.assertEqual(len(level['new_facts']),16)
                    self.assertGreaterEqual(len(counts),6)
                    self.assertLessEqual(max(counts.values())/16,0.25)
                    expanded+=1
        self.assertEqual(expanded,106)

    def test_generators_match_checked_in_packs_and_are_repeatable(self):
        for g in GRADES:
            module=importlib.import_module('build_content_pack' if g==3 else f'build_grade{g}')
            build=module.build_pack if g==3 else module.build_fluency_pack
            first=build();second=build()
            self.assertEqual(first,second)
            self.assertEqual(first,self.packs[g])

    def test_oracle_catches_common_precedence_inverse_and_boundary_errors(self):
        self.assertEqual(answer_from_prompt('3 + (-7) + 4 = ?'),0)
        self.assertEqual(answer_from_prompt('12 ÷ 3/4 = ?'),16)
        self.assertEqual(answer_from_prompt('50 - 3x = 20'),10)
        self.assertEqual(answer_from_prompt('(-2)^3 = ?'),-8)
        self.assertEqual(answer_from_prompt('x²+1x-6=0 较大根 = ?'),2)
        self.assertEqual(answer_from_prompt('数据 [9, 2, 3, 5],中位数 = ?'),4)
        self.assertEqual(answer_from_prompt('从1~12中随机取一数\n取到3的倍数的有利结果有几个?'),4)


if __name__=='__main__':unittest.main()
