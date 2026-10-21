// AI levels: the plays that separate hard from normal and easy — attacks judged against the player's blocks and counter-attacks
// (aiPlanHard), blocks judged by what they save and cost (aiBlockValue), and the turn's resources spent on the best
// combination of bodies (aiBestSpend). Each check sets a board where the right play is clear-cut.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=960000;
const FILL='ST01-005';   // GM — a plain Lv.2 Unit with no effect text
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'enemy',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,modalQueue:[],
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,endActionStep:false,activateRestSub:null,_aiPostDeploy:false,_aiPostCombat:null,_aiPostUtil:null,_aiTradePlan:null,_aiAct:null,_aiAttackPlan:null,
    player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get(FILL), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get(FILL), s.who)); }
  el('log').children.length=0;
}
const side=who=>who==='player'?G.player:G.enemy;
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); side(who).field.push(c); return c;
}
// A plain Unit card in the AI's hand with the given cost/Lv and stats.
function handUnit(cost, ap, hp){ const c=A.makeCard(A.CARD_BY_ID.get(FILL), 'enemy'); Object.assign(c, { cost, lv:cost, baseAp:ap, baseHp:hp, ap, hp, name:`Body ${ap}/${hp}` }); G.enemy.hand.push(c); return c; }
const strip=s=>String(s||'').replace(/<[^>]+>/g,'');
const modal=()=>el('blockModal').classList.contains('show') ? { msg:strip(el('blockMsg').innerHTML), btns:[...el('blockBtns').children].map(b=>strip(b.innerHTML||b.textContent)) } : null;
function press(re){ const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test(strip(x.innerHTML||x.textContent)) && x.onclick); if(!b) return false; b.onclick(); drainTasks(); return true; }
const passAll=()=>{ let g=0; while (modal() && g++<10){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass/)) { const b=[...el('blockBtns').children].find(x=>x.onclick); if (!b) break; b.onclick(); drainTasks(); } } };
const logs=()=>[...(el('log').children||[])].map(c=>strip(c.innerHTML||''));
// The AI's attack step after its main phase (its plan), then its post-combat deploys and the end of its turn.
function aiCombat(){ G.turn='enemy'; A.aiPostMain(); drainTasks(); passAll(); drainTasks(); }
// The player attacks enemy Unit `t` (or the enemy player with t=null); the AI decides its block.
function playerAttacks(atk, t){ G.turn='player'; G.selected=atk.uid; G.mode='attack-target'; if (t) A.fieldClick(t.uid); else A.attackDirect(); drainTasks(); passAll(); }
function main(){ G._aiPostDeploy=true; let n=0; while (n<10 && A.aiMainStep()){ n++; drainTasks(); passAll(); } drainTasks(); return n; }

// ---- 1. Attacks ----
for (const lvl of ['hard','normal']){
  A.setAiLevel(lvl);
  // A 2/3 facing an active 4/4 <Blocker>: the player blocks and kills it for nothing. Hard and normal hold it.
  fresh('enemy'); const w=stick('enemy',2,3); stick('player',4,4,{blocker:true});
  aiCombat();
  ok(lvl+': a 2/3 is held back from an active 4/4 Blocker', !w.rested && w.hp===3 && logs().some(l=>/holds .*Dummy 2\/3.* back/.test(l)), logs().slice(0,3).join(' / '));
}
// Easy sees the block only half the time: over 12 tries it both swings into the Blocker and holds.
{ A.setAiLevel('easy'); let swung=0, held=0;
  for (let i=0;i<12;i++){ fresh('enemy'); const w=stick('enemy',2,3); stick('player',4,4,{blocker:true}); aiCombat(); if (w.rested || w.hp<3) swung++; else held++; }
  ok('easy: sometimes swings into the Blocker, sometimes holds', swung>0 && held>0, `swung ${swung} held ${held}`); }
