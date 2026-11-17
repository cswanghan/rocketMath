#!/usr/bin/env python3
"""Release gate for bilingual curriculum. Structural and mathematical invariants.

Checks every JSON leaf (not only fields currently rendered), IDs/order/counts,
answers, choice IDs/correct flags, numeric tokens and meaningful math operators.
A translation exception must name BOTH exact strings and explain equivalence;
it cannot silently accept a later edit. Reports count occurrences, not uniques.
"""
import argparse,collections,hashlib,json,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CJK=re.compile(r'[\u3400-\u9fff\uf900-\ufaff]')
NUM=re.compile(r'\d+(?:\.\d+)?')
OPS=re.compile(r'[+×÷*^=<>≤≥≠≈±∝√π²³∠∥⊥∪∩∞%]')
CONTENT_FIELDS={'prompt','hint','explanation','title','name','label','textbook','edition','gradeLabel','unit','topic','answer'}

def leaves(x,path=()):
    if isinstance(x,dict):
        for k,v in x.items():yield from leaves(v,path+(k,))
    elif isinstance(x,list):
        for i,v in enumerate(x):yield from leaves(v,path+(i,))
    else:yield path,x

def shapes(x,path=()):
    if isinstance(x,dict):
        yield path,('object',tuple(sorted(x)))
        for k,v in x.items():yield from shapes(v,path+(k,))
    elif isinstance(x,list):
        yield path,('array',len(x))
        for i,v in enumerate(x):yield from shapes(v,path+(i,))
    else:yield path,type(x).__name__

def terminology_flags(source,target,glossary):
    missed=[]
    for term,pattern in glossary.items():
        text=source
        exclusions={'时针':['顺时针','逆时针'],'通分':['普通分数'],
                    '大于':['不大于','大于等于'],'小于':['不小于','小于等于'],'直角':['直角边']}
        for excluded in exclusions.get(term,[]):text=text.replace(excluded,'')
        if term in text and not re.search(pattern,target,re.I):missed.append(term)
    return missed

def field(path):
    last=str(path[-1])
    if 'source' in path:return 'source.'+last
    if 'choices' in path:return 'choices.'+last
    if 'fields' in path:return 'fields.'+last
    if last=='title':return str(path[0])+'.title'
    if last=='name':return 'track.name'
    return last

# Dimensional units are normalized before token comparison, so cm² is equivalent
# to 平方厘米 but changing square centimeters into meters is still flagged.
UNIT_ALIASES = {
    'mm': ['毫米', 'millimeters', 'millimeter', 'millimetres', 'millimetre'],
    'cm': ['厘米', 'centimeters', 'centimeter', 'centimetres', 'centimetre'],
    'dm': ['分米', 'decimeters', 'decimeter', 'decimetres', 'decimetre'],
    'km': ['千米', 'kilometers', 'kilometer', 'kilometres', 'kilometre'],
    'm': ['米', 'meters', 'meter', 'metres', 'metre'],
}
def canonical_units(s):
    # Longest Chinese/English unit phrases first, including powers.
    replacements=[]
    for unit,names in UNIT_ALIASES.items():
        for name in names + [unit]:
            chinese=bool(CJK.search(name))
            replacements += [(('平方' if chinese else 'square ')+name,unit+'²'), (('立方' if chinese else 'cubic ')+name,unit+'³'), (name,unit)]
    for source,target in sorted(replacements,key=lambda pair:len(pair[0]),reverse=True):
        if CJK.search(source):s=s.replace(source,target)
        else:s=re.sub(r'(?<![A-Za-z])'+re.escape(source)+r'(?![A-Za-z])',target,s,flags=re.I)
    return s

def minus_count(s):
    # Count actual minus signs, excluding English hyphenated prose such as
    # "three-digit", "3-digit", and "one-seventh". Space-separated subtraction
    # and algebra with single-letter variables remain mathematical operators.
    total=0
    for match in re.finditer('[-−]',s):
        if match[0]=='−':
            total+=1
            continue
        left=re.search(r'[A-Za-z0-9]+$',s[:match.start()])
        right=re.match(r'[A-Za-z]+',s[match.end():])
        if right and right[0] in {'shaped','sided','digit','dimensional','degree','step'}:continue
        if left and right and len(right[0])>1:continue
        if left and right and len(left[0])>1 and left[0].isalpha():continue
        total+=1
    return total

def slash_count(s):
    count=0
    for match in re.finditer('/',s):
        left=re.search(r'([A-Za-z0-9²³)]+)\s*$',s[:match.start()])
        right=re.match(r'\s*([A-Za-z0-9(]+)',s[match.end():])
        a,b=left[1] if left else '',right[1] if right else ''
        if any(c.isdigit() for c in a+b) or (a and b and len(a)<=2 and len(b)<=2) or re.match(r'(sin|cos|tan)',a):count+=1
    return count

