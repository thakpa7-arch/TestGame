// Audit 3, group a: 【Activate･Action】 timing (rule 13-2-2-1) — "the keyword for an activated effect that can only be activated
// during action steps": a battle's action step (8-4, either turn) and the End Phase's (7-6-3). Never in the main phase.
// Every 【Activate･Action】 card in the pool is checked: not usable in the main phase (player or AI), usable once an action step is
// open; then each one is used for real — the player through the action-step modal, the AI in its action steps (its own battles,
// the player's battles and the End Phase), as it used to in its main phase.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=930000;
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
const passAll=()=>{ let g=0; while (modal() && g++<10){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass/)) break; } };
function pressNoDrain(re){ const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; el('blockModal').classList.remove('show'); b.onclick(); return true; }
const offered=(re)=>!!modal() && modal().btns.some(b=>re.test(b));
const logs=()=>(el('log').children||[]).map(c=>(c.innerHTML||'').replace(/<[^>]+>/g,''));
const setTrash=(who, ids)=>{ side(who).trash=ids.map(i=>card(i, who)); A.refreshTrashStats(side(who)); return side(who).trash; };
const insBtns=()=>(el('insBtns').children||[]).map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,''));
const gjallarhorn=[...A.CARD_BY_ID.values()].find(d=>(d.trait||'').includes('(Gjallarhorn)') && !/-p\d+$/.test(d.id)).id;
const commandId=[...A.CARD_BY_ID.values()].find(d=>d.type==='command' && !/-p\d+$/.test(d.id)).id;

// ---- 1. The inventory: every 【Activate･Action】 card in the pool ----
const ACTION_IDS=[...new Set(A.GUNDAM_CARDS.filter(d=>/【Activate･Action】/.test(d.effect||'')).map(d=>d.id.replace(/-p\d+$/,'')))].sort();
const EXPECTED=['EB01-020','EB01-033','EB01-070','GD01-014','GD01-058','GD01-082','GD01-098','GD01-127','GD02-011','GD03-073','GD05-021','GD05-022',
  'GD06-018','GD06-069','GD06-080','ST12-006','ST12-011','ST13-006'];
ok('inventory: the 18 【Activate･Action】 cards of the pool', JSON.stringify(ACTION_IDS)===JSON.stringify(EXPECTED), ACTION_IDS.join(','));

