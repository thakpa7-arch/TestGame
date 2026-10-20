// Audit 2, group c: Command actions (inferCommand, the Command shapes, parseSelfPing). Each case plays the real card — the
// player's side through the UI (playFromHand, the Action Step modal, the target choosers, the trash picker), the AI's side
// through applyCommand / triggerBurst / its main step.
const H=require('./harness.js'); const {A,drainTasks,ERRORS}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=890000;
const plainDefs = A.GUNDAM_CARDS.filter(d=>d.type==='unit' && !A.makeCard(d,'player').burst && !/【/.test(d.effect||''));
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,modalQueue:[],player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(plainDefs[(i*7)%plainDefs.length], s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(plainDefs[(i*5+3)%plainDefs.length], s.who)); }
}
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); (who==='player'?G.player:G.enemy).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); (who==='player'?G.player:G.enemy).field.push(c); return c;
}
// A Pilot with no text of its own (AP+2 / HP+1) — nothing it pairs onto triggers or links.
const pairPlain=(u, i)=>{ const p=card('ST02-010', u.owner); Object.assign(p, { effect:'', name:'Plain Pilot '+(i||0), pAp:2, pHp:1 }); A.attachPilot(u, p); drainTasks(); return p; };
const side=w=>w==='player'?G.player:G.enemy;
const inHand=(id, who)=>{ const c=card(id, who||'player'); side(who||'player').hand.push(c); return c; };
const modal=()=>el('blockModal').classList.contains('show') ? { msg:(el('blockMsg').innerHTML||'').replace(/<[^>]+>/g,''), btns:[...el('blockBtns').children].map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'')) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const esc=s=>s.replace(/[.*+?^${}()|[\]\\#/]/g,'\\$&');
const pressUnit=u=>press(new RegExp(esc(u.name)));
const btnHas=u=>!!(modal() && modal().btns.some(b=>b.includes(u.name)));
const passAll=()=>{ let g=0; while (modal() && g++<8){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass/)) break; } };
const overlay=()=>[...(doc.body.children||[])].find(n=>String(n.className||'').includes('modal-overlay'))||null;
function walk(n, f){ f(n); for (const c of (n.children||[])) walk(c, f); }
// Tap the tiles of the open card picker (pickCardsOverlay) for `cards`, then its Confirm button.
function pickTiles(cards){ const o=overlay(); if (!o) return false; const tiles=[]; let conf=null;
  walk(o, n=>{ if (n.dataset && n.dataset.uid) tiles.push(n); if (n.dataset && n.dataset.role==='confirm') conf=n; });
  for (const c of cards){ const t=tiles.find(x=>x.dataset.uid===String(c.uid)); if (!t) return false; t.onclick(); }
  if (!conf) return false; conf.onclick(); drainTasks(); return true; }
const play=(c)=>{ A.playFromHand(c.uid); drainTasks(); if (modal() && modal().btns.some(b=>/Command effect/.test(b))) press(/Command effect/); };
const logs=()=>(el('log').children||[]).map(n=>(n.innerHTML||'').replace(/<[^>]+>/g,'')).join(' | ');

// ===== GD01-105 Citizens, Take a Stand! — 【Main】All your Units get AP+2 during this turn. =====
{ fresh('player'); const a=stick('player',2,3), b=stick('player',3,3), e=stick('enemy',2,3); play(inHand('GD01-105'));
  ok('Citizens, Take a Stand! (player): every friendly Unit gets AP+2, nothing to choose; enemy Units untouched', !modal() && A.effAp(a)===4 && A.effAp(b)===5 && A.effAp(e)===2, `${A.effAp(a)}/${A.effAp(b)}/${A.effAp(e)} modal=${JSON.stringify(modal())}`); }
{ fresh('enemy'); const a=stick('enemy',2,3), b=stick('enemy',2,3), p=stick('player',2,3); A.applyCommand(card('GD01-105','enemy'), G.enemy, null); drainTasks();
  ok('Citizens, Take a Stand! (AI applyCommand): all its Units get AP+2', A.effAp(a)===4 && A.effAp(b)===4 && A.effAp(p)===2); }
{ fresh('enemy'); const a=stick('enemy',2,3), b=stick('enemy',3,3); G.enemy.hand=[card('GD01-105','enemy')]; const did=A.aiMainStep(); drainTasks();
  ok('Citizens, Take a Stand! (AI main step): plays it before attacking and buffs every Unit', did && !G.enemy.hand.length && A.effAp(a)===4 && A.effAp(b)===5); }
