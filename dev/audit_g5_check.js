// Audit group 5: triggered clauses on GD04–GD06 Units, Pilots and Bases (plus the same wordings elsewhere in the pool).
// Each card is played through the real entry points — playFromHand (【Deploy】), attachPilot (【When Paired】/【When Linked】),
// an attack declared with fieldClick (【Attack】), a destroyed Unit (【Destroyed】) — on the player side through the choosers
// the player answers, and on the AI side through runTrigger / the AI's attack.
const H=require('./harness.js'); const {A,ERRORS}=H; const drainTasks=require('./burst_yes.js')(H); const G=A.G;   // drainTasks answers the 【Burst】 yes/no with yes
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=870000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,modalQueue:[],
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'G5',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who)); }
}
const side=who=>who==='player'?G.player:G.enemy;
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); side(who).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); if (extra && extra.hp!=null && extra.maxHp==null) c.maxHp=Math.max(c.maxHp, extra.hp);
  side(who).field.push(c); return c;
}
// A Pilot with no text of its own (pairs/links without triggering anything); `name` lets it meet a Link condition.
const vpilot=(who, name, ap, hp)=>({ uid:UID++, owner:who, def:'TESTP', name:name||'Test Pilot', type:'pilot', color:'Blue', cost:1, lv:3, trait:'(Test)', effect:'', pAp:ap==null?1:ap, pHp:hp==null?1:hp });
const pairWith=(u, p)=>{ A.attachPilot(u, p); drainTasks(); return p; };
const modal=()=>el('blockModal').classList.contains('show') ? { msg:(el('blockMsg').innerHTML||'').replace(/<[^>]+>/g,''), btns:[...el('blockBtns').children].map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'')) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pressUnit=u=>press(new RegExp('^'+esc(u.name)+' '));
const passAll=()=>{ let g=0; while (modal() && g++<8){ const m=modal(); if (/intercept|block/i.test(m.msg) && press(/Don't|No block|Take it/i)) continue; if (!press(/Pass|No target|Don't|Skip|Done/)) break; } };
const overlay=()=>(doc.body.children||[]).find(n=>String(n.className||'').includes('modal-overlay'));
const deployFromHand=(id, extra)=>{ const c=card(id,'player'); Object.assign(c, extra||{}); G.player.hand.push(c); A.playFromHand(c.uid); drainTasks(); return c; };
const aiDeploy=(id, extra)=>{ const c=card(id,'enemy'); Object.assign(c, extra||{}); G.enemy.field.push(c); A.runTrigger(c, G.enemy, A.parseTrigger(c.effect,'Deploy'), 'Deploy'); drainTasks(); return c; };
const cands=()=>(G.pending && G.pending.cands)||[];
// The discard chooser (G.mode 'discard'): what a tap on a hand card does.
function discardPick(c){ const p=G.pending; G.player.hand.splice(G.player.hand.indexOf(c),1); A.sendToTrash(c, G.player); p.discardLeft--; if (p.discardLeft<=0){ const after=p.after; G.mode='idle'; G.pending=null; if (after) after(); } drainTasks(); }
const trashOf=(who, n, trait, type)=>{ for (let i=0;i<n;i++){ const c=card('ST01-001', who); c.trait=trait; if (type) c.type=type; side(who).trash.push(c); } };

// ---- GD04-009 Guncannon 【When Linked】Choose 1 of your other (White Base Team) Units that is Lv.4 or higher. Set it as active. ----
for (const who of ['player','enemy']){
  fresh(who); const g=put('GD04-009', who);
  const zeon=stick(who,6,6,{lv:6,trait:'(Zeon)',rested:true,name:'Zeon Lv6'}), w3=stick(who,3,3,{lv:3,trait:'(White Base Team)',rested:true,name:'WBT Lv3'});
  const w4=stick(who,2,4,{lv:4,trait:'(White Base Team)',rested:true,name:'WBT Lv4'}), w5=stick(who,4,5,{lv:5,trait:'(Earth Federation) (White Base Team)',rested:true,name:'WBT Lv5'});
  pairWith(g, vpilot(who,'Kai Shiden'));
  if (who==='player'){
    const m=modal(); ok('Guncannon (player): the chooser offers only your other (White Base Team) Units that are Lv.4 or higher', !!m && m.btns.length===2 && m.btns.some(b=>/WBT Lv4/.test(b)) && m.btns.some(b=>/WBT Lv5/.test(b)), m&&m.btns.join(','));
    pressUnit(w4);
    ok('Guncannon (player): the chosen WBT Lv4 Unit is set active, nothing else', !w4.rested && w5.rested && w3.rested && zeon.rested);
  } else ok('Guncannon (AI): a (White Base Team) Lv.4+ Unit is set active, never the Zeon or the Lv.3 one', !w5.rested && w4.rested && w3.rested && zeon.rested, `w5 ${w5.rested} w4 ${w4.rested} z ${zeon.rested}`);
}

// ---- GD04-028 Zakrello 【Attack】Choose 1 active enemy Unit. It gains <Blocker> during this turn. ----
{ fresh('player'); const z=put('GD04-028','player'); const a=stick('enemy',1,2,{name:'Foe A'}), b=stick('enemy',5,5,{name:'Foe B'}); const r=stick('enemy',1,9,{rested:true,name:'Foe R'});
  A.fieldClick(z.uid); drainTasks(); A.fieldClick(r.uid); drainTasks();
  ok('Zakrello (player): 【Attack】 asks for an ACTIVE enemy Unit', G.mode==='trigger-target' && cands().length===2 && cands().includes(a.uid) && cands().includes(b.uid), JSON.stringify(cands()));
  A.fieldClick(a.uid); drainTasks();
  ok('Zakrello (player): the chosen enemy Unit gains <Blocker>; Zakrello does not', A.effBlocker(a) && !A.effBlocker(b) && !z.tempBlocker); passAll(); }
{ fresh('enemy'); const z=put('GD04-028','enemy'); const a=stick('player',1,2,{name:'Mine A'}), b=stick('player',5,5,{name:'Mine B'});
  A.declareAttack(z, G.enemy); A.resolveAttackTriggers(z, G.enemy, ()=>{}); drainTasks();
  ok('Zakrello (AI): one of your active Units gains <Blocker> (the weakest), Zakrello does not', A.effBlocker(a) && !A.effBlocker(b) && !A.effBlocker(z)); }

