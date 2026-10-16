#!/usr/bin/env python3
"""Convert gcg-api NDJSON records into the simulator's GUNDAM_CARDS object format.

Usage: python3 -I gcg2sim.py <cards.ndjson> <SET_CODE> [--out file.json]
Emits a JSON array of sim card objects (base printing first, parallels as -pN).
"""
import json, re, sys, html

def sim_type(t):
    return {'UNIT':'unit','PILOT':'pilot','COMMAND':'command','BASE':'base'}.get(t)

def esc_effect(txt):
    # sim stores effect as HTML: <...> keywords escaped, newlines as <br>, trailing <br>
    t = (txt or '').replace('\r','')
    t = html.escape(t, quote=False)          # & < > -> &amp; &lt; &gt;
    t = re.sub(r'\n+', '<br>', t.strip())
    return (t + '<br>') if t else '-'

def sim_link(link):
    if not link or link == '-': return ''
    l = link.strip()
    # "[Amuro Ray]" -> "Amuro Ray"; "(Orb) Trait / [Kira Yamato]" -> "(Orb) Trait / Kira Yamato";
    # "[A] / [B]" -> "A / B". Trait links "(OZ) Trait" are kept verbatim.
    return re.sub(r'\[([^\]]+)\]', r'\1', l).strip()

def parallel_index(img):
    m = re.search(r'_p(\d+)\.webp', img or '')
    return int(m.group(1)) if m else 0

ZW = re.compile('[\u200b\u200c\u200d\u2060\ufeff]')
def clean(s): return ZW.sub('', s or '')

def convert(rec):
    t = sim_type(rec.get('card_type'))
    if not t: return None
    num = rec['card_number']
    p = parallel_index(rec.get('image_url',''))
    cid = num + (f'-p{p}' if p else '')
    img_path = re.sub(r'^https?://www\.gundam-gcg\.com/', '', rec.get('image_url',''))
    img = 'https://images.weserv.nl/?url=www.gundam-gcg.com/' + img_path if img_path else ''
    ap = rec.get('ap'); hp = rec.get('hp')
    if t == 'base': ap = 0
    if t == 'command':                            # pilot-mode commands carry ap/hp; plain ones are 0/0
        ap = 0 if ap is None else ap; hp = 0 if hp is None else hp
    return {
        'id': cid, 'name': clean(rec.get('name','')).strip(), 'type': t, 'color': rec.get('color') or '-',
        'cost': rec.get('cost') if rec.get('cost') is not None else 0,
        'lv': rec.get('level') if rec.get('level') is not None else 0,
        'ap': ap, 'hp': hp,
        'trait': (rec.get('trait') or '').strip() if (rec.get('trait') or '').strip() != '-' else '',
        'link': sim_link(rec.get('link')),
        'effect': esc_effect(clean(rec.get('effect'))), 'img': img,
    }

def main():
    src, setcode = sys.argv[1], sys.argv[2]
    out = None
    if '--out' in sys.argv: out = sys.argv[sys.argv.index('--out')+1]
    recs = [json.loads(l) for l in open(src, encoding='utf-8') if l.strip()]
    cards = [c for c in (convert(r) for r in recs if r.get('set_code')==setcode or r.get('card_number','').startswith(setcode+'-')) if c]
    # base printing first, then parallels, by number
    cards.sort(key=lambda c: (c['id'].split('-p')[0], ('-p' in c['id']), c['id']))
    seen=set(); uniq=[]
    for c in cards:
        if c['id'] in seen: continue
        seen.add(c['id']); uniq.append(c)
    js = json.dumps(uniq, ensure_ascii=False)
    if out: open(out,'w',encoding='utf-8').write(js)
    else: sys.stdout.write(js)
    sys.stderr.write(f'{setcode}: {len(uniq)} sim cards from {len(recs)} records\n')

if __name__ == '__main__': main()