// ===== GD01-102 Securing the Supply Line — All friendly Units that are Lv.4 or lower recover 2 HP. =====
{ fresh('player'); const a=stick('player',2,5,{hp:1,lv:4}), b=stick('player',2,5,{hp:1,lv:2}), c=stick('player',2,5,{hp:1,lv:5}), e=stick('enemy',2,5,{hp:1,lv:2});
  play(inHand('GD01-102'));
  ok('Securing the Supply Line (player): every friendly Lv.4-or-lower Unit recovers 2 HP; Lv.5 and enemy Units do not', !modal() && a.hp===3 && b.hp===3 && c.hp===1 && e.hp===1, `${a.hp}/${b.hp}/${c.hp}/${e.hp}`); }
{ fresh('enemy'); const a=stick('enemy',2,5,{hp:1,lv:4}), b=stick('enemy',2,5,{hp:4,lv:1}), c=stick('enemy',2,5,{hp:1,lv:6}); A.applyCommand(card('GD01-102','enemy'), G.enemy, null);
  ok('Securing the Supply Line (AI): heals all its Lv.4-or-lower Units (capped at max HP)', a.hp===3 && b.hp===5 && c.hp===1, `${a.hp}/${b.hp}/${c.hp}`); }
// ===== GD02-118 Heart Set on Revenge — enemy Unit with 4 or less HP battling a friendly Unit with <Blocker> =====
{ fresh('enemy'); put('GD03-003','player'); const atk=stick('enemy',3,4); G.player.hand=[card('GD02-118','player')];
  A.resolveAiAttack(atk, ()=>{}, null); drainTasks(); press(/Messala/); const offered=!!(modal() && modal().btns.some(b=>/Heart Set/.test(b)));
  press(/Heart Set/); drainTasks(); if (G.mode!=='idle'){ A.fieldClick(atk.uid); drainTasks(); }
  ok('Heart Set on Revenge (player): the attacker battling your <Blocker> Unit is returned to hand', offered && !G.enemy.field.includes(atk) && G.enemy.hand.includes(atk), `offered=${offered}`); }
{ fresh('enemy'); const mine=stick('player',1,9,{rested:true}); const atk=stick('enemy',3,4); const idle=stick('enemy',1,2,{blocker:true}); G.player.hand=[card('GD02-118','player')];
  A.resolveAiAttack(atk, ()=>{}, mine); drainTasks(); const m=modal(); const offered=!!(m && m.btns.some(b=>/Heart Set/.test(b)));
  ok("Heart Set on Revenge (player): not offered while the attacker battles a Unit without <Blocker> (the enemy's own Blocker isn't a target)", !offered && G.enemy.field.includes(atk) && G.enemy.field.includes(idle) && G.player.hand.length===1, `offered=${offered}`); passAll(); }
{ fresh('player'); const blk=stick('enemy',1,5,{blocker:true}); const atk=stick('player',3,4); const other=stick('player',2,3); G.curBattle={atk, def:blk};
  A.applyCommand(card('GD02-118','enemy'), G.enemy, null);
  const okBlk=!G.player.field.includes(atk) && G.player.field.includes(other);
  fresh('player'); const nb=stick('enemy',1,5); const atk2=stick('player',3,4); G.curBattle={atk:atk2, def:nb}; A.applyCommand(card('GD02-118','enemy'), G.enemy, null);
  ok('Heart Set on Revenge (AI): returns the player Unit battling its <Blocker>; nothing when its battling Unit has no <Blocker>', okBlk && G.player.field.includes(atk2)); }
// ===== GD02-113 Sisterly Care — If a friendly (Teiwaz) Link Unit is in play, choose 1 enemy Unit with 2 or less AP. Destroy it. =====
{ fresh('player'); const e=stick('enemy',2,5); const c=inHand('GD02-113'); play(c);
  drainTasks(); passAll();
  ok("Sisterly Care (player): with no friendly (Teiwaz) Link Unit it can't be played (its \"If\" is unmet — Q245); it stays in hand", G.enemy.field.includes(e) && G.player.hand.includes(c) && !G.player.trash.includes(c) && G.mode==='idle'); }
{ fresh('player'); stick('player',3,3,{trait:'(Teiwaz)', linked:true}); const e=stick('enemy',2,5), big=stick('enemy',3,5); play(inHand('GD02-113'));
  if (G.mode==='trigger-target'){ A.fieldClick(e.uid); drainTasks(); }
  ok('Sisterly Care (player): with a (Teiwaz) Link Unit it destroys the 2-AP enemy Unit', !G.enemy.field.includes(e) && G.enemy.field.includes(big)); }
{ fresh('enemy'); const p=stick('player',2,5); A.applyCommand(card('GD02-113','enemy'), G.enemy, null); const kept=G.player.field.includes(p);
  stick('enemy',3,3,{trait:'(Teiwaz)', linked:true}); A.applyCommand(card('GD02-113','enemy'), G.enemy, null);
  ok('Sisterly Care (AI): nothing without its (Teiwaz) Link Unit, destroys with one', kept && !G.player.field.includes(p)); }
