#!/usr/bin/env python3
"""Print unique untranslated/flagged source strings without requiring complete packs."""
import json
from verify_english import ROOT,CJK,leaves,signature
m=json.loads((ROOT/'content/localization/en.json').read_text())
p=ROOT/'content/localization/reviewed.json'
if p.exists():m.update(json.loads(p.read_text()))
p=ROOT/'content/localization/equivalences.json';exceptions=json.loads(p.read_text()) if p.exists() else {}
seen={}
for path in sorted((ROOT/'content').glob('grade*.json')):
    for key,source in leaves(json.loads(path.read_text())):
        if key[-1] not in {'prompt','hint','explanation','answer','label'} or 'source' in key:continue
        if not isinstance(source,str) or not CJK.search(source) or source not in m:continue
        target=m[source]
        if signature(source)!=signature(target) and exceptions.get(source,{}).get('en')!=target:
            seen.setdefault(source,{'pack':path.name,'path':'.'.join(map(str,key)),'source':source,'en':target,'before':signature(source),'after':signature(target)})
output=ROOT/'ios/build/codex-i18n/draft-math-review.json';output.write_text(json.dumps(list(seen.values()),ensure_ascii=False,indent=2)+'\n')
print(len(m),'translations;',len(seen),'unique flags')
for i,item in enumerate(seen.values()):print(i,json.dumps([item['source'],item['en']],ensure_ascii=False))
