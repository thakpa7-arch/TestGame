// FAQ round 4, group cmd: Command playability (10-1-8-1-1/-2) and "exile N".
//  • A Command can't be played or activated unless its opening "If …" condition is met (Q245) and every target the part before
//    "Then" / "If you do" chooses can be chosen (Q153, Q253, Q408, Q413, Q538) — both players; via 【Burst】 "Activate this card's
//    【Main】", as the Command paired with a Unit (Gundam Rose) and Domon Kasshu's discard too. A modal Command needs one legal mode (Q402).
//  • "Choose 1 Unit with <Blocker>" may choose either player's Unit (Q334).
//  • "That player chooses 2 Unit cards from their trash. Exile them." exiles nothing with fewer than 2 (Q556, Q557).
//  • "You may <cost>. If you do, A. Then, B" — B needs the cost paid too (Q175 Gundam AGE-1 Normal, Kapool).
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra!==undefined?'  ('+extra+')':'')); }
let UID=957000;
const FILL='ST01-005';   // GM — a plain Unit with no effect text
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,modalQueue:[],
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,endActionStep:false,activateRestSub:null,_aiPostDeploy:false,_aiGuard:0,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get(FILL), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get(FILL), s.who)); }
  el('log').children.length=0;
}
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const sideOf=who=>who==='player'?G.player:G.enemy;
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); sideOf(who).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); sideOf(who).field.push(c); return c;
}
const strip=s=>String(s||'').replace(/<[^>]+>/g,'');
const modal=()=>el('blockModal').classList.contains('show') ? { msg:strip(el('blockMsg').innerHTML), btns:[...el('blockBtns').children].map(b=>strip(b.innerHTML||b.textContent)) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test(strip(x.innerHTML||x.textContent)) && x.onclick); if(!b) return false; b.onclick(); drainTasks(); return true; }
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pressUnit=u=>press(new RegExp('^'+esc(u.name)+' '));
const passAll=()=>{ let g=0; while (modal() && g++<10){ const m=modal(); if (!/Action Step|block|Block|intercept/i.test(m.msg)) break; if (!press(/^Pass|No block|Don't block|Take it/i)) break; } };
const logs=()=>(el('log').children||[]).map(c=>strip(c.innerHTML||c.textContent));
// Play a Command from the player's hand in the main phase (a 【Pilot】 Command is played for its Command effect).
const handPlay=id=>{ const c=card(id,'player'); G.player.hand.push(c); A.playFromHand(c.uid, true); drainTasks();
  if (modal() && /Play .* as/.test(modal().msg)) press(/Command effect/); return c; };
const inHand=(who, id)=>sideOf(who).hand.some(c=>c.def===id);
// The player's action-step offers (End Phase of the opponent's turn: no battle).
const offers=()=>{ G.turn='enemy'; const o=(A.collectPlayerActions(null)||[]).map(x=>strip(x.label)); G.turn='player'; return o; };
const offered=(id)=>offers().some(l=>l.includes(A.CARD_BY_ID.get(id).name));
const aiCan=(id)=>{ const c=card(id,'enemy'); return A.cmdPlayable(c.action, G.enemy, c); };
const setTrash=(who, ids)=>{ sideOf(who).trash=ids.map(i=>card(i, who)); A.refreshTrashStats(sideOf(who)); };
const BASE='ST01-015', MASTER='GD05-033';
const draws=(s, d0)=>d0-s.deck.length;

// ===== Q334 30cm Cannon (APFSDS Round) EB01-084 — "Choose 1 Unit with <Blocker>. Set it as active." — either player's Unit =====
{ fresh('player'); const eb=stick('enemy',2,3,{blocker:true, rested:true, name:'EnemyBlocker'}); const c=handPlay('EB01-084');
  if (modal()) pressUnit(eb);
  ok('Q334 30cm Cannon (player): only an enemy rested <Blocker> in play — it is played on it (set active)', !G.player.hand.includes(c) && G.player.trash.includes(c) && !eb.rested, `inHand ${G.player.hand.includes(c)} rested ${eb.rested}`); }
{ fresh('player'); const mine=stick('player',2,3,{blocker:true, rested:true, name:'MyBlocker'}), eb=stick('enemy',2,3,{blocker:true, rested:true, name:'EnemyBlocker'}); handPlay('EB01-084');
  const m=modal(); const both=!!m && m.btns.some(b=>/MyBlocker/.test(b)) && m.btns.some(b=>/EnemyBlocker/.test(b)); pressUnit(eb);
  ok('Q334 30cm Cannon (player): with both, the chooser lists both and the enemy one can be chosen', both && !eb.rested && mine.rested, JSON.stringify(m)); }
{ fresh('enemy'); stick('player',2,3,{blocker:true, rested:true});
  ok('Q334 30cm Cannon (AI side): playable with only the player\'s rested <Blocker> in play', aiCan('EB01-084'));
  fresh('enemy'); ok('Q334 30cm Cannon (AI side): not playable with no rested <Blocker> at all', !aiCan('EB01-084')); }

// ===== Q245 Field Directive GD03-103 — 【Main】If 3 or more enemy Units are in play, choose 1 rested enemy Unit. Deal 2 damage to it. =====
{ fresh('player'); const r=stick('enemy',1,5,{rested:true}); stick('enemy',1,5); const c=handPlay('GD03-103');
  ok('Q245 Field Directive (player): 2 enemy Units — can\'t be played; it stays in hand, nothing paid', G.player.hand.includes(c) && G.player.resAvail===10 && r.hp===5 && !G.player.trash.includes(c)); }
{ fresh('player'); const r=stick('enemy',1,5,{rested:true}); stick('enemy',1,5); stick('enemy',1,5); const c=handPlay('GD03-103');
  if (G.mode==='trigger-target'){ A.fieldClick(r.uid); drainTasks(); } else if (modal()) pressUnit(r);
  ok('Q245 Field Directive (player): 3 enemy Units — played, 2 damage to the rested one', !G.player.hand.includes(c) && r.hp===3, `hp ${r.hp}`); }
{ fresh('enemy'); stick('player',1,5,{rested:true}); stick('player',1,5); G.enemy.hand=[card('GD03-103','enemy')]; A.aiMainStep(); drainTasks();
  ok('Q245 Field Directive (AI): 2 player Units — not played', inHand('enemy','GD03-103') && !aiCan('GD03-103')); }

// ===== Q153 The Stubborn Cog GD01-103 — Choose 1 active friendly (Earth Federation) Unit and 1 active enemy Unit. Rest them. =====
{ fresh('player'); stick('player',2,3,{trait:'(Earth Federation)', rested:true}); stick('player',2,3,{trait:'(Zeon)'}); const e=stick('enemy',2,2); const c=handPlay('GD01-103');
  ok('Q153 The Stubborn Cog (player): no active (Earth Federation) Unit — can\'t be played (only the enemy half is choosable)', G.player.hand.includes(c) && !e.rested && G.player.resAvail===10); }
{ fresh('player'); const f=stick('player',2,3,{trait:'(Earth Federation)', name:'Fed'}); const e=stick('enemy',2,2,{name:'Foe'}); const c=handPlay('GD01-103');
  let g=0; while (g++<4){ if (modal()){ if (!pressUnit(f) && !pressUnit(e)) break; } else if (G.mode==='trigger-target'){ A.fieldClick(e.uid); drainTasks(); } else break; }
  ok('Q153 The Stubborn Cog (player): with both an active (EF) Unit and an active enemy Unit — both are rested', !G.player.hand.includes(c) && f.rested && e.rested, `${f.rested}/${e.rested}`); }
{ fresh('enemy'); stick('player',2,2); stick('enemy',2,3,{trait:'(Zeon)'});
  ok('Q153 The Stubborn Cog (AI side): no active (EF) Unit of its own — not playable', !aiCan('GD01-103')); }

// ===== Q408 Darkness Finger GD05-110 — Choose 1 enemy Unit. Deal 2 damage to it. Then, if you have a "Master Gundam", draw 1. =====
{ fresh('player'); put(MASTER,'player'); const d0=G.player.deck.length; const c=handPlay('GD05-110');
  ok('Q408 Darkness Finger (player): Master Gundam but no enemy Unit — can\'t be played (no draw)', G.player.hand.includes(c) && draws(G.player,d0)===0 && G.player.resAvail===10);
  ok('Q408 Darkness Finger (player): not offered in an action step', !offered('GD05-110'), JSON.stringify(offers())); }
{ fresh('player'); put(MASTER,'player'); const e=stick('enemy',1,5); const d0=G.player.deck.length; const c=handPlay('GD05-110');
  if (G.mode==='trigger-target'){ A.fieldClick(e.uid); drainTasks(); } else if (modal()) pressUnit(e);
  ok('Q408 Darkness Finger (player): with an enemy Unit — 2 damage, then the draw', !G.player.hand.includes(c) && e.hp===3 && draws(G.player,d0)===1, `hp ${e.hp} draws ${draws(G.player,d0)}`); }
{ fresh('enemy'); put(MASTER,'enemy'); G.enemy.hand=[card('GD05-110','enemy')]; A.aiMainStep(); drainTasks();
  ok('Q408 Darkness Finger (AI): no player Unit — not played', inHand('enemy','GD05-110') && !aiCan('GD05-110')); }
// Its 【Burst】 "Activate this card's 【Main】": with no enemy Unit to choose nothing happens — not even the draw.
{ fresh('enemy'); put(MASTER,'player'); const d0=G.player.deck.length; const b=card('GD05-110','player'); A.triggerBurst(b, G.player, ()=>{}, true); drainTasks();
  ok('Q408 Darkness Finger (player Burst): no enemy Unit — the Burst does nothing (no draw); the card is trashed', draws(G.player,d0)===0 && G.player.trash.includes(b) && !modal(), draws(G.player,d0)); }
{ fresh('player'); put(MASTER,'enemy'); const d0=G.enemy.deck.length; const b=card('GD05-110','enemy'); A.triggerBurst(b, G.enemy, ()=>{}, false); drainTasks();
  ok('Q408 Darkness Finger (AI Burst): no player Unit — nothing happens (no draw)', draws(G.enemy,d0)===0 && G.enemy.trash.includes(b)); }
{ fresh('player'); put(MASTER,'enemy'); const p=stick('player',1,5); const d0=G.enemy.deck.length; A.triggerBurst(card('GD05-110','enemy'), G.enemy, ()=>{}, false); drainTasks();
  ok('Q408 Darkness Finger (AI Burst): with a player Unit — 2 damage and the draw', p.hp===3 && draws(G.enemy,d0)===1, `hp ${p.hp}`); }

// ===== Q538 The Gundam Says GD06-101 — Choose 1 enemy Unit with 5 or less HP. Return it. Then, if an (Alphacide) Link Unit, draw 1. =====
{ fresh('player'); stick('player',2,3,{trait:'(Alphacide)', linked:true}); const d0=G.player.deck.length; const c=handPlay('GD06-101');
  ok('Q538 The Gundam Says (player): (Alphacide) Link Unit, no enemy Unit — can\'t be played', G.player.hand.includes(c) && draws(G.player,d0)===0);
  stick('enemy',1,6); const c2=handPlay('GD06-101');
  ok('Q538 The Gundam Says (player): only a 6-HP enemy Unit — can\'t be played, not offered in an action step', G.player.hand.includes(c2) && !offered('GD06-101')); }
{ fresh('player'); stick('player',2,3,{trait:'(Alphacide)', linked:true}); const e=stick('enemy',1,5); const d0=G.player.deck.length; handPlay('GD06-101');
  if (G.mode==='trigger-target'){ A.fieldClick(e.uid); drainTasks(); } else if (modal()) pressUnit(e);
  ok('Q538 The Gundam Says (player): a 5-HP enemy Unit — returned, then the draw', !G.enemy.field.includes(e) && draws(G.player,d0)===1); }
{ fresh('enemy'); stick('enemy',2,3,{trait:'(Alphacide)', linked:true}); stick('player',1,6); G.enemy.hand=[card('GD06-101','enemy')]; A.aiMainStep(); drainTasks();
  ok('Q538 The Gundam Says (AI): only a 6-HP player Unit — not played', inHand('enemy','GD06-101') && !aiCan('GD06-101')); }

// ===== Q413 Shining Finger GD05-120 — Choose 1 enemy Unit with 4 or less HP. Rest it. Then, you may choose 1 "Shining Gundam" … =====
{ fresh('player'); put('GD05-066','player'); stick('enemy',1,5); const c=handPlay('GD05-120');
  ok('Q413 Shining Finger (player): no enemy Unit with 4 or less HP — can\'t be played (no First Strike-only play)', G.player.hand.includes(c) && !modal() && G.player.resAvail===10);
  ok('Q413 Shining Finger (player): not offered in an action step', !offered('GD05-120')); }
{ fresh('player'); const sg=put('GD05-066','player'); const e=stick('enemy',1,4); const c=handPlay('GD05-120');
  if (G.mode==='trigger-target'){ A.fieldClick(e.uid); drainTasks(); } else if (modal()) pressUnit(e);
  if (modal()) pressUnit(sg);
  ok('Q413 Shining Finger (player): a 4-HP enemy Unit — rested, then the optional First Strike', !G.player.hand.includes(c) && e.rested && A.effFirstStrike(sg)); }
{ fresh('enemy'); put('GD05-066','enemy'); stick('player',1,5);
  ok('Q413 Shining Finger (AI side): no player Unit with 4 or less HP — not playable', !aiCan('GD05-120')); }

// ===== Q253 Unheralded Attack GD03-121 — 【Action】Choose 1 friendly Base and 1 enemy Unit with 3 or less HP. Rest them. =====
{ fresh('player'); stick('enemy',1,3);
  ok('Q253 Unheralded Attack (player): no friendly Base — not offered in an action step', !offered('GD03-121') || (G.player.hand=[], false));
  G.player.hand=[card('GD03-121','player')]; G.player.base=card(BASE,'player'); G.player.base.rested=false;
  ok('Q253 Unheralded Attack (player): with a friendly Base and a 3-HP enemy Unit — offered', offered('GD03-121'), JSON.stringify(offers())); }
{ fresh('player'); G.player.hand=[card('GD03-121','player')]; stick('enemy',1,3);
  ok('Q253 Unheralded Attack (player): no friendly Base — the action step lists nothing for it', !offered('GD03-121'), JSON.stringify(offers())); }
{ fresh('enemy'); stick('player',1,3); ok('Q253 Unheralded Attack (AI side): no Base of its own — not playable', !aiCan('GD03-121'));
  G.enemy.base=card(BASE,'enemy'); ok('Q253 Unheralded Attack (AI side): with its Base — playable', aiCan('GD03-121')); }

// ===== note-Q402 Wings of Light GD05-102 — modal: playable iff a mode can be chosen =====
{ fresh('enemy'); ok('Q402 Wings of Light (AI side): no Units in play — no mode is legal, not playable', !aiCan('GD05-102'));
  stick('player',1,7); ok('Q402 Wings of Light (AI side): any Unit in play — the "recover 3 HP" mode is legal', aiCan('GD05-102'));
  fresh('player'); G.player.hand=[card('GD05-102','player')]; ok('Q402 Wings of Light (player): no Units — not offered', !offered('GD05-102')); }

// ===== ruling GD02-100 Dramatic Turnabout — Choose 1 friendly damaged Unit. It recovers 2 HP. Then, draw 1. =====
{ fresh('player'); stick('player',2,4); const d0=G.player.deck.length; const c=handPlay('GD02-100');
  ok('Dramatic Turnabout (player): no damaged friendly Unit — can\'t be played just for the draw', G.player.hand.includes(c) && draws(G.player,d0)===0 && G.player.resAvail===10); }
{ fresh('player'); const u=stick('player',2,4,{hp:1}); const d0=G.player.deck.length; const c=handPlay('GD02-100'); if (modal()) pressUnit(u);
  ok('Dramatic Turnabout (player): a damaged friendly Unit — it recovers 2 HP, then draw 1', !G.player.hand.includes(c) && u.hp===3 && draws(G.player,d0)===1, `hp ${u.hp}`); }
{ fresh('enemy'); stick('enemy',2,4); G.enemy.hand=[card('GD02-100','enemy')]; ok('Dramatic Turnabout (AI side): no damaged Unit — not playable', !aiCan('GD02-100')); }

// ===== The same rule on other shapes of the pool =====
{ fresh('player'); stick('player',1,5,{trait:'(Zeon)'}); const e=stick('enemy',1,5); const c=handPlay('GD03-116');
  ok('Towards Destiny (player): no friendly (Vagan) Unit — can\'t be played (both halves must be choosable)', G.player.hand.includes(c) && e.hp===5);
  fresh('enemy'); stick('enemy',1,5,{trait:'(Vagan)'}); ok('Towards Destiny (AI side): no player Unit — not playable', !aiCan('GD03-116')); }
{ fresh('player'); stick('player',1,1,{trait:'(UN)'}); stick('enemy',3,5); const c=handPlay('GD04-118');
  ok('World Distortion (player): only 1 (UN) Unit — its "If" is unmet, can\'t be played', G.player.hand.includes(c)); }
{ fresh('player'); stick('player',3,3,{token:true, trait:'(Earth Alliance)'}); const c=handPlay('ST04-012');
  ok('Striker Pack (player): an (Earth Alliance) token in play — its "If" is unmet, can\'t be played', G.player.hand.includes(c) && G.player.resAvail===10); }
{ fresh('player'); setTrash('player',[FILL,FILL]); stick('enemy',1,5); const c=handPlay('ST13-015');
  ok('Operation to Intercept Solomon (player): only 2 Unit cards in the trash — can\'t be played (3 must be chosen)', G.player.hand.includes(c) && G.player.trash.length===2); }
{ fresh('player'); stick('player',2,2); const c=handPlay('GD06-115'); stick('enemy',5,5,{lv:5});
  const c2=handPlay('GD06-115');
  ok('Teaching New Techniques (player): no Lv.4-or-lower enemy Unit — can\'t be played for its "Then" token', G.player.hand.includes(c) && G.player.hand.includes(c2) && G.player.field.length===1); }
// A Command paired as a Unit's Pilot (Gundam Rose activating Rose Screamer's 【Main】: "Choose 1 of your (MF) Units with 4 or less AP").
function pairCmdPilot(u, id){
  const c=card(id, u.owner), pm=c.pilotMode;
  const p={ uid:c.uid, owner:c.owner, def:c.def, name:pm.name, type:'pilot', cmdPilot:true, color:c.color, cost:c.cost, lv:c.lv, trait:pm.trait||c.trait,
            effect:'', srcEffect:c.effect, img:c.img, pAp:pm.pAp, pHp:pm.pHp, trashCostReduce:null };
  A.attachPilot(u, p); drainTasks(); return p; }
for (const who of ['player','enemy']){
  fresh(who); const r=put('GD05-044', who); pairCmdPilot(r,'GD05-113'); passAll(); r.tempAp=5;   // no (MF) Unit with 4 or less AP
  const s=sideOf(who); const t=stick(who==='player'?'enemy':'player',1,9,{rested:true});
  A.runTrigger(r, s, { kind:'pilotMain' }, 'Attack'); drainTasks();
  ok(`Gundam Rose (${who}): the paired Rose Screamer has no (MF) Unit with 4 or less AP to choose — its 【Main】 isn't activated (no Command activation recorded)`,
     !(s.cmdTraits && s.cmdTraits.set && s.cmdTraits.set.has('special move')) && logs().some(l=>/can't be activated/.test(l)), logs().slice(0,3).join(' | ')); }

// ===== Q556 Gundam Pharact ST13-009 / Q557 Palace Athene ST14-003 — "That player chooses 2 Unit cards from their trash. Exile them." =====
for (const [id, trig, q] of [['ST13-009','Attack','Q556 Gundam Pharact'], ['ST14-003','Deploy','Q557 Palace Athene']]){
  for (const who of ['player','enemy']){
    const foe=who==='player'?'enemy':'player';
    for (const n of [1,2]){
      fresh(who); const u=put(id, who); setTrash(foe, [...Array(n).fill(FILL), 'ST03-012']);
      A.runTrigger(u, sideOf(who), A.parseTrigger(u.effect, trig), trig); drainTasks();
      const units=sideOf(foe).trash.filter(c=>c.type==='unit').length, ex=(sideOf(foe).exile||[]).length;
      ok(`${q} (${who}'s): ${n} Unit card${n>1?'s':''} in the opponent's trash -> ${n===1?'nothing exiled':'both exiled'}`, n===1 ? (units===1 && ex===0) : (units===0 && ex===2), `units ${units} exiled ${ex}`);
    }
  }
}

// ===== Q175 Gundam AGE-1 Normal GD02-021 — You may discard 1 green (EF) Unit card. If you do, place 1 EX Resource. Then, if Lv.7+, draw 1. =====
{ fresh('player'); G.player.resMax=10; G.player.hand=[card('GD02-021','player'), card('GD02-029','player')];
  A.playFromHand(G.player.hand[0].uid); drainTasks(); const asked=!!modal(); press(/Don't/);
  ok('Q175 AGE-1 Normal (player, Lv.10): declining the discard — no EX Resource and no draw', asked && G.player.ex===0 && G.player.hand.length===1, `ex ${G.player.ex} hand ${G.player.hand.length}`); }
{ fresh('player'); G.player.resMax=10; G.player.hand=[card('GD02-021','player'), card('GD02-029','player')];
  A.playFromHand(G.player.hand[0].uid); drainTasks(); press(/AGE-1 Normal/);
  ok('Q175 AGE-1 Normal (player, Lv.10): discarding — 1 EX Resource, then the draw', G.player.ex===1 && G.player.hand.length===1 && G.player.hand[0].def!=='GD02-029', `ex ${G.player.ex} hand ${G.player.hand.map(c=>c.def)}`); }
{ fresh('enemy'); G.enemy.resMax=10; G.enemy.hand=[card('ST01-001','enemy')]; const u=put('GD02-021','enemy');
  A.runTrigger(u, G.enemy, A.parseTrigger(u.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Q175 AGE-1 Normal (AI, Lv.10): no green (EF) Unit card to discard — no draw', G.enemy.ex===0 && G.enemy.hand.length===1, `hand ${G.enemy.hand.length}`); }
{ fresh('enemy'); G.enemy.resMax=10; G.enemy.hand=[card('GD02-029','enemy'), card('ST01-001','enemy')]; const u=put('GD02-021','enemy');
  A.runTrigger(u, G.enemy, A.parseTrigger(u.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Q175 AGE-1 Normal (AI, Lv.10): discards — EX Resource and the draw', G.enemy.ex===1 && G.enemy.hand.length===2, `ex ${G.enemy.ex} hand ${G.enemy.hand.length}`); }
// The same "You may pay ①. If you do, draw 1. Then, discard 1." (Kapool GD04-074)
{ fresh('enemy'); const k=put('GD04-074','enemy'); G.enemy.hand=[card(FILL,'enemy'), card(FILL,'enemy')]; G.enemy.resAvail=0; const d0=G.enemy.deck.length;
  A.resolveAttackTriggers(k, G.enemy, ()=>{}); drainTasks();
  ok("Kapool (AI): can't pay ① — no draw and no discard", draws(G.enemy,d0)===0 && G.enemy.hand.length===2); }

console.log(fail.length ? 'FAILED:\n  '+fail.join('\n  ') : 'all faq cmd checks passed');
console.log(`passed: ${pass} | failed: ${fail.length}`);
console.log('Errors: '+((H.ERRORS||[]).length));
if ((H.ERRORS||[]).length) console.log(JSON.stringify(H.ERRORS.slice(0,3)));