// ---- GD04-035 Ξ Gundam 【Deploy】Choose 1 of your (Mafty) Units. When it destroys an enemy Unit with battle damage during this
//      turn, if you have 3 or less cards in your hand, draw 1. ----
{ fresh('player'); const m1=stick('player',5,5,{trait:'(Mafty)',name:'Mafty One'}), m2=stick('player',2,2,{trait:'(Mafty)',name:'Mafty Two'}); stick('player',6,6,{name:'Not Mafty'});
  G.player.hand=[card('ST01-002','player'), card('ST01-003','player')]; const d0=G.player.deck.length;
  const xi=deployFromHand('GD04-035');
  const m=modal(); ok('Ξ Gundam (player): you choose 1 of your (Mafty) Units (no immediate draw)', !!m && m.btns.length===3 && !m.btns.some(b=>/Not Mafty/.test(b)) && G.player.deck.length===d0, m&&m.btns.join(','));
  pressUnit(m1);
  const foe=stick('enemy',1,1,{rested:true}); const h0=G.player.hand.length;
  A.fieldClick(m1.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); passAll();
  ok('Ξ Gundam (player): the chosen Unit destroys an enemy Unit with 2 cards in hand → draw 1', G.player.hand.length===h0+1, `hand ${h0}->${G.player.hand.length}`);
  const foe2=stick('enemy',1,1,{rested:true}); const h1=G.player.hand.length; m2.rested=false;
  A.fieldClick(m2.uid); drainTasks(); A.fieldClick(foe2.uid); drainTasks(); passAll();
  ok('Ξ Gundam (player): an unchosen (Mafty) Unit gets no draw', G.player.hand.length===h1, `hand ${h1}->${G.player.hand.length}`); }
{ fresh('enemy'); const m1=stick('enemy',5,5,{trait:'(Mafty)'}); G.enemy.hand=[card('ST01-002','enemy'),card('ST01-002','enemy'),card('ST01-002','enemy'),card('ST01-002','enemy')];
  aiDeploy('GD04-035'); const foe=stick('player',1,1,{rested:true}); const h0=G.enemy.hand.length;
  A.battle(m1, foe, G.enemy, G.player); drainTasks();
  ok('Ξ Gundam (AI): with 4 cards in hand the kill draws nothing', G.enemy.hand.length===h0, `${h0}->${G.enemy.hand.length}`);
  G.enemy.hand.splice(0,2); const foe2=stick('player',1,1,{rested:true}); const h1=G.enemy.hand.length;
  A.battle(m1, foe2, G.enemy, G.player); drainTasks();
  ok('Ξ Gundam (AI): with 2 cards in hand the next kill draws 1', G.enemy.hand.length===h1+1, `${h1}->${G.enemy.hand.length}`); }

// ---- GD04-039 Rozen Zulu 【Deploy】Choose 1 enemy Unit. Deal 1 damage to it. If it has <Repair>, deal 3 damage instead. ----
{ fresh('enemy'); const rp=stick('player',2,5,{repair:1,name:'Repairer'}); aiDeploy('GD04-039');
  ok('Rozen Zulu (AI): a <Repair> Unit takes 3', rp.hp===2, 'hp '+rp.hp); }
{ fresh('enemy'); const pl=stick('player',2,5); aiDeploy('GD04-039'); ok('Rozen Zulu (AI): a Unit without <Repair> takes 1', pl.hp===4, 'hp '+pl.hp); }
{ fresh('player'); const rp=stick('enemy',2,5,{repair:2,name:'Foe Repairer'}), pl=stick('enemy',2,5,{name:'Foe Plain'}); deployFromHand('GD04-039');
  ok('Rozen Zulu (player): you choose the enemy Unit', G.mode==='trigger-target' && cands().length===2);
  A.fieldClick(rp.uid); drainTasks(); ok('Rozen Zulu (player): the chosen <Repair> Unit takes 3, the other none', rp.hp===2 && pl.hp===5, `${rp.hp},${pl.hp}`); }

// ---- GD04-043 Zssa (Sleeves) 【Deploy】Choose 1 enemy Base. Deal 1 damage to it.  (Gundam Epyon ST12-001: 5 to it) ----
{ fresh('enemy'); G.player.base=A.exBaseToken('player'); const u=stick('player',2,3); aiDeploy('GD04-043');
  ok('Zssa (Sleeves) (AI): the enemy Base takes 1, never a Unit', G.player.base && G.player.base.hp===2 && u.hp===3, `base ${G.player.base&&G.player.base.hp} unit ${u.hp}`); }
{ fresh('player'); G.enemy.base=A.exBaseToken('enemy'); const u=stick('enemy',2,3); deployFromHand('GD04-043');
  ok('Zssa (Sleeves) (player): the enemy Base takes 1, no Unit is offered', G.enemy.base && G.enemy.base.hp===2 && u.hp===3 && G.mode==='idle', `base ${G.enemy.base&&G.enemy.base.hp} unit ${u.hp} mode ${G.mode}`); }
{ fresh('player'); const u=stick('enemy',2,3); deployFromHand('GD04-043'); ok('Zssa (Sleeves): no enemy Base → no damage anywhere', u.hp===3); }
{ fresh('enemy'); G.player.base=A.exBaseToken('player'); aiDeploy('ST12-001');
  ok('Gundam Epyon (same wording): 5 damage destroys the EX Base', !G.player.base); }

