// Audit 2, AI: the AI plays 【Action】 Command cards in action steps (13-2-4-1) — in battles on both players' turns and in the
// player's End Phase — when they gain something now: a damage / destroy / debuff Command that kills an attacker or saves its Unit
// (or stops a lethal hit), a buff that turns its own battle, a damage guard that keeps its Unit alive, a shield guard while its
// last shields are attacked, a rest on a Unit that would still block, A Miracle's draw. It never plays one for no gain, pays the
// Lv./cost (and keeps an EX Resource for a real gain), and the player's own action step still follows each of its plays
// through the UI (the player answers, the AI may answer back, the battle goes on). Plus the 【Main】 removal / rest Commands the
// main phase never cast (Fatal Strike, Graviton Hammer).
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=930000;
const FILL='ST01-005';   // GM — a plain Lv.2 Unit with no effect text
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,modalQueue:[],
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,activateRestSub:null,_aiPostDeploy:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get(FILL), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get(FILL), s.who)); }
}
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const sideOf=who=>who==='player'?G.player:G.enemy;
const hand=(who, ids)=>{ const s=sideOf(who); s.hand=ids.map(id=>card(id, who)); return s.hand.slice(); };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); sideOf(who).field.push(c); return c;
}
const strip=s=>String(s||'').replace(/<[^>]+>/g,'');
const modal=()=>el('blockModal').classList.contains('show') ? { msg:strip(el('blockMsg').innerHTML), btns:[...el('blockBtns').children].map(b=>strip(b.innerHTML||b.textContent)) } : null;
function press(re){ const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test(strip(x.innerHTML||x.textContent)) && x.onclick); if(!b) return false; b.onclick(); drainTasks(); return true; }
const inTrash=(who, name)=>sideOf(who).trash.some(c=>c.name===name);
const inHand=(who, name)=>sideOf(who).hand.some(c=>c.name===name);
const alive=u=>(G.player.field.includes(u) || G.enemy.field.includes(u)) && u.hp>0;
// The player attacks enemy Unit `t` (or the enemy player with t=null) through the board taps.
function playerAttacks(atk, t){ G.selected=atk.uid; G.mode='attack-target'; if (t) A.fieldClick(t.uid); else A.attackDirect(); drainTasks(); }
function aiAttacks(atk, t){ let done=false; A.resolveAiAttack(atk, ()=>{ done=true; }, t||null); drainTasks(); return done; }
const NAME=id=>A.CARD_BY_ID.get(id).name;
const CLOSE='ST03-013', INDIG='ST03-012', UNFORESEEN='ST01-014', TIMBRE='ST02-013', DMGCTRL='GD04-113', VETPRIDE='GD05-116',
      MIRACLE='GD06-102', SIEGE='ST02-014', FATAL='ST05-014', GRAVITON='GD05-122', UNICORNS='ST12-015', FAMLOVE='GD06-110';

// ---- the survey's shapes really are Action Commands with these actions ----
for (const [id, kind] of [[CLOSE,'damage'],[INDIG,'buff'],[UNFORESEEN,'debuff'],[TIMBRE,'shieldGuard'],[DMGCTRL,'grantReduce'],[VETPRIDE,'destroy'],
                          [MIRACLE,'cond'],[SIEGE,'rest'],[UNICORNS,'modal'],[FAMLOVE,'buff']]){
  const c=card(id,'enemy'); ok(`${c.name}: an 【Action】 Command (${kind})`, /【Action】/.test(c.effect) && c.action && c.action.kind===kind, c.action&&c.action.kind); }

// ---- AI's turn: a buff Command turns its own battle ----
{ fresh('enemy'); const mine=stick('enemy',3,6), theirs=stick('player',4,5,{rested:true}); hand('enemy',[INDIG]);
  const done=aiAttacks(mine, theirs);
  ok('AI turn: Indignation (AP+2) makes its 3-AP attacker destroy the 5-HP Unit', done && !alive(theirs) && alive(mine) && inTrash('enemy', NAME(INDIG)), `theirs ${theirs.hp} mine ${mine.hp}`);
  ok('AI turn: Indignation costs 1 (10 -> 9)', G.enemy.resAvail===9, G.enemy.resAvail); }
// …and not when its attacker wins anyway
{ fresh('enemy'); const mine=stick('enemy',5,6), theirs=stick('player',2,4,{rested:true}); hand('enemy',[INDIG]);
  aiAttacks(mine, theirs);
  ok('AI turn: no buff when its attacker already destroys the Unit', !alive(theirs) && inHand('enemy', NAME(INDIG)) && G.enemy.resAvail===10); }