A.setAiLevel('hard');
// The same 2/3 with no player Blocker: a shield is there for the taking.
{ fresh('enemy'); const w=stick('enemy',2,3); stick('player',1,1,{rested:true});
  aiCombat(); ok('hard: with no Blocker in the way the 2/3 attacks', w.rested && G.player.shields.length===5, `rested ${w.rested} shields ${G.player.shields.length}`); }
// Lethal is taken with everything, blockers or not: 3 attackers, the player at 1 shield with one 4/4 Blocker.
{ fresh('enemy'); const a=stick('enemy',2,3), b=stick('enemy',3,3), c=stick('enemy',5,5); stick('player',4,4,{blocker:true}); G.player.shields.length=1;
  aiCombat(); ok('hard: lethal goes all in', G.over && G.winner!=='player' && logs().some(l=>/goes for the win/.test(l)), `over ${G.over} winner ${G.winner}`); }
// A clean kill of a rested threat beats a shield: the AI's 4/4 takes the player's rested 3/3 (survives, +keepVal) instead of a shield.
{ fresh('enemy'); const a=stick('enemy',4,4); const t=stick('player',3,3,{rested:true});
  aiCombat(); ok('hard: a surviving kill of a rested 3/3 is preferred to a shield', t.hp<=0 && G.player.shields.length===6, `t.hp ${t.hp} shields ${G.player.shields.length}`); }
// A trade of its own body for a smaller one is refused: the AI's 3/3 vs the player's rested 3/3 (both would die) — it goes face instead.
{ fresh('enemy'); const a=stick('enemy',3,3); const t=stick('player',3,3,{rested:true});
  aiCombat(); ok('hard: an even trade is not taken when a shield is free', t.hp===3 && G.player.shields.length===5, `t.hp ${t.hp} shields ${G.player.shields.length}`); }
// Under lethal threat an active <Blocker> stays home: the player has 3 attackers, the AI 2 shields and no Base.
{ fresh('enemy'); const bl=stick('enemy',3,3,{blocker:true}); const big=stick('enemy',4,4); for (let i=0;i<3;i++) stick('player',3,3,{rested:true}); G.enemy.shields.length=2;
  aiCombat(); ok('hard: the Blocker stays home against a lethal board; the other body still attacks', !bl.rested && big.rested, `blocker rested ${bl.rested} big rested ${big.rested}`); }
// Normal does not read the player's next turn: on the same lethal board its Blocker attacks.
{ A.setAiLevel('normal'); fresh('enemy'); const bl=stick('enemy',3,3,{blocker:true}); for (let i=0;i<3;i++) stick('player',3,3,{rested:true}); G.enemy.shields.length=2;
  aiCombat(); ok('normal: the Blocker attacks regardless of the lethal board', bl.rested, `blocker rested ${bl.rested}`); A.setAiLevel('hard'); }
// Safe board (no player attackers): the Blocker attacks too.
{ fresh('enemy'); const bl=stick('enemy',3,3,{blocker:true}); aiCombat(); ok('hard: with nothing to fear the Blocker attacks', bl.rested, `rested ${bl.rested}`); }
// The player's Base: a hit that destroys it is worth taking (5 AP into a 4-HP Base).
{ fresh('enemy'); const a=stick('enemy',5,5); G.player.base=A.exBaseToken('player'); G.player.base.hp=4; G.player.base.maxHp=4;
  aiCombat(); ok('hard: a Base the attacker destroys is attacked', a.rested && !G.player.base, `rested ${a.rested} base ${!!G.player.base}`); }

// ---- 2. Blocks ----
// A 3/3 attacker at the AI's 6 shields: its 4/4 Blocker kills it and survives — block.
{ fresh('player'); const bl=stick('enemy',4,4,{blocker:true}); const atk=stick('player',3,3);
  playerAttacks(atk, null); ok('hard: blocks a 3/3 with a 4/4 Blocker (kills, survives)', atk.hp<=0 && G.enemy.shields.length===6 && bl.hp>0, `atk.hp ${atk.hp} shields ${G.enemy.shields.length}`); }
