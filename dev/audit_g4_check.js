// Triggered-clause audit (ST / EB01 / GD01-GD03 Units, Pilots and Bases): target restrictions inside triggers ("with the
// highest Lv.", "with <Repair>", "with 1 HP", "Unit token", "with no paired Pilot", "enemy Base"), costs paid with your own
// card ("Choose 1 active friendly Base. Rest it. If you do, …"), "Then, …" riders on the chosen Unit, "If you do, discard 1"
// after a trash pick-up, amounts read at resolution, and the opponent's own choices (Jona Basta, Le Cygne (EX)).
// Each card is played on the player side through the real UI path (modals / trigger-target clicks) and on the AI side.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra!==undefined?'  ('+extra+')':'')); }
let UID=870000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML=''; G.modalQueue=[];
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'G4',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-005'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-005'), s.who)); }
}
const sideOf=who=>who==='player'?G.player:G.enemy;
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); sideOf(who).field.push(u); return u; };
const pair=(u, id)=>{ const p=card(id, u.owner); A.attachPilot(u, p); drainTasks(); return p; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); sideOf(who).field.push(c); return c;
}
const modal=()=>el('blockModal').classList.contains('show') ? { msg:(el('blockMsg').innerHTML||'').replace(/<[^>]+>/g,''), btns:[...el('blockBtns').children].map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'')) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const passAll=()=>{ let g=0; while (modal() && g++<6){ const m=modal(); if (/intercept|Blocker/i.test(m.msg)) { if(!press(/Don't|No/)) break; } else if (!press(/Pass/)) break; } };
// The "choose a card" overlay (showLookAtTop): its cards and the optional "Take none" button.
function look(){ const m=(doc.body.children||[]).filter(n=>String(n.className||'').includes('modal-overlay')).pop(); if(!m) return null;
  const box=m.children[0], row=box.children[0], sk=box.children[1];
  return { title:(box._h||'').replace(/<[^>]+>/g,''), n: row.children.length, pick:(i)=>{ row.children[i].onclick(); drainTasks(); }, names: row.children.map(c=>c.textContent||''), skip: sk ? ()=>{ sk.onclick(); drainTasks(); } : null }; }
function discardFirst(pred){ // what the hand-card click does in discard mode (bind())
  const c=G.player.hand.find(pred||(()=>true)); G.player.hand.splice(G.player.hand.indexOf(c),1); A.sendToTrash(c, G.player); G.pending.discardLeft--;
  if (G.pending.discardLeft<=0){ const af=G.pending.after; G.mode='idle'; G.pending=null; if (af) af(); } drainTasks(); return c; }
const deploy=(id)=>{ const c=card(id,'player'); G.player.hand.push(c); A.playFromHand(c.uid); drainTasks(); return c; };
const aiDeploy=(id, extra)=>{ const u=put(id,'enemy',extra); A.runTrigger(u, G.enemy, A.parseTrigger(u.effect,'Deploy'), 'Deploy'); drainTasks(); return u; };
const cands=()=>(G.mode==='trigger-target' && G.pending) ? G.pending.cands : [];
const PILOT='GD03-099';   // a Pilot with no effect outside 【During Link】 — pairs without linking

// ===== Ξ Gundam ST08-001 — 【When Paired】Choose 1 enemy Unit with the highest Lv. Deal 3 damage to it. =====
{ fresh('player'); const x=put('ST08-001','player'); const lo=stick('enemy',2,3,{lv:2}), hi=stick('enemy',6,6,{lv:6}); pair(x, PILOT);
  ok('Ξ Gundam (you): only the highest-Lv. enemy Unit can be chosen', cands().length===1 && cands()[0]===hi.uid, JSON.stringify(cands()));
  A.fieldClick(hi.uid); drainTasks(); ok('Ξ Gundam (you): 3 damage to it', hi.hp===3 && lo.hp===3); }
{ fresh('enemy'); const x=put('ST08-001','enemy'); const lo=stick('player',2,3,{lv:2}), hi=stick('player',6,6,{lv:6}); pair(x, PILOT);
  ok('Ξ Gundam (AI): hits the highest-Lv. Unit, not the killable Lv.2', hi.hp===3 && lo.hp===3, `${lo.hp}/${hi.hp}`); }
{ fresh('enemy'); const x=put('GD06-038','enemy'); const lo=stick('player',2,3,{lv:2}), hi=stick('player',6,6,{lv:5}); pair(x, PILOT);
  ok('Gundam Kimaris Vidar (same wording): the highest-Lv. Unit', hi.hp===3 && lo.hp===3, `${lo.hp}/${hi.hp}`); }

// ===== Penelope ST08-006 — 【During Pair】【Attack】【Once per Turn】If attacking the enemy player, reveal 1 (EF) Unit card from your hand.
// Return it to the bottom of your deck. If you do, draw 2. =====
{ fresh('enemy'); const p=put('ST08-006','enemy'); pair(p, PILOT); const ef=card('ST01-003','enemy'), other=card('GD02-080','enemy'); G.enemy.hand=[ef, other];
  G.aiForceFace=true; A.resolveAiAttack(p, ()=>{}, null); drainTasks(); passAll(); G.aiForceFace=false;
  ok('Penelope (AI): the (Earth Federation) Unit card goes to the bottom of its deck, then it draws 2', G.enemy.deck[0]===ef && !G.enemy.hand.includes(ef) && G.enemy.hand.length===3, `hand ${G.enemy.hand.length}`); }
{ fresh('enemy'); const p=put('ST08-006','enemy'); pair(p, PILOT); G.enemy.hand=[card('GD02-080','enemy')];
  G.aiForceFace=true; A.resolveAiAttack(p, ()=>{}, null); drainTasks(); passAll(); G.aiForceFace=false;
  ok('Penelope (AI): no (Earth Federation) Unit card in hand — no draw', G.enemy.hand.length===1, `hand ${G.enemy.hand.length}`); }
{ fresh('player'); const p=put('ST08-006','player'); pair(p, PILOT); const e1=card('ST01-003','player'), e2=card('GD01-018','player'), z=card('GD02-080','player'); G.player.hand=[e1,e2,z];
  A.fieldClick(p.uid); drainTasks(); A.attackDirect(); drainTasks(); const L=look();
  ok('Penelope (you): you choose which (Earth Federation) Unit card to reveal', !!L && L.n===2, L&&L.n);
  if (L) L.pick(1); passAll();
  ok('Penelope (you): the chosen card is at the bottom of your deck and you drew 2', G.player.deck[0]===e2 && G.player.hand.includes(e1) && G.player.hand.length===4, `hand ${G.player.hand.length}`); }
{ fresh('player'); const p=put('ST08-006','player'); pair(p, PILOT); G.player.hand=[card('ST01-003','player')]; const foe=stick('enemy',1,9,{rested:true});
  A.fieldClick(p.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); passAll();
  ok('Penelope: attacking a Unit — nothing is revealed, no draw', G.player.hand.length===1 && !look()); }

// ===== Zeta Gundam Ⅲ P2 Type EB01-005 — 【Deploy】Choose 1 rested Unit belonging to another player. Set it as active. Draw 1. =====
{ fresh('enemy'); const a=stick('player',5,5,{rested:true}), b=stick('player',1,1,{rested:true}); const h=G.enemy.hand.length; aiDeploy('EB01-005');
  ok('Zeta Ⅲ (AI): one of your rested Units is set active (the weaker), and it draws 1', !b.rested && a.rested && G.enemy.hand.length===h+1, `a ${a.rested} b ${b.rested} hand ${G.enemy.hand.length}`); }
{ fresh('player'); const a=stick('enemy',5,5,{rested:true}), b=stick('enemy',1,1,{rested:true}); deploy('EB01-005'); const m=modal();
  ok('Zeta Ⅲ (you): you choose the rested enemy Unit', !!m && m.btns.length===2, m&&m.msg); press(/Dummy 5/);
  ok('Zeta Ⅲ (you): it is set active and you draw 1', !a.rested && b.rested && G.player.hand.length===1, `hand ${G.player.hand.length}`); }
{ fresh('player'); const a=stick('enemy',5,5); deploy('EB01-005');
  ok('Zeta Ⅲ: no rested Unit — still draws 1', !modal() && G.player.hand.length===1); }

// ===== Gundam Astray Gold Frame Amatsu EB01-006 — 【Deploy】Choose 1 of your Units. It gains <Repair 1> during this turn. =====
{ fresh('player'); const d=stick('player',3,5,{hp:2}), o=stick('player',4,4); deploy('EB01-006'); const m=modal();
  ok('Amatsu (you): you choose 1 of your Units', !!m && m.btns.length===3, m&&m.btns.join(',')); press(/Dummy 3/);
  ok('Amatsu (you): it gains <Repair 1> — no HP is recovered yet', A.effRepair(d)===1 && d.hp===2 && A.effRepair(o)===0, `repair ${A.effRepair(d)} hp ${d.hp}`);
  A.finishEndPhase(); ok('Amatsu: it recovers 1 HP at the end of your turn, and the grant ends', d.hp===3 && A.effRepair(d)===0, `hp ${d.hp} repair ${A.effRepair(d)}`); }
{ fresh('enemy'); const d=stick('enemy',3,5,{hp:1}), o=stick('enemy',6,6); const am=aiDeploy('EB01-006');
  ok('Amatsu (AI): <Repair 1> goes to its damaged Unit', A.effRepair(d)===1 && A.effRepair(o)===0 && d.hp===1); }

// ===== Justice Gundam (EX) EB01-044 — 【Deploy】If there are 2 or more enemy players, … Return it to its owner's hand. =====
{ fresh('enemy'); const u=stick('player',3,3); aiDeploy('EB01-044');
  ok('Justice (EX) (AI): one enemy player — nothing is returned', G.player.field.includes(u)); }
{ fresh('player'); const u=stick('enemy',3,3); deploy('EB01-044');
  ok('Justice (EX) (you): one enemy player — no target prompt, nothing returned', G.mode==='idle' && G.enemy.field.includes(u)); }

// ===== Psycho Zaku (EX) EB01-045 — 【When Paired】Choose 1 enemy Unit with <Repair>. Return it to its owner's hand. =====
{ fresh('enemy'); const z=put('EB01-045','enemy'); const r=stick('player',1,1,{repair:1}), n=stick('player',5,5); pair(z, PILOT);
  ok('Psycho Zaku (EX) (AI): returns the Unit with <Repair>', !G.player.field.includes(r) && G.player.field.includes(n)); }
{ fresh('enemy'); const z=put('EB01-045','enemy'); const n=stick('player',5,5); pair(z, PILOT);
  ok('Psycho Zaku (EX) (AI): no enemy Unit with <Repair> — nothing returned', G.player.field.includes(n)); }
{ fresh('player'); const z=put('EB01-045','player'); const r=put('GD03-012','enemy'), n=stick('enemy',5,5); pair(z, PILOT);
  ok('Psycho Zaku (EX) (you): only a Unit with <Repair> is offered', cands().length===1 && cands()[0]===r.uid, JSON.stringify(cands()));
  A.fieldClick(r.uid); drainTasks(); ok('Psycho Zaku (EX) (you): it returns to hand', !G.enemy.field.includes(r) && G.enemy.hand.includes(r)); }

// ===== Gundam Geminass 02 EB01-057 — 【Deploy】You may choose 1 active friendly Unit that is Lv.3. Rest it. If you do, choose 1 enemy
// Unit that is Lv.2 or lower. Return it to its owner's hand. =====
{ fresh('enemy'); const l3=stick('enemy',2,2,{lv:3}), l4=stick('enemy',2,2,{lv:4}); const f=stick('player',3,3,{lv:2}); aiDeploy('EB01-057');
  ok('Geminass 02 (AI): rests its Lv.3 Unit and returns your Lv.2 Unit', l3.rested && !l4.rested && !G.player.field.includes(f)); }
{ fresh('enemy'); stick('enemy',2,2,{lv:4}); const f=stick('player',3,3,{lv:2}); aiDeploy('EB01-057');
  ok('Geminass 02 (AI): no Lv.3 Unit to rest — nothing is returned', G.player.field.includes(f)); }
{ fresh('enemy'); const l3=stick('enemy',2,2,{lv:3}); const f=stick('player',3,3,{lv:5}); aiDeploy('EB01-057');
  ok('Geminass 02 (AI): nothing Lv.2 or lower to return — it keeps its Unit active', !l3.rested && G.player.field.includes(f)); }
{ fresh('player'); const l3=stick('player',2,2,{lv:3}); stick('player',2,2,{lv:4}); const f=stick('enemy',3,3,{lv:2}), big=stick('enemy',3,3,{lv:5}); deploy('EB01-057'); const m=modal();
  ok("Geminass 02 (you): optional — only the Lv.3 Unit is offered, with a Don't button", !!m && m.btns.length===2 && /Don't rest/.test(m.btns[1]), m&&m.btns.join(','));
  press(/Dummy 2/); ok('Geminass 02 (you): after resting it you pick the Lv.2-or-lower enemy Unit', l3.rested && cands().length===1 && cands()[0]===f.uid);
  A.fieldClick(f.uid); drainTasks(); ok('Geminass 02 (you): it returns to hand', !G.enemy.field.includes(f) && G.enemy.field.includes(big)); }
{ fresh('player'); const l3=stick('player',2,2,{lv:3}); const f=stick('enemy',3,3,{lv:2}); deploy('EB01-057'); press(/Don't rest/);
  ok('Geminass 02 (you): declining — nothing rested, nothing returned', !l3.rested && G.enemy.field.includes(f) && G.mode==='idle'); }

// ===== Jona Basta EB01-062 — 【Attack】【Once per Turn】Choose 1 enemy player. They may draw 1. If they draw with this effect, draw 1. =====
{ fresh('enemy'); const u=put('GD02-080','enemy'); pair(u, 'EB01-062'); const mine=stick('player',1,1,{rested:true}); const hp=G.player.hand.length, he=G.enemy.hand.length;
  A.resolveAiAttack(u, ()=>{}, mine); drainTasks(); const m=modal();
  ok('Jona Basta (AI attacks): you are asked whether to draw', !!m && /you may draw 1/.test(m.msg) && m.btns.some(b=>/Draw 1/.test(b)), m&&m.msg);
  press(/^Draw 1/); passAll(); ok('Jona Basta: you draw 1, so the AI draws 1', G.player.hand.length===hp+1 && G.enemy.hand.length===he+1, `${G.player.hand.length}/${G.enemy.hand.length}`); }
{ fresh('enemy'); const u=put('GD02-080','enemy'); pair(u, 'EB01-062'); const mine=stick('player',1,1,{rested:true}); const hp=G.player.hand.length, he=G.enemy.hand.length;
  A.resolveAiAttack(u, ()=>{}, mine); drainTasks(); press(/Don't draw/); passAll();
  ok("Jona Basta: you decline — nobody draws", G.player.hand.length===hp && G.enemy.hand.length===he); }
{ fresh('player'); const u=put('GD02-080','player'); pair(u, 'EB01-062'); const foe=stick('enemy',1,9,{rested:true}); const hp=G.player.hand.length, he=G.enemy.hand.length;
  A.fieldClick(u.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); passAll();
  ok('Jona Basta (you attack): the AI chooses to draw, and then you draw 1', G.enemy.hand.length===he+1 && G.player.hand.length===hp+1, `${G.player.hand.length}/${G.enemy.hand.length}`); }

// ===== Beside Pain EB01-069 — 【Attack】Choose 1 friendly Unit with <Blocker>. It gets AP+2 during this turn. =====
{ fresh('enemy'); const atk=put('GD02-080','enemy'); pair(atk, 'EB01-069'); const bl=stick('enemy',1,1,{blocker:true}), nb=stick('enemy',5,5); const mine=stick('player',1,9,{rested:true});
  A.resolveAiAttack(atk, ()=>{}, mine); drainTasks(); passAll();
  ok('Beside Pain (AI): the Unit with <Blocker> gets AP+2', A.effAp(bl)===3 && A.effAp(nb)===5, `${A.effAp(bl)}/${A.effAp(nb)}`); }
{ fresh('enemy'); const atk=put('GD02-080','enemy'); pair(atk, 'EB01-069'); const ap0=A.effAp(atk); const mine=stick('player',1,9,{rested:true});
  A.resolveAiAttack(atk, ()=>{}, mine); drainTasks(); passAll();
  ok('Beside Pain (AI): no Unit with <Blocker> — nobody gets AP+2', A.effAp(atk)===ap0, `${ap0}->${A.effAp(atk)}`); }
{ fresh('player'); const atk=put('GD02-080','player'); pair(atk, 'EB01-069'); const b1=stick('player',1,1,{blocker:true}), b2=stick('player',2,2,{blocker:true}); stick('player',5,5); const foe=stick('enemy',1,9,{rested:true});
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); const m=modal();
  ok('Beside Pain (you): only Units with <Blocker> are offered', !!m && m.btns.length===2 && m.btns.every(b=>/Dummy [12]\//.test(b)), m&&m.btns.join(','));
  press(/Dummy 1\//); passAll(); ok('Beside Pain (you): the chosen one gets AP+2', A.effAp(b1)===3 && A.effAp(b2)===2); }

// ===== Lacus Clyne & Eternal EB01-089 — 【Deploy】Add 1 of your Shields to your hand. Then, choose 1 rested friendly white (G Generation)
// Unit. Set it as active. It can't attack during this turn. =====
{ fresh('enemy'); const gg=put('EB01-053','enemy',{rested:true}), blue=stick('enemy',7,7,{rested:true}); const b=card('EB01-089','enemy'); G.enemy.base=b;
  A.runTrigger(b, G.enemy, A.parseTrigger(b.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Lacus & Eternal (AI): the white (G Generation) Unit is set active, the other stays rested', !gg.rested && blue.rested && G.enemy.shields.length===5);
  ok("Lacus & Eternal (AI): it can't attack this turn", A.trashBlocksAttack(gg, G.enemy)); }
{ fresh('player'); const g1=put('EB01-053','player',{rested:true}), g2=put('EB01-051','player',{rested:true}); stick('player',7,7,{rested:true,color:'White'});
  deploy('EB01-089'); const m=modal();
  ok('Lacus & Eternal (you): you choose among your rested white (G Generation) Units', !!m && m.btns.length===2, m&&m.btns.join(','));
  press(new RegExp(g1.name.slice(0,6))); ok("Lacus & Eternal (you): it is set active but can't attack", !g1.rested && g2.rested && A.trashBlocksAttack(g1, G.player)); }

// ===== Gundam Epyon ST12-001 — 【Deploy】Choose 1 enemy Base. Deal 5 damage to it. =====
{ fresh('enemy'); G.player.base=card('EB01-089','player'); const u=stick('player',3,5); aiDeploy('ST12-001');
  ok('Epyon (AI): 5 damage destroys your 5-HP Base; your Unit is untouched', !G.player.base && u.hp===5); }
{ fresh('player'); G.enemy.base=A.exBaseToken('enemy'); const u=stick('enemy',3,5); deploy('ST12-001');
  ok('Epyon (you): the enemy EX Base is destroyed, no Unit is offered', !G.enemy.base && u.hp===5 && G.mode==='idle'); }
{ fresh('player'); const u=stick('enemy',3,5); deploy('ST12-001');
  ok('Epyon: no enemy Base — nothing is damaged', u.hp===5 && G.mode==='idle'); }

// ===== Unicorn Gundam 02 Banshee (Unicorn Mode) ST12-009 — 【Destroyed】If there is a player with 3 or less Shields, choose 1 Unit card
// that is Lv.6 or higher from your trash. Add it to your hand. If you do, discard 1. =====
{ fresh('player'); const bn=put('ST12-009','enemy'); G.enemy.shields.length=3; const big=card('GD03-010','enemy'); G.enemy.trash.push(big); G.enemy.hand=[card('ST01-005','enemy'), card('GD01-018','enemy')];
  A.applyToTarget(stick('player',1,1), G.player, {kind:'damage', amount:9}, bn, 'T'); drainTasks();
  ok('Banshee (AI): takes the Lv.6+ Unit card, then discards 1', G.enemy.hand.includes(big) && G.enemy.hand.length===2, `hand ${G.enemy.hand.length}`); }
{ fresh('enemy'); const bn=put('ST12-009','player'); G.player.shields.length=2; const b1=card('GD03-010','player'), b2=card('GD02-027','player'); G.player.trash.push(b1, b2); G.player.hand=[card('ST01-005','player')];
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:9}, bn, 'T'); drainTasks(); const L=look();
  ok('Banshee (you): you choose which Lv.6+ Unit card to take', !!L && L.n===2 && !L.skip, L&&L.n); if (L) L.pick(1);
  ok('Banshee (you): then you choose 1 card to discard', G.mode==='discard' && G.player.hand.includes(b2));
  if (G.mode==='discard') discardFirst(c=>c.def==='ST01-005'); ok('Banshee (you): hand is back to 1 card — the one you took', G.player.hand.length===1 && G.player.hand[0]===b2); }
{ fresh('player'); const bn=put('ST12-009','enemy'); const big=card('GD03-010','enemy'); G.enemy.trash.push(big); G.enemy.hand=[card('ST01-005','enemy')];
  A.applyToTarget(stick('player',1,1), G.player, {kind:'damage', amount:9}, bn, 'T'); drainTasks();
  ok('Banshee: 6 Shields each — no pick-up, no discard', !G.enemy.hand.includes(big) && G.enemy.hand.length===1); }

// ===== G-Falcon DX ST14-005 — 【Deploy】Choose 1 enemy Unit that is Lv.6 or lower. Rest it. Then, if there are 7 or more cards in your
// trash, it gets AP-2 during this turn. =====
const fillTrash=(s,n)=>{ for(let i=0;i<n;i++) s.trash.push(card('ST01-005', s.who)); };
{ fresh('enemy'); fillTrash(G.enemy, 8); const u=stick('player',5,5,{lv:5}); aiDeploy('ST14-005');
  ok('G-Falcon DX (AI, 8 in trash): rested and AP-2 this turn', u.rested && A.effAp(u)===3, `${u.rested} ${A.effAp(u)}`); }
{ fresh('enemy'); fillTrash(G.enemy, 6); const u=stick('player',5,5,{lv:5}); aiDeploy('ST14-005');
  ok('G-Falcon DX (AI, 6 in trash): rested only', u.rested && A.effAp(u)===5); }
{ fresh('player'); fillTrash(G.player, 7); const u=stick('enemy',5,5,{lv:5}), hi=stick('enemy',5,5,{lv:7}); deploy('ST14-005');
  ok('G-Falcon DX (you): only the Lv.6-or-lower Unit is offered', cands().length===1 && cands()[0]===u.uid); A.fieldClick(u.uid); drainTasks();
  ok('G-Falcon DX (you, 7 in trash): rested and AP-2', u.rested && A.effAp(u)===3 && !hi.rested);
  A.finishEndPhase(); ok('G-Falcon DX: the AP-2 ends with the turn', A.effAp(u)===5); }

// ===== Perfect Strike Gundam GD01-068 / Darilbalde GD01-075 — 【Deploy】Choose 1 enemy Unit with 1 HP. Return it to its owner's hand. =====
for (const id of ['GD01-068','GD01-075']){ const nm=A.CARD_BY_ID.get(id).name;
  { fresh('enemy'); const one=stick('player',1,3,{hp:1}), four=stick('player',4,4); aiDeploy(id);
    ok(`${nm} (AI): returns the Unit with 1 HP`, !G.player.field.includes(one) && G.player.field.includes(four)); }
  { fresh('enemy'); const four=stick('player',4,4); aiDeploy(id); ok(`${nm} (AI): no 1-HP Unit — nothing returned`, G.player.field.includes(four)); }
  { fresh('player'); const one=stick('enemy',1,3,{hp:1}), four=stick('enemy',4,4); deploy(id);
    ok(`${nm} (you): only the 1-HP Unit is offered`, cands().length===1 && cands()[0]===one.uid); A.fieldClick(one.uid); drainTasks();
    ok(`${nm} (you): it returns to hand`, !G.enemy.field.includes(one) && G.enemy.field.includes(four)); } }

// ===== Gundam Deathscythe GD01-025 — 【When Paired･(Operation Meteor) Pilot】Place 1 rested Resource. Then, this Unit gains <First Strike>
// during this turn. =====
{ fresh('enemy'); const d=put('GD01-025','enemy'); const r0=G.enemy.resMax; pair(d, 'ST02-010');
  ok('Deathscythe (AI): a rested Resource, then <First Strike>', G.enemy.resMax===r0+1 && A.effFirstStrike(d)); }
{ fresh('player'); G.player.resourceDeck=0; const d=put('GD01-025','player'); const r0=G.player.resMax; pair(d, 'ST02-010');
  ok('Deathscythe (you, no Resource left): still gains <First Strike>', G.player.resMax===r0 && A.effFirstStrike(d)); A.finishEndPhase();
  ok('Deathscythe: <First Strike> ends with the turn', !A.effFirstStrike(d)); }
{ fresh('player'); const d=put('GD01-025','player'); pair(d, PILOT); ok('Deathscythe: a non-(Operation Meteor) Pilot — no <First Strike>', !A.effFirstStrike(d)); }

// ===== Sayla's Light-Type Guncannon GD02-046 — 【Deploy】Choose 1 enemy Unit token. Deal 2 damage to it. =====
{ fresh('enemy'); const real=stick('player',4,4); aiDeploy('GD02-046'); ok('Light-Type Guncannon (AI): a non-token Unit takes no damage', real.hp===4); }
{ fresh('enemy'); const real=stick('player',4,4), tk=stick('player',2,3,{token:true}); aiDeploy('GD02-046'); ok('Light-Type Guncannon (AI): the token takes 2', tk.hp===1 && real.hp===4); }
{ fresh('player'); const real=stick('enemy',4,4), tk=stick('enemy',2,3,{token:true}); deploy('GD02-046');
  ok('Light-Type Guncannon (you): only the token is offered', cands().length===1 && cands()[0]===tk.uid); A.fieldClick(tk.uid); drainTasks(); ok('Light-Type Guncannon (you): 2 damage to it', tk.hp===1); }

// ===== Rick Dias (Red) GD02-075 — 【Attack】Choose 1 active friendly Base. Rest it. If you do, choose 1 enemy Unit that is Lv.4 or lower.
// It gets AP-2 during this battle. =====
{ fresh('enemy'); const rd=put('GD02-075','enemy'); G.enemy.base=A.exBaseToken('enemy'); const mine=stick('player',4,9,{lv:4,rested:true});
  A.resolveAiAttack(rd, ()=>{}, mine); drainTasks(); passAll();
  ok('Rick Dias (Red) (AI): rests its Base; your Lv.4 Unit hits back with AP 2, so it survives', G.enemy.base.rested && rd.hp===1 && G.enemy.field.includes(rd), `base ${G.enemy.base.rested} rd hp ${rd.hp}`);
  ok('Rick Dias (Red): the AP-2 ends with the battle', A.effAp(mine)===4); }
{ fresh('enemy'); const rd=put('GD02-075','enemy'); const mine=stick('player',4,9,{lv:4,rested:true});
  A.resolveAiAttack(rd, ()=>{}, mine); drainTasks(); passAll();
  ok('Rick Dias (Red) (AI): no Base to rest — no AP-2 (your Unit hits back for 4)', !G.enemy.field.includes(rd), `rd hp ${rd.hp}`); }
{ fresh('player'); const rd=put('GD02-075','player'); G.player.base=card('EB01-089','player'); const foe=stick('enemy',4,9,{lv:4,rested:true}), hi=stick('enemy',4,9,{lv:5});
  A.fieldClick(rd.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks();
  ok('Rick Dias (Red) (you): your Base is rested, then you pick a Lv.4-or-lower enemy Unit', G.player.base.rested && cands().length===1 && cands()[0]===foe.uid, JSON.stringify(cands()));
  A.fieldClick(foe.uid); drainTasks(); passAll();
  ok('Rick Dias (Red) (you): it fights with AP-2 (hits back for 2), and that ends with the battle', rd.hp===3-2 && A.effAp(foe)===4, `rd hp ${rd.hp}`); }

// Rick Dias (GD03-079): "When you rest your Base with one of your Units' effects, you may rest this Unit instead."
{ fresh('player'); const rd=put('GD02-075','player'); G.player.base=card('EB01-089','player'); const sub=put('GD03-079','player'); const foe=stick('enemy',4,9,{lv:4,rested:true});
  A.fieldClick(rd.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); const m=modal();
  ok('Rick Dias (Red) (you): you may rest GD03-079 instead of your Base', !!m && m.btns.length===2 && m.btns.some(b=>b.includes(sub.name)), m&&m.btns.join(','));
  press(new RegExp(sub.name.replace(/[()]/g,'.').slice(0,8))); ok('Rick Dias (Red) (you): the Unit is rested, the Base stays active, the payoff follows', sub.rested && !G.player.base.rested && cands().length===1);
  A.fieldClick(foe.uid); drainTasks(); passAll(); }

// ===== Red Gundam GD03-039 — 【Deploy】Choose 1 other active friendly (Clan) Unit. Rest it. If you do, choose 1 enemy Unit with 2 or less AP.
// Deal 2 damage to it. =====
{ fresh('enemy'); const c=stick('enemy',2,2,{trait:'(Clan)'}); const e=stick('player',2,4); aiDeploy('GD03-039');
  ok('Red Gundam (AI): rests its (Clan) Unit and deals 2 to your 2-AP Unit', c.rested && e.hp===2); }
{ fresh('enemy'); stick('enemy',2,2); const e=stick('player',2,4); aiDeploy('GD03-039');
  ok('Red Gundam (AI): no other (Clan) Unit — no damage', e.hp===4); }
{ fresh('player'); const c1=stick('player',2,2,{trait:'(Clan)'}), c2=stick('player',3,3,{trait:'(Clan)'}); stick('player',1,1,{trait:'(Clan)',rested:true}); const e=stick('enemy',2,4), big=stick('enemy',5,5);
  deploy('GD03-039'); const m=modal();
  ok("Red Gundam (you): you choose which active (Clan) Unit to rest — not optional, not Red Gundam itself", !!m && m.btns.length===2 && !m.btns.some(b=>/Red Gundam|Don't/.test(b)), m&&m.btns.join(','));
  press(/Dummy 3/); ok('Red Gundam (you): then the 2-or-less-AP enemy Unit', c2.rested && !c1.rested && cands().length===1 && cands()[0]===e.uid);
  A.fieldClick(e.uid); drainTasks(); ok('Red Gundam (you): 2 damage', e.hp===2 && big.hp===5); }

// ===== Defurse GD03-064 — 【Deploy】You may choose 1 (X-Rounder) card from your trash and add it to your hand. If you do, discard 1. =====
{ fresh('enemy'); const x=card('GD03-094','enemy'); G.enemy.trash.push(x); G.enemy.hand=[card('ST01-005','enemy'), card('GD01-018','enemy')]; G.enemy.hand[0].baseAp=0; G.enemy.hand[0].baseHp=1;
  aiDeploy('GD03-064'); ok('Defurse (AI): takes the (X-Rounder) card and discards its weakest card', G.enemy.hand.includes(x) && G.enemy.hand.length===2, `hand ${G.enemy.hand.length}`); }
{ fresh('player'); const x=card('GD03-094','player'); G.player.trash.push(x); G.player.hand=[card('ST01-005','player')]; deploy('GD03-064'); const L=look();
  ok('Defurse (you): optional even with one candidate — "Take none" is offered', !!L && L.n===1 && !!L.skip); if (L) L.pick(0);
  ok('Defurse (you): then you discard 1', G.mode==='discard' && G.player.hand.includes(x)); if (G.mode==='discard') discardFirst(c=>c.def==='ST01-005');
  ok('Defurse (you): the (X-Rounder) card stays in hand', G.player.hand.length===1 && G.player.hand[0]===x); }
{ fresh('player'); const x=card('GD03-094','player'); G.player.trash.push(x); G.player.hand=[card('ST01-005','player')]; deploy('GD03-064'); const L=look(); if (L && L.skip) L.skip();
  ok('Defurse (you): declining — no card taken, no discard', G.player.hand.length===1 && G.player.trash.includes(x) && G.mode==='idle'); }

// ===== Super Gundam GD03-075 — 【During Link】【Attack】Choose 1 enemy Unit with no paired Pilot. It gets AP-2 during this turn. =====
{ fresh('enemy'); const sg=put('GD03-075','enemy',{linked:true}); const pd=stick('player',5,9,{rested:true}); pd.pilot={name:'P',pAp:0,pHp:0}; pd.pilotCard=card(PILOT,'player');
  A.resolveAiAttack(sg, ()=>{}, pd); drainTasks(); const apIn=A.effAp(pd); passAll();
  ok('Super Gundam (AI): your only Unit has a Pilot — no AP-2', apIn===5, apIn); }
{ fresh('player'); const sg=put('GD03-075','player',{linked:true}); const pd=stick('enemy',5,9,{rested:true}); pd.pilot={name:'P',pAp:0,pHp:0}; pd.pilotCard=card(PILOT,'enemy'); const un=stick('enemy',3,3);
  A.fieldClick(sg.uid); drainTasks(); A.fieldClick(pd.uid); drainTasks();
  ok('Super Gundam (you): only the Unit with no paired Pilot is offered', cands().length===1 && cands()[0]===un.uid, JSON.stringify(cands()));
  A.fieldClick(un.uid); drainTasks(); passAll(); ok('Super Gundam (you): it gets AP-2', A.effAp(un)===1); }

// ===== Paptimus Scirocco GD03-084 — 【When Linked】Choose 1 of your other Units. It gains <Repair 2> during this turn. Then, if it is a
// (Jupitris) Unit, draw 1. =====
{ fresh('enemy'); const theo=put('GD03-002','enemy'); const o=stick('enemy',4,4,{hp:2}); const h=G.enemy.hand.length; pair(theo, 'GD03-084');
  ok('Scirocco (AI): the OTHER Unit gains <Repair 2>; not (Jupitris) — no draw', A.effRepair(o)===2 && A.effRepair(theo)===3 && G.enemy.hand.length===h, `${A.effRepair(o)} ${A.effRepair(theo)} hand ${G.enemy.hand.length}`); }
{ fresh('enemy'); const theo=put('GD03-002','enemy'); const j=put('GD03-012','enemy'); const h=G.enemy.hand.length; pair(theo, 'GD03-084');
  ok('Scirocco (AI): a (Jupitris) Unit gains it — draw 1', A.effRepair(j)===1+2 && G.enemy.hand.length===h+1); }
{ fresh('enemy'); const theo=put('GD03-002','enemy'); const h=G.enemy.hand.length; pair(theo, 'GD03-084');
  ok('Scirocco (AI): no other Unit — nothing gains it, no draw', A.effRepair(theo)===3 && G.enemy.hand.length===h); }
{ fresh('player'); const theo=put('GD03-002','player'); const j=put('GD03-012','player'), o=stick('player',4,4); pair(theo, 'GD03-084'); const m=modal();
  ok('Scirocco (you): you choose 1 of your OTHER Units (not the linked The-O)', !!m && m.btns.length===2 && !m.btns.some(b=>b.includes(theo.name)), m&&m.btns.join(','));
  press(new RegExp(j.name.slice(0,5))); ok('Scirocco (you): (Jupitris) Unit chosen — <Repair 2> and you draw 1', A.effRepair(j)===3 && G.player.hand.length===1, `${A.effRepair(j)} hand ${G.player.hand.length}`); }

// ===== Le Cygne (EX) EB01-023 — 【Attack】All players each look at the top card of their deck. If Lv.5 or higher, they may reveal it and add
// it to their hand. They return any remaining card to the top or bottom of their deck. =====
{ fresh('player'); const lc=put('EB01-023','player'); const hi=card('GD03-010','player'); G.player.deck.push(hi); const lo=card('ST01-005','enemy'); G.enemy.deck.push(lo); const foe=stick('enemy',1,9,{rested:true});
  A.fieldClick(lc.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); const m=modal();
  ok('Le Cygne (you): you see your top card and choose', !!m && /top card of your deck/.test(m.msg) && m.btns.some(b=>/Reveal/.test(b)) && m.btns.some(b=>/bottom/.test(b)), m&&m.msg);
  press(/Reveal/); passAll(); ok('Le Cygne (you): you added the Lv.6 card; the AI could not add its Lv.2 card', G.player.hand.includes(hi) && G.enemy.deck.includes(lo) && !G.enemy.hand.includes(lo)); }
{ fresh('enemy'); const lc=put('EB01-023','enemy'); const mineTop=card('ST01-005','player'); G.player.deck.push(mineTop); const mine=stick('player',1,9,{rested:true});
  A.resolveAiAttack(lc, ()=>{}, mine); drainTasks(); const m=modal();
  ok("Le Cygne (AI attacks): you decide for your own top card (a Lv.2 card can't be added)", !!m && /top card of your deck/.test(m.msg) && !m.btns.some(b=>/Reveal/.test(b)), m&&m.msg);
  press(/Send to bottom/); passAll(); ok('Le Cygne: your card went to the bottom', G.player.deck[0]===mineTop); }

// ===== Providence Gundam GD03-033 — 【Attack】Choose 1 enemy Unit. Deal 1 damage to it for each 4 AP this Unit has. =====
{ fresh('enemy'); const pv=put('GD03-033','enemy',{tempAp:3}); pv.ap=A.effAp(pv); const mine=stick('player',1,20,{rested:true});
  A.resolveAiAttack(pv, ()=>{}, mine); drainTasks(); passAll();
  ok('Providence (AI, AP 8): 2 effect damage, then 8 battle damage', mine.hp===20-2-8, mine.hp); }
{ fresh('enemy'); const pv=put('GD03-033','enemy',{tempAp:-2}); pv.ap=A.effAp(pv); const mine=stick('player',1,20,{rested:true});
  A.resolveAiAttack(pv, ()=>{}, mine); drainTasks(); passAll();
  ok('Providence (AI, AP 3): no effect damage, 3 battle damage', mine.hp===20-3, mine.hp); }
{ fresh('player'); const pv=put('GD03-033','player',{tempAp:3}); pv.ap=A.effAp(pv); const foe=stick('enemy',1,9,{rested:true}), other=stick('enemy',1,9);
  A.fieldClick(pv.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); ok('Providence (you): you choose the target', cands().length===2);
  A.fieldClick(other.uid); drainTasks(); passAll(); ok('Providence (you, AP 8): 2 damage', other.hp===7, other.hp); }

// ===== Z Gundam (Biosensor) GD03-071 — 【Deploy】Choose 1 enemy Unit. For each (AEUG) Unit card in your trash, it gets AP-1 during this turn. =====
{ fresh('enemy'); for (const id of ['GD02-080','GD02-079','GD06-044']) G.enemy.trash.push(card(id,'enemy')); G.enemy.trash.push(card('GD02-097','enemy')); const u=stick('player',6,6); aiDeploy('GD03-071');
  ok('Z Gundam (Biosensor) (AI): 3 (AEUG) Unit cards in trash — AP-3 (the (AEUG) Pilot card does not count)', A.effAp(u)===3, A.effAp(u)); }
{ fresh('enemy'); const u=stick('player',6,6); aiDeploy('GD03-071'); ok('Z Gundam (Biosensor) (AI): none in trash — no AP lost', A.effAp(u)===6); }
{ fresh('player'); for (const id of ['GD02-080','GD02-079']) G.player.trash.push(card(id,'player')); const u=stick('enemy',6,6); deploy('GD03-071');
  ok('Z Gundam (Biosensor) (you): you choose the target', cands().length===1); A.fieldClick(u.uid); drainTasks(); ok('Z Gundam (Biosensor) (you): AP-2', A.effAp(u)===4); }

// ===== same wordings elsewhere =====
// "Choose 1 enemy Unit with <Blocker> …" (Shenlong Gundam GD01-029 【Attack】) was hitting any Unit.
{ fresh('enemy'); const sh=put('GD01-029','enemy'); const nb=stick('player',2,9,{lv:3,rested:true}), bl=stick('player',1,1,{lv:3,blocker:true});
  A.resolveAiAttack(sh, ()=>{}, nb); drainTasks(); passAll(); ok('Shenlong (AI): destroys the Lv.3 Unit with <Blocker>, not the one it attacks', !G.player.field.includes(bl) && nb.hp>0 && G.player.field.includes(nb)); }
// Orga, Crot, and Shani GD02-087 — 【When Linked】If this is a blue Unit, choose 1 enemy Unit with <Blocker>. Rest it.
for (const color of ['White','Blue']){
  fresh('enemy'); const host=stick('enemy',3,3,{color}); const p=card('GD02-087','enemy'); host.pilotCard=p; host.pilot={name:p.name,pAp:p.pAp,pHp:p.pHp};
  const bl=stick('player',1,1,{blocker:true}), nb=stick('player',5,5);
  A.runTrigger(p, G.enemy, A.parseTrigger(p.effect,'When Linked'), 'Link'); drainTasks();
  ok(`Orga, Crot, and Shani on a ${color.toLowerCase()} Unit: ${color==='Blue'?'rests the enemy Unit with <Blocker>':'nothing is rested'}`, color==='Blue' ? (bl.rested && !nb.rested) : (!bl.rested && !nb.rested)); }
// Haow Gundam GD05-036 — 【When Paired】You may choose 1 of your other active (MF) Units. Rest it. If you do, deal 2 damage to all enemy
// Units whose Lv. is equal to or lower than that Unit.
{ fresh('enemy'); const hw=put('GD05-036','enemy'); const mf=stick('enemy',2,2,{lv:4,trait:'(MF)'}); const lo=stick('player',3,3,{lv:4}), hi=stick('player',3,3,{lv:5}); pair(hw, PILOT);
  ok('Haow Gundam (AI): rests its Lv.4 (MF) Unit; 2 damage to your Lv.4-or-lower Units only', mf.rested && lo.hp===1 && hi.hp===3, `${mf.rested} ${lo.hp} ${hi.hp}`); }
// Calamity Gundam & Raider Gundam GD05-011 — 【Deploy】You may choose 1 of your other active (Earth Alliance) Units. Rest it. If you do, choose 1
// rested enemy Unit. Deal 2 damage to it.
{ fresh('enemy'); const ea=stick('enemy',2,2,{trait:'(Earth Alliance)'}); const act=stick('player',3,3); aiDeploy('GD05-011');
  ok('Calamity & Raider (AI): no rested enemy Unit — it keeps its (Earth Alliance) Unit active', !ea.rested && act.hp===3); }
{ fresh('player'); const ea=stick('player',2,2,{trait:'(Earth Alliance)'}); const r=stick('enemy',3,3,{rested:true}); deploy('GD05-011');
  ok("Calamity & Raider (you): optional rest of your (Earth Alliance) Unit", !!modal() && /Don't rest/.test(modal().btns.join(','))); press(/Dummy 2/);
  A.fieldClick(r.uid); drainTasks(); ok('Calamity & Raider (you): 2 damage to the rested enemy Unit', ea.rested && r.hp===1); }
// Gundam Barbatos Lupus GD05-059 — 【Attack】Choose 1 of your active (Gjallarhorn) Units. Rest it. If you do, draw 1. This Unit gains <High-Maneuver>.
{ fresh('enemy'); const lp=put('GD05-059','enemy'); const gj=stick('enemy',1,1,{trait:'(Gjallarhorn)'}); const mine=stick('player',1,9,{rested:true}); const h=G.enemy.hand.length;
  A.resolveAiAttack(lp, ()=>{}, mine); drainTasks(); passAll();
  ok('Barbatos Lupus (AI): rests its (Gjallarhorn) Unit, draws 1, and gains <High-Maneuver>', gj.rested && G.enemy.hand.length===h+1 && A.effHighManeuver(lp)); }
// Yuu Kajima EB01-072 — 【When Paired】Choose 1 active friendly Unit with <Blocker> and 1 enemy Unit that is Lv.4 or lower. Rest them.
{ fresh('enemy'); const u=put('GD02-080','enemy'); const bl=stick('enemy',1,1,{blocker:true}); const e=stick('player',3,3,{lv:3}); pair(u, 'EB01-072');
  ok('Yuu Kajima (AI): rests its Unit with <Blocker> (not the paired one) and your Unit', bl.rested && !u.rested && e.rested); }
// Zssa (Sleeves) GD04-043 — 【Deploy】Choose 1 enemy Base. Deal 1 damage to it.
{ fresh('enemy'); G.player.base=card('EB01-089','player'); const u=stick('player',3,5); aiDeploy('GD04-043');
  ok('Zssa (Sleeves): 1 damage to your Base, not your Unit', G.player.base.hp===4 && u.hp===5); }

console.log('== g4 triggered-clause audit (ST / EB01 / GD01-GD03) ==');
console.log(`passed: ${pass} | failed: ${fail.length}`); for (const f of fail) console.log('  FAIL '+f);
console.log('Errors: '+(H.ERRORS.length+fail.length)); for (const e of H.ERRORS.slice(0,5)) console.log('  ERR', e.ctx, e.phase, e.msg, e.stack);
