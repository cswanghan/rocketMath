#!/usr/bin/env python3
"""Terminology review queue; absence of a term is a flag, not proof of mistranslation."""
import json,re
from verify_english import ROOT,leaves,CJK,terminology_flags
m=json.loads((ROOT/'content/localization/en.json').read_text());p=ROOT/'content/localization/reviewed.json'
if p.exists():m.update(json.loads(p.read_text()))
glossary=json.loads((ROOT/'content/localization/glossary.json').read_text())
flags=[];seen=set()
for path in sorted((ROOT/'content').glob('grade*.json')):
 for key,source in leaves(json.loads(path.read_text())):
  if not isinstance(source,str) or source not in m or source in seen:continue
  seen.add(source);en=m[source]
  missed=terminology_flags(source,en,glossary)
  if missed:flags.append({'source':source,'en':en,'terms':missed,'pack':path.name,'path':'.'.join(map(str,key))})
(ROOT/'ios/build/codex-i18n/term-review.json').write_text(json.dumps(flags,ensure_ascii=False,indent=2)+'\n')
print(len(flags),'terminology flags')
for i,x in enumerate(flags):print(i,json.dumps([x['source'],x['en'],x['terms']],ensure_ascii=False))