// Per card: a board where the ability would be usable (link/pair, cost, condition, target), and the action step it belongs in.
// `step` opens it: 'end' = the End Phase's action step; otherwise a battle (G.curAttack / G.curBattle as the engine sets them).
const SETUP={
  'GD01-014':w=>{ const u=put('GD01-014',w); seat(u,'GD01-087'); u.linked=true; stick(w,2,3).hp=1; return { u, step:'end' }; },
  'EB01-020':w=>{ const u=put('EB01-020',w); u.linked=true; stick(w,2,3).hp=1; return { u, step:'end' }; },
  'GD01-058':w=>{ const u=put('GD01-058',w); const f=stick(w,2,5,{lv:4}); const e=stick(other(w),1,9,{rested:true}); return { u, step:()=>{ G.curAttack=f; G.curBattle={atk:f, def:e}; } }; },
  'GD01-082':w=>{ const u=put('GD01-082',w); seat(u,'ST01-011'); const e=stick(other(w),3,9); return { u, step:()=>{ G.curAttack=u; G.curBattle={atk:u, def:e}; } }; },
  'GD01-098':w=>{ const u=stick(w,3,3); pair(u,'GD01-098'); u.hp=A.effMaxHp(u)-1; stick(other(w),1,3); return { u, step:'end' }; },
  'GD01-127':w=>{ const b=card('GD01-127',w); b.sick=false; side(w).base=b; const z=stick(w,5,5,{trait:'(ZAFT)'}); const e=stick(other(w),1,9,{rested:true}); return { u:b, step:()=>{ G.curAttack=z; G.curBattle={atk:z, def:e}; } }; },
  'GD02-011':w=>{ const u=put('GD02-011',w); return { u, step:()=>{ G.curAttack=u; } }; },
  'GD03-073':w=>{ const u=put('GD03-073',w); u.linked=true; setTrash(w, Array(6).fill(gjallarhorn)); const e=stick(other(w),5,9); return { u, step:()=>{ G.curAttack=e; G.curBattle={atk:e, def:u}; } }; },
  'EB01-033':w=>{ const u=put('EB01-033',w); const x=stick(w,2,9,{rested:true}); const e=stick(other(w),3,3); return { u, step:()=>{ G.turn=other(w); G.curAttack=e; G.curBattle={atk:e, def:x}; } }; },
  'EB01-070':w=>{ const u=stick(w,3,3); pair(u,'EB01-070'); u.linked=true; const e=stick(other(w),3,3); return { u, step:()=>{ G.turn=other(w); G.curAttack=e; G.curBattle={atk:e, def:u}; } }; },
  'GD05-021':w=>{ const u=put('GD05-021',w); const e=stick(other(w),1,9,{rested:true}); return { u, step:()=>{ G.curAttack=u; G.curBattle={atk:u, def:e}; } }; },
  'GD05-022':w=>{ const u=put('GD05-022',w); setTrash(w, [commandId, commandId]); const e=stick(other(w),5,9); return { u, step:()=>{ G.curAttack=e; G.curBattle={atk:e, def:u}; } }; },
  'ST12-006':w=>{ const u=put('ST12-006',w); setTrash(w, Array(4).fill('ST01-001')); return { u, step:()=>{ G.curAttack=u; } }; },
  'ST12-011':w=>{ const u=stick(w,3,3); pair(u,'ST12-011'); const e=stick(other(w),3,5); e.hp=4; return { u, step:()=>{ G.curAttack=e; G.curBattle={atk:e, def:u}; } }; },
  'ST13-006':w=>{ const u=put('ST13-006',w); stick(other(w),2,3,{lv:3}); return { u, step:'end' }; },
  'GD06-018':w=>{ const u=put('GD06-018',w,{rested:true}); seat(u,'GD06-084'); stick(w,1,6,{trait:'(Neo Zeon)'}); const e=stick(other(w),3,9); return { u, step:()=>{ G.curAttack=e; G.curBattle={atk:e, def:u}; } }; },
  'GD06-069':w=>{ const u=put('GD06-069',w); put('GD06-074',w).hp=1; return { u, step:'end' }; },
  'GD06-080':w=>{ const u=stick(w,3,5); pair(u,'GD06-080'); u.hp=1; side(w).effectDrawTurn=G.turnSeq; return { u, step:'end' }; },
};
for (const id of EXPECTED){
  for (const w of ['player','enemy']){
    fresh(w); const s=SETUP[id]; if (!s){ ok(`${id}: has a test board`, false); continue; }
    const { u, step }=s(w);
    const main=A.activateReadyAny(u);
    const uiMain = w==='player' ? A.collectPlayerActions(null).some(o=>o.label.includes('⚡')) : false;
    let insp=[]; if (w==='player'){ A.inspect(u); insp=insBtns(); }
    if (step==='end') G.endActionStep=true; else step();
    const inStep=A.activateReadyAny(u);
    const uiStep = w==='player' ? A.collectPlayerActions(G.curAttack||null).some(o=>o.label.includes('⚡')) : true;
    ok(`${id} ${u.name} (${w}): not usable in the main phase`, !main && !uiMain && !insp.some(b=>b.startsWith('⚡')), `main=${main} ui=${uiMain} insp=${insp.join('|')}`);
    ok(`${id} ${u.name} (${w}): usable in its action step (${step==='end'?'End Phase':'battle'})`, inStep && uiStep, `ready=${inStep} ui=${uiStep}`);
  }
}
// The End Phase's action step doesn't open battle-only abilities (nothing for "during this battle" to act on).
{ fresh('player'); const g=put('GD01-058','player'); stick('player',2,5,{lv:4}); G.endActionStep=true;
  ok('Galluss-K: not offered in the End Phase action step (no battle)', !A.activateReady(g) && !A.collectPlayerActions(null).some(o=>/Galluss/.test(o.label))); }
{ fresh('player'); const s=put('GD06-069','player'); put('GD06-074','player').hp=1; A.endTurn(); drainTasks();
  ok('End Turn opens the End Phase action step (7-6-3) with the 【Activate･Action】 in it', G.endActionStep===true && offered(/SUMO Silver/));
  pressNoDrain(/Pass/); ok('…and it closes when the step ends', G.endActionStep===false && G.turn==='enemy'); G.over=true; }