// Familial Love — "AP+2 during this battle. Then, if you have 3 or less cards in your hand, draw 1."
{ fresh('enemy'); const mine=stick('enemy',2,6), theirs=stick('player',1,4,{rested:true}); hand('enemy',[FAMLOVE]); const d0=G.enemy.deck.length;
  aiAttacks(mine, theirs);
  ok('AI turn: Familial Love (AP+2 this battle) turns the battle, then draws 1', !alive(theirs) && inTrash('enemy', NAME(FAMLOVE)) && G.enemy.deck.length===d0-1 && (mine.battleAp||0)===0, `theirs ${theirs.hp}, deck ${d0}->${G.enemy.deck.length}`); }

// ---- player's turn: damage / destroy kills the attacker ----
{ fresh('player'); const atk=stick('player',3,2), mine=stick('enemy',2,2,{rested:true}); hand('enemy',[CLOSE]);
  playerAttacks(atk, mine);
  ok('player turn: Close Combat destroys the attacker before the damage step', !alive(atk) && alive(mine) && mine.hp===2 && inTrash('enemy', NAME(CLOSE)), `atk ${atk.hp}, mine ${mine.hp}`);
  ok('player turn: Close Combat costs 2 (10 -> 8)', G.enemy.resAvail===8, G.enemy.resAvail);
  ok('player turn: the battle ends cleanly', !G.curBattle && !G.curAttack && G.mode==='idle' && !modal(), `${G.mode} ${!!modal()}`); }
{ fresh('player'); const atk=stick('player',4,6,{lv:2}), mine=stick('enemy',2,3,{rested:true}); hand('enemy',[VETPRIDE]);
  playerAttacks(atk, mine);
  ok("player turn: Veteran's Pride destroys the Lv.2 attacker that would destroy its Unit", !alive(atk) && alive(mine) && inTrash('enemy', NAME(VETPRIDE))); }
// Two Unicorns — a modal Action Command: "Choose 1 enemy Unit that is Lv.2 or lower. Destroy it." on the attacker
{ fresh('player'); const atk=stick('player',4,6,{lv:2}), mine=stick('enemy',2,3,{rested:true}); hand('enemy',[UNICORNS]);
  playerAttacks(atk, mine);
  ok('player turn: Two Unicorns takes its destroy mode on the Lv.2 attacker', !alive(atk) && alive(mine) && inTrash('enemy', NAME(UNICORNS))); }
// …a debuff saves its Unit
{ fresh('player'); const atk=stick('player',4,6), mine=stick('enemy',1,3,{rested:true}); hand('enemy',[UNFORESEEN]);
  playerAttacks(atk, mine);
  ok('player turn: Unforeseen Incident (AP-3) keeps its 3-HP Unit alive', alive(mine) && mine.hp===2 && alive(atk) && inTrash('enemy', NAME(UNFORESEEN)), `mine ${mine.hp}`); }

// ---- protection when attacked ----
{ fresh('player'); const atk=stick('player',4,6), mine=stick('enemy',2,3,{rested:true}); hand('enemy',[DMGCTRL]);
  playerAttacks(atk, mine);
  ok('player turn: Damage Control (battle damage -3) keeps the attacked Unit alive', alive(mine) && mine.hp===2 && inTrash('enemy', NAME(DMGCTRL)), `mine ${mine.hp}`);
  ok('player turn: Damage Control\'s guard ends with the battle', !(mine.dmgGuards||[]).some(g=>g.dur==='battle'), JSON.stringify(mine.dmgGuards)); }
{ fresh('player'); G.enemy.shields.length=2; const atk=stick('player',3,3,{lv:3}); hand('enemy',[TIMBRE]);
  playerAttacks(atk, null);
  ok('player turn: Peaceful Timbre stops a Lv.3 attacker hitting its last 2 shields', G.enemy.shields.length===2 && inTrash('enemy', NAME(TIMBRE)) && G.enemy.resAvail===9, `shields ${G.enemy.shields.length}`);
  ok('player turn: the shield guard ends with the battle', !G.enemy.shieldGuard); }
{ fresh('player'); G.enemy.shields.length=2; const atk=stick('player',3,3,{lv:5}); hand('enemy',[TIMBRE]);
  playerAttacks(atk, null);
  ok('player turn: no Peaceful Timbre against a Lv.5 attacker (it would do nothing)', G.enemy.shields.length===1 && inHand('enemy', NAME(TIMBRE)) && G.enemy.resAvail===10); }
{ fresh('player'); const atk=stick('player',3,3,{lv:3}); hand('enemy',[TIMBRE]);
  playerAttacks(atk, null);
  ok('player turn: Peaceful Timbre is kept while 6 shields are up (one shield is not worth the card)', G.enemy.shields.length===5 && inHand('enemy', NAME(TIMBRE))); }
