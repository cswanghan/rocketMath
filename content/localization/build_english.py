#!/usr/bin/env python3
"""Build complete English packs from reviewed, exact-source translation memory.

Chinese generators and packs remain the source of mathematical truth. A changed or
new Chinese string requires a new translation; missing strings are fatal. No runtime
machine translation, catalog dependence, or Chinese fallback is used.
"""
import argparse,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CJK=re.compile(r'[\u3400-\u9fff\uf900-\ufaff]')

def localize(value,memory,path='$'):
    if isinstance(value,dict):return {k:localize(v,memory,f'{path}.{k}') for k,v in value.items()}
    if isinstance(value,list):return [localize(v,memory,f'{path}[{i}]') for i,v in enumerate(value)]
    if isinstance(value,str) and CJK.search(value):
        translated=memory.get(value)
        if not translated or CJK.search(translated):raise ValueError(f'Missing English at {path}: {value}')
        return translated
    return value

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--check',action='store_true');args=ap.parse_args()
    memory=json.loads((ROOT/'content/localization/en.json').read_text())
    overrides=ROOT/'content/localization/reviewed.json'
    if overrides.exists():memory.update(json.loads(overrides.read_text()))
    output=ROOT/'content/en';output.mkdir(exist_ok=True)
    packs=list(sorted((ROOT/'content').glob('grade*.json')))
    # Validate every pack before writing any of them.
    rendered={p.name:json.dumps(localize(json.loads(p.read_text()),memory),ensure_ascii=False,indent=2)+'\n' for p in packs}
    # Exact-source lookup also localizes historical mistake text after switching languages.
    # Include composed step answers, which are not individual JSON leaves.
    lookup={}
    field_labels={}
    for p in packs:
        source=json.loads(p.read_text())
        def collect(value):
            if isinstance(value,dict):
                for child in value.values():collect(child)
            elif isinstance(value,list):
                for child in value:collect(child)
            elif isinstance(value,str) and CJK.search(value):lookup[value]=memory[value]
        collect(source)
        for problem_set in source.get('sets',[]):
            for problem in problem_set['problems']:
                fields=problem.get('fields',[])
                for f in fields:
                    if CJK.search(f['label']):field_labels[f['label']]=memory[f['label']]
                if fields:
                    def answer_text(fs):
                        return ' , '.join(f"{f['label']} {f['answer']}" for f in fs)
                    lookup[answer_text(fields)]=answer_text(localize(fields,memory))
    rendered['strings.json']=json.dumps({'strings':lookup,'fieldLabels':field_labels},ensure_ascii=False,indent=2)+'\n'
    for name,text in rendered.items():
        target=output/name
        if args.check:
            if not target.exists() or target.read_text()!=text:raise ValueError(f'Stale English pack: {name}; run build_english.py')
        else:target.write_text(text)
    print(f'{len(packs)} English packs {"verified" if args.check else "built"}; no Chinese fallback')
if __name__=='__main__':main()