def signature(s):
    # Fullwidth digits/punctuation and minus glyphs are typography, not quantities.
    s=s.translate(str.maketrans('０１２３４５６７８９％＋＝－','0123456789%+=−'))
    operator_source=s
    s=canonical_units(s)
    s=re.sub(r'(\d)-(mm|cm|dm|km|m)(?![A-Za-z])',r'\1 \2',s)
    for number,month in enumerate(['January','February','March','April','May','June','July','August','September','October','November','December'],1):
        suffix=r'(?!\s+(?:be|not|have|also|vary|differ|change|occur|remain|exist|need|take)\b)' if month=='May' else ''
        s=re.sub(r'\b'+month+r'\b'+suffix,str(number)+' month',s)
    return {'numbers':dict(collections.Counter(NUM.findall(s))),
            'operators':dict(collections.Counter(OPS.findall(s))),
            'minus':minus_count(operator_source),'fraction_bars':slash_count(operator_source),
            'length_units':dict(collections.Counter(re.findall(r'(?<=\d)\s*((?:mm|cm|dm|km|m)[²³]?)(?![A-Za-z])',s)))}

def audit(root=ROOT):
    memory=json.loads((root/'content/localization/en.json').read_text())
    overrides=root/'content/localization/reviewed.json'
    if overrides.exists():memory.update(json.loads(overrides.read_text()))
    exception_path=root/'content/localization/equivalences.json'
    exceptions=json.loads(exception_path.read_text()) if exception_path.exists() else {}
    answers_path=root/'content/localization/word_answers.json'
    word_answers=json.loads(answers_path.read_text()) if answers_path.exists() else {}
    glossary_path=root/'content/localization/glossary.json'
    glossary=json.loads(glossary_path.read_text()) if glossary_path.exists() else {}
    errors=[]; math_flags=[]; term_flags=[]; rows=[]; answer_count=choice_count=problem_count=fact_count=approved_count=0
    for path in sorted((root/'content').glob('grade*.json')):
        source=json.loads(path.read_text());target_path=root/'content/en'/path.name
        target=json.loads(target_path.read_text()) if target_path.exists() else {}
        if dict(shapes(source)) != dict(shapes(target)):
            errors.append({'pack':path.name,'kind':'shape_or_type_change'})
        src=dict(leaves(source));dst=dict(leaves(target));counts=collections.defaultdict(lambda:[0,0,0])
        if set(src)!=set(dst):errors.append({'pack':path.name,'kind':'structure','missing':len(set(src)-set(dst)),'extra':len(set(dst)-set(src))})
        for key,value in src.items():
            translated=dst.get(key);display=isinstance(value,str) and str(key[-1]) in CONTENT_FIELDS
            if key[-1]=='answer':answer_count+=1
            if key[-1]=='correct' and 'choices' in key:choice_count+=1
            if key[-1]=='id' and 'problems' in key and 'choices' not in key and 'fields' not in key:problem_count+=1
            if key[-1]=='id' and 'new_facts' in key:fact_count+=1
            mark={'pack':path.name,'path':'.'.join(map(str,key))}
            if isinstance(value,str) and CJK.search(value):
                if key[-1]=='answer' and word_answers.get(value)!=translated:
                    errors.append({**mark,'kind':'unreviewed_word_answer','source':value,'en':translated})
                if display:
                    row=counts[field(key)];row[1]+=1
                    if isinstance(translated,str) and translated.strip() and not CJK.search(translated):row[0]+=1
                    else:row[2]+=1
                if not isinstance(translated,str) or not translated.strip() or CJK.search(translated):
                    errors.append({**mark,'kind':'missing_english','source':value})
                elif memory.get(value)!=translated:errors.append({**mark,'kind':'memory_mismatch','source':value})
                elif str(key[-1]) in {'prompt','hint','explanation','label','answer'} and 'source' not in key:
                    before=signature(value);after=signature(translated)
                    if before!=after:
                        exception=exceptions.get(value,{})
                        if exception.get('en')!=translated or not exception.get('reason'):
                            math_flags.append({**mark,'source':value,'en':translated,'before':before,'after':after})
                        else:approved_count+=1
            elif translated!=value:
                errors.append({**mark,'kind':'changed_invariant','source':value,'en':translated})
            if isinstance(value,str) and isinstance(translated,str) and CJK.search(value):
                missed=terminology_flags(value,translated,glossary)
                if missed:term_flags.append({**mark,'source':value,'en':translated,'terms':missed})
            if isinstance(translated,str) and CJK.search(translated):
                # Includes unexpected non-display metadata, so nothing can evade coverage.
                if not CJK.search(str(value)):errors.append({**mark,'kind':'unexpected_cjk'})
        grade=int(re.search(r'grade(\d+)',path.name)[1])
        for f,(done,total,remaining) in sorted(counts.items()):rows.append({'grade':grade,'pack':path.stem,'field':f,'translated':done,'total':total,'remaining_cjk':remaining})
    catalog_counts={'total':0,'translated':0,'remaining_cjk':0}
    catalog_path=root/'ios/Xingya/Localizable.xcstrings'
    if catalog_path.exists():
        for key,entry in json.loads(catalog_path.read_text())['strings'].items():
            if not CJK.search(key):continue
            catalog_counts['total']+=1
            value=entry.get('localizations',{}).get('en',{}).get('stringUnit',{}).get('value','')
            if value.strip() and not CJK.search(value):catalog_counts['translated']+=1
            else:
                catalog_counts['remaining_cjk']+=1
                errors.append({'pack':'Localizable.xcstrings','kind':'missing_catalog_english','source':key})
    return {'rows':rows,'errors':errors,'math_flags':math_flags,'term_flags':term_flags,'problem_count':problem_count,'fact_count':fact_count,'answer_count':answer_count,'choice_count':choice_count,'exceptions':len(exceptions),'approved_occurrences':approved_count,'catalog':catalog_counts}

