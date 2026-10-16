// Parser-coverage report for ANY card list (a JSON array in sim format, or the built-in pool).
//   node cover.js [cards.json]
// Lists every printed 【…】 clause that produces no parsed effect, so a new set's gaps are visible
// before it ships. Bespoke-hook cards are recognised via a known-implemented list.
const H=require('./harness.js'); const {A}=H; const fs=require('fs');
const plainTxt = s => String(s||'').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,' ')
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const IMPLEMENTED = new Set(['GD04-029','GD04-041','GD04-053','ST14-006','GD05-070','GD05-035','GD05-044','GD05-076',
  'GD03-076','GD05-127','ST13-001','GD05-129','GD05-093','GD05-053','GD05-094','GD05-017','GD05-049','GD04-089',
  'GD01-023','GD02-011','GD04-125','ST09-001','GD05-066','GD01-066','EB01-067','GD04-001','GD05-046','EB01-009',
  'GD04-057','GD02-071','GD04-070']);
const src = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2],'utf8')) : A.GUNDAM_CARDS;
const dead={}; const seen=new Set(); let cards=0, clauses=0, deadClauses=0;
const statics = c => c.blocker||c.breach||c.suppression||c.support||c.repair||c.onKill||c.onShieldBreak
  ||c.effDmgReduce||c.onceDmgReduce||c.unrestOnce||c.pairPreventLowAp||c.battleBounceTrait||c.linkDenyBlockerTrait
  ||(c.whileKw&&c.whileKw.length)||(c.whileBuff&&c.whileBuff.length)||c.handReduce||c.noDirectAttack||c.trashCostReduce||c.trashCantAttack||c.condBlocker;
for (const def of src){
  if (seen.has(def.id)) continue; seen.add(def.id);
  if (IMPLEMENTED.has(def.id.replace(/-p\d$/,''))) continue;
  let c; try { c = A.makeCard(def,'player'); } catch(e){ (dead['CRASH']=dead['CRASH']||[]).push(def.id+' '+def.name+': '+e.message); continue; }
  cards++;
  const txt = plainTxt(def.effect); if (!txt || txt==='-') continue;
  for (const raw of (txt.match(/【[^】]+】/g)||[])){
    const name = raw.replace(/[【】]/g,'').trim(); const base = name.split(/[･··・]/)[0].trim(); clauses++;
    let ok=false;
    if (/^Pilot$/.test(base)) ok = !!c.pilotMode;
    else if (/^Activate/.test(name)) ok = !!A.parseActivate(def.effect) || c.support>0 || (A.repairAmount(def.effect)>0);
    else if (/^Burst/.test(name)) ok = !!c.burst;
    else if (/^(Main|Action)$/.test(base)) ok = !!(c.action || A.inferCommand(def.effect) || A.parseActivate(def.effect) || c.pilotMode);
    else if (/^During /.test(name)) ok = true;
    else if (/^Once per Turn$/i.test(base)) ok = !!statics(c) || !!A.parseTrigger(def.effect,'Attack') || /when you pair a pilot/i.test(txt);
    else ok = !!A.parseTrigger(def.effect, base) || !!(A.gd05Custom && A.gd05Custom(c, base)) || !!(base==='Attack' && A.gatedAttackAction(def.effect, c));
    if (!ok){ deadClauses++; (dead[base]=dead[base]||[]).push(`${def.id} ${def.name}: ${txt.slice(0,160)}`); }
  }
  // un-bracketed continuous abilities we know we don't model: flag the common shapes
  const unb = txt.split('【')[0].replace(/<[^>]*>\s*\([^)]*\)/g,'').trim();
  if (unb && !/^<|^-$/.test(unb) && !statics(c) && !c.condBlocker && /\b(gets?|gains?|can'?t|during|while)\b/i.test(unb))
    (dead['(continuous)']=dead['(continuous)']||[]).push(`${def.id} ${def.name}: ${unb.slice(0,140)}`);
}
console.log(`cards: ${cards} | printed 【…】 clauses: ${clauses} | with no parsed effect: ${deadClauses}`);
for (const k of Object.keys(dead).sort((a,b)=>dead[b].length-dead[a].length)){
  console.log(`\n### ${k==='(continuous)'?'un-bracketed continuous text (unmodelled?)':'【'+k+'】'} — ${dead[k].length}`);
  dead[k].slice(0,30).forEach(s=>console.log('   '+s)); if (dead[k].length>30) console.log('   … +'+(dead[k].length-30)+' more');
}
