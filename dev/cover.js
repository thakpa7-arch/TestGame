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
const src = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2],'utf8')) : [...A.CARD_BY_ID.values()];   // the merged pool: printings carry their base printing's text
const dead={}; const seen=new Set(); let cards=0, clauses=0, deadClauses=0;
const statics = c => c.blocker||c.breach||c.suppression||c.support||c.repair||c.onKill||c.onShieldBreak
  ||c.effDmgReduce||c.onceDmgReduce||c.unrestOnce||c.pairPreventLowAp||c.battleBounceTrait||c.linkDenyBlockerTrait
  ||(c.whileKw&&c.whileKw.length)||(c.whileBuff&&c.whileBuff.length)||c.handReduce||c.noDirectAttack||c.trashCostReduce||c.trashCantAttack||c.condBlocker
  ||c.onAttacked||c.allyKillHeal||c.trashReduce||c.pairDiscount||c.unrestOnBlock||c.onBaseDamage||c.onSpecialMove
  ||c.noEffDmgFromUnitLv!=null||c.noCmdDmgTrash!=null||c.restedEffGuard||c.restedShieldGuard||c.shieldEffGuard||c.onceDmgBattleOnly
  ||c.allyDeployGain||c.linkWatch||c.exPlaceGain||c.exExileShield||c.cmdExWatch||c.payWatch||c.effDmgWatch||c.apReducedWatch||c.restedWatch||c.healWatch
  ||c.allyKillWatch||c.atkKillDraw||c.boardAura||c.restedTokenBlocker||c.tokenBreachAura||c.deployRestedAura!=null||c.foeFirstStrike||c.activeAttackWhileAp
  ||c.attackNeedsDeploy||c.restedAllBlocker||c.attackBreachAura||c.repairAura||c.unitMode||c.innateActiveAttack
  ||(c.whileKw&&c.whileKw.length)||(c.whileBuff&&c.whileBuff.length)||c.suppressionWhenDamaged||c.tokenAura||c.noEnemyEffDmg||c.baseUnitGuard||c.battleGuardNamed||c.restMillOnEffDmg||c.exPlaceBuff||c.smallEffGuard||c.onCmdTraitGain||c.restSubstitute||c.pilotLowApShield||c.tokenEffReduce||c.pilotNamedAura||c.pilotTokenAura||c.effDrawGain||c.blockedImmune!=null||c.endTurnPingReady||c.repairPerToken||c.pairFromTrashAfterMain||c.activateFromPilot
  // multiplayer-only text ("If there are 2 or more enemy players…") can never apply in a 2-player game — correctly inert
  ||/2 or more enemy players/i.test(plainTxt(c.effect));
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
    else if (/^Once per Turn$/i.test(base)) ok = !!statics(c) || !!A.parseTrigger(def.effect,'Attack') || /when you pair a pilot/i.test(txt)
      || !!(A.parseActivate(def.effect)||{}).oncePerTurn || !!(c.onKill && c.onKill.oncePerTurn) || !!(c.onShieldBreak && c.onShieldBreak.oncePerTurn);
    else ok = !!A.parseTrigger(def.effect, base) || !!(A.gd05Custom && A.gd05Custom(c, base))
      || !!(base==='Attack' && A.gatedAttackAction(def.effect, Object.assign({}, c, { linked:true, pilot:c.pilot||{pAp:0,pHp:0} })));   // a 【During Link/Pair】 gate is satisfied for the check
    if (!ok && /2 or more enemy players/i.test(txt)) ok = true;   // multiplayer-only: never true in a 2-player game
    if (!ok){ deadClauses++; (dead[base]=dead[base]||[]).push(`${def.id} ${def.name}: ${txt.slice(0,160)}`); }
  }
  // un-bracketed continuous abilities we know we don't model: flag the common shapes
  // continuous text = the card-text lines that don't start with a 【…】 timing (each ability is its own line)
  const lines = String(def.effect||'').split(/<br\s*\/?>/i).map(plainTxt).filter(Boolean);
  const unb = lines.filter(l=>!/^[【(■]/.test(l)).join(' ')   // not a timing line, a reminder line or a ■ mode.replace(/<[^>]*>\s*\([^)]*\)/g,'').trim();
  if (unb && !/^<|^-$/.test(unb) && !statics(c) && !c.condBlocker && /\b(gets?|gains?|can'?t|during|while)\b/i.test(unb))
    (dead['(continuous)']=dead['(continuous)']||[]).push(`${def.id} ${def.name}: ${unb.slice(0,140)}`);
}
console.log(`cards: ${cards} | printed 【…】 clauses: ${clauses} | with no parsed effect: ${deadClauses}`);
// Commands whose 【Main】/【Action】 inferCommand can't read: they play, log "no effect" and do nothing (no made-up draw).
{ const ne=[]; const s2=new Set();
  for (const def of src){ const base=def.id.replace(/-p\d+$/,''); if (s2.has(base) || def.type!=='command') continue; s2.add(base);
    const c=A.makeCard(def,'player'); if (c.action && c.action.kind==='noEffect') ne.push(`${def.id} ${def.name}: ${plainTxt(def.effect).slice(0,140)}`); }
  if (ne.length){ console.log(`\n### Commands resolved as "no effect" (unmodelled 【Main】/【Action】) — ${ne.length}`); ne.forEach(s=>console.log('   '+s)); } }
for (const k of Object.keys(dead).sort((a,b)=>dead[b].length-dead[a].length)){
  console.log(`\n### ${k==='(continuous)'?'un-bracketed continuous text (unmodelled?)':'【'+k+'】'} — ${dead[k].length}`);
  const lim=process.env.COVER_ALL?Infinity:30; dead[k].slice(0,lim).forEach(s=>console.log('   '+s)); if (dead[k].length>lim) console.log('   … +'+(dead[k].length-lim)+' more');
}