// ===== GD03-110 Eliminate Target — Choose 1 Pilot paired with an enemy Unit that is Lv.5 or lower. Destroy it. =====
{ fresh('player'); const e=stick('enemy',3,3,{lv:4}); const pc=pairPlain(e); const bare=stick('enemy',3,3,{lv:3}); const ap0=A.effAp(e);
  play(inHand('GD03-110'));
  ok('Eliminate Target (player): only the paired Unit qualifies; its Pilot goes to the trash and the Unit stays', !modal() && G.enemy.field.includes(e) && !e.pilotCard && G.enemy.trash.includes(pc) && G.enemy.field.includes(bare) && A.effAp(e)===ap0-(pc.pAp||0), `ap ${ap0}->${A.effAp(e)}`); }
{ fresh('player'); const e1=stick('enemy',3,3,{lv:4}), e2=stick('enemy',3,3,{lv:5}), e3=stick('enemy',3,3,{lv:6}); pairPlain(e1); pairPlain(e2,1); pairPlain(e3,2);
  play(inHand('GD03-110')); const m=modal(); const listed=m && btnHas(e1) && btnHas(e2) && !btnHas(e3); pressUnit(e2);
  ok('Eliminate Target (player): with two legal Pilots you choose (a Lv.6 Unit\'s Pilot is not offered)', listed && !e2.pilotCard && !!e1.pilotCard && !!e3.pilotCard, JSON.stringify(m)); }
{ fresh('enemy'); const p=stick('player',3,1,{lv:4}); const pc=pairPlain(p); p.hp-=1; const q=stick('player',3,3,{lv:4}); const qc=pairPlain(q,1); const hpq=q.hp;
  A.applyCommand(card('GD03-110','enemy'), G.enemy, null);
  const first=G.player.trash.includes(pc) && !G.player.field.includes(p);   // the damaged Unit kept alive by its Pilot's HP is picked and dies
  A.applyCommand(card('GD03-110','enemy'), G.enemy, null);
  ok('Eliminate Target (AI): destroys a player Pilot (a Unit left at 0 HP is destroyed; otherwise it stays without its Pilot)', first && G.player.trash.includes(qc) && G.player.field.includes(q) && q.hp===hpq-1, `first=${first} q.hp=${q.hp}`); }
// ===== GD03-112 Warped Intent — During this turn, all Units paired with a Pilot get AP+2. (no side named: both players) =====
{ fresh('player'); const a=stick('player',2,3), b=stick('player',2,3), bare=stick('player',2,3), e=stick('enemy',2,3); pairPlain(a); pairPlain(b,1); pairPlain(e,2);
  const ap=[a,b,bare,e].map(u=>A.effAp(u)); play(inHand('GD03-112'));
  ok('Warped Intent (player): every paired Unit (both sides) gets AP+2, unpaired ones nothing, no chooser', !modal() && A.effAp(a)===ap[0]+2 && A.effAp(b)===ap[1]+2 && A.effAp(bare)===ap[2] && A.effAp(e)===ap[3]+2); }
{ fresh('enemy'); const a=stick('enemy',2,3), bare=stick('enemy',2,3); pairPlain(a); const ap=A.effAp(a); A.applyCommand(card('GD03-112','enemy'), G.enemy, null);
  ok('Warped Intent (AI): its paired Unit gets AP+2, its unpaired one does not', A.effAp(a)===ap+2 && A.effAp(bare)===2); }
