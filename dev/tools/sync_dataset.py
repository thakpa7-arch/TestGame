#!/usr/bin/env python3
"""Bring gundam-card-game.html's card pool in line with the official gcg-api dataset.

Usage: python3 -I sync_dataset.py <cards.ndjson> [--html PATH] [--out PATH] [--report PATH] [--bump-sw PATH]

1. Every card object already in the HTML whose id is in the dataset gets the dataset's name / type /
   colour / cost / Lv / AP / HP / trait / link / effect (the official site is the source of truth;
   pre-release spoiler wording is replaced). The image URL is kept. Fields that differ only in
   whitespace, HTML escaping or '-' vs '' are left untouched, so the diff only shows real changes.
2. Every printing in the dataset that the HTML lacks (alternate arts as -pN) is appended in one
   GUNDAM_CARDS.push(...) block.
Cards absent from the dataset (e.g. GD06 before its release) are left exactly as they are.
"""
import json, re, sys, os, html as H, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('gcg2sim', os.path.join(HERE, 'gcg2sim.py'))
g2s = importlib.util.module_from_spec(spec); spec.loader.exec_module(g2s)

FIELDS = ('name', 'type', 'color', 'cost', 'lv', 'ap', 'hp', 'trait', 'link', 'effect')
OBJ = re.compile(r'\{"id":\s*"([^"]+)",.*?"img":\s*"[^"]*"\}')

def norm_text(s):
    s = H.unescape(re.sub(r'<br\s*/?>', ' ', str(s or '')))
    s = s.replace('’', "'").replace('：', ':')
    return re.sub(r'\s+', ' ', s).strip()

def same(k, a, b):
    if k in ('ap', 'hp', 'cost', 'lv'):
        return (a or 0) == (b or 0)
    if k in ('trait', 'link'):
        na, nb = norm_text(a), norm_text(b)
        na = '' if na == '-' else na; nb = '' if nb == '-' else nb
        return re.sub(r'\s*/\s*', ' / ', na) == re.sub(r'\s*/\s*', ' / ', nb)
    if k == 'effect':
        na, nb = norm_text(a), norm_text(b)
        return (na in ('', '-') and nb in ('', '-')) or na == nb
    return str(a).strip() == str(b).strip()

def main():
    a = sys.argv[1:]
    src = a[0]
    html_path = a[a.index('--html') + 1] if '--html' in a else os.path.normpath(os.path.join(HERE, '..', '..', 'gundam-card-game.html'))
    out_path = a[a.index('--out') + 1] if '--out' in a else html_path
    report = a[a.index('--report') + 1] if '--report' in a else None
    sw_path = a[a.index('--bump-sw') + 1] if '--bump-sw' in a else None

    ds = {}
    for line in open(src, encoding='utf-8'):
        if not line.strip(): continue
        c = g2s.convert(json.loads(line))
        if c and c['id'] not in ds: ds[c['id']] = c

    html = open(html_path, encoding='utf-8').read()
    changes = []
    def fix(m):
        raw = m.group(0)
        try: obj = json.loads(raw)
        except Exception: return raw
        d = ds.get(obj['id'])
        if not d: return raw
        diff = {k: (obj.get(k), d[k]) for k in FIELDS if not same(k, obj.get(k), d[k])}
        if not diff: return raw
        for k, (_, new) in diff.items(): obj[k] = new
        changes.append({'id': obj['id'], 'changes': {k: {'before': o, 'after': n} for k, (o, n) in diff.items()}})
        compact = raw.startswith('{"id":"')
        return json.dumps(obj, ensure_ascii=False, separators=(',', ':') if compact else (', ', ': '))
    html = OBJ.sub(fix, html)

    present = set(m.group(1) for m in OBJ.finditer(html))
    missing = [c for i, c in ds.items() if i not in present]
    missing.sort(key=lambda c: (c['id'].split('-p')[0], c['id']))
    if missing:
        starts = [m.start() for m in re.finditer(r'^GUNDAM_CARDS\.push\(', html, re.M)]
        m_end = re.compile(r'^\]?\);\s*$', re.M).search(html, starts[-1])
        body = ',\n'.join(json.dumps(c, ensure_ascii=False) for c in missing)
        block = (f'\n// Alternate-art printings — every remaining printing in the official dataset ({len(missing)} cards)\n'
                 f'GUNDAM_CARDS.push(\n{body}\n);\n')
        html = html[:m_end.end()] + block + html[m_end.end():]

    open(out_path, 'w', encoding='utf-8').write(html)
    by_field = {}
    for c in changes:
        for k in c['changes']: by_field[k] = by_field.get(k, 0) + 1
    sys.stderr.write(f'updated {len(changes)} card objects {by_field}; added {len(missing)} printings -> {out_path}\n')
    if report:
        json.dump({'updated': changes, 'added': [c['id'] for c in missing]}, open(report, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if sw_path:
        sw = open(sw_path, encoding='utf-8').read()
        mm = re.search(r"const CACHE = 'gundam-tcg-v(\d+)';", sw)
        if mm:
            sw = sw.replace(mm.group(0), f"const CACHE = 'gundam-tcg-v{int(mm.group(1)) + 1}';")
            open(sw_path, 'w', encoding='utf-8').write(sw)

if __name__ == '__main__': main()
