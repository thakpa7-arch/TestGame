#!/usr/bin/env python3
"""Parse side-6.com card pages (dev/gd06-raw/cards/*.html) into gcg-api-schema NDJSON, so the same
gcg2sim.py / test_set.sh path imports them.   Usage: side6_parse.py <dir> <SET_CODE> <out.ndjson>"""
import sys, re, json, html, os, glob

def text(frag):
    t = re.sub(r'<[^>]+>', '', frag)
    t = html.unescape(t).replace('【', '【').replace('】', '】')
    t = re.sub(r'[ \t\r\n]+', ' ', t)
    t = re.sub(r'\(\s+', '(', t); t = re.sub(r'\s+\)', ')', t)
    t = re.sub(r'<\s+', '<', t); t = re.sub(r'\s+>', '>', t)
    t = re.sub(r'(\w)<', r'\1 <', t)          # keep the space before a <Keyword>
    t = re.sub(r'【\s+', '【', t); t = re.sub(r'\s+】', '】', t)
    return t.strip()

def block(s, label):
    """inner HTML of the value div that follows a label div with the given text"""
    m = re.search(r'>' + re.escape(label) + r'</div>\s*<div[^>]*>(.*?)</div>\s*</div>', s, re.S)
    return m.group(1) if m else None

def stat(s, label):
    m = re.search(r'>' + re.escape(label) + r'</div><div[^>]*>([^<]*)</div>', s)
    if not m: return None
    v = m.group(1).strip()
    mm = re.fullmatch(r'\+?(\d+)', v)          # Pilots print their bonuses as "+2" / "+1"
    return int(mm.group(1)) if mm else None

def parse(path):
    s = open(path, encoding='utf-8', errors='replace').read()
    m = re.search(r'<title>(.*?) — (GD\d\d-\d{3}) \| side-6\.com</title>', s)
    if not m: return None
    name, num = html.unescape(m.group(1)).strip(), m.group(2)
    # "Blue · Unit" header
    hm = re.search(r'(Blue|Red|Green|White|Purple|Colorless)\s*<[^>]*>\s*·\s*<[^>]*>\s*(Unit|Pilot|Command|Base)', re.sub(r'<span[^>]*>|</span>', '', s[:60000]))
    if not hm:
        hm2 = re.search(r'>(Blue|Red|Green|White|Purple)<.{0,200}?>(Unit|Pilot|Command|Base)<', s, re.S)
        color, ctype = (hm2.group(1), hm2.group(2)) if hm2 else (None, None)
    else: color, ctype = hm.group(1), hm.group(2)
    rar = re.search(r'>(LR|SR|R|U|C|SP|PR)<', s[s.find(num):s.find(num)+2000]); rarity = rar.group(1) if rar else ''
    lv, cost, ap, hp = stat(s,'Lv.'), stat(s,'Cost'), stat(s,'AP'), stat(s,'HP')
    ab = re.search(r'>Ability</div>\s*<div class="space-y-1">(.*?)</div>\s*</div>', s, re.S)
    paras = re.findall(r'<p[^>]*>(.*?)</p>', ab.group(1), re.S) if ab else []
    effect = '\n'.join(text(p) for p in paras)
    tr = block(s, 'Traits'); traits = [html.unescape(x) for x in re.findall(r'/en/traits/[^"]*"><span[^>]*>([^<]*)</span>', tr or '')]
    lk = block(s, 'Link')
    links = []
    if lk:
        for href, lab in re.findall(r'<a href="(/en/(?:pilots|traits)/[^"]*)"><span[^>]*>([^<]*)</span>', lk):
            lab = html.unescape(lab)
            links.append('[%s]' % lab if '/pilots/' in href else '(%s) Trait' % lab)
    img = re.search(r'https://static\.side-6\.com/en/images/cards/card/' + num + r'\.webp', s)
    return {
        'card_number': num, 'name': name, 'set_code': num.split('-')[0], 'rarity': rarity,
        'card_type': (ctype or '').upper(), 'color': color, 'level': lv, 'cost': cost, 'ap': ap, 'hp': hp,
        'trait': ' '.join('(%s)' % t for t in traits), 'traits': traits,
        'link': ' / '.join(links) if links else '-', 'effect': effect,
        'image_url': 'https://www.gundam-gcg.com/en/images/cards/card/%s.webp' % num,   # official art path (sim proxies it)
        'source': 'side-6', 'side6_image': img.group(0) if img else None,
    }

def main():
    d, setcode, out = sys.argv[1], sys.argv[2], sys.argv[3]
    recs, bad = [], []
    for f in sorted(glob.glob(os.path.join(d, '*.html'))):
        r = parse(f)
        if r and r['card_number'].startswith(setcode): recs.append(r)
        else: bad.append(os.path.basename(f))
    with open(out, 'w', encoding='utf-8') as fh:
        for r in recs: fh.write(json.dumps(r, ensure_ascii=False) + '\n')
    sys.stderr.write(f'{setcode}: parsed {len(recs)} cards, unparsed {len(bad)} {bad[:5]}\n')

if __name__ == '__main__': main()