// ---- 2. Galluss-K GD01-058 (the audit item) ----
// Player, main phase: not offered, nothing spent, no AP+1 that could carry into a later battle.
{ fresh('player'); const g=put('GD01-058','player'); const f=stick('player',2,5,{lv:4}); const t=stick('enemy',1,20,{rested:true});
  A.inspect(g); const insp=insBtns(); A.startActivate(g); drainTasks();
  ok('Galluss-K (player, main phase): no button in the card viewer, and using it does nothing', !insp.some(b=>/AP\+1/.test(b)) && G.player.resAvail===10 && !f.battleAp && G.mode==='idle', insp.join('|'));
  A.fieldClick(f.uid); drainTasks(); A.fieldClick(t.uid); drainTasks();
  ok('Galluss-K: offered in the action step of your attack', offered(/Galluss/));
  press(/Galluss/); passAll();
  ok('Galluss-K: the attacking Lv.4 Unit gets AP+1 for the battle (3 damage), ① paid', t.hp===17 && G.player.resAvail===9, `t.hp=${t.hp} res=${G.player.resAvail}`);
  ok('Galluss-K: the AP+1 ends with the battle', A.effAp(f)===2 && !f.battleAp && !G.curBattle && !G.curAttack);
  const f2=stick('player',2,5,{lv:4}); const t2=stick('enemy',1,20,{rested:true}); A.fieldClick(f2.uid); drainTasks(); A.fieldClick(t2.uid); drainTasks();
  ok('Galluss-K: 【Once per Turn】 — not offered in the next battle', !offered(/Galluss/)); passAll(); }