// lethal: no shield and no Base left
{ fresh('player'); G.enemy.shields.length=0; const atk=stick('player',3,2); hand('enemy',[CLOSE]);
  playerAttacks(atk, null);
  ok('player turn: Close Combat on the attacker that would win the game', !G.over && !alive(atk) && inTrash('enemy', NAME(CLOSE))); }

// ---- never for nothing ----
{ fresh('player'); const atk=stick('player',3,2), mine=stick('enemy',2,5,{rested:true}); hand('enemy',[CLOSE, INDIG, UNFORESEEN, DMGCTRL]);
  playerAttacks(atk, mine);
  ok('player turn: nothing played when its Unit destroys the attacker and survives anyway', G.enemy.hand.length===4 && G.enemy.resAvail===10 && !alive(atk) && alive(mine)); }
{ fresh('player'); const atk=stick('player',2,6), mine=stick('enemy',1,4,{rested:true}); hand('enemy',[CLOSE, UNFORESEEN]);
  playerAttacks(atk, mine);
  ok('player turn: no chip damage / debuff that changes nothing', G.enemy.hand.length===2 && G.enemy.resAvail===10 && alive(mine) && mine.hp===2); }
{ fresh('player'); const atk=stick('player',3,2), mine=stick('enemy',2,2,{rested:true}); hand('enemy',[CLOSE]); G.enemy.resMax=1; G.enemy.resAvail=1;
  playerAttacks(atk, mine);
  ok('player turn: Close Combat (Lv.2, cost 2) is not played with 1 Resource', inHand('enemy', NAME(CLOSE)) && G.enemy.resAvail===1 && !alive(mine)); }
{ fresh('player'); const atk=stick('player',1,2), mine=stick('enemy',1,5,{rested:true}); hand('enemy',[CLOSE]); G.enemy.resMax=1; G.enemy.ex=1; G.enemy.resAvail=2;
  playerAttacks(atk, mine);
  ok('player turn: an EX Resource is not spent to kill a 1/2 attacker that does no harm', inHand('enemy', NAME(CLOSE)) && G.enemy.ex===1 && G.enemy.resAvail===2); }

// ---- End Phase (the player's) ----
{ fresh('player'); hand('enemy',[MIRACLE]); const d0=G.enemy.deck.length;
  A.endTurn(); drainTasks();   // the AI's Action Step play pauses on a timer so the table shows it (aiActionPause)
  ok('player End Phase: A Miracle (no enemy Unit attacked) — the AI draws 2', inTrash('enemy', NAME(MIRACLE)) && G.enemy.deck.length===d0-3, `deck ${d0}->${G.enemy.deck.length} (2 + its draw phase)`); }
{ fresh('player'); hand('enemy',[MIRACLE]); const atk=stick('player',1,1); stick('enemy',0,5,{rested:true});
  playerAttacks(atk, null); hand('enemy',[MIRACLE]); A.endTurn(); drainTasks();
  ok('player End Phase: no A Miracle after an enemy Unit attacked', !inTrash('enemy', NAME(MIRACLE))); }
{ fresh('player'); const blk=stick('player',2,4,{blocker:true}); stick('enemy',4,4); hand('enemy',[SIEGE]);
  A.endTurn();
  ok('player End Phase: Siege Ploy rests the active <Blocker> (it stays rested through the AI turn)', inTrash('enemy', NAME(SIEGE)) && blk.rested, `${blk.rested}`); }
{ fresh('player'); const u=stick('player',2,4,{rested:true}); stick('enemy',4,4); hand('enemy',[SIEGE, INDIG]);
  A.endTurn();
  ok('player End Phase: nothing to rest, no battle — nothing played', inHand('enemy', NAME(SIEGE)) && inHand('enemy', NAME(INDIG)) && u.rested); }
{ fresh('enemy'); stick('player',2,4,{blocker:true}); hand('enemy',[CLOSE]); const t=stick('player',3,2);
  A.endTurn();
  ok('AI End Phase: it plays no Action Command in its own End Phase', inHand('enemy', NAME(CLOSE)) && alive(t)); }

