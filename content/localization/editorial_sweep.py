#!/usr/bin/env python3
"""Apply narrow, reviewed editorial conventions; never substitute numeric values."""
import json,re
from verify_english import ROOT,leaves,CJK
p=ROOT/'content/localization/reviewed.json';reviewed=json.loads(p.read_text())
memory=json.loads((ROOT/'content/localization/en.json').read_text());memory.update(reviewed)
for source,target in memory.items():
    original=target
    for ch,roman,label in [('甲','Jia','A'),('乙','Yi','B'),('丙','Bing','C'),('丁','Ding','D'),('戊','Wu','E')]:
        if ch in source:target=re.sub(r'\b'+roman+r'\b',label,target)
    if re.search(r'π取\s*3\.14(?!\d)',source):
        target=re.sub(r'Use π\s*=\s*3\.14(?!\d)','Use 3.14 for π',target)
    for numeral,digit,word in zip('一二三四五六七八九',range(1,10),['One','Two','Three','Four','Five','Six','Seven','Eight','Nine']):
        if numeral+'班' in source:target=re.sub(r'\bClass '+str(digit)+r'\b','Class '+word,target)
        if numeral+'年级' in source and source != numeral+'年级':target=re.sub(r'\bGrade '+str(digit)+r'\b','Grade '+word,target)
    if '立体' in source:target=re.sub(r'\b3D\b','solid',target)
    for plural,singular in [('people','person'),('children','child'),('boxes','box'),('vertices','vertex')]:
        target=re.sub(r'\b1 '+plural+r'\b','1 '+singular,target)
    if '吨' in source:
        target=re.sub(r'\btons\b','tonnes',target,flags=re.I)
        target=re.sub(r'\bton\b','tonne',target,flags=re.I)
    # Chinese punctuation is converted only inside translated linguistic strings.
    target=target.translate(str.maketrans({'，':',','。':'.','、':', ','：':':','；':';','？':'?','！':'!'}))
    if target!=original:reviewed[source]=target
# Source labels use exactly the same names as the map/set/grade, avoiding
# inconsistent synonyms from translating a concatenated label independently.
for path in sorted((ROOT/'content').glob('grade*_practice_pack.json')):
    for problem_set in json.loads(path.read_text())['sets']:
        for problem in problem_set['problems']:
            source=problem.get('source')
            if not source:continue
            components=[source.get(k) for k in ['edition','gradeLabel','unit','topic']]
            components=[s for s in components if s]
            if all(not CJK.search(s) or s in memory for s in components):
                reviewed[source['label']]=' · '.join(memory.get(s,s) for s in components)
p.write_text(json.dumps(reviewed,ensure_ascii=False,indent=2)+'\n')
print(f'{len(reviewed)} reviewed entries/conventions')
