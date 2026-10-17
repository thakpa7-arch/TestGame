// Audit g2: GD03–GD06 Command parsing, and inferCommand without its "draw 1" fallback. Each case plays the real card —
// the player's side through the UI (board taps, the Action Step modal, the target choosers), the AI's side through
// applyCommand / runTrigger / its main step.
const H=require('./harness.js'); const {A,drainTasks,ERRORS}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=870000;
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
const pair=(u, id)=>{ const p=card(id, u.owner); A.attachPilot(u, p); drainTasks(); return p; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); (who==='player'?G.player:G.enemy).field.push(c); return c;
}
const side=w=>w==='player'?G.player:G.enemy;
const toTrash=(who, id, n)=>{ for (let i=0;i<(n||1);i++) side(who).trash.push(card(id, who)); };
const fillTrash=(who, n)=>{ for (let i=0;i<n;i++) side(who).trash.push(A.makeCard(plainDefs[i%plainDefs.length], who)); };
const inHand=(id, who)=>{ const c=card(id, who||'player'); side(who||'player').hand.push(c); return c; };
const modal=()=>el('blockModal').classList.contains('show') ? { msg:(el('blockMsg').innerHTML||'').replace(/<[^>]+>/g,''), btns:[...el('blockBtns').children].map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'')) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const esc=s=>s.replace(/[.*+?^${}()|[\]\\#/]/g,'\\$&');
const pressUnit=u=>press(new RegExp(esc(u.name)));
const passAll=()=>{ let g=0; while (modal() && g++<8){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass/)) break; } };
const overlay=()=>[...(doc.body.children||[])].find(n=>String(n.className||'').includes('modal-overlay'))||null;
// The card tiles of a showLookAtTop overlay (pickable ones carry an onclick).
const overlayTiles=()=>{ const o=overlay(); if(!o) return []; const box=o.children[0]; const row=box && box.children.find(ch=>ch.children && ch.children.length && !ch.textContent); return row ? row.children : []; };
// Play from hand; a 【Pilot】 Command asks "Command effect or Pilot" when an unpaired Unit is out — take the Command.
const play=(c)=>{ A.playFromHand(c.uid); drainTasks(); if (modal() && modal().btns.some(b=>/Command effect/.test(b))) press(/Command effect/); };
const logs=()=>(el('log').children||[]).map(n=>(n.innerHTML||'').replace(/<[^>]+>/g,'')).join(' | ');

// ===== the fallback is gone =====
{ const fb=[...A.CARD_BY_ID.values()].filter(d=>d.type==='command' && !/-p\d+$/.test(d.id)).map(d=>[d, A.makeCard(d,'player').action])
    .filter(([d,a])=>a && a.kind==='draw' && !/draw/i.test(d.effect));
  ok('no Command draws 1 without "draw" in its text (the old fallback)', fb.length===0, fb.map(([d])=>d.id).join(','));
  // (EB01-078 Premium Unit Assembly is modelled since the g1 merge and every printed Command now parses: a made-up text stands in.)
  A.CARD_BY_ID.set('TEST-NE', Object.assign({}, A.CARD_BY_ID.get('EB01-078'), { id:'TEST-NE', name:'Unreadable Orders', effect:'【Main】Hum a quiet tune to the stars.' }));
  const ne=A.inferCommand(A.CARD_BY_ID.get('TEST-NE').effect);
  ok('an unmodelled Command parses to a no-effect action', ne && ne.kind==='noEffect', JSON.stringify(ne));
  fresh('player'); const c=inHand('TEST-NE'); const h0=G.player.hand.length, d0=G.player.deck.length; play(c);
  ok('playing it: no card is drawn and the log says "no effect"', G.player.deck.length===d0 && G.player.trash.includes(c) && /no effect/.test(logs()), `deck ${d0}->${G.player.deck.length}`);
  fresh('enemy'); const c2=card('TEST-NE','enemy'); const d1=G.enemy.deck.length; A.applyCommand(c2, G.enemy, null);
  ok('AI: the no-effect Command draws nothing', G.enemy.deck.length===d1);
  ok('a Pilot with no 【Main】 gives nothing to "Activate 【Main】 on the paired card"', A.pilotMainAction({ pilotCard:card('GD01-089','player') })===null); }

// ===== GD03-101 A Healthy Curiosity — Draw 1. Then, if 2+ "A Healthy Curiosity" in your trash, rest an enemy Unit (4 or less HP) =====
{ fresh('player'); const e=stick('enemy',3,3); const c=inHand('GD03-101'); const d0=G.player.deck.length; play(c);
  ok('Healthy Curiosity: always draws 1', G.player.deck.length===d0-1 && G.player.hand.length===1, `deck ${d0}->${G.player.deck.length}`);
  ok('Healthy Curiosity: no copies in the trash → nothing rested', !e.rested && G.mode==='idle'); }
{ fresh('player'); const e=stick('enemy',3,3); toTrash('player','GD03-101',1); const c=inHand('GD03-101'); play(c);
  ok('Healthy Curiosity: 1 other copy (the one being played does not count) → no rest', !e.rested && G.mode==='idle'); }
{ fresh('player'); const e=stick('enemy',3,3), big=stick('enemy',3,5); toTrash('player','GD03-101',2); const c=inHand('GD03-101'); const d0=G.player.deck.length; play(c);
  const tgt = G.mode==='trigger-target' && G.pending.cands.includes(e.uid) && !G.pending.cands.includes(big.uid);
  A.fieldClick(e.uid); drainTasks();
  ok('Healthy Curiosity: 2 copies → you choose an enemy Unit with 4 or less HP and rest it (after drawing)', tgt && e.rested && !big.rested && G.player.deck.length===d0-1, `tgt=${tgt} rested=${e.rested}`); }
{ fresh('enemy'); const p=stick('player',3,3); toTrash('enemy','GD03-101',2); const c=card('GD03-101','enemy'); const d0=G.enemy.deck.length; A.applyCommand(c, G.enemy, null);
  ok('Healthy Curiosity (AI): draws and, with 2 copies, rests your Unit', G.enemy.deck.length===d0-1 && p.rested); }
{ fresh('enemy'); const p=stick('player',3,3); const c=card('GD03-101','enemy'); A.applyCommand(c, G.enemy, null);
  ok('Healthy Curiosity (AI): no copies → no rest', !p.rested); }