// ---- the UI path on the player's turn: the AI answers the player's Action Command, the battle goes on ----
{ fresh('player'); const atk=stick('player',2,5), mine=stick('enemy',3,3,{rested:true}); hand('enemy',[UNFORESEEN]); hand('player',[INDIG]);
  G.selected=atk.uid; G.mode='attack-target'; A.fieldClick(mine.uid); drainTasks();
  const m1=modal();
  ok('UI: the AI passes first (nothing to gain), the player gets the Action Step', !!m1 && /Action Step/.test(m1.msg) && m1.btns.some(b=>/Indignation/.test(b)) && inHand('enemy', NAME(UNFORESEEN)), m1&&m1.msg);
  press(/Indignation/);
  ok('UI: the AI answers the AP+2 with Unforeseen Incident (AP-3)', inTrash('enemy', NAME(UNFORESEEN)) && A.effAp(atk)===1, `atk AP ${A.effAp(atk)}`);
  const m2=modal(); if (m2 && /Action Step/.test(m2.msg)) press(/^Pass/);
  drainTasks();
  ok('UI: the battle resolves after both pass — its Unit survives (took 1), the attacker took 3', alive(mine) && mine.hp===2 && alive(atk) && atk.hp===2, `mine ${mine.hp}, atk ${atk.hp}`);
  ok('UI: the action step closed and the board is idle', !modal() && G.mode==='idle' && !G.curBattle && !G.curAttack && G.player.resAvail===9 && G.enemy.resAvail===9, `${G.mode} P${G.player.resAvail} A${G.enemy.resAvail}`); }
// the AI plays first in the player's battle, and the player's offer still follows it
{ fresh('player'); const atk=stick('player',4,6), mine=stick('enemy',1,3,{rested:true}); hand('enemy',[UNFORESEEN]); hand('player',[INDIG]);
  G.selected=atk.uid; G.mode='attack-target'; A.fieldClick(mine.uid); drainTasks();
  const m=modal();
  ok('UI: after the AI\'s Unforeseen Incident the player is offered the Action Step', inTrash('enemy', NAME(UNFORESEEN)) && !!m && /Action Step/.test(m.msg) && m.btns.some(b=>/Indignation/.test(b)), m&&m.msg);
  press(/^Pass/); drainTasks();
  ok('UI: Pass continues the battle (its Unit survives with AP-3 on the attacker)', alive(mine) && mine.hp===2 && !modal() && G.mode==='idle', `mine ${mine.hp}`); }
// the AI's turn: the player's answer comes after the AI's play, then the damage step
{ fresh('enemy'); const mine=stick('enemy',3,6), theirs=stick('player',4,5,{rested:true}); hand('enemy',[INDIG]); hand('player',[UNFORESEEN]);
  let done=false; A.resolveAiAttack(mine, ()=>{ done=true; }, theirs); drainTasks();
  const m=modal();
  ok('UI (AI turn): after the AI\'s Indignation the player gets the Action Step', inTrash('enemy', NAME(INDIG)) && !!m && /Action Step/.test(m.msg) && m.btns.some(b=>/Unforeseen/.test(b)), m&&m.msg);
  press(/Unforeseen/); drainTasks();
  if (modal()) press(/^Pass/);
  ok('UI (AI turn): the player\'s AP-3 answer stands and the attack finishes', done && alive(theirs) && alive(mine) && !modal(), `done ${done} theirs ${theirs.hp} mine ${mine.hp}`); }

// ---- main phase: removal / rest Commands it never cast ----
{ fresh('enemy'); const t=stick('player',4,4,{lv:3}); hand('enemy',[FATAL]);
  const did=A.aiMainStep(); drainTasks();
  ok('AI main: Fatal Strike destroys a Lv.3 4/4 threat', did && !alive(t) && inTrash('enemy', NAME(FATAL)) && G.enemy.resAvail===8); }
{ fresh('enemy'); const t=stick('player',1,1,{lv:3}); hand('enemy',[FATAL]);
  const did=A.aiMainStep(); drainTasks();
  ok('AI main: no Fatal Strike on a 1/1', !did && alive(t) && inHand('enemy', NAME(FATAL))); }
{ fresh('enemy'); const blk=stick('player',2,4,{blocker:true, lv:3}); stick('enemy',3,3); hand('enemy',[GRAVITON]);
  const did=A.aiMainStep(); drainTasks();
  ok('AI main: Graviton Hammer rests the active <Blocker> before its attacks', did && blk.rested && inTrash('enemy', NAME(GRAVITON))); }
{ fresh('enemy'); const blk=stick('player',2,4,{blocker:true, lv:3}); hand('enemy',[GRAVITON]);
  const did=A.aiMainStep(); drainTasks();
  ok('AI main: no Graviton Hammer without a Unit ready to attack', !did && !blk.rested); }

console.log(`passed: ${pass} | failed: ${fail.length}`);
for (const f of fail) console.log('  FAIL '+f);
console.log('Errors:', H.ERRORS.length);
for (const e of H.ERRORS.slice(0,6)) console.log('  ', e.phase, e.msg, e.stack);
