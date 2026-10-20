// Audit 3, group u: "Choose 1 Unit…" with no side named (no friendly / enemy / your / of your / belonging to) — by the game's
// convention (Wings of Light's ■2, Midair Modifications, 30cm Cannon, Taurus) either player's Unit may be chosen. The player gets
// a chooser listing their own Units first and the opponent's after; the AI picks its own Unit for heals, buffs and attack grants.
// Cards: G-Sky Easy GD01-014, Gundam Mk-Ⅲ EB01-020, Galluss-K GD01-058, Daryl Lorenz EB01-070, SP Conversion Chips EB01-083,
// Rasid's Orders GD01-110, Sturm Faust EB01-080 (same wording), Rosamia Badam GD04-082 (already either side — checked).
// 【Activate･Action】 abilities are used in action steps (a battle, or the End Phase).
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=950000;
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
const passAll=()=>{ let g=0; while (modal() && g++<10){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass/)) break; } };
const offered=(re)=>!!modal() && modal().btns.some(b=>re.test(b));
const btnIdx=(re)=>modal() ? modal().btns.findIndex(b=>re.test(b)) : -1;
const logs=()=>(el('log').children||[]).map(c=>(c.innerHTML||'').replace(/<[^>]+>/g,''));
const skipBlock=()=>{ drainTasks(); if (modal() && /intercept/i.test(modal().msg)) press(/Don't/); };

// ---- 1. Parsing: the unqualified choice is marked "either side"; qualified ones are not ----
{ const any=(a)=>{ const e=a && a.kind==='cond' ? a.inner : a; return !!(e && e.filter && e.filter.anySide); };
  const act=id=>A.parseActivate(A.CARD_BY_ID.get(id).effect).action, cmd=id=>A.inferCommand(A.CARD_BY_ID.get(id).effect);
  for (const id of ['GD01-014','EB01-020','GD01-058','EB01-070']) ok(`${id} ${A.CARD_BY_ID.get(id).name}: "Choose 1 Unit" — either side`, any(act(id)), JSON.stringify(act(id)));
  for (const id of ['EB01-083','GD01-110','EB01-080']) ok(`${id} ${A.CARD_BY_ID.get(id).name}: "Choose 1 Unit" — either side`, any(cmd(id)), JSON.stringify(cmd(id)));
  ok('Galluss-K keeps "that is Lv.4 or higher"', act('GD01-058').filter.minLv===4 && act('GD01-058').dur==='battle');
  ok("Daryl Lorenz keeps \"If it is your opponent's turn\"", act('EB01-070').kind==='cond' && act('EB01-070').cond.type==='oppTurn' && act('EB01-070').inner.dur==='battle');
  ok("Rasid's Orders keeps Lv.4 or higher and the enemy's 6 or less AP", cmd('GD01-110').filter.minLv===4 && cmd('GD01-110').enemyFilter.maxAp===6);
  ok('Sturm Faust keeps its (G Generation) restriction', JSON.stringify(cmd('EB01-080').filter.traits)==='["g generation"]');
  const ros=A.parseTrigger(A.CARD_BY_ID.get('GD04-082').effect,'When Linked');
  ok('Rosamia Badam: "Choose 1 rested Unit" was already either side (damage, rested)', ros && ros.kind==='damage' && ros.filter.anySide && ros.filter.rested);
  // Qualified wordings stay one-sided.
  ok('SUMO Silver Type ("1 of your damaged (Dianna Counter) Units") stays yours', !any(act('GD06-069')));
  ok('Warship Cruise ("…belonging to each enemy player") stays enemy', cmd('EB01-082').scope==='enemy' && !any(cmd('EB01-082')));
}

// ---- 2. G-Sky Easy / Gundam Mk-Ⅲ: "Choose 1 Unit. It recovers 1 HP." (End Phase action step) ----
for (const id of ['GD01-014','EB01-020']){
  { fresh('player'); const u=put(id,'player'); u.linked=true; const mine=stick('player',2,3,{name:'MyHurt'}); mine.hp=1; const foe=stick('enemy',2,3,{name:'FoeHurt'}); foe.hp=1;
    A.endTurn(); drainTasks();
    const nm=new RegExp(u.name.slice(0,6)); ok(`${u.name}: offered in your End Phase action step`, offered(nm)); press(nm);
    ok(`${u.name}: a chooser offers your damaged Unit first and the enemy's too`, btnIdx(/MyHurt/)===0 && btnIdx(/FoeHurt/)>0, JSON.stringify(modal()));
    press(/FoeHurt/); ok(`${u.name}: the chosen enemy Unit recovers 1 (yours doesn't)`, foe.hp===2 && mine.hp===1, `foe ${foe.hp} mine ${mine.hp}`); G.over=true; }
  { fresh('player'); const u=put(id,'player'); u.linked=true; const mine=stick('player',2,3,{name:'MyHurt'}); mine.hp=1; const foe=stick('enemy',2,3,{name:'FoeHurt'}); foe.hp=1;
    A.endTurn(); drainTasks(); press(new RegExp(u.name.slice(0,6))); press(/MyHurt/);
    ok(`${u.name}: choosing your own Unit heals it`, mine.hp===2 && foe.hp===1); G.over=true; }
  { fresh('player'); const u=put(id,'player'); u.linked=true; stick('player',2,3); const foe=stick('enemy',2,3,{name:'FoeHurt'}); foe.hp=1;
    ok(`${u.name}: with only an enemy Unit damaged, the ability is still usable in an action step`, (G.endActionStep=true, A.activateReady(u)) && A.collectPlayerActions(null).some(o=>o.label.includes(u.name))); G.endActionStep=false; }
  // AI: its own damaged Unit, never yours.
  { fresh('enemy'); const u=put(id,'enemy'); u.linked=true; const own=stick('enemy',2,3); own.hp=1; const pl=stick('player',2,3); pl.hp=1; A.endTurn(); drainTasks();
    ok(`${u.name} (AI): heals its own damaged Unit, not yours`, own.hp===2 && pl.hp===1, `own ${own.hp} yours ${pl.hp}`); G.over=true; }
  { fresh('enemy'); const u=put(id,'enemy'); u.linked=true; stick('enemy',2,3); const pl=stick('player',2,3); pl.hp=1; A.endTurn(); drainTasks();
    ok(`${u.name} (AI): with only your Unit damaged it doesn't heal it`, pl.hp===1 && !u.activatedThisTurn); G.over=true; }
}

// ---- 3. Galluss-K: "Choose 1 Unit that is Lv.4 or higher. It gets AP+1 during this battle." ----
{ fresh('enemy'); put('GD01-058','player'); const mine=stick('player',2,5,{lv:4, rested:true, name:'MyLv4'}); const atk=stick('enemy',3,3,{lv:4, name:'FoeLv4'}); stick('enemy',9,9,{lv:3, name:'FoeLv3'});
  A.resolveAiAttack(atk, ()=>{}, mine); skipBlock();
  ok("Galluss-K: offered in the action step of the AI's attack", offered(/Galluss/)); press(/Galluss/);
  ok('Galluss-K: the chooser lists your Lv.4 Unit first, the enemy Lv.4 attacker too, never the Lv.3 one', btnIdx(/MyLv4/)===0 && btnIdx(/FoeLv4/)>0 && btnIdx(/FoeLv3/)<0, JSON.stringify(modal()));
  // (Once per turn, so nothing is left to offer: the step closes and the battle resolves straight away.)
  press(/FoeLv4/); ok('Galluss-K: the chosen enemy attacker gets AP+1 during this battle', logs().some(l=>/FoeLv4 gets AP\+1 during this battle/.test(l)) && !logs().some(l=>/MyLv4 gets AP\+1/.test(l)));
  passAll();ok('Galluss-K: its AP 4 hits your Unit (5 HP → 1) and the AP+1 ends with the battle', mine.hp===1 && !atk.battleAp, `mine ${mine.hp}`); }
{ fresh('enemy'); put('GD01-058','player'); const mine=stick('player',2,5,{lv:4, rested:true, name:'MyLv4'}); const atk=stick('enemy',3,3,{lv:4, name:'FoeLv4'});
  A.resolveAiAttack(atk, ()=>{}, mine); skipBlock(); press(/Galluss/); press(/MyLv4/); passAll();
  ok('Galluss-K: choosing your attacked Lv.4 Unit — AP 3 destroys the attacker', !G.enemy.field.includes(atk) && A.effAp(mine)===2); }
// AI: on its own Unit (its attacked Lv.4 Unit gets AP+1 and destroys your attacker), not on yours.
{ fresh('player'); const g=put('GD01-058','enemy'); const f=stick('enemy',2,9,{lv:4, rested:true}); const atk=stick('player',3,3,{lv:4});
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(f.uid); drainTasks(); passAll();
  ok('Galluss-K (AI): its own attacked Lv.4 Unit gets the AP+1, your Lv.4 attacker is destroyed', !G.player.field.includes(atk) && G.enemy.resAvail===9); }

// ---- 4. Daryl Lorenz: "If it is your opponent's turn, choose 1 Unit. It gets AP+1 during this battle." ----
{ fresh('enemy'); const u=stick('player',3,9,{rested:true, name:'MyDaryl'}); pair(u,'EB01-070'); u.linked=true; const atk=stick('enemy',4,4,{name:'FoeAtk'});
  A.resolveAiAttack(atk, ()=>{}, u); skipBlock();
  ok("Daryl Lorenz: offered on the opponent's turn", offered(/AP\+1/)); press(/AP\+1/);
  ok('Daryl Lorenz: the chooser lists your Unit first and the enemy attacker too', btnIdx(/MyDaryl/)===0 && btnIdx(/FoeAtk/)>0, JSON.stringify(modal()));
  press(/FoeAtk/); ok('Daryl Lorenz: the chosen enemy Unit gets AP+1 during this battle', atk.battleAp===1 && !u.battleAp); passAll(); }
{ fresh('player'); const u=stick('enemy',3,9,{rested:true}); pair(u,'EB01-070'); u.linked=true; const atk=stick('player',4,A.effAp(u)+1);
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(u.uid); drainTasks(); passAll();
  ok('Daryl Lorenz (AI): on your turn, its own Unit gets the AP+1 and destroys your attacker', !G.player.field.includes(atk) && G.enemy.resAvail===9); }

// ---- 5. SP Conversion Chips: "If it is your opponent's turn, choose 1 Unit. It gets AP+3 during this turn." ----
{ fresh('enemy'); G.player.hand=[card('EB01-083','player')]; const mine=stick('player',1,9,{rested:true, name:'MyUnit'}); const atk=stick('enemy',2,9,{name:'FoeAtk'});
  A.resolveAiAttack(atk, ()=>{}, mine); skipBlock();
  ok("SP Conversion Chips: offered in the action step on the opponent's turn", offered(/SP Conversion/)); press(/SP Conversion/);
  ok('SP Conversion Chips: the chooser lists your Unit first and the enemy Unit too', btnIdx(/MyUnit/)===0 && btnIdx(/FoeAtk/)>0, JSON.stringify(modal()));
  press(/FoeAtk/); ok('SP Conversion Chips: the chosen enemy Unit gets AP+3 this turn', atk.tempAp===3 && !mine.tempAp, `tempAp ${atk.tempAp}`); passAll(); }
{ fresh('enemy'); G.player.hand=[card('EB01-083','player')]; const mine=stick('player',1,3,{rested:true, name:'MyUnit'}); const atk=stick('enemy',2,4,{name:'FoeAtk'});
  A.resolveAiAttack(atk, ()=>{}, mine); skipBlock(); press(/SP Conversion/); press(/MyUnit/); passAll();
  ok('SP Conversion Chips: choosing your attacked Unit — AP 4 destroys the attacker', !G.enemy.field.includes(atk) && G.player.trash.some(c=>c.name==='SP Conversion Chips')); }
{ fresh('player'); G.enemy.hand=[card('EB01-083','enemy')]; const f=stick('enemy',2,9,{rested:true}); const atk=stick('player',4,4);
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(f.uid); drainTasks(); passAll();
  ok('SP Conversion Chips (AI): played on its own attacked Unit (AP+3 destroys your attacker), not on yours', !G.player.field.includes(atk) && !atk.tempAp && logs().some(l=>/SP Conversion Chips/.test(l))); }

// ---- 6. Rasid's Orders / Sturm Faust: "Choose 1 [(T)] Unit [that is Lv.4 or higher]. During this turn, it may choose an active enemy Unit…" ----
for (const [id, nm, ex] of [['GD01-110',/Rasid/,{lv:4}], ['EB01-080',/Sturm/,{trait:'(G Generation)', lv:4}]]){
  const label=A.CARD_BY_ID.get(id).name;
  { fresh('player'); G.player.hand=[card(id,'player')]; const mine=stick('player',3,3,Object.assign({name:'MyUnit'},ex)); const foe=stick('enemy',3,3,Object.assign({name:'FoeUnit'},ex));
    stick('player',3,3,{lv:3, trait:'(Test)', name:'MyOther'});
    A.startCommand(G.player.hand[0], 0); drainTasks();
    ok(`${label} (main): a chooser lists your Unit first and the enemy's too, never one that doesn't qualify`, btnIdx(/MyUnit/)===0 && btnIdx(/FoeUnit/)>0 && btnIdx(/MyOther/)<0, JSON.stringify(modal()));
    press(/FoeUnit/); ok(`${label} (main): the chosen enemy Unit gets the grant`, (foe.activeAttackGrants||[]).length===1 && !(mine.activeAttackGrants||[]).length); }
  { fresh('player'); G.player.hand=[card(id,'player')]; const mine=stick('player',3,3,Object.assign({name:'MyUnit'},ex)); stick('enemy',3,3,Object.assign({name:'FoeUnit'},ex)); const t=stick('enemy',1,1,{name:'FoeActive'});
    A.startCommand(G.player.hand[0], 0); drainTasks(); press(/MyUnit/);
    ok(`${label} (main): choosing your Unit — it may attack an active enemy Unit`, (mine.activeAttackGrants||[]).length===1 && A.canHitActive(mine, t)); }
  { fresh('player'); G.player.hand=[card(id,'player')]; stick('player',3,3,Object.assign({name:'MyUnit'},ex)); const foe=stick('enemy',3,3,Object.assign({name:'FoeUnit'},ex));
    A.endTurn(); drainTasks(); ok(`${label} (action step): offered in your End Phase action step`, offered(nm)); press(nm);
    ok(`${label} (action step): the chooser lists your Unit first and the enemy's too`, btnIdx(/MyUnit/)===0 && btnIdx(/FoeUnit/)>0, JSON.stringify(modal()));
    // (After the pick the End Phase finishes and the AI's turn starts, so read the log.)
    press(/FoeUnit/); ok(`${label} (action step): the chosen enemy Unit gets the grant`, logs().some(l=>l.startsWith(`${label}: FoeUnit may attack active enemy Units`)) && !logs().some(l=>/: MyUnit may attack/.test(l))); G.over=true; }
  { fresh('player'); G.player.hand=[card(id,'player')]; stick('player',3,3,{lv:3, name:'MyLv3'}); const foe=stick('enemy',3,3,Object.assign({name:'FoeUnit'},ex));
    ok(`${label}: with only an enemy Unit qualifying, the Command is still playable (it chooses that Unit)`, (A.startCommand(G.player.hand[0], 0), drainTasks(), (foe.activeAttackGrants||[]).length===1 && !G.player.hand.length)); }
  // AI: its own Unit, even when yours is stronger.
  { fresh('enemy'); const c=card(id,'enemy'); const own=stick('enemy',2,2,Object.assign({},ex)); const pl=stick('player',9,9,Object.assign({},ex));
    A.applyCommand(c, G.enemy, null); drainTasks();
    ok(`${label} (AI): grants its own Unit, never yours`, (own.activeAttackGrants||[]).length===1 && !(pl.activeAttackGrants||[]).length); }
}

// ---- 7. Rosamia Badam: "Choose 1 rested Unit. Deal 1 damage to it." — either side (already so) ----
{ fresh('player'); const host=stick('player',3,3,{name:'Host'}); const mine=stick('player',2,3,{rested:true, name:'MyRested'}); const foe=stick('enemy',2,3,{rested:true, name:'FoeRested'}); stick('enemy',2,3,{name:'FoeActive'});
  const p=card('GD04-082','player'); const act=A.parseTrigger(p.effect,'When Linked');
  A.resolvePlayerTrigger(p, G.player, act, 'When Linked', ()=>{}); drainTasks();
  const cands=(G.pending && G.pending.cands)||[];
  ok('Rosamia Badam: you may target your own or an enemy rested Unit, not an active one', G.mode==='trigger-target' && cands.includes(mine.uid) && cands.includes(foe.uid) && cands.length===2, JSON.stringify(cands));
  A.fieldClick(mine.uid); drainTasks(); ok('Rosamia Badam: choosing your own rested Unit deals it 1', mine.hp===2 && foe.hp===3); }
{ fresh('enemy'); stick('enemy',2,3,{rested:true}); const pl=stick('player',2,3,{rested:true}); const p=card('GD04-082','enemy');
  A.runTrigger(p, G.enemy, A.parseTrigger(p.effect,'When Linked'), 'When Linked'); drainTasks();
  ok('Rosamia Badam (AI): deals the 1 damage to your rested Unit', pl.hp===2); }

console.log('\n== audit3 group u: unqualified "Choose 1 Unit" (either side) ==');
console.log('passed:', pass, '| failed:', fail.length);
fail.forEach(f=>console.log('  FAIL '+f));
console.log('Errors:', fail.length + (H.ERRORS ? H.ERRORS.length : 0));