// ===== GD03-116 Towards Destiny — Choose 1 friendly (Vagan) Unit and 1 enemy Unit. Deal 2 damage to them. =====
{ fresh('player'); const z=stick('player',1,5,{trait:'(Zeon)'}); const e=stick('enemy',1,5); play(inHand('GD03-116'));
  ok("Towards Destiny (player): with no (Vagan) Unit it can't be played (both Units must be choosable); nothing is damaged", z.hp===5 && e.hp===5 && G.player.hand.some(x=>x.def==='GD03-116'), `${z.hp}/${e.hp}`); }
{ fresh('player'); const v1=stick('player',1,5,{trait:'(Vagan)'}), v2=stick('player',1,5,{trait:'(Vagan)'}), z=stick('player',1,5,{trait:'(Zeon)'}); const e1=stick('enemy',1,5), e2=stick('enemy',1,5);
  play(inHand('GD03-116')); const m=modal(); const onlyV=m && btnHas(v1) && btnHas(v2) && !btnHas(z); pressUnit(v2); pressUnit(e1);
  ok('Towards Destiny (player): the friendly chooser lists only (Vagan) Units; both chosen Units take 2', onlyV && v2.hp===3 && v1.hp===5 && z.hp===5 && e1.hp===3 && e2.hp===5, JSON.stringify(m)); }
{ fresh('enemy'); const z=stick('enemy',1,5,{trait:'(Zeon)'}); const p=stick('player',1,5); A.applyCommand(card('GD03-116','enemy'), G.enemy, null);
  const v=stick('enemy',1,5,{trait:'(Vagan)'}); A.applyCommand(card('GD03-116','enemy'), G.enemy, null);
  ok('Towards Destiny (AI): only its (Vagan) Unit is damaged', z.hp===5 && v.hp===3 && p.hp===1, `${z.hp}/${v.hp}/${p.hp}`); }
// ===== GD03-121 Unheralded Attack — 【Action】Choose 1 friendly Base and 1 enemy Unit with 3 or less HP. Rest them. =====
{ fresh('enemy'); G.player.base=card('GD03-132','player'); G.player.base.hp=5; G.player.base.rested=false; const mate=stick('player',1,9,{rested:true});
  const atk=stick('enemy',2,9); const e3=stick('enemy',1,3), e2=stick('enemy',1,2), e4=stick('enemy',1,4); G.player.hand=[card('GD03-121','player')];
  A.resolveAiAttack(atk, ()=>{}, mate); drainTasks(); press(/Unheralded/); const m=modal(); const listed=m && btnHas(e3) && btnHas(e2) && !btnHas(e4) && !btnHas(atk);
  pressUnit(e3);
  ok('Unheralded Attack (player): rests your Base and the chosen enemy Unit with 3 or less HP', listed && G.player.base.rested && e3.rested && !e2.rested && !e4.rested, JSON.stringify(m)); passAll(); }
{ fresh('player'); G.enemy.base=card('GD03-132','enemy'); G.enemy.base.hp=5; G.enemy.base.rested=false; const u=stick('enemy',1,1); const p4=stick('player',5,4), p3=stick('player',2,3);
  A.applyCommand(card('GD03-121','enemy'), G.enemy, null);
  ok('Unheralded Attack (AI): rests its Base (not its Unit) and a player Unit with 3 or less HP', G.enemy.base.rested && !u.rested && p3.rested && !p4.rested); }
// ===== GD04-101 Kindhearted — During this turn, friendly Units can't be destroyed by enemy effects. Then, draw 1. =====
{ fresh('player'); const u=stick('player',3,3,{lv:2}); const h0=G.player.hand.length; play(inHand('GD04-101')); const drew=G.player.hand.length===h0+1;
  A.applyToTarget(card('GD02-113','enemy'), G.enemy, { kind:'destroy', scope:'enemy' }, u, 'T'); const s1=G.player.field.includes(u);
  A.runTrigger(card('GD05-114','enemy'), G.enemy, card('GD05-114','enemy').action, 'Main'); const s2=G.player.field.includes(u);
  ok('Kindhearted (player): draw 1; an enemy destroy effect and "destroy all" can\'t destroy your Unit this turn', drew && s1 && s2, `drew=${drew} ${s1}/${s2}`);
  G.turnSeq++; A.applyToTarget(card('GD02-113','enemy'), G.enemy, { kind:'destroy', scope:'enemy' }, u, 'T');
  ok('Kindhearted: the guard ends with the turn', !G.player.field.includes(u)); }
{ fresh('player'); const u=stick('player',3,3,{lv:2}); play(inHand('GD04-101')); A.runTrigger(card('ST01-001','player'), G.player, { kind:'destroyAll', scope:'all-both', filter:{ maxLv:4 } }, 'T');
  ok("Kindhearted: your own effects still destroy your Units", !G.player.field.includes(u)); }
{ fresh('enemy'); const u=stick('enemy',3,3); A.applyCommand(card('GD04-101','enemy'), G.enemy, null); A.applyToTarget(card('GD02-113','player'), G.player, { kind:'destroy', scope:'enemy' }, u, 'T');
  ok('Kindhearted (AI): its Units survive the player\'s destroy effect this turn', G.enemy.field.includes(u)); }