// A 5/5 attacker at 6 shields: its 3/3 Blocker would die for one shield — let it through.
{ fresh('player'); const bl=stick('enemy',3,3,{blocker:true}); const atk=stick('player',5,5);
  playerAttacks(atk, null); ok('hard: no chump block of a 5/5 at 6 shields', bl.hp===3 && G.enemy.shields.length===5, `bl.hp ${bl.hp} shields ${G.enemy.shields.length}`); }
// The same at 1 shield: the shield is worth more than the 3/3 — chump.
{ fresh('player'); const bl=stick('enemy',3,3,{blocker:true}); const atk=stick('player',5,5); G.enemy.shields.length=1;
  playerAttacks(atk, null); ok('hard: chumps at 1 shield', bl.hp<=0 && G.enemy.shields.length===1, `bl.hp ${bl.hp} shields ${G.enemy.shields.length}`); }
// A 2-AP attack on the AI's rested 5/5 (it survives anyway): a 1/4 Blocker that can't kill the attacker does not step in…
{ fresh('player'); const bl=stick('enemy',1,4,{blocker:true}); const big=stick('enemy',5,5,{rested:true}); const atk=stick('player',2,2);
  playerAttacks(atk, big); ok('hard: no block of a chip the target survives', !bl.rested && big.hp===3, `bl rested ${bl.rested} big.hp ${big.hp}`); }
// …but a 2/4 Blocker that kills the 2/2 and survives takes the free kill.
{ fresh('player'); const bl=stick('enemy',2,4,{blocker:true}); const big=stick('enemy',5,5,{rested:true}); const atk=stick('player',2,2);
  playerAttacks(atk, big); ok('hard: a free kill on a chip is taken', bl.rested && atk.hp<=0 && big.hp===5, `bl rested ${bl.rested} atk.hp ${atk.hp} big.hp ${big.hp}`); }
// A 3/3 attacks the AI's rested 2/3 while it holds Infinite Variations (AP-2 on the attacker, with a white Blocker in play):
// the Command saves the Unit by itself, so the 1/1 white Blocker is not thrown away on a chump block…
{ fresh('player'); const bl=stick('enemy',1,1,{color:'White',blocker:true}); const mine=stick('enemy',2,3,{rested:true}); const atk=stick('player',3,3);
  G.enemy.hand.push(A.makeCard(A.CARD_BY_ID.get('GD06-118'),'enemy'));
  playerAttacks(atk, mine); ok('hard: a Command that saves the Unit is played instead of a chump block', !bl.rested && bl.hp===1 && mine.hp===2 && !G.enemy.hand.length, `bl rested ${bl.rested} mine.hp ${mine.hp} hand ${G.enemy.hand.length}`); }
// …but a 3/4 white Blocker that kills the 3/3 and survives still takes the free kill.
{ fresh('player'); const bl=stick('enemy',3,4,{color:'White',blocker:true}); const mine=stick('enemy',2,3,{rested:true}); const atk=stick('player',3,3);
  G.enemy.hand.push(A.makeCard(A.CARD_BY_ID.get('GD06-118'),'enemy'));
  playerAttacks(atk, mine); ok('hard: the free kill is still taken over the saving Command', bl.rested && atk.hp<=0 && mine.hp===3, `bl rested ${bl.rested} atk.hp ${atk.hp} mine.hp ${mine.hp}`); }
// Two attackers, one of them killable: the Blocker is used on the one it kills (the 3/3), not the 6/6 it would die to.
{ fresh('player'); const bl=stick('enemy',4,4,{blocker:true}); const big=stick('player',6,6), small=stick('player',3,3);
  playerAttacks(big, null); ok('hard: the Blocker waits for the attacker it can kill', !bl.rested && G.enemy.shields.length===5, `bl rested ${bl.rested} shields ${G.enemy.shields.length}`);
  playerAttacks(small, null); ok('hard: ...and takes it', small.hp<=0 && G.enemy.shields.length===5, `small.hp ${small.hp} shields ${G.enemy.shields.length}`); }