// ---- GD04-082 Rosamia Badam 【When Linked】Choose 1 rested Unit. Deal 1 damage to it. (either player's) ----
{ fresh('player'); const ps=put('GD04-004','player'); const ea=stick('enemy',2,3,{name:'Foe Active'}), er=stick('enemy',2,3,{rested:true,name:'Foe Rested'}), mr=stick('player',2,3,{rested:true,name:'My Rested'});
  pairWith(ps, card('GD04-082','player')); require('./burst_yes.js').resolveFirst(H)(/Rosamia/);   // two effects trigger together: Rosamia's first
  ok('Rosamia Badam (player): rested Units of BOTH players are offered, active ones are not', G.mode==='trigger-target' && G.pending.scope==='any' && cands().length===2 && cands().includes(er.uid) && cands().includes(mr.uid), JSON.stringify(cands()));
  A.fieldClick(mr.uid); drainTasks();
  ok('Rosamia Badam (player): your own chosen rested Unit takes 1', mr.hp===2 && er.hp===3 && ea.hp===3, `${mr.hp},${er.hp},${ea.hp}`); }
{ fresh('enemy'); const ps=put('GD04-004','enemy'); const pa=stick('player',2,3,{name:'Active'}), pr=stick('player',2,3,{rested:true,name:'Rested'});
  pairWith(ps, card('GD04-082','enemy'));
  ok('Rosamia Badam (AI): the rested Unit takes 1, the active one is untouched', pr.hp===2 && pa.hp===3, `${pr.hp},${pa.hp}`); }

// ---- GD04-091 Deux Murasame 【Destroyed】Choose 1 undamaged enemy Unit. Deal 1 damage to it. ----
{ fresh('player'); const u=stick('enemy',3,3); pairWith(u, card('GD04-091','enemy')); const dmg=stick('player',2,3,{hp:2,maxHp:3,name:'Damaged'}), und=stick('player',2,3,{name:'Undamaged'});
  A.damage(u, 99, G.enemy); drainTasks();
  ok('Deux Murasame (AI): the undamaged Unit takes 1, the damaged one is spared', und.hp===2 && dmg.hp===2, `${und.hp},${dmg.hp}`); }
{ fresh('enemy'); const u=stick('player',3,3); pairWith(u, card('GD04-091','player')); const dmg=stick('enemy',2,3,{hp:1,maxHp:3,name:'Hurt'}), a=stick('enemy',2,3,{name:'Fresh A'}), b=stick('enemy',2,3,{name:'Fresh B'});
  A.damage(u, 99, G.player); drainTasks();
  const m=modal(); ok('Deux Murasame (player): only undamaged enemy Units are offered', !!m && m.btns.length===2 && !m.btns.some(x=>/Hurt/.test(x)), m&&m.btns.join(','));
  pressUnit(b); ok('Deux Murasame (player): the chosen one takes 1', b.hp===2 && a.hp===3 && dmg.hp===1); }

// ---- GD04-099 Ali al-Saachez 【During Link】【Attack】You may choose 1 enemy Pilot. Return it to its owner's hand. ----
{ fresh('enemy'); const z=put('GD04-079','enemy'); pairWith(z, card('GD04-099','enemy'));
  const pu=stick('player',2,3,{name:'Paired Mine'}); const pp=pairWith(pu, vpilot('player','My Pilot',1,2));
  A.declareAttack(z, G.enemy); A.resolveAttackTriggers(z, G.enemy, ()=>{}); drainTasks();
  ok('Ali al-Saachez (AI): your Pilot returns to your hand, its Unit stays in play', G.player.hand.includes(pp) && G.player.field.includes(pu) && !pu.pilot && pu.hp===3, `hand ${G.player.hand.includes(pp)} field ${G.player.field.includes(pu)} hp ${pu.hp}`); }
{ fresh('player'); const z=put('GD04-079','player'); pairWith(z, card('GD04-099','player'));
  const e1=stick('enemy',2,3,{name:'Foe Paired'}); const ep=pairWith(e1, vpilot('enemy','Foe Pilot',1,2)); const e2=stick('enemy',2,3,{name:'Foe Bare'});
  const r=stick('enemy',1,9,{rested:true}); A.fieldClick(z.uid); drainTasks(); A.fieldClick(r.uid); drainTasks();
  ok('Ali al-Saachez (player): only enemy Units with a paired Pilot are offered', G.mode==='trigger-target' && cands().length===1 && cands()[0]===e1.uid, JSON.stringify(cands()));
  A.fieldClick(e1.uid); drainTasks();
  ok('Ali al-Saachez (player): the enemy Pilot goes back to its owner\'s hand; the Unit stays', G.enemy.hand.includes(ep) && G.enemy.field.includes(e1) && !e1.pilotCard); passAll(); }
{ fresh('enemy'); const z=put('GD04-079','enemy'); pairWith(z, card('GD04-099','enemy'));
  const pu=stick('player',2,1,{hp:1,maxHp:1,name:'Fragile'}); pairWith(pu, vpilot('player','Lifeline',0,2)); A.damage(pu, 2, G.player);   // 1 HP left = the Pilot's
  A.declareAttack(z, G.enemy); A.resolveAttackTriggers(z, G.enemy, ()=>{}); drainTasks();
  ok('Ali al-Saachez: losing the Pilot\'s HP can destroy its damaged Unit', !G.player.field.includes(pu)); }

