#!/usr/bin/env python3
"""Append a set of sim-format cards to gundam-card-game.html as a GUNDAM_CARDS.push([...]) block.

Usage: python3 -I import_set.py <cards.json> <SET_CODE> [--html PATH] [--out PATH] [--bump-sw PATH]

- Skips ids already present in the HTML (reports them), so re-running is safe.
- The block is inserted directly after the last existing GUNDAM_CARDS.push(...) block.
- --out writes the result elsewhere (dry run); without it the HTML is rewritten in place.
- --bump-sw increments the CACHE version in sw.js (vNN -> vNN+1).
"""
import json, re, sys

def main():
    args = sys.argv[1:]
    src, setcode = args[0], args[1]
    html_path = args[args.index('--html')+1] if '--html' in args else '/home/user/TestGame/gundam-card-game.html'
    out_path  = args[args.index('--out')+1]  if '--out'  in args else html_path
    sw_path   = args[args.index('--bump-sw')+1] if '--bump-sw' in args else None

    cards = json.load(open(src, encoding='utf-8'))
    html = open(html_path, encoding='utf-8').read()
    present = set(re.findall(r'"id"\s*:\s*"([^"]+)"', html))
    new = [c for c in cards if c['id'] not in present]
    skipped = [c['id'] for c in cards if c['id'] in present]
    if not new:
        sys.stderr.write(f'{setcode}: nothing to add ({len(skipped)} already present)\n'); return

    # find the end of the LAST push block: the first line that is exactly "]);" after the last "GUNDAM_CARDS.push("
    starts = [m.start() for m in re.finditer(r'^GUNDAM_CARDS\.push\(', html, re.M)]
    if not starts: raise SystemExit('no GUNDAM_CARDS.push( block found')
    last = starts[-1]
    # blocks end with either "]);" (array form) or ");" (varargs form)
    m_end = re.compile(r'^\]?\);\s*$', re.M).search(html, last)
    if not m_end: raise SystemExit('could not find the end of the last push block')
    insert_at = m_end.end()

    body = ',\n'.join(json.dumps(c, ensure_ascii=False) for c in new)
    # varargs form is always valid: GUNDAM_CARDS.push({...},{...});
    block = (f'\n// {setcode} — imported from the gcg-api dataset ({len(new)} cards)\n'
             f'GUNDAM_CARDS.push(\n{body}\n);\n')
    html = html[:insert_at] + block + html[insert_at:]
    open(out_path, 'w', encoding='utf-8').write(html)
    sys.stderr.write(f'{setcode}: added {len(new)} cards, skipped {len(skipped)} already present -> {out_path}\n')

    if sw_path:
        sw = open(sw_path, encoding='utf-8').read()
        m = re.search(r"const CACHE = 'gundam-tcg-v(\d+)';", sw)
        if m:
            n = int(m.group(1)) + 1
            sw = sw.replace(m.group(0), f"const CACHE = 'gundam-tcg-v{n}';")
            open(sw_path, 'w', encoding='utf-8').write(sw)
            sys.stderr.write(f'sw.js: CACHE -> v{n}\n')

if __name__ == '__main__': main()