// The pre-existing blockers of normal still work (same 3/3 vs 4/4 case).
{ A.setAiLevel('normal'); fresh('player'); const bl=stick('enemy',4,4,{blocker:true}); const atk=stick('player',3,3);
  playerAttacks(atk, null); ok('normal: blocks a 3/3 with a 4/4 Blocker', atk.hp<=0 && G.enemy.shields.length===6, `atk.hp ${atk.hp}`); A.setAiLevel('hard'); }

// ---- 3. Deploys ----
// 5 resources, a 4-cost 4/4, a 3-cost 3/3 and a 2-cost 2/2 in hand: 3/3 + 2/2 (10 stats) beats the 4/4 (8 stats, 1 resource idle).
{ fresh('enemy'); G.enemy.resMax=5; G.enemy.resAvail=5; const big=handUnit(4,4,4), mid=handUnit(3,3,3), small=handUnit(2,2,2);
  main(); const names=G.enemy.field.map(u=>u.name).sort().join(',');
  ok('hard: 5 resources buy the 3/3 and the 2/2, not the 4/4', names==='Body 2/2,Body 3/3' && G.enemy.resAvail===0, `${names} left ${G.enemy.resAvail}`); }
// 4 resources: the 4/4 alone (8) beats 3/3 alone (6) or 2/2 alone.
{ fresh('enemy'); G.enemy.resMax=4; G.enemy.resAvail=4; handUnit(4,4,4); handUnit(3,3,3); handUnit(2,2,2);
  main(); const names=G.enemy.field.map(u=>u.name).join(','); ok('hard: 4 resources buy the 4/4', names==='Body 4/4', names); }
// Normal spends the same way; easy takes the single biggest body.
{ A.setAiLevel('normal'); fresh('enemy'); G.enemy.resMax=5; G.enemy.resAvail=5; handUnit(4,4,4); handUnit(3,3,3); handUnit(2,2,2);
  main(); const names=G.enemy.field.map(u=>u.name).sort().join(','); ok('normal: 5 resources buy the 3/3 and the 2/2', names==='Body 2/2,Body 3/3', names); }
{ A.setAiLevel('easy'); fresh('enemy'); G.enemy.resMax=5; G.enemy.resAvail=5; handUnit(4,4,4); handUnit(3,3,3); handUnit(2,2,2);
  main(); ok('easy: the biggest body first', G.enemy.field[0] && G.enemy.field[0].name==='Body 4/4', G.enemy.field.map(u=>u.name).join(',')); A.setAiLevel('hard'); }
// A Link Pilot in hand is budgeted for: 5 resources, a 3-cost Unit it links with and a 2-cost Pilot — the AI deploys the Unit and pairs.
{ fresh('enemy'); G.enemy.resMax=5; G.enemy.resAvail=5;
  const u=A.makeCard(A.CARD_BY_ID.get('ST01-001'), 'enemy'); const p=A.makeCard(A.CARD_BY_ID.get('ST01-010'), 'enemy');   // Gundam + Amuro Ray (Link)
  Object.assign(u, { cost:3, lv:3 }); Object.assign(p, { cost:2, lv:2 }); G.enemy.hand.push(u, p); handUnit(2,2,2);
  main(); const g=G.enemy.field.find(x=>x.name===u.name);
  ok('hard: the Link Pilot is budgeted for (Unit deployed and paired)', !!g && !!g.pilotCard && g.linked, G.enemy.field.map(x=>x.name+(x.pilotCard?'+'+x.pilotCard.name:'')).join(',')+` left ${G.enemy.resAvail}`); }

console.log(`ai_hard_check.js: passed: ${pass} | failed: ${fail.length}`);
for (const f of fail) console.log('  FAIL '+f);
console.log('Errors:', H.ERRORS.length);
