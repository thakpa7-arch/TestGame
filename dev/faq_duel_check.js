// Official Q&A: damage-step-only battles, Shield effects set off by <Breach>, checks that must use the reduced damage, and
// Qubeley Mk-Ⅱ redirects (group "duel").
//   Q500 Merrybell's Bandit / Q447 The Final Victor / Q455 Qubeley / Q346 Nu Gundam: a battle begun by an effect ("only perform the
//        damage step") still gets <First Strike> (13-1-5-4), including the one Carta's Graze Ritter hands the Unit battling it.
//   Q456 Qubeley: a kill in that battle is "destroys an enemy Unit with battle damage".
//   Q494 Elpeo Ple's Qubeley Mk-Ⅱ: A redirects to B and B to A — each applies once, A receives the damage; B may activate though
//        it isn't battling.
//   Q361 Dragon Gundam: "destroys an enemy shield area card with damage" counts <Breach> too.
//   Q416 Archangel: "can't receive 2 or less enemy effect damage" reads the amount after reductions.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=990000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,endActionStep:false,modalQueue:[],player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who)); }
  el('log').children.length=0;
}
const side=w=>w==='player'?G.player:G.enemy;
const other=w=>w==='player'?'enemy':'player';
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); side(who).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); side(who).field.push(c); return c;
}
const seat=(u, pid)=>{ const p=card(pid, u.owner); u.pilotCard=p; u.pilot={ name:p.name, pAp:p.pAp||0, pHp:p.pHp||0 }; return p; };
const pair=(u, pid)=>{ const p=card(pid, u.owner); A.attachPilot(u, p); drainTasks(); return p; };
const modal=()=>el('blockModal').classList.contains('show') ? { msg:(el('blockMsg').innerHTML||'').replace(/<[^>]+>/g,''), btns:[...el('blockBtns').children].map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'')) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pressUnit=u=>press(new RegExp('^'+esc(u.name)+'( |$)'));
const passAll=()=>{ let g=0; while (modal() && g++<10){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass/)) break; } };
const intercept=()=>{ if (modal() && /intercept/i.test(modal().msg)) press(/Don't/); };
const logs=()=>(el('log').children||[]).map(c=>(c.innerHTML||'').replace(/<[^>]+>/g,''));
const setTrash=(who, ids)=>{ side(who).trash=ids.map(i=>card(i, who)); A.refreshTrashStats(side(who)); return side(who).trash; };
const hand=(id, who)=>{ const c=card(id, who||'player'); side(who||'player').hand.push(c); return c; };
function playerAttack(atk, tgt){ A.fieldClick(atk.uid); drainTasks(); if (G.mode!=='attack-target'){ G.selected=atk.uid; G.mode='attack-target'; } if (tgt) A.fieldClick(tgt.uid); else A.attackDirect(); drainTasks(); }
const hpLost=u=>A.effMaxHp(u)-u.hp;

// ---------- Q500 Merrybell's Bandit GD06-022 vs Carta's Graze Ritter (Ground Type) GD02-073 ----------
for (const w of ['player','enemy']){
  fresh(w); const b=put('GD06-022',w); const c=put('GD02-073',other(w)); c.tempAp=-2; const d=stick(other(w),1,9);   // two ≤3-AP targets: the player chooses
  let asked=false;
  if (w==='player'){ G.player.hand=[card('GD06-085','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks(); A.fieldClick(b.uid); drainTasks();
    if (G.mode==='trigger-target'){ A.fieldClick(c.uid); drainTasks(); } let g=0; while(modal()&&g++<3){ if (/Carta/.test(modal().btns.join('|'))) asked=true; if (!press(/Carta/)) break; } }
  else pair(b,'GD06-085');
  ok(`Q500 ${w}: Bandit's 【When Linked】 battle vs Carta's Graze Ritter — Carta hands it <First Strike>: Carta destroyed, Bandit undamaged`,
    b.linked && !side(other(w)).field.includes(c) && hpLost(b)===0 && (w!=='player' || asked) && d.hp===9, `linked=${b.linked} carta=${side(other(w)).field.includes(c)} lost=${hpLost(b)} asked=${asked} ${logs().slice(0,4).reverse().join(' / ')}`);
}
{ fresh('enemy'); const b=put('GD06-022','enemy'); const foe=stick('player',3,3); pair(b,'GD06-085');
  ok('Q500 control: vs a plain 3-AP Unit both deal damage at once (no First Strike)', !G.player.field.includes(foe) && hpLost(b)===3, `foe=${G.player.field.includes(foe)} lost=${hpLost(b)}`); }

// ---------- Q447 The Final Victor ST12-013 ----------
{ fresh('player'); const mine=stick('player',5,1); const gr=put('GD02-073','enemy'); const c=hand('ST12-013'); A.playFromHand(c.uid); drainTasks();
  ok('Q447 player: your 5/1 Unit gets <First Strike> vs Graze Ritter (5/4): destroys it and survives', !G.enemy.field.includes(gr) && G.player.field.includes(mine), `ritter=${G.enemy.field.includes(gr)} mine=${G.player.field.includes(mine)} ${logs().slice(0,3).reverse().join(' / ')}`); }
{ fresh('enemy'); const mine=stick('enemy',5,1); const gr=put('GD02-073','player'); const c=card('ST12-013','enemy'); A.applyCommand(c, G.enemy, null); drainTasks();
  ok('Q447 AI: its 5/1 Unit gets <First Strike> vs your Graze Ritter', !G.player.field.includes(gr) && G.enemy.field.includes(mine), `ritter=${G.player.field.includes(gr)} mine=${G.enemy.field.includes(mine)}`); }
{ fresh('player'); const mine=stick('player',5,1); const foe=stick('enemy',5,4); const c=hand('ST12-013'); A.playFromHand(c.uid); drainTasks();
  ok('Q447 control: vs a plain 5/4 both are destroyed (simultaneous)', !G.enemy.field.includes(foe) && !G.player.field.includes(mine)); }

// ---------- Q455 / Q456 Qubeley ST13-001 (token duel) ----------
function mkTok(w){ const e=put('ST13-002',w); A.runTrigger(e, side(w), A.parseTrigger(e.effect,'Deploy'), 'Deploy'); drainTasks(); side(w).field.splice(side(w).field.indexOf(e),1); return side(w).field.find(u=>u.token); }
function duel(w, q, tok, foeU){
  if (w==='player'){ A.startActivate(q); drainTasks(); if (G.mode==='activate-cost'){ A.fieldClick(tok.uid); drainTasks(); } if (G.mode==='activate-target'){ A.fieldClick(foeU.uid); drainTasks(); } }
  else { A.applyActivateEffect(q, foeU, G.enemy, tok); drainTasks(); }
}
for (const w of ['player','enemy']){ const o=other(w);
  { fresh(w); const q=put('ST13-001',w); const tok=mkTok(w); const gr=put('GD02-073',o); gr.hp=2; stick(o,1,9);
    duel(w, q, tok, gr);
    ok(`Q455 ${w}: the token battling Carta's Graze Ritter gets <First Strike> — destroys it first and takes no damage`, !side(o).field.includes(gr) && side(w).field.includes(tok) && tok.hp===2, `gr=${side(o).field.includes(gr)} tok.hp=${tok.hp} ${logs().slice(0,3).reverse().join(' / ')}`); }
  { fresh(w); const q=put('ST13-001',w); const tok=mkTok(w); A.grantKeyword(tok,'first',1); const foeU=stick(o,5,2); stick(o,1,9); duel(w, q, tok, foeU);
    ok(`Q455 ${w}: a token with its own <First Strike> deals damage first in the duel (13-1-5-4)`, !side(o).field.includes(foeU) && side(w).field.includes(tok), `tok=${side(w).field.includes(tok)}`); }
  { fresh(w); const q=put('ST13-001',w); const tok=mkTok(w); const foeU=stick(o,1,5); stick(o,1,9); duel(w, q, tok, foeU);
    ok(`Q455 control ${w}: without First Strike both deal damage (2 each)`, foeU.hp===3 && tok.hp===1 && !G.curBattle, `foe=${foeU.hp} tok=${tok.hp}`); }
  { fresh(w); const q=put('ST13-001',w); const tok=mkTok(w); const ep=put('GD02-002',w,{rested:true}); seat(ep,'GD01-087'); ep.linked=true; const foeU=stick(o,1,2); stick(o,1,9);
    duel(w, q, tok, foeU);
    ok(`Q456 ${w}: the duel kill is "destroys an enemy Unit with battle damage" (linked Gundam Epyon is set active)`, !side(o).field.includes(foeU) && !ep.rested, `foe=${side(o).field.includes(foeU)} epRested=${ep.rested}`); }
}

// ---------- Q346 Nu Gundam GD05-017 【When Paired】 ----------
for (const w of ['player','enemy']){ fresh(w); const nu=put('GD05-017',w); setTrash(w,['GD05-017','GD05-017','GD05-017']); const carta=put('GD02-073',other(w));
  if (w==='player'){ const p=card('GD01-089','player'); side(w).hand=[p]; A.playFromHand(p.uid); drainTasks(); press(/Carta/); } else pair(nu,'GD01-089');
  ok(`Q346 ${w}: Nu Gundam's damage-step battle vs Carta's Graze Ritter — <First Strike>: Carta destroyed, Nu takes nothing`, !side(other(w)).field.includes(carta) && hpLost(nu)===0 && side(w).exile.length===3,
    `carta=${side(other(w)).field.includes(carta)} lost=${hpLost(nu)} exiled=${side(w).exile.length}`); }
{ fresh('enemy'); const nu=put('GD05-017','enemy'); setTrash('enemy',['GD05-017','GD05-017','GD05-017']); const foe=stick('player',3,4); pair(nu,'GD01-089');
  ok('Q346 control: vs a plain Unit both deal damage at once', !G.player.field.includes(foe) && nu.hp<A.effMaxHp(nu), `foe=${G.player.field.includes(foe)} nu ${nu.hp}/${A.effMaxHp(nu)}`); }

// ---------- Q494 Elpeo Ple's Qubeley Mk-Ⅱ GD06-018 ----------
const actStep=(fn)=>{ let g=0; while (modal() && g++<10){ const m=modal(); if (/Action Step/.test(m.msg) && fn(m)) continue; if (!press(/^Pass|No block|Don't block|Take it|Don't/i)) break; } };
for (const order of ['AB','BA']){
  fresh('enemy'); const qa=put('GD06-018','player',{rested:true}); seat(qa,'GD06-084'); qa.name='Qubeley A'; const qb=put('GD06-018','player'); seat(qb,'GD06-084'); qb.name='Qubeley B';
  const atk=stick('enemy',1,9); A.resolveAiAttack(atk, ()=>{}, qa); drainTasks(); const done=[];
  actStep(m=>{
    const want = order==='AB' ? (done.length===0?qa:qb) : (done.length===0?qb:qa); const tgt = want===qa?qb:qa;
    if (done.length<2 && m.btns.some(b=>b.includes(want.name))){ press(new RegExp(esc(want.name))); if (G.mode!=='idle'){ A.fieldClick(tgt.uid); drainTasks(); } pressUnit(tgt); done.push(want.name); return true; }
    return false; });
  ok(`Q494 player (${order==='AB'?'A first':'B, not battling, first'}): A->B and B->A both used — each applies once, A receives the battle damage`, done.length===2 && hpLost(qa)===1 && hpLost(qb)===0, `done=${done} A-${hpLost(qa)} B-${hpLost(qb)}`);
}
{ fresh('enemy'); const qa=put('GD06-018','player',{rested:true}); seat(qa,'GD06-084'); qa.name='Qubeley A'; const qb=put('GD06-018','player'); seat(qb,'GD06-084'); qb.name='Qubeley B';
  const atk=stick('enemy',1,9); A.resolveAiAttack(atk, ()=>{}, qa); drainTasks(); const done=[];
  actStep(m=>{ if (!done.length && m.btns.some(b=>b.includes('Qubeley A'))){ press(/Qubeley A/); if (G.mode!=='idle'){ A.fieldClick(qb.uid); drainTasks(); } pressUnit(qb); done.push('A'); return true; } return false; });
  ok('Q494 control: only A->B — B receives it', done.length===1 && hpLost(qa)===0 && hpLost(qb)===1, `A-${hpLost(qa)} B-${hpLost(qb)}`); }
{ fresh('player'); const qa=put('GD06-018','enemy',{rested:true}); seat(qa,'GD06-084'); qa.name='Qubeley A'; const qb=put('GD06-018','enemy'); seat(qb,'GD06-084'); qb.name='Qubeley B';
  const atk=stick('player',1,9); qa.redirectTo=qb; qb.redirectTo=qa; G.curBattle={ atk, def:qa }; A.battle(atk, qa, G.player, G.enemy); drainTasks(); passAll();
  ok('Q494 AI: its A->B and B->A redirects — A receives the battle damage', hpLost(qa)===1 && hpLost(qb)===0, `A-${hpLost(qa)} B-${hpLost(qb)} ${logs().slice(0,3).reverse().join(' / ')}`); }
{ fresh('player'); const qa=put('GD06-018','enemy',{rested:true}); seat(qa,'GD06-084'); const qb=put('GD06-018','enemy'); seat(qb,'GD06-084'); const x=put('GD06-018','player'); seat(x,'GD06-084');
  ok('Q494: the redirect is not usable outside a battle', !A.activateReady(x));
  const atk=stick('player',1,9); G.curBattle={ atk, def:qa };
  ok('Q494: a Qubeley Mk-Ⅱ that is not battling may activate during a battle its side is in', A.activateReady(qb)===true, `qb=${A.activateReady(qb)}`); G.curBattle=null; }

// ---------- Q361 Dragon Gundam GD05-035 / Heero Yuy GD05-098 ----------
// Simultaneous Fire (ST02-012) gives <Breach 3>; the breach destroys a Shield / the Base.
{ fresh('player'); const dg=put('GD05-035','player'); const e1=stick('enemy',3,5); const e2=stick('enemy',2,5); const t=stick('enemy',1,1,{rested:true}); const sf=hand('ST02-012');
  A.playFromHand(sf.uid); press(/Command effect/); drainTasks(); if (G.mode==='trigger-target'){ A.fieldClick(dg.uid); drainTasks(); }
  const br=A.effBreach(dg); playerAttack(dg, t); let asked=null; let g=0;
  while (modal() && g++<6){ const m=modal(); if (/shield area card/.test(m.msg)){ asked=m.btns; pressUnit(e2); continue; } if (!press(/^Pass|Don't/)) break; }
  ok('Q361 player: <Breach> destroys a Shield -> Dragon Gundam triggers; you choose the ≤3-AP enemy Unit (modal)', br===3 && G.enemy.shields.length===5 && e2.hp===3 && e1.hp===5 && asked && asked.length===2,
    `breach=${br} shields=${G.enemy.shields.length} e1=${e1.hp} e2=${e2.hp} asked=${JSON.stringify(asked)} ${logs().slice(0,5).reverse().join(' / ')}`); }
{ fresh('player'); const dg=put('GD05-035','player'); const e=stick('enemy',3,5); const t=stick('enemy',1,1,{rested:true}); const b=card('GD04-126','enemy'); b.sick=false; b.hp=3; G.enemy.base=b;
  const sf=hand('ST02-012'); A.playFromHand(sf.uid); press(/Command effect/); drainTasks(); if (G.mode==='trigger-target'){ A.fieldClick(dg.uid); drainTasks(); } playerAttack(dg, t); passAll();
  ok('Q361 player: <Breach> destroys the enemy Base -> triggers', !G.enemy.base && e.hp===3, `base=${!!G.enemy.base} e=${e.hp}`); }
{ fresh('enemy'); const dg=put('GD05-035','enemy'); const e=stick('player',3,5); const t=stick('player',1,1,{rested:true});
  const sf=card('ST02-012','enemy'); A.applyCommand(sf, G.enemy, dg); drainTasks(); const br=A.effBreach(dg);
  A.resolveAiAttack(dg, ()=>{}, t); drainTasks(); intercept(); passAll();
  ok('Q361 AI: <Breach> destroys your Shield -> Dragon Gundam deals 2 to your ≤3-AP Unit', br===3 && G.player.shields.length===5 && e.hp===3, `breach=${br} shields=${G.player.shields.length} e=${e.hp}`); }
{ fresh('player'); const dg=put('GD05-035','player'); dg.breach=3; const e=stick('enemy',3,5); const t=stick('enemy',1,1,{rested:true}); dg.shieldBreakTurn=G.turnSeq;
  playerAttack(dg, t); passAll();
  ok('Q361: 【Once per Turn】 still holds for the <Breach> path', G.enemy.shields.length===5 && e.hp===5, `e=${e.hp}`); }
// Heero Yuy (Pilot): "When this Unit destroys an enemy shield area card with damage, choose 1 enemy Unit. It gets AP-2" — Breach too.
{ fresh('enemy'); const u=stick('enemy',4,6,{breach:2}); pair(u,'GD05-098'); const e=stick('player',4,5); const t=stick('player',1,1,{rested:true});
  A.resolveAiAttack(u, ()=>{}, t); drainTasks(); intercept(); passAll();
  ok('Q361 Heero Yuy (AI): its Unit\'s <Breach> destroys your Shield -> your Unit gets AP-2', G.player.shields.length===5 && A.effAp(e)===2, `shields=${G.player.shields.length} ap=${A.effAp(e)}`); }
// Battle-only wording stays battle-only: Sinanju ST03-001 "with battle damage".
{ fresh('player'); const s=put('ST03-001','player'); s.breach=2; const e=stick('enemy',1,5); const t=stick('enemy',1,1,{rested:true});
  playerAttack(s, t); passAll();
  ok('Q361 control: Sinanju ("with battle damage") does not trigger off <Breach>', G.enemy.shields.length===5 && e.hp===5, `shields=${G.enemy.shields.length} e=${e.hp}`); }
// A shield-area damage effect from the Unit itself counts too (Dragon Gundam given Moebius-style damage through shieldAreaDamage).
{ fresh('player'); const dg=put('GD05-035','player'); const e=stick('enemy',3,5); A.shieldAreaDamage(dg, G.player, G.enemy, 1, 'T'); drainTasks(); passAll();
  ok('Q361: shield-area effect damage from the Unit destroys a Shield -> triggers', G.enemy.shields.length===5 && e.hp===3, `e=${e.hp}`); }

// ---------- Q416 Archangel GD05-123 ----------
for (const w of ['player','enemy']){ const o=other(w);
  fresh(o); const b=card('GD05-123',w); b.sick=false; side(w).base=b; const u=put('GD05-010',w); pair(u,'GD04-098'); u.linked=true;   // Riddhe Marcenas: reduce enemy effect damage by 2
  const hp0=u.hp; const nz=put('GD04-033',o); A.runTrigger(nz, side(o), A.parseTrigger(nz.effect,'Deploy'), 'Deploy'); drainTasks();
  ok(`Q416 ${w}: 3 enemy effect damage reduced to 1 — Archangel: the (Orb) Unit doesn't receive it`, u.hp===hp0, `hp ${hp0}->${u.hp}`);
}
{ fresh('enemy'); const b=card('GD05-123','player'); b.sick=false; G.player.base=b; const u=put('GD05-010','player'); const hp0=u.hp;
  const nz=put('GD04-033','enemy'); A.runTrigger(nz, G.enemy, A.parseTrigger(nz.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Q416 control: unreduced 3 effect damage is received', u.hp===hp0-3, `hp ${hp0}->${u.hp}`); }
{ fresh('player'); const b=card('GD05-123','player'); b.sick=false; G.player.base=b; const u=put('GD05-010','player'); pair(u,'GD04-098'); u.linked=true; const hp0=u.hp;
  G.effSrc=stick('enemy',1,1); A.damage(u, 2, G.player, 'effect'); drainTasks();
  ok('Q416 control: on your own turn Archangel does nothing (2 reduced to 0 by Riddhe anyway — no damage)', u.hp===hp0); }

console.log('== FAQ duel: damage-step battles, Breach shield triggers, reduced-damage checks, Qubeley Mk-Ⅱ ==');
console.log(`passed: ${pass} | failed: ${fail.length}`); for (const f of fail) console.log('  FAIL '+f);
console.log('Errors: '+(H.ERRORS.length+fail.length)); for (const e of H.ERRORS.slice(0,5)) console.log('  ERR', e.ctx, e.phase, e.msg, e.stack);