// Player, on the AI's turn: the action step of an AI attack on your Lv.4 Unit.
{ fresh('enemy'); const g=put('GD01-058','player'); const f=stick('player',2,5,{lv:4, rested:true}); const atk=stick('enemy',3,3);
  A.resolveAiAttack(atk, ()=>{}, f); drainTasks(); if (modal() && /intercept/i.test(modal().msg)) press(/Don't/);
  ok("Galluss-K: offered in the action step of the AI's attack", offered(/Galluss/));
  press(/Galluss/); passAll();
  ok('Galluss-K: the attacked Unit fights with AP 3 and destroys the attacker', !G.enemy.field.includes(atk) && A.effAp(f)===2, `atk in play=${G.enemy.field.includes(atk)}`); }
// AI: in its own attack, when the AP+1 makes the kill; and on the player's turn, on its Unit being attacked.
{ fresh('enemy'); const g=put('GD01-058','enemy'); const f=stick('enemy',2,9,{lv:4}); const t=stick('player',1,3,{rested:true});
  ok('Galluss-K (AI): not usable in its main phase', !A.activateReady(g));
  A.resolveAiAttack(f, ()=>{}, t); drainTasks(); passAll();
  ok('Galluss-K (AI): its attacking Lv.4 Unit gets AP+1 in the battle and destroys the 3-HP Unit', !G.player.field.includes(t) && G.enemy.resAvail===9 && A.effAp(f)===2, `res ${G.enemy.resAvail}`); }
{ fresh('player'); const g=put('GD01-058','enemy'); const f=stick('enemy',2,9,{lv:4, rested:true}); const atk=stick('player',3,3);
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(f.uid); drainTasks(); passAll();
  ok("Galluss-K (AI): on your turn, its attacked Lv.4 Unit gets AP+1 and destroys your attacker", !G.player.field.includes(atk) && G.enemy.resAvail===9); }

// ---- 3. The others, used for real in action steps ----
// G-Sky Easy GD01-014 / Gundam Mk-Ⅲ EB01-020 — heal: the player in the End Phase action step; the AI in its End Phase.
for (const id of ['GD01-014','EB01-020']){
  { fresh('player'); const u=put(id,'player'); u.linked=true; const d=stick('player',2,3); d.hp=1; A.endTurn(); drainTasks();
    ok(`${u.name}: offered in your End Phase action step`, offered(new RegExp(u.name.slice(0,6))));
    press(new RegExp(u.name.slice(0,6))); ok(`${u.name}: your damaged Unit recovers 1`, d.hp===2); G.over=true; }
  { fresh('enemy'); const u=put(id,'enemy'); u.linked=true; const d=stick('enemy',2,3); d.hp=1; A.endTurn(); drainTasks();
    ok(`${u.name} (AI): used in its End Phase action step — its damaged Unit recovers 1`, d.hp===2 && logs().some(l=>l.includes(`${u.name} repairs ${d.name}`))); G.over=true; }
}
// Elan Ceres GD01-098 — the player in an AI battle; the AI in a battle on the player's turn.
{ fresh('enemy'); const u=stick('player',3,3,{rested:true}); pair(u,'GD01-098'); u.hp=A.effMaxHp(u)-1; const hp0=u.hp; const atk=stick('enemy',1,9);
  A.resolveAiAttack(atk, ()=>{}, u); drainTasks(); if (modal() && /intercept/i.test(modal().msg)) press(/Don't/);
  ok('Elan Ceres: offered in the action step of the AI attack (an enemy Unit with 1 AP is in play)', offered(/Elan Ceres|recovers 1 HP/));
  pressNoDrain(/recovers 1 HP/); ok('Elan Ceres: the paired Unit recovers 1 before the damage step', u.hp===hp0+1, `hp ${hp0}->${u.hp}`); passAll(); }
{ fresh('player'); const u=stick('enemy',3,3,{rested:true}); pair(u,'GD01-098'); u.hp=A.effMaxHp(u)-1; const atk=stick('player',1,9);
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(u.uid); drainTasks();
  ok('Elan Ceres (AI): heals its damaged Unit in the action step of your attack', u.activatedThisTurn && logs().some(l=>l.includes(`${u.name} repairs ${u.name}`))); passAll(); }
// Gundam Aerial (Mirasoul Flight Unit) GD01-082 — AP-1 on the Unit battling it.
{ fresh('enemy'); const m=put('GD01-082','player',{rested:true}); seat(m,'ST01-011'); const atk=stick('enemy',3,9);
  A.resolveAiAttack(atk, ()=>{}, m); drainTasks(); if (modal() && /intercept/i.test(modal().msg)) press(/Don't/);
  ok('Gundam Aerial (Mirasoul): offered in the action step of the AI attack', offered(/Mirasoul|AP-1/));
  press(/AP-1/); passAll(); ok('Gundam Aerial (Mirasoul): the attacker deals 2, not 3 — it survives', G.player.field.includes(m) && m.hp===1, `hp ${m.hp}`); }
{ fresh('player'); const m=put('GD01-082','enemy',{rested:true}); seat(m,'ST01-011'); const atk=stick('player',3,9);
  ok('Gundam Aerial (Mirasoul) (AI): not usable in the main phase', !A.activateReady(m));
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(m.uid); drainTasks(); passAll();
  ok('Gundam Aerial (Mirasoul) (AI): gives your attacker AP-1 so its Unit survives', G.enemy.field.includes(m) && G.enemy.resAvail===8, `in play ${G.enemy.field.includes(m)} res ${G.enemy.resAvail}`); }
// Graze Ein GD03-073 — AP-3 on the enemy Unit battling it.
{ fresh('player'); const ge=put('GD03-073','enemy',{rested:true}); ge.linked=true; setTrash('enemy', Array(6).fill(gjallarhorn)); const atk=stick('player',5,9);
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(ge.uid); drainTasks(); passAll();
  ok('Graze Ein (AI): your attacker gets AP-3 and Graze Ein survives', G.enemy.field.includes(ge) && ge.hp===2, `hp ${ge.hp}`); }
{ fresh('enemy'); const ge=put('GD03-073','player',{rested:true}); ge.linked=true; setTrash('player', Array(6).fill(gjallarhorn)); const atk=stick('enemy',5,9);
  A.resolveAiAttack(atk, ()=>{}, ge); drainTasks(); if (modal() && /intercept/i.test(modal().msg)) press(/Don't/);
  ok('Graze Ein: offered in the action step of the AI attack', offered(/AP-3/)); press(/AP-3/); passAll();
  ok('Graze Ein: the attacker deals 2 and Graze Ein survives', G.player.field.includes(ge) && ge.hp===2, `hp ${ge.hp}`); }
// Daryl Lorenz EB01-070 — "If it is your opponent's turn": the player on the AI's turn; the AI on the player's turn.
{ fresh('enemy'); const u=stick('player',3,9,{rested:true}); pair(u,'EB01-070'); u.linked=true; const atk=stick('enemy',4,4);
  A.resolveAiAttack(atk, ()=>{}, u); drainTasks(); if (modal() && /intercept/i.test(modal().msg)) press(/Don't/);
  ok("Daryl Lorenz: offered in the action step on the opponent's turn", offered(/AP\+1/)); press(/AP\+1/); if (modal() && /choose the Unit/.test(modal().msg)) press(new RegExp(u.name.replace(/[#/]/g,'.')));
  passAll(); ok('Daryl Lorenz: the paired Unit gets AP+1 for the battle and destroys the attacker', !G.enemy.field.includes(atk)); }
{ fresh('player'); const u=stick('player',3,9); pair(u,'EB01-070'); u.linked=true; const t=stick('enemy',1,9,{rested:true});
  A.fieldClick(u.uid); drainTasks(); A.fieldClick(t.uid); drainTasks();
  ok("Daryl Lorenz: not offered on your own turn (\"If it is your opponent's turn\")", !offered(/AP\+1/)); passAll(); }
{ fresh('player'); const u=stick('enemy',3,9,{rested:true}); pair(u,'EB01-070'); u.linked=true; const atk=stick('player',4,A.effAp(u)+1);
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(u.uid); drainTasks(); passAll();
  ok('Daryl Lorenz (AI): on your turn, its attacked Unit gets AP+1 and destroys your attacker', !G.player.field.includes(atk) && G.enemy.resAvail===9); }
// Gundam AGE-2 Double Bullet GD05-021 — AP+4 during this battle.
{ fresh('player'); const a=put('GD05-021','player'); const t=stick('enemy',1,8,{rested:true});
  A.fieldClick(a.uid); drainTasks(); if (G.mode!=='attack-target'){ G.selected=a.uid; G.mode='attack-target'; } A.fieldClick(t.uid); drainTasks();
  ok('AGE-2 Double Bullet: offered in the action step of its attack', offered(/AP\+4/)); press(/AP\+4/); passAll();
  ok('AGE-2 Double Bullet: deals 8 and the AP+4 ends with the battle', !G.enemy.field.includes(t) && A.effAp(a)===4); }
{ fresh('enemy'); const a=put('GD05-021','enemy'); const t=stick('player',1,8,{rested:true});
  ok('AGE-2 Double Bullet (AI): not usable in the main phase', !A.activateReady(a));
  A.resolveAiAttack(a, ()=>{}, t); drainTasks(); passAll();
  ok('AGE-2 Double Bullet (AI): uses AP+4 in its attack when that destroys the Unit', !G.player.field.includes(t) && G.enemy.resAvail===9); }
// Gundam Schwarzette GD05-022 — reduce enemy damage by 2 during this battle.
{ fresh('player'); const s=put('GD05-022','enemy',{rested:true}); setTrash('enemy', [commandId, commandId]); const atk=stick('player',5,9);
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(s.uid); drainTasks(); passAll();
  ok('Gundam Schwarzette (AI): exiles 2 Commands and survives your 5-AP attacker', G.enemy.field.includes(s) && s.hp===1 && G.enemy.exile.length===2, `hp ${s.hp}`); }
{ fresh('enemy'); const s=put('GD05-022','player',{rested:true}); setTrash('player', [commandId, commandId]); const atk=stick('enemy',5,9);
  A.resolveAiAttack(atk, ()=>{}, s); drainTasks(); if (modal() && /intercept/i.test(modal().msg)) press(/Don't/);
  ok('Gundam Schwarzette: offered in the action step of the AI attack', offered(/reduce it by 2/)); press(/reduce it by 2/); passAll();
  ok('Gundam Schwarzette: takes 3 and survives', G.player.field.includes(s) && s.hp===1, `hp ${s.hp}`); }
// Milliardo Peacecraft ST12-011 — 2 damage to a damaged enemy Unit battling this Unit.
{ fresh('player'); const u=stick('enemy',3,9,{rested:true}); pair(u,'ST12-011'); const atk=stick('player',2,4); atk.hp=3;
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(u.uid); drainTasks(); passAll();
  ok('Milliardo Peacecraft (AI): deals 2 to your damaged attacker in the action step, which then dies in battle', !G.player.field.includes(atk) && logs().some(l=>/Milliardo|deal/i.test(l))); }
// Gundam Aerial ST13-006 — rest 1 friendly Unit: 1 damage to a Lv.4-or-lower enemy Unit.
{ fresh('enemy'); const a=put('ST13-006','enemy'); stick('enemy',1,1); const t=stick('player',2,1,{lv:3}); A.endTurn(); drainTasks();
  ok('Gundam Aerial (AI): destroys your 1-HP Lv.3 Unit in its End Phase action step', !G.player.field.includes(t)); G.over=true; }
{ fresh('enemy'); const a=put('ST13-006','enemy'); const x=stick('enemy',3,9); const t=stick('player',2,3,{lv:3}); const t2=stick('player',1,9,{rested:true});
  A.resolveAiAttack(x, ()=>{}, t2); drainTasks(); passAll();
  ok("Gundam Aerial (AI): in a battle it doesn't rest a Unit for 1 chip damage", t.hp===3 && !a.rested, `t.hp ${t.hp} rested ${a.rested}`); G.over=true; }
{ fresh('enemy'); const a=put('ST13-006','enemy'); const t=stick('player',2,3,{lv:3}); A.endTurn(); drainTasks();
  ok('Gundam Aerial (AI): in its End Phase (its Units are done for the turn) it chips your Unit for 1', t.hp===2 && logs().some(l=>/Gundam Aerial deals 1/.test(l))); G.over=true; }
{ fresh('player'); const a=put('ST13-006','player'); const t=stick('enemy',2,3,{lv:3}); A.endTurn(); drainTasks();
  ok('Gundam Aerial: offered in your End Phase action step', offered(/Lv\.4 or lower/)); pressNoDrain(/Lv\.4 or lower/);
  ok('Gundam Aerial: a Unit is rested and the enemy Unit takes 1', t.hp===2 && a.rested); G.over=true; }
// SUMO Silver Type GD06-069 — ①: the AI waits for its End Phase on its own turn, then heals.
{ fresh('enemy'); const s=put('GD06-069','enemy'); const f=put('GD06-074','enemy'); f.hp=1; A.endTurn(); drainTasks();
  ok('SUMO Silver Type (AI): heals its damaged (Dianna Counter) Unit in its End Phase action step', f.hp===2 && G.enemy.resAvail===9); G.over=true; }
// Kou Uraki GD06-080 — after an effect draw: heal 2.
{ fresh('player'); const u=stick('enemy',3,5,{rested:true}); pair(u,'GD06-080'); u.hp=2; G.enemy.effectDrawTurn=G.turnSeq; const atk=stick('player',1,9);
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(u.uid); drainTasks(); passAll();
  ok('Kou Uraki (AI): its damaged Unit recovers 2 in the action step of your attack', u.hp===3, `hp ${u.hp}`); }
// The AI's main phase no longer spends them (aiPostMain only finds 【Activate･Main】 abilities ready).
{ fresh('enemy'); const a=put('ST13-006','enemy',{sick:true}); stick('enemy',1,1,{sick:true}); const t=stick('player',2,1,{lv:3}); const d=put('GD01-014','enemy',{sick:true}); d.linked=true; d.hp=1;
  G.aiForceFace=false; const ready=A.activateReady(a)||A.activateReady(d); A.aiPostMain(); drainTasks();
  // The log is newest-first: the uses come after "AI ends its turn" (its End Phase action step), not before (its main phase).
  const L=logs(), iEnd=L.findIndex(l=>/AI ends its turn/.test(l)), iPing=L.findIndex(l=>/Gundam Aerial deals 1/.test(l)), iHeal=L.findIndex(l=>/G-Sky Easy repairs/.test(l));
  ok("AI main phase: its 【Activate･Action】 abilities aren't ready, and aren't used before it ends its turn", !ready && iEnd>=0 && iPing>=0 && iPing<iEnd && iHeal>=0 && iHeal<iEnd, `ready=${ready} end=${iEnd} ping=${iPing} heal=${iHeal}`);
  ok('…they are used in its End Phase action step instead', !G.player.field.includes(t) && d.hp===2); G.over=true; }

console.log('\n== audit3 group a: 【Activate･Action】 timing ==');
console.log('passed:', pass, '| failed:', fail.length);
fail.forEach(f=>console.log('  FAIL '+f));
console.log('Errors:', fail.length + (H.ERRORS ? H.ERRORS.length : 0));