// ---- GD05-036 Haow Gundam 【When Paired】You may choose 1 of your other active (MF) Units. Rest it. If you do, deal 2 damage to all
//      enemy Units whose Lv. is equal to or lower than that Unit. ----
for (const who of ['player','enemy']){
  fresh(who); const foeW=who==='player'?'enemy':'player'; const h=put('GD05-036', who);
  const mf4=stick(who,3,3,{trait:'(MF)',lv:4,name:'Ally MF Lv4'}), mf2=stick(who,1,3,{trait:'(MF)',lv:2,name:'Ally MF Lv2'});
  const e2=stick(foeW,2,5,{lv:2,name:'Foe Lv2'}), e4=stick(foeW,2,5,{lv:4,name:'Foe Lv4'}), e6=stick(foeW,2,5,{lv:6,name:'Foe Lv6'});
  pairWith(h, vpilot(who));
  if (who==='player'){
    const m=modal(); ok('Haow Gundam (player): you may choose which of your active (MF) Units to rest', !!m && m.btns.length===3 && m.btns.some(b=>/Don't/.test(b)), m&&m.btns.join(','));
    pressUnit(mf4);
  }
  ok(`Haow Gundam (${who}): the (MF) Lv.4 ally is rested and every enemy Unit Lv.4 or lower takes 2 (no enemy is rested)`,
     mf4.rested && !mf2.rested && e2.hp===3 && e4.hp===3 && e6.hp===5 && !e2.rested && !e4.rested && !e6.rested, `mf4 ${mf4.rested} ${e2.hp},${e4.hp},${e6.hp}`);
}
{ fresh('player'); const h=put('GD05-036','player'); const mf=stick('player',3,3,{trait:'(MF)',lv:4}); const e=stick('enemy',2,5,{lv:2});
  pairWith(h, vpilot('player')); press(/Don't rest/);
  ok('Haow Gundam (player): declining rests nothing and deals nothing', !mf.rested && e.hp===5); }

// ---- GD05-024 Gundam AGE-2 Normal (SP Ver.) 【Destroyed】Choose 1 green (Earth Federation) Pilot card from your trash. Add it to
//      your hand. If you do, discard 1.  (Defurse GD03-064 / Banshee ST12-009 share the rider) ----
{ fresh('player'); const u=put('GD05-024','enemy'); const pc=card('GD03-088','enemy'); G.enemy.trash.push(pc); G.enemy.hand=[card('ST01-002','enemy'),card('ST01-003','enemy'),card('ST01-004','enemy')];
  A.damage(u, 99, G.enemy); drainTasks();
  ok('AGE-2 Normal SP (AI): the Pilot comes back and 1 card is discarded (hand 3 → 3)', G.enemy.hand.length===3 && !G.enemy.trash.includes(pc) && G.enemy.trash.length===2, `hand ${G.enemy.hand.length} trash ${G.enemy.trash.length}`); }
{ fresh('enemy'); const u=put('GD05-024','player'); const p1=card('GD03-088','player'), p2=card('GD05-085','player'); G.player.trash.push(p1, p2);
  G.player.hand=[card('ST01-002','player'),card('ST01-003','player')];
  A.damage(u, 99, G.player); drainTasks();
  const ov=overlay(); ok('AGE-2 Normal SP (player): you choose which green (EF) Pilot to take', !!ov);
  if (ov){ const row=ov.children[0].children.find(x=>x.children && x.children.length); const tiles=row.children.filter(x=>x.onclick); tiles[1].onclick(); drainTasks(); }
  ok('AGE-2 Normal SP (player): …then you choose 1 card to discard', G.mode==='discard' && G.player.hand.includes(p2));
  const keep=G.player.hand.find(c=>c.def==='ST01-002'); if (G.mode==='discard') discardPick(keep);
  ok('AGE-2 Normal SP (player): the chosen discard goes to the trash (hand 2 → 2)', G.player.hand.length===2 && G.player.trash.includes(keep) && G.player.hand.includes(p2)); }
{ fresh('enemy'); const u=put('GD05-024','player'); G.player.hand=[card('ST01-002','player')]; A.damage(u, 99, G.player); drainTasks();
  ok('AGE-2 Normal SP: no Pilot in the trash → no discard', G.player.hand.length===1 && G.mode!=='discard'); }

// ---- GD05-011 Calamity Gundam & Raider Gundam 【Deploy】You may choose 1 of your other active (Earth Alliance) Units. Rest it. If you
//      do, choose 1 rested enemy Unit. Deal 2 damage to it. ----
{ fresh('player'); const a1=stick('player',2,2,{trait:'(Earth Alliance)',name:'EA One'}), a2=stick('player',2,2,{trait:'(Earth Alliance)',name:'EA Two'});
  const r1=stick('enemy',2,5,{rested:true,name:'Rested Foe'}), r2=stick('enemy',2,5,{rested:true,name:'Rested Foe2'}), act=stick('enemy',2,5,{name:'Active Foe'});
  deployFromHand('GD05-011');
  const m=modal(); ok('Calamity (player): you may choose which (Earth Alliance) ally to rest', !!m && m.btns.length===3 && m.btns.some(b=>/Don't/.test(b)), m&&m.btns.join(','));
  pressUnit(a2);
  ok('Calamity (player): then you pick a RESTED enemy Unit', a2.rested && !a1.rested && G.mode==='trigger-target' && cands().length===2 && !cands().includes(act.uid));
  A.fieldClick(r2.uid); drainTasks(); ok('Calamity (player): it takes 2', r2.hp===3 && r1.hp===5 && act.hp===5 && !act.rested); }
{ fresh('player'); const a1=stick('player',2,2,{trait:'(Earth Alliance)'}); const r1=stick('enemy',2,5,{rested:true}); deployFromHand('GD05-011'); press(/Don't rest/);
  ok('Calamity (player): declining the cost → no damage', !a1.rested && r1.hp===5 && G.mode==='idle'); }
{ fresh('enemy'); const a1=stick('enemy',2,2,{trait:'(Earth Alliance)',sick:true}); const r=stick('player',2,2,{rested:true}); aiDeploy('GD05-011');
  ok('Calamity (AI): rests its (Earth Alliance) ally and deals 2 to your rested Unit', a1.rested && !G.player.field.includes(r)); }

// ---- GD05-059 Gundam Barbatos Lupus 【Attack】Choose 1 of your active (Gjallarhorn) Units. Rest it. If you do, draw 1. This Unit
//      gains <High-Maneuver> during this turn. ----
{ fresh('enemy'); const l=put('GD05-059','enemy'); const gh=stick('enemy',2,2,{trait:'(Gjallarhorn)'}); const h0=G.enemy.hand.length;
  A.declareAttack(l, G.enemy); A.resolveAttackTriggers(l, G.enemy, ()=>{}); drainTasks();
  ok('Barbatos Lupus (AI): the (Gjallarhorn) ally is rested, draw 1, and Lupus (not the ally) gains <High-Maneuver>', gh.rested && G.enemy.hand.length===h0+1 && A.effHighManeuver(l) && !A.effHighManeuver(gh)); }
{ fresh('player'); const l=put('GD05-059','player'); const g1=stick('player',2,2,{trait:'(Gjallarhorn)',name:'GH One'}), g2=stick('player',2,2,{trait:'(Gjallarhorn)',name:'GH Two'}); const h0=G.player.hand.length;
  A.fieldClick(l.uid); drainTasks(); A.attackDirect(); drainTasks();
  const m=modal(); ok('Barbatos Lupus (player): you choose which (Gjallarhorn) Unit to rest (no skip — "Choose 1")', !!m && m.btns.length===2 && !m.btns.some(b=>/Don't/.test(b)), m&&m.btns.join(','));
  pressUnit(g1);
  ok('Barbatos Lupus (player): the chosen one is rested, you draw 1, Lupus gains <High-Maneuver>', g1.rested && !g2.rested && G.player.hand.length===h0+1 && A.effHighManeuver(l)); passAll(); }
{ fresh('player'); const l=put('GD05-059','player'); const h0=G.player.hand.length; A.declareAttack(l, G.player); A.resolveAttackTriggers(l, G.player, ()=>{}); drainTasks();
  ok('Barbatos Lupus: with no (Gjallarhorn) Unit → no draw, but <High-Maneuver> anyway', G.player.hand.length===h0 && A.effHighManeuver(l)); }

// ---- "Choose 1 enemy Unit with 1 HP" — GD05-083 Cagalli Yula Athha (【When Paired】) and GD06-009 GM Custom (【Deploy】, "You may") ----
{ fresh('enemy'); const host=stick('enemy',2,2); const big=stick('player',5,5,{name:'Big'}), one=stick('player',3,1,{name:'One'});
  pairWith(host, card('GD05-083','enemy'));
  ok('Cagalli (AI): only the 1-HP Unit is returned', G.player.field.includes(big) && !G.player.field.includes(one) && G.player.hand.includes(one)); }
{ fresh('player'); const big=stick('enemy',5,5,{name:'Big'}), one=stick('enemy',3,1,{name:'One'}); deployFromHand('GD06-009');
  ok('GM Custom (player): only the 1-HP enemy Unit is offered', G.mode==='trigger-target' && cands().length===1 && cands()[0]===one.uid);
  A.fieldClick(one.uid); drainTasks(); ok('GM Custom (player): it returns to its owner\'s hand', G.enemy.hand.includes(one) && G.enemy.field.includes(big)); }
{ fresh('enemy'); const big=stick('player',5,5); aiDeploy('GD06-009'); ok('GM Custom (AI): no 1-HP Unit → nothing returns', G.player.field.includes(big)); }

// ---- GD05-096 Chad Chadan 【Attack】You may deal 1 damage to this Unit. If you do, choose 1 of your other (Tekkadan) Units. It recovers 1 HP. ----
{ fresh('player'); const host=stick('player',3,6,{trait:'(Tekkadan)',name:'Chad Host'}); pairWith(host, card('GD05-096','player'));
  const ally=stick('player',2,3,{trait:'(Tekkadan)',hp:1,maxHp:3,name:'Hurt Ally'}); const r=stick('enemy',0,9,{rested:true}); const hh=host.hp;
  A.fieldClick(host.uid); drainTasks(); A.fieldClick(r.uid); drainTasks();
  ok('Chad Chadan (player): you are asked whether to deal 1 damage to the Unit', !!modal() && /deal 1 damage/i.test(modal().msg));
  press(/Deal 1 damage/);
  ok('Chad Chadan (player): yes → the Unit takes 1 and the other (Tekkadan) Unit recovers 1', host.hp===hh-1 && ally.hp===2, `host ${hh}->${host.hp} ally ${ally.hp}`); passAll(); }
{ fresh('player'); const host=stick('player',3,6,{trait:'(Tekkadan)'}); pairWith(host, card('GD05-096','player')); const ally=stick('player',2,3,{trait:'(Tekkadan)',hp:1,maxHp:3}); const hh=host.hp;
  A.declareAttack(host, G.player); A.resolveAttackTriggers(host, G.player, ()=>{}); drainTasks(); press(/^Don't$/);
  ok('Chad Chadan (player): no → nothing happens', host.hp===hh && ally.hp===1); }
{ fresh('enemy'); const host=stick('enemy',3,6,{trait:'(Tekkadan)'}); pairWith(host, card('GD05-096','enemy')); const ally=stick('enemy',2,3,{trait:'(Tekkadan)',hp:1,maxHp:3}); const hh=host.hp;
  A.declareAttack(host, G.enemy); A.resolveAttackTriggers(host, G.enemy, ()=>{}); drainTasks();
  ok('Chad Chadan (AI): pays 1 damage to heal its damaged (Tekkadan) Unit', host.hp===hh-1 && ally.hp===2); }
{ fresh('enemy'); const host=stick('enemy',3,6,{trait:'(Tekkadan)'}); pairWith(host, card('GD05-096','enemy')); stick('enemy',2,3,{trait:'(Tekkadan)'}); const hh=host.hp;
  A.declareAttack(host, G.enemy); A.resolveAttackTriggers(host, G.enemy, ()=>{}); drainTasks();
  ok('Chad Chadan (AI): nothing to heal → it does not damage itself', host.hp===hh); }

// ---- GD06-023 Galluss J 【Deploy】Rest this Unit. Then, choose 1 of your (Neo Zeon) Units that is Lv.3 or higher. It gets AP+1 during
//      this turn. If you increase a Link Unit's AP with this effect, set this Unit as active. ----
{ fresh('enemy'); const nz=stick('enemy',4,4,{trait:'(Neo Zeon)',lv:5}); const g=aiDeploy('GD06-023');
  ok('Galluss J (AI): it rests itself and a non-Link (Neo Zeon) Lv.5 Unit gets AP+1', g.rested && A.effAp(nz)===5); }
{ fresh('enemy'); const nz=stick('enemy',4,4,{trait:'(Neo Zeon)',lv:5,linked:true}); const g=aiDeploy('GD06-023');
  ok('Galluss J (AI): buffing a Link Unit sets Galluss J active again', !g.rested && A.effAp(nz)===5); }
{ fresh('enemy'); const nz=stick('enemy',4,4,{trait:'(Neo Zeon)',lv:2}); const g=aiDeploy('GD06-023');
  ok('Galluss J (AI): a Lv.2 (Neo Zeon) Unit is not eligible — it stays at AP 4, Galluss J rested', g.rested && A.effAp(nz)===4); }
{ fresh('player'); const a=stick('player',4,4,{trait:'(Neo Zeon)',lv:5,name:'NZ Plain'}), b=stick('player',3,3,{trait:'(Neo Zeon)',lv:4,linked:true,name:'NZ Link'});
  const g=deployFromHand('GD06-023'); const m=modal();
  ok('Galluss J (player): you choose among your (Neo Zeon) Lv.3+ Units', g.rested && !!m && m.btns.length===2, m&&m.btns.join(','));
  pressUnit(b); ok('Galluss J (player): choosing the Link Unit → AP+1 and Galluss J is set active', A.effAp(b)===4 && A.effAp(a)===4 && !g.rested); }

// ---- GD06-038 Gundam Kimaris Vidar 【When Paired】Choose 1 enemy Unit with the highest Lv. Deal 3 damage to it. (and ST08-001 Ξ Gundam) ----
{ fresh('enemy'); const k=put('GD06-038','enemy'); const lo=stick('player',6,3,{lv:2,name:'Low'}), hi=stick('player',2,9,{lv:7,name:'High'});
  pairWith(k, vpilot('enemy')); ok('Kimaris Vidar (AI): the highest-Lv enemy Unit takes 3', hi.hp===6 && lo.hp===3, `${hi.hp},${lo.hp}`); }
{ fresh('player'); const k=put('GD06-038','player'); const lo=stick('enemy',6,3,{lv:2}), hi=stick('enemy',2,9,{lv:7}), hi2=stick('enemy',2,9,{lv:7});
  pairWith(k, vpilot('player'));
  ok('Kimaris Vidar (player): only the highest-Lv enemy Units are offered', G.mode==='trigger-target' && cands().length===2 && !cands().includes(lo.uid));
  A.fieldClick(hi2.uid); drainTasks(); ok('Kimaris Vidar (player): the chosen one takes 3', hi2.hp===6 && hi.hp===9 && lo.hp===3); }

// ---- GD06-048 Helmwige Reincar 【Deploy】Choose 1 enemy Unit that is Lv.2 or lower. Deal 1 damage to it. If there are 4 or more
//      (Gjallarhorn) cards in your trash, choose 1 enemy Unit instead. ----
{ fresh('player'); const lo=stick('enemy',1,3,{lv:2}), hi=stick('enemy',1,3,{lv:5}); deployFromHand('GD06-048');
  ok('Helmwige Reincar (player): 3 (Gjallarhorn) cards or fewer → only the Lv.2 Unit', G.mode==='trigger-target' && cands().length===1 && cands()[0]===lo.uid); A.fieldClick(lo.uid); drainTasks(); }
{ fresh('player'); trashOf('player', 4, '(Gjallarhorn)'); const lo=stick('enemy',1,3,{lv:2}), hi=stick('enemy',1,3,{lv:5}); deployFromHand('GD06-048');
  ok('Helmwige Reincar (player): 4 (Gjallarhorn) cards in trash → any enemy Unit', G.mode==='trigger-target' && cands().length===2);
  A.fieldClick(hi.uid); drainTasks(); ok('Helmwige Reincar (player): the Lv.5 Unit takes 1', hi.hp===2); }
{ fresh('enemy'); trashOf('enemy', 5, '(Gjallarhorn)'); const hi=stick('player',1,3,{lv:5}); aiDeploy('GD06-048');
  ok('Helmwige Reincar (AI): with 5 (Gjallarhorn) cards it hits a Lv.5 Unit', hi.hp===2); }

// ---- GD06-068 Gundam Heavyarms Custom (EW) 【Deploy】Choose 1 enemy Unit that is Lv.3 or lower. Rest it. If you have another
//      (G Team)/(Preventer) Unit in play, that enemy Unit gets AP-2 during this turn. ----
{ fresh('enemy'); stick('enemy',2,2,{trait:'(G Team)'}); const e=stick('player',5,5,{lv:3}); aiDeploy('GD06-068');
  ok('Heavyarms Custom (EW) (AI): with another (G Team) Unit → rested and AP-2', e.rested && A.effAp(e)===3, `rested ${e.rested} ap ${A.effAp(e)}`); }
{ fresh('enemy'); stick('enemy',2,2,{trait:'(Zeon)'}); const e=stick('player',5,5,{lv:3}); aiDeploy('GD06-068');
  ok('Heavyarms Custom (EW) (AI): another Unit that is not (G Team)/(Preventer) → rested only', e.rested && A.effAp(e)===5); }
{ fresh('player'); stick('player',2,2,{trait:'(Preventer)'}); const e=stick('enemy',5,5,{lv:3}), e2=stick('enemy',5,5,{lv:3}); deployFromHand('GD06-068');
  A.fieldClick(e2.uid); drainTasks(); ok('Heavyarms Custom (EW) (player): your chosen Unit is rested and gets AP-2 ((Preventer) ally)', e2.rested && A.effAp(e2)===3 && !e.rested && A.effAp(e)===5); }

// ---- GD06-094 Nyaan 【When Paired】Choose 1 friendly Unit. It gains the following effect during this turn: ■When this Unit deals
//      battle damage to an enemy Unit that is Lv.4 or lower, destroy that enemy Unit. ----
{ fresh('player'); const u=stick('player',3,5,{name:'Nyaan Host'}), o=stick('player',2,2,{name:'Other'}); const e4=stick('enemy',1,9,{lv:4,rested:true}), e5=stick('enemy',1,9,{lv:5,rested:true});
  pairWith(u, card('GD06-094','player'));
  const m=modal(); ok('Nyaan (player): you choose the friendly Unit; nothing is destroyed on pairing', !!m && m.btns.length===2 && G.enemy.field.includes(e4) && G.enemy.field.includes(e5), m&&m.btns.join(','));
  pressUnit(u);
  A.fieldClick(u.uid); drainTasks(); A.fieldClick(e4.uid); drainTasks(); passAll();
  ok('Nyaan (player): its battle damage destroys the Lv.4 enemy Unit (9 HP)', !G.enemy.field.includes(e4));
  o.rested=false; A.fieldClick(o.uid); drainTasks(); A.fieldClick(e5.uid); drainTasks(); passAll();
  ok('Nyaan (player): the Unit that was not chosen has no such effect', G.enemy.field.includes(e5)); }
{ fresh('enemy'); const u=stick('enemy',3,5); pairWith(u, card('GD06-094','enemy')); const t4=stick('player',1,9,{lv:4}), t5=stick('player',1,9,{lv:5});
  ok('Nyaan (AI): pairing alone destroys nothing', G.player.field.includes(t4) && G.player.field.includes(t5));
  A.battle(u, t5, G.enemy, G.player); drainTasks(); u.rested=false;
  ok('Nyaan (AI): a Lv.5 Unit that takes its battle damage survives', G.player.field.includes(t5));
  A.battle(u, t4, G.enemy, G.player); drainTasks();
  ok('Nyaan (AI): a Lv.4 Unit that takes its battle damage is destroyed', !G.player.field.includes(t4)); }
{ fresh('enemy'); const u=stick('enemy',3,5); pairWith(u, card('GD06-094','enemy')); G.turnSeq++; const t4=stick('player',1,9,{lv:4});
  A.battle(u, t4, G.enemy, G.player); drainTasks(); ok('Nyaan: the gained effect ends with the turn', G.player.field.includes(t4)); }

// ---- GD06-130 Soleil (Base) 【Deploy】Add 1 of your Shields to your hand. Then, choose 1 enemy Unit with no paired Pilot. Reduce its
//      AP by an amount equal to the number of friendly (Dianna Counter)/(Militia) Units during this turn. ----
{ fresh('enemy'); stick('enemy',1,1,{trait:'(Dianna Counter)'}); stick('enemy',1,1,{trait:'(Militia)'}); stick('enemy',1,1,{trait:'(Zeon)'});
  const bare=stick('player',5,5), paired=stick('player',6,6); pairWith(paired, vpilot('player'));
  const s=card('GD06-130','enemy'); G.enemy.base=s; const sh=G.enemy.shields.length, hd=G.enemy.hand.length;
  A.runTrigger(s, G.enemy, A.parseTrigger(s.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Soleil (AI): a Shield to hand, then the unpaired Unit gets AP-2 (2 friendly (Dianna Counter)/(Militia) Units)', G.enemy.shields.length===sh-1 && G.enemy.hand.length===hd+1 && A.effAp(bare)===3 && A.effAp(paired)===7, `ap ${A.effAp(bare)} paired ${A.effAp(paired)}`); }
{ fresh('player'); stick('player',1,1,{trait:'(Militia)'}); const bare=stick('enemy',5,5), paired=stick('enemy',6,6); pairWith(paired, vpilot('enemy'));
  const s=card('GD06-130','player'); G.player.hand.push(s); A.playFromHand(s.uid); drainTasks();
  ok('Soleil (player): only the enemy Unit with no paired Pilot is offered', G.mode==='trigger-target' && cands().length===1 && cands()[0]===bare.uid, `mode ${G.mode} ${JSON.stringify(cands())}`);
  A.fieldClick(bare.uid); drainTasks(); ok('Soleil (player): its AP drops by 1 (one (Militia) Unit)', A.effAp(bare)===4); }

// ---- extras ----
// GD04-052 Gundam Leopard Destroy 【During Pair】【Attack】You may choose 1 enemy Unit. Deal 2 damage to it and this Unit.
{ fresh('enemy'); const l=put('GD04-052','enemy'); pairWith(l, vpilot('enemy')); const t=stick('player',2,6); const lh=l.hp;
  A.declareAttack(l, G.enemy); A.resolveAttackTriggers(l, G.enemy, ()=>{}); drainTasks();
  ok('Gundam Leopard Destroy (AI): the enemy Unit and Leopard itself each take 2', t.hp===4 && l.hp===lh-2, `${t.hp},${l.hp}`); }
{ fresh('player'); const l=put('GD04-052','player'); pairWith(l, vpilot('player')); const t=stick('enemy',2,6); const lh=l.hp;
  A.declareAttack(l, G.player); A.resolveAttackTriggers(l, G.player, ()=>{}); drainTasks(); A.fieldClick(t.uid); drainTasks();
  ok('Gundam Leopard Destroy (player): your chosen Unit and Leopard take 2', t.hp===4 && l.hp===lh-2); }
// GD04-087 Elan Ceres 【During Link】【Attack】You may choose 1 of your (Academy) Units — the player may decline.
{ fresh('player'); const ph=put('GD04-018','player'); pairWith(ph, card('GD04-087','player')); const ac=stick('player',1,6,{trait:'(Academy)'});
  A.declareAttack(ph, G.player); A.resolveAttackTriggers(ph, G.player, ()=>{}); drainTasks();
  ok('Elan Ceres (player): you are offered the (Academy) Unit with a way to decline', !!modal() && modal().btns.some(b=>/Don't/.test(b)));
  press(/Don't/); ok('Elan Ceres (player): declining keeps the damage on this Unit', !ph.redirectTo); }
// GD05-017 Nu Gundam 【When Paired】 damage-step battle: its <Breach 5> and Amuro Ray's "recovers 2 HP" apply.
{ fresh('enemy'); const nu=put('GD05-017','enemy'); trashOf('enemy', 3, '(Londo Bell)', 'unit'); const t=stick('player',2,4);
  pairWith(nu, card('GD05-085','enemy'));
  ok('Nu Gundam (AI): the damage-step battle destroys the Unit and <Breach 5> takes a Shield', !G.player.field.includes(t) && G.player.shields.length===5, `shields ${G.player.shields.length}`);
  ok('Nu Gundam (AI): Amuro Ray\'s on-kill recovery applies (took 2, recovered 2)', nu.hp===A.effMaxHp(nu), `hp ${nu.hp}/${A.effMaxHp(nu)}`); }
// GD06-095 Kelley Layzner (same wording as Chad): "choose 1 of your (Zeon) Units" — a (Neo Zeon) Unit is not (Zeon).
{ fresh('player'); const host=stick('player',3,6,{trait:'(Zeon)',name:'Kelley Host'}); pairWith(host, card('GD06-095','player')); const nz=stick('player',2,2,{trait:'(Neo Zeon)',name:'NZ'});
  const ap0=A.effAp(host); A.declareAttack(host, G.player); A.resolveAttackTriggers(host, G.player, ()=>{}); drainTasks(); press(/Deal 1 damage/);
  ok('Kelley Layzner (player): only (Zeon) Units qualify — the host gets AP+2, the (Neo Zeon) Unit nothing', A.effAp(host)===ap0+2 && A.effAp(nz)===2, `host ${ap0}->${A.effAp(host)} nz ${A.effAp(nz)}`); }
// GD05-071 Gundam Sandrock Custom (EW): "If you have another (G Team)/(Preventer) Unit in play" now needs one of those traits.
{ fresh('enemy'); const s=put('GD05-071','enemy'); stick('enemy',1,1,{trait:'(Zeon)'}); const t=stick('player',5,5);
  A.declareAttack(s, G.enemy); A.resolveAttackTriggers(s, G.enemy, ()=>{}); drainTasks(); ok('Sandrock Custom (EW): another non-(G Team) Unit → no AP-2', A.effAp(t)===5);
  fresh('enemy'); const s2=put('GD05-071','enemy'); stick('enemy',1,1,{trait:'(G Team)'}); const t2=stick('player',5,5);
  A.declareAttack(s2, G.enemy); A.resolveAttackTriggers(s2, G.enemy, ()=>{}); drainTasks(); ok('Sandrock Custom (EW): another (G Team) Unit → AP-2', A.effAp(t2)===3); }
// GD05-002 Strike Freedom Gundam "choose 1 enemy Unit with the lowest Lv." / GD03-075 Super Gundam "with no paired Pilot"
{ fresh('player'); const lo=stick('enemy',1,1,{lv:2}), hi=stick('enemy',1,1,{lv:5}); const act=A.parseClause('Choose 1 enemy Unit with the lowest Lv. Return it to the bottom of its owner\'s deck.');
  const ts=A.enemyTargets(G.enemy, act); ok('"with the lowest Lv." limits the targets to the lowest-Lv enemy Units', ts.length===1 && ts[0]===lo); }

// ---- the same wordings on cards outside GD04–GD06 (fixed by the same parser rules) ----
// GD03-039 Red Gundam — "Choose 1 other active friendly (Clan) Unit. Rest it. If you do, choose 1 enemy Unit with 2 or less AP. Deal 2 damage to it."
{ fresh('enemy'); const c=stick('enemy',2,2,{trait:'(Clan)',sick:true}); const t=stick('player',2,2), big=stick('player',5,5); aiDeploy('GD03-039');
  ok('Red Gundam (AI): rests its (Clan) ally, then 2 damage to the 2-AP Unit (never rests an enemy)', c.rested && !G.player.field.includes(t) && big.hp===5 && !big.rested); }
{ fresh('player'); const c=stick('player',2,2,{trait:'(Clan)',name:'Clan Ally'}); const t=stick('enemy',2,3); deployFromHand('GD03-039');
  ok('Red Gundam (player): its only (Clan) ally pays automatically ("Choose 1"), then you pick the 2-AP enemy', c.rested && G.mode==='trigger-target' && cands().length===1);
  A.fieldClick(t.uid); drainTasks(); ok('Red Gundam (player): 2 damage', t.hp===1); }
// GD03-064 Defurse — "You may choose 1 (X-Rounder) card from your trash and add it to your hand. If you do, discard 1."
{ fresh('player'); const x=card('GD02-088','player'); G.player.trash.push(x); G.player.hand=[card('ST01-002','player')]; deployFromHand('GD03-064');
  const ov=overlay(); const skip=ov && ov.children[0].children.find(b=>/Take none/.test(b.textContent||''));
  ok('Defurse (player): "You may" — the trash chooser can take none', !!skip); if (skip) skip.onclick(); drainTasks();
  ok('Defurse (player): taking none → no discard', G.player.trash.includes(x) && G.player.hand.length===1 && G.mode!=='discard'); }
// GD04-084 Sleggar Law — "Choose 1 of your (White Base Team) Units" (the "White" in the trait is not a colour requirement)
{ fresh('enemy'); const h=stick('enemy',3,3,{trait:'(White Base Team)',color:'Blue'}); pairWith(h, card('GD04-084','enemy')); const ap0=A.effAp(h);
  A.declareAttack(h, G.enemy); A.resolveAttackTriggers(h, G.enemy, ()=>{}); drainTasks();
  ok('Sleggar Law: a blue (White Base Team) Unit gets the AP+1', A.effAp(h)===ap0+1, `${ap0}->${A.effAp(h)}`); }
// GD04-080 Alvatore — "If you have another (UN)/(Superpower Bloc) Unit in play, deploy 1 rested [Alvaaron] token"
{ fresh('enemy'); const a=put('GD04-080','enemy'); stick('enemy',1,1,{trait:'(Zeon)'}); A.damage(a, 99, G.enemy); drainTasks();
  ok('Alvatore: another Unit without (UN)/(Superpower Bloc) → no token', !G.enemy.field.some(u=>u.token));
  fresh('enemy'); const b=put('GD04-080','enemy'); stick('enemy',1,1,{trait:'(Superpower Bloc)'}); A.damage(b, 99, G.enemy); drainTasks();
  ok('Alvatore: another (Superpower Bloc) Unit → the Alvaaron token', G.enemy.field.some(u=>u.token && /Alvaaron/.test(u.name))); }
// GD02-083 Graze Ritter (Ground Type) — "choose 1 of your (Gjallarhorn) Units. Set it as active."
{ fresh('player'); const gr=put('GD02-083','enemy'); const z=stick('enemy',9,9,{trait:'(Zeon)',rested:true}), gh=stick('enemy',2,2,{trait:'(Gjallarhorn)',rested:true});
  A.damage(gr, 99, G.enemy); drainTasks(); ok('Graze Ritter (Ground Type): only a (Gjallarhorn) Unit is set active', !gh.rested && z.rested); }

console.log(`passed: ${pass} | failed: ${fail.length}`);
for (const f of fail) console.log('  ! '+f);
console.log(`Errors: ${ERRORS.length}`);
for (const e of ERRORS.slice(0,5)) console.log('  ', e.ctx, e.phase, e.msg, e.stack);
