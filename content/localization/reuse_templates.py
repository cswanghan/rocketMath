#!/usr/bin/env python3
"""Reuse exact sentence templates only when ALL numeral positions match.

This produces drafts for the same review/validation gate as model translations.
No math is evaluated or changed. A source word/operator change prevents reuse.
"""
import json,re
from pathlib import Path
from draft_english import strings,ROOT
NUMBER=re.compile(r'\d+(?:\.\d+)?')

def reuse(memory,sources):
    templates={}
    for source,target in memory.items():
        original=NUMBER.findall(source)
        if original and original==NUMBER.findall(target):
            pattern=NUMBER.sub('{number}',source)
            templates.setdefault(pattern,(source,target))
    added={}
    for source in sources:
        if source in memory:continue
        pair=templates.get(NUMBER.sub('{number}',source))
        if pair is None:continue
        values=iter(NUMBER.findall(source));target=NUMBER.sub(lambda m:next(values),pair[1])
        # Inflect count nouns affected by the numeral substitution, never identifiers.
        nouns='hour|minute|second|day|week|month|year|meter|centimeter|millimeter|decimeter|kilometer|kilogram|gram|tonne|liter|milliliter|student|person|apple|book|piece|item|row|column|group|box|bag|bottle|ticket|page|time|part|unit|degree|side|vertex|edge|face'
        irregular={'person':'people','box':'boxes','vertex':'vertices'}
        def inflect(m):
            number,noun=m.groups();plural=irregular.get(noun,noun+'s')
            return number+' '+(noun if float(number)==1 else plural)
        # Match existing singular/plural forms; the singular group is captured first.
        target=re.sub(r'(?<![\w.])(\d+(?:\.\d+)?) ('+nouns+r')(?:s)?\b',inflect,target)
        added[source]=target
    return added

if __name__=='__main__':
    p=ROOT/'content/localization/en.json';m=json.loads(p.read_text())
    sources=list(dict.fromkeys(s for path in sorted((ROOT/'content').glob('grade*.json')) for s in strings(json.loads(path.read_text()))))
    additions=reuse(m,sources)
    print(f'{len(additions)} reusable templates')