def report(data):
    out=['# English curriculum coverage','', 'Generated by `python3 content/localization/verify_english.py --report`.', '',
         '**Automated localization gate: '+('PASS' if not data['errors'] and not data['math_flags'] and not data['term_flags'] else 'BLOCKED')+'** (structural/coverage/numeric checks; editorial and test results are recorded separately below).', '',
         'Counts are occurrences of source fields containing CJK, including repeated source labels. Pure numeric/symbolic strings are excluded from the translation denominator and must remain byte-for-byte identical. Every JSON leaf is checked; no questions, grades, or choices may be removed.', '',
         f"Practice problems: {data['problem_count']}; fluency facts: {data['fact_count']}; expected-answer fields checked: {data['answer_count']}; choice identity/correctness flags checked: {data['choice_count']}.",
         f"Structural/coverage/invariant failures: {len(data['errors'])}; unresolved numeric/operator flags: {len(data['math_flags'])}; terminology flags: {len(data['term_flags'])}; explicitly reviewed equivalences: {data['exceptions']}.", '',
         f"String Catalog (separate from pack totals): {data['catalog']['translated']} / {data['catalog']['total']} Chinese-key entries have English; missing/CJK English entries: {data['catalog']['remaining_cjk']}. This includes grade and term labels.", '',
         '| Grade | Pack | Field | Translated / total | Remaining CJK |','|---|---|---|---:|---:|']
    for r in data['rows']:out.append(f"| {r['grade']} | {r['pack'].replace('grade'+str(r['grade'])+'_','')} | {r['field']} | {r['translated']} / {r['total']} | {r['remaining_cjk']} |")
    totals=collections.defaultdict(lambda:[0,0,0])
    for r in data['rows']:
        for i,k in enumerate(['translated','total','remaining_cjk']):totals[r['grade']][i]+=r[k]
    out+=['','## Grade totals','','| Grade | Translated / total | Remaining CJK |','|---|---:|---:|']
    for grade,(done,total,remaining) in sorted(totals.items()):out.append(f'| {grade} | {done} / {total} | {remaining} |')
    out+=['', 'Automated numeric/operator checks flag changes; they do not prove semantic equivalence of prose. See editorial notes and RESULT.md for actual release eligibility.', '']
    return '\n'.join(out)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--report',action='store_true');args=ap.parse_args()
    data=audit();out=ROOT/'ios/build/codex-i18n';out.mkdir(parents=True,exist_ok=True)
    (out/'validation.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    # Deduplicated queue makes review feasible without hiding occurrence totals.
    flags={f['source']:f for f in data['math_flags']}
    (out/'math-review.json').write_text(json.dumps(list(flags.values()),ensure_ascii=False,indent=2)+'\n')
    if args.report:(out/'COVERAGE.md').write_text(report(data))
    print(json.dumps({k:v for k,v in data.items() if k not in ['rows','errors','math_flags','term_flags']}))
    print(f"{len(data['errors'])} errors; {len(data['math_flags'])} numeric/operator flags ({len(flags)} unique)")
    print(f"{len(data['term_flags'])} terminology flags")
    return bool(data['errors'] or data['math_flags'] or data['term_flags'])
if __name__=='__main__':sys.exit(main())
