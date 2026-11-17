#!/usr/bin/env python3
"""Optional local-only translation drafting. The checked-in memory is the build input.
Run from repo root with an already installed Ollama model; never contacts a cloud API.
Drafts MUST pass verify_english.py and editorial review before release.
"""
import argparse,json,re,time,urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CJK=re.compile(r'[\u3400-\u9fff\uf900-\ufaff]')
def strings(value):
    if isinstance(value,dict):
        for child in value.values():yield from strings(child)
    elif isinstance(value,list):
        for child in value:yield from strings(child)
    elif isinstance(value,str) and CJK.search(value):yield value

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--model',required=True);ap.add_argument('--batch-size',type=int,default=32);ap.add_argument('--endpoint',default='http://localhost:11434');ap.add_argument('--workers',type=int,default=1);ap.add_argument('--api',choices=['ollama','llama'],default='ollama');args=ap.parse_args()
    dest=ROOT/'content/localization/en.json'
    memory=json.loads(dest.read_text()) if dest.exists() else {}
    catalog=json.loads((ROOT/'ios/Xingya/Localizable.xcstrings').read_text())['strings']
    sources=list(dict.fromkeys(s for path in sorted((ROOT/'content').glob('grade*.json')) for s in strings(json.loads(path.read_text()))))
    for source in sources:
        existing=catalog.get(source,{}).get('localizations',{}).get('en',{}).get('stringUnit',{}).get('value')
        if existing and not CJK.search(existing):memory.setdefault(source,existing)
    overrides=ROOT/'content/localization/reviewed.json'
    if overrides.exists():memory.update(json.loads(overrides.read_text()))
    from reuse_templates import reuse
    memory.update(reuse(memory,sources))
    todo=[s for s in sources if s not in memory]
    print(f'{len(memory)} existing translations; {len(todo)} drafts remaining',flush=True)
    instruction=('You are a professional Chinese-to-English school mathematics translator. Translate each value into clear natural English for children. '
      'Return a JSON object with exactly the same numeric string keys. Do not repeat the Chinese. Preserve EVERY numeral, decimal precision, variable name, mathematical symbol, operator, fraction, inequality, exponent, and equation. '
      'Do not solve questions, add answers, omit information, or correct the mathematics. Translate distractor choices faithfully even if false. '
      'Keep quantities as digits if originally digits. Keep purely mathematical expressions unchanged except whitespace. '
      'Use standard terminology: 时针=hour hand, 分针=minute hand, 平移=translation, 射线=ray, 周长=perimeter, 余数=remainder, 倍=times, 角=angle (or jiao for currency), 元=yuan, 万=ten thousand, 亿=hundred million. '
      'Use PEP edition for 人教版. Translate Chinese punctuation, units, people names, and all prose. Translate unit/title labels briefly. No Chinese characters, commentary, markdown fences, or thinking. /no_think')
    started=time.time()
    def translate(batch):
        req={str(i):s for i,s in enumerate(batch)}
        properties={k:{'type':'string'} for k in req}
        payload={'model':args.model,'messages':[{'role':'system','content':instruction},{'role':'user','content':json.dumps(req,ensure_ascii=False)}],
                 'stream':False,'think':False,'format':{'type':'object','properties':properties,'required':list(req),'additionalProperties':False},
                 'keep_alive':'2h','options':{'temperature':0,'num_ctx':8192,'num_predict':6000}}
        if args.api=='llama':
            payload={'messages':payload['messages'],'temperature':0,'max_tokens':6000,
                     'response_format':{'type':'json_schema','json_schema':{'name':'translations','schema':payload['format'],'strict':True}},
                     'chat_template_kwargs':{'enable_thinking':False}}
        endpoint=args.endpoint+('/v1/chat/completions' if args.api=='llama' else '/api/chat')
        response=json.load(urllib.request.urlopen(urllib.request.Request(endpoint,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'}),timeout=900))
        content=response['choices'][0]['message']['content'] if args.api=='llama' else response['message']['content']
        out=json.loads(content)
        return {s:out[key] for key,s in req.items() if isinstance(out.get(key),str) and out[key].strip() and not CJK.search(out[key])}
    # Only send one representative of each identical numeric sentence template.
    # Unreusable variants remain for the next pass, never synthesized from IDs.
    representatives={}
    for s in todo:representatives.setdefault(re.sub(r'\d+(?:\.\d+)?','{number}',s),s)
    pending=list(representatives.values())
    print(f'{len(pending)} distinct sentence templates this pass',flush=True)
    finished=0
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures=[executor.submit(translate,pending[i:i+args.batch_size]) for i in range(0,len(pending),args.batch_size)]
        for future in as_completed(futures):
            additions=future.result();memory.update(additions);finished+=len(additions)
            memory.update(reuse(memory,sources))
            temp=dest.with_suffix('.tmp');temp.write_text(json.dumps(memory,ensure_ascii=False,indent=2)+'\n');temp.replace(dest)
            print(f'{finished}/{len(pending)} templates; total {len(memory)}/{len(sources)}; {round(time.time()-started)}s',flush=True)
    print('Pass complete; rerun to draft any remaining variants.',flush=True)
if __name__=='__main__':main()