// ===== GD04-117 Graceful Demeanor — 【Burst】Activate this card's 【Action】. 【Action】Choose 1 to 2 enemy Units that are Lv.3 or lower. Return them =====
{ fresh('player'); const a=stick('player',3,3,{lv:3}), b=stick('player',3,3,{lv:3}), c=stick('player',3,3,{lv:4}); A.triggerBurst(card('GD04-117','enemy'), G.enemy, ()=>{}, false); drainTasks();
  ok('Graceful Demeanor (AI Burst): returns both Lv.3 player Units, not the Lv.4 one', !G.player.field.includes(a) && !G.player.field.includes(b) && G.player.field.includes(c)); }
{ fresh('enemy'); const a=stick('enemy',3,3,{lv:3}), b=stick('enemy',3,3,{lv:2}), c=stick('enemy',3,3,{lv:5}); A.triggerBurst(card('GD04-117','player'), G.player, ()=>{}, true); drainTasks();
  const m1=modal(); const l1=m1 && btnHas(a) && btnHas(b) && !btnHas(c); pressUnit(a); const m2=modal(); const done=m2 && m2.btns.includes('Done'); pressUnit(b);
  ok('Graceful Demeanor (player Burst): choose 1 to 2 Lv.3-or-lower enemy Units — both returned', l1 && done && !G.enemy.field.includes(a) && !G.enemy.field.includes(b) && G.enemy.field.includes(c), JSON.stringify([m1,m2])); }
// ===== GD04-118 World Distortion — If 2 or more friendly (UN) Units are in play, choose 1 enemy Unit with 5 or less HP. Return it. =====
{ fresh('player'); stick('player',1,1,{trait:'(UN)'}); const e=stick('enemy',3,5); const c=inHand('GD04-118'); play(c);
  drainTasks(); passAll();
  ok("World Distortion (player): with only 1 (UN) Unit it can't be played (Q245); it stays in hand", G.enemy.field.includes(e) && G.player.hand.includes(c) && !G.player.trash.includes(c) && G.mode==='idle'); }
{ fresh('player'); stick('player',1,1,{trait:'(UN)'}); stick('player',1,1,{trait:'(UN)'}); const e=stick('enemy',3,5); play(inHand('GD04-118'));
  if (G.mode==='trigger-target'){ A.fieldClick(e.uid); drainTasks(); }
  ok('World Distortion (player): with 2 (UN) Units the enemy Unit is returned', !G.enemy.field.includes(e)); }
{ fresh('enemy'); const p=stick('player',3,5); A.applyCommand(card('GD04-118','enemy'), G.enemy, null);
  ok('World Distortion (AI): no (UN) Units, no effect', G.player.field.includes(p)); }
// ===== EB01-081 MAP Weapon — Choose 1 to 2 enemy Units with 2 or less HP. Return them to their owners' hands. =====
{ fresh('player'); const a=stick('enemy',1,2), b=stick('enemy',1,2), c=stick('enemy',1,3); play(inHand('EB01-081'));
  const m=modal(); const l=m && btnHas(a) && btnHas(b) && !btnHas(c); pressUnit(a); pressUnit(b);
  ok('MAP Weapon (player): picks two 2-HP enemy Units, both returned; the 3-HP one is not offered', l && !G.enemy.field.includes(a) && !G.enemy.field.includes(b) && G.enemy.field.includes(c), JSON.stringify(m)); }
{ fresh('player'); const a=stick('enemy',1,2), b=stick('enemy',1,2); play(inHand('EB01-081')); pressUnit(a); press(/^Done$/);
  ok('MAP Weapon (player): "Done" after the first pick returns just that one', !G.enemy.field.includes(a) && G.enemy.field.includes(b)); }
{ fresh('enemy'); const a=stick('player',1,2), b=stick('player',1,2); A.applyCommand(card('EB01-081','enemy'), G.enemy, null);
  ok('MAP Weapon (AI): returns both 2-HP Units', !G.player.field.includes(a) && !G.player.field.includes(b)); }
