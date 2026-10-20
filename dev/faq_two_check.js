// Official Q&A checks (round 4, group "two"): two-target effects ("Choose 1 of your … Units and 1 enemy Unit"), the optional
// Development exile with no target for its ■ effect, and Destined Battle's forced attack target.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra!==undefined?'  ('+extra+')':'')); }
let UID=990000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,endActionStep:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who)); }
  el('log').children.length=0;
}
const side=w=>w==='player'?G.player:G.enemy;
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); side(who).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); side(who).field.push(c); return c;
}
const pair=(u, pid)=>{ const p=card(pid, u.owner); A.attachPilot(u, p); drainTasks(); return p; };
const modal=()=>el('blockModal').classList.contains('show') ? { msg:(el('blockMsg').innerHTML||'').replace(/<[^>]+>/g,''), btns:[...el('blockBtns').children].map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'')) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const passAll=()=>{ let g=0; while (modal() && g++<10){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass|Don't|No block|Skip/)) break; } };
const logs=()=>(el('log').children||[]).map(c=>(c.innerHTML||'').replace(/<[^>]+>/g,''));
const setTrash=(who, ids)=>{ side(who).trash=ids.map(i=>card(i, who)); A.refreshTrashStats(side(who)); return side(who).trash; };
const playHand=(who, id)=>{ const c=card(id, who); side(who).hand.push(c); A.playFromHand(c.uid); drainTasks(); return c; };
const GG=['EB01-002','EB01-015','EB01-002','EB01-015'];   // (G Generation) cards for Development costs

// ===== Destined Battle GD04-107 =====
// Q289: the Destined Battle Unit takes priority over Gundam AGE-2 Normal's "choose this rested Unit … if possible".
{ fresh('enemy'); const age=put('GD03-019','player',{rested:true}); pair(age,'ST01-010');
  const y=stick('player',1,9,{rested:true}); A.applyCommand(card('GD04-107','player'), G.player, y); drainTasks();
  const lures=A.lureTargets(stick('enemy',5,9), G.player);
  ok('Q289 Destined Battle: only the chosen Unit is a forced target while AGE-2 Normal also lures', lures.length===1 && lures[0]===y, lures.map(u=>u.name).join(','));
  const atk=G.enemy.field[0]; A.resolveAiAttack(atk, ()=>{}, null); drainTasks(); passAll();
  ok('Q289 AI: attacks the Destined Battle Unit, not AGE-2 Normal', y.hp===4 && G.player.field.includes(age) && age.hp===A.effMaxHp(age), `y.hp=${y.hp} age=${G.player.field.includes(age)}`);
  fresh('player'); const age2=put('GD03-019','enemy',{rested:true}); pair(age2,'ST01-010'); const y2=stick('enemy',1,9,{rested:true});
  A.applyCommand(card('GD04-107','enemy'), G.enemy, y2); drainTasks();
  const a=stick('player',5,9); A.fieldClick(a.uid); drainTasks(); A.fieldClick(age2.uid); drainTasks();
  ok('Q289 player: attacking AGE-2 Normal is refused while the Destined Battle Unit can be chosen', !a.rested && G.curBattle==null);
  A.cancelAction && A.cancelAction(); drainTasks(); G.mode='idle'; G.selected=null;
  A.fieldClick(a.uid); drainTasks(); A.fieldClick(y2.uid); drainTasks(); passAll();
  ok('Q289 player: attacking the Destined Battle Unit is accepted', a.rested && y2.hp<9, `rested=${a.rested} hp=${y2.hp}`);
  // with no Destined Battle Unit, AGE-2 Normal's lure still applies
  fresh('enemy'); const age3=put('GD03-019','player',{rested:true}); pair(age3,'ST01-010'); stick('player',1,9,{rested:true});
  const l3=A.lureTargets(stick('enemy',5,9), G.player); ok('Q289 control: AGE-2 Normal still lures without a Destined Battle Unit', l3.length===1 && l3[0]===age3); }
// Q301: an active Destined Battle Unit binds an attacker that may choose active enemy Units.
{ fresh('player'); const y=stick('enemy',1,9,{rested:true}); const z=stick('enemy',1,9,{rested:true});
  A.applyCommand(card('GD04-107','enemy'), G.enemy, y); drainTasks(); y.rested=false;
  const a=stick('player',3,9,{canAttackActive:true}), plain=stick('player',3,9);
  ok('Q301: lureTargets holds the active chosen Unit for an attacker that may choose active Units', A.lureTargets(a, G.enemy).length===1 && A.lureTargets(a, G.enemy)[0]===y);
  ok('Q301 control: an attacker that can\'t choose active Units isn\'t bound by the active chosen Unit', !A.lureTargets(plain, G.enemy).includes(y));
  A.fieldClick(a.uid); drainTasks(); A.fieldClick(z.uid); drainTasks();
  ok('Q301 player: attacking another rested Unit is refused', !a.rested);
  G.mode='idle'; G.selected=null; A.fieldClick(a.uid); drainTasks(); A.attackDirect(); drainTasks();
  ok('Q301 player: attacking the player directly is refused', !a.rested);
  G.mode='idle'; G.selected=null; A.fieldClick(a.uid); drainTasks(); A.fieldClick(y.uid); drainTasks(); passAll();
  ok('Q301 player: attacking the active chosen Unit is accepted', a.rested && y.hp<9, `hp=${y.hp}`);
  fresh('enemy'); const py=stick('player',1,9,{rested:true}); const pz=stick('player',1,1,{rested:true});
  A.applyCommand(card('GD04-107','player'), G.player, py); drainTasks(); py.rested=false;
  const atk=stick('enemy',3,9,{canAttackActive:true}); A.resolveAiAttack(atk, ()=>{}, pz); drainTasks(); passAll();
  ok('Q301 AI: attacks the active chosen Unit (not its planned target)', py.hp===6 && G.player.field.includes(pz), `py=${py.hp} pz=${G.player.field.includes(pz)}`); }

// ===== "Choose 1 of your Units and 1 enemy Unit. Deal N damage to them." =====
// Q168 Mikazuki Augus ST05-010 (【When Paired】)
{ fresh('player'); const u=put('GD03-056','player'); const mine=stick('player',1,5); G.player.hand=[card('ST05-010','player')];
  A.playFromHand(G.player.hand[0].uid); drainTasks(); A.fieldClick(u.uid); drainTasks();
  ok('Q168 player: no enemy Unit — no choice is asked', G.mode!=='trigger-target' && !modal(), G.mode);
  passAll(); ok('Q168 player: no enemy Unit — none of your Units takes damage', mine.hp===5 && u.hp===A.effMaxHp(u), `${mine.hp} ${u.hp}`);
  fresh('player'); const u2=put('GD03-056','player'); const m2=stick('player',1,5); const e2=stick('enemy',2,5); G.player.hand=[card('ST05-010','player')];
  A.playFromHand(G.player.hand[0].uid); drainTasks(); A.fieldClick(u2.uid); drainTasks();
  const asked = G.mode==='trigger-target'; if (asked){ A.fieldClick(m2.uid); drainTasks(); }
  ok('Q168 player control: with an enemy Unit you choose your Unit and both take 1', asked && m2.hp===4 && e2.hp===4, `asked=${asked} ${m2.hp} ${e2.hp}`);
  fresh('enemy'); const ue=put('GD03-056','enemy'); const oe=stick('enemy',2,5); pair(ue,'ST05-010');
  ok('Q168 AI: no enemy Unit — its own Units take no damage', ue.hp===A.effMaxHp(ue) && oe.hp===5, `${ue.hp} ${oe.hp}`);
  fresh('enemy'); const ue2=put('GD03-056','enemy'); const pe=stick('player',2,5); pair(ue2,'ST05-010');
  ok('Q168 AI control: with an enemy Unit both take 1', pe.hp===4 && G.enemy.field.some(x=>x.hp<A.effMaxHp(x)), `${pe.hp}`); }
// Q230 Gundam Barbatos Adapt GD03-056 (【Deploy】) — the AI through its real main step, the player through the hand.
{ fresh('enemy'); const mine=stick('enemy',2,5); G.enemy.hand=[card('GD03-056','enemy')]; A.aiMainStep(); drainTasks(1);
  ok('Q230 AI: deploying Barbatos Adapt with no player Unit damages none of its Units', mine.hp===5 && G.enemy.field.every(x=>x.hp===A.effMaxHp(x)), `${mine.hp}`);
  fresh('player'); const m2=stick('player',2,5); playHand('player','GD03-056');
  ok('Q230 player: deploying it with no enemy Unit damages none of your Units', m2.hp===5 && G.mode!=='trigger-target', `${m2.hp} ${G.mode}`);
  fresh('enemy'); stick('enemy',2,5); const pe=stick('player',2,5); A.runTrigger(put('GD03-056','enemy'), G.enemy, A.parseTrigger(A.CARD_BY_ID.get('GD03-056').effect,'Deploy'), 'Deploy');
  ok('Q230 AI control: with a player Unit it deals 1 to both', pe.hp===4 && G.enemy.field.some(x=>x.hp<A.effMaxHp(x))); }
// Gundam Gusion Rebake GD02-055 — the same 【Deploy】 text
{ fresh('enemy'); const mine=stick('enemy',2,5); const g=put('GD02-055','enemy'); A.runTrigger(g, G.enemy, A.parseTrigger(A.CARD_BY_ID.get('GD02-055').effect,'Deploy'), 'Deploy');
  ok('Gusion Rebake AI: no enemy Unit — nothing is damaged', mine.hp===5 && g.hp===A.effMaxHp(g)); }
// Q522 GFreD GD06-054 — "You may choose 1 of your Units and 1 enemy Unit": still needs both.
{ fresh('player'); const mine=stick('player',2,4); playHand('player','GD06-054');
  ok('Q522 player: no enemy Unit — not asked, none of your Units damaged', !modal() && mine.hp===4 && G.player.field.every(x=>x.hp===A.effMaxHp(x) || x===mine), JSON.stringify(modal()));
  fresh('player'); stick('player',2,4); const e=stick('enemy',2,4); playHand('player','GD06-054');
  const m=modal(); ok('Q522 player control: with an enemy Unit the optional effect is offered', !!m && /deal 1 damage/.test(m.msg), JSON.stringify(m));
  press(/Don't/); ok('Q522 player control: declining damages nothing', e.hp===4);
  fresh('enemy'); const other=stick('enemy',2,4); const g=put('GD06-054','enemy'); A.runTrigger(g, G.enemy, A.parseTrigger(A.CARD_BY_ID.get('GD06-054').effect,'Deploy'), 'Deploy');
  ok('Q522 AI: no enemy Unit — its Units take no damage', g.hp===A.effMaxHp(g) && other.hp===4); }
// Q293 Reformationist GD04-114 / Q412 Become a Shield GD05-117 / Towards Destiny GD03-116 — Commands: not playable without both.
for (const id of ['GD04-114','GD05-117','GD03-116']){
  const n=A.CARD_BY_ID.get(id).name, vagan=id==='GD03-116' ? { trait:'(Vagan)' } : {};
  fresh('player'); const mine=stick('player',2,5,vagan); const c=card(id,'player'); G.player.hand=[c]; A.playFromHand(c.uid); drainTasks();
  if (modal() && modal().btns.some(b=>/Command effect/.test(b))) press(/Command effect/);
  ok(`${id} ${n} player: no enemy Unit — it can't be played (stays in hand, your Unit undamaged)`, G.player.hand.includes(c) && mine.hp===5, `${G.player.hand.includes(c)} ${mine.hp}`);
  G.curBattle=null; G.phase='main';
  ok(`${id} ${n} player: not offered in an action step with no enemy Unit`, !A.collectPlayerActions(null).some(o=>o.label.includes(n)));
  fresh('enemy'); stick('enemy',2,5,vagan); const ai=card(id,'enemy'); G.enemy.hand=[ai]; A.aiMainStep(); drainTasks(1);
  ok(`${id} ${n} AI: not played with no player Unit`, G.enemy.hand.includes(ai));
  fresh('player'); const m2=stick('player',2,5,vagan); const e2=stick('enemy',2,5); const c2=card(id,'player'); G.player.hand=[c2]; A.playFromHand(c2.uid); drainTasks();
  if (modal() && modal().btns.some(b=>/Command effect/.test(b))) press(/Command effect/);
  const dmg=id==='GD03-116'?2:1;
  ok(`${id} ${n} player control: with both Units it's played and both take ${dmg}`, !G.player.hand.includes(c2) && m2.hp===5-dmg && e2.hp===5-dmg, `${m2.hp} ${e2.hp}`);
}
// Towards Destiny's friendly half is restricted: an enemy Unit alone doesn't make it playable (Q293's rule).
{ fresh('player'); const mine=stick('player',2,5); const e=stick('enemy',2,5); const c=card('GD03-116','player'); G.player.hand=[c]; A.playFromHand(c.uid); drainTasks();
  ok('Towards Destiny player: no (Vagan) Unit — not playable even with an enemy Unit', G.player.hand.includes(c) && e.hp===5 && mine.hp===5); }

// ===== "Choose 1 of your … Units and 1 enemy Unit. Rest them." =====
// Q265 Gun EZ GD04-015
for (const w of ['player','enemy']){
  for (const eLv of [null, 5, 3]){
    fresh(w); const lm=stick(w,2,3,{trait:'(League Militaire)'}); const e = eLv==null ? null : stick(w==='player'?'enemy':'player',1,3,{lv:eLv});
    if (w==='player'){ playHand('player','GD04-015'); if (G.mode==='trigger-target'){ A.fieldClick(lm.uid); drainTasks(); } }
    else { const g=put('GD04-015','enemy'); A.runTrigger(g, G.enemy, A.parseTrigger(A.CARD_BY_ID.get('GD04-015').effect,'Deploy'), 'Deploy'); drainTasks(); }
    const fires = eLv===3;
    ok(`Q265 Gun EZ ${w}: enemy ${eLv==null?'none':'Lv.'+eLv} — ${fires?'both rested':'nothing rested'}`, fires ? (lm.rested && e.rested) : (!lm.rested && (!e || !e.rested)), `lm=${lm.rested} e=${e&&e.rested}`);
  }
}
// Q327 Yuu Kajima EB01-072 — needs an active friendly <Blocker> Unit.
for (const w of ['player','enemy']){
  for (const withBlocker of [false, true]){
    fresh(w); const host=stick(w,2,4); const bl = withBlocker ? stick(w,1,3,{blocker:true}) : null; const e=stick(w==='player'?'enemy':'player',2,3,{lv:3});
    if (w==='player'){ G.player.hand=[card('EB01-072','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks(); A.fieldClick(host.uid); drainTasks(); let g=0; while(modal()&&g++<4) press(/./); }
    else pair(host,'EB01-072');
    ok(`Q327 Yuu Kajima ${w}: ${withBlocker?'with':'without'} an active friendly <Blocker> Unit — ${withBlocker?'both rested':'nothing rested'}`,
      !!host.pilot && (withBlocker ? (bl.rested && e.rested) : !e.rested), `paired=${!!host.pilot} e=${e.rested} bl=${bl&&bl.rested}`);
  }
}
// Kudelia Aina Bernstein & Isaribi EB01-085 — "Then, you may choose 1 active friendly blue (G Generation) Unit and 1 enemy Unit."
{ fresh('player'); const gu=stick('player',2,3,{trait:'(G Generation)', color:'Blue'}); playHand('player','EB01-085'); let g=0; while (modal() && g++<4) press(/./);
  ok('Kudelia & Isaribi player: no enemy Unit — your (G Generation) Unit stays active', !gu.rested && !modal());
  fresh('enemy'); const ge=stick('enemy',2,3,{trait:'(G Generation)', color:'Blue'}); const b=put('EB01-085','enemy'); A.runTrigger(b, G.enemy, A.parseTrigger(A.CARD_BY_ID.get('EB01-085').effect,'Deploy'), 'Deploy');
  ok('Kudelia & Isaribi AI: no enemy Unit — its Unit stays active', !ge.rested); }
// The Stubborn Cog GD01-103 (Command)
{ fresh('player'); const ef=stick('player',2,3,{trait:'(Earth Federation)'}); const c=card('GD01-103','player'); G.player.hand=[c]; A.playFromHand(c.uid); drainTasks();
  ok('The Stubborn Cog player: no enemy Unit — not playable', G.player.hand.includes(c) && !ef.rested);
  fresh('enemy'); stick('enemy',2,3,{trait:'(Earth Federation)'}); const ai=card('GD01-103','enemy'); G.enemy.hand=[ai]; A.aiMainStep(); drainTasks(1);
  ok('The Stubborn Cog AI: not played with no player Unit', G.enemy.hand.includes(ai)); }
// Unheralded Attack GD03-121 — "Choose 1 friendly Base and 1 enemy Unit with 3 or less HP. Rest them."
{ fresh('player'); stick('enemy',2,3); G.player.hand=[card('GD03-121','player')];
  ok('Unheralded Attack player: no friendly Base — not offered in an action step', !A.collectPlayerActions(null).some(o=>/Unheralded/.test(o.label)));
  G.player.base=card('EB01-085','player');
  ok('Unheralded Attack player control: with a Base and a 3-HP enemy Unit it is offered', A.collectPlayerActions(null).some(o=>/Unheralded/.test(o.label))); }

// ===== Development: the optional exile can be paid with no target for the ■ effect =====
// Q303 Zeta Gundam ST10-002 (no enemy Unit with 4 or less HP)
{ fresh('player'); setTrash('player', GG.slice(0,2)); const e=stick('enemy',1,9); playHand('player','ST10-002');
  const m=modal(); ok('Q303 Zeta Gundam player: Development 2 exile offered with no target', !!m && /exile 2/.test(m.msg) && m.btns.some(b=>/^Exile 2/.test(b)), JSON.stringify(m));
  press(/^Exile/); ok('Q303 player: exiling pays the cost; the ■ effect does nothing', G.player.exile.length===2 && G.player.trash.length===0 && !e.rested && G.mode==='idle' && !modal(), `exile=${G.player.exile.length} mode=${G.mode}`);
  fresh('player'); setTrash('player', GG.slice(0,2)); stick('enemy',1,9); playHand('player','ST10-002'); press(/Don't/);
  ok('Q303 player: declining keeps the trash', G.player.trash.length===2 && G.player.exile.length===0);
  fresh('enemy'); setTrash('enemy', GG.slice(0,2)); stick('player',1,9); const z=put('ST10-002','enemy'); A.runTrigger(z, G.enemy, A.parseTrigger(A.CARD_BY_ID.get('ST10-002').effect,'Deploy'), 'Deploy');
  ok('Q303 AI: declines the pointless exile', G.enemy.trash.length===2); }
// Q315 Gundam Barbatos 6th Form EB01-010 (no rested enemy Unit)
{ fresh('player'); setTrash('player', GG.slice(0,3)); const e=stick('enemy',3,3); playHand('player','EB01-010');
  const m=modal(); ok('Q315 Barbatos 6th Form player: Development 3 exile offered with no rested enemy Unit', !!m && /exile 3/.test(m.msg), JSON.stringify(m));
  press(/^Exile/); ok('Q315 player: 3 exiled, the active enemy Unit undamaged', G.player.exile.length===3 && e.hp===3 && G.mode==='idle'); }
// Q304 Gundam Barbatos 4th Form ST10-007 (【When Linked】, no Lv.4- Command in the trash)
{ fresh('player'); setTrash('player', GG.slice(0,2)); const u=put('ST10-007','player');
  const pilot=[...A.CARD_BY_ID.values()].find(d=>d.type==='pilot' && (d.trait||'').includes('(G Generation)') && !/-p\d+$/.test(d.id));
  A.attachPilot(u, card(pilot.id,'player')); drainTasks();
  const m=modal(); ok('Q304 Barbatos 4th Form player: Development 2 exile offered when Linked with no Lv.4- Command in trash', u.linked && !!m && /exile 2/.test(m.msg), `linked=${u.linked} ${JSON.stringify(m)}`);
  press(/^Exile/); ok('Q304 player: 2 exiled, nothing added to hand', G.player.exile.length===2 && G.player.hand.length===0 && !modal()); }
// Q324 Gundam Aquarius EB01-060 (【When Paired】, only an enemy Lv.6 Unit)
{ fresh('player'); const u=put('EB01-060','player'); setTrash('player', GG.slice(0,3)); const e=stick('enemy',3,3,{lv:6}); A.attachPilot(u, card('EB01-063','player')); drainTasks();
  const m=modal(); ok('Q324 Gundam Aquarius player: Development 3 exile offered with no Lv.4- enemy Unit', !!m && /exile 3/.test(m.msg), JSON.stringify(m));
  press(/^Exile/); ok('Q324 player: 3 exiled, the Lv.6 enemy Unit stays', G.player.exile.length===3 && G.enemy.field.includes(e));
  fresh('enemy'); const ua=put('EB01-060','enemy'); setTrash('enemy', GG.slice(0,3)); stick('player',3,3,{lv:6}); A.attachPilot(ua, card('EB01-063','enemy')); drainTasks();
  ok('Q324 AI: declines the pointless exile', G.enemy.trash.length===3); }

console.log('== FAQ round 4: two-target effects, Development exile, Destined Battle ==');
console.log(`passed: ${pass} | failed: ${fail.length}`); for (const f of fail) console.log('  FAIL '+f);
console.log('Errors: '+(H.ERRORS.length+fail.length)); for (const e of H.ERRORS.slice(0,5)) console.log('  ERR', e.ctx, e.phase, e.msg, e.stack);
