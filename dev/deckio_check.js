// Deck import / export: the text list round-trips every preset exactly (cards, copies, name), and the parser reads the
// formats people paste (copies before or after the number, x/×, names, comments, commas, the deck code, JSON, printings).
// Usage: node deckio_check.js
const { A }=require('./harness.js');
const { deckListParse, deckListText, dgToMap, PRESET_DECKS, CARD_BY_ID }=A;
let errors=0; const bad=(m)=>{ errors++; console.log('ERR', m); };
const same=(a,b)=>JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());
// 1) every preset exports and re-imports to the same deck, with its name
for (const p of PRESET_DECKS){
  const map=dgToMap(p.dg), text=deckListText(p.name, map), r=deckListParse(text);
  if (!same(map, r.cards)) bad(`round trip differs for ${p.name}: ${JSON.stringify(map)} vs ${JSON.stringify(r.cards)}`);
  if (r.name!==p.name.slice(0,24)) bad(`name lost for ${p.name}: got "${r.name}"`);
  if (r.unknown.length || r.ignored) bad(`unknown/ignored in ${p.name}: ${r.unknown} ${r.ignored}`);
  const total=Object.values(map).reduce((a,b)=>a+b,0); if (r.total!==total) bad(`total ${r.total} != ${total} for ${p.name}`);
}
console.log('presets round-tripped:', PRESET_DECKS.length);
const first=PRESET_DECKS[0]; console.log(deckListText(first.name, dgToMap(first.dg)).split('\n').slice(0,8).join('\n'));
// 2) the game's own deck code and JSON
let r=deckListParse(first.dg); if (!same(dgToMap(first.dg), r.cards)) bad('deck code not parsed');
r=deckListParse(JSON.stringify({ name:'Json deck', cards:dgToMap(first.dg) })); if (!same(dgToMap(first.dg), r.cards) || r.name!=='Json deck') bad('JSON object not parsed '+JSON.stringify(r).slice(0,200));
r=deckListParse(JSON.stringify(Object.entries(dgToMap(first.dg)).map(([id,n])=>({id,count:n})))); if (!same(dgToMap(first.dg), r.cards)) bad('JSON array not parsed');
// 3) formats people paste
const alt=[...CARD_BY_ID.keys()].find(id=>/-p2$/.test(id));
const base=alt.replace(/-p2$/,'');
const cases=[
  ['4 ST01-001', {'ST01-001':4}],
  ['4x ST01-001 Gundam', {'ST01-001':4}],
  ['ST01-001 x4', {'ST01-001':4}],
  ['ST01-001 ×3', {'ST01-001':3}],
  ['ST01-001 Gundam 2', {'ST01-001':2}],
  ['ST01-001 Gundam (2)', {'ST01-001':2}],
  ['ST01-001', {'ST01-001':1}],
  ['st01-001 gundam\nst01-001', {'ST01-001':2}],
  ['4 ST01-001, 2 ST01-002', {'ST01-001':4,'ST01-002':2}],
  ['4 ST01-001; 2 ST01-002', {'ST01-001':4,'ST01-002':2}],
  ['Deck: Alpha\n4 ST01-001\n// note\n# another comment\n2 ST01-002', {'ST01-001':4,'ST01-002':2}, 'Alpha'],
  ['# Beta\n4 ST01-001', {'ST01-001':4}, 'Beta'],
  ['﻿4 ST01-001\r\n2 ST01-002\r\n', {'ST01-001':4,'ST01-002':2}],
  ['4 GD01-001 RX-78-2 Gundam', {'GD01-001':4}],
  [`4 ${alt}`, {[alt]:4}],
  [`2 ${base}\n3 ${alt}`, {[base]:2,[alt]:2}, '', [base]],           // 5 copies across printings → cut to 4
  [`3 ${base}-p99`, {[base]:3}],                                      // unknown printing → base card
  ['6 ST01-001', {'ST01-001':4}, '', ['ST01-001']],
  ['4 ZZ99-999\n4 ST01-001', {'ST01-001':4}, '', [], ['ZZ99-999']],
  ['hello\nworld', {}, '', [], [], 2],
  ['', {}],
  ['4 GD05-001r', {}, '', [], [], 1],                                  // a resource card is not a deck card
];
for (const [text, want, name, clipped, unknown, ignored] of cases){
  const r=deckListParse(text);
  if (!same(r.cards, want)) bad(`"${text.replace(/\n/g,'\\n')}" → ${JSON.stringify(r.cards)} wanted ${JSON.stringify(want)}`);
  if (name!==undefined && r.name!==name) bad(`"${text}" name "${r.name}" wanted "${name}"`);
  if (clipped && JSON.stringify(r.clipped)!==JSON.stringify(clipped)) bad(`"${text}" clipped ${r.clipped} wanted ${clipped}`);
  if (unknown && JSON.stringify(r.unknown)!==JSON.stringify(unknown)) bad(`"${text}" unknown ${r.unknown} wanted ${unknown}`);
  if (ignored!==undefined && r.ignored!==ignored) bad(`"${text}" ignored ${r.ignored} wanted ${ignored}`);
}
// 4) export text of a deck with an alternate art says so and re-imports with that art
const t=deckListText('Alt', {[alt]:2, 'ST01-001':1}); if (!/\[art \d+ of \d+\]/.test(t)) bad('alt art tag missing: '+t);
r=deckListParse(t); if (!same(r.cards, {[alt]:2,'ST01-001':1})) bad('alt art round trip '+JSON.stringify(r.cards));
console.log('Errors:', errors);