// ===== ST10-013 Tactical Training — Choose 1 (G Generation) Unit that is Lv.5 or higher. It recovers 2 HP and gets AP+2 during this turn. =====
{ fresh('player'); const gg=stick('player',4,4,{trait:'(G Generation)', lv:6, hp:1}); const other=stick('player',1,5,{lv:6, hp:1}); const low=stick('player',1,5,{trait:'(G Generation)', lv:4, hp:1});
  play(inHand('ST10-013'));
  ok('Tactical Training (player): only the (G Generation) Lv.5+ Unit qualifies; it recovers 2 HP and gets AP+2', !modal() && gg.hp===3 && A.effAp(gg)===6 && other.hp===1 && low.hp===1, `${gg.hp}/${A.effAp(gg)}`); }
{ fresh('player'); const gg=stick('player',4,4,{trait:'(G Generation)', lv:6, hp:1}); const egg=stick('enemy',3,4,{trait:'(G Generation)', lv:5}); play(inHand('ST10-013'));
  const m=modal(); const both=m && btnHas(gg) && btnHas(egg) && m.btns.findIndex(b=>b.includes(gg.name))<m.btns.findIndex(b=>b.includes(egg.name)); pressUnit(gg);
  ok('Tactical Training (player): no side named — an enemy (G Generation) Lv.5+ Unit is offered too, yours listed first', both && gg.hp===3, JSON.stringify(m)); }
{ fresh('enemy'); const gg=stick('enemy',4,4,{trait:'(G Generation)', lv:6, hp:1}); stick('player',3,4,{trait:'(G Generation)', lv:5}); A.applyCommand(card('ST10-013','enemy'), G.enemy, null);
  ok('Tactical Training (AI): its own (G Generation) Unit recovers 2 HP and gets AP+2', gg.hp===3 && A.effAp(gg)===6); }