// ===== GD03-102 Privileged Position — 【Action】set active 1 of your (Titans) Link Units battling an enemy Unit =====
{ fresh('player'); const t=stick('player',4,4,{trait:'(Titans)', linked:true}); const other=stick('player',6,6,{rested:true}); const foe=stick('enemy',1,9,{rested:true});
  G.player.hand=[card('GD03-102','player')];
  A.fieldClick(t.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks();
  const offered = !!modal() && modal().btns.some(b=>/Privileged/.test(b));
  press(/Privileged/);
  ok('Privileged Position: your attacking (Titans) Link Unit is set active; another rested Unit is not', offered && !t.rested && other.rested, `offered=${offered} t=${t.rested}`);
  passAll(); }
{ fresh('player'); const t=stick('player',4,4,{trait:'(Zeon)', linked:true}); const foe=stick('enemy',1,9,{rested:true}); G.player.hand=[card('GD03-102','player')];
  A.fieldClick(t.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks();
  ok('Privileged Position: not offered when no (Titans) Link Unit is battling', !modal() || !modal().btns.some(b=>/Privileged/.test(b))); passAll(); }
{ fresh('enemy'); const t=stick('enemy',4,4,{trait:'(Titans)', linked:true, rested:true}); const idle=stick('enemy',6,6,{trait:'(Titans)', linked:true, rested:true}); const pu=stick('player',2,2,{rested:true});
  G.curBattle={ atk:t, def:pu }; A.runTrigger(card('GD03-102','enemy'), G.enemy, card('GD03-102','enemy').action, 'Test'); G.curBattle=null;
  ok('Privileged Position (AI): readies its battling (Titans) Link Unit, not an idle one', !t.rested && idle.rested); }

// ===== GD03-104 Reccoa's Shadow — rest 1 enemy (3 or less HP); with a friendly (Jupitris) Link Unit, 1 to 2 instead =====
{ fresh('player'); const a=stick('enemy',2,3), b=stick('enemy',2,2); const c=inHand('GD03-104'); play(c);
  ok("Reccoa's Shadow: without a (Jupitris) Link Unit you rest one enemy Unit", G.mode==='trigger-target', G.mode); A.fieldClick(a.uid); drainTasks();
  ok("Reccoa's Shadow: only the chosen Unit is rested", a.rested && !b.rested); }
{ fresh('player'); stick('player',3,3,{trait:'(Jupitris)', linked:true}); const a=stick('enemy',2,3), b=stick('enemy',2,2), big=stick('enemy',2,5); const c=inHand('GD03-104'); play(c);
  const multi = G.mode==='trigger-multi' && G.pending.max===2 && !G.pending.cands.includes(big.uid);
  A.fieldClick(a.uid); drainTasks(); A.fieldClick(b.uid); drainTasks();
  ok("Reccoa's Shadow: with a (Jupitris) Link Unit you choose 1 to 2 enemy Units (3 or less HP) and rest them", multi && a.rested && b.rested && !big.rested, `multi=${multi}`); }
{ fresh('enemy'); stick('player',2,3); stick('player',2,2); stick('enemy',3,3,{trait:'(Jupitris)', linked:true}); A.applyCommand(card('GD03-104','enemy'), G.enemy, null);
  ok("Reccoa's Shadow (AI): with its (Jupitris) Link Unit it rests 2 of your Units", G.player.field.filter(u=>u.rested).length===2); }
{ fresh('enemy'); const atk=stick('enemy',5,5); const a=stick('player',2,3,{rested:true}); const e2=stick('enemy',2,3); const e3=stick('enemy',2,2); stick('player',3,3,{trait:'(Jupitris)', linked:true});
  G.player.hand=[card('GD03-104','player')]; A.resolveAiAttack(atk, ()=>{}, a); drainTasks(); press(/Reccoa/);
  const first = !!modal() && /choose an enemy Unit to rest/.test(modal().msg); pressUnit(e2); const second = !!modal() && modal().btns.some(b=>/Done/.test(b)); pressUnit(e3); passAll();
  ok("Reccoa's Shadow in the Action Step: picks up to 2 targets through the chooser", first && second && e2.rested && e3.rested, `first=${first} second=${second}`); }

// ===== GD03-107 Over the River and Through the Woods — damage equal to the number of friendly Unit tokens to a Lv.5-or-lower enemy =====
{ fresh('player'); for (let i=0;i<3;i++) stick('player',1,1,{token:true}); const lv5=stick('enemy',5,5,{lv:5}), lv6=stick('enemy',5,5,{lv:6}); const c=inHand('GD03-107'); const d0=G.player.deck.length; play(c);
  const legal = G.mode==='trigger-target' && G.pending.cands.includes(lv5.uid) && !G.pending.cands.includes(lv6.uid);
  A.fieldClick(lv5.uid); drainTasks();
  ok('Over the River: 3 friendly tokens → 3 damage to the chosen Lv.5-or-lower enemy; no draw', legal && lv5.hp===2 && lv6.hp===5 && G.player.deck.length===d0, `legal=${legal} hp=${lv5.hp} deck ${d0}->${G.player.deck.length}`); }
{ fresh('enemy'); stick('enemy',1,1,{token:true}); stick('enemy',1,1,{token:true}); const p=stick('player',5,5,{lv:5}); A.applyCommand(card('GD03-107','enemy'), G.enemy, null);
  ok('Over the River (AI): 2 tokens → 2 damage', p.hp===3, 'hp '+p.hp); }
{ fresh('enemy'); for (let i=0;i<3;i++) stick('enemy',1,1,{token:true}); const p=stick('player',4,3,{lv:4}); G.enemy.hand=[card('GD03-107','enemy')]; A.aiMainStep(); drainTasks();
  ok('Over the River (AI main step): plays it for a kill with 3 tokens', !G.player.field.includes(p), 'hp '+p.hp); }

// ===== GD03-113 Human Karma — rest 1 active friendly Unit; if you do, 3 damage to an enemy Unit whose Lv. ≤ the rested Unit's =====
{ fresh('player'); const lv4=stick('player',4,4,{lv:4}), lv2=stick('player',2,2,{lv:2}); const e3=stick('enemy',2,4,{lv:3}), e6=stick('enemy',6,6,{lv:6}); const c=inHand('GD03-113'); play(c);
  const asked = !!modal() && /active friendly Unit to rest/.test(modal().msg) && modal().btns.length===2;
  pressUnit(lv4);
  const tgt = G.mode==='trigger-target' && G.pending.cands.includes(e3.uid) && !G.pending.cands.includes(e6.uid);
  A.fieldClick(e3.uid); drainTasks();
  ok('Human Karma: you choose which of your Units to rest, then 3 damage to an enemy whose Lv. is ≤ it', asked && lv4.rested && !lv2.rested && tgt && e3.hp===1 && !e3.rested && e6.hp===6, `asked=${asked} tgt=${tgt} e3=${e3.hp}`); }
{ fresh('player'); const lv2=stick('player',2,2,{lv:2}); const e3=stick('enemy',2,4,{lv:3}); const c=inHand('GD03-113'); play(c); drainTasks();
  ok('Human Karma: resting a Lv.2 Unit can\'t reach a Lv.3 enemy', lv2.rested && e3.hp===4, `rested=${lv2.rested} e3=${e3.hp}`); }
{ fresh('enemy'); const own=stick('enemy',4,4,{lv:4}); const p3=stick('player',2,3,{lv:3}); A.applyCommand(card('GD03-113','enemy'), G.enemy, null);
  ok('Human Karma (AI): rests its own Unit and deals 3 to your Lv.3 Unit', own.rested && !G.player.field.includes(p3)); }

// ===== GD03-114 Look of Determination — destroy an active Lv.2-or-lower enemy; with 10+ cards in your trash, Lv.4 or lower instead =====
{ fresh('enemy'); const atk=stick('enemy',3,3,{lv:2}); const lv4=stick('enemy',4,4,{lv:4}); const mine=stick('player',1,1,{rested:true}); fillTrash('player',10);
  G.player.hand=[card('GD03-114','player')]; A.resolveAiAttack(atk, ()=>{}, mine); drainTasks();
  const offered = !!modal() && modal().btns.some(b=>/Look of Determination/.test(b)); press(/Look of Determination/);
  ok('Look of Determination: 10 cards in your trash → an active Lv.4 enemy Unit can be destroyed', offered && !G.enemy.field.includes(lv4), `offered=${offered}`); passAll(); }
{ fresh('enemy'); const atk=stick('enemy',3,3,{lv:5}); const lv4=stick('enemy',4,4,{lv:4}); const mine=stick('player',1,1,{rested:true}); fillTrash('player',9);
  G.player.hand=[card('GD03-114','player')]; A.resolveAiAttack(atk, ()=>{}, mine); drainTasks();
  ok('Look of Determination: 9 cards (itself not counted) → no legal target, not offered', !modal() || !modal().btns.some(b=>/Look of Determination/.test(b))); passAll();
  ok('Look of Determination: the Lv.4 Unit stays', G.enemy.field.includes(lv4)); }
{ fresh('enemy'); const p4=stick('player',4,4,{lv:4}); fillTrash('enemy',10); A.applyCommand(card('GD03-114','enemy'), G.enemy, null);
  ok('Look of Determination (AI): with 10 cards in its trash it destroys your active Lv.4 Unit', !G.player.field.includes(p4)); }
{ fresh('enemy'); const p4=stick('player',4,4,{lv:4}); fillTrash('enemy',3); A.applyCommand(card('GD03-114','enemy'), G.enemy, null);
  ok('Look of Determination (AI): with 3 cards only Lv.2 or lower', G.player.field.includes(p4)); }

// ===== GD03-118 Awakened Potential — bounce a rested Lv.4-or-lower enemy; then, with 2+ copies in your trash, you may give a Unit <Blocker> =====
{ fresh('enemy'); const atk=stick('enemy',3,3,{lv:4}); const mine=stick('player',1,1,{rested:true}); const ally=stick('player',2,5,{lv:5});
  G.player.hand=[card('GD03-118','player')]; A.resolveAiAttack(atk, ()=>{}, mine); drainTasks(); press(/Awakened/);
  const blockerAsked = !!modal() && /Blocker/.test(modal().msg);
  ok('Awakened Potential: the rested Lv.4 attacker returns to its owner\'s hand; with no copies in the trash no <Blocker> offer', !G.enemy.field.includes(atk) && G.enemy.hand.includes(atk) && !blockerAsked && !ally.tempBlocker); passAll(); }
{ fresh('enemy'); const atk=stick('enemy',3,3,{lv:4}); const mine=stick('player',1,1,{rested:true}); const ally=stick('player',2,5,{lv:5}); toTrash('player','GD03-118',2);
  G.player.hand=[card('GD03-118','player')]; A.resolveAiAttack(atk, ()=>{}, mine); drainTasks(); press(/Awakened/);
  const asked = !!modal() && /you may choose 1 friendly Unit/.test(modal().msg) && modal().btns.some(b=>/Don't choose/.test(b));
  pressUnit(ally);
  ok('Awakened Potential: 2 copies → you may choose a friendly Unit (a Lv.5 one too) — it gains <Blocker>', asked && G.enemy.hand.includes(atk) && A.effBlocker(ally), `asked=${asked}`); passAll(); }
{ fresh('enemy'); const atk=stick('enemy',3,3,{lv:4}); const mine=stick('player',1,1,{rested:true}); const ally=stick('player',2,5); toTrash('player','GD03-118',2);
  G.player.hand=[card('GD03-118','player')]; A.resolveAiAttack(atk, ()=>{}, mine); drainTasks(); press(/Awakened/); press(/Don't choose/);
  ok('Awakened Potential: the <Blocker> part can be declined', !A.effBlocker(ally) && !A.effBlocker(mine)); passAll(); }
{ fresh('enemy'); const p=stick('player',3,3,{lv:4, rested:true}); const own=stick('enemy',3,3,{lv:6}); toTrash('enemy','GD03-118',2); A.applyCommand(card('GD03-118','enemy'), G.enemy, null);
  ok('Awakened Potential (AI): bounces your rested Lv.4 Unit and, with 2 copies, gives its Unit <Blocker>', G.player.hand.includes(p) && A.effBlocker(own)); }
{ fresh('enemy'); const p=stick('player',3,3,{lv:4, rested:true}); const own=stick('enemy',3,3,{lv:3}); A.applyCommand(card('GD03-118','enemy'), G.enemy, null);
  ok('Awakened Potential (AI): no copies → no <Blocker>', G.player.hand.includes(p) && !A.effBlocker(own)); }

// ===== GD03-119 Awkward Approach — set a rested friendly Base active; if you do, all enemy Units get AP-1 =====
{ fresh('player'); G.player.base=A.exBaseToken('player'); G.player.base.rested=true; const e=stick('enemy',4,4); const c=inHand('GD03-119'); play(c);
  ok('Awkward Approach: your rested Base is set active and enemy Units get AP-1', !G.player.base.rested && A.effAp(e)===3, `rested=${G.player.base.rested} ap=${A.effAp(e)}`); }
{ fresh('player'); G.player.base=A.exBaseToken('player'); const e=stick('enemy',4,4); const c=inHand('GD03-119'); play(c);
  ok('Awkward Approach: no rested Base → it can\'t be played (nothing to choose) and no AP-1', G.player.hand.includes(c) && A.effAp(e)===4); }
{ fresh('enemy'); G.enemy.base=A.exBaseToken('enemy'); G.enemy.base.rested=true; const p=stick('player',4,4); A.runTrigger(card('GD03-119','enemy'), G.enemy, card('GD03-119','enemy').action, 'Test');
  ok('Awkward Approach (AI): readies its Base, your Units get AP-1', !G.enemy.base.rested && A.effAp(p)===3); }
{ fresh('enemy'); const p=stick('player',4,4); A.runTrigger(card('GD03-119','enemy'), G.enemy, card('GD03-119','enemy').action, 'Test');
  ok('Awkward Approach (AI): no Base → no AP-1', A.effAp(p)===4); }

// ===== GD03-120 Immortal Colasour — this turn, when a friendly (Superpower Bloc)/(UN) Unit destroys an enemy Unit in battle, ready a rested one; it can't attack =====
{ fresh('player'); const z=stick('player',3,3,{trait:'(Zeon)', rested:true}); const un=stick('player',3,3,{trait:'(UN)'}); const foe=stick('enemy',1,2,{rested:true}); const c=inHand('GD03-120'); play(c);
  ok('Immortal Colasour: nothing is readied when it is played', z.rested && !un.rested);
  A.fieldClick(un.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); passAll(); drainTasks();
  ok('Immortal Colasour: your (UN) Unit destroys an enemy in battle → it is set active and can\'t attack again', !G.enemy.field.includes(foe) && !un.rested && un.noAttackTurn===G.turnSeq && z.rested, `un.rested=${un.rested}`); }
{ fresh('player'); const un=stick('player',3,3,{trait:'(UN)'}); const sb=stick('player',2,4,{trait:'(Superpower Bloc)', rested:true}); const foe=stick('enemy',1,2,{rested:true}); play(inHand('GD03-120'));
  A.fieldClick(un.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); passAll(); drainTasks();
  const asked = !!modal() && /rested friendly Unit to set active/.test(modal().msg) && modal().btns.length===2;
  pressUnit(sb);
  ok('Immortal Colasour: with two rested (SB)/(UN) Units you choose which one is set active', asked && !sb.rested && un.rested, `asked=${asked}`); }
{ fresh('enemy'); const un=stick('enemy',3,3,{trait:'(UN)'}); const p=stick('player',1,2,{rested:true}); A.runTrigger(card('GD03-120','enemy'), G.enemy, card('GD03-120','enemy').action, 'Test');
  A.battle(un, p, G.enemy, G.player); drainTasks();
  ok('Immortal Colasour (AI): its (UN) Unit kills in battle and is set active, barred from attacking', !G.player.field.includes(p) && !un.rested && un.noAttackTurn===G.turnSeq); }
{ fresh('enemy'); const z=stick('enemy',3,3,{trait:'(Zeon)'}); const p=stick('player',1,2,{rested:true}); A.runTrigger(card('GD03-120','enemy'), G.enemy, card('GD03-120','enemy').action, 'Test');
  A.battle(z, p, G.enemy, G.player); drainTasks();
  ok('Immortal Colasour (AI): a non-(SB)/(UN) killer does not trigger it', z.rested); }

// ===== GD04-103 Spiritual Support — a Unit of yours gains <Repair 2> during this turn =====
{ fresh('player'); const u=stick('player',2,6); u.hp=1; const c=inHand('GD04-103'); play(c);
  ok('Spiritual Support: no immediate heal; the Unit gains <Repair 2> this turn', u.hp===1 && A.effRepair(u)===2, `hp=${u.hp} repair=${A.effRepair(u)}`);
  G.endStepDone=false; A.finishEndPhase(); drainTasks();
  ok('Spiritual Support: it recovers 2 HP at the end of the turn', u.hp===3, 'hp '+u.hp); }
{ fresh('player'); const a=stick('player',2,6), b=stick('player',3,5); a.hp=1; const c=inHand('GD04-103'); play(c);
  const asked=!!modal() && modal().btns.length===2; pressUnit(b);
  ok('Spiritual Support: with two Units you choose', asked && A.effRepair(b)===2 && A.effRepair(a)===0); }
{ fresh('enemy'); const u=stick('enemy',2,6); u.hp=2; A.applyCommand(card('GD04-103','enemy'), G.enemy, null);
  ok('Spiritual Support (AI): its Unit gains <Repair 2>, no immediate heal', u.hp===2 && A.effRepair(u)===2); }

// ===== GD04-107 Destined Battle — 【Action】choose a rested Unit of yours; enemy Units must attack it this turn =====
{ fresh('enemy'); const atk1=stick('enemy',3,3), atk2=stick('enemy',4,4); const r=stick('player',1,9,{rested:true}); const other=stick('player',1,1,{rested:true});
  G.player.hand=[card('GD04-107','player')]; A.resolveAiAttack(atk1, ()=>{}, other); drainTasks();
  const offered = !!modal() && modal().btns.some(b=>/Destined/.test(b)); press(/Destined/);
  const asked = !!modal() && /enemy Units must choose it/.test(modal().msg); pressUnit(r); passAll(); drainTasks();
  const lures=A.lureTargets(atk2, G.player);
  ok('Destined Battle: you choose your rested Unit; enemy Units must choose it as their attack target this turn', offered && asked && lures.length===1 && lures[0]===r, `offered=${offered} asked=${asked} lures=${lures.length}`);
  let hit=null; A.resolveAiAttack(atk2, ()=>{}, null); drainTasks(); passAll(); drainTasks();
  ok('Destined Battle: the next AI attacker attacks that Unit (not your shields)', r.hp===9-4 && G.player.shields.length===6, `r.hp=${r.hp} shields=${G.player.shields.length}`); }
{ fresh('player'); const mine=stick('player',5,5); const lure=stick('enemy',1,9,{rested:true}); const other=stick('enemy',1,1,{rested:true});
  A.runTrigger(card('GD04-107','enemy'), G.enemy, card('GD04-107','enemy').action, 'Test');
  A.fieldClick(mine.uid); drainTasks(); A.fieldClick(other.uid); drainTasks();
  ok('Destined Battle (AI): your attacker must attack its chosen Unit', G.mode==='attack-target' && other.hp===1 && !mine.rested, G.mode); A.attackDirect(); drainTasks();
  ok('Destined Battle (AI): …and can\'t attack the player instead', G.enemy.shields.length===6 && !mine.rested); }

// ===== GD04-115 Backup — a Unit of yours destroys a Lv.5-or-lower enemy Unit it deals battle damage to this turn =====
{ fresh('player'); const u=stick('player',2,5); const e5=stick('enemy',1,6,{lv:5, rested:true}); const c=inHand('GD04-115'); play(c);
  ok('Backup: nothing is destroyed when it is played', G.enemy.field.includes(e5) && u.battleDestroyGrant);
  A.fieldClick(u.uid); drainTasks(); A.fieldClick(e5.uid); drainTasks(); passAll(); drainTasks();
  ok('Backup: your Unit deals 2 battle damage to a Lv.5 enemy (6 HP) → it is destroyed', !G.enemy.field.includes(e5) && G.enemy.trash.includes(e5)); }
{ fresh('player'); const u=stick('player',2,5); const e6=stick('enemy',1,6,{lv:6, rested:true}); play(inHand('GD04-115'));
  A.fieldClick(u.uid); drainTasks(); A.fieldClick(e6.uid); drainTasks(); passAll(); drainTasks();
  ok('Backup: a Lv.6 enemy survives', G.enemy.field.includes(e6) && e6.hp===4); }
{ fresh('player'); const a=stick('player',2,5), b=stick('player',3,3); play(inHand('GD04-115')); const asked=!!modal() && modal().btns.length===2; pressUnit(b);
  ok('Backup: with two Units you choose', asked && b.battleDestroyGrant && !a.battleDestroyGrant); }
{ fresh('enemy'); const u=stick('enemy',2,5); const p=stick('player',1,6,{lv:4, rested:true}); A.runTrigger(card('GD04-115','enemy'), G.enemy, card('GD04-115','enemy').action, 'Test');
  A.battle(u, p, G.enemy, G.player); drainTasks();
  ok('Backup (AI): its Unit destroys your Lv.4 Unit it damaged', !G.player.field.includes(p)); }

// ===== GD04-119 Fighting Alone — a Unit paired with a (Newtype) Pilot can't receive effect damage from enemy Units this turn =====
const ntPilot=[...A.CARD_BY_ID.values()].find(d=>d.type==='pilot' && /\(newtype\)/i.test(d.trait||'') && !/-p\d/.test(d.id)).id;
const otherPilot=[...A.CARD_BY_ID.values()].find(d=>d.type==='pilot' && !/\(newtype\)/i.test(d.trait||'') && !/-p\d/.test(d.id)).id;
{ fresh('player'); const u=stick('player',3,6); pair(u, ntPilot); const hp=u.hp; const c=inHand('GD04-119'); const d0=G.player.deck.length; play(c);
  const eu=stick('enemy',2,2); G.effSrc=eu; A.damage(u, 2, G.player); const afterUnit=u.hp;
  const cmd=card('GD05-110','enemy'); G.effSrc=cmd; A.damage(u, 1, G.player);
  ok('Fighting Alone: no effect damage from an enemy Unit; an enemy Command still hits; no card drawn', afterUnit===hp && u.hp===hp-1 && G.player.deck.length===d0, `unit:${hp}->${afterUnit} cmd->${u.hp} deck ${d0}->${G.player.deck.length}`); }
{ fresh('player'); const u=stick('player',3,6); pair(u, otherPilot); const c=inHand('GD04-119'); play(c);
  ok('Fighting Alone: a Unit without a (Newtype) Pilot is not a legal choice (the card stays in hand)', G.player.hand.includes(c) && !u.noUnitEffDmgTurn); }
{ fresh('enemy'); const u=stick('enemy',3,6); pair(u, ntPilot); const hp=u.hp; A.applyCommand(card('GD04-119','enemy'), G.enemy, null);
  const pu=stick('player',2,2); G.effSrc=pu; A.damage(u, 3, G.enemy);
  ok('Fighting Alone (AI): its (Newtype)-paired Unit ignores your Unit\'s effect damage', u.hp===hp); }

// ===== GD05-107 Interwoven Blessings — destroy the first 2 cards in the enemy shield area =====
{ fresh('player'); G.enemy.base=A.exBaseToken('enemy'); const c=inHand('GD05-107'); const d0=G.player.deck.length; play(c);
  ok('Interwoven Blessings: the enemy Base and then 1 shield are destroyed; no draw', !G.enemy.base && G.enemy.shields.length===5 && G.player.deck.length===d0, `base=${!!G.enemy.base} shields=${G.enemy.shields.length}`); }
{ fresh('player'); const c=inHand('GD05-107'); play(c);
  ok('Interwoven Blessings: with no Base, 2 shields are destroyed (into the trash)', G.enemy.shields.length===4 && G.enemy.trash.length===2); }
{ fresh('enemy'); A.applyCommand(card('GD05-107','enemy'), G.enemy, null); drainTasks();
  ok('Interwoven Blessings (AI): 2 of your shields are destroyed', G.player.shields.length===4); }

// ===== GD05-109 Felsi's Plea — 【Action】a friendly (Academy) Unit recovers 2 HP; then, if its Pilot is Lv.3 or lower, draw 1 =====
const lvPilot=(max,min)=>[...A.CARD_BY_ID.values()].find(d=>d.type==='pilot' && (d.lv||0)<=max && (d.lv||0)>=(min||0) && !/-p\d/.test(d.id)).id;
function felsi(pilotId, hp0){
  fresh('enemy'); const atk=stick('enemy',2,9); const ac=stick('player',2,6,{trait:'(Academy)', rested:true}); if (pilotId) pair(ac, pilotId); ac.hp=hp0;
  G.player.hand=[card('GD05-109','player')]; const h0=G.player.deck.length;
  A.resolveAiAttack(atk, ()=>{}, stick('player',1,1,{rested:true})); drainTasks(); press(/Felsi/);
  const r={ hp:ac.hp, drew:h0-G.player.deck.length }; passAll(); return r; }
{ const r=felsi(lvPilot(3), 2); ok("Felsi's Plea: +2 HP and, with a Lv.3-or-lower Pilot, draw 1", r.hp===4 && r.drew===1, JSON.stringify(r)); }
{ const r=felsi(lvPilot(9,5), 2); ok("Felsi's Plea: a Lv.5 Pilot → +2 HP, no draw", r.hp===4 && r.drew===0, JSON.stringify(r)); }
{ const r=felsi(null, 2); ok("Felsi's Plea: no Pilot → +2 HP, no draw", r.hp===4 && r.drew===0, JSON.stringify(r)); }
{ fresh('enemy'); const atk=stick('enemy',2,9); const a=stick('player',2,6,{trait:'(Academy)'}); pair(a, lvPilot(3)); const b=stick('player',2,6,{trait:'(Academy)'}); b.hp=3;
  G.player.hand=[card('GD05-109','player')]; const d0=G.player.deck.length; A.resolveAiAttack(atk, ()=>{}, null); drainTasks(); press(/Don't/); press(/Felsi/);
  const asked=!!modal() && modal().btns.length===2; pressUnit(a);
  ok("Felsi's Plea: you choose the (Academy) Unit — an undamaged one with a Lv.3 Pilot still draws", asked && G.player.deck.length===d0-1 && b.hp===3, `asked=${asked}`); passAll(); }
{ fresh('enemy'); const ac=stick('enemy',2,6,{trait:'(Academy)'}); pair(ac, lvPilot(3)); ac.hp=1; const d0=G.enemy.deck.length; A.applyCommand(card('GD05-109','enemy'), G.enemy, null);
  ok("Felsi's Plea (AI): heals its (Academy) Unit and draws with a Lv.3 Pilot", ac.hp===3 && G.enemy.deck.length===d0-1); }

// ===== GD05-110 Darkness Finger — 2 damage; then, if you have a "Master Gundam" Unit, draw 1 =====
const master=[...A.CARD_BY_ID.values()].find(d=>d.type==='unit' && /master gundam/i.test(d.name) && !/-p\d/.test(d.id)).id;
{ fresh('player'); put(master,'player'); const e=stick('enemy',2,5); const c=inHand('GD05-110'); const d0=G.player.deck.length; play(c); A.fieldClick(e.uid); drainTasks();
  ok('Darkness Finger: 2 damage, and with a Master Gundam in play draw 1', e.hp===3 && G.player.deck.length===d0-1, `hp=${e.hp} deck ${d0}->${G.player.deck.length}`); }
{ fresh('player'); const e=stick('enemy',2,5); const c=inHand('GD05-110'); const d0=G.player.deck.length; play(c); A.fieldClick(e.uid); drainTasks();
  ok('Darkness Finger: no Master Gundam → no draw', e.hp===3 && G.player.deck.length===d0); }
{ fresh('player'); const e=stick('enemy',2,5); const c=inHand('GD05-110'); play(c); const tgt=G.mode==='trigger-target' && !!G.cmdInFlight; A.cancelAction && A.cancelAction(); drainTasks();
  ok('Darkness Finger: Cancel while choosing the target returns it to hand', tgt && G.player.hand.includes(c) && e.hp===5); }
{ fresh('enemy'); put(master,'enemy'); const p=stick('player',2,2); G.enemy.hand=[card('GD05-110','enemy')]; const d0=G.enemy.deck.length; A.aiMainStep(); drainTasks();
  ok('Darkness Finger (AI main step): kills your 2-HP Unit and draws with its Master Gundam', !G.player.field.includes(p) && G.enemy.deck.length===d0-1, `deck ${d0}->${G.enemy.deck.length}`); }

// ===== GD06-101 The Gundam Says — bounce an enemy (5 or less HP); then, with a friendly (Alphacide) Link Unit, draw 1 =====
{ fresh('player'); stick('player',3,3,{trait:'(Alphacide)', linked:true}); const e=stick('enemy',2,5); const c=inHand('GD06-101'); const d0=G.player.deck.length; play(c); A.fieldClick(e.uid); drainTasks();
  ok('The Gundam Says: bounce, and with an (Alphacide) Link Unit draw 1', G.enemy.hand.includes(e) && G.player.deck.length===d0-1); }
{ fresh('player'); stick('player',3,3,{trait:'(Alphacide)'}); const e=stick('enemy',2,5); const c=inHand('GD06-101'); const d0=G.player.deck.length; play(c); A.fieldClick(e.uid); drainTasks();
  ok('The Gundam Says: an unlinked (Alphacide) Unit → no draw', G.enemy.hand.includes(e) && G.player.deck.length===d0); }
{ fresh('enemy'); stick('enemy',3,3,{trait:'(Alphacide)', linked:true}); const p=stick('player',2,5); const d0=G.enemy.deck.length; A.applyCommand(card('GD06-101','enemy'), G.enemy, null);
  ok('The Gundam Says (AI): bounces and draws', G.player.hand.includes(p) && G.enemy.deck.length===d0-1); }

// ===== GD06-106 Presence Detected (+ Peaceful Timbre ST02-013, White Wolf GD02-106) — shield area guard for this battle =====
function guardRun(id, ap, lv, base){
  fresh('enemy'); const atk=stick('enemy',ap,5,{lv}); if (base) G.player.base=A.exBaseToken('player');
  G.player.hand=[card(id,'player')]; const bh=base?G.player.base.hp:0;
  A.resolveAiAttack(atk, ()=>{}, null); drainTasks(); const offered=!!modal() && modal().btns.some(b=>new RegExp(esc(A.CARD_BY_ID.get(id).name)).test(b));
  press(new RegExp(esc(A.CARD_BY_ID.get(id).name))); passAll(); drainTasks();
  return { offered, shields:G.player.shields.length, base: base ? (G.player.base ? G.player.base.hp : 0) : null, bh, atk }; }
{ const r=guardRun('GD06-106', 5, 3); ok('Presence Detected: an AP5 attacker deals no damage to your shields this battle', r.offered && r.shields===6, JSON.stringify({o:r.offered,s:r.shields})); }
{ const r=guardRun('GD06-106', 7, 3); ok('Presence Detected: an AP7 attacker still breaks a shield', r.shields===5, 's '+r.shields); }
{ const r=guardRun('GD06-106', 5, 3, true); ok('Presence Detected: your Base (a shield area card) is protected too', r.base===r.bh, `${r.bh}->${r.base}`); }
{ const r=guardRun('GD06-106', 5, 3); const atk2=stick('enemy',5,5); A.resolveAiAttack(atk2, ()=>{}, null); drainTasks(); passAll(); drainTasks();
  ok('Presence Detected: it ends with the battle — the next attack breaks a shield', G.player.shields.length===5, 's '+G.player.shields.length); }
{ const r=guardRun('ST02-013', 9, 4); ok('Peaceful Timbre: a Lv.4 attacker deals no damage to your shields', r.offered && r.shields===6); }
{ const r=guardRun('GD02-106', 9, 4); ok('White Wolf: a Lv.4 attacker is not covered (Lv.3 or lower)', r.shields===5); }
{ fresh('player'); const atk=stick('player',4,4); G.curAttack=atk; A.runTrigger(card('GD06-106','enemy'), G.enemy, card('GD06-106','enemy').action, 'Test');
  const s=[]; A.strikePlayer(atk, G.enemy, ()=>{}); drainTasks();
  ok('Presence Detected (AI): your AP4 attacker deals no damage to its shields', G.enemy.shields.length===6); }

// ===== GD06-116 Afterglow of Zeon (+ A Twinkle from the Abyss ST11-015) — deploy a Unit card from your trash (no cost) =====
// Dom Tropen GD06-059 = purple (Zeon) Lv.3; GFreD GD06-051 = purple (Zeon) Lv.6; Rezin's Geara Doga GD05-056 = purple (Neo Zeon) Lv.4.
{ fresh('player'); const z5=card('GD06-059','player'), z6=card('GD06-051','player'), nz=card('GD05-056','player'); G.player.trash.push(z5, z6, nz);
  const c=inHand('GD06-116'); const r0=G.player.resAvail; play(c); drainTasks();
  const tiles=overlayTiles(); const pickable=[...tiles].filter(t=>t.onclick).length;
  if (tiles.length) tiles[0].onclick(); drainTasks();
  ok('Afterglow of Zeon: only the purple (Zeon) Lv.5-or-lower card is offered (not (Neo Zeon), not Lv.6)', tiles.length===1 && pickable===1, `tiles=${tiles.length}`);
  ok('Afterglow of Zeon: it is deployed without paying its cost', G.player.field.includes(z5) && !z5.rested && G.player.resAvail===r0-A.CARD_BY_ID.get('GD06-116').cost, `res ${r0}->${G.player.resAvail}`); }
{ fresh('enemy'); const z5=card('GD06-059','enemy'); G.enemy.trash.push(z5, card('GD05-056','enemy')); G.enemy.resAvail=0; A.applyCommand(card('GD06-116','enemy'), G.enemy, null); drainTasks();
  ok('Afterglow of Zeon (AI): deploys it from the trash with no Resources left', G.enemy.field.includes(z5)); }
{ fresh('player'); const mar=[...A.CARD_BY_ID.values()].find(d=>d.type==='unit' && /\(marine\)/i.test(d.trait) && d.lv<=4 && !/-p\d/.test(d.id) && !/【Deploy】/.test(d.effect||'')); const m=card(mar.id,'player'); G.player.trash.push(m);
  play(inHand('ST11-015')); drainTasks(); const t=overlayTiles(); if (t.length) t[0].onclick(); drainTasks();
  ok('A Twinkle from the Abyss: the (Marine) Unit is deployed rested', G.player.field.includes(m) && m.rested); }

// ===== GD06-119 Sturm und Drang — after its 【Action】, you may pair it from the trash with one of your (MF) Units =====
{ fresh('enemy'); const atk=stick('enemy',3,3); const mf=stick('player',3,4,{trait:'(MF)'}); const e=stick('enemy',1,2);
  const c=card('GD06-119','player'); G.player.hand=[c]; A.resolveAiAttack(atk, ()=>{}, null); drainTasks(); press(/Don't/); press(/Sturm/); drainTasks();
  if (G.mode==='action-step-target') A.fieldClick(e.uid); drainTasks();
  const asked = !!modal() && /pair it from your trash/.test(modal().msg); pressUnit(mf);
  ok('Sturm und Drang: after the 【Action】 you may pair it from the trash with your (MF) Unit', A.makeCard(A.CARD_BY_ID.get('GD06-119'),'player').pairFromTrashAfterMain==='mf' && asked && !!mf.pilotCard && !G.player.trash.includes(c), `asked=${asked}`); passAll(); }
{ fresh('enemy'); const mf=stick('enemy',3,4,{trait:'(MF)'}); const c=card('GD06-119','enemy'); G.enemy.trash.push(c); A.afterCommandMain(c, G.enemy, null); drainTasks();
  ok('Sturm und Drang (AI): pairs it from its trash', !!mf.pilotCard && !G.enemy.trash.includes(c)); }

// ===== GD06-121 Crybaby Poe — AP-2 this battle; AP-6 instead if it has <High-Maneuver> =====
// The attacker hits a rested 1/9 Unit of yours: the damage it deals is its AP during this battle.
function crybaby(hm){ fresh('enemy'); const atk=stick('enemy',7,5,{highManeuver:hm}); const wall=stick('player',1,9,{rested:true}); G.player.hand=[card('GD06-121','player')];
  A.resolveAiAttack(atk, ()=>{}, wall); drainTasks(); press(/Crybaby/); drainTasks(); if (G.mode==='action-step-target') A.fieldClick(atk.uid); drainTasks(); passAll(); drainTasks();
  return { dealt:9-wall.hp, after:A.effAp(atk) }; }
{ const r=crybaby(true); ok('Crybaby Poe: a <High-Maneuver> attacker gets AP-6 instead (7 → 1) for the battle', r.dealt===1 && r.after===7, JSON.stringify(r)); }
{ const r=crybaby(false); ok('Crybaby Poe: otherwise AP-2 (7 → 5)', r.dealt===5 && r.after===7, JSON.stringify(r)); }
{ fresh('enemy'); const p=stick('player',7,5,{highManeuver:true}); A.applyCommand(card('GD06-121','enemy'), G.enemy, p);
  ok('Crybaby Poe (AI): AP-6 on your <High-Maneuver> Unit', A.effAp(p)===1); }

// ===== the same Commands in an Action Step / as a Burst (choices through the modal) =====
{ fresh('enemy'); const atk=stick('enemy',3,3,{lv:2}); const lv4=stick('player',4,4,{lv:4}), lv2=stick('player',2,2,{lv:2}); const e3=stick('enemy',2,4,{lv:3}), e1=stick('enemy',2,4,{lv:1});
  G.player.hand=[card('GD03-113','player')]; A.resolveAiAttack(atk, ()=>{}, null); drainTasks(); press(/Don't/); press(/Human Karma/);
  const f = !!modal() && /active friendly Unit to rest/.test(modal().msg); pressUnit(lv2);
  const e = !!modal() && /choose an enemy Unit/.test(modal().msg) && modal().btns.length===2;   // Lv.2 reaches the Lv.2 attacker and the Lv.1 Unit, not the Lv.3
  pressUnit(e1); passAll();
  ok('Human Karma in the Action Step: rest your Unit, then choose an enemy whose Lv. is ≤ it', f && e && lv2.rested && e1.hp===1 && e3.hp===4, `f=${f} e=${e}`); }
{ fresh('enemy'); put(master,'player'); const atk=stick('enemy',3,5); const other=stick('enemy',2,5); G.player.hand=[card('GD05-110','player')]; const d0=G.player.deck.length;
  A.resolveAiAttack(atk, ()=>{}, null); drainTasks(); press(/Don't/); press(/Darkness Finger/); const asked=!!modal() && modal().btns.length===2; pressUnit(atk); passAll();
  ok('Darkness Finger in the Action Step: you choose the target, and draw with a Master Gundam', asked && atk.hp<=3 && G.player.deck.length===d0-1, `asked=${asked} hp=${atk.hp}`); }
{ fresh('enemy'); const lv4=stick('enemy',4,4,{lv:4}), lv2=stick('enemy',2,2,{lv:2}); fillTrash('player',10); const sh=card('GD03-114','player'); let done=false;
  A.triggerBurst(sh, G.player, ()=>{ done=true; }, true); drainTasks(); const asked=!!modal() && modal().btns.length===2; pressUnit(lv4); drainTasks();
  ok('Look of Determination as a Burst: 10 cards in your trash → you may destroy the Lv.4 Unit', asked && !G.enemy.field.includes(lv4) && G.enemy.field.includes(lv2) && done, `asked=${asked}`); }
{ fresh('enemy'); put(master,'player'); const e=stick('enemy',2,5), e2=stick('enemy',2,6); const sh=card('GD05-110','player'); const d0=G.player.deck.length;
  A.triggerBurst(sh, G.player, ()=>{}, true); drainTasks(); const asked=!!modal() && modal().btns.length===2; pressUnit(e2); drainTasks();
  ok('Darkness Finger as a Burst: you choose the target; then the Master Gundam draw', asked && e2.hp===4 && e.hp===5 && G.player.deck.length===d0-1, `asked=${asked}`); }
{ fresh('player'); const sh=card('GD03-114','enemy'); const p4=stick('player',4,4,{lv:4}); fillTrash('enemy',10); A.triggerBurst(sh, G.enemy, ()=>{}, true); drainTasks();
  ok('Look of Determination as the AI\'s Burst: destroys your Lv.4 Unit with 10 cards in its trash', !G.player.field.includes(p4)); }

// ===== other Commands the same rules fixed =====
{ fresh('player'); const e1=stick('enemy',2,4), e2=stick('enemy',2,2); stick('player',3,3,{linked:true}); const c=inHand('GD01-122'); play(c);
  const legal=G.mode==='trigger-target' && G.pending.cands.includes(e1.uid); A.fieldClick(e1.uid); drainTasks();
  ok('Covert Operative: with a Link Unit the 4-HP enemy can be bounced', legal && G.enemy.hand.includes(e1)); }
{ fresh('enemy'); const p=stick('player',3,3,{lv:7}); for (let i=0;i<4;i++) G.enemy.trash.push(card('GD05-110','enemy')); A.applyCommand(card('ST14-014','enemy'), G.enemy, null);
  ok('Blazing Mobile Suit Rider (AI): 4 Command cards in its trash → any enemy Unit (a Lv.7 one) gets AP-3', A.effAp(p)===0); }
{ fresh('player'); const u=stick('player',2,6); u.hp=3; const c=inHand('GD02-100'); const d0=G.player.deck.length; play(c); drainTasks();
  ok('Dramatic Turnabout: the damaged Unit recovers 2 HP, then draw 1', u.hp===5 && G.player.deck.length===d0-1, `hp=${u.hp}`); }
{ fresh('player'); const c=inHand('ST13-013'); play(c); const asked=!!modal() && /how many/.test(modal().msg); press(/^2/); drainTasks();
  ok("I'm a Newtype: you choose to deploy 1 or 2 Bit / Funnel tokens", asked && G.player.field.filter(u=>u.token).length===2, `asked=${asked}`); }
{ const a=A.makeCard(A.CARD_BY_ID.get('GD05-120'),'player').action;
  ok('Shining Finger keeps its rest + "Shining Gundam" rider', a.kind==='rest' && a.rider && a.rider.kw==='first'); }
{ const u=stick('player',1,1); u.pilotCard={ name:'Domon', srcEffect:A.CARD_BY_ID.get('GD05-110').effect };
  const a=A.pilotActionAction(u); ok('A Command paired as a Pilot gives its whole action (Darkness Finger: damage, then the draw)', a && a.kind==='chain' && a.steps[0].kind==='damage'); }
{ fresh('player'); const u=stick('player',2,6); u.hp=2; A.runTrigger(card('EB01-006','player'), G.player, A.parseTrigger(A.CARD_BY_ID.get('EB01-006').effect,'Deploy'), 'Deploy');
  ok('Gundam Astray Gold Frame Amatsu: its 【Deploy】 grants <Repair 1> (not a full heal)', u.hp===2 && A.effRepair(u)===1); }

console.log(`passed: ${pass} | failed: ${fail.length}`);
for (const f of fail) console.log('  FAIL', f);
console.log(`Errors: ${ERRORS.length}`); for (const e of ERRORS.slice(0,5)) console.log('  ', e.ctx, e.phase, e.msg, e.stack);