// ===== GD05-113 Rose Screamer — Choose 1 of your (MF) Units with 4 or less AP. It gets AP+2 during this turn. =====
{ fresh('player'); const big=stick('player',5,5,{trait:'(MF)'}), sm=stick('player',4,4,{trait:'(MF)'}); play(inHand('GD05-113')); if (modal() && /pair it/.test(modal().msg)) press(/Don't pair/);
  ok('Rose Screamer (player): only the (MF) Unit with 4 or less AP can be chosen', A.effAp(big)===5 && A.effAp(sm)===6, `${A.effAp(big)}/${A.effAp(sm)}`); }
{ fresh('enemy'); const big=stick('enemy',5,5,{trait:'(MF)'}); G.enemy.hand=[card('GD05-113','enemy')]; A.aiMainStep(); drainTasks();
  ok('Rose Screamer (AI main step): not played on a 5-AP (MF) Unit', A.effAp(big)===5 && G.enemy.hand.length===1); }
// ===== GD05-112 Hoka Kyoten Juzetsujin — Choose 1 of your (MF) Units without <Breach>. It gains <Breach 3> during this turn. =====
{ fresh('player'); const br=stick('player',5,5,{trait:'(MF)', breach:2}), nb=stick('player',4,4,{trait:'(MF)'}); play(inHand('GD05-112')); if (modal() && /pair it/.test(modal().msg)) press(/Don't pair/);
  ok('Hoka Kyoten Juzetsujin (player): only the (MF) Unit without <Breach> gains <Breach 3>', A.effBreach(br)===2 && A.effBreach(nb)===3); }
{ fresh('enemy'); const br=stick('enemy',5,5,{trait:'(MF)', breach:2}), nb=stick('enemy',4,4,{trait:'(MF)'}); A.applyCommand(card('GD05-112','enemy'), G.enemy, null);
  ok('Hoka Kyoten Juzetsujin (AI): gives <Breach 3> to the Unit without <Breach>', A.effBreach(br)===2 && A.effBreach(nb)===3); }
// ===== GD05-120 Shining Finger — …Rest it. Then, you may choose 1 of your Units with "Shining Gundam" in its card name. It gets <First Strike>. =====
{ fresh('player'); const s1=stick('player',2,2,{name:'Shining Gundam'}), s2=stick('player',3,4,{name:'Shining Gundam (Super Mode)'}), o=stick('player',3,3); const e=stick('enemy',1,4);
  play(inHand('GD05-120')); if (G.mode==='trigger-target'){ A.fieldClick(e.uid); drainTasks(); }
  const m=modal(); const l=m && btnHas(s1) && btnHas(s2) && !btnHas(o) && m.btns.includes("Don't choose"); pressUnit(s2);
  ok('Shining Finger (player): rests the enemy, then you choose which "Shining Gundam" gets <First Strike>', l && e.rested && A.effFirstStrike(s2) && !A.effFirstStrike(s1), JSON.stringify(m)); }
{ fresh('player'); const s1=stick('player',2,2,{name:'Shining Gundam'}); const e=stick('enemy',1,4); play(inHand('GD05-120')); if (G.mode==='trigger-target'){ A.fieldClick(e.uid); drainTasks(); }
  const asked=!!modal(); press(/Don't choose/);
  ok('Shining Finger (player): "you may" — asked even with one "Shining Gundam", and it can be declined', asked && e.rested && !A.effFirstStrike(s1)); }
{ fresh('enemy'); const s=stick('enemy',2,2,{name:'Shining Gundam'}); const p=stick('player',1,4); A.applyCommand(card('GD05-120','enemy'), G.enemy, null);
  ok('Shining Finger (AI): rests the player Unit and gives its Shining Gundam <First Strike>', p.rested && A.effFirstStrike(s)); }
// ===== GD05-103 Not with Scattershot! — Choose 1 friendly Unit. It recovers 1 HP and gets AP+2 during this turn. =====
{ fresh('player'); const a=stick('player',2,5,{hp:3}), b=stick('player',3,3); play(inHand('GD05-103')); const m=modal(); pressUnit(a);
  ok('Not with Scattershot! (player): you choose the Unit; it recovers 1 HP and gets AP+2', !!m && a.hp===4 && A.effAp(a)===4 && A.effAp(b)===3); }
{ fresh('enemy'); const a=stick('enemy',2,5,{hp:3}); A.applyCommand(card('GD05-103','enemy'), G.enemy, null);
  ok('Not with Scattershot! (AI): its Unit recovers 1 HP and gets AP+2', a.hp===4 && A.effAp(a)===4); }
// ===== ST13-015 Operation to Intercept Solomon — Choose 3 Unit cards from your trash. Exile them. If you do, … deal 3 damage =====
{ fresh('player'); const tr=['ST01-001','ST11-003','ST11-008','ST13-001'].map(id=>card(id,'player')); G.player.trash=tr.slice(); const e=stick('enemy',1,5);
  play(inHand('ST13-015')); const asked=!!overlay(); const picked=pickTiles([tr[0], tr[1], tr[2]]); if (G.mode==='trigger-target'){ A.fieldClick(e.uid); drainTasks(); }
  ok('Operation to Intercept Solomon (player): you choose which 3 Unit cards are exiled (Qubeley kept), then 3 damage', asked && picked && G.player.trash.includes(tr[3]) && G.player.exile.length===3 && e.hp===2, `asked=${asked} picked=${picked} hp=${e.hp}`); }
{ fresh('enemy'); for (const id of ['ST01-001','ST11-003','ST11-008']) G.enemy.trash.push(card(id,'enemy')); const p=stick('player',1,5); A.applyCommand(card('ST13-015','enemy'), G.enemy, null);
  ok('Operation to Intercept Solomon (AI): exiles 3 and deals 3', G.enemy.exile.length===3 && p.hp===2); }
// Infinite Justice Gundam GD06-002 【Deploy】"You may choose 3 Unit cards from your trash. Exile them…" — the player picks too.
{ fresh('player'); const tr=['ST01-001','ST11-003','ST11-008','ST13-001'].map(id=>card(id,'player')); G.player.trash=tr.slice(); const e=stick('enemy',1,5);
  const ij=put('GD06-002','player'); A.resolvePlayerTrigger(ij, G.player, A.parseTrigger(ij.effect,'Deploy'), 'Deploy', ()=>{}); drainTasks(); press(/Exile 3/);
  const asked=!!overlay(); const picked=pickTiles([tr[1], tr[2], tr[3]]);
  ok('Infinite Justice Gundam (player): the "Exile 3" choice lets you pick the cards', asked && picked && G.player.trash.includes(tr[0])); }
// ===== GD06-108 On Edge — All friendly (Neo Zeon) Units that are Lv.4 or lower get AP+2 during this turn. =====
{ fresh('player'); const a=stick('player',2,2,{trait:'(Neo Zeon)', lv:3}), b=stick('player',2,2,{trait:'(Neo Zeon)', lv:4}), hi=stick('player',2,2,{trait:'(Neo Zeon)', lv:5}), mk=stick('player',3,4,{trait:'(AEUG)', lv:4});
  play(inHand('GD06-108'));
  ok('On Edge (player): every friendly (Neo Zeon) Lv.4-or-lower Unit gets AP+2; Lv.5 and (AEUG) Units do not', !modal() && A.effAp(a)===4 && A.effAp(b)===4 && A.effAp(hi)===2 && A.effAp(mk)===3); }
{ fresh('enemy'); const a=stick('enemy',2,2,{trait:'(Neo Zeon)', lv:3}), mk=stick('enemy',3,4,{trait:'(AEUG)', lv:4}); A.applyCommand(card('GD06-108','enemy'), G.enemy, null);
  ok('On Edge (AI): only its (Neo Zeon) Unit gets AP+2', A.effAp(a)===4 && A.effAp(mk)===3); }
// ===== GD06-118 Infinite Variations — Choose a number of enemy Units up to the number of white Units with <Blocker> you have =====
{ fresh('player'); put('GD06-077','player'); put('GD06-077','player'); const es=[stick('enemy',5,5),stick('enemy',5,5),stick('enemy',5,5,{blocker:true})];
  const white=A.CARD_BY_ID.get('GD06-077'); play(inHand('GD06-118')); const m=modal(); const all3=m && es.every(btnHas); pressUnit(es[0]); pressUnit(es[2]);
  ok('Infinite Variations (player): 2 white <Blocker> Units — choose up to 2 of any enemy Units, AP-2 each', /white/i.test(white.color) && all3 && A.effAp(es[0])===3 && A.effAp(es[2])===3 && A.effAp(es[1])===5 && !modal(), JSON.stringify(m)); }
{ fresh('player'); const e=stick('enemy',5,5); const c=inHand('GD06-118'); play(c);
  ok('Infinite Variations (player): with no white <Blocker> Unit it chooses nothing (not played)', A.effAp(e)===5 && G.player.hand.includes(c)); }
{ fresh('enemy'); put('GD06-077','enemy'); const ps=[stick('player',5,5),stick('player',4,5)]; A.applyCommand(card('GD06-118','enemy'), G.enemy, null);
  ok('Infinite Variations (AI): 1 white <Blocker> Unit — 1 player Unit gets AP-2', ps.filter(u=>A.effAp(u)===u.baseAp-2).length===1); }
// ===== GD06-102 A Miracle — 【Action】If it is your opponent's turn and no enemy Units have attacked this turn, draw 2. =====
{ fresh('enemy'); const atk=stick('enemy',2,9); const mine=stick('player',1,9,{rested:true}); G.player.hand=[card('GD06-102','player')];
  A.resolveAiAttack(atk, ()=>{}, mine); drainTasks(); const offered=!!(modal() && modal().btns.some(b=>/Miracle/.test(b))); if (offered) press(/Miracle/); passAll();
  ok("A Miracle (player): once an enemy Unit has attacked this turn it isn't offered and draws nothing", !offered && G.player.hand.length===1 && G.player.hand[0].def==='GD06-102'); }
{ fresh('enemy'); G.player.hand=[card('GD06-102','player')]; A.offerPlayerActionStep(null, ()=>{}); drainTasks(); const offered=!!(modal() && modal().btns.some(b=>/Miracle/.test(b)));
  press(/Miracle/); drainTasks();
  ok("A Miracle (player): in the opponent's turn before any attack (End Phase action step) it draws 2", offered && G.player.hand.length===2); }
{ fresh('player'); const a=stick('player',2,2); const foe=stick('enemy',1,9,{rested:true}); A.fieldClick(a.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); passAll();
  const h0=G.enemy.hand.length; A.applyCommand(card('GD06-102','enemy'), G.enemy, null);
  ok('A Miracle (AI): no draw after the player has attacked this turn', G.enemy.hand.length===h0); }

console.log(`passed: ${pass} | failed: ${fail.length}`);
for (const f of fail) console.log('  FAIL', f);
console.log(`Errors: ${ERRORS.length}`); for (const e of ERRORS.slice(0,5)) console.log('  ', e.ctx, e.phase, e.msg, e.stack);
